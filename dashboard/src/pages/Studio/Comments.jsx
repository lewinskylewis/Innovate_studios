/*
 * Innov8 Studios — Studio<->Client comment thread. A studio-authored
 * comment defaults to internal (visibility='internal') and only reaches
 * the client once explicitly toggled 'Visible to client'; a
 * client-authored comment (author_type='client', posted from the public
 * Client View via SharedProject.jsx's studio stub) is always visible to
 * both sides — see the migrations under supabase/migrations/20260905*
 * for the RLS enforcing this server-side, not just the conditionals
 * below. `clientPreview` (real Studio "Preview as client" toggle, or
 * permanently true in `standalone` Client View) hides the visibility
 * toggle/3-dot menu and internal-only comments from that reader.
 *
 * The composer only renders for the real Studio thread (!clientPreview)
 * or the real public Client View (standalone) — NOT for the "Preview as
 * client" mock toggle, which is a read-only simulation of what a client
 * sees (per its own banner text) and has no real client identity to
 * post as; letting it post there previously created a real, confusing
 * internal Studio comment that then looked "missing" from the very
 * preview that created it.
 */
import { useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import { colorForName, initials } from "../../lib/avatar.js";
import { relativeTime } from "../../lib/format.js";
import Popover, { usePopoverAnchor } from "../../components/Popover.jsx";

function CommentMenu({ item, onReply, onDelete }) {
  const { anchor, open, close } = usePopoverAnchor();

  return (
    <>
      <button type="button" className="icon-btn comment-more-btn" aria-label="Comment options" onClick={(e) => open(e.currentTarget)}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      <Popover anchor={anchor} onClose={close} width={160} className="popover-menu">
        <button
          type="button"
          onClick={() => {
            onReply(item);
            close();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 10 4 15l5 5" />
            <path d="M4 15h11a5 5 0 0 0 5-5V6" />
          </svg>
          Reply
        </button>
        <button
          type="button"
          className="is-danger"
          onClick={() => {
            onDelete(item);
            close();
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 7h14" />
            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
          </svg>
          Delete
        </button>
      </Popover>
    </>
  );
}

export default function Comments({ project, studio, clientPreview = false, standalone = false }) {
  const { show } = useToast();
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const canCompose = standalone || !clientPreview;
  const canManage = !clientPreview;

  const thread = [...project.comments]
    .filter((c) => !clientPreview || c.authorType === "client" || c.visibility === "client")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  async function handleSubmit(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    const body = replyTo ? `> ${replyTo.author}: ${replyTo.content.slice(0, 120)}\n\n${content}` : content;
    setPosting(true);
    try {
      await studio.addComment(project, body);
      setDraft("");
      setReplyTo(null);
    } catch (err) {
      console.error("[studio] addComment failed", err);
      show("Couldn't post that comment — try again.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleVisibility(item) {
    try {
      await studio.updateCommentVisibility(project, item, item.visibility === "client" ? "internal" : "client");
    } catch (err) {
      console.error("[studio] updateCommentVisibility failed", err);
      show(err.message || "Couldn't change that comment's visibility — try again.");
    }
  }

  async function handleDelete(item) {
    try {
      await studio.deleteComment(project, item);
    } catch (err) {
      console.error("[studio] deleteComment failed", err);
      show(err.message || "Couldn't delete that comment — try again.");
    }
  }

  return (
    <div>
      {thread.length ? (
        thread.map((item) => (
          <div key={item.id} className={`comment-item is-${item.authorType}`}>
            <span className="avatar" style={{ background: colorForName(item.author) }}>
              {initials(item.author)}
            </span>
            <div className="comment-body">
              <div className="comment-head">
                <strong>{item.author}</strong>
                <span className="comment-tag">{item.authorType === "client" ? "CLIENT" : "STUDIO"}</span>
                <time>{relativeTime(item.createdAt)}</time>
                <div className="comment-head-actions">
                  {canManage && item.authorType === "studio" && (
                    <button
                      type="button"
                      className={`comment-visibility-toggle is-${item.visibility === "client" ? "client" : "internal"}`}
                      onClick={() => toggleVisibility(item)}
                    >
                      {item.visibility === "client" ? "Client" : "Internal"}
                    </button>
                  )}
                  {canManage && <CommentMenu item={item} onReply={setReplyTo} onDelete={handleDelete} />}
                </div>
              </div>
              <p>{item.content}</p>
            </div>
          </div>
        ))
      ) : (
        <div className="empty-state">
          <strong>No comments yet</strong>
          <span>{clientPreview ? "Nothing shared here yet." : "Internal team discussion for this project shows up here."}</span>
        </div>
      )}

      {canCompose && (
        <>
          {replyTo && (
            <div className="comment-reply-preview">
              <div className="comment-reply-preview-text">
                <strong>Replying to {replyTo.author}</strong>
                <span>{replyTo.content.slice(0, 80)}</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>
          )}
          <form className="note-composer" onSubmit={handleSubmit}>
            <input
              className="input"
              type="text"
              placeholder={standalone ? "Add a comment or question…" : "Add internal comment…"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              required
            />
            <button className="btn" type="submit" disabled={posting}>
              {standalone ? "Send" : "Post"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
