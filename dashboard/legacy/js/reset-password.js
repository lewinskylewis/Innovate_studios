/*
 * Innov8 Studios — dashboard/reset-password.html only. The user arrives
 * here from the recovery link Supabase Auth emails out of
 * js/login.js's forgot-password flow. supabaseClient.js's
 * detectSessionInUrl exchanges that link's token for a session
 * automatically; this file waits for that ("PASSWORD_RECOVERY") and
 * then lets the user set a new password via supabase.auth.updateUser.
 */

const stateLoading = document.querySelector("[data-state-loading]");
const stateForm = document.querySelector("[data-state-form]");
const stateInvalid = document.querySelector("[data-state-invalid]");
const stateSuccess = document.querySelector("[data-state-success]");

const form = document.querySelector("[data-reset-form]");
const errorEl = document.querySelector("[data-reset-error]");
const submitBtn = document.querySelector("[data-reset-submit]");

function showState(state) {
  [stateLoading, stateForm, stateInvalid, stateSuccess].forEach((el) => {
    if (el) el.style.display = el === state ? "" : "none";
  });
}
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.add("is-visible");
}
function clearError() {
  errorEl.classList.remove("is-visible");
}

let recoveryConfirmed = false;

function handleRecoverySession() {
  if (recoveryConfirmed) return;
  recoveryConfirmed = true;
  showState(stateForm);
}

(async () => {
  await window.supabaseReady;

  if (!window.SUPABASE_READY) {
    stateLoading.innerHTML =
      '<h1>Not configured</h1><p class="sub">Dashboard is not configured — see dashboard/js/env.example.js.</p>';
    return;
  }

  window.supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") handleRecoverySession();
  });

  // The PASSWORD_RECOVERY event can fire before this listener attaches,
  // so also check for a session directly — detectSessionInUrl may have
  // already exchanged the link's token by this point.
  const { data: { session } } = await window.supabase.auth.getSession();
  if (session) handleRecoverySession();

  // Give the token exchange a moment to land before treating the link
  // as invalid/expired.
  setTimeout(() => {
    if (!recoveryConfirmed) showState(stateInvalid);
  }, 3000);
})();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const password = form.password.value;
  const confirmPassword = form.confirmPassword.value;

  if (password.length < 6) {
    showError("Password must be at least 6 characters.");
    return;
  }
  if (password !== confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Updating…";

  try {
    const { error } = await window.supabase.auth.updateUser({ password });
    if (error) throw error;
    clearError();
    showState(stateSuccess);
    // The recovery link already left the user signed in, so login.html's
    // own "already signed in" check will carry them straight into the
    // Dashboard from here.
    setTimeout(() => {
      location.href = "login.html";
    }, 2000);
  } catch (err) {
    showError(err.message || "Could not update your password. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Update password";
  }
});
