/*
 * Innov8 Studios — one file grid tile inside Files & Deliverables.
 * Fetches its signed download URL once (studio.getFileDownloadUrl,
 * unchanged), then renders a real preview: images use the signed URL
 * directly; video/PDF generate a client-side thumbnail (see
 * lib/videoThumbnail.js / lib/pdfThumbnail.js) with a generic icon
 * fallback while that's loading or if it fails. Click opens the
 * fullscreen FileLightbox (via onOpen) using the same signed URL — the
 * thumbnail is only ever a preview, never the download/lightbox source.
 */
import { useEffect, useState } from "react";
import { generateVideoThumbnail } from "../../lib/videoThumbnail.js";
import { generatePdfThumbnail } from "../../lib/pdfThumbnail.js";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "avi", "mkv", "m4v"]);

function kindFor(type) {
  const ext = (type || "").toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "generic";
}

function GenericIcon({ kind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M14 3.5v4h4" />
      {kind === "pdf" && <path d="M9 14.5h6M9 17.5h4" stroke="var(--danger)" />}
    </svg>
  );
}

export default function FileTile({ file, studio, clientPreview, onOpen, onDelete, onToggleVisibility }) {
  const kind = kindFor(file.type);
  const [url, setUrl] = useState(null);
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    let active = true;
    studio
      .getFileDownloadUrl(file)
      .then((signedUrl) => {
        if (active) setUrl(signedUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  useEffect(() => {
    if (!url) return;
    let active = true;
    if (kind === "video") {
      generateVideoThumbnail(url)
        .then((dataUrl) => active && setThumb(dataUrl))
        .catch(() => {});
    } else if (kind === "pdf") {
      generatePdfThumbnail(url)
        .then((dataUrl) => active && setThumb(dataUrl))
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [url, kind]);

  function handleDelete(e) {
    e.stopPropagation();
    onDelete(file);
  }

  function handleToggleVisibility(e) {
    e.stopPropagation();
    onToggleVisibility(file, file.visibility === "Client" ? "Internal" : "Client");
  }

  return (
    <div className="file-tile" role="button" tabIndex={0} onClick={() => onOpen(file)} onKeyDown={(e) => e.key === "Enter" && onOpen(file)}>
      {kind === "image" && url ? (
        <img src={url} alt={file.name} loading="lazy" />
      ) : (kind === "video" || kind === "pdf") && thumb ? (
        <img src={thumb} alt={file.name} loading="lazy" />
      ) : (
        <div className="file-tile-fallback">
          <GenericIcon kind={kind} />
        </div>
      )}
      {kind === "video" && (
        <span className="file-tile-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      <div className="file-tile-label">{file.name}</div>
      {!clientPreview && (
        <button
          type="button"
          className={`file-tile-visibility is-${file.visibility === "Client" ? "client" : "internal"}`}
          onClick={handleToggleVisibility}
        >
          {file.visibility === "Client" ? "Client" : "Internal"}
        </button>
      )}
      {!clientPreview && (
        <button type="button" className="icon-remove file-tile-delete" aria-label="Delete file" onClick={handleDelete}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 7h14" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
          </svg>
        </button>
      )}
    </div>
  );
}
