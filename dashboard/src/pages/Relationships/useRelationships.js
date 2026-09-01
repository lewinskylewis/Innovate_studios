/*
 * Innov8 Studios — Relationships state, mirroring useMarketing.js:
 * entirely in-memory, local mutable copies of the mock data. Nothing
 * here talks to Supabase and nothing survives a refresh — that's a
 * deliberate V1 UI/UX constraint, not an oversight. See
 * relationshipsMock.js's header comment.
 */
import { useState } from "react";
import { RELATIONSHIPS } from "./relationshipsMock.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let recordSeed = RELATIONSHIPS.length;
function nextId() {
  recordSeed += 1;
  return `rel-new-${recordSeed}`;
}
let subSeed = 0;
function subId(prefix) {
  subSeed += 1;
  return `${prefix}-new-${subSeed}`;
}

const TYPE_DEFAULTS = {
  Contact: {},
  Prospect: { potentialService: "", interestLevel: "Medium", priority: "Normal" },
  Lead: { opportunity: "", serviceInterest: "", estimatedValue: 0, status: "New", priority: "Normal" },
  Client: { servicesUsed: [], projects: [], clientSince: todayISO(), relationshipHealth: "Healthy" },
  Partner: { partnerType: "Creative", capabilities: [] }
};

export function useRelationships() {
  const [relationships, setRelationships] = useState(() =>
    RELATIONSHIPS.map((r) => ({ ...r, tags: [...r.tags], notes: [...r.notes], interactions: [...r.interactions], events: [...r.events] }))
  );

  function findRelationship(idValue) {
    return relationships.find((r) => r.id === idValue);
  }

  function updateRecord(idValue, patch) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue) return r;
        updated = { ...r, ...patch, dateUpdated: todayISO() };
        return updated;
      })
    );
    return updated;
  }

  function addRelationship({ type, personName, brandName, role, email, phone, website, location, owner, source, tags, notes, ...typeFields }) {
    const record = {
      id: nextId(),
      type,
      active: true,
      personName,
      brandName: brandName || personName,
      role: role || "",
      email: email || "",
      phone: phone || "",
      website: website || "",
      location: location || "",
      social: "",
      owner: owner || "",
      source: source || "Other",
      tags: tags || [],
      notes: notes ? [{ id: subId("note"), text: notes, date: todayISO(), author: owner || "" }] : [],
      interactions: [],
      events: [{ id: subId("ev"), date: todayISO(), type: "created", label: `${type} created` }],
      nextFollowUp: null,
      followUpReason: null,
      dateAdded: todayISO(),
      dateUpdated: todayISO(),
      originContext: null,
      ...TYPE_DEFAULTS[type],
      ...typeFields
    };
    setRelationships((list) => [record, ...list]);
    return record;
  }

  function addNote(idValue, text) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue) return r;
        updated = { ...r, notes: [...r.notes, { id: subId("note"), text, date: todayISO(), author: r.owner }], dateUpdated: todayISO() };
        return updated;
      })
    );
    return updated;
  }

  function logInteraction(idValue, { type, description, person }) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue) return r;
        updated = {
          ...r,
          interactions: [...r.interactions, { id: subId("int"), type, date: todayISO(), description, person: person || r.owner }],
          dateUpdated: todayISO()
        };
        return updated;
      })
    );
    return updated;
  }

  function setFollowUp(idValue, { date, reason }) {
    return updateRecord(idValue, { nextFollowUp: date || null, followUpReason: reason || null });
  }

  function updateTags(idValue, tags) {
    return updateRecord(idValue, { tags });
  }

  function updateLeadStatus(idValue, status) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue || r.type !== "Lead") return r;
        updated = {
          ...r,
          status,
          events: [...r.events, { id: subId("ev"), date: todayISO(), type: "status_change", label: `Lead status set to ${status}` }],
          dateUpdated: todayISO()
        };
        return updated;
      })
    );
    return updated;
  }

  function updateClientHealth(idValue, relationshipHealth) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue || r.type !== "Client") return r;
        updated = {
          ...r,
          relationshipHealth,
          active: relationshipHealth !== "Inactive",
          events: [...r.events, { id: subId("ev"), date: todayISO(), type: "status_change", label: `Relationship health set to ${relationshipHealth}` }],
          dateUpdated: todayISO()
        };
        return updated;
      })
    );
    return updated;
  }

  function convertType(idValue, newType) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue) return r;
        const fromType = r.type;
        updated = {
          ...r,
          type: newType,
          active: true,
          ...TYPE_DEFAULTS[newType],
          events: [...r.events, { id: subId("ev"), date: todayISO(), type: "status_change", label: `Converted from ${fromType} to ${newType}` }],
          dateUpdated: todayISO()
        };
        if (newType === "Client") updated.clientSince = todayISO();
        return updated;
      })
    );
    return updated;
  }

  function markInactive(idValue) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue) return r;
        updated = {
          ...r,
          active: false,
          relationshipHealth: r.type === "Client" ? "Inactive" : r.relationshipHealth,
          events: [...r.events, { id: subId("ev"), date: todayISO(), type: "status_change", label: "Marked Inactive" }],
          dateUpdated: todayISO()
        };
        return updated;
      })
    );
    return updated;
  }

  function reactivate(idValue) {
    let updated = null;
    setRelationships((list) =>
      list.map((r) => {
        if (r.id !== idValue) return r;
        updated = {
          ...r,
          active: true,
          relationshipHealth: r.type === "Client" && r.relationshipHealth === "Inactive" ? "Healthy" : r.relationshipHealth,
          events: [...r.events, { id: subId("ev"), date: todayISO(), type: "status_change", label: "Reactivated" }],
          dateUpdated: todayISO()
        };
        return updated;
      })
    );
    return updated;
  }

  return {
    relationships,
    findRelationship,
    addRelationship,
    addNote,
    logInteraction,
    setFollowUp,
    updateTags,
    updateLeadStatus,
    updateClientHealth,
    convertType,
    markInactive,
    reactivate
  };
}
