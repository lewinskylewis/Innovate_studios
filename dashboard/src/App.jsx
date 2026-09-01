import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./layouts/AppShell.jsx";
import ProtectedRoute from "./layouts/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Marketing from "./pages/Marketing/Marketing.jsx";
import Studio from "./pages/Studio/Studio.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/marketing" element={<Marketing />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
