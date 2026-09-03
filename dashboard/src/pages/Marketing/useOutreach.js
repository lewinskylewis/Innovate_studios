/*
 * Innov8 Studios — Outreach (Marketing's Prospect pipeline) state, now
 * backed by the real public.contacts table (contact_type = 'Prospect')
 * instead of local mock state. Mirrors useRelationships.js's shape:
 * load once on mount, every mutation awaits the real Supabase write and
 * only patches local state on success.
 *
 * Two deliberate exceptions, both forced by frozen callers that read a
 * return value synchronously right after calling — same situation as
 * useRelationships.js's addRelationship:
 *   - addProspect(): NewProspectModal.jsx reads `record.business`
 *     immediately.
 *   - logOutreachActivity(): OutreachActivityModal.jsx reads
 *     `updated?.business` immediately.
 * Both build the record/patch locally, apply it to state synchronously,
 * then run the real write in the background and roll back (with an
 * error toast) on failure. addProspectNote() has no such caller
 * (ProspectDetail.jsx ignores its return value), so it stays a plain
 * await-then-patch async function.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import * as outreachData from "../../data/outreach.js";

function buildOptimisticProspect(id, input) {
  return {
    id,
    business: input.business,
    industry: input.industry || "",
    serviceInterest: input.serviceInterest || "",
    channel: input.channel || "",
    status: "New",
    contact: { name: input.contact || "", role: "" },
    email: "",
    phone: "",
    lastContact: null,
    nextFollowUp: input.nextFollowUp || null,
    notes: input.notes || "",
    history: []
  };
}

export function useOutreach() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [state, setState] = useState({ prospects: [], leadsGenerated: 0, activeOpportunities: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await outreachData.loadOutreachData();
      setState(data);
    } catch (err) {
      console.error("[outreach] failed to load", err);
      setError(err.message || "Check your connection and try reloading.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function findProspect(id) {
    return state.prospects.find((p) => p.id === id);
  }

  function patchProspect(id, patch) {
    setState((s) => ({ ...s, prospects: s.prospects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }

  function addProspect(input) {
    const id = crypto.randomUUID();
    const record = buildOptimisticProspect(id, input);
    setState((s) => ({ ...s, prospects: [record, ...s.prospects] }));

    outreachData.addProspect({ ...input, id }, { authorProfileId: profile?.id }).catch((err) => {
      console.error("[outreach] addProspect failed", err);
      setState((s) => ({ ...s, prospects: s.prospects.filter((p) => p.id !== id) }));
      show(err.message || "Couldn't save that prospect — try again.");
    });

    return record;
  }

  function logOutreachActivity(prospectId, note) {
    const label = (note || "").trim();
    const current = findProspect(prospectId);
    if (!current || !label) return current || null;

    const nowISO = new Date().toISOString();
    const prevStatus = current.status;
    const prevHistory = current.history;
    const prevLastContact = current.lastContact;
    const bumpStatus = prevStatus === "New";
    const nextStatus = bumpStatus ? "Contacted" : prevStatus;
    const updated = { ...current, history: [...prevHistory, { date: nowISO, label }], lastContact: nowISO, status: nextStatus };

    patchProspect(prospectId, { history: updated.history, lastContact: nowISO, status: nextStatus });

    outreachData.logOutreachActivity(prospectId, label, { authorProfileId: profile?.id, bumpStatus }).catch((err) => {
      console.error("[outreach] logOutreachActivity failed", err);
      patchProspect(prospectId, { history: prevHistory, lastContact: prevLastContact, status: prevStatus });
      show(err.message || "Couldn't log that activity — try again.");
    });

    return updated;
  }

  async function addProspectNote(id, label) {
    const text = (label || "").trim();
    if (!text) return;
    try {
      const entry = await outreachData.addProspectNote(id, text, profile?.id);
      const current = findProspect(id);
      patchProspect(id, { history: [...(current?.history || []), entry], lastContact: entry.date });
    } catch (err) {
      console.error("[outreach] addProspectNote failed", err);
      show(err.message || "Couldn't add that note — try again.");
    }
  }

  return {
    prospects: state.prospects,
    leadsGenerated: state.leadsGenerated,
    activeOpportunities: state.activeOpportunities,
    loading,
    error,
    reload,
    findProspect,
    addProspect,
    logOutreachActivity,
    addProspectNote
  };
}
