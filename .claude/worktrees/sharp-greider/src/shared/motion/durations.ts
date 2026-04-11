/**
 * Duration Tokens - NouPro Animation System
 * 
 * Consistent timing values for animations across the app.
 * Values are in milliseconds.
 */

export const Durations = {
  /** Icon taps, tiny fades */
  micro: 120,
  
  /** Small enters/exits */
  short: 180,
  
  /** Most UI transitions */
  base: 240,
  
  /** Cards, sheets, empty-states */
  medium: 320,
  
  /** Full-screen transitions */
  long: 420,
  
  /** Pause between gentle loops (Lottie idle) */
  idle: 650,
} as const;

export type DurationName = keyof typeof Durations;
export type DurationValue = (typeof Durations)[DurationName];

/**
 * Lottie-specific animation settings
 */
export const LottieSettings = {
  /** Default playback speed for empty state animations */
  defaultSpeed: 0.65,
  
  /** Minimum speed (for reduced motion scenarios) */
  minSpeed: 0.4,
  
  /** Maximum speed */
  maxSpeed: 0.8,
  
  /** Loop delay in milliseconds */
  loopDelay: 500,
} as const;
