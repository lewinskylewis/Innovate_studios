/*
 * Innov8 Studios — React /login route. Ports the core sign-in/sign-up
 * behaviour of the vanilla dashboard's js/login.js (see
 * legacy/js/login.js) onto the new AuthContext. Forgot-password and
 * Google sign-in (legacy/js/login.js, legacy/reset-password.html) are
 * not part of this foundation stage — they stay on the legacy page
 * pending a later auth-module migration stage.
 */
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo white.png";
import { useAuth } from "../lib/AuthContext.jsx";
import "./Login.css";

const EYE_PATH = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z';
const EYE_CIRCLE = { cx: 12, cy: 12, r: 3 };
const EYE_OFF_PATHS = [
  "M2 12s3.5-7 10-7c1.6 0 3 .3 4.2.9M22 12s-3.5 7-10 7c-1.6 0-3-.3-4.2-.9",
  "M4 4l16 16",
  "M9.9 9.9a3 3 0 0 0 4.2 4.2"
];

function PasswordField({ id, label, value, onChange, autoComplete, required = true }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-group">
        <input
          className="input"
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={6}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="input-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {EYE_OFF_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={EYE_PATH} />
              <circle {...EYE_CIRCLE} />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Login() {
  const { configured, isAuthenticated, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const location = useLocation();
  const navigate = useNavigate();

  if (!loading && isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || "/";
    return <Navigate to={redirectTo} replace />;
  }

  const isSignup = mode === "signup";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!configured) {
      setError("Dashboard is not configured — see dashboard/public/env.example.js.");
      return;
    }

    setStatus("submitting");
    try {
      if (isSignup) {
        const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
        if (signUpError) throw signUpError;
        setError("Check your email to confirm your account, then sign in.");
        setStatus("success");
      } else {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) throw signInError;
        navigate(location.state?.from?.pathname || "/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setStatus("idle");
    }
  }

  return (
    <div className="auth-shell">
      <div className="panel glass-surface auth-card">
        <div className="auth-brand">
          <img src={logo} alt="Innov8 Studios" />
        </div>

        <h1>{isSignup ? "Create an account" : "Sign in"}</h1>
        <p className="sub">
          {isSignup
            ? "You'll start as a team member — see supabase/BOOTSTRAP_ADMIN.md for admin access."
            : "Internal Studio access only."}
        </p>

        {error && (
          <p className={`auth-error is-visible${status === "success" ? " is-success" : ""}`}>{error}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <PasswordField
            id="password"
            label="Password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {isSignup && (
            <div className="field">
              <label className="field-label" htmlFor="fullname">
                Full name
              </label>
              <input
                className="input"
                id="fullname"
                name="fullname"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={status === "submitting"}>
            {status === "submitting"
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          <span>{isSignup ? "Already have an account?" : "New to the Studio?"}</span>{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setError("");
              setStatus("idle");
            }}
          >
            {isSignup ? "Sign in instead" : "Create an account"}
          </button>
        </p>

        <p className="auth-note">
          New accounts start as a team member. Admin access is granted separately — see{" "}
          <code>supabase/BOOTSTRAP_ADMIN.md</code>.
        </p>
      </div>
    </div>
  );
}
