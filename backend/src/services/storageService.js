/**
 * Storage Service — Supabase Storage uploads.
 *
 * Why this exists: the backend runs on Render, whose filesystem is EPHEMERAL
 * (wiped on every redeploy/restart). Files written to local disk (the old
 * `multer.diskStorage` → ./uploads/) therefore disappear and eventually 404.
 * This service uploads files to a Supabase Storage bucket instead, returning a
 * permanent public CDN URL that survives deploys.
 *
 * Configuration (process.env):
 *   SUPABASE_URL              - https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY - service_role key (SECRET, backend only)
 *   SUPABASE_STORAGE_BUCKET   - bucket name (default: "uploads"), must be PUBLIC
 *
 * When the URL + service key are not both set, `isConfigured()` returns false
 * and callers fall back to local disk (fine for local dev; never use on Render).
 */

const { createClient } = require('@supabase/supabase-js');
// supabase-js eagerly constructs a Realtime client, which needs a WebSocket.
// On Node < 22 there's no native WebSocket, so we hand it the `ws` package.
// We never subscribe to a channel, so this opens no connection — it only keeps
// createClient from throwing. (We use Storage only.)
const WebSocket = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

// Build the client once, only when fully configured. The service_role key
// bypasses RLS, so this client must never be exposed to the frontend.
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  });
}

function isConfigured() {
  return supabase !== null;
}

/**
 * Upload a file buffer to Supabase Storage and return its public URL.
 * @param {{ buffer: Buffer, originalName?: string, mimeType?: string }} file
 * @returns {Promise<string>} the permanent public URL
 */
async function uploadBuffer({ buffer, originalName, mimeType }) {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
  }

  // Reuse the existing unique-filename scheme so object paths stay collision-free.
  const sanitized = (originalName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
  const objectPath = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitized}`;

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: mimeType || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

module.exports = {
  isConfigured,
  uploadBuffer,
  BUCKET,
};
