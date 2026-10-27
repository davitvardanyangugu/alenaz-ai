/* Alenaz Studio enhancements: local-only library, export, shortcuts, answer tools. */
(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const safeRead = () => {
    try {
      const data = JSON.parse(localStorage.getItem("alenaz_conversations_v1") || "[]");
      return Array.isArray(data) ? data : [];
    } catch (_) { return []; }
  };
  const search = byId("historySearch");
  if (search) {
    const filter = () => {
      const term = search.value.trim().toLocaleLowerCase();
      const items = [...document.querySelectorAll("#historyList .history-item")];
      items.forEach(item => {
        item.hidden = !item.textContent.toLocaleLowerCase().includes(term);
      });
    };
    search.addEventListener("input", filter);
    const history = byId("historyList");
    if (history) new MutationObserver(filter).observe(history, {childList:true});
  }
  const exporter = byId("exportChats");
  if (exporter) exporter.addEventListener("click", () => {
    const chats = safeRead();
    if (!chats.length) { alert("No conversations to export yet."); return; }
    const data = {app:"Alenaz AI",version:1,exportedAt:new Date().toISOString(),conversations:chats};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="alenaz-chats-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const help = () => alert("Alenaz shortcuts:\n\nCtrl/⌘ + K — New conversation\nCtrl/⌘ + / — Focus message box\nEsc — Close dialogs\nEnter — Send message (when enabled)");
  byId("shortcutHelp")?.addEventListener("click", help);
  document.addEventListener("keydown", event => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === "k") {event.preventDefault();byId("newChatButton")?.click();byId("promptInput")?.focus();}
    if (key === "/") {event.preventDefault();byId("promptInput")?.focus();}
  });
  document.querySelectorAll(".dashboard-hero-buttons [data-prompt], .dashboard-hero-buttons [data-tool]").forEach(button => {
    button.addEventListener("click", () => {
      const prompt = button.getAttribute("data-prompt");
      const tool = button.getAttribute("data-tool");
      if (tool) {
        const target = document.querySelector('.starter-card[data-tool="' + tool + '"]');
        target?.click();
      } else if (prompt) {
        const input = byId("promptInput");
        if (input) {
          input.value = prompt;
          input.dispatchEvent(new Event("input", {bubbles:true}));
          input.focus();
        }
      }
    });
  });
  const messages = byId("messages");
  if (!messages) return;
  const attachActions = () => {
    messages.querySelectorAll(".message.assistant").forEach(row => {
      if (row.querySelector(".message-toolbar")) return;
      const body = row.querySelector(".message-body");
      const answer = body?.querySelector(".message-text");
      if (!body || !answer || !answer.textContent.trim() || answer.querySelector(".thinking")) return;
      const bar = document.createElement("div");
      bar.className="message-toolbar";
      const copy = document.createElement("button");
      copy.type="button";copy.textContent="⧉ Copy";
      copy.setAttribute("aria-label","Copy answer");
      copy.addEventListener("click", async () => {
        const value=answer.innerText || answer.textContent;
        try { await navigator.clipboard.writeText(value);copy.textContent="✓ Copied"; }
        catch (_) {copy.textContent="Copy unavailable";}
        setTimeout(() => {copy.textContent="⧉ Copy";},1800);
      });
      const speak = document.createElement("button");
      speak.type="button";speak.textContent="◉ Listen";
      speak.setAttribute("aria-label","Read answer aloud");
      speak.addEventListener("click", () => {
        if (!("speechSynthesis" in window)) {alert("Speech playback is not supported here.");return;}
        if (speechSynthesis.speaking) {speechSynthesis.cancel();speak.textContent="◉ Listen";return;}
        const utterance=new SpeechSynthesisUtterance(answer.innerText || answer.textContent);
        utterance.onend=()=>{speak.textContent="◉ Listen";};
        speechSynthesis.speak(utterance);speak.textContent="■ Stop";
      });
      bar.append(copy,speak);body.appendChild(bar);
    });
  };
  new MutationObserver(attachActions).observe(messages,{childList:true,subtree:true,characterData:true});
  attachActions();
})();
