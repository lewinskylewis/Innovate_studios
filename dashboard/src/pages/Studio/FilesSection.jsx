/*
 * Innov8 Studios — project Files & deliverables, ported from
 * studio.js's buildFilesHtml() + the upload/delete wiring in
 * wireProjectDetail(). Uses the same private Storage bucket
 * ("project-files") via src/data/studio.js's uploadProjectFile —
 * uploads always default to category "Working Files" / visibility
 * "Internal", matching the legacy page (it never exposed a picker for
 * either).
 */
import { useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import { formatDate } from "../../lib/format.js";

const FILE_CATEGORIES = ["Brief", "References", "Working Files", "Drafts", "Client Review", "Final Deliverables"];

export default function FilesSection({ project, studio, clientPreview }) {
  const { show } = useToast();
  const [uploading, setUploading] = useState(false);

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

  async function handleDownload(file) {
    try {
      const url = await studio.getFileDownloadUrl(file);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      console.error("[studio] getFileDownloadUrl failed", err);
      show(err.message || "Couldn't download that file — try again.");
    }
  }

  const grouped = FILE_CATEGORIES.map((cat) => ({ cat, files: files.filter((f) => f.category === cat) })).filter((g) => g.files.length);

  return (
    <div>
      {files.length ? (
        grouped.map((group) => (
          <div key={group.cat}>
            <div className="file-category-label">{group.cat}</div>
            {group.files.map((f) => (
              <div key={f.id} className="detail-row">
                <span className="file-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
                    <path d="M14 3.5v4h4" />
                  </svg>
                </span>
                <div className="detail-row-main">
                  <strong>{f.name}</strong>
                  <span>
                    {f.size} · {f.uploadedBy} · {formatDate(f.uploadedAt)}
                  </span>
                </div>
                <span className={`badge badge--${f.visibility === "Client" ? "active" : "soon"}`}>{f.visibility}</span>
                {clientPreview ? (
                  <button className="btn file-download-btn" type="button" onClick={() => handleDownload(f)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 15.5V5.5" />
                      <path d="M7.5 11 12 15.5 16.5 11" />
                      <path d="M5 16.5v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
                    </svg>
                    Download
                  </button>
                ) : (
                  <button className="icon-remove" type="button" aria-label="Delete file" onClick={() => handleDelete(f)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
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
    </div>
  );
}
