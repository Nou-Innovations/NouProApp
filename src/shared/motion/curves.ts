/**
 * Motion Curves - NouPro Animation System
 * 
 * Premium, controlled, confident motion.
 * No bounce. No overshoot. No "playful spring."
 * 
 * Use these cubic-bezier curves for consistent motion across the app.
 */

export const Curves = {
  /**
   * Default: smooth and premium
   * Use for most UI transitions
   */
  standard: [0.2, 0.0, 0.0, 1.0] as const,

  /**
   * Entrance: slightly snappier start, still soft landing
   * Use for elements entering the screen
   */
  enter: [0.16, 1.0, 0.3, 1.0] as const,

  /**
   * Exit: quick but not harsh
   * Use for elements leaving the screen
   */
  exit: [0.4, 0.0, 1.0, 1.0] as const,

  /**
   * Emphasis: for subtle highlight (not bounce)
   * Use for attention-grabbing without being playful
   */
  emphasize: [0.2, 0.8, 0.2, 1.0] as const,
} as const;

export type CurveName = keyof typeof Curves;
export type CurveValue = (typeof Curves)[CurveName];
