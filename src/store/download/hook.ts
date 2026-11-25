import { useEffect, useState } from 'react'
import { downloadManager } from '@/core/download'

export const useDownloads = () => {
  const [, update] = useState(0)
  useEffect(() => downloadManager.subscribe(() => { update(version => version + 1) }), [])
  return { tasks: downloadManager.tasks.map(task => ({ ...task })), settings: downloadManager.settings }
}

export const useDownloadSettings = () => {
  const [settings, setSettings] = useState(downloadManager.settings)
  useEffect(() => downloadManager.subscribe(() => { setSettings(downloadManager.settings) }), [])
  return settings
}
