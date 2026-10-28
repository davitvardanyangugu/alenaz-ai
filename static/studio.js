/* Alenaz Studio 03 — useful, local-first workspace interactions. */
(function () {
  "use strict";
  const el = id => document.getElementById(id);
  const STORAGE_KEY = "alenaz_conversations_v1";
  const readChats = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter(c => c && typeof c === "object") : [];
    } catch (_) { return []; }
  };
  const getSortedChats = () => readChats().sort((a,b) => Number(!!b.pinned)-Number(!!a.pinned) || (b.updated || 0) - (a.updated || 0));
  const labelTime = value => {
    if (!value) return "Previous conversation";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Previous conversation";
    const delta = Date.now() - date.getTime();
    if (delta >= 0 && delta < 60000) return "Just now";
    if (delta >= 0 && delta < 3600000) return Math.max(1,Math.floor(delta/60000)) + " minutes ago";
    if (delta >= 0 && delta < 86400000) return Math.floor(delta/3600000) + " hours ago";
    return date.toLocaleDateString(undefined, {month:"short",day:"numeric"});
  };
  const focusComposer = (value, mode) => {
    window.AlenazLibrary?.close();
    if (mode && el("modeSelect")) el("modeSelect").value = mode;
    const input = el("promptInput");
    if (!input) return;
    if (typeof value === "string") {
      input.value = value;
      input.dispatchEvent(new Event("input",{bubbles:true}));
    }
    input.focus();
  };
  const showHome = () => {
    el("newChatButton")?.click();
    updateView();
  };
  const welcome = el("welcome");
  const history = el("historyList");
  const historySearch = el("historySearch");
  let lastSnapshot = "";
  const updateView = () => {
    const inLibrary = !!el("libraryView") && !el("libraryView").classList.contains("hidden");
    const homeVisible = welcome && !welcome.classList.contains("hidden") && !inLibrary;
    if (el("viewTitle")) el("viewTitle").textContent = inLibrary ? "Saved chats" : homeVisible ? "Overview" : "Conversation";
    el("homeNav")?.classList.toggle("nav-active", !!homeVisible);
    el("savedChatsNav")?.classList.toggle("nav-active", inLibrary);
  };
  function renderDashboard() {
    const chats = getSortedChats();
    const totalMessages = chats.reduce((sum,c) => sum + (Array.isArray(c.messages) ? c.messages.filter(m => m && m.role === "user").length : 0),0);
    if(el("dashboardChatsCount")) el("dashboardChatsCount").textContent = chats.length.toLocaleString();
    if(el("dashboardMessagesCount")) el("dashboardMessagesCount").textContent = totalMessages.toLocaleString();
    if(el("recentCountLabel")) el("recentCountLabel").textContent = chats.length + (chats.length === 1 ? " chat" : " chats");
    const list = el("recentHomeList");
    if (!list) return;
    const snapshot = JSON.stringify(chats.slice(0,3).map(c=>[c.id,c.title,c.updated,c.messages?.length]))+":"+chats.length;
    if(snapshot===lastSnapshot) return;
    lastSnapshot=snapshot;
    list.replaceChildren();
    if(!chats.length) {
      const empty=document.createElement("div");
      empty.className="recent-empty";
      const symbol=document.createElement("span");symbol.textContent="✳";
      const title=document.createElement("p");title.textContent="Your next great idea starts here.";
      const caption=document.createElement("small");caption.textContent="Conversations you create will appear in this space.";
      empty.append(symbol,title,caption);list.appendChild(empty);return;
    }
    chats.slice(0,3).forEach(chat=>{
      const button=document.createElement("button");button.type="button";button.className="recent-chat-item";
      const icon=document.createElement("span");icon.className="recent-chat-icon";icon.textContent="↗";
      const info=document.createElement("span");info.className="recent-chat-details";
      const title=document.createElement("strong");title.textContent=chat.title || "New conversation";
      const date=document.createElement("small");date.textContent=labelTime(chat.updated || chat.created);
      info.append(title,date);
      const arrow=document.createElement("span");arrow.className="recent-chat-arrow";arrow.textContent="→";
      button.append(icon,info,arrow);
      button.addEventListener("click",()=>{
        if(typeof loadConversation==="function") loadConversation(chat.id);
        updateView();
      });
      list.appendChild(button);
    });
  }
  const filterHistory = () => {
    const query = (historySearch?.value || "").trim().toLocaleLowerCase();
    history?.querySelectorAll(".history-item").forEach(item=>{
      item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
    });
  };
  historySearch?.addEventListener("input",filterHistory);
  el("focusHistory")?.addEventListener("click",()=>historySearch?.focus());
  el("homeNav")?.addEventListener("click",showHome);
  el("heroStart")?.addEventListener("click",()=>focusComposer(""));
  el("heroExplore")?.addEventListener("click",()=>el("toolsSection")?.scrollIntoView({behavior:"smooth",block:"start"}));
  el("sidebarBackdrop")?.addEventListener("click",()=>el("sidebar")?.classList.remove("open"));
  document.querySelectorAll(".inspiration-item[data-prompt]").forEach(button=>{
    button.addEventListener("click",()=>focusComposer(button.dataset.prompt,button.dataset.setMode));
  });
  function updateGreeting(){
    const hour=new Date().getHours();
    const text=hour<11?"GOOD MORNING · LET'S MAKE SOMETHING":hour<17?"GOOD AFTERNOON · MAKE TODAY COUNT":"GOOD EVENING · IDEAS DON'T SLEEP";
    if(el("timeGreeting"))el("timeGreeting").textContent=text;
  }
  updateGreeting();
  renderDashboard();
  updateView();
  if(history) new MutationObserver(()=>{
    filterHistory();renderDashboard();updateView();
  }).observe(history,{childList:true});
  if(welcome) new MutationObserver(updateView).observe(welcome,{attributes:true,attributeFilter:["class"]});
  if(el("libraryView")) new MutationObserver(updateView).observe(el("libraryView"),{attributes:true,attributeFilter:["class"]});
  window.addEventListener("storage",event=>{
    if(event.key===STORAGE_KEY){lastSnapshot="";renderDashboard();}
  });
  // Export local chat data without sending it to any server.
  el("exportChats")?.addEventListener("click",()=>{
    if (window.AlenazLibrary?.export) {window.AlenazLibrary.export();return;}
    const chats=readChats();
    if(!chats.length){alert("Create a conversation first—there is nothing to export yet.");return;}
    const content={app:"Alenaz AI",version:1,exportedAt:new Date().toISOString(),conversations:chats};
    const file=new Blob([JSON.stringify(content,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(file);
    const a=document.createElement("a");
    a.href=url;a.download="alenaz-chats-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  });
  // Command center: actions and conversations, all backed by actual functionality.
  const overlay=el("commandPalette");
  const cmdInput=el("commandInput");
  const results=el("commandResults");
  let selected=0;
  let matches=[];
  const actions=[
    {label:"New conversation",hint:"Start with a blank chat",icon:"＋",run:()=>showHome()},
    {label:"Saved chats",hint:"Open your organized conversation library",icon:"▣",run:()=>window.AlenazLibrary?.open()},
    {label:"Account & sync",hint:"Manage your local profile",icon:"♙",run:()=>el("accountCenterNav")?.click()},
    {label:"Search the web",hint:"Use Alenaz web search",icon:"⌕",run:()=>{el("sidebarSearch")?.click();focusComposer();}},
    {label:"Generate an image",hint:"Create art from a description",icon:"◇",run:()=>{el("sidebarImage")?.click();focusComposer();}},
    {label:"Study mode",hint:"Get a guided explanation",icon:"◎",run:()=>focusComposer("Help me understand a tricky topic step by step.","study")},
    {label:"Creative mode",hint:"Brainstorm something original",icon:"✿",run:()=>focusComposer("Help me brainstorm something original and exciting.","creative")},
    {label:"Code mode",hint:"Build and debug software",icon:"⌘",run:()=>focusComposer("Help me build a useful app.","code")},
    {label:"Preferences",hint:"Appearance and settings",icon:"⚙",run:()=>el("settingsButton")?.click()},
    {label:"Export conversations",hint:"Download a private backup",icon:"↓",run:()=>el("exportChats")?.click()}
  ];
  const closeCommand=()=>{overlay?.classList.add("hidden");if(cmdInput)cmdInput.value="";};
  function renderCommands(){
    if(!results) return;
    const needle=(cmdInput?.value || "").trim().toLocaleLowerCase();
    matches=[
      ...actions.map(action=>({...action,type:"action"})),
      ...getSortedChats().slice(0,40).map(chat=>({
        label:chat.title || "New conversation",
        hint:"Conversation · "+labelTime(chat.updated || chat.created),
        icon:"↗",type:"chat",run:()=>{
          if(typeof loadConversation==="function") loadConversation(chat.id);
        }
      }))
    ].filter(item=>(item.label+" "+item.hint).toLocaleLowerCase().includes(needle)).slice(0,12);
    selected=Math.min(selected,Math.max(0,matches.length-1));
    results.replaceChildren();
    if(!matches.length){
      const empty=document.createElement("div");empty.className="command-none";empty.textContent="No matching actions or conversations.";results.appendChild(empty);return;
    }
    matches.forEach((item,index)=>{
      const button=document.createElement("button");button.type="button";button.className="command-option"+(index===selected?" selected":"");
      const icon=document.createElement("span");icon.className="command-option-icon";icon.textContent=item.icon;
      const body=document.createElement("span");
      const title=document.createElement("strong");title.textContent=item.label;
      const caption=document.createElement("small");caption.textContent=item.hint;
      body.append(title,caption);
      const arrow=document.createElement("span");arrow.textContent="↵";
      button.append(icon,body,arrow);
      button.addEventListener("mouseenter",()=>{selected=index;results.querySelectorAll(".command-option").forEach((el,i)=>el.classList.toggle("selected",i===index));});
      button.addEventListener("click",()=>{closeCommand();item.run();});
      results.appendChild(button);
    });
  }
  const openCommand=()=>{
    if(!overlay)return;
    overlay.classList.remove("hidden");selected=0;renderCommands();
    cmdInput?.focus();
  };
  el("commandButton")?.addEventListener("click",openCommand);
  el("openCommandFromSidebar")?.addEventListener("click",()=>{
    el("sidebar")?.classList.remove("open");openCommand();
  });
  el("closeCommand")?.addEventListener("click",closeCommand);
  overlay?.addEventListener("click",event=>{if(event.target===overlay)closeCommand();});
  cmdInput?.addEventListener("input",()=>{selected=0;renderCommands();});
  cmdInput?.addEventListener("keydown",event=>{
    if(event.key==="ArrowDown" || event.key==="ArrowUp"){
      event.preventDefault();if(!matches.length)return;
      selected=(selected+(event.key==="ArrowDown"?1:-1)+matches.length)%matches.length;renderCommands();
      results?.querySelector(".selected")?.scrollIntoView({block:"nearest"});
    }else if(event.key==="Enter"){event.preventDefault();matches[selected]?.run();closeCommand();}
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){
      if(overlay&&!overlay.classList.contains("hidden")){event.preventDefault();closeCommand();return;}
      el("sidebar")?.classList.remove("open");
      if(typeof closeSettings==="function") closeSettings();
      return;
    }
    if(event.ctrlKey||event.metaKey){
      const key=event.key.toLowerCase();
      if(key==="k"){event.preventDefault();overlay?.classList.contains("hidden")?openCommand():closeCommand();}
      else if(key==="/"){event.preventDefault();closeCommand();focusComposer();}
      else if(key==="n"&&event.shiftKey){event.preventDefault();closeCommand();showHome();focusComposer();}
    }
  });
  el("shortcutHelp")?.addEventListener("click",()=>{
    alert("Alenaz keyboard shortcuts:\n\n⌘/Ctrl + K  — Command center\n⌘/Ctrl + /  — Focus message\n⌘/Ctrl + Shift + N  — New conversation\nEnter  — Send a message\nShift + Enter  — New line\nEsc  — Close menu or dialog");
  });
  // Message actions: no unsafe HTML rendering, no remote dependencies.
  const messages=el("messages");
  if(messages){
    const addMessageActions=()=>{
      messages.querySelectorAll(".message.assistant").forEach(row=>{
        if(row.querySelector(".message-toolbar"))return;
        const body=row.querySelector(".message-body");
        const text=body?.querySelector(".message-text");
        if(!body||!text||!text.textContent.trim()||text.querySelector(".thinking"))return;
        const toolbar=document.createElement("div");toolbar.className="message-toolbar";
        const copy=document.createElement("button");copy.type="button";copy.textContent="⧉ Copy";copy.setAttribute("aria-label","Copy answer");
        copy.addEventListener("click",async()=>{
          try{await navigator.clipboard.writeText(text.innerText||text.textContent);copy.textContent="✓ Copied";}
          catch(_){copy.textContent="Unavailable";}
          setTimeout(()=>copy.textContent="⧉ Copy",1700);
        });
        const voice=document.createElement("button");voice.type="button";voice.textContent="◉ Listen";voice.setAttribute("aria-label","Read answer aloud");
        voice.addEventListener("click",()=>{
          if(!("speechSynthesis" in window)){alert("Speech playback isn't available in this browser.");return;}
          if(window.speechSynthesis.speaking){window.speechSynthesis.cancel();voice.textContent="◉ Listen";return;}
          const utterance=new SpeechSynthesisUtterance((text.innerText||text.textContent).slice(0,5000));
          utterance.onend=()=>voice.textContent="◉ Listen";
          utterance.onerror=()=>voice.textContent="◉ Listen";
          window.speechSynthesis.speak(utterance);voice.textContent="■ Stop";
        });
        toolbar.append(copy,voice);body.appendChild(toolbar);
      });
    };
    new MutationObserver(addMessageActions).observe(messages,{childList:true,subtree:true});
    addMessageActions();
  }
})();
