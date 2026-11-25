import { downloadManager } from '@/core/download'
import { getPicUrl as getOnlinePicUrl, getLyricInfo as getOnlineLyricInfo } from './online'
import { buildLyricInfo, getCachedLyricInfo } from './utils'
import { readPic } from '@/utils/localMediaMetadata'

export const getMusicUrl = async({ musicInfo }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}): Promise<string> => downloadManager.getFile(musicInfo.id)

export const getPicUrl = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (musicInfo.metadata.filePath) {
    const pic = await readPic(musicInfo.metadata.filePath).catch(() => '')
    if (pic) return pic
  }
  return getOnlinePicUrl({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource })
}

export const getLyricInfo = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (musicInfo.metadata.lyricInfo) return buildLyricInfo(musicInfo.metadata.lyricInfo)
  const cached = await getCachedLyricInfo(musicInfo.metadata.musicInfo)
  if (cached) return buildLyricInfo(cached)
  return getOnlineLyricInfo({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource })
}
