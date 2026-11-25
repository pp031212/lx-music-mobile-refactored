import { useMemo, useRef, useState } from 'react'
import { Alert, FlatList, ScrollView, TouchableOpacity, View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import Modal, { type ModalType } from '@/components/common/Modal'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { useDownloads } from '@/store/download/hook'
import { downloadManager } from '@/core/download'
import { DownloadSettingsContent } from '../Setting/settings/Download'
import { playListById } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import { BorderWidths } from '@/theme'
import { createStyle, toast } from '@/utils/tools'

type FilterTab = 'all' | 'active' | 'completed'

const perform = (operation: Promise<unknown>) => {
  void operation.catch(error => { toast(error instanceof Error ? error.message : String(error), 'long') })
}
const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const { tasks } = useDownloads()
  const settingsModalRef = useRef<ModalType>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const canStartAll = useMemo(() => tasks.some(task => task.status == 'pause' || task.status == 'error'), [tasks])
  const canPauseAll = useMemo(() => tasks.some(task => task.status == 'run' || task.status == 'waiting'), [tasks])

  const counts = useMemo(() => {
    let completed = 0
    let active = 0
    for (const task of tasks) {
      if (task.status == 'completed') completed += 1
      else active += 1
    }
    return { all: tasks.length, active, completed }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return tasks.filter(task => task.status != 'completed')
      case 'completed':
        return tasks.filter(task => task.status == 'completed')
      case 'all':
      default:
        return tasks
    }
  }, [tasks, activeTab])

  const tabs = useMemo(() => {
    const isEnglish = t('nav_download') == 'Download'
    return [
      { id: 'all' as const, label: `${isEnglish ? 'All' : '全部'}${counts.all ? ` (${counts.all})` : ''}` },
      { id: 'active' as const, label: `${t('download_state_run')}${counts.active ? ` (${counts.active})` : ''}` },
      { id: 'completed' as const, label: `${t('download_state_completed')}${counts.completed ? ` (${counts.completed})` : ''}` },
    ]
  }, [counts, t])

  const removeTask = (task: LX.Download.ListItem) => {
    Alert.alert(t('download_remove'), task.metadata.musicInfo.name, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('download_remove_record'), onPress: () => { perform(downloadManager.remove(task.id, false)) } },
      { text: t('download_delete_file'), style: 'destructive', onPress: () => { perform(downloadManager.remove(task.id, true)) } },
    ])
  }

  const openSettings = () => {
    settingsModalRef.current?.setVisible(true)
  }

  const closeSettings = () => {
    settingsModalRef.current?.setVisible(false)
  }

  const renderTask = ({ item: task }: { item: LX.Download.ListItem }) => {
    const isCompleted = task.status == 'completed'
    const isRunning = task.status == 'run' || task.status == 'waiting'
    const qualityUpper = task.metadata.quality.toUpperCase()
    const isLossless = qualityUpper.includes('FLAC') || qualityUpper.includes('APE')

    const handlePrimaryAction = () => {
      if (isCompleted) {
        perform(playListById(LIST_IDS.DOWNLOAD, task.id))
      } else if (isRunning) {
        perform(downloadManager.pause([task.id]))
      } else {
        perform(downloadManager.start([task.id]))
      }
    }

    const primaryIcon = isCompleted ? 'play' : isRunning ? 'pause' : 'available_updates'
    const primaryLabel = isCompleted ? t('play') : isRunning ? t('download_pause') : t('download_restart')

    return (
      <TouchableOpacity
        activeOpacity={isCompleted ? 0.75 : 1}
        onPress={isCompleted ? handlePrimaryAction : undefined}
        style={{
          ...styles.taskCard,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskInfo}>
            <Text size={15} color={theme['c-font']} numberOfLines={1} style={styles.songTitle}>
              {task.metadata.musicInfo.name}
            </Text>
            <View style={styles.metaRow}>
              <Badge type={isLossless ? 'secondary' : 'tertiary'}>{qualityUpper}</Badge>
              <Badge type={isCompleted ? 'normal' : task.status == 'error' ? 'secondary' : 'tertiary'}>
                {t(`download_state_${task.status}`)}
              </Badge>
              <Text size={12} color={theme['c-font-label']} numberOfLines={1} style={styles.singer}>
                {task.metadata.musicInfo.singer}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              activeOpacity={0.7}
              onPress={handlePrimaryAction}
              style={{
                ...styles.iconBtn,
                backgroundColor: theme['c-primary-alpha-900'],
              }}
            >
              <Icon name={primaryIcon} size={14} color={theme['c-primary-font-active']} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('download_remove')}
              activeOpacity={0.7}
              onPress={() => { removeTask(task) }}
              style={styles.iconBtn}
            >
              <Icon name="remove" size={14} color={theme['c-font-label']} />
            </TouchableOpacity>
          </View>
        </View>

        {isCompleted ? (
          <View style={styles.completedFooter}>
            <Text size={11} color={theme['c-font-label']} numberOfLines={1}>
              {task.total > 0 ? size(task.total) : size(task.downloaded)}
            </Text>
          </View>
        ) : (
          <View style={styles.progressSection}>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={task.metadata.musicInfo.name}
              accessibilityValue={{ min: 0, max: 100, now: Math.floor(task.progress) }}
              style={{ ...styles.track, backgroundColor: theme['c-primary-alpha-900'] }}
            >
              <View style={{ ...styles.trackFill, width: `${Math.min(Math.max(task.progress, 0), 100)}%`, backgroundColor: theme['c-primary'] }} />
            </View>
            <View style={styles.progressMeta}>
              <Text size={11} color={theme['c-font-label']} numberOfLines={1}>
                {task.progress.toFixed(1)}% · {size(task.downloaded)} / {task.total > 0 ? size(task.total) : '—'}
              </Text>
              {(task.statusText || task.speed) ? (
                <Text size={11} color={theme['c-font-label']} numberOfLines={1} style={styles.speedText}>
                  {task.statusText || task.speed}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topLeftGroup}>
          <Button
            accessibilityRole="button"
            disabled={!canStartAll}
            onPress={() => { perform(downloadManager.start(tasks.map(task => task.id))) }}
            style={{
              ...styles.pillBtn,
              backgroundColor: theme['c-content-background'],
              borderColor: theme['c-border-background'],
              opacity: canStartAll ? 1 : 0.42,
            }}
          >
            <Icon name="play" size={11} color={theme['c-primary-font-active']} style={styles.pillIcon} />
            <Text size={12} color={theme['c-font']}>{t('download_start_all')}</Text>
          </Button>
          <Button
            accessibilityRole="button"
            disabled={!canPauseAll}
            onPress={() => { perform(downloadManager.pause(tasks.map(task => task.id))) }}
            style={{
              ...styles.pillBtn,
              backgroundColor: theme['c-content-background'],
              borderColor: theme['c-border-background'],
              opacity: canPauseAll ? 1 : 0.42,
            }}
          >
            <Icon name="pause" size={11} color={theme['c-font-label']} style={styles.pillIcon} />
            <Text size={12} color={theme['c-font']}>{t('download_pause_all')}</Text>
          </Button>
        </View>
        <Button
          accessibilityRole="button"
          onPress={openSettings}
          style={{
            ...styles.pillBtn,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        >
          <Icon name="setting" size={12} color={theme['c-font-label']} style={styles.pillIcon} />
          <Text size={12} color={theme['c-font']}>
            {t('download_settings')}
          </Text>
        </Button>
      </View>

      <View style={{ ...styles.segmentWrap, borderBottomColor: theme['c-border-background'] }}>
        <View style={{ ...styles.segmentedTrack, backgroundColor: theme['c-primary-input-background'] }}>
          {tabs.map(tab => {
            const isActive = activeTab == tab.id
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.75}
                onPress={() => { setActiveTab(tab.id) }}
                style={{
                  ...styles.segmentItem,
                  backgroundColor: isActive ? theme['c-content-background'] : 'transparent',
                  elevation: isActive ? 2 : 0,
                }}
              >
                <Text
                  size={12}
                  numberOfLines={1}
                  style={isActive ? styles.segmentActiveText : styles.segmentInactiveText}
                  color={isActive ? theme['c-primary-font-active'] : theme['c-font-label']}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={task => task.id}
        renderItem={renderTask}
        ListHeaderComponent={counts.active > 0 ? (
          <View style={{ ...styles.noticeBanner, backgroundColor: theme['c-primary-alpha-900'] }}>
            <Icon name="help" size={13} color={theme['c-primary-font-active']} style={styles.noticeIcon} />
            <Text size={11} color={theme['c-font-label']} style={styles.noticeText}>
              {t('download_runtime_tip')}
            </Text>
          </View>
        ) : null}
        contentContainerStyle={!filteredTasks.length ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={{ ...styles.emptyIconWrap, backgroundColor: theme['c-primary-alpha-900'] }}>
              <Icon name="download-2" size={26} color={theme['c-primary-font-active']} />
            </View>
            <Text size={13} color={theme['c-font-label']} style={styles.emptyText}>
              {t('download_empty')}
            </Text>
          </View>
        }
      />

      <Modal ref={settingsModalRef} bgColor="rgba(0,0,0,0.36)">
        <View style={styles.sheetBackdrop} pointerEvents="box-none">
          <View
            style={{
              ...styles.sheetContainer,
              backgroundColor: theme['c-content-background'],
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetGrabberWrap}>
              <View style={{ ...styles.sheetGrabber, backgroundColor: theme['c-font-label'] }} />
            </View>
            <View style={{ ...styles.sheetHeader, borderBottomColor: theme['c-border-background'] }}>
              <Text size={16} color={theme['c-font']} style={styles.sheetTitle}>
                {t('download_settings')}
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={closeSettings} style={styles.sheetCloseBtn}>
                <Icon name="close" size={16} color={theme['c-font-label']} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="always">
              <DownloadSettingsContent />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillBtn: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: BorderWidths.normal,
  },
  pillIcon: {
    marginRight: 4,
  },
  segmentWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: BorderWidths.normal,
  },
  segmentedTrack: {
    flexDirection: 'row',
    height: 34,
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  segmentActiveText: {
    fontWeight: '500',
  },
  segmentInactiveText: {
    fontWeight: '400',
  },
  listContent: {
    paddingBottom: 14,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  noticeIcon: {
    marginRight: 6,
  },
  noticeText: {
    flex: 1,
    lineHeight: 16,
  },
  taskCard: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    paddingRight: 8,
  },
  songTitle: {
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  singer: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedFooter: {
    marginTop: 6,
  },
  progressSection: {
    marginTop: 9,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 8,
  },
  speedText: {
    flexShrink: 1,
    textAlign: 'right',
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '76%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  sheetGrabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  sheetTitle: {
    fontWeight: '500',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    maxHeight: '100%',
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
})
