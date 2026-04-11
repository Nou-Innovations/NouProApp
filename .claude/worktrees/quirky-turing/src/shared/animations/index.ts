/**
 * NouPro Animation Assets
 * 
 * This folder contains Lottie JSON animations for empty states.
 * 
 * Animation Types (reuse across screens for consistency):
 * 
 * 1. Soft Pulse Placeholder
 *    - Use when: "Nothing yet, but it will appear"
 *    - Motion: Central object gently scales 1 → 1.04 → 1
 *    - Examples: Notifications, Activity, Recent activity
 * 
 * 2. Progressive Reveal
 *    - Use when: "User is expected to act"
 *    - Motion: Dotted lines/cards fade in one by one
 *    - Examples: Inbox, Conversations, Invoices
 * 
 * 3. Directional Flow
 *    - Use when: Movement or exchange exists conceptually
 *    - Motion: Arrows or dots flowing left → right or up → down
 *    - Examples: Deliveries, Transfers, Transport
 * 
 * 4. Discovery Orbit
 *    - Use when: Exploration or network
 *    - Motion: Small nodes orbiting a center
 *    - Examples: Explore, Connections, Community
 * 
 * 5. Construction / Setup
 *    - Use when: "Create or add something"
 *    - Motion: Boxes/cards stacking, pencil/plus icon appears
 *    - Examples: Products, Add transport, Create invoice
 * 
 * Animation Guidelines:
 * - Loop duration: 3.5-6s
 * - Easing: easeInOut
 * - Idle pause between loops: 400-700ms
 * - Max file size: 150KB
 * - Max height: 120-160px
 * 
 * Folder Structure:
 * - _core/: Reusable generic animations
 * - inbox/: Chat and messaging animations
 * - notifications/: Alert animations
 * - explore/: Discovery animations
 * - connections/: Network animations
 * - deliveries/: Shipping/transport animations
 * - products/: Inventory animations
 * - invoices/: Document animations
 * - transport/: Vehicle animations
 * - community/: Social animations
 */

// Export animation sources as they are added
// Example: export { default as softPulse } from './_core/soft-pulse.json';

// Placeholder exports - uncomment as animations are added
// export const CoreAnimations = {
//   softPulse: require('./_core/soft-pulse.json'),
//   progressiveReveal: require('./_core/progressive-reveal.json'),
//   discoveryOrbit: require('./_core/discovery-orbit.json'),
//   directionalFlow: require('./_core/directional-flow.json'),
//   constructionSetup: require('./_core/construction-setup.json'),
// };
