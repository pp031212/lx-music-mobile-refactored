import { AppState } from 'react-native'
import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix } from '@/config/constant'
import { downloadFile, stopDownload, existsFile, unlink, mkdir, stat, copyFile, writeFile, privateStorageDirectoryPath, readDir } from '@/utils/fs'
import { getMusicUrl, getLyricInfo } from '@/core/music/online'
import { writeMetadata, writeLyric } from '@/utils/localMediaMetadata'
import { log } from '@/utils/log'
import { DownloadManager, type DownloadSnapshot, type DownloadSettings } from './manager'

export const DEFAULT_DOWNLOAD_DIRECTORY = `${privateStorageDirectoryPath}/downloads`
const stagingDirectory = `${privateStorageDirectoryPath}/download-tasks`

const removeFile = async(path: string) => {
  if (await existsFile(path)) await unlink(path)
}

const withTimeout = async<T>(promise: Promise<T>, milliseconds: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([promise, new Promise<never>((resolve, reject) => {
      timer = setTimeout(() => { reject(new Error(global.i18n.t('download_timeout'))) }, milliseconds)
    })])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const reportError = (error: unknown) => {
  log.error('download:', error instanceof Error ? error.message : String(error))
}

export const downloadManager: DownloadManager = new DownloadManager({
  load: async() => {
    const saved = await getData<DownloadSnapshot>(storageDataPrefix.download)
    // Temporary files are never treated as complete after an interrupted app process.
    if (await existsFile(stagingDirectory)) {
      const files = await readDir(stagingDirectory).catch(() => [])
      for (const file of files) if (file.isFile) await removeFile(file.path).catch(reportError)
    }
    return saved
  },
  save: async(snapshot) => saveData(storageDataPrefix.download, snapshot),
  getUrl: async(task, refresh) => {
    const info = task.metadata.musicInfo
    const params = { quality: task.metadata.quality, isRefresh: refresh }
    return withTimeout((info.meta.toggleMusicInfo
      ? getMusicUrl({ ...params, musicInfo: info.meta.toggleMusicInfo, allowToggleSource: false })
      : Promise.reject(new Error('no preferred source'))).catch(async() => getMusicUrl({
      ...params,
      musicInfo: info,
      allowToggleSource: downloadManager.settings.allowToggleSource,
    })), 30_000)
  },
  download: (url, path, progress) => {
    let invalidContent = false
    const job = downloadFile(url, path, {
      connectionTimeout: 15_000,
      readTimeout: 30_000,
      progressInterval: 500,
      begin: ({ contentLength, headers }) => {
        const contentType = Object.entries(headers).find(([key]) => key.toLowerCase() == 'content-type')?.[1] ?? ''
        invalidContent = /text\/html|application\/(?:\w+\+)?json/i.test(String(contentType))
        progress(0, contentLength)
      },
      progress: ({ bytesWritten, contentLength }) => { progress(bytesWritten, contentLength) },
    })
    return {
      cancel: () => { stopDownload(job.jobId) },
      promise: job.promise.then(result => {
        if (invalidContent) throw new Error(global.i18n.t('download_incomplete'))
        return result
      }),
    }
  },
  exists: existsFile,
  unlink: removeFile,
  prepare: async() => {
    if (!await existsFile(stagingDirectory)) await mkdir(stagingDirectory)
  },
  temporaryPath: id => `${stagingDirectory}/${id}.part`,
  finish: async(task, temporaryPath, settings) => {
    const directory = settings.directory || DEFAULT_DOWNLOAD_DIRECTORY
    if (!await existsFile(directory)) await mkdir(directory)
    const target = `${directory.replace(/\/$/, '')}/${task.metadata.fileName}`
    if (await existsFile(target)) throw new Error(global.i18n.t('download_file_exists'))
    const expectedSize = (await stat(temporaryPath)).size
    try {
      // Native mv can silently fail across filesystems. Copy and verify before removing the source.
      await copyFile(temporaryPath, target)
      if ((await stat(target)).size != expectedSize) throw new Error(global.i18n.t('download_incomplete'))
    } catch (error) {
      await removeFile(target).catch(reportError)
      throw error
    }
    if (settings.saveLyric || settings.embedMetadata) {
      try {
        const lyricInfo = await withTimeout(getLyricInfo({ musicInfo: task.metadata.musicInfo, isRefresh: false, allowToggleSource: settings.allowToggleSource }), 12_000)
        task.metadata.lyricInfo = lyricInfo.rawlrcInfo
        if (settings.saveLyric && lyricInfo.rawlrcInfo.lyric) {
          const lyricPath = target.replace(/\.[^.]+$/, '.lrc')
          await writeFile(lyricPath, lyricInfo.rawlrcInfo.lyric)
          task.metadata.lyricPath = lyricPath
        }
      } catch (error) {
        reportError(error)
        task.statusText = global.i18n.t('download_lyric_warning')
      }
    }
    if (settings.embedMetadata) {
      try {
        const info = task.metadata.musicInfo
        await writeMetadata(target, { name: info.name, singer: info.singer, albumName: info.meta.albumName })
        if (task.metadata.lyricInfo?.lyric) await writeLyric(target, task.metadata.lyricInfo.lyric)
      } catch (error) {
        reportError(error)
        task.statusText = global.i18n.t('download_metadata_warning')
      }
    }
    return target
  },
  message: key => global.i18n.t(key as Parameters<typeof global.i18n.t>[0]),
  onListChange: () => { global.app_event.downloadListUpdate() },
  onError: reportError,
}, {
  directory: DEFAULT_DOWNLOAD_DIRECTORY,
  concurrency: 2,
  saveLyric: true,
  embedMetadata: true,
  allowToggleSource: false,
})

let initialized = false
export const initDownloads = async() => {
  await downloadManager.init()
  if (initialized) return
  initialized = true
  AppState.addEventListener('change', state => {
    if (state != 'active') void downloadManager.flush().catch(reportError)
  })
}

export const getDownloadList = () => downloadManager.tasks.filter(task => task.status == 'completed' && task.isComplate)

export type { DownloadSettings }
