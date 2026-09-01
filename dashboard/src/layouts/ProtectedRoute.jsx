/*
 * Innov8 Studios — auth guard for every protected Dashboard route,
 * replacing session.js's redirect-to-login logic. Rendered as a
 * pathless parent route wrapping AppShell in App.jsx.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

const fullScreenMessageStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0a0a0b",
  color: "#f8f5ef",
  fontFamily: "sans-serif",
  padding: "2rem",
  textAlign: "center"
};

export default function ProtectedRoute() {
  const { configured, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <div style={fullScreenMessageStyle}>
        Dashboard is not configured — see dashboard/public/env.example.js.
      </div>
    );
  }

  if (loading) {
    return <div style={fullScreenMessageStyle}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
