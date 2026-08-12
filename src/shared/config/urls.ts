/**
 * Public URLs, domains and contact addresses — the single source of truth.
 *
 * Five domains used to be hardcoded at their point of use, and they disagreed: the legal
 * copy named `nou.pro`, transactional mail came from `noupro.app`, product shares pointed
 * at `noupro.com`, and the only thing actually serving HTTP — including the `/legal/*`
 * pages the store listings link to — was `nouproapp.onrender.com`, which appeared in none
 * of the copy. Changing the public domain meant editing nine call sites plus three HTML
 * files, so in practice it never got changed consistently.
 */

/** The brand's domain. Used in legal copy and contact addresses. */
export const BRAND_DOMAIN = 'nou.pro';

export const SUPPORT_EMAIL = `support@${BRAND_DOMAIN}`;
export const SALES_EMAIL = `sales@${BRAND_DOMAIN}`;

/**
 * Base for links handed to people OUTSIDE the app (shares, invites).
 *
 * Deliberately NOT `https://nou.pro`: nothing is served there yet, and a link is only
 * worth sharing if something answers it. This points at whatever actually serves HTTP
 * today. Flip this one line to `https://nou.pro` once DNS points at the backend — every
 * link below, and the deep-link prefix in App.tsx, follows automatically.
 */
export const PUBLIC_WEB_URL = 'https://nouproapp.onrender.com';

/** Staff invite link. The backend serves a landing page; the app deep-links from it. */
export const inviteUrl = (companyId: string) => `${PUBLIC_WEB_URL}/join/${companyId}`;

/** Public product share link. */
export const productShareUrl = (productId: string) => `${PUBLIC_WEB_URL}/p/${productId}`;

/** The hosted legal pages — the same copy as the in-app screens. */
export const legalUrl = (page: 'privacy' | 'terms' | 'delete-account') =>
  `${PUBLIC_WEB_URL}/legal/${page}`;
