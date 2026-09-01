/*
 * Innov8 Studios — toast notifications, ported from shell.js's
 * showToast()/[data-toast-stack] into a React context so any component
 * can call useToast().show(message) instead of reaching for a DOM node.
 * Same markup/classes/timing as before, so dashboard.css needs no
 * changes.
 */
import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const show = useCallback((message) => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, visible: false }]);

    // Two rAFs so the browser paints the toast off-screen first, then
    // transitions it in — matches shell.js's requestAnimationFrame call.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToasts((current) => current.map((t) => (t.id === id ? { ...t, visible: true } : t)));
      });
    });

    const hideTimer = setTimeout(() => {
      setToasts((current) => current.map((t) => (t.id === id ? { ...t, visible: false } : t)));
      const removeTimer = setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 300);
      timers.current.set(`${id}-remove`, removeTimer);
    }, 3200);
    timers.current.set(`${id}-hide`, hideTimer);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast glass-surface${t.visible ? " is-visible" : ""}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/* Prefer the data layer's own message (e.g. a permission error from
   studio.js's mutate()) over a generic fallback — a permission error and
   a dropped network request need different toasts, and the caller
   usually can't tell which one just happened. */
export function toastErrorMessage(err, fallback) {
  return err?.message || fallback;
}
