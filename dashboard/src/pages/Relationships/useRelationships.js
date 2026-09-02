/*
 * Innov8 Studios — Relationships state, now backed by the real
 * public.contacts table (see supabase/migrations/
 * 20260901000001_contacts_foundation.sql and src/data/relationships.js)
 * instead of local mock state. Mirrors useStudio.js's shape: load once
 * on mount into React state, every mutation awaits the real Supabase
 * write and only patches local state on success — the UI never shows
 * a change that failed to save.
 *
 * The public API surface below (relationships, findRelationship,
 * addRelationship, addNote, logInteraction, setFollowUp, updateTags,
 * updateLeadStatus, updateClientHealth, convertType, markInactive,
 * reactivate) is unchanged from the old mock hook on purpose — every
 * component that consumes this hook (Relationships.jsx,
 * RelationshipList.jsx, RelationshipDetail.jsx, Overview.jsx,
 * NewRelationshipModal.jsx) keeps working with zero edits.
 *
 * One deliberate exception to "await first, then update state":
 * addRelationship() is optimistic. NewRelationshipModal.jsx calls it
 * as `const record = relationships.addRelationship({...})` and reads
 * `record.brandName` immediately afterwards — a synchronous contract
 * from a frozen component this phase is not allowed to touch. Making
 * the real insert awaited would turn `record` into a Promise instead
 * of data. So this one path builds the record locally, adds it to
 * state, and returns it synchronously; the real Supabase insert runs
 * in the background and rolls the optimistic row back (with an error
 * toast) if it fails. Every other mutation is fire-and-forget from its
 * frozen caller too, but none of them read a return value, so they
 * follow the plain await-then-patch pattern with no optimism needed.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import * as relationshipsData from "../../data/relationships.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function buildOptimisticContact(id, input, ownerName) {
  const nowISO = new Date().toISOString();
  return {
    id,
    type: input.type,
    active: true,
    personName: input.personName,
    brandName: input.brandName || input.personName,
    role: input.role || "",
    email: input.email || "",
    phone: input.phone || "",
    website: input.website || "",
    location: input.location || "",
    social: "",
    owner: ownerName,
    source: input.source || "",
    tags: input.tags || [],
    notes: input.notes && input.notes.trim() ? [{ id: crypto.randomUUID(), text: input.notes.trim(), date: nowISO, author: ownerName }] : [],
    interactions: [],
    events: [{ id: crypto.randomUUID(), date: nowISO, type: "created", label: `${input.type} created` }],
    nextFollowUp: null,
    followUpReason: null,
    dateAdded: nowISO,
    dateUpdated: nowISO,
    originContext: null,
    potentialService: input.potentialService || "",
    interestLevel: input.interestLevel || "Medium",
    opportunity: input.opportunity || "",
    serviceInterest: input.serviceInterest || "",
    estimatedValue: input.estimatedValue || 0,
    status: "New",
    priority: input.priority || "Normal",
    servicesUsed: input.servicesUsed || [],
    clientSince: todayISO(),
    relationshipHealth: "Healthy",
    projects: [],
    partnerType: input.partnerType || "",
    capabilities: input.capabilities || []
  };
}

const CONVERT_DEFAULTS = {
  Prospect: { interestLevel: "Medium", priority: "Normal", potentialService: "" },
  Lead: { opportunity: "", serviceInterest: "", estimatedValue: 0, status: "New", priority: "Normal" },
  Client: { servicesUsed: [], relationshipHealth: "Healthy", clientSince: todayISO(), projects: [] },
  Partner: { partnerType: "Creative", capabilities: [] }
};

export function useRelationships() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [state, setState] = useState({ contacts: [], team: [], teamByName: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await relationshipsData.loadRelationshipsData();
      setState(data);
    } catch (err) {
      console.error("[relationships] failed to load", err);
      setError(err.message || "Check your connection and try reloading.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function findRelationship(id) {
    return state.contacts.find((r) => r.id === id);
  }

  function patchContact(id, patch) {
    setState((s) => ({ ...s, contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }

  function addRelationship(input) {
    const id = crypto.randomUUID();
    const ownerName = input.owner || "";
    const record = buildOptimisticContact(id, input, ownerName);
    setState((s) => ({ ...s, contacts: [record, ...s.contacts] }));

    relationshipsData.addContact({ ...input, id }, { teamByName: state.teamByName, authorProfileId: profile?.id }).catch((err) => {
      console.error("[relationships] addContact failed", err);
      setState((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) }));
      show(err.message || "Couldn't save that contact — try again.");
    });

    return record;
  }

  async function addNote(id, text) {
    try {
      const note = await relationshipsData.addContactNote(id, text, profile?.id);
      patchContact(id, { notes: [...(findRelationship(id)?.notes || []), { id: note.id, text: note.content, date: note.created_at, author: note.authorName }] });
    } catch (err) {
      console.error("[relationships] addNote failed", err);
      show(err.message || "Couldn't add that note — try again.");
    }
  }

  async function logInteraction(id, { type, description }) {
    try {
      const note = await relationshipsData.addContactInteraction(id, { type, description }, profile?.id);
      patchContact(id, { interactions: [...(findRelationship(id)?.interactions || []), { id: note.id, type, date: note.created_at, description: note.content, person: note.authorName }] });
    } catch (err) {
      console.error("[relationships] logInteraction failed", err);
      show(err.message || "Couldn't log that interaction — try again.");
    }
  }

  async function setFollowUp(id, { date, reason }) {
    try {
      await relationshipsData.updateContactFollowUp(id, { date, reason });
      patchContact(id, { nextFollowUp: date || null, followUpReason: reason || null });
    } catch (err) {
      console.error("[relationships] setFollowUp failed", err);
      show(err.message || "Couldn't update that follow-up — try again.");
    }
  }

  async function updateDetails(id, fields) {
    await relationshipsData.updateContactDetails(id, fields);
    patchContact(id, {
      personName: fields.personName,
      brandName: fields.brandName || fields.personName,
      role: fields.role || "",
      email: fields.email || "",
      phone: fields.phone || "",
      website: fields.website || "",
      location: fields.location || ""
    });
  }

  async function deleteContact(id) {
    await relationshipsData.deleteContact(id);
    setState((s) => ({ ...s, contacts: s.contacts.filter((c) => c.id !== id) }));
  }

  async function updateTags(id, tags) {
    try {
      await relationshipsData.updateContactTags(id, tags);
      patchContact(id, { tags });
    } catch (err) {
      console.error("[relationships] updateTags failed", err);
      show(err.message || "Couldn't update those tags — try again.");
    }
  }

  async function updateLeadStatus(id, status) {
    try {
      await relationshipsData.updateContactLeadStatus(id, status);
      patchContact(id, { status });
    } catch (err) {
      console.error("[relationships] updateLeadStatus failed", err);
      show(err.message || "Couldn't update that lead status — try again.");
    }
  }

  async function updateClientHealth(id, health) {
    try {
      await relationshipsData.updateContactClientHealth(id, health);
      patchContact(id, { relationshipHealth: health, active: health !== "Inactive" });
    } catch (err) {
      console.error("[relationships] updateClientHealth failed", err);
      show(err.message || "Couldn't update that relationship health — try again.");
    }
  }

  async function convertType(id, newType) {
    try {
      await relationshipsData.convertContactType(id, newType);
      patchContact(id, { type: newType, active: true, ...(CONVERT_DEFAULTS[newType] || {}) });
    } catch (err) {
      console.error("[relationships] convertType failed", err);
      show(err.message || "Couldn't convert that contact — try again.");
    }
  }

  async function markInactive(id) {
    const record = findRelationship(id);
    try {
      await relationshipsData.setContactActive(id, false, record?.type, record?.relationshipHealth);
      patchContact(id, { active: false, relationshipHealth: record?.type === "Client" ? "Inactive" : record?.relationshipHealth });
    } catch (err) {
      console.error("[relationships] markInactive failed", err);
      show(err.message || "Couldn't mark that contact inactive — try again.");
    }
  }

  async function reactivate(id) {
    const record = findRelationship(id);
    try {
      await relationshipsData.setContactActive(id, true, record?.type, record?.relationshipHealth);
      patchContact(id, {
        active: true,
        relationshipHealth: record?.type === "Client" && record?.relationshipHealth === "Inactive" ? "Healthy" : record?.relationshipHealth
      });
    } catch (err) {
      console.error("[relationships] reactivate failed", err);
      show(err.message || "Couldn't reactivate that contact — try again.");
    }
  }

  return {
    relationships: state.contacts,
    loading,
    error,
    reload,
    findRelationship,
    addRelationship,
    addNote,
    logInteraction,
    setFollowUp,
    updateDetails,
    deleteContact,
    updateTags,
    updateLeadStatus,
    updateClientHealth,
    convertType,
    markInactive,
    reactivate
  };
}
