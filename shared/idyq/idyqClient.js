/**
 * IdoYourQuotes (IDYQ) signed HTTP client.
 *
 * WorkTrackr calls IDYQ server-to-server, read-only. Every request is signed
 * with a shared HMAC secret, matching the bridge style used by TGA Studio.
 *
 * Env vars (set on BOTH the web service and the worker service):
 *   WORKTRACKR_BRIDGE_SECRET  - long random hex; SAME value on IDYQ; DIFFERENT
 *                               from Studio's IDYQ_BRIDGE_SECRET. Never hardcoded.
 *   IDYQ_BASE_URL             - defaults to https://idoyourquotes.com
 *   IDYQ_BRIDGE_EXPIRY_SECONDS- optional, default 90 (Studio uses a 60-120s ticket)
 *
 * Signature scheme:
 *   payload  = "<expiryUnixSeconds>.<nonce>.<METHOD>.<PATH>"
 *   hmac     = HMAC_SHA256(payload, WORKTRACKR_BRIDGE_SECRET)  -> lowercase hex
 *   header   = X-WT-Signature: <expiry>.<nonce>.<hmac>
 *
 * IDYQ verifies with the same secret and rejects expired/invalid signatures.
 * The distinct header name (X-WT-Signature) is how IDYQ knows to use the
 * WorkTrackr secret rather than Studio's.
 *
 * ── ASSUMPTIONS TO CONFIRM AGAINST STUDIO (change here if Studio differs) ──
 *   1. PATH is signed WITHOUT the query string (just the path, e.g.
 *      "/api/external/catalogue"). If Studio signs path+query, set
 *      SIGN_INCLUDES_QUERY = true below.
 *   2. METHOD is uppercase ("GET").
 *   3. hmac is lowercase hex.
 *   4. expiry window is 60-120s (default 90).
 */

const crypto = require('crypto');

const DEFAULT_BASE_URL = 'https://idoyourquotes.com';

// If Studio signs the full path INCLUDING the query string, flip this to true.
const SIGN_INCLUDES_QUERY = false;

function getConfig() {
  const secret = process.env.WORKTRACKR_BRIDGE_SECRET;
  if (!secret) {
    throw new Error('WORKTRACKR_BRIDGE_SECRET is not set');
  }
  const baseUrl = (process.env.IDYQ_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const expirySeconds = parseInt(process.env.IDYQ_BRIDGE_EXPIRY_SECONDS || '90', 10);
  return { secret, baseUrl, expirySeconds };
}

/**
 * Build the X-WT-Signature header value for a request.
 * @param {string} method  e.g. 'GET'
 * @param {string} signedPath  the PATH to sign (path only, or path+query — see SIGN_INCLUDES_QUERY)
 * @param {string} secret
 * @param {number} expirySeconds
 */
function buildSignatureHeader(method, signedPath, secret, expirySeconds) {
  const expiry = Math.floor(Date.now() / 1000) + expirySeconds;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${expiry}.${nonce}.${method.toUpperCase()}.${signedPath}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${expiry}.${nonce}.${hmac}`;
}

function buildQueryString(query = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  }
  return qs.toString();
}

/**
 * Make a signed GET request to IDYQ and return parsed JSON.
 * Throws on non-2xx (error carries .status and a short body snippet).
 */
async function idyqGet(path, query = {}) {
  const { secret, baseUrl, expirySeconds } = getConfig();
  const queryString = buildQueryString(query);
  const fullPath = queryString ? `${path}?${queryString}` : path;
  const signedPath = SIGN_INCLUDES_QUERY ? fullPath : path;
  const signature = buildSignatureHeader('GET', signedPath, secret, expirySeconds);

  const res = await fetch(baseUrl + fullPath, {
    method: 'GET',
    headers: {
      'X-WT-Signature': signature,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch (_) { /* ignore */ }
    const err = new Error(`IDYQ GET ${path} failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

module.exports = {
  idyqGet,
  buildSignatureHeader, // exported for testing / verification against Studio
  getConfig,
  SIGN_INCLUDES_QUERY,
};
