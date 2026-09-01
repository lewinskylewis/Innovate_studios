/*
 * Innov8 Studios — Enquiries state, mirroring useRelationships.js:
 * entirely in-memory, local mutable copies of the mock data. Nothing
 * here talks to Supabase and nothing survives a refresh — a deliberate
 * V1 UI/UX constraint. See enquiriesMock.js's header comment.
 *
 * `convertEnquiry` is local/mock only: it records which Relationship
 * type the enquiry became (see the `conversion` field) but does not
 * create or link an actual Relationships record. That handoff is a
 * future backend concern — see the module's architectural notes.
 */
import { useState } from "react";
import { ENQUIRIES } from "./enquiriesMock.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let recordSeed = ENQUIRIES.length;
function nextId() {
  recordSeed += 1;
  return `enq-new-${recordSeed}`;
}
let subSeed = 0;
function subId(prefix) {
  subSeed += 1;
  return `${prefix}-new-${subSeed}`;
}

export function useEnquiries() {
  const [enquiries, setEnquiries] = useState(() => ENQUIRIES.map((e) => ({ ...e, services: [...e.services], notes: [...e.notes], events: [...e.events] })));

  function findEnquiry(idValue) {
    return enquiries.find((e) => e.id === idValue);
  }

  function updateRecord(idValue, patch) {
    let updated = null;
    setEnquiries((list) =>
      list.map((e) => {
        if (e.id !== idValue) return e;
        updated = { ...e, ...patch };
        return updated;
      })
    );
    return updated;
  }

  function addEnquiry({ personName, brandName, email, phone, source, services, message, priority, owner, notes }) {
    const record = {
      id: nextId(),
      personName,
      brandName: brandName || personName,
      email: email || "",
      phone: phone || "",
      location: "",
      message: message || "",
      services: services || [],
      source: source || "Other",
      dateReceived: todayISO(),
      status: "New",
      priority: priority || "Normal",
      owner: owner || "",
      estimatedValue: null,
      desiredTimeline: "",
      qualificationNotes: "",
      nextFollowUp: null,
      followUpNote: null,
      notes: notes ? [{ id: subId("note"), text: notes, date: todayISO(), author: owner || "" }] : [],
      events: [{ id: subId("ev"), date: todayISO(), type: "received", label: "Enquiry created manually" }],
      conversion: null,
      originCampaign: null
    };
    setEnquiries((list) => [record, ...list]);
    return record;
  }

  function addNote(idValue, text) {
    let updated = null;
    setEnquiries((list) =>
      list.map((e) => {
        if (e.id !== idValue) return e;
        updated = { ...e, notes: [...e.notes, { id: subId("note"), text, date: todayISO(), author: e.owner }] };
        return updated;
      })
    );
    return updated;
  }

  function setFollowUp(idValue, { date, note }) {
    let updated = null;
    setEnquiries((list) =>
      list.map((e) => {
        if (e.id !== idValue) return e;
        updated = {
          ...e,
          nextFollowUp: date || null,
          followUpNote: note || null,
          events: [...e.events, { id: subId("ev"), date: todayISO(), type: "followup", label: date ? `Follow-up scheduled for ${date}` : "Follow-up cleared" }]
        };
        return updated;
      })
    );
    return updated;
  }

  function completeFollowUp(idValue) {
    let updated = null;
    setEnquiries((list) =>
      list.map((e) => {
        if (e.id !== idValue) return e;
        updated = {
          ...e,
          nextFollowUp: null,
          followUpNote: null,
          events: [...e.events, { id: subId("ev"), date: todayISO(), type: "followup", label: "Follow-up completed" }]
        };
        return updated;
      })
    );
    return updated;
  }

  function updateStatus(idValue, status) {
    let updated = null;
    setEnquiries((list) =>
      list.map((e) => {
        if (e.id !== idValue) return e;
        const kindByStatus = { Contacted: "contacted", Qualifying: "qualifying", Qualified: "qualified", Closed: "closed", New: "status", Converted: "converted" };
        updated = {
          ...e,
          status,
          events: [...e.events, { id: subId("ev"), date: todayISO(), type: kindByStatus[status] || "status", label: `Status changed to ${status}` }]
        };
        return updated;
      })
    );
    return updated;
  }

  function updateQualification(idValue, { estimatedValue, desiredTimeline, qualificationNotes }) {
    return updateRecord(idValue, { estimatedValue, desiredTimeline, qualificationNotes });
  }

  function reassignOwner(idValue, owner) {
    return updateRecord(idValue, { owner });
  }

  function convertEnquiry(idValue, relationshipType) {
    let updated = null;
    setEnquiries((list) =>
      list.map((e) => {
        if (e.id !== idValue) return e;
        const conversion = { type: relationshipType, brandName: e.brandName, owner: e.owner, date: todayISO() };
        updated = {
          ...e,
          status: "Converted",
          conversion,
          events: [...e.events, { id: subId("ev"), date: todayISO(), type: "converted", label: `Converted to ${relationshipType}` }]
        };
        return updated;
      })
    );
    return updated;
  }

  return {
    enquiries,
    findEnquiry,
    addEnquiry,
    addNote,
    setFollowUp,
    completeFollowUp,
    updateStatus,
    updateQualification,
    reassignOwner,
    convertEnquiry
  };
}
