import AsyncStorage from '@react-native-async-storage/async-storage'

export interface MyListExtraMeta {
  img?: string
  desc?: string
}

const STORAGE_KEY = '@lx_mylist_extra_meta_v1'

let memoryCache: Record<string, MyListExtraMeta> | null = null
let loadPromise: Promise<Record<string, MyListExtraMeta>> | null = null

const loadAll = async(): Promise<Record<string, MyListExtraMeta>> => {
  if (memoryCache) return memoryCache
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) {
          memoryCache = {}
          return memoryCache
        }
        try {
          const parsed = JSON.parse(raw)
          memoryCache = parsed && typeof parsed == 'object' ? parsed : {}
        } catch {
          memoryCache = {}
        }
        return memoryCache!
      })
      .catch(() => {
        memoryCache = {}
        return memoryCache
      })
  }
  return loadPromise
}

export const getListExtraMetaSync = (listId: string): MyListExtraMeta | null => {
  return memoryCache?.[listId] ?? null
}

export const getListExtraMeta = async(listId: string): Promise<MyListExtraMeta | null> => {
  const all = await loadAll()
  return all[listId] ?? null
}

export const saveListExtraMeta = async(listId: string, meta: MyListExtraMeta): Promise<void> => {
  if (!listId) return
  const all = await loadAll()
  const prev = all[listId] ?? {}
  const next: MyListExtraMeta = {
    img: meta.img || prev.img,
    desc: meta.desc || prev.desc,
  }
  if (!next.img && !next.desc) return
  all[listId] = next
  memoryCache = all
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
}
