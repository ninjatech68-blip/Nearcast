/**
 * How often to poll, given whether realtime is actually carrying.
 *
 * The polls were sized for the case where the websocket never connects:
 * the open thread re-read itself every 2.5 seconds and the shell every
 * 8, whatever else was happening. When the socket IS up, every one of
 * those ticks re-fetches something that already arrived milliseconds
 * ago through the subscription — several round trips a minute, per open
 * chat, multiplied by everyone signed in. That is the largest single
 * source of load in the app and none of it buys anything.
 *
 * So the poll goes back to being a floor. Live socket: idle along
 * slowly, purely so a subscription that silently stops delivering
 * cannot freeze the screen indefinitely. No socket: the old cadence,
 * because then polling IS the delivery path.
 *
 * The asymmetry is deliberate and it fails toward "poll fast". Not
 * knowing the socket's state reads as not live, so the cost of being
 * wrong is some redundant queries rather than a chat that looks dead.
 *
 * Pure on purpose: it takes the socket's state rather than reaching for
 * it, so the policy can be read and tested without a transport layer
 * behind it. The screens supply the answer.
 */
export const CHAT_POLL_MS = 2_500;
export const CHAT_POLL_LIVE_MS = 15_000;
export const SHELL_POLL_MS = 8_000;
export const SHELL_POLL_LIVE_MS = 30_000;

/** the open thread: the screen someone is actually looking at. */
export function chatPollMs(live: boolean): number {
  return live ? CHAT_POLL_LIVE_MS : CHAT_POLL_MS;
}

/**
 * the shell: the rail badge and the activity list, for chats nobody has
 * open. Slower than the thread in both states — a count being a few
 * seconds stale is not the same kind of wrong as a message not arriving.
 */
export function shellPollMs(live: boolean): number {
  return live ? SHELL_POLL_LIVE_MS : SHELL_POLL_MS;
}
