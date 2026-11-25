export interface LocalSourceFile {
  uri: string
  name: string
  error?: string
}

export interface BatchImportResult {
  success: number
  errors: Array<{ name: string, message: string }>
  skipped: number
  reachedLimit: boolean
}

export interface BatchImportDependencies {
  count: () => number
  read: (uri: string) => Promise<string>
  importScript: (script: string) => Promise<void>
  invalidFileMessage: string
}

// Sequential persistence prevents overlapping imports from overwriting the source list.
export const importLocalSources = async(files: LocalSourceFile[], deps: BatchImportDependencies): Promise<BatchImportResult> => {
  const result: BatchImportResult = { success: 0, errors: [], skipped: 0, reachedLimit: false }
  const seen = new Set<string>()
  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    if (seen.has(file.uri)) { result.skipped++; continue }
    seen.add(file.uri)
    if (deps.count() >= 20) {
      result.reachedLimit = true
      result.skipped += files.length - index
      break
    }
    try {
      if (file.error) throw new Error(file.error)
      if (!/\.js$/i.test(file.name)) throw new Error(deps.invalidFileMessage)
      const script = (await deps.read(file.uri)).replace(/^\uFEFF/, '')
      if (!script.trim()) throw new Error('Empty script')
      await deps.importScript(script)
      result.success++
    } catch (error) {
      result.errors.push({ name: file.name, message: error instanceof Error ? error.message : String(error) })
    }
  }
  return result
}
