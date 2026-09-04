/*
 * Innov8 Studios — project Files & deliverables. Upload/delete/download
 * wiring is unchanged, still going through src/data/studio.js's
 * uploadProjectFile (private Storage bucket "project-files") — uploads
 * default to category "Working Files" / visibility "Internal", same as
 * before. Rendering changed from a flat .detail-row list to a FileTile
 * grid with real image/video/PDF previews and a fullscreen
 * FileLightbox, both new companions in this same folder.
 */
import { useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import FileTile from "./FileTile.jsx";
import FileLightbox from "./FileLightbox.jsx";

const FILE_CATEGORIES = ["Brief", "References", "Working Files", "Drafts", "Client Review", "Final Deliverables"];

export default function FilesSection({ project, studio, clientPreview }) {
  const { show } = useToast();
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const files = clientPreview ? project.files.filter((f) => f.visibility === "Client") : project.files;

  async function handleFileChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    show("Uploading…");
    try {
      await studio.uploadProjectFile(project, file);
      show(`"${file.name}" uploaded.`);
    } catch (err) {
      console.error("[studio] file upload failed", err);
      show(err.message || "Couldn't upload that file — try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(file) {
    try {
      await studio.deleteProjectFile(project, file);
    } catch (err) {
      console.error("[studio] deleteProjectFile failed", err);
      show(err.message || "Couldn't delete that file — try again.");
    }
  }

  async function handleToggleVisibility(file, visibility) {
    try {
      await studio.updateFileVisibility(project, file, visibility);
    } catch (err) {
      console.error("[studio] updateFileVisibility failed", err);
      show(err.message || "Couldn't change that file's visibility — try again.");
    }
  }

  function openLightbox(file) {
    setLightboxIndex(files.findIndex((f) => f.id === file.id));
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  const grouped = FILE_CATEGORIES.map((cat) => ({ cat, files: files.filter((f) => f.category === cat) })).filter((g) => g.files.length);

  return (
    <div>
      {files.length ? (
        grouped.map((group) => (
          <div key={group.cat}>
            <div className="file-category-label">{group.cat}</div>
            <div className="file-grid">
              {group.files.map((f) => (
                <FileTile
                  key={f.id}
                  file={f}
                  studio={studio}
                  clientPreview={clientPreview}
                  onOpen={openLightbox}
                  onDelete={handleDelete}
                  onToggleVisibility={handleToggleVisibility}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <strong>No files yet</strong>
          <span>{clientPreview ? "The studio hasn't shared any files yet." : "Upload a brief, reference, or deliverable to get started."}</span>
        </div>
      )}

      {!clientPreview && (
        <label className="upload-drop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15.5V5.5" />
            <path d="M7.5 10 12 5.5 16.5 10" />
            <path d="M5 16.5v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
          </svg>
          {uploading ? "Uploading…" : "Click to upload a file"}
          <input type="file" onChange={handleFileChange} disabled={uploading} />
        </label>
      )}

      <FileLightbox files={files} index={lightboxIndex} onNavigate={setLightboxIndex} onClose={closeLightbox} studio={studio} />
    </div>
  );
}
