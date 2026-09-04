/*
 * Innov8 Studios — the public, unauthenticated /project/:projectSlug
 * page (see App.jsx — this route is deliberately outside
 * ProtectedRoute/AppShell, so no Sidebar/Topbar ever mounts here).
 * Reuses ProjectDetail.jsx (its `standalone` prop hides every
 * Studio-only control) rather than a second project UI, fed by
 * data/sharedProject.js's anon-safe loader instead of useStudio().
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import logo from "../../../assets/images/logo white.png";
import { ToastProvider } from "../../lib/ToastContext.jsx";
import { loadSharedProject, postComment } from "../../data/sharedProject.js";
import { getFileDownloadUrl } from "../../data/studio.js";
import ProjectDetail from "./ProjectDetail.jsx";

export default function SharedProject() {
  const { projectSlug } = useParams();
  const [state, setState] = useState({ project: null, labelFor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadSharedProject(projectSlug)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setError("not-found");
        } else {
          setState(result);
        }
      })
      .catch((err) => {
        console.error("[shared-project] failed to load", err);
        if (active) setError(err.message || "Check your connection and try reloading.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectSlug]);

  // Minimal read-only stub — everything else Client View might call
  // (updateProjectField, createMilestone, uploadProjectFile, ...) is
  // never reached because ProjectDetail's `standalone` prop keeps
  // clientPreview permanently true and hides every editing affordance.
  // addComment is the one real write anon Client View can make (Studio
  // never posts from this stub) — appends locally so it appears without
  // a full reload, matching useStudio's addComment.
  async function addComment(project, content) {
    const comment = await postComment(project.id, content);
    setState((s) => ({ ...s, project: { ...s.project, comments: [...s.project.comments, comment] } }));
    return comment;
  }

  const studioStub = { labelFor: state.labelFor || (() => ""), getFileDownloadUrl, addComment };

  return (
    // ProjectDetail.jsx (and ShareModal.jsx, rendered inert underneath
    // it) call useToast() unconditionally — normally supplied by
    // AppShell.jsx, which this public route deliberately never mounts.
    <ToastProvider>
      <div className="proj-standalone-shell">
        <header className="proj-standalone-header">
          <img src={logo} alt="Innov8 Studios" />
        </header>
        <main className="proj-standalone">
          {loading ? (
            <p className="sub">Loading…</p>
          ) : error === "not-found" ? (
            <div className="empty-state">
              <strong>Project not found</strong>
              <span>This link may be out of date, or the project is no longer shared.</span>
            </div>
          ) : error ? (
            <div className="empty-state">
              <strong>Couldn't load this project</strong>
              <span>{error}</span>
            </div>
          ) : (
            <ProjectDetail project={state.project} studio={studioStub} standalone />
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
