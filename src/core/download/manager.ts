// Platform-independent queue. Native I/O is supplied by index.ts.
export interface DownloadSettings {
  directory: string
  concurrency: number
  saveLyric: boolean
  embedMetadata: boolean
  allowToggleSource: boolean
}

export interface DownloadSnapshot {
  tasks: LX.Download.ListItem[]
  settings: DownloadSettings
}

export interface Transfer {
  cancel: () => void
  promise: Promise<{ statusCode: number, bytesWritten: number }>
}

export interface DownloadDependencies {
  load: () => Promise<DownloadSnapshot | null>
  save: (snapshot: DownloadSnapshot) => Promise<void>
  getUrl: (task: LX.Download.ListItem, refresh: boolean) => Promise<string>
  download: (url: string, path: string, progress: (written: number, total: number) => void) => Transfer
  exists: (path: string) => Promise<boolean>
  unlink: (path: string) => Promise<void>
  prepare: () => Promise<void>
  finish: (task: LX.Download.ListItem, temporaryPath: string, settings: DownloadSettings) => Promise<string>
  temporaryPath: (id: string) => string
  message: (key: string) => string
  onListChange: () => void
  onError: (error: unknown) => void
}

interface RunningTask {
  cancelled: boolean
  finalizing: boolean
  cancel?: () => void
  done?: Promise<void>
}

export const qualityExtension = (quality: LX.Quality): LX.Download.FileExt => {
  switch (quality) {
    case 'flac':
    case 'flac24bit': return 'flac'
    case 'ape': return 'ape'
    case 'wav': return 'wav'
    default: return 'mp3'
  }
}

