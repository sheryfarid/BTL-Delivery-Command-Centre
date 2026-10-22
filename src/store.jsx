import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { seed } from './seed.js';
import { uid, nowISO, byId } from './engine.js';

const KEY = 'btl-dcc-state-v3';
const PREF = 'btl-dcc-prefs-v1';
const Ctx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s && s.version === 3) return s; }
  } catch (e) { /* storage unavailable: start from demo data */ }
  return seed();
}
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch (e) { return {}; }
}

export function StoreProvider({ children }) {
  const [s, setS] = useState(load);
  const prefs0 = useRef(loadPrefs()).current;
  const [meId, setMeId] = useState(prefs0.me || 'misbah');
  const [theme, setTheme] = useState(prefs0.theme || 'auto');
  const [route, setRoute] = useState(prefs0.route || { page: 'dashboard' });
  const [toasts, setToasts] = useState([]);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); setSaveError(false); } catch (e) { setSaveError(true); }
  }, [s]);
  useEffect(() => {
    try { localStorage.setItem(PREF, JSON.stringify({ me: meId, theme, route })); } catch (e) { /* ignore */ }
  }, [meId, theme, route]);
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const me = byId(s.users, meId) || s.users[0];

  const toast = useCallback((text, kind = 'ok') => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  // Every change goes through update(): it clones state, applies the change and
  // writes an audit event naming the signed-in user.
  const update = useCallback((fn, audit) => {
    setS((prev) => {
      const next = structuredClone(prev);
      const res = fn(next);
      if (res === false) return prev;
      if (audit) next.audit.unshift({ id: uid('a'), at: nowISO(), userId: meId, projectId: audit.projectId || null, action: audit.action, detail: audit.detail || '' });
      return next;
    });
  }, [meId]);

  const reset = () => { const fresh = seed(); setS(fresh); setRoute({ page: 'dashboard' }); toast('Demonstration data reloaded'); };
  const go = (r) => { setRoute(r); window.scrollTo({ top: 0 }); };

  return <Ctx.Provider value={{ s, me, meId, setMeId, update, theme, setTheme, route, go, toast, toasts, reset, saveError }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
