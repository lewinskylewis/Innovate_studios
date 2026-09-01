/*
 * Innov8 Studios — the shared React shell every protected page renders
 * inside: Sidebar + main content area. Ported from the vanilla
 * dashboard's repeated .dash-shell / .dash-sidebar / .dash-main markup
 * (see legacy/index.html, legacy/studio.html, legacy/marketing.html),
 * now a single reusable layout future pages plug into via <Outlet />.
 */
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { ToastProvider } from "../lib/ToastContext.jsx";

export default function AppShell() {
  return (
    <ToastProvider>
      <div className="dash-ambient" aria-hidden="true" />
      <div className="dash-shell">
        <Sidebar />
        <main className="dash-main">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}
