/*
 * Innov8 Studios — sign-in / sign-up for login.html only. Every other
 * dashboard page uses js/auth/session.js instead, which assumes a
 * session already exists.
 */

let mode = "signin"; // or "signup"

const form = document.querySelector("[data-signin-form]");
const errorEl = document.querySelector("[data-auth-error]");
const submitBtn = document.querySelector("[data-submit-btn]");
const fullnameField = document.querySelector("[data-fullname-field]");
const fullnameInput = document.querySelector("#fullname");
const forgotLink = document.querySelector("[data-forgot-open]");

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.add("is-visible");
}
function clearError() {
  errorEl.classList.remove("is-visible");
}

document.querySelector("[data-switch-mode]")?.addEventListener("click", () => {
  mode = mode === "signin" ? "signup" : "signin";
  clearError();

  const isSignup = mode === "signup";
  document.querySelector("[data-form-title]").textContent = isSignup ? "Create an account" : "Sign in";
  document.querySelector("[data-form-sub]").textContent = isSignup
    ? "You'll start as a team member — see supabase/BOOTSTRAP_ADMIN.md for admin access."
    : "Internal Studio access only.";
  submitBtn.textContent = isSignup ? "Create account" : "Sign in";
  fullnameField.style.display = isSignup ? "" : "none";
  fullnameInput.required = isSignup;
  if (forgotLink) forgotLink.style.display = isSignup ? "none" : "";
  document.querySelector("[data-switch-prompt]").textContent = isSignup ? "Already have an account?" : "New to the Studio?";
  document.querySelector("[data-switch-mode]").textContent = isSignup ? "Sign in instead" : "Create an account";
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  await window.supabaseReady;
  if (!window.SUPABASE_READY) {
    showError("Dashboard is not configured — see dashboard/js/env.example.js.");
    return;
  }

  const email = form.email.value.trim();
  const password = form.password.value;

  submitBtn.disabled = true;
  submitBtn.textContent = mode === "signup" ? "Creating account…" : "Signing in…";

  try {
    if (mode === "signup") {
      const fullName = fullnameInput.value.trim();
      const { error } = await window.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Without this, Supabase falls back to the project's Site URL
          // (the public website) for the confirmation link — it must
          // point back to the Dashboard instead.
          emailRedirectTo: `${window.location.origin}/dashboard/login.html`
        }
      });
      if (error) throw error;
      showError("Check your email to confirm your account, then sign in.");
      errorEl.style.color = "var(--success, #3ddc84)";
    } else {
      const { error } = await window.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const params = new URLSearchParams(location.search);
      location.href = params.get("next") || "index.html";
    }
  } catch (err) {
    showError(err.message || "Something went wrong. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = mode === "signup" ? "Create account" : "Sign in";
  }
});

// ---------- Forgot password ----------

const authMain = document.querySelector("[data-auth-main]");
const forgotPanel = document.querySelector("[data-forgot-panel]");
const forgotForm = document.querySelector("[data-forgot-form]");
const forgotEmailInput = document.querySelector("#forgot-email");
const forgotErrorEl = document.querySelector("[data-forgot-error]");
const forgotSubmitBtn = document.querySelector("[data-forgot-submit]");

function showForgotStatus(message, isSuccess = false) {
  forgotErrorEl.textContent = message;
  forgotErrorEl.classList.add("is-visible");
  forgotErrorEl.style.color = isSuccess ? "var(--success, #3ddc84)" : "";
}
function clearForgotStatus() {
  forgotErrorEl.classList.remove("is-visible");
  forgotErrorEl.style.color = "";
}

document.querySelector("[data-forgot-open]")?.addEventListener("click", () => {
  clearError();
  clearForgotStatus();
  forgotEmailInput.value = form.email.value.trim();
  authMain.style.display = "none";
  forgotPanel.style.display = "";
});

document.querySelector("[data-forgot-back]")?.addEventListener("click", () => {
  clearForgotStatus();
  forgotPanel.style.display = "none";
  authMain.style.display = "";
});

forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearForgotStatus();

  await window.supabaseReady;
  if (!window.SUPABASE_READY) {
    showForgotStatus("Dashboard is not configured — see dashboard/js/env.example.js.");
    return;
  }

  const email = forgotEmailInput.value.trim();
  forgotSubmitBtn.disabled = true;
  forgotSubmitBtn.textContent = "Sending…";

  try {
    const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
      // Without this, Supabase falls back to the project's Site URL (the
      // public website) for the recovery link — it must point back to
      // the Dashboard's own reset-password page instead.
      redirectTo: `${window.location.origin}/dashboard/reset-password.html`
    });
    if (error) throw error;
    // Supabase does not report whether the address is a real account —
    // always show the same message so this can't be used to enumerate
    // accounts.
    showForgotStatus("If an account exists for this email, a password reset link has been sent.", true);
  } catch (err) {
    showForgotStatus(err.message || "Something went wrong. Try again.");
  } finally {
    forgotSubmitBtn.disabled = false;
    forgotSubmitBtn.textContent = "Send reset link";
  }
});

// ---------- Google OAuth ----------

document.querySelector("[data-google-btn]")?.addEventListener("click", async () => {
  clearError();

  await window.supabaseReady;
  if (!window.SUPABASE_READY) {
    showError("Dashboard is not configured — see dashboard/js/env.example.js.");
    return;
  }

  const { error } = await window.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Same reasoning as the password-reset redirect above: point back
      // at the Dashboard, not the public website's Site URL. Works both
      // locally and on Vercel since it's read from the current origin.
      redirectTo: `${window.location.origin}/dashboard/index.html`
    }
  });
  // On success the browser navigates away to Google immediately, so this
  // only ever runs when signInWithOAuth failed before the redirect.
  if (error) showError(error.message || "Google sign-in failed. Try again.");
});

// Already signed in? Skip straight past the login page.
(async () => {
  await window.supabaseReady;
  if (!window.SUPABASE_READY) return;
  const { data: { session } } = await window.supabase.auth.getSession();
  if (session) {
    const params = new URLSearchParams(location.search);
    location.href = params.get("next") || "index.html";
  }
})();
