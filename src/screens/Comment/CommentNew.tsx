import { useEffect, useRef } from 'react'
import { filterList, getNewComment } from './utils'
import music from '@/utils/musicSdk'
import List, { type ListType } from './components/List'
const limit = 15

export default ({ musicInfo, onUpdateTotal }: {
  musicInfo: LX.Music.MusicInfoOnline
  onUpdateTotal: (total: number) => void
}) => {
  const listRef = useRef<ListType>(null)
  const requestSeqRef = useRef(0)
  const listInfo = useRef({ page: 1, total: 0, maxPage: 1, isEnd: false, isLoading: false, isLoadError: false })

  const handleGetComment = async(targetMusic: LX.Music.MusicInfoOnline, page: number, seq: number) => {
    listInfo.current.isLoading = true
    return getNewComment(targetMusic, page, limit).then(commentInfo => {
      if (seq !== requestSeqRef.current) return null
      listInfo.current.page = page
      listInfo.current.isLoading = false
      if (listInfo.current.isLoadError) {
        listInfo.current.isLoadError = false
      }
      return commentInfo
    }).catch(async err => {
      if (seq !== requestSeqRef.current) return null
      console.log(err)
      if (err.message != '取消请求') {
        listInfo.current.isLoading = false
        listInfo.current.isLoadError = true
      }
      throw err
    })
  }

  const updateStatus = () => {
    if (listInfo.current.isLoadError) {
      listRef.current?.setStatus('error')
    } else if (listInfo.current.isEnd) {
      listRef.current?.setStatus('end')
    } else if (!listInfo.current.isLoading) {
      listRef.current?.setStatus('idle')
    }
  }

  const handleListLoadMore = () => {
    if (listInfo.current.isLoading || listInfo.current.isEnd) return
    const list = listRef.current?.getList() ?? []
    const page = list.length ? listInfo.current.page + 1 : 1
    const seq = requestSeqRef.current
    listRef.current?.setStatus('loading')
    void handleGetComment(musicInfo, page, seq).then(result => {
      if (!result || seq !== requestSeqRef.current) return
      const isEnd = page >= listInfo.current.maxPage || !result.comments.length
      if (listInfo.current.isEnd != isEnd) listInfo.current.isEnd = isEnd
      listRef.current?.setList(filterList([...(listRef.current?.getList() ?? []), ...result.comments]))
    }).catch(() => {}).finally(() => {
      if (seq === requestSeqRef.current) updateStatus()
    })
  }

  const handleListRefresh = () => {
    const seq = ++requestSeqRef.current
    listRef.current?.setStatus('refreshing')
    void handleGetComment(musicInfo, 1, seq).then(result => {
      if (!result || seq !== requestSeqRef.current) return
      listInfo.current.total = result.total
      listInfo.current.maxPage = result.maxPage
      onUpdateTotal(result.total)
      const isEnd = result.maxPage <= 1 || !result.comments.length
      if (listInfo.current.isEnd != isEnd) listInfo.current.isEnd = isEnd
      listRef.current?.setList(filterList(result.comments))
    }).catch(() => {}).finally(() => {
      if (seq === requestSeqRef.current) updateStatus()
    })
  }

  const handleShowComment = (targetMusic: LX.Music.MusicInfoOnline) => {
    if (!targetMusic.id || !music[targetMusic.source].comment) return
    const seq = ++requestSeqRef.current
    listInfo.current.page = 1
    listInfo.current.total = 0
    listInfo.current.maxPage = 1
    listInfo.current.isEnd = false
    listInfo.current.isLoading = false
    listInfo.current.isLoadError = false
    listRef.current?.setList([])
    listRef.current?.setStatus('loading')
    void handleGetComment(targetMusic, 1, seq).then(result => {
      if (!result || seq !== requestSeqRef.current) return
      listInfo.current.total = result.total
      listInfo.current.maxPage = result.maxPage
      onUpdateTotal(result.total)
      const isEnd = result.maxPage <= 1 || !result.comments.length
      if (listInfo.current.isEnd != isEnd) listInfo.current.isEnd = isEnd
      listRef.current?.setList(filterList(result.comments))
    }).catch(() => {}).finally(() => {
      if (seq === requestSeqRef.current) updateStatus()
    })
  }

  useEffect(() => {
    handleShowComment(musicInfo)
    return () => {
      requestSeqRef.current += 1
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicInfo.id])

  return (
    <List
      ref={listRef}
      onLoadMore={handleListLoadMore}
      onRefresh={handleListRefresh}
    />
  )
}
