/**
 * Timings shared by the board's CSS animations and the view's phase timers. Keeping one source of
 * truth means the phase never switches before the tiles have visually landed, which is what made
 * the push look like it jumped: the tiles slid for a fraction of the way and then snapped.
 */
export const PUSH_MS = 620
export const CLEAR_MS = 900
/** How long after an animation should have ended the timer takes over if the event never arrives. */
export const ANIMATION_SLACK_MS = 90
