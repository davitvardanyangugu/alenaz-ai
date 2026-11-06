/* Alenaz Premium Lab: practical, local preview tools. No billing or paid entitlement. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const AGENTS_KEY = "alenaz_agent_presets_demo_v1";
  const RATE_KEY = "alenaz_voice_rate_demo_v1";
  const plan = () => window.AlenazSubscriptions?.plan?.() || "free";
  const plus = () => plan() !== "free";
  const pro = () => plan() === "pro";
  let agents = [];
  try {
    const saved = JSON.parse(localStorage.getItem(AGENTS_KEY) || "[]");
    if (Array.isArray(saved)) agents = saved.filter(a => a && typeof a.id === "string" && typeof a.name === "string" && typeof a.instructions === "string")
      .slice(0, 5).map(a=>({id:a.id.slice(0,90),name:a.name.slice(0,60),instructions:a.instructions.slice(0,700)}));
  } catch (_) {}
  let selectedId = "";
  let rate = 1;
  try {
    const savedRate = Number(localStorage.getItem(RATE_KEY));
    if (savedRate >= .75 && savedRate <= 1.35) rate = savedRate;
  } catch (_) {}
  const lab = document.createElement("section");
  lab.className = "sub-workspace premium-lab";
  lab.setAttribute("aria-labelledby", "premiumLabTitle");
  // This HTML is entirely static. Never interpolate user-supplied values.
  lab.innerHTML = `
  <div class="sub-workspace-head"><div><h3 id="premiumLabTitle">✦ Premium feature lab</h3><p>Useful tools you can try now. Starter prompts are never sent automatically.</p></div><span class="sub-status">EARLY ACCESS</span></div>
  <div class="premium-lab-grid">
    <div class="premium-lab-tile" data-min-tier="plus">
      <h4>✦ Image Prompt Studio <small>Plus &amp; Pro preview</small></h4>
      <p>Build a polished image prompt from a simple idea.</p>
      <label for="premiumImageIdea">Your image idea</label><input id="premiumImageIdea" type="text" maxlength="220" placeholder="e.g. a snowy castle" autocomplete="off">
      <label for="premiumImageStyle">Style</label>
      <select id="premiumImageStyle"><option value="cinematic">Cinematic</option><option value="illustration">Illustration</option><option value="minimal">Minimal graphic</option><option value="photographic">Photographic</option></select>
      <button id="premiumImageBuild" type="button">Prepare image prompt</button>
    </div>
    <div class="premium-lab-tile" data-min-tier="plus">
      <h4>◉ Voice Experience <small>Plus &amp; Pro preview</small></h4>
      <p>Adjust built-in browser read-aloud speed. Available voices vary by device.</p>
      <label for="premiumVoiceRate">Playback speed <output id="premiumVoiceRateLabel" for="premiumVoiceRate">1.00×</output></label>
      <input id="premiumVoiceRate" type="range" min="0.75" max="1.35" step="0.05" value="1">
      <button id="premiumVoiceSettings" type="button">Open voice settings</button>
    </div>
    <div class="premium-lab-tile" data-min-tier="pro">
      <h4>⌕ Research Brief <small>Pro preview</small></h4>
      <p>Prepare a sourced web-search question; full Deep Research is planned.</p>
      <label for="premiumResearchTopic">Topic</label><input id="premiumResearchTopic" type="text" maxlength="220" placeholder="e.g. renewable energy in Armenia" autocomplete="off">
      <button id="premiumResearchBuild" type="button">Prepare research prompt</button>
    </div>
    <div class="premium-lab-tile" data-min-tier="pro">
      <h4>⌘ Coding Starter <small>Pro preview</small></h4>
      <p>Get a structured coding conversation; repository editing is not enabled.</p>
      <label for="premiumCodeGoal">Coding goal</label><input id="premiumCodeGoal" type="text" maxlength="220" placeholder="e.g. debug a Python function" autocomplete="off">
      <button id="premiumCodeBuild" type="button">Prepare coding prompt</button>
    </div>
    <div class="premium-lab-tile premium-lab-agents" data-min-tier="pro">
      <h4>✳ Assistant Preset Library <small>Pro preview</small></h4>
      <p>Save up to five assistant profiles locally. Use the Name and Instructions fields above, then save a preset.</p>
      <label for="premiumAgentSelect">Saved profiles</label><select id="premiumAgentSelect"><option value="">Choose a preset</option></select>
      <div class="premium-lab-actions">
        <button id="premiumAgentSave" type="button">Save preset</button>
        <button id="premiumAgentLoad" type="button">Use selected</button>
        <button id="premiumAgentDelete" type="button">Delete</button>
      </div>
    </div>
    <div class="premium-lab-tile premium-lab-soon">
      <h4>▣ Video Studio <small>Pro · Planned</small></h4>
      <p>Real AI video generation is not yet connected. We won't pretend a video has been created.</p>
      <span class="premium-lab-coming">COMING LATER</span>
    </div>
  </div>
  <p class="premium-lab-message" id="premiumLabStatus" role="status" aria-live="polite"></p>
  <p class="premium-lab-disclosure">This is a demo, not a paid subscription. Chat, search and images retain their existing server limits. No checkout, cloud sync or premium AI capacity is enabled.</p>
  `;
  const roadmap = document.querySelector(".sub-roadmap");
  if (!roadmap) return;
  roadmap.parentNode.insertBefore(lab, roadmap);
  const inform = msg => { if ($("premiumLabStatus")) $("premiumLabStatus").textContent = msg; };
  const field = id => ($(id)?.value || "").trim();
  function renderAgents() {
    const select = $("premiumAgentSelect");
    select.replaceChildren(new Option("Choose a preset", ""));
    agents.forEach(a => select.add(new Option(a.name, a.id)));
    if (agents.some(a=>a.id===selectedId)) select.value = selectedId;
    else selectedId = "";
  }
  function sync() {
    document.querySelectorAll(".premium-lab-tile[data-min-tier]").forEach(tile => {
      const allowed = tile.dataset.minTier === "plus" ? plus() : pro();
      tile.classList.toggle("premium-lab-locked", !allowed);
      tile.querySelectorAll("button,input,select").forEach(c => c.disabled = !allowed);
    });
    $("premiumVoiceRate").value = String(rate);
    $("premiumVoiceRateLabel").textContent = rate.toFixed(2) + "×";
  }
  function prepare(message, tool, mode) {
    const input = $("promptInput");
    if (!input) return;
    if (input.value.trim() && !window.confirm("Replace your current message draft with this starter?")) return;
    $("subscriptionClose")?.click();
    if (tool === "image") $("sidebarImage")?.click();
    if (tool === "search") $("sidebarSearch")?.click();
    if (mode && $("modeSelect")) {
      $("modeSelect").value = mode;
      $("modeSelect").dispatchEvent(new Event("change", {bubbles: true}));
    }
    input.value = message;
    input.dispatchEvent(new Event("input", {bubbles: true}));
    input.focus();
    // The user must press Send before any API usage occurs.
  }
  $("premiumImageBuild").addEventListener("click", () => {
    if (!plus()) return;
    const idea = field("premiumImageIdea");
    if (!idea) { inform("Please enter an image idea."); $("premiumImageIdea").focus(); return; }
    const styles = {
      cinematic: "cinematic framing, atmospheric lighting, dramatic depth and refined composition",
      illustration: "polished illustrative details, cohesive colors and clear outlines",
      minimal: "minimal graphic shapes, negative space and sharp visual hierarchy",
      photographic: "realistic textures, natural lighting and believable photographic detail"
    };
    prepare("Generate an image of " + idea + ". Use " + (styles[$("premiumImageStyle").value] || styles.cinematic) + ". Avoid unintended text and watermarks.", "image");
  });
  $("premiumVoiceRate").addEventListener("input", e => {
    if (!plus()) return;
    const num = Number(e.target.value);
    if (!(num >= .75 && num <= 1.35)) return;
    rate = Math.round(num * 100) / 100;
    $("premiumVoiceRateLabel").textContent = rate.toFixed(2) + "×";
    try { localStorage.setItem(RATE_KEY, String(rate)); inform("Voice speed saved for this browser."); }
    catch (_) { inform("Could not save voice speed in this browser."); }
  });
  $("premiumVoiceSettings").addEventListener("click", () => {
    if (!plus()) return;
    $("subscriptionClose")?.click();
    $("settingsButton")?.click();
    $("speakToggle")?.focus();
  });
  $("premiumResearchBuild").addEventListener("click", () => {
    if (!pro()) return;
    const topic = field("premiumResearchTopic");
    if (!topic) { inform("Please enter a research topic."); $("premiumResearchTopic").focus(); return; }
    prepare("Search the web for current, reliable sources about " + topic + ". Present a clearly structured overview with real source links, compare major perspectives when relevant, and explain uncertainty. Do not invent citations.", "search");
  });
  $("premiumCodeBuild").addEventListener("click", () => {
    if (!pro()) return;
    const goal = field("premiumCodeGoal");
    if (!goal) { inform("Please enter your coding goal."); $("premiumCodeGoal").focus(); return; }
    prepare("Help with this software project: " + goal + ". Provide a practical plan, ask for missing code if needed, recommend maintainable changes and tests. Do not claim to have executed unrun code.", null, "code");
  });
  $("premiumAgentSave").addEventListener("click", () => {
    if (!pro()) return;
    const name = field("subAgentName").slice(0,60);
    const instructions = field("subAgentInstructions").slice(0,700);
    if (!name || !instructions) { inform("Enter a preset name and instructions above first."); $("subAgentName")?.focus(); return; }
    if (agents.length >= 5) { inform("Five presets are already saved. Delete one to add another."); return; }
    const agent = {id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),name,instructions};
    agents.push(agent);
    try { localStorage.setItem(AGENTS_KEY, JSON.stringify(agents)); }
    catch (_) { agents.pop(); inform("Storage unavailable: preset not saved."); return; }
    selectedId = agent.id;
    renderAgents();
    inform("Saved " + name + ". Select Use selected to activate it.");
  });
  $("premiumAgentSelect").addEventListener("change", e => { selectedId = e.target.value; });
  $("premiumAgentLoad").addEventListener("click", () => {
    if (!pro()) return;
    const agent = agents.find(a => a.id === selectedId);
    if (!agent) { inform("Select a saved preset first."); return; }
    $("subAgentName").value = agent.name;
    $("subAgentInstructions").value = agent.instructions;
    $("subAgentEnabled").checked = true;
    $("subSave")?.click();
    inform(agent.name + " is now the active assistant preset for future chat requests.");
  });
  $("premiumAgentDelete").addEventListener("click", () => {
    if (!pro()) return;
    const agent = agents.find(a => a.id === selectedId);
    if (!agent) { inform("Select a saved preset first."); return; }
    if (!window.confirm("Delete saved preset " + agent.name + "?")) return;
    agents = agents.filter(a => a.id !== agent.id);
    selectedId = "";
    try { localStorage.setItem(AGENTS_KEY, JSON.stringify(agents)); }
    catch (_) { inform("Could not save the deletion."); }
    renderAgents();
    inform("Saved preset removed. Previously loaded instructions remain until disabled above.");
  });
  document.querySelectorAll("[data-preview-plan]").forEach(button => button.addEventListener("click", () => { sync(); inform(""); }));
  $("subscriptionNav")?.addEventListener("click", () => { sync(); renderAgents(); });
  $("heroPremium")?.addEventListener("click", () => $("subscriptionNav")?.click());
  renderAgents(); sync();
  window.AlenazPremiumLab = { voiceRate: () => plus() ? rate : 1, refresh: sync };
})();
