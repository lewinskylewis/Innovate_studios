/*
 * Innov8 Studios — generic anchored floating panel, ported from
 * studio.js's openPopover()/closePopover(). Used by Studio's column
 * menu, select/person cell editors, and option management — anything
 * that needs a small panel positioned near the element that opened it,
 * closing on an outside click or Escape.
 */
import { useEffect, useRef, useState } from "react";

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

  return (
    <div
      ref={panelRef}
      className={`floating-popover glass-surface ${className}`}
      style={{ position: "fixed", left: style.left, top: style.top, width: style.width, zIndex: 80 }}
      // The panel is a normal (non-portal) child, so a click inside it
      // still bubbles up through whatever DOM ancestor rendered it — in
      // Cell.jsx that's the same cell-value span whose own onClick opens
      // this popover, which would otherwise instantly reopen it right
      // after a pick. position:fixed only changes layout, not bubbling.
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
