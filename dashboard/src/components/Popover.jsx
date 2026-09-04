/*
 * Innov8 Studios — generic anchored floating panel, ported from
 * studio.js's openPopover()/closePopover(). Used by Studio's column
 * menu, select/person cell editors, option management, and the
 * Comments kebab menu — anything that needs a small panel positioned
 * near the element that opened it, closing on an outside click or
 * Escape.
 *
 * Rendered via a portal into document.body: `position: fixed` is
 * computed relative to the nearest ancestor with a transform/filter/
 * backdrop-filter, not the viewport, per the CSS spec — and
 * `.detail-drawer`/`.glass-surface` (used by the Studio project
 * drawer, among others) set exactly that. Without the portal, a
 * Popover opened from inside the drawer renders wildly offscreen. A
 * portal keeps this component fixed relative to the real viewport
 * regardless of which ancestor renders it; React preserves event
 * bubbling through the component tree, so the existing outside-click
 * handling below is unaffected.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function usePopoverAnchor() {
  const [anchor, setAnchor] = useState(null);
  return { anchor, open: (el) => setAnchor(el), close: () => setAnchor(null) };
}

export default function Popover({ anchor, onClose, width = 220, className = "", children }) {
  const panelRef = useRef(null);
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = Math.min(rect.left, vw - width - 8);
    left = Math.max(8, left);
    let top = rect.bottom + 6;
    const elH = panelRef.current?.offsetHeight || 0;
    if (top + elH > vh - 8) top = Math.max(8, rect.top - elH - 6);
    setStyle({ left, top, width });
  }, [anchor, width]);

  useEffect(() => {
    if (!anchor) return;
    const handlePointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [anchor, onClose]);

  if (!anchor || !style) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={`floating-popover glass-surface ${className}`}
      style={{ position: "fixed", left: style.left, top: style.top, width: style.width, zIndex: 80 }}
      // A portal changes the DOM parent, not React's tree, so a click
      // inside the panel still bubbles up through whatever component
      // rendered this Popover — in Cell.jsx that's the same cell-value
      // span whose own onClick opens this popover, which would
      // otherwise instantly reopen it right after a pick.
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}
