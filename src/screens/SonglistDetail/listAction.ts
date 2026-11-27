import { createList, setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import { getListDetail, getListDetailAll } from '@/core/songlist'
import { LIST_IDS } from '@/config/constant'
import listState from '@/store/list/state'
import syncSourceList from '@/core/syncSourceList'
import { confirmDialog, toMD5, toast } from '@/utils/tools'
import songlistState, { type Source } from '@/store/songlist/state'
import { saveListExtraMeta, type MyListExtraMeta } from '@/utils/listMetaCache'

const getListId = (id: string, source: LX.OnlineSource) => `${source}__${id}`

export const handlePlay = async(id: string, source: Source, list?: LX.Music.MusicInfoOnline[], index = 0, name?: string) => {
  const listId = getListId(id, source)
  const listName = name || songlistState.listDetailInfo.info.name || ''
  let isPlayingList = false
  if (!list?.length) list = (await getListDetail(id, source, 1)).list
  if (list?.length) {
    await setTempList(listId, [...list], listName)
    void playList(LIST_IDS.TEMP, index)
    isPlayingList = true
  }
  const fullList = await getListDetailAll(source, id)
  if (!fullList.length) return
  if (isPlayingList) {
    if (listState.tempListMeta.id == listId) {
      await setTempList(listId, [...fullList], listName)
    }
  } else {
    await setTempList(listId, [...fullList], listName)
    void playList(LIST_IDS.TEMP, index)
  }
}

export const handleCollect = async(id: string, source: Source, name: string, extraMeta?: MyListExtraMeta) => {
  const listId = getListId(id, source)

  const targetList = listState.userList.find(l => l.source == source && (l.sourceListId == id || l.sourceListId == listId))
  if (targetList) {
    if (extraMeta) void saveListExtraMeta(targetList.id, extraMeta)
    const confirm = await confirmDialog({
      message: global.i18n.t('duplicate_list_tip', { name: targetList.name }),
      cancelButtonText: global.i18n.t('list_import_part_button_cancel'),
      confirmButtonText: global.i18n.t('confirm_button_text'),
    })
    if (!confirm) return
    void syncSourceList(targetList)
    return
  }

  const createdId = `${source}_${toMD5(listId)}`
  const list = await getListDetailAll(source, id)
  await createList({
    name,
    id: createdId,
    list,
    source,
    sourceListId: id,
  })
  if (extraMeta) void saveListExtraMeta(createdId, extraMeta)
  toast(global.i18n.t('collect_success'))
}
