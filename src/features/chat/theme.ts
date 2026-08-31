import type { PartialChatTheme } from '@kesha-antonov/react-native-chat';

import { tokens } from '@/design-system/tokens';

/**
 * The chat library, in Nearcast's colours.
 *
 * Its defaults are Telegram-ish: azure accent, 18px bubbles, rounded
 * composer. Every one of those is a token override, so the whole chat is
 * themed here rather than through per-component style props scattered across
 * the screen — which is the difference between a chat that matches the app and
 * one that merely sits inside it.
 *
 * Two deliberate choices worth stating:
 *
 *   Outgoing bubbles are the forest green, not the orange accent. Orange is
 *   the product's single action colour — it means "this is the thing to
 *   press". Half a conversation painted in it would spend that meaning.
 *
 *   Read ticks ARE the accent. It is the one place in a conversation where a
 *   colour change carries information the shape does not, and the tick is
 *   small enough that it never competes with a button.
 */
const { semantic, primitive } = tokens;

export const chatTheme: PartialChatTheme = {
  colors: {
    accent: semantic.color.accent,
    background: semantic.color.cream,

    // There is no white in this palette, deliberately, so an incoming bubble
    // takes the same quiet raise the app gives its cards: ink at 8% over
    // cream. Outgoing is the deep green, so the two sides read apart before
    // you even notice the alignment.
    incomingBubble: semantic.color.backgroundSubtle,
    outgoingBubble: primitive.color.green,
    incomingText: semantic.color.ink,
    outgoingText: semantic.color.cream,
    incomingMeta: semantic.color.textMutedOnCream,
    outgoingMeta: primitive.color.cream45,
    senderName: semantic.color.textMutedOnCream,

    ticksSent: primitive.color.cream45,
    ticksRead: semantic.color.accent,

    separator: semantic.color.hairlineOnCream,

    inputBackground: semantic.color.backgroundSubtle,
    inputBarBackground: semantic.color.cream,
    inputText: semantic.color.ink,
    placeholder: semantic.color.textMutedOnCream,
    inputFieldBorder: semantic.color.hairlineOnCream,

    dayPillBackground: semantic.color.backgroundSubtle,
    dayPillText: semantic.color.textMutedOnCream,

    // floating things (scroll-to-bottom, the picker) take the same raise
    surface: semantic.color.backgroundSubtle,
    reactionBackground: semantic.color.backgroundSubtle,
    // One step darker for a reaction you added, matching how the app shows a
    // pressed state rather than introducing a colour. Worth a look on a real
    // screen: if it reads as too quiet, this is the line to change.
    reactionActiveBackground: primitive.color.ink12,
    outgoingOverlay: primitive.color.cream16,

    error: semantic.color.accent,
  },

  radii: {
    // The app's shapes are squarer than the library's 18px default: chips are
    // 10, controls 14. A 20px bubble beside a 10px chip reads as two design
    // systems in one screen.
    bubble: primitive.radius.bar,
    bubbleGrouped: primitive.radius.chip,
    inputField: primitive.radius.control,
    sendButton: primitive.radius.pill,
    reaction: primitive.radius.pill,
    dayPill: primitive.radius.chip,
  },

  spacing: {
    bubblePaddingV: primitive.space[3],
    bubblePaddingH: primitive.space[4],
    withinGroup: 2,
    betweenGroups: primitive.space[3],
    screenEdge: primitive.space[5],
    inputToolbarPaddingV: primitive.space[3],
  },

  typography: {
    message: { fontSize: tokens.typography.body.fontSize, lineHeight: tokens.typography.body.lineHeight },
    time: { fontSize: tokens.typography.metaSmall.fontSize },
    senderName: { fontSize: tokens.typography.tagSmall.fontSize, fontWeight: '600' },
    day: { fontSize: tokens.typography.tagSmall.fontSize, fontWeight: '600' },
    system: { fontSize: tokens.typography.metaSmall.fontSize },
  },
};

/**
 * The emoji offered on long-press.
 *
 * Six, not a full keyboard. A reaction is meant to be faster than typing;
 * a picker you have to search is neither.
 */
export const REACTION_EMOJI = ['👍', '🙏', '😂', '❤️', '😮', '👀'];
