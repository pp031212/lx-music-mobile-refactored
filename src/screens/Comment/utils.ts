import { toOldMusicInfo } from '@/utils'
import music from '@/utils/musicSdk'

export interface Comment {
  id: string
  text: string
  images?: string[]
  location?: string
  timeStr?: string
  userName: string
  avatar?: string
  userId?: string
  likedCount?: number
  replyNum?: number
  reply: Comment[]
}
export interface CommentInfo {
  source: LX.OnlineSource
  comments: Comment[]
  total: number
  page: number
  limit: number
  maxPage: number
}

export const getNewComment = async(musicInfo: LX.Music.MusicInfoOnline, page: number, limit: number, retryNum = 0): Promise<CommentInfo> => {
  let resp
  try {
    resp = await (music[musicInfo.source].comment.getComment(toOldMusicInfo(musicInfo), page, limit) as Promise<CommentInfo>)
  } catch (error: any) {
    console.log(error.message)
    if (error.message == '取消请求' || ++retryNum > 2) throw error
    resp = await getNewComment(musicInfo, page, limit, retryNum)
  }
  return resp
}

export const getHotComment = async(musicInfo: LX.Music.MusicInfoOnline, page: number, limit: number, retryNum = 0): Promise<CommentInfo> => {
  let resp
  try {
    resp = await (music[musicInfo.source].comment.getHotComment(toOldMusicInfo(musicInfo), page, limit) as Promise<CommentInfo>)
  } catch (error: any) {
    console.log(error.message)
    if (error.message == '取消请求' || ++retryNum > 2) throw error
    resp = await getHotComment(musicInfo, page, limit, retryNum)
  }
  return resp
}

export const filterList = (list: Comment[]) => {
  const seenIds = new Set<string>()
  const coveredSubIds = new Set<string>()
  return list.filter(c => {
    const id = String(c.id)
    if (seenIds.has(id)) return false
    // Deduplicate cross-page QQ Music reply chains whose commentid (sub_${rootId}_${commentId})
    // was already rendered inside a newer thread on an earlier page.
    if (coveredSubIds.has(`sub_${id}`)) return false
    seenIds.add(id)
    if (Array.isArray(c.reply)) {
      for (const r of c.reply) {
        if (r?.id != null) coveredSubIds.add(String(r.id))
      }
    }
    return true
  })
}
