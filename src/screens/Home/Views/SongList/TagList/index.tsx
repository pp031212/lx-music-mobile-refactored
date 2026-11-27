import { type Source } from '@/store/songlist/state'
import List, { type ListProps } from './List'

export default ({ source, activeId }: {
  source: Source
  activeId: string
}) => {
  const handleTagChange: ListProps['onTagChange'] = (name, id) => {
    global.app_event.hideSonglistTagList()
    requestAnimationFrame(() => {
      global.app_event.songlistTagInfoChange(name, id)
    })
  }

  return <List source={source} activeId={activeId} onTagChange={handleTagChange} />
}
