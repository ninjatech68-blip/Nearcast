import { StyleSheet } from 'react-native';

import { tokens } from '@/design-system/tokens';

const { color } = tokens.semantic;
const { space, radius } = tokens.primitive;

export const FONT_REGULAR = 'Manrope_400Regular';
export const FONT_SEMIBOLD = 'Manrope_600SemiBold';

/** Left/right style pairs handed to Gifted Chat's Bubble and Time. */
export const bubbleStyles = {
  wrapper: {
    left: {
      backgroundColor: color.backgroundSurface,
      borderColor: color.borderDefault,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.card,
      paddingHorizontal: space[1],
      paddingVertical: space[1],
      marginRight: space[10],
    },
    right: {
      backgroundColor: color.actionPrimary,
      borderRadius: radius.card,
      paddingHorizontal: space[1],
      paddingVertical: space[1],
      marginLeft: space[10],
    },
  },
  text: {
    left: {
      color: color.textPrimary,
      fontFamily: FONT_REGULAR,
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
    },
    right: {
      color: tokens.primitive.color.stone0,
      fontFamily: FONT_REGULAR,
      fontSize: tokens.typography.body.fontSize,
      lineHeight: tokens.typography.body.lineHeight,
    },
  },
  time: {
    left: {
      color: color.textMuted,
      fontFamily: FONT_REGULAR,
      fontSize: tokens.typography.caption.fontSize,
    },
    right: {
      color: tokens.primitive.color.green100,
      fontFamily: FONT_REGULAR,
      fontSize: tokens.typography.caption.fontSize,
    },
  },
  username: {
    color: color.textSecondary,
    fontFamily: FONT_SEMIBOLD,
    fontSize: tokens.typography.caption.fontSize,
  },
  tick: {
    color: tokens.primitive.color.green100,
    fontSize: tokens.typography.caption.fontSize,
  },
} as const;

export const roomStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.backgroundCanvas },

  dayContainer: { marginVertical: space[4] },
  dayText: {
    color: color.textMuted,
    fontFamily: FONT_SEMIBOLD,
    fontSize: tokens.typography.caption.fontSize,
  },

  systemContainer: { marginVertical: space[3], paddingHorizontal: space[5] },
  systemText: {
    color: color.textMuted,
    fontFamily: FONT_REGULAR,
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
    textAlign: 'center',
  },

  toolbar: {
    backgroundColor: color.backgroundSurface,
    borderTopColor: color.borderDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: space[1],
  },
  toolbarPrimary: { alignItems: 'flex-end' },

  composer: {
    backgroundColor: color.backgroundSubtle,
    borderRadius: radius.control,
    color: color.textPrimary,
    fontFamily: FONT_REGULAR,
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    marginHorizontal: space[3],
    marginVertical: space[2],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    paddingBottom: space[3],
  },

  sendContainer: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginRight: space[3],
    marginBottom: space[2],
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: color.actionPrimary,
    borderRadius: radius.pill,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  sendLabel: {
    color: tokens.primitive.color.stone0,
    fontFamily: FONT_SEMIBOLD,
    fontSize: tokens.typography.label.fontSize,
  },

  deadlineBanner: {
    alignItems: 'center',
    backgroundColor: color.backgroundSubtle,
    paddingHorizontal: space[5],
    paddingVertical: space[2],
  },
  deadlineBannerUrgent: { backgroundColor: color.warningSurface },
  deadlineText: {
    color: color.textMuted,
    fontFamily: FONT_SEMIBOLD,
    fontSize: tokens.typography.caption.fontSize,
  },
  deadlineTextUrgent: { color: color.warningText },

  closedNotice: {
    backgroundColor: color.backgroundSurface,
    borderTopColor: color.borderDefault,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[5],
    paddingVertical: space[5],
  },
  closedTitle: {
    color: color.textPrimary,
    fontFamily: FONT_SEMIBOLD,
    fontSize: tokens.typography.bodyStrong.fontSize,
    lineHeight: tokens.typography.bodyStrong.lineHeight,
    textAlign: 'center',
  },
  closedBody: {
    color: color.textSecondary,
    fontFamily: FONT_REGULAR,
    fontSize: tokens.typography.caption.fontSize,
    lineHeight: tokens.typography.caption.lineHeight,
    marginTop: space[1],
    textAlign: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[8],
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: {
    color: color.textPrimary,
    fontFamily: FONT_SEMIBOLD,
    fontSize: tokens.typography.bodyStrong.fontSize,
    textAlign: 'center',
  },
  emptyBody: {
    color: color.textSecondary,
    fontFamily: FONT_REGULAR,
    fontSize: tokens.typography.body.fontSize,
    lineHeight: tokens.typography.body.lineHeight,
    marginTop: space[2],
    textAlign: 'center',
  },
});