export const safeFileName = (name: string) => Array.from(name, char => char.charCodeAt(0) < 32 ? '_' : char).join('').replace(/[<>:"/\\|?*]/g, '_').replace(/[.\s]+$/g, '').slice(0, 100) || 'music'

export class DownloadManager {
  tasks: LX.Download.ListItem[] = []
  settings: DownloadSettings
  private readonly deps: DownloadDependencies
  private readonly listeners = new Set<() => void>()
  private readonly running = new Map<string, RunningTask>()
  private readonly removing = new Set<string>()
  private initialization?: Promise<void>
  private writes: Promise<void> = Promise.resolve()
  private saveTimer?: ReturnType<typeof setTimeout>
  private sequence = 0

  constructor(deps: DownloadDependencies, settings: DownloadSettings) {
    this.deps = deps
    this.settings = settings
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }

  private changed(listChanged = false) {
    this.emit()
    if (listChanged) this.deps.onListChange()
    void this.persist()
  }

  private async persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = undefined
    // Capture now, serialize writes: a slow progress save must not overwrite removal/completion.
    const snapshot = JSON.parse(JSON.stringify({ tasks: this.tasks, settings: this.settings })) as DownloadSnapshot
    this.writes = this.writes.then(async() => this.deps.save(snapshot)).catch(this.deps.onError)
    return this.writes
  }

  flush = async() => {
    await this.init()
    await this.persist()
  }

  init = async() => {
    this.initialization ??= this.restore().catch(error => {
      this.initialization = undefined
      throw error
    })
    await this.initialization
  }

  private async restore() {
    const saved = await this.deps.load()
    if (saved) {
      this.settings = { ...this.settings, ...saved.settings }
      this.settings.concurrency = Math.max(1, Math.min(3, Math.floor(this.settings.concurrency) || 1))
      this.tasks = saved.tasks
      for (const task of this.tasks) {
        if (task.status == 'run' || task.status == 'waiting') {
          task.status = 'pause'
          task.statusText = ''
          task.speed = ''
        }
        if (task.status == 'completed' && !await this.deps.exists(task.metadata.filePath).catch(() => false)) {
          task.status = 'error'
          task.isComplate = false
          task.statusText = this.deps.message('download_file_missing')
        }
      }
    }
    this.changed(true)
  }

  updateSettings = async(settings: Partial<DownloadSettings>) => {
    await this.init()
    this.settings = { ...this.settings, ...settings }
    this.settings.concurrency = Math.max(1, Math.min(3, Math.floor(this.settings.concurrency) || 1))
    this.changed()
    this.schedule()
  }

  getFile = async(id: string) => {
    await this.init()
    const task = this.tasks.find(task => task.id == id)
    if (task?.status == 'completed' && task.metadata.filePath && await this.deps.exists(task.metadata.filePath).catch(() => false)) return task.metadata.filePath
    if (task) {
      task.status = 'error'
      task.isComplate = false
      task.statusText = this.deps.message('download_file_missing')
      this.changed(true)
    }
    throw new Error(this.deps.message('download_file_missing'))
  }

  create = async(musics: LX.Music.MusicInfoOnline[], quality: LX.Quality, nameFormat: string) => {
    await this.init()
    let added = 0
    for (const musicInfo of musics) {
      if (this.tasks.some(task => task.metadata.musicInfo.id == musicInfo.id && task.metadata.quality == quality)) continue
      const id = `download_${Date.now()}_${++this.sequence}`
      const ext = qualityExtension(quality)
      const name = safeFileName(nameFormat.replace('歌名', musicInfo.name).replace('歌手', musicInfo.singer))
      this.tasks.push({
        id,
        isComplate: false,
        status: 'waiting',
        statusText: '',
        downloaded: 0,
        total: 0,
        progress: 0,
        speed: '',
        metadata: {
          musicInfo: JSON.parse(JSON.stringify(musicInfo)) as LX.Music.MusicInfoOnline,
          quality,
          ext,
          url: null,
          // Stable unique suffix prevents overwriting songs with equal titles or other qualities.
          fileName: `${name} [${quality}-${id.substring(9)}].${ext}`,
          filePath: '',
        },
      })
      added++
    }
    this.changed()
    this.schedule()
    return added
  }

  start = async(ids: string[]) => {
    await this.init()
    for (const task of this.tasks) {
      if (!ids.includes(task.id) || this.removing.has(task.id) || task.status == 'completed' || task.status == 'run') continue
      task.status = 'waiting'
      task.statusText = ''
    }
    this.changed()
    this.schedule()
  }

  pause = async(ids: string[]) => {
    await this.init()
    const finalizing: Array<Promise<void>> = []
    for (const task of this.tasks) {
      if (!ids.includes(task.id)) continue
      const context = this.running.get(task.id)
      // Publishing a file is atomic from the queue's perspective; let it finish first.
      if (context?.finalizing) {
        if (context.done) finalizing.push(context.done)
        continue
      }
      if (task.status != 'run' && task.status != 'waiting') continue
      task.status = 'pause'
      task.statusText = ''
      task.speed = ''
      if (context) {
        context.cancelled = true
        context.cancel?.()
      }
    }
    this.changed()
    await Promise.all(finalizing)
  }

  remove = async(id: string, deleteFile: boolean) => {
    if (this.removing.has(id)) return
    this.removing.add(id)
    try {
      await this.pause([id])
      await this.running.get(id)?.done
      const task = this.tasks.find(task => task.id == id)
      if (!task) return
      if (deleteFile && task.metadata.filePath) {
        if (await this.deps.exists(task.metadata.filePath)) await this.deps.unlink(task.metadata.filePath)
        const lrc = task.metadata.lyricPath
        if (lrc && await this.deps.exists(lrc)) await this.deps.unlink(lrc)
      }
      await this.deps.unlink(this.deps.temporaryPath(id))
      this.tasks = this.tasks.filter(task => task.id != id)
      this.changed(true)
    } finally {
      this.removing.delete(id)
    }
  }

  private schedule() {
    for (const task of this.tasks) {
      if (this.running.size >= this.settings.concurrency) break
      if (task.status != 'waiting' || this.running.has(task.id) || this.removing.has(task.id)) continue
      const context: RunningTask = { cancelled: false, finalizing: false }
      this.running.set(task.id, context)
      task.status = 'run'
      task.statusText = this.deps.message('download_getting_url')
      this.changed()
      context.done = this.run(task, context)
    }
  }

  private async run(task: LX.Download.ListItem, context: RunningTask) {
    const temporaryPath = this.deps.temporaryPath(task.id)
    const settings = { ...this.settings }
    const active = () => !context.cancelled && task.status == 'run'
    try {
      await this.deps.prepare()
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (!active()) return
          task.statusText = this.deps.message(attempt ? 'download_refreshing_url' : 'download_getting_url')
          this.changed()
          const url = await this.deps.getUrl(task, attempt > 0)
          if (!active()) return
          if (!/^https?:\/\//i.test(url)) throw new Error(this.deps.message('download_invalid_url'))
          task.metadata.url = url
          await this.deps.unlink(temporaryPath)
          if (!active()) return
          task.downloaded = 0
          task.total = 0
          task.progress = 0
          task.statusText = ''
          this.changed()
          let previousTime = Date.now()
          let previousBytes = 0
          const transfer = this.deps.download(url, temporaryPath, (written, total) => {
            if (!active()) return
            // Always retain totals, even when UI notifications are throttled.
            task.downloaded = written
            task.total = total
            task.progress = total > 0 ? Math.min(99.9, written / total * 100) : 0
            const now = Date.now()
            if (now - previousTime < 500 && written != total) return
            task.speed = `${Math.max(0, (written - previousBytes) * 1000 / Math.max(1, now - previousTime) / 1024).toFixed(1)} KB/s`
            previousTime = now
            previousBytes = written
            this.emit()
            this.saveTimer ??= setTimeout(() => { void this.persist() }, 1000)
          })
          context.cancel = transfer.cancel
          const result = await transfer.promise
          context.cancel = undefined
          if (!active()) return
          if (result.statusCode < 200 || result.statusCode >= 300 || !result.bytesWritten || (task.total > 0 && result.bytesWritten != task.total)) {
            throw new Error(`HTTP ${result.statusCode}: ${this.deps.message('download_incomplete')}`)
          }
          // Do not retry publication/tagging failures by downloading the whole song again.
          context.finalizing = true
          task.statusText = this.deps.message('download_saving')
          this.changed()
          task.metadata.filePath = await this.deps.finish(task, temporaryPath, settings)
          task.downloaded = result.bytesWritten
          task.total = result.bytesWritten
          task.progress = 100
          task.speed = ''
          task.status = 'completed'
          task.isComplate = true
          // finish may set a nonfatal lyrics/tag warning.
          if (task.statusText == this.deps.message('download_saving')) task.statusText = ''
          this.changed(true)
          return
        } catch (error) {
          context.cancel = undefined
          if (!active()) return
          if (attempt || context.finalizing) throw error
        }
      }
    } catch (error) {
      if (active()) {
        task.status = 'error'
        task.speed = ''
        task.statusText = error instanceof Error ? error.message : String(error)
        this.changed()
      }
    } finally {
      await this.deps.unlink(temporaryPath).catch(this.deps.onError)
      this.running.delete(task.id)
      this.schedule()
    }
  }
}
