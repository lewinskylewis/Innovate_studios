/*
 * Innov8 Studios — Enquiries state, now backed by the real
 * public.enquiries table (see supabase/migrations/
 * 20260901000001_contacts_foundation.sql and src/data/enquiries.js)
 * instead of local mock state. Mirrors useRelationships.js's shape:
 * load once on mount into React state, every mutation awaits the real
 * Supabase write and only patches local state on success.
 *
 * Public API is unchanged from the old mock hook (enquiries,
 * findEnquiry, addEnquiry, addNote, setFollowUp, completeFollowUp,
 * updateStatus, updateQualification, reassignOwner, convertEnquiry) so
 * every component that consumes this hook (Enquiries.jsx, Overview.jsx,
 * EnquiryList.jsx, EnquiryDetail.jsx, NewEnquiryModal.jsx) keeps
 * working with zero edits. `updatePriority` is new — the schema and
 * this hook support it (see src/data/enquiries.js), but no frozen
 * component currently has a control wired to it; verified directly
 * against the database instead (see the integration report).
 *
 * Same one deliberate exception as useRelationships.js:
 * addEnquiry() is optimistic because NewEnquiryModal.jsx reads
 * `record.personName` synchronously right after calling it — a
 * frozen component this phase cannot touch. Every other mutation is
 * plain await-then-patch.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import * as enquiriesData from "../../data/enquiries.js";

function buildOptimisticEnquiry(id, input, ownerName) {
  const nowISO = new Date().toISOString();
  const source = input.source || "Other";
  return {
    id,
    contactId: null,
    personName: input.personName,
    brandName: input.brandName || input.personName,
    email: input.email || "",
    phone: input.phone || "",
    location: "",
    message: input.message || "",
    services: input.services || [],
    source,
    dateReceived: nowISO,
    status: "New",
    priority: input.priority || "Normal",
    owner: ownerName,
    estimatedValue: null,
    desiredTimeline: "",
    qualificationNotes: "",
    nextFollowUp: null,
    followUpNote: null,
    notes: input.notes && input.notes.trim() ? [{ id: crypto.randomUUID(), text: input.notes.trim(), date: nowISO, author: ownerName }] : [],
    events: [{ id: crypto.randomUUID(), date: nowISO, type: "received", label: `Enquiry received via ${source}` }],
    conversion: null,
    originCampaign: null
  };
}

export function useEnquiries() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [state, setState] = useState({ enquiries: [], team: [], teamByName: new Map(), contactsById: new Map(), contactsByEmail: new Map() });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await enquiriesData.loadEnquiriesData();
      setState(data);
    } catch (err) {
      console.error("[enquiries] failed to load", err);
      setError(err.message || "Check your connection and try reloading.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function findEnquiry(id) {
    return state.enquiries.find((e) => e.id === id);
  }

  function patchEnquiry(id, patch) {
    setState((s) => ({ ...s, enquiries: s.enquiries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function addEnquiry(input) {
    const id = crypto.randomUUID();
    const ownerName = input.owner || "";
    const record = buildOptimisticEnquiry(id, input, ownerName);
    setState((s) => ({ ...s, enquiries: [record, ...s.enquiries] }));

    enquiriesData.addEnquiry({ ...input, id }, { teamByName: state.teamByName, authorProfileId: profile?.id }).catch((err) => {
      console.error("[enquiries] addEnquiry failed", err);
      setState((s) => ({ ...s, enquiries: s.enquiries.filter((e) => e.id !== id) }));
      show(err.message || "Couldn't save that enquiry — try again.");
    });

    return record;
  }

  async function addNote(id, text) {
    try {
      const note = await enquiriesData.addEnquiryNote(id, text, profile?.id);
      patchEnquiry(id, { notes: [...(findEnquiry(id)?.notes || []), { id: note.id, text: note.content, date: note.created_at, author: note.authorName }] });
    } catch (err) {
      console.error("[enquiries] addNote failed", err);
      show(err.message || "Couldn't add that note — try again.");
    }
  }

  async function setFollowUp(id, { date, note }) {
    try {
      await enquiriesData.setEnquiryFollowUp(id, { date, note });
      patchEnquiry(id, { nextFollowUp: date || null, followUpNote: note || null });
    } catch (err) {
      console.error("[enquiries] setFollowUp failed", err);
      show(err.message || "Couldn't update that follow-up — try again.");
    }
  }

  async function completeFollowUp(id) {
    try {
      await enquiriesData.setEnquiryFollowUp(id, { date: null, note: null });
      patchEnquiry(id, { nextFollowUp: null, followUpNote: null });
    } catch (err) {
      console.error("[enquiries] completeFollowUp failed", err);
      show(err.message || "Couldn't complete that follow-up — try again.");
    }
  }

  async function updateStatus(id, status) {
    try {
      await enquiriesData.updateEnquiryStatus(id, status);
      patchEnquiry(id, { status });
    } catch (err) {
      console.error("[enquiries] updateStatus failed", err);
      show(err.message || "Couldn't update that status — try again.");
    }
  }

  async function updatePriority(id, priority) {
    try {
      await enquiriesData.updateEnquiryPriority(id, priority);
      patchEnquiry(id, { priority });
    } catch (err) {
      console.error("[enquiries] updatePriority failed", err);
      show(err.message || "Couldn't update that priority — try again.");
    }
  }

  async function updateQualification(id, fields) {
    try {
      await enquiriesData.updateEnquiryQualification(id, fields);
      patchEnquiry(id, fields);
    } catch (err) {
      console.error("[enquiries] updateQualification failed", err);
      show(err.message || "Couldn't update that qualification — try again.");
    }
  }

  async function reassignOwner(id, owner) {
    try {
      await enquiriesData.reassignEnquiryOwner(id, owner, state.teamByName);
      patchEnquiry(id, { owner });
    } catch (err) {
      console.error("[enquiries] reassignOwner failed", err);
      show(err.message || "Couldn't reassign that enquiry — try again.");
    }
  }

  async function convertEnquiry(id, newType) {
    const enquiry = findEnquiry(id);
    if (!enquiry) return;
    try {
      const contactId = await enquiriesData.convertEnquiry(enquiry, newType, {
        teamByName: state.teamByName,
        contactsById: state.contactsById,
        contactsByEmail: state.contactsByEmail
      });
      const contact = state.contactsById.get(contactId);
      patchEnquiry(id, {
        contactId,
        status: "Converted",
        conversion: {
          type: newType,
          brandName: contact?.brand_name || enquiry.brandName,
          owner: (contact?.owner_id && state.team.find((t) => t.id === contact.owner_id)?.name) || enquiry.owner,
          date: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("[enquiries] convertEnquiry failed", err);
      show(err.message || "Couldn't convert that enquiry — try again.");
    }
  }

  return {
    enquiries: state.enquiries,
    loading,
    error,
    reload,
    findEnquiry,
    addEnquiry,
    addNote,
    setFollowUp,
    completeFollowUp,
    updateStatus,
    updatePriority,
    updateQualification,
    reassignOwner,
    convertEnquiry
  };
}
