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
