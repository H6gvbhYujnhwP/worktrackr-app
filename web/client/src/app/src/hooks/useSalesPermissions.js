// web/client/src/app/src/hooks/useSalesPermissions.js
// Loads the logged-in user's effective Sales permissions once and shares the
// result across every component that needs to show/hide a Sales area. A
// module-level cache means we only hit /api/sales-permissions/me a single time
// per session, however many components call the hook.
//
// can(key) returns true while still loading (optimistic) so nothing flickers
// away for the common full-access user; once the real answer arrives it tightens
// up. The server enforces the same permissions for real, so a brief optimistic
// show in the UI is harmless.
import { useState, useEffect } from 'react';

let _cache = null;      // { unrestricted, perms } once loaded
let _promise = null;    // in-flight fetch shared by all callers

function fetchOnce() {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = fetch('/api/sales-permissions/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { _cache = d && d.perms ? d : { unrestricted: false, perms: {} }; return _cache; })
      .catch(() => { _cache = { unrestricted: false, perms: {} }; return _cache; });
  }
  return _promise;
}

export default function useSalesPermissions() {
  const [state, setState] = useState(_cache);

  useEffect(() => {
    let alive = true;
    fetchOnce().then((c) => { if (alive) setState(c); });
    return () => { alive = false; };
  }, []);

  const loading = state === null;
  const unrestricted = !!(state && state.unrestricted);
  const perms = (state && state.perms) || {};
  // Optimistic while loading; strict once we know.
  const can = (key) => (loading ? true : unrestricted || !!perms[key]);

  return { loading, unrestricted, perms, can };
}

// Lets an admin's save invalidate the cache so changes show without a reload.
export function clearSalesPermissionsCache() { _cache = null; _promise = null; }
