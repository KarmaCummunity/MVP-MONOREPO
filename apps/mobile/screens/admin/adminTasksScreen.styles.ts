import { StyleSheet, Platform } from 'react-native';
import colors from '../../globals/colors';
import { FontSizes, LAYOUT_CONSTANTS } from '../../globals/constants';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      height: '100vh' as any,
    } : {
      padding: LAYOUT_CONSTANTS.SPACING.LG,
    }),
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    fontSize: FontSizes.heading2,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: LAYOUT_CONSTANTS.SPACING.MD,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  loadingBanner: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingBannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorBanner: {
    color: colors.error,
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: 'bold',
    writingDirection: 'rtl',
  },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, writingDirection: 'rtl' },

  taskItem: { padding: 12, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  taskItemDone: { opacity: 0.6 },
  checkbox: { marginEnd: 12, paddingTop: 4 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'right' },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'right', marginBottom: 6 },

  metaRow: { alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 12, color: colors.textSecondary },
  priority_high: { backgroundColor: colors.pinkLight, borderColor: colors.pinkLight },
  priority_medium: { backgroundColor: colors.warningLight, borderColor: colors.warningLight },
  priority_low: { backgroundColor: colors.successLight, borderColor: colors.successLight },

  status_open: { backgroundColor: colors.infoLight, borderColor: colors.info },
  status_in_progress: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  status_stuck: { backgroundColor: colors.errorLight, borderColor: colors.error },
  status_testing: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  status_done: { backgroundColor: colors.successLight, borderColor: colors.success },
  status_archived: { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },

  avatarsRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatarSmall: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.white },
  moreAvatar: { backgroundColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' },
  moreAvatarText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },

  creatorText: { fontSize: 11, color: colors.textSecondary, textAlign: 'right', marginTop: 4 },

  hoursRow: { alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
  },
  actualHoursBadge: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  hoursText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '600',
  },

  actionsRow: { flexDirection: 'row-reverse', gap: 16, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: colors.textPrimary },

  assigneesContainer: { marginTop: 4 },
  assigneesContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  assigneeText: { fontSize: 12, color: colors.textSecondary },
  unassignedText: { fontSize: 12, color: colors.error, fontWeight: 'bold' },

  subtaskItem: {
    marginEnd: 24,
    borderStartWidth: 3,
    borderStartColor: colors.info,
    backgroundColor: '#F0F8FF',
  },
  subtaskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 10,
    color: colors.info,
    fontWeight: '600',
  },
  subtasksList: {
    marginTop: 8,
    gap: 8,
  },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
  },
  subtaskBadgeText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '600',
  },
  parentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    backgroundColor: colors.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  parentText: {
    fontSize: 10,
    color: colors.info,
  },

  flatList: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto' as any,
      WebkitOverflowScrolling: 'touch' as any,
    }),
  },
  addButton: {
    ...(Platform.OS === 'web' ? { position: 'fixed' as any } : { position: 'absolute' }),
    end: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    zIndex: 1000
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.background, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 16, color: colors.textPrimary },
  modalInput: { height: 44, backgroundColor: colors.backgroundSecondary, borderRadius: 8, paddingHorizontal: 12, textAlign: 'right', marginBottom: 12, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  row2: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  pickerLabel: { textAlign: 'right', marginBottom: 4, color: colors.textSecondary },
  pickerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.infoLight, borderColor: colors.info },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: colors.textPrimary, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalCancel: { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
  modalSave: { backgroundColor: colors.primary },
  modalBtnText: { color: colors.white, fontWeight: 'bold' },
});

const listContentStyle = Platform.OS === 'web' ? {
  paddingBottom: 100,
  gap: 12,
  paddingHorizontal: LAYOUT_CONSTANTS.SPACING.LG,
  paddingTop: LAYOUT_CONSTANTS.SPACING.LG,
} : {
  paddingBottom: 100,
  gap: 12,
};

export const stylesWithListContent = {
  ...styles,
  listContent: listContentStyle,
};
