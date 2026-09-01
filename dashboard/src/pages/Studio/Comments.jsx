/*
 * Innov8 Studios — the internal Comments thread. Studio-only: never
 * rendered in Client Preview (ProjectDetail.jsx gates the whole
 * section), so a client can never see internal team discussion. The
 * composer sits at the bottom of the thread, matching a normal chat
 * layout — post a comment, it appears at the end.
 */
import { useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import { colorForName, initials } from "../../lib/avatar.js";
import { relativeTime } from "../../lib/format.js";

export default function Comments({ project, studio }) {
  const { show } = useToast();
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const thread = [...project.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  async function handleSubmit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    try {
      await studio.addComment(project, content);
      setDraft("");
    } catch (err) {
      console.error("[studio] addComment failed", err);
      show("Couldn't post that comment — try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      {thread.length ? (
        thread.map((item) => (
          <div key={item.id} className="comment-item is-studio">
            <span className="avatar" style={{ background: colorForName(item.author) }}>
              {initials(item.author)}
            </span>
            <div className="comment-body">
              <div className="comment-head">
                <strong>{item.author}</strong>
                <time>{relativeTime(item.createdAt)}</time>
              </div>
              <p>{item.content}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <strong>No comments yet</strong>
          <span>Internal team discussion for this project shows up here.</span>
        </div>
      )}

      <form className="note-composer" onSubmit={handleSubmit}>
        <input className="input" type="text" placeholder="Add internal comment…" value={draft} onChange={(e) => setDraft(e.target.value)} required />
        <button className="btn" type="submit" disabled={posting}>
          Post
        </button>
      </form>
    </div>
  );
}
