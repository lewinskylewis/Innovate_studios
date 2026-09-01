/*
 * Innov8 Studios — stateful React wrapper around src/data/studio.js.
 * Holds the same shape of data the legacy studio-data.js kept as module
 * globals (team, option lists, fields, projects), but as React state so
 * the UI re-renders correctly; every mutation awaits the real Supabase
 * write first (via studio.js) and only updates local state once that
 * succeeds — so the UI never shows a change that failed to save.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import * as studioData from "../../data/studio.js";

export function useStudio() {
  const { profile } = useAuth();
  const [state, setState] = useState({
    team: [],
    projectStatusOptions: [],
    priorityOptions: [],
    milestoneStatusOptions: [],
    fields: [],
    clientsById: new Map(),
    clientsByName: new Map(),
    projects: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studioData.loadStudioData();
      setState(data);
    } catch (err) {
      console.error("[studio] failed to load", err);
      setError(err.message || "Check your connection and try reloading.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const optionsCtx = {
    statusOptions: state.projectStatusOptions,
    priorityOptions: state.priorityOptions,
    milestoneStatusOptions: state.milestoneStatusOptions,
    clientsByName: state.clientsByName,
    clientsById: state.clientsById
  };

  function labelFor(kind, id) {
    const list = { status: state.projectStatusOptions, priority: state.priorityOptions, milestoneStatus: state.milestoneStatusOptions }[kind];
    return studioData.optionLabel(list || [], id);
  }

  function teamName(id) {
    return state.team.find((m) => m.id === id)?.name || "Unassigned";
  }

  function patchProject(id, patch) {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }

  function removeProject(id) {
    setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
  }

  function addProject(project) {
    setState((s) => ({ ...s, projects: [...s.projects, project] }));
  }

  function patchMilestone(projectId, milestoneId, patch) {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id !== projectId ? p : { ...p, milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, ...patch } : m)) }
      )
    }));
  }

  function removeMilestone(projectId, milestoneId) {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id !== projectId ? p : { ...p, milestones: p.milestones.filter((m) => m.id !== milestoneId) }))
    }));
  }

  function addMilestone(projectId, milestone) {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id !== projectId ? p : { ...p, milestones: [...p.milestones, milestone] }))
    }));
  }

  async function createProject({ title = "", deadline, startDate } = {}) {
    const project = await studioData.createProject({
      title,
      deadline,
      startDate,
      statusOptions: state.projectStatusOptions,
      priorityOptions: state.priorityOptions,
      createdBy: profile?.id
    });
    addProject(project);
    return project;
  }

  async function duplicateProject(project) {
    const copy = await studioData.duplicateProject(project);
    addProject(copy);
    return copy;
  }

  async function softDeleteProject(project) {
    await studioData.softDeleteProject(project);
    removeProject(project.id);
  }

  async function archiveProject(project) {
    const patch = await studioData.updateProjectField(project, "status", "Archived", optionsCtx);
    patchProject(project.id, patch);
  }

  async function updateProjectField(project, fieldId, value) {
    const patch = await studioData.updateProjectField(project, fieldId, value, optionsCtx);
    patchProject(project.id, patch);
    return patch;
  }

  async function setProjectAssignees(project, teamMemberIds) {
    await studioData.setProjectAssignees(project, teamMemberIds);
    patchProject(project.id, { team: teamMemberIds });
  }

  async function createMilestone(project, input) {
    const milestone = await studioData.createMilestone(project, input, optionsCtx);
    addMilestone(project.id, milestone);
    return milestone;
  }

  async function updateMilestoneField(project, milestone, key, value) {
    const patch = await studioData.updateMilestoneField(milestone, key, value, optionsCtx);
    patchMilestone(project.id, milestone.id, patch);
  }

  async function setMilestoneAssignees(project, milestone, teamMemberIds) {
    await studioData.setMilestoneAssignees(milestone, teamMemberIds);
    patchMilestone(project.id, milestone.id, { assignees: teamMemberIds });
  }

  async function deleteMilestone(project, milestone) {
    await studioData.deleteMilestone(milestone);
    removeMilestone(project.id, milestone.id);
  }

  async function loadProjectComments(project) {
    const comments = await studioData.loadProjectComments(project.id);
    patchProject(project.id, { comments });
    return comments;
  }

  async function addComment(project, content) {
    const comment = await studioData.addComment(project.id, content, profile?.id, profile?.full_name || "Studio");
    patchProject(project.id, { comments: [...project.comments, comment] });
    return comment;
  }

  /* ---------- files ---------- */

  async function loadProjectFiles(project) {
    const files = await studioData.loadProjectFiles(project.id);
    patchProject(project.id, { files });
    return files;
  }

  async function uploadProjectFile(project, file, options) {
    const record = await studioData.uploadProjectFile(project, file, options, profile?.id, profile?.full_name || "Studio");
    patchProject(project.id, { files: [...project.files, record] });
    return record;
  }

  async function deleteProjectFile(project, file) {
    await studioData.deleteProjectFile(file);
    patchProject(project.id, { files: project.files.filter((f) => f.id !== file.id) });
  }

  async function getFileDownloadUrl(file) {
    return studioData.getFileDownloadUrl(file);
  }

  /* ---------- activity ---------- */

  async function loadProjectActivity(project) {
    const activity = await studioData.loadProjectActivity(project.id);
    patchProject(project.id, { activity });
    return activity;
  }

  /* ---------- fields (custom columns) ---------- */

  function setFields(updater) {
    setState((s) => ({ ...s, fields: typeof updater === "function" ? updater(s.fields) : updater }));
  }

  async function createField({ name, type, options, insertAfterId, isMulti, keyPrefix }) {
    const field = await studioData.createField({ name, type, options, insertAfterId, fields: state.fields, isMulti, keyPrefix });
    setFields((fields) => {
      const sorted = [...fields].sort((a, b) => a.order - b.order);
      const insertIndex = insertAfterId ? sorted.findIndex((f) => f.id === insertAfterId) + 1 : sorted.length;
      const shifted = sorted.map((f) => (f.order >= insertIndex ? { ...f, order: f.order + 1 } : f));
      shifted.splice(insertIndex, 0, field);
      return shifted;
    });
    return field;
  }

  async function renameField(field, name) {
    await studioData.renameField(field, name);
    setFields((fields) => fields.map((f) => (f.id === field.id ? { ...f, name } : f)));
  }

  async function changeFieldType(field, type, isMulti = false) {
    await studioData.changeFieldType(field, type, isMulti);
    setFields((fields) => fields.map((f) => (f.id === field.id ? { ...f, type, multi: isMulti } : f)));
  }

  async function resizeField(field, widthPx) {
    const width = await studioData.resizeField(field, widthPx);
    setFields((fields) => fields.map((f) => (f.id === field.id ? { ...f, width } : f)));
  }

  async function reorderFields(orderedFields) {
    await studioData.reorderFields(orderedFields);
    setFields(orderedFields.map((f, i) => ({ ...f, order: i })));
  }

  async function duplicateField(field) {
    const { field: copy, patches } = await studioData.duplicateField(field, state.fields, state.projects);
    setFields((fields) => {
      const sorted = [...fields].sort((a, b) => a.order - b.order);
      const sourceIndex = sorted.findIndex((f) => f.id === field.id);
      const shifted = sorted.map((f) => (f.order > sourceIndex ? { ...f, order: f.order + 1 } : f));
      shifted.splice(sourceIndex + 1, 0, copy);
      return shifted;
    });
    if (patches.size) {
      setState((s) => ({ ...s, projects: s.projects.map((p) => (patches.has(p.id) ? { ...p, custom: patches.get(p.id) } : p)) }));
    }
    return copy;
  }

  async function deleteField(field) {
    await studioData.deleteField(field);
    setFields((fields) => fields.filter((f) => f.id !== field.id));
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.custom[field.id] === undefined) return p;
        const nextCustom = { ...p.custom };
        delete nextCustom[field.id];
        return { ...p, custom: nextCustom };
      })
    }));
  }

  /* ---------- options (status / priority / milestone-status / custom-select) ---------- */

  function optionListKeyFor(kind) {
    return { project_status: "projectStatusOptions", priority: "priorityOptions", milestone_status: "milestoneStatusOptions" }[kind];
  }

  async function addSystemOption(kind, label) {
    const key = optionListKeyFor(kind);
    const option = await studioData.addSystemOption(kind, label, state[key].length);
    setState((s) => ({ ...s, [key]: [...s[key], option] }));
    return option;
  }

  async function recolorSystemOption(kind, option) {
    const key = optionListKeyFor(kind);
    const color = await studioData.recolorSystemOption(option);
    setState((s) => ({ ...s, [key]: s[key].map((o) => (o.id === option.id ? { ...o, color } : o)) }));
  }

  async function deleteSystemOption(kind, option) {
    const key = optionListKeyFor(kind);
    await studioData.deleteSystemOption(option);
    setState((s) => ({ ...s, [key]: s[key].filter((o) => o.id !== option.id) }));
  }

  async function addFieldOption(field, label) {
    const option = await studioData.addFieldOption(field, label);
    setFields((fields) => fields.map((f) => (f.id === field.id ? { ...f, options: [...(f.options || []), option] } : f)));
    return option;
  }

  async function recolorFieldOption(field, option) {
    const color = await studioData.recolorFieldOption(option);
    setFields((fields) => fields.map((f) => (f.id === field.id ? { ...f, options: f.options.map((o) => (o.id === option.id ? { ...o, color } : o)) } : f)));
  }

  async function deleteFieldOption(field, option) {
    await studioData.deleteFieldOption(option);
    setFields((fields) => fields.map((f) => (f.id === field.id ? { ...f, options: f.options.filter((o) => o.id !== option.id) } : f)));
  }

  return {
    ...state,
    loading,
    error,
    reload,
    labelFor,
    teamName,
    createProject,
    duplicateProject,
    softDeleteProject,
    archiveProject,
    updateProjectField,
    setProjectAssignees,
    createMilestone,
    updateMilestoneField,
    setMilestoneAssignees,
    deleteMilestone,
    loadProjectComments,
    addComment,
    loadProjectFiles,
    uploadProjectFile,
    deleteProjectFile,
    getFileDownloadUrl,
    loadProjectActivity,
    createField,
    renameField,
    changeFieldType,
    resizeField,
    reorderFields,
    duplicateField,
    deleteField,
    addSystemOption,
    recolorSystemOption,
    deleteSystemOption,
    addFieldOption,
    recolorFieldOption,
    deleteFieldOption
  };
}
