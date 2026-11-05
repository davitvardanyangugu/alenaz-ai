/* Alenaz productivity tools: local drafts, prompt library, and Markdown export. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const DRAFT_KEY = "alenaz_drafts_v1";
  const FAVORITES_KEY = "alenaz_prompt_favorites_v1";
  const PROMPTS = [
    {id:"explain",group:"Study",title:"Explain it clearly",description:"Learn a hard topic step by step",mode:"study",prompt:"Teach me [topic] in simple steps. Start with an easy example, ask me a check-your-understanding question, and explain any mistake kindly."},
    {id:"quiz",group:"Study",title:"Quiz me",description:"Practice with instant feedback",mode:"study",prompt:"Quiz me on [topic] with 5 questions, one at a time. Wait for each answer, then explain why it is right or wrong before continuing."},
    {id:"homework",group:"Study",title:"Homework helper",description:"Understand the method, not just the answer",mode:"study",prompt:"Help me solve this homework problem: [paste problem]. Give hints first, let me try, and explain the solution at my level."},
    {id:"language",group:"Study",title:"Language practice",description:"Practice Armenian, English, or another language",mode:"study",prompt:"Help me practice [language] at [level]. Give a short lesson, a useful conversation, and gently correct my mistakes."},
    {id:"shorts",group:"Creative",title:"Shorts script",description:"Hook, storyline, and punchline",mode:"creative",prompt:"Write a 30-second original YouTube Short about [topic]. Include a strong first-second hook, a fast sequence of scenes, on-screen text, and a memorable ending."},
    {id:"story",group:"Creative",title:"Story builder",description:"Create characters and plot twists",mode:"creative",prompt:"Help me create an original story set in [setting]. Suggest 3 character ideas, an intriguing conflict, and 2 unexpected but believable twists."},
    {id:"image",group:"Creative",title:"Art direction",description:"Describe a consistent visual style",mode:"creative",prompt:"Help me design an image of [subject]. Propose a polished visual concept with composition, lighting, color palette, and specific details. Ask me about any critical missing requirements."},
    {id:"name",group:"Creative",title:"Name and branding",description:"Fresh product or channel ideas",mode:"creative",prompt:"Brainstorm 12 distinct names for [project] aimed at [audience]. Include one-sentence positioning, a tagline, and why the strongest 3 names work."},
    {id:"debug",group:"Code",title:"Fix my code",description:"Find causes and test a solution",mode:"code",prompt:"Act as a careful coding partner. Review this code and error: [paste code and error]. Diagnose the root cause, propose the smallest safe fix, and give a test to verify it."},
    {id:"build",group:"Code",title:"Build a feature",description:"Plan implementation in manageable steps",mode:"code",prompt:"Help me add [feature] to my [framework] project. First describe the user experience, then propose minimal code changes, accessibility considerations, and tests."},
    {id:"review",group:"Code",title:"Security check",description:"Review safety without overclaiming",mode:"code",prompt:"Review this app design or code for security and privacy risks: [details]. Rank issues by severity, explain realistic impact, and recommend practical fixes."},
    {id:"compare",group:"Everyday",title:"Compare options",description:"Make a practical decision",mode:"auto",prompt:"Compare [option A] and [option B] for [goal]. Use a balanced table with price, tradeoffs, risks, and which choice fits different needs."},
    {id:"plan",group:"Everyday",title:"Make a plan",description:"Turn a big goal into small actions",mode:"auto",prompt:"Help me make an achievable plan for [goal] within [time]. Break it into realistic steps, identify obstacles, and give me a simple first action."},
    {id:"rewrite",group:"Everyday",title:"Polish my writing",description:"Clear, natural wording",mode:"auto",prompt:"Improve the clarity, grammar, and tone of this text without changing what I mean: [paste text]. Give me one natural version and a short list of key edits."}
  ];

  function readObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (_) { return {}; }
  }
  function writeObject(key,value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  // Local drafts are never uploaded until the user presses Send.
  let drafts = readObject(DRAFT_KEY);
  const composer = $("promptInput");
  const keyForConversation = () => (typeof currentId !== "undefined" && currentId) ? "chat:" + currentId : "new";
  let activeDraftKey = keyForConversation();
  function persistDrafts() {
    const entries = Object.entries(drafts)
      .filter(([,entry]) => entry && typeof entry.text === "string" && entry.text.length > 0)
      .sort((a,b) => (b[1].updated || 0) - (a[1].updated || 0))
      .slice(0,40);
    drafts = Object.fromEntries(entries);
    writeObject(DRAFT_KEY,drafts);
  }
  function captureDraft() {
    if (!composer) return;
    const text = composer.value.slice(0,20000);
    if (text.trim()) drafts[activeDraftKey] = {text,updated:Date.now()};
    else delete drafts[activeDraftKey];
    persistDrafts();
  }
  function restoreDraft() {
    if (!composer) return;
    const entry = drafts[activeDraftKey];
    composer.value = entry && typeof entry.text === "string" ? entry.text : "";
    composer.dispatchEvent(new Event("input",{bubbles:true}));
  }
  composer?.addEventListener("input",captureDraft);
  window.addEventListener("alenaz:before-chat-switch",event=>{
    if (event.detail && event.detail.reason === "new" && activeDraftKey === "new") {
      delete drafts.new;
      persistDrafts();
    } else captureDraft();
  });
  window.addEventListener("alenaz:after-chat-switch",()=>{
    activeDraftKey = keyForConversation();
    restoreDraft();
  });
  window.addEventListener("alenaz:message-sent",event=>{
    delete drafts[activeDraftKey];
    delete drafts.new;
    if (event.detail && event.detail.conversationId) delete drafts["chat:" + event.detail.conversationId];
    persistDrafts();
    activeDraftKey = keyForConversation();
  });
  window.addEventListener("alenaz:chats-cleared",()=>{
    drafts = {};
    persistDrafts();
    activeDraftKey = "new";
  });
  window.addEventListener("beforeunload",captureDraft);
  if (composer) restoreDraft();

  const modal = $("promptLibraryModal");
  const search = $("promptLibrarySearch");
  const cards = $("promptLibraryCards");
  const filters = $("promptLibraryFilters");
  const favorites = readObject(FAVORITES_KEY);
  let selectedGroup = "All";
  let previousFocus = null;
  function saveFavorites() { writeObject(FAVORITES_KEY,favorites); }
  function closePrompts() {
    modal?.classList.add("hidden");
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  }
  function openPrompts() {
    if (!modal) return;
    previousFocus = document.activeElement;
    $("sidebar")?.classList.remove("open");
    modal.classList.remove("hidden");
    renderPrompts();
    search?.focus();
  }
  function make(tag,className,content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof content === "string") node.textContent = content;
    return node;
  }
  function renderFilters() {
    if (!filters) return;
    filters.replaceChildren();
    ["All","Favorites","Study","Creative","Code","Everyday"].forEach(group=>{
      const button = make("button","prompt-filter" + (selectedGroup === group ? " selected" : ""),group);
      button.type = "button";
      button.setAttribute("aria-pressed",String(selectedGroup === group));
      button.addEventListener("click",()=>{selectedGroup = group;renderPrompts();});
      filters.appendChild(button);
    });
  }
  function usePrompt(prompt) {
    window.AlenazLibrary?.close();
    const input = $("promptInput");
    if (!input) return;
    input.value = input.value.trim() ? input.value.trimEnd() + "\n\n" + prompt.prompt : prompt.prompt;
    const mode = $("modeSelect");
    if (mode) {
      mode.value = prompt.mode;
      mode.dispatchEvent(new Event("change",{bubbles:true}));
    }
    input.dispatchEvent(new Event("input",{bubbles:true}));
    closePrompts();
    input.focus();
  }
  function renderPrompts() {
    if (!cards) return;
    renderFilters();
    cards.replaceChildren();
    const query = (search?.value || "").trim().toLocaleLowerCase();
    const visible = PROMPTS.filter(p=>
      (selectedGroup === "All" || (selectedGroup === "Favorites" ? !!favorites[p.id] : p.group === selectedGroup)) &&
      (p.title + " " + p.description + " " + p.prompt).toLocaleLowerCase().includes(query)
    );
    if (!visible.length) {
      cards.appendChild(make("p","prompt-empty","No matching prompts. Try another category or search."));
      return;
    }
    visible.forEach(p=>{
      const card = make("article","prompt-card");
      const header = make("div","prompt-card-header");
      const tag = make("span","prompt-tag",p.group);
      const star = make("button","prompt-star",favorites[p.id] ? "★" : "☆");
      star.type = "button";
      star.title = favorites[p.id] ? "Remove from favorites" : "Add to favorites";
      star.setAttribute("aria-label",star.title);
      star.setAttribute("aria-pressed",String(!!favorites[p.id]));
      star.addEventListener("click",()=>{if(favorites[p.id]) delete favorites[p.id]; else favorites[p.id] = true;saveFavorites();renderPrompts();});
      header.append(tag,star);
      const title = make("h3","",p.title);
      const description = make("p","",p.description);
      const preview = make("p","prompt-example",p.prompt);
      const use = make("button","prompt-use","Use prompt ↗");
      use.type = "button";
      use.addEventListener("click",()=>usePrompt(p));
      card.append(header,title,description,preview,use);
      cards.appendChild(card);
    });
  }
  $("promptLibraryNav")?.addEventListener("click",openPrompts);
  $("promptLibraryClose")?.addEventListener("click",closePrompts);
  modal?.addEventListener("click",event=>{if(event.target === modal) closePrompts();});
  modal?.addEventListener("keydown",event=>{
    if (event.key === "Escape") {event.preventDefault();event.stopPropagation();closePrompts();}
    // Keep keyboard focus within the open dialog.
    if (event.key === "Tab") {
      const nodes = Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled])')).filter(n=>n.getClientRects().length);
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) {event.preventDefault();nodes[nodes.length-1].focus();}
      else if (!event.shiftKey && document.activeElement === nodes[nodes.length-1]) {event.preventDefault();nodes[0].focus();}
    }
  });
  search?.addEventListener("input",renderPrompts);

  function exportMarkdown() {
    const conversation = typeof currentConversation === "function" ? currentConversation() : null;
    if (!conversation || !Array.isArray(conversation.messages) || !conversation.messages.length) {
      if (typeof showNotice === "function") showNotice("Open a saved conversation first to download a Markdown transcript.");
      return;
    }
    const title = String(conversation.title || "Alenaz conversation").replace(/[\r\n]+/g," ").slice(0,120);
    const lines = ["# " + title,"","Exported locally from Alenaz on " + new Date().toLocaleString() + ".",""];
    conversation.messages.forEach(message=>{
      if (!message || !["user","assistant"].includes(message.role)) return;
      lines.push("## " + (message.role === "user" ? "You" : "Alenaz"),"");
      if (typeof message.text === "string") lines.push(message.text,"");
      if (message.attachmentName) lines.push("Attachment: " + String(message.attachmentName), "");
      if (message.image || message.imageExpired) lines.push("_Generated image not included in this text export._","");
      if (Array.isArray(message.sources)) {
        const sources = message.sources.filter(s=>s && typeof safeExternalUrl === "function" && safeExternalUrl(s.url)).slice(0,8);
        if (sources.length) {
          lines.push("Sources:");
          sources.forEach(s=>lines.push("- " + String(s.title || "Source").replace(/[\r\n]+/g," ") + ": " + safeExternalUrl(s.url)));
          lines.push("");
        }
      }
    });
    const content = lines.join("\n");
    const blob = new Blob([content],{type:"text/markdown;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = title.toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45) || "conversation";
    link.href = url;
    link.download = "alenaz-" + slug + ".md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  $("exportMarkdown")?.addEventListener("click",exportMarkdown);
  window.AlenazFeatures = {openPrompts,exportMarkdown};
})();