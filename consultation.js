/*
 * Innov8 Studios — /consultation form logic. Single-file, no build step,
 * no external dependencies (the RPC is called via plain fetch() against
 * PostgREST — supabase-js isn't loaded here to keep this page light).
 *
 * State lives in one object (DATA below), shaped
 * { personal, project, opportunity, nextSteps, attribution } exactly per
 * the plan. Every render function reads from it; every input handler
 * writes to it and re-renders only what changed.
 */
(() => {
  "use strict";

  const D = window.CONSULTATION_DATA;
  if (!D) {
    console.error("[consultation] consultation-data.js failed to load.");
    return;
  }

  const DRAFT_KEY = "innov8_consultation_draft";
  const SUBMITTED_KEY = "innov8_consultation_last_submit";
  const TOTAL_STEPS = 4;

  /* ---------- state ---------- */

  function freshState() {
    return {
      personal: { fullName: "", email: "", company: "", role: "", website: "", preferredContact: "Email", whatsappNumber: "", phoneNumber: "" },
      project: {
        services: [], otherServiceDetail: "",
        brandIdentitySubservices: [], socialContentSubservices: [],
        threeDCgiSubservices: [], digitalExperiencesSubservices: [],
        projectStage: "", existingAssets: []
      },
      opportunity: {
        objective: "", currentProblem: "", successDefinition: "",
        audience: [], audienceOther: "", industry: "", industryOther: "",
        timeline: "", budget: "", engagementType: ""
      },
      nextSteps: { additionalContext: "", files: [], finalContactPreference: "", consent: false },
      attribution: { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, referrer: null, landingPage: null, source: null }
    };
  }

  let state = freshState();
  let currentStep = 1;
  let draftToken = null;
  let pendingDraft = null;

  /* ---------- attribution (captured automatically, once) ---------- */

  function captureAttribution() {
    const params = new URLSearchParams(location.search);
    const has = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some((k) => params.get(k));
    if (!has && state.attribution.landingPage) return; // already captured this session/draft

    state.attribution = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      referrer: document.referrer || null,
      landingPage: location.pathname + location.search,
      source: params.get("utm_source") || (document.referrer ? new URL(document.referrer).hostname : null)
    };
  }

  /* ---------- localStorage draft ---------- */

  let saveTimer = null;
  function saveDraft() {
    if (pendingDraft) return; // an unresolved draft banner is showing — never overwrite it with the fresh empty form underneath
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        const serializable = JSON.parse(JSON.stringify(state));
        serializable.nextSteps.files = state.nextSteps.files
          .filter((f) => f.status === "done")
          .map((f) => ({ id: f.id, name: f.name, size: f.size, mimeType: f.mimeType, status: "done", storagePath: f.storagePath }));
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ state: serializable, step: currentStep, draftToken }));
      } catch {
        /* localStorage unavailable — drafts simply won't persist this session */
      }
    }, 400);
  }

  function readDraft() {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  function hasMeaningfulDraft(draft) {
    if (!draft || !draft.state) return false;
    const s = draft.state;
    return Boolean(
      (s.personal && (s.personal.fullName || s.personal.email || s.personal.company)) ||
      (s.project && s.project.services && s.project.services.length) ||
      (s.opportunity && s.opportunity.objective)
    );
  }

  /* ---------- tiny DOM helpers ---------- */

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.keys(attrs).forEach((k) => node.setAttribute(k, attrs[k]));
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  let fieldIdSeq = 0;
  function nextId(prefix) {
    fieldIdSeq += 1;
    return `${prefix}-${fieldIdSeq}`;
  }

  function fieldWrap(labelText, required, inputNode, hint) {
    const id = inputNode.id;
    const wrap = el("div", "consultation-field");
    const label = el("label", "consultation-label", { for: id });
    label.textContent = labelText + (required ? " *" : "");
    wrap.append(label);
    if (hint) {
      const hintEl = el("p", "consultation-hint");
      hintEl.textContent = hint;
      wrap.append(hintEl);
    }
    wrap.append(inputNode);
    const err = el("p", "consultation-error-msg", { id: `${id}-error`, role: "alert" });
    err.hidden = true;
    wrap.append(err);
    inputNode.setAttribute("aria-describedby", `${id}-error`);
    return wrap;
  }

  function showFieldError(inputNode, message) {
    const errNode = document.getElementById(inputNode.id + "-error") || document.getElementById(inputNode.dataset.errorTarget || "");
    inputNode.closest(".consultation-field, .consultation-choice-group")?.classList.add("has-error");
    if (errNode) {
      errNode.textContent = message;
      errNode.hidden = false;
    }
  }

  function clearFieldError(inputNode) {
    const wrap = inputNode.closest ? inputNode.closest(".consultation-field, .consultation-choice-group") : null;
    if (wrap) {
      wrap.classList.remove("has-error");
      const errNode = wrap.querySelector(".consultation-error-msg");
      if (errNode) {
        errNode.hidden = true;
        errNode.textContent = "";
      }
    }
  }

  function textInput({ type = "text", value = "", placeholder = "", required = false, maxLength, autocomplete }) {
    const input = el("input", "consultation-input", { id: nextId("f"), type });
    if (placeholder) input.placeholder = placeholder;
    if (required) input.required = true;
    if (maxLength) input.maxLength = maxLength;
    if (autocomplete) input.autocomplete = autocomplete;
    input.value = value;
    return input;
  }

  function textareaInput({ value = "", placeholder = "", required = false, maxLength = 2000, rows = 4 }) {
    const input = el("textarea", "consultation-input consultation-textarea", { id: nextId("f"), rows: String(rows) });
    if (placeholder) input.placeholder = placeholder;
    if (required) input.required = true;
    if (maxLength) input.maxLength = maxLength;
    input.value = value;
    return input;
  }

  // Chip group: real radio/checkbox inputs, visually restyled as pills —
  // never a plain <div> with only a color change (keeps keyboard focus +
  // native semantics intact for screen readers).
  function chipGroup({ name, options, multi = false, selected, onToggle, id }) {
    const wrap = el("div", "consultation-chip-group consultation-choice-group", { id, role: multi ? "group" : "radiogroup" });
    options.forEach((opt) => {
      const value = typeof opt === "string" ? opt : opt.value;
      const label = typeof opt === "string" ? opt : opt.value;
      const isChecked = multi ? selected.includes(value) : selected === value;
      const inputEl = el("input", "consultation-chip-input", {
        type: multi ? "checkbox" : "radio",
        name,
        value
      });
      inputEl.checked = isChecked;
      inputEl.addEventListener("change", () => onToggle(value, inputEl.checked));
      const chipLabel = el("label", "consultation-chip");
      chipLabel.append(inputEl, el("span", "consultation-chip-label"));
      chipLabel.querySelector(".consultation-chip-label").textContent = label;
      wrap.append(chipLabel);
    });
    const err = el("p", "consultation-error-msg", { role: "alert" });
    err.hidden = true;
    wrap.append(err);
    return wrap;
  }

  // Service cards (large, with description) — Step 2 primary services only.
  function serviceCards({ selected, onToggle }) {
    const wrap = el("div", "consultation-card-grid consultation-choice-group", { role: "group" });
    D.SERVICE_OPTIONS.forEach((opt) => {
      const isChecked = selected.includes(opt.value);
      const inputEl = el("input", "consultation-chip-input consultation-card-input", { type: "checkbox", name: "services", value: opt.value });
      inputEl.checked = isChecked;
      inputEl.addEventListener("change", () => onToggle(opt.value, inputEl.checked));
      const card = el("label", "consultation-card");
      const body = el("span", "consultation-card-body");
      const title = el("span", "consultation-card-title");
      title.textContent = opt.value;
      body.append(title);
      if (opt.description) {
        const desc = el("span", "consultation-card-desc");
        desc.textContent = opt.description;
        body.append(desc);
      }
      body.append(el("span", "consultation-card-check", { "aria-hidden": "true" }));
      card.append(inputEl, body);
      wrap.append(card);
    });
    const err = el("p", "consultation-error-msg", { role: "alert" });
    err.hidden = true;
    wrap.append(err);
    return wrap;
  }

  /* ---------- validation ---------- */

  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+/;

  function normalizeWebsite(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function validatePersonal() {
    const p = state.personal;
    const errors = {};
    const name = p.fullName.trim();
    if (name.length < 2 || name.length > 100) errors.fullName = D.ERROR_MESSAGES.fullName;

    const email = p.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) errors.email = D.ERROR_MESSAGES.email;

    const company = p.company.trim();
    if (company.length < 2 || company.length > 150) errors.company = D.ERROR_MESSAGES.company;

    if (p.website && p.website.trim()) {
      const normalized = normalizeWebsite(p.website);
      if (!URL_RE.test(normalized)) errors.website = D.ERROR_MESSAGES.website;
    }

    if (p.preferredContact === "WhatsApp" && (!p.whatsappNumber || p.whatsappNumber.replace(/\D/g, "").length < 7)) {
      errors.whatsappNumber = D.ERROR_MESSAGES.whatsappNumber;
    }
    if (p.preferredContact === "Phone" && (!p.phoneNumber || p.phoneNumber.replace(/\D/g, "").length < 7)) {
      errors.phoneNumber = D.ERROR_MESSAGES.phoneNumber;
    }
    return errors;
  }

  function validateProject() {
    const errors = {};
    if (!state.project.services.length) errors.services = D.ERROR_MESSAGES.services;
    return errors;
  }

  function validateOpportunity() {
    const o = state.opportunity;
    const errors = {};
    const objective = o.objective.trim();
    if (objective.length < 30 || objective.length > 2000) errors.objective = D.ERROR_MESSAGES.objective;
    if (o.currentProblem && o.currentProblem.length > 2000) errors.currentProblem = D.ERROR_MESSAGES.textareaTooLong;
    if (o.successDefinition && o.successDefinition.length > 2000) errors.successDefinition = D.ERROR_MESSAGES.textareaTooLong;
    if (!o.timeline) errors.timeline = D.ERROR_MESSAGES.timeline;
    if (!o.budget) errors.budget = D.ERROR_MESSAGES.budget;
    if (!o.engagementType) errors.engagementType = D.ERROR_MESSAGES.engagementType;
    return errors;
  }

  function validateNextSteps() {
    const n = state.nextSteps;
    const errors = {};
    if (n.additionalContext && n.additionalContext.length > 2000) errors.additionalContext = D.ERROR_MESSAGES.textareaTooLong;
    if (!n.consent) errors.consent = D.ERROR_MESSAGES.consent;
    return errors;
  }

  function validateStep(step) {
    if (step === 1) return validatePersonal();
    if (step === 2) return validateProject();
    if (step === 3) return validateOpportunity();
    if (step === 4) return validateNextSteps();
    return {};
  }

  function applyStepErrors(step, errors) {
    const stepEl = document.querySelector(`.consultation-step[data-step="${step}"]`);
    if (!stepEl) return;
    stepEl.querySelectorAll(".consultation-field, .consultation-choice-group").forEach((w) => {
      w.classList.remove("has-error");
      const e = w.querySelector(".consultation-error-msg");
      if (e) { e.hidden = true; e.textContent = ""; }
    });

    let firstInvalid = null;
    Object.keys(errors).forEach((key) => {
      const target = stepEl.querySelector(`[data-field="${key}"]`);
      if (!target) return;
      const wrap = target.classList.contains("consultation-field") || target.classList.contains("consultation-choice-group")
        ? target
        : target.closest(".consultation-field, .consultation-choice-group");
      if (wrap) {
        wrap.classList.add("has-error");
        const e = wrap.querySelector(".consultation-error-msg");
        if (e) { e.textContent = errors[key]; e.hidden = false; }
        if (!firstInvalid) firstInvalid = wrap;
      }
    });
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return firstInvalid;
  }

  /* ---------- step rendering ---------- */

  function renderStep1() {
    const mount = document.querySelector("[data-step-1-fields]");
    clear(mount);
    const p = state.personal;

    const nameInput = textInput({ value: p.fullName, placeholder: "Your name", required: true, maxLength: 100, autocomplete: "name" });
    nameInput.dataset.field = "fullName";
    nameInput.addEventListener("input", () => { state.personal.fullName = nameInput.value; saveDraft(); });
    nameInput.addEventListener("blur", () => {
      const errs = validatePersonal();
      clearFieldError(nameInput);
      if (errs.fullName) showFieldError(nameInput, errs.fullName);
    });
    mount.append(fieldWrap("Full name", true, nameInput));

    const emailInput = textInput({ type: "email", value: p.email, placeholder: "you@company.com", required: true, autocomplete: "email" });
    emailInput.dataset.field = "email";
    emailInput.addEventListener("input", () => { state.personal.email = emailInput.value; saveDraft(); });
    emailInput.addEventListener("blur", () => {
      state.personal.email = emailInput.value.trim().toLowerCase();
      emailInput.value = state.personal.email;
      const errs = validatePersonal();
      clearFieldError(emailInput);
      if (errs.email) showFieldError(emailInput, errs.email);
    });
    mount.append(fieldWrap("Work email", true, emailInput));

    const companyInput = textInput({ value: p.company, placeholder: "Company name", required: true, maxLength: 150, autocomplete: "organization" });
    companyInput.dataset.field = "company";
    companyInput.addEventListener("input", () => { state.personal.company = companyInput.value; saveDraft(); });
    companyInput.addEventListener("blur", () => {
      const errs = validatePersonal();
      clearFieldError(companyInput);
      if (errs.company) showFieldError(companyInput, errs.company);
    });
    mount.append(fieldWrap("Company or brand", true, companyInput));

    const roleWrap = el("div", "consultation-field");
    const roleLabel = el("label", "consultation-label");
    roleLabel.textContent = "Your role";
    roleWrap.append(roleLabel);
    const roleGroup = chipGroup({
      name: "role", options: D.ROLE_OPTIONS, selected: p.role,
      onToggle: (value, checked) => { state.personal.role = checked ? value : ""; saveDraft(); }
    });
    roleGroup.dataset.field = "role";
    roleWrap.append(roleGroup);
    mount.append(roleWrap);

    const websiteInput = textInput({ value: p.website, placeholder: "https://yourcompany.com", autocomplete: "url" });
    websiteInput.dataset.field = "website";
    websiteInput.addEventListener("input", () => { state.personal.website = websiteInput.value; saveDraft(); });
    websiteInput.addEventListener("blur", () => {
      state.personal.website = normalizeWebsite(websiteInput.value);
      websiteInput.value = state.personal.website;
      const errs = validatePersonal();
      clearFieldError(websiteInput);
      if (errs.website) showFieldError(websiteInput, errs.website);
    });
    mount.append(fieldWrap("Website", false, websiteInput));

    const contactWrap = el("div", "consultation-field");
    const contactLabel = el("label", "consultation-label");
    contactLabel.textContent = "How should we contact you?";
    contactWrap.append(contactLabel);
    const contactGroup = chipGroup({
      name: "preferredContact",
      options: D.PREFERRED_CONTACT_OPTIONS.map((v) => ({ value: v })).map((o) => ({ value: o.value })),
      selected: p.preferredContact,
      onToggle: (value) => { state.personal.preferredContact = value; renderStep1(); saveDraft(); }
    });
    // Swap in friendly labels (chipGroup renders raw value by default)
    [...contactGroup.querySelectorAll(".consultation-chip")].forEach((chip) => {
      const input = chip.querySelector("input");
      chip.querySelector(".consultation-chip-label").textContent = D.PREFERRED_CONTACT_LABELS[input.value] || input.value;
    });
    contactGroup.dataset.field = "preferredContact";
    contactWrap.append(contactGroup);
    mount.append(contactWrap);

    if (p.preferredContact === "WhatsApp" || p.preferredContact === "Either") {
      const waInput = textInput({ type: "tel", value: p.whatsappNumber, placeholder: "+254 7XX XXX XXX", autocomplete: "tel" });
      waInput.dataset.field = "whatsappNumber";
      waInput.addEventListener("input", () => { state.personal.whatsappNumber = waInput.value; saveDraft(); });
      waInput.addEventListener("blur", () => {
        const errs = validatePersonal();
        clearFieldError(waInput);
        if (errs.whatsappNumber) showFieldError(waInput, errs.whatsappNumber);
      });
      mount.append(fieldWrap("WhatsApp number", p.preferredContact === "WhatsApp", waInput));
    }
    if (p.preferredContact === "Phone" || p.preferredContact === "Either") {
      const phInput = textInput({ type: "tel", value: p.phoneNumber, placeholder: "+254 7XX XXX XXX", autocomplete: "tel" });
      phInput.dataset.field = "phoneNumber";
      phInput.addEventListener("input", () => { state.personal.phoneNumber = phInput.value; saveDraft(); });
      phInput.addEventListener("blur", () => {
        const errs = validatePersonal();
        clearFieldError(phInput);
        if (errs.phoneNumber) showFieldError(phInput, errs.phoneNumber);
      });
      mount.append(fieldWrap("Phone number", p.preferredContact === "Phone", phInput));
    }
  }

  function subserviceBlock(labelText, key, options) {
    const wrap = el("div", "consultation-field consultation-subservice");
    const label = el("label", "consultation-label");
    label.textContent = labelText;
    wrap.append(label);
    const group = chipGroup({
      name: key, options, multi: true, selected: state.project[key],
      onToggle: (value, checked) => {
        const list = state.project[key];
        state.project[key] = checked ? [...list, value] : list.filter((v) => v !== value);
        saveDraft();
      }
    });
    wrap.append(group);
    return wrap;
  }

  function renderStep2() {
    const mount = document.querySelector("[data-step-2-fields]");
    clear(mount);
    const pr = state.project;

    const servicesWrap = el("div", "consultation-field");
    const servicesLabel = el("label", "consultation-label");
    servicesLabel.textContent = "Primary services *";
    servicesWrap.append(servicesLabel);
    const cards = serviceCards({
      selected: pr.services,
      onToggle: (value, checked) => {
        state.project.services = checked ? [...state.project.services, value] : state.project.services.filter((v) => v !== value);
        renderStep2();
        saveDraft();
      }
    });
    cards.dataset.field = "services";
    servicesWrap.append(cards);
    mount.append(servicesWrap);

    if (pr.services.includes("Something else")) {
      const otherTextarea = textareaInput({ value: pr.otherServiceDetail, placeholder: "Tell us what you're looking for", rows: 3 });
      otherTextarea.addEventListener("input", () => { state.project.otherServiceDetail = otherTextarea.value; saveDraft(); });
      mount.append(fieldWrap("Tell us what you're looking for", false, otherTextarea));
    }

    if (pr.services.includes("Brand & Identity")) {
      mount.append(subserviceBlock("What are you looking for? (Brand & Identity)", "brandIdentitySubservices", D.SUBSERVICE_OPTIONS["Brand & Identity"]));
    }
    if (pr.services.includes("Social & Content")) {
      mount.append(subserviceBlock("What are you looking for? (Social & Content)", "socialContentSubservices", D.SUBSERVICE_OPTIONS["Social & Content"]));
    }
    if (pr.services.includes("3D & CGI")) {
      mount.append(subserviceBlock("What are you looking for? (3D & CGI)", "threeDCgiSubservices", D.SUBSERVICE_OPTIONS["3D & CGI"]));
    }
    if (pr.services.includes("Digital Experiences")) {
      mount.append(subserviceBlock("What are you looking for? (Digital Experiences)", "digitalExperiencesSubservices", D.SUBSERVICE_OPTIONS["Digital Experiences"]));
    }

    const stageWrap = el("div", "consultation-field");
    const stageLabel = el("label", "consultation-label");
    stageLabel.textContent = "Where is the project right now?";
    stageWrap.append(stageLabel);
    const stageGroup = chipGroup({
      name: "projectStage", options: D.PROJECT_STAGE_OPTIONS, selected: pr.projectStage,
      onToggle: (value) => { state.project.projectStage = value; saveDraft(); }
    });
    stageWrap.append(stageGroup);
    mount.append(stageWrap);

    const assetsWrap = el("div", "consultation-field");
    const assetsLabel = el("label", "consultation-label");
    assetsLabel.textContent = "Do you already have existing brand or project assets?";
    assetsWrap.append(assetsLabel);
    const assetsGroup = chipGroup({
      name: "existingAssets", options: D.EXISTING_ASSET_OPTIONS, multi: true, selected: pr.existingAssets,
      onToggle: (value, checked) => {
        state.project.existingAssets = checked ? [...pr.existingAssets, value] : pr.existingAssets.filter((v) => v !== value);
        saveDraft();
      }
    });
    assetsWrap.append(assetsGroup);
    mount.append(assetsWrap);
  }

  function renderStep3() {
    const mount = document.querySelector("[data-step-3-fields]");
    clear(mount);
    const o = state.opportunity;

    const objectiveInput = textareaInput({ value: o.objective, placeholder: "Tell us what you're trying to accomplish.", required: true, rows: 4 });
    objectiveInput.dataset.field = "objective";
    objectiveInput.addEventListener("input", () => { state.opportunity.objective = objectiveInput.value; saveDraft(); });
    objectiveInput.addEventListener("blur", () => {
      const errs = validateOpportunity();
      clearFieldError(objectiveInput);
      if (errs.objective) showFieldError(objectiveInput, errs.objective);
    });
    mount.append(fieldWrap("What are you trying to achieve?", true, objectiveInput));

    const problemInput = textareaInput({ value: o.currentProblem, placeholder: "What prompted you to look for a solution?", rows: 3 });
    problemInput.addEventListener("input", () => { state.opportunity.currentProblem = problemInput.value; saveDraft(); });
    mount.append(fieldWrap("What isn't working today?", false, problemInput));

    const successInput = textareaInput({ value: o.successDefinition, placeholder: "What should be different when we're done?", rows: 3 });
    successInput.addEventListener("input", () => { state.opportunity.successDefinition = successInput.value; saveDraft(); });
    mount.append(fieldWrap("What would make this project a success?", false, successInput));

    const audienceWrap = el("div", "consultation-field");
    const audienceLabel = el("label", "consultation-label");
    audienceLabel.textContent = "Who are you trying to reach?";
    audienceWrap.append(audienceLabel);
    const audienceGroup = chipGroup({
      name: "audience", options: D.AUDIENCE_OPTIONS, multi: true, selected: o.audience,
      onToggle: (value, checked) => {
        state.opportunity.audience = checked ? [...o.audience, value] : o.audience.filter((v) => v !== value);
        renderStep3();
        saveDraft();
      }
    });
    audienceWrap.append(audienceGroup);
    mount.append(audienceWrap);

    if (o.audience.includes("Other")) {
      const audienceOtherInput = textareaInput({ value: o.audienceOther, placeholder: "Tell us a little more about them", rows: 2 });
      audienceOtherInput.addEventListener("input", () => { state.opportunity.audienceOther = audienceOtherInput.value; saveDraft(); });
      mount.append(fieldWrap("Tell us a little more about them", false, audienceOtherInput));
    }

    const industryWrap = el("div", "consultation-field");
    const industryLabel = el("label", "consultation-label");
    industryLabel.textContent = "What industry are you in?";
    industryWrap.append(industryLabel);
    const industryGroup = chipGroup({
      name: "industry", options: D.INDUSTRY_OPTIONS, selected: o.industry,
      onToggle: (value) => { state.opportunity.industry = value; renderStep3(); saveDraft(); }
    });
    industryWrap.append(industryGroup);
    mount.append(industryWrap);

    if (o.industry === "Other") {
      const industryOtherInput = textInput({ value: o.industryOther, placeholder: "Your industry" });
      industryOtherInput.addEventListener("input", () => { state.opportunity.industryOther = industryOtherInput.value; saveDraft(); });
      mount.append(fieldWrap("Your industry", false, industryOtherInput));
    }

    const timelineWrap = el("div", "consultation-field");
    const timelineLabel = el("label", "consultation-label");
    timelineLabel.textContent = "When would you like to start?";
    timelineWrap.append(timelineLabel);
    const timelineGroup = chipGroup({
      name: "timeline", options: D.TIMELINE_OPTIONS, selected: o.timeline,
      onToggle: (value) => { state.opportunity.timeline = value; saveDraft(); }
    });
    timelineGroup.dataset.field = "timeline";
    timelineWrap.append(timelineGroup);
    mount.append(timelineWrap);

    const budgetWrap = el("div", "consultation-field");
    const budgetLabel = el("label", "consultation-label");
    budgetLabel.textContent = "What level of investment have you set aside for this project?";
    budgetWrap.append(budgetLabel);
    const budgetGroup = chipGroup({
      name: "budget", options: D.BUDGET_OPTIONS, selected: o.budget,
      onToggle: (value) => { state.opportunity.budget = value; saveDraft(); }
    });
    budgetGroup.dataset.field = "budget";
    budgetWrap.append(budgetGroup);
    mount.append(budgetWrap);

    const engagementWrap = el("div", "consultation-field");
    const engagementLabel = el("label", "consultation-label");
    engagementLabel.textContent = "How would you prefer to work with us?";
    engagementWrap.append(engagementLabel);
    const engagementGroup = chipGroup({
      name: "engagementType", options: D.ENGAGEMENT_OPTIONS, selected: o.engagementType,
      onToggle: (value) => { state.opportunity.engagementType = value; saveDraft(); }
    });
    engagementGroup.dataset.field = "engagementType";
    engagementWrap.append(engagementGroup);
    mount.append(engagementWrap);
  }

  function renderStep4() {
    const mount = document.querySelector("[data-step-4-fields]");
    clear(mount);
    const n = state.nextSteps;

    const contextInput = textareaInput({ value: n.additionalContext, placeholder: "Links, references, existing briefs, deadlines or anything else that would help us understand the opportunity.", rows: 4 });
    contextInput.addEventListener("input", () => { state.nextSteps.additionalContext = contextInput.value; saveDraft(); });
    mount.append(fieldWrap("Is there anything else we should know?", false, contextInput));

    mount.append(renderUploadArea());

    const prefWrap = el("div", "consultation-field");
    const prefLabel = el("label", "consultation-label");
    prefLabel.textContent = "How should we take this forward?";
    prefWrap.append(prefLabel);
    const prefGroup = chipGroup({
      name: "finalContactPreference", options: D.FINAL_CONTACT_PREFERENCE_OPTIONS, selected: n.finalContactPreference,
      onToggle: (value) => { state.nextSteps.finalContactPreference = value; saveDraft(); }
    });
    prefWrap.append(prefGroup);
    mount.append(prefWrap);

    const consentWrap = el("div", "consultation-field consultation-consent");
    const consentLabelEl = el("label", "consultation-checkbox-label");
    const consentInput = el("input", "consultation-checkbox-input", { type: "checkbox", id: nextId("f") });
    consentInput.checked = n.consent;
    consentInput.dataset.field = "consent";
    consentInput.addEventListener("change", () => { state.nextSteps.consent = consentInput.checked; clearFieldError(consentInput); saveDraft(); });
    const consentText = el("span");
    consentText.append(document.createTextNode("I agree that Innov8 may contact me regarding this consultation. "));
    const privacyLink = el("a", "consultation-privacy-link", { href: "/index.html#contact" });
    privacyLink.textContent = "Privacy Policy";
    consentText.append(privacyLink);
    consentLabelEl.append(consentInput, consentText);
    consentWrap.append(consentLabelEl);
    const consentErr = el("p", "consultation-error-msg", { role: "alert" });
    consentErr.hidden = true;
    consentWrap.append(consentErr);
    mount.append(consentWrap);
  }

  const RENDER_STEP = { 1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4 };

  /* ---------- file upload ---------- */

  function humanFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  function ensureDraftToken() {
    if (!draftToken) draftToken = crypto.randomUUID();
    return draftToken;
  }

  function uploadFile(entry) {
    const path = `uploads/${ensureDraftToken()}/${crypto.randomUUID()}_${sanitizeFilename(entry.name)}`;
    entry.storagePath = path;
    entry.status = "uploading";
    entry.progress = 0;
    renderFileList();

    const xhr = new XMLHttpRequest();
    entry.xhr = xhr;
    xhr.open("POST", `${D.SUPABASE_URL}/storage/v1/object/consultation-files/${path.split("/").map(encodeURIComponent).join("/")}`);
    xhr.setRequestHeader("apikey", D.SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${D.SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", entry.file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        entry.progress = Math.round((e.loaded / e.total) * 100);
        renderFileList();
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        entry.status = "done";
        entry.progress = 100;
      } else {
        entry.status = "error";
        entry.error = "Upload failed. Please try again.";
      }
      renderFileList();
      saveDraft();
    };
    xhr.onerror = () => {
      entry.status = "error";
      entry.error = "Network error during upload.";
      renderFileList();
    };
    xhr.onabort = () => {
      entry.status = "error";
      entry.error = "Upload cancelled.";
      renderFileList();
    };
    xhr.send(entry.file);
  }

  function addFiles(fileList) {
    [...fileList].forEach((file) => {
      const entry = { id: crypto.randomUUID(), file, name: file.name, size: file.size, mimeType: file.type, status: "queued", progress: 0, storagePath: null, error: null };
      if (!D.ACCEPTED_FILE_TYPES[file.type]) {
        entry.status = "error";
        entry.error = "That file type isn't supported.";
      } else if (file.size > D.MAX_FILE_SIZE_BYTES) {
        entry.status = "error";
        entry.error = "That file is larger than 20MB.";
      }
      state.nextSteps.files.push(entry);
      if (entry.status === "queued") uploadFile(entry);
    });
    renderFileList();
  }

  function removeFile(id) {
    const entry = state.nextSteps.files.find((f) => f.id === id);
    if (entry && entry.xhr && entry.status === "uploading") entry.xhr.abort();
    state.nextSteps.files = state.nextSteps.files.filter((f) => f.id !== id);
    renderFileList();
    saveDraft();
  }

  function retryFile(id) {
    const entry = state.nextSteps.files.find((f) => f.id === id);
    if (!entry) return;
    entry.status = "queued";
    entry.error = null;
    uploadFile(entry);
  }

  function renderFileList() {
    const listEl = document.querySelector("[data-file-list]");
    if (!listEl) return;
    clear(listEl);
    state.nextSteps.files.forEach((f) => {
      const row = el("div", `consultation-file-row is-${f.status}`);
      const info = el("div", "consultation-file-info");
      const name = el("span", "consultation-file-name");
      name.textContent = f.name;
      const size = el("span", "consultation-file-size");
      size.textContent = humanFileSize(f.size);
      info.append(name, size);
      row.append(info);

      if (f.status === "uploading") {
        const bar = el("div", "consultation-file-progress");
        const fill = el("div", "consultation-file-progress-fill");
        fill.style.width = `${f.progress}%`;
        bar.append(fill);
        row.append(bar);
      }
      if (f.status === "error") {
        const err = el("span", "consultation-file-error");
        err.textContent = f.error || "Something went wrong.";
        row.append(err);
        const retryBtn = el("button", "consultation-link-btn", { type: "button" });
        retryBtn.textContent = "Retry";
        retryBtn.addEventListener("click", () => retryFile(f.id));
        row.append(retryBtn);
      }
      if (f.status === "done") {
        row.append(el("span", "consultation-file-done", { "aria-hidden": "true" }));
      }

      const removeBtn = el("button", "consultation-file-remove", { type: "button", "aria-label": `Remove ${f.name}` });
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => removeFile(f.id));
      row.append(removeBtn);

      listEl.append(row);
    });
  }

  function renderUploadArea() {
    const wrap = el("div", "consultation-field consultation-upload");
    const label = el("label", "consultation-label");
    label.textContent = "Have a brief or reference material?";
    wrap.append(label);
    const hint = el("p", "consultation-hint");
    hint.textContent = "Upload anything that would help us understand the project. PDF, DOCX, PPTX, JPG, PNG or ZIP, up to 20MB each.";
    wrap.append(hint);

    const dropzone = el("div", "consultation-dropzone", { tabindex: "0", role: "button", "aria-label": "Upload files" });
    dropzone.textContent = "Drag files here, or click to browse";
    const fileInput = el("input", "sr-only", { type: "file", multiple: "multiple", accept: Object.keys(D.ACCEPTED_FILE_TYPES).join(",") });
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) addFiles(fileInput.files);
      fileInput.value = "";
    });
    dropzone.addEventListener("click", () => fileInput.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
    });
    ["dragenter", "dragover"].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach((evt) => dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); }));
    dropzone.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    wrap.append(dropzone, fileInput);

    const list = el("div", "consultation-file-list", { "data-file-list": "" });
    wrap.append(list);
    window.setTimeout(renderFileList, 0);
    return wrap;
  }

  /* ---------- step navigation ---------- */

  function updateProgress() {
    document.getElementById("step-announcer").textContent = `Step ${currentStep} of ${TOTAL_STEPS}`;
    document.querySelectorAll("[data-step-indicator]").forEach((li) => {
      const step = Number(li.dataset.stepIndicator);
      li.classList.toggle("is-active", step === currentStep);
      li.classList.toggle("is-done", step < currentStep);
      if (step === currentStep) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    document.querySelector("[data-progress-fill]").style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
  }

  function showStep(step) {
    currentStep = step;
    document.querySelectorAll(".consultation-step").forEach((s) => {
      s.hidden = Number(s.dataset.step) !== step;
    });
    (RENDER_STEP[step] || function () {})();
    document.querySelector("[data-step-back]").hidden = step === 1;
    document.querySelector("[data-step-continue]").hidden = step === TOTAL_STEPS;
    document.querySelector("[data-step-submit]").hidden = step !== TOTAL_STEPS;
    document.querySelector("[data-step-submit-note]").hidden = step !== TOTAL_STEPS;
    updateProgress();
    saveDraft();
  }

  function goContinue() {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length) {
      applyStepErrors(currentStep, errors);
      return;
    }
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
  }

  function goBack() {
    if (currentStep > 1) showStep(currentStep - 1);
  }

  /* ---------- submission ---------- */

  function collectFilesPayload() {
    return state.nextSteps.files
      .filter((f) => f.status === "done")
      .map((f) => ({ storage_path: f.storagePath, original_filename: f.name, mime_type: f.mimeType, size_bytes: String(f.size) }));
  }

  async function submitConsultation() {
    const p = state.personal;
    const pr = state.project;
    const o = state.opportunity;
    const n = state.nextSteps;

    const payload = {
      p_full_name: p.fullName.trim(),
      p_email: p.email.trim().toLowerCase(),
      p_company: p.company.trim(),
      p_role: p.role || null,
      p_website: p.website ? normalizeWebsite(p.website) : null,
      p_preferred_contact: p.preferredContact,
      p_whatsapp_number: p.whatsappNumber || null,
      p_phone_number: p.phoneNumber || null,
      p_services: pr.services,
      p_other_service_detail: pr.otherServiceDetail || null,
      p_brand_identity_subservices: pr.brandIdentitySubservices,
      p_social_content_subservices: pr.socialContentSubservices,
      p_three_d_cgi_subservices: pr.threeDCgiSubservices,
      p_digital_experiences_subservices: pr.digitalExperiencesSubservices,
      p_project_stage: pr.projectStage || null,
      p_existing_assets: pr.existingAssets,
      p_objective: o.objective.trim(),
      p_current_problem: o.currentProblem || null,
      p_success_definition: o.successDefinition || null,
      p_audience: o.audience,
      p_audience_other: o.audienceOther || null,
      p_industry: o.industry || null,
      p_industry_other: o.industryOther || null,
      p_timeline: o.timeline,
      p_budget: o.budget,
      p_engagement_type: o.engagementType,
      p_additional_context: n.additionalContext || null,
      p_final_contact_preference: n.finalContactPreference || null,
      p_consent: n.consent,
      p_files: collectFilesPayload(),
      p_attribution: state.attribution,
      p_honeypot: document.getElementById("cf-website-confirm").value || null
    };

    const res = await fetch(`${D.SUPABASE_URL}/rest/v1/rpc/submit_consultation`, {
      method: "POST",
      headers: {
        apikey: D.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${D.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message = data && data.message ? data.message : null;
      throw new Error(message || "__generic__");
    }
    return data;
  }

  function showSuccess(reference) {
    document.getElementById("consultation-form").hidden = true;
    document.querySelector(".consultation-progress").hidden = true;
    document.getElementById("consultation-error").hidden = true;
    const successEl = document.getElementById("consultation-success");
    successEl.hidden = false;
    successEl.querySelector("[data-reference]").textContent = reference;
    successEl.scrollIntoView({ behavior: "smooth", block: "start" });
    clearDraft();
    try { window.localStorage.setItem(SUBMITTED_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  function showError(message) {
    const errorEl = document.getElementById("consultation-error");
    errorEl.hidden = false;
    errorEl.querySelector("p").textContent =
      message === "__generic__" || !message
        ? "We couldn't send your consultation just now. Your information is still here — please try again."
        : message;
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideError() {
    document.getElementById("consultation-error").hidden = true;
  }

  /* ---------- init ---------- */

  function bindStaticControls() {
    document.querySelector("[data-step-continue]").addEventListener("click", goContinue);
    document.querySelector("[data-step-back]").addEventListener("click", goBack);
    document.getElementById("consultation-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errors = validateStep(4);
      if (Object.keys(errors).length) {
        applyStepErrors(4, errors);
        return;
      }
      const stillUploading = state.nextSteps.files.some((f) => f.status === "uploading" || f.status === "queued");
      if (stillUploading) {
        window.alert("Please wait for your file uploads to finish before submitting.");
        return;
      }
      hideError();
      const submitBtn = document.querySelector("[data-step-submit]");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      try {
        const result = await submitConsultation();
        if (result && result.dropped) {
          showSuccess("—");
        } else {
          showSuccess(result.reference);
        }
      } catch (err) {
        showError(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Request Consultation";
      }
    });

    document.querySelector("[data-error-retry]").addEventListener("click", () => {
      hideError();
      document.getElementById("consultation-form").hidden = false;
      document.querySelector(".consultation-progress").hidden = false;
    });

    document.querySelector("[data-draft-continue]").addEventListener("click", () => {
      document.getElementById("draft-banner").hidden = true;
      const draft = pendingDraft;
      pendingDraft = null;
      if (draft) {
        const firstInvalidStep = [1, 2, 3, 4].find((s) => {
          state = draft.state; // temporarily assign to validate against restored data
          return Object.keys(validateStep(s)).length > 0;
        });
        showStep(firstInvalidStep || draft.step || 1);
      }
    });
    document.querySelector("[data-draft-clear]").addEventListener("click", () => {
      clearDraft();
      state = freshState();
      draftToken = null;
      pendingDraft = null;
      document.getElementById("draft-banner").hidden = true;
      showStep(1);
    });
  }

  function init() {
    captureAttribution();

    const draft = readDraft();
    if (hasMeaningfulDraft(draft)) {
      document.getElementById("draft-banner").hidden = false;
      // Keep a fresh, empty form live underneath until the visitor
      // chooses to restore it — never silently overwrite what they see.
      // The draft itself is held in memory (not re-read from localStorage
      // later): showStep(1) below calls saveDraft(), which would otherwise
      // persist this empty form after its debounce and clobber the real
      // draft before the visitor gets a chance to click "Continue".
      pendingDraft = draft;
      draftToken = draft.draftToken || null;
    }

    bindStaticControls();
    showStep(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
