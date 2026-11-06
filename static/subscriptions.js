/* Alenaz subscription lab: local previews only; no payments or real entitlements. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const KEY = "alenaz_subscriptions_demo_v1";
  const VALID_PLANS = ["free", "plus", "pro"];
  const VALID_PERSONAS = ["balanced", "friendly", "teacher", "concise", "creative", "developer"];
  const defaults = {plan:"free", persona:"balanced", memory:"", agent_name:"", agent_instructions:"", agent_enabled:false};
  let state = {...defaults};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      if (VALID_PLANS.includes(raw.plan)) state.plan = raw.plan;
      if (VALID_PERSONAS.includes(raw.persona)) state.persona = raw.persona;
      if (typeof raw.memory === "string") state.memory = raw.memory.slice(0,1000);
      if (typeof raw.agent_name === "string") state.agent_name = raw.agent_name.slice(0,60);
      if (typeof raw.agent_instructions === "string") state.agent_instructions = raw.agent_instructions.slice(0,700);
      state.agent_enabled = raw.agent_enabled === true;
    }
  } catch (_) {}
  const paidPreview = () => state.plan !== "free";
  const proPreview = () => state.plan === "pro";
  const showFeedback = (message) => { if ($("subFeedback")) $("subFeedback").textContent = message; };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (_) { showFeedback("Could not save locally. Check browser storage settings."); return false; }
  };
  function readFields() {
    state.persona = VALID_PERSONAS.includes($("subPersona")?.value) ? $("subPersona").value : "balanced";
    state.memory = ($("subMemory")?.value || "").trim().slice(0,1000);
    state.agent_name = ($("subAgentName")?.value || "").trim().slice(0,60);
    state.agent_instructions = ($("subAgentInstructions")?.value || "").trim().slice(0,700);
    state.agent_enabled = !!$("subAgentEnabled")?.checked;
  }
  function render() {
    const plan = state.plan;
    document.querySelectorAll("[data-preview-card]").forEach(card => {
      const active = card.getAttribute("data-preview-card") === plan;
      card.classList.toggle("selected", active);
      const button = card.querySelector("button");
      if (button) { button.textContent = active ? "Previewing " + plan[0].toUpperCase()+plan.slice(1) + " ✓" : "Preview " + card.getAttribute("data-preview-card")[0].toUpperCase() + card.getAttribute("data-preview-card").slice(1); button.setAttribute("aria-pressed", String(active)); }
    });
    $("subCurrentPlan").textContent = plan.toUpperCase() + " PREVIEW";
    $("subActiveDescription").textContent = plan === "free"
      ? "Preview Plus or Pro to try browser-only personalization."
      : "Selected features can be tried in this browser; they are not paid entitlements.";
    $("subPersona").value = state.persona;
    $("subMemory").value = state.memory;
    $("subAgentName").value = state.agent_name;
    $("subAgentInstructions").value = state.agent_instructions;
    $("subAgentEnabled").checked = state.agent_enabled;
    $("subPersona").disabled = !paidPreview();
    $("subMemory").disabled = !paidPreview();
    $("subAgentName").disabled = !proPreview();
    $("subAgentInstructions").disabled = !proPreview();
    $("subAgentEnabled").disabled = !proPreview();
    $("subSave").disabled = !paidPreview();
    $("subClearMemory").disabled = !paidPreview();
    $("subExportReport").disabled = !paidPreview();
  }
  function close() { $("subscriptionOverlay")?.classList.add("hidden"); $("subscriptionNav")?.classList.remove("nav-active"); }
  function open() {
    window.AlenazLibrary?.close?.();
    $("subscriptionOverlay")?.classList.remove("hidden");
    $("subscriptionNav")?.classList.add("nav-active");
    $("sidebar")?.classList.remove("open");
    render();
    showFeedback("");
    $("subscriptionClose")?.focus();
  }
  function context() {
    if (!paidPreview()) return null;
    // Preferences are sent as untrusted user content, never a privileged prompt.
    const payload = {persona:state.persona, memory:state.memory};
    if (proPreview() && state.agent_enabled && state.agent_instructions) {
      payload.agent_name = state.agent_name;
      payload.agent_instructions = state.agent_instructions;
    }
    return payload;
  }
  function printReport() {
    if (!paidPreview()) return;
    const chat = typeof currentConversation === "function" ? currentConversation() : null;
    if (!chat || !Array.isArray(chat.messages) || !chat.messages.length) {
      showFeedback("Open a conversation with messages before exporting a report."); return;
    }
    const report = window.open("", "_blank");
    if (!report) { showFeedback("Allow popups for Alenaz to open the printable report."); return; }
    report.document.open();
    report.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Alenaz chat report</title><style>body{font:15px/1.65 system-ui;margin:48px auto;padding:0 24px;max-width:780px;color:#252344}h1{font-size:27px}article{break-inside:avoid;border-top:1px solid #ddd;padding:14px 0}h2{font-size:12px;text-transform:uppercase;color:#7351a9;letter-spacing:1px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.print-btn{padding:10px 14px;background:#503b9d;color:#fff;border:0;border-radius:6px;cursor:pointer}@media print{.print-btn{display:none}body{margin:18mm auto}}</style></head><body><button class="print-btn" onclick="window.print()">Print / Save as PDF</button><h1 id="reportTitle"></h1><p>Exported from Alenaz · local chat report</p><main id="reportMessages"></main></body></html>');
    report.document.close();
    report.document.getElementById("reportTitle").textContent = chat.title || "Alenaz conversation";
    const main = report.document.getElementById("reportMessages");
    chat.messages.forEach(message => {
      const article = report.document.createElement("article");
      const header = report.document.createElement("h2");
      header.textContent = message.role === "user" ? "You" : "Alenaz";
      const content = report.document.createElement("pre");
      content.textContent = message.text || (message.attachmentName ? "Attachment: " + message.attachmentName : "[Non-text content]");
      article.append(header, content);
      main.append(article);
    });
    showFeedback("Report opened. Choose Print / Save as PDF in the new tab.");
  }
  $("subscriptionNav")?.addEventListener("click", open);
  $("subscriptionClose")?.addEventListener("click", close);
  $("subscriptionOverlay")?.addEventListener("click", event => { if (event.target === $("subscriptionOverlay")) close(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("subscriptionOverlay")?.classList.contains("hidden")) close(); });
  document.querySelectorAll("[data-preview-plan]").forEach(button => button.addEventListener("click", () => {
    if (paidPreview()) readFields();
    const next = button.getAttribute("data-preview-plan");
    if (!VALID_PLANS.includes(next)) return;
    state.plan = next;
    save(); render(); showFeedback("Preview changed to " + next + ". No payment was made and server limits did not change.");
  }));
  $("subSave")?.addEventListener("click", () => {
    if (!paidPreview()) return;
    readFields();
    if (save()) showFeedback("Saved in this browser. Preferences will apply to your next chat or search message.");
  });
  $("subClearMemory")?.addEventListener("click", () => {
    if (!paidPreview()) return;
    state.memory = ""; $("subMemory").value = ""; save(); showFeedback("Memory notes cleared in this browser.");
  });
  $("subExportReport")?.addEventListener("click", printReport);
  $("subOpenFolders")?.addEventListener("click", () => {close(); $("savedChatsNav")?.click();});
  window.AlenazSubscriptions = {context, open, plan: () => state.plan};
  render();
})();
