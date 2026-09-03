/*
 * Innov8 Studios — remembers a module page's last-active tab across
 * navigation, mirroring Sidebar.jsx's own collapsed-state persistence
 * (read once via localStorage on mount, write on every change, silently
 * no-op if localStorage is unavailable). Each module page unmounts on
 * route change (App.jsx has no keep-alive), so a plain useState resets
 * to its default every time you navigate away and back — this is the
 * fix, not a new state-management approach.
 */
import { useEffect, useState } from "react";

export function useStoredTab(storageKey, defaultTab, initialOverride) {
  const [tab, setTab] = useState(() => {
    if (initialOverride) return initialOverride;
    try {
      return localStorage.getItem(storageKey) || defaultTab;
    } catch {
      return defaultTab;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, tab);
    } catch {
      /* localStorage unavailable — memory still works for this session */
    }
  }, [storageKey, tab]);

  return [tab, setTab];
}
