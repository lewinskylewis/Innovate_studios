/*
 * Innov8 Studios — React auth foundation, replacing the vanilla
 * dashboard's js/auth/session.js + the sign-in/up half of js/login.js.
 * Same security model, same tables, same rules — just exposed as a
 * context/hook instead of window globals:
 *
 *   Unauthenticated        -> session === null
 *   Authenticated          -> session set, profile still loading
 *   Authenticated+profile  -> profile set, permission_role available
 *
 * The profile row (id, full_name, avatar_color, permission_role) is
 * looked up from public.profiles exactly like session.js did — RLS,
 * the handle_new_user() trigger, and the admin/team_member model are
 * untouched and still enforced entirely by Supabase.
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Tracks whose profile is currently loaded, so onAuthStateChange can tell
  // a genuine new sign-in apart from supabase-js re-emitting SIGNED_IN for
  // the *same* user — which it does on things like the tab regaining focus
  // (a documented supabase-js v2 behavior, not a bug here). Without this,
  // every tab refocus would flip `loading` back to true, which un-mounts
  // every protected route (see ProtectedRoute.jsx) and blows away
  // in-progress UI state — open drawers, the active Studio tab, unsaved
  // form input — for no reason.
  const loadedUserIdRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProfile(currentSession) {
      if (!currentSession) {
        loadedUserIdRef.current = null;
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_color, permission_role")
        .eq("id", currentSession.user.id)
        .single();

      if (!active) return;

      if (error || !data) {
        // Mirrors session.js: signed in but no profile row — treat as a
        // broken session rather than let the app run without a role.
        console.error("[auth] Signed in but no profile row found — signing out.", error);
        await supabase.auth.signOut();
        loadedUserIdRef.current = null;
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      loadedUserIdRef.current = currentSession.user.id;
      setProfile(data);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      loadProfile(initialSession);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);

      if (event === "SIGNED_OUT" || !nextSession) {
        loadedUserIdRef.current = null;
        setProfile(null);
        setLoading(false);
        return;
      }

      // Only reload the profile for an actual different user — covers a
      // genuine SIGNED_IN as well as the initial mount race against
      // getSession() above — not every re-emitted event for the user
      // already loaded (TOKEN_REFRESHED, tab-refocus SIGNED_IN, etc.).
      if (nextSession.user.id !== loadedUserIdRef.current) {
        setLoading(true);
        loadProfile(nextSession);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    configured: isSupabaseConfigured,
    loading,
    session,
    profile,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    isAdmin: profile?.permission_role === "admin",
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, fullName) =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Without this, Supabase falls back to the project's Site URL
          // (the public website) for the confirmation link — send the
          // user back to this app's own /login route instead.
          emailRedirectTo: `${window.location.origin}/login`
        }
      }),
    signOut: () => supabase.auth.signOut()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
