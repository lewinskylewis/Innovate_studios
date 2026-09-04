/*
 * Innov8 Studios — fullscreen file viewer. A dedicated fixed overlay
 * (not the constrained centered Modal component — that clipped media
 * and hid the header/footer for tall content) so the close button,
 * filename, and Download are always visible regardless of media size,
 * and media itself is object-fit:contain so nothing is cropped.
 * Navigates across every file in the current (already
 * clientPreview-filtered) list via arrow buttons, swipe, and
 * ArrowLeft/ArrowRight/Escape keys — one signed URL is fetched per
 * file as the user navigates (studio.getFileDownloadUrl, unchanged).
 *
 * Rendered via a portal into document.body — same reason as
 * Popover.jsx: `.detail-drawer`/`.glass-surface` set backdrop-filter,
 * which per the CSS spec makes that ancestor the containing block for
 * any `position: fixed` descendant instead of the real viewport. Without
 * the portal, this overlay renders pinned to the drawer's own on-screen
 * box (fixed at the drawer's top edge, `min(38rem,100vw)` wide) rather
 * than covering the full viewport — which is exactly why it looked like
 * it "opens at the top of the page" regardless of scroll position, and
 * why closing it never needed to touch scroll: the underlying page's
 * scroll position was never actually altered, only the overlay itself
 * was mispositioned.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "avi", "mkv", "m4v"]);

export default function FileLightbox({ files, index, onNavigate, onClose, studio }) {
  const open = index != null && index >= 0 && index < files.length;
  const file = open ? files[index] : null;
  const [url, setUrl] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    if (!file) return;
    let active = true;
    setUrl(null);
    studio
      .getFileDownloadUrl(file)
      .then((signedUrl) => active && setUrl(signedUrl))
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (e.key === "ArrowRight" && index < files.length - 1) onNavigate(index + 1);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, index, files.length, onNavigate, onClose]);

  if (!open) return null;

  const ext = (file.type || "").toLowerCase();
  const kind = IMAGE_EXT.has(ext) ? "image" : VIDEO_EXT.has(ext) ? "video" : ext === "pdf" ? "pdf" : "generic";

  function handleTouchStart(e) {
    setTouchStartX(e.touches[0].clientX);
  }
  function handleTouchEnd(e) {
    if (touchStartX == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);
    if (Math.abs(delta) < 50) return;
    if (delta > 0 && index > 0) onNavigate(index - 1);
    if (delta < 0 && index < files.length - 1) onNavigate(index + 1);
  }

  return createPortal(
    <div className="file-lightbox-overlay" role="dialog" aria-modal="true" aria-label={file.name}>
      <div className="file-lightbox-topbar">
        <span className="file-lightbox-name">{file.name}</span>
        <div className="file-lightbox-topbar-actions">
          {url && (
            <a className="btn file-lightbox-download" href={url} target="_blank" rel="noopener noreferrer" download={file.name}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15.5V5.5" />
                <path d="M7.5 11 12 15.5 16.5 11" />
                <path d="M5 16.5v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
              </svg>
              <span>Download</span>
            </a>
          )}
          <button type="button" className="icon-btn file-lightbox-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="file-lightbox-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {index > 0 && (
          <button type="button" className="file-lightbox-nav is-prev" aria-label="Previous file" onClick={() => onNavigate(index - 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        )}

        {!url ? (
          <p className="sub">Loading…</p>
        ) : kind === "image" ? (
          <img src={url} alt={file.name} />
        ) : kind === "video" ? (
          <video src={url} controls autoPlay />
        ) : kind === "pdf" ? (
          <iframe src={url} title={file.name} />
        ) : (
          <div className="empty-state">
            <strong>{file.name}</strong>
            <span>No preview available for this file type — use Download instead.</span>
          </div>
        )}

        {index < files.length - 1 && (
          <button type="button" className="file-lightbox-nav is-next" aria-label="Next file" onClick={() => onNavigate(index + 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

      {files.length > 1 && (
        <div className="file-lightbox-counter">
          {index + 1} / {files.length}
        </div>
      )}
    </div>,
    document.body
  );
}
