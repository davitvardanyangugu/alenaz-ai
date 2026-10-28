/* Alenaz Library — local-first, actual chat organization, no fake cloud authentication. */
(function () {
  "use strict";
  const el = id => document.getElementById(id);
  const FOLDERS_KEY = "alenaz_folders_v1";
  const LIBRARY_VERSION = 2;
  const readFolders = () => {
    try {
      const value = JSON.parse(localStorage.getItem(FOLDERS_KEY) || "[]");
      return Array.isArray(value) ? value.filter(f => f && typeof f.id === "string" && typeof f.name === "string").slice(0, 100) : [];
    } catch (_) { return []; }
  };
  let folders = readFolders();
  let filter = "all";
  let query = "";
  const main = el("mainContent");
  const library = el("libraryView");
  const rail = el("libraryFilters");
  const folderRail = el("libraryFolders");
  const cards = el("libraryCards");
  const modal = el("libraryModalBackdrop");
  const account = el("accountBackdrop");
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const countText = n => n === 1 ? "1 chat" : n + " chats";
  const newId = () => (typeof uid === "function" ? uid() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const byId = id => conversations.find(c => c.id === id);
  const folderName = id => folders.find(f => f.id === id)?.name || "Unfiled";
  const sorted = list => list.slice().sort((a,b) => Number(!!b.pinned)-Number(!!a.pinned) || (b.updated || 0)-(a.updated || 0));
  const formatDate = timestamp => {
    const date = new Date(timestamp || Date.now());
    return isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
  };
  const saveFolders = () => {
    try {localStorage.setItem(FOLDERS_KEY,JSON.stringify(folders));}
    catch (_) {alert("Could not save folders. Browser storage may be full.");}
  };
  const sync = () => {
    saveConversations();
    renderHistory();
    render();
  };
  const closeSidebar = () => el("sidebar")?.classList.remove("open");
  const close = () => {
    if(!library) return;
    library.classList.add("hidden");
    main?.classList.remove("library-mode");
    el("savedChatsNav")?.classList.remove("nav-active");
    if(el("viewTitle")) el("viewTitle").textContent = el("welcome")?.classList.contains("hidden") ? "Conversation" : "Overview";
  };
  const open = () => {
    if(!library) return;
    library.classList.remove("hidden");
    main?.classList.add("library-mode");
    el("savedChatsNav")?.classList.add("nav-active");
    el("homeNav")?.classList.remove("nav-active");
    if(el("viewTitle"))el("viewTitle").textContent = "Saved chats";
    closeSidebar();
    render();
  };
  window.AlenazLibrary = {open,close,refresh:()=>render()};
  const chooseFilter = name => {filter=name;render();};
  function drawRail() {
    if(!rail||!folderRail)return;
    rail.replaceChildren();folderRail.replaceChildren();
    const standard=[
      ["all","▤","All conversations",conversations.length],
      ["pinned","★","Pinned",conversations.filter(c=>c.pinned).length],
      ["unfiled","◇","Unfiled",conversations.filter(c=>!c.folderId||!folders.some(f=>f.id===c.folderId)).length]
    ];
    standard.forEach(([key,icon,label,count])=>{
      const button=make("button","library-filter"+(filter===key?" active":""),"");
      button.type="button";
      const start=make("span","library-filter-start");
      start.append(make("span","library-filter-symbol",icon),make("span","",label));
      button.append(start,make("small","",count));button.addEventListener("click",()=>chooseFilter(key));
      rail.append(button);
    });
    folders.forEach(folder=>{
      const row=make("div","library-folder-row"+(filter===folder.id?" active":""));
      const mainBtn=make("button","library-folder-select");
      mainBtn.type="button";mainBtn.title=folder.name;
      const name=make("span","library-folder-label",folder.name);
      mainBtn.append(make("span","library-folder-symbol","▧"),name,make("small","",conversations.filter(c=>c.folderId===folder.id).length));
      mainBtn.addEventListener("click",()=>chooseFilter(folder.id));
      const edit=make("button","library-folder-edit","⋯");
      edit.type="button";edit.title="Folder options";edit.setAttribute("aria-label","Options for "+folder.name);
      edit.addEventListener("click",()=>folderOptions(folder));
      row.append(mainBtn,edit);folderRail.append(row);
    });
    if(!folders.length){
      const note=make("p","library-no-folders","Make a folder to group related chats.");
      folderRail.append(note);
    }
  }
  function getVisible() {
    let list=sorted(conversations);
    if(filter==="pinned")list=list.filter(c=>!!c.pinned);
    else if(filter==="unfiled")list=list.filter(c=>!c.folderId||!folders.some(f=>f.id===c.folderId));
    else if(filter!=="all")list=list.filter(c=>c.folderId===filter);
    if(query){
      const term=query.toLocaleLowerCase();
      list=list.filter(c=>(c.title||"").toLocaleLowerCase().includes(term)||
        (Array.isArray(c.messages)&&c.messages.some(m=>m&&typeof m.text==="string"&&m.text.toLocaleLowerCase().includes(term))));
    }
    return list;
  }
  function cardFor(chat) {
    const wrapper=make("article","library-card");
    const openButton=make("button","library-card-open");
    openButton.type="button";
    const header=make("span","library-card-meta");
    if(chat.pinned)header.append(make("span","library-tag pinned","★ PINNED"));
    header.append(make("span","library-date",formatDate(chat.updated || chat.created)));
    const heading=make("strong","library-card-title",chat.title || "Untitled conversation");
    const preview=chat.messages?.find(m=>m?.role==="user"&&typeof m.text==="string"&&m.text.trim())?.text || "Start a conversation with Alenaz.";
    const paragraph=make("span","library-card-preview",preview.replace(/\s+/g," ").slice(0,150));
    const bottom=make("span","library-card-bottom");
    bottom.append(make("span","library-folder-badge","▧ "+folderName(chat.folderId)));
    bottom.append(make("span","library-message-count",countText(Array.isArray(chat.messages)?chat.messages.length:0)));
    openButton.append(header,heading,paragraph,bottom);
    openButton.addEventListener("click",()=>{loadConversation(chat.id);close();});
    const actions=make("div","library-card-actions");
    const action=(label,title,fn,cls="")=>{
      const btn=make("button","library-action "+cls,label);
      btn.type="button";btn.title=title;btn.setAttribute("aria-label",title);
      btn.addEventListener("click",fn);
      return btn;
    };
    actions.append(
      action(chat.pinned?"★ Unpin":"☆ Pin",chat.pinned?"Unpin conversation":"Pin conversation",()=>{chat.pinned=!chat.pinned;sync();},"pin-action"),
      action("↳ Move","Move conversation to folder",()=>moveChat(chat)),
      action("✎ Rename","Rename conversation",()=>renameChat(chat)),
      action("× Delete","Delete conversation",()=>deleteChat(chat),"delete-action")
    );
    wrapper.append(openButton,actions);return wrapper;
  }
  function render() {
    if(!library)return;
    const pinned=conversations.filter(c=>c.pinned).length;
    if(el("libraryChatCount"))el("libraryChatCount").textContent=conversations.length.toLocaleString();
    if(el("libraryPinCount"))el("libraryPinCount").textContent=pinned.toLocaleString();
    if(el("libraryFolderCount"))el("libraryFolderCount").textContent=folders.length.toLocaleString();
    if(el("savedNavCount"))el("savedNavCount").textContent=conversations.length.toLocaleString();
    drawRail();
    const headings={all:"All conversations",pinned:"Pinned conversations",unfiled:"Unfiled conversations"};
    if(el("libraryFilterHeading"))el("libraryFilterHeading").textContent=headings[filter]||folderName(filter);
    const visible=getVisible();
    if(el("libraryResultCount"))el("libraryResultCount").textContent=countText(visible.length);
    cards?.replaceChildren();
    if(!cards)return;
    if(!visible.length){
      const empty=make("div","library-empty");
      empty.append(make("div","library-empty-graphic","✳"),
        make("h3","",query?"No matching conversations":filter==="all"?"Your library is ready":"Nothing here yet"),
        make("p","",query?"Try another search term or filter.":"Start a chat or move a conversation into this section."));
      const cta=make("button","library-empty-cta",query?"Clear search":"＋ New conversation");cta.type="button";
      cta.addEventListener("click",()=>query?(el("librarySearch").value="",query="",render()):(newChat(),close()));
      empty.append(cta);cards.append(empty);return;
    }
    const frag=document.createDocumentFragment();visible.forEach(c=>frag.append(cardFor(c)));cards.append(frag);
  }
  // A shared modal for folder names, chat titles, and folder selection.
  function editDialog({title,description="",value="",kind="text",options=[],confirmLabel="Save changes",onSubmit}) {
    const input=el("libraryModalText"), select=el("libraryModalSelect");
    if(!modal||!input||!select)return;
    el("libraryModalTitle").textContent=title;
    el("libraryModalDescription").textContent=description;
    el("libraryModalConfirm").textContent=confirmLabel;
    const choosing=kind==="select";
    input.classList.toggle("hidden",choosing);
    el("libraryModalTextLabel").classList.toggle("hidden",choosing);
    select.classList.toggle("hidden",!choosing);
    el("libraryModalSelectLabel").classList.toggle("hidden",!choosing);
    input.value=value;
    select.replaceChildren();
    options.forEach(o=>{
      const option=document.createElement("option");
      option.value=o.value;option.textContent=o.label;option.selected=o.value===value;
      select.append(option);
    });
    modal.classList.remove("hidden");
    const closeModal=()=>{modal.classList.add("hidden");el("libraryModalConfirm").onclick=null;};
    const submit=()=>{
      const result=choosing?select.value:input.value.trim();
      if(!choosing&&!result){input.focus();return;}
      const success=onSubmit(result);
      if(success!==false)closeModal();
    };
    el("libraryModalConfirm").onclick=submit;
    el("libraryModalCancel").onclick=closeModal;
    el("libraryModalClose").onclick=closeModal;
    modal.onclick=event=>{if(event.target===modal)closeModal();};
    input.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();submit();}};
    select.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();submit();}};
    (choosing?select:input).focus();
    if(!choosing)input.select();
  }
  function createFolder(){
    if(folders.length>=100){alert("Your folder limit is 100.");return;}
    editDialog({title:"Create a new folder",description:"Group your conversations by subject, project, or anything you like.",confirmLabel:"Create folder",onSubmit:name=>{
      name=name.slice(0,70);
      if(folders.some(f=>f.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert("A folder with that name already exists.");return false;}
      const folder={id:newId(),name,created:Date.now()};
      folders.push(folder);saveFolders();filter=folder.id;render();
    }});
  }
  function folderOptions(folder){
    editDialog({title:"Rename folder",description:"Change the name of this collection. Existing chats stay inside.",value:folder.name,onSubmit:value=>{
      const name=value.slice(0,70);
      if(folders.some(f=>f.id!==folder.id&&f.name.toLowerCase()===name.toLowerCase())){alert("Another folder already has that name.");return false;}
      folder.name=name;saveFolders();render();
    }});
    // Delete remains a separate explicit action so renaming cannot accidentally remove chats.
  }
  function removeFolder(folder){
    const count=conversations.filter(c=>c.folderId===folder.id).length;
    if(!confirm("Delete folder \""+folder.name+"\"? "+count+" conversations will be moved to Unfiled, not deleted."))return;
    conversations.forEach(c=>{if(c.folderId===folder.id)c.folderId=null;});
    folders=folders.filter(f=>f.id!==folder.id);
    if(filter===folder.id)filter="unfiled";
    saveFolders();sync();
  }
  function renameChat(chat){
    editDialog({title:"Rename conversation",description:"Give this idea a name you'll remember.",value:chat.title||"Untitled conversation",onSubmit:value=>{
      chat.title=value.slice(0,70);chat.updated=Date.now();sync();
    }});
  }
  function moveChat(chat){
    editDialog({title:"Move to a folder",description:"Organize this conversation into a collection.",kind:"select",
      value:chat.folderId||"",confirmLabel:"Move conversation",
      options:[{value:"",label:"◇ Unfiled"},...folders.map(f=>({value:f.id,label:"▧ "+f.name}))],
      onSubmit:id=>{chat.folderId=id||null;sync();}
    });
  }
  function deleteChat(chat){
    if(!confirm("Delete \""+(chat.title||"this conversation")+"\" permanently from this browser? This cannot be undone."))return;
    conversations=conversations.filter(c=>c.id!==chat.id);
    if(currentId===chat.id){currentId=null;renderConversation();}
    sync();
  }
  el("libraryCreateFolder")?.addEventListener("click",createFolder);
  el("libraryQuickAddFolder")?.addEventListener("click",createFolder);
  el("savedChatsNav")?.addEventListener("click",open);
  el("recentOpenLibrary")?.addEventListener("click",open);
  el("librarySearch")?.addEventListener("input",event=>{query=event.target.value.trim();render();});
  // Import/export safely structured local backups.
  function exportAll(){
    const payload={
      app:"Alenaz AI",
      version:LIBRARY_VERSION,
      exportedAt:new Date().toISOString(),
      folders:folders.map(f=>({id:f.id,name:f.name,created:f.created})),
      conversations:safeConversationsForStorage()
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const a=document.createElement("a");
    a.href=url;a.download="alenaz-library-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  el("libraryExportButton")?.addEventListener("click",exportAll);
  el("libraryImportButton")?.addEventListener("click",()=>el("libraryImportInput")?.click());
  function safeURL(value){
    if(typeof value!=="string")return false;
    try{return ["http:","https:"].includes(new URL(value).protocol);}catch(_){return false;}
  }
  async function importFile(file){
    if(!file)return;
    if(file.size>4*1024*1024){alert("The backup is too large. The limit is 4 MB.");return;}
    let payload;try{payload=JSON.parse(await file.text());}
    catch(_){alert("This is not a valid JSON backup.");return;}
    const imported=Array.isArray(payload)?payload:payload?.conversations;
    if(!Array.isArray(imported)){alert("This file doesn't contain an Alenaz conversation backup.");return;}
    const sourceFolders=Array.isArray(payload?.folders)?payload.folders:[];
    const previousFolders=folders.map(f=>({...f}));
    const folderMap=new Map();
    sourceFolders.slice(0,100).forEach(f=>{
      if(!f||typeof f.id!=="string"||typeof f.name!=="string")return;
      const name=f.name.trim().slice(0,70);
      if(!name)return;
      let existing=folders.find(x=>x.name.toLowerCase()===name.toLowerCase());
      if(!existing&&folders.length<100){
        existing={id:newId(),name,created:Date.now()};folders.push(existing);
      }
      if(existing)folderMap.set(f.id,existing.id);
    });
    const usedIds=new Set(conversations.map(c=>c.id));
    const clean=[];
    imported.slice(0,500).forEach(raw=>{
      if(!raw||typeof raw!=="object"||!Array.isArray(raw.messages))return;
      if(typeof raw.id==="string"&&usedIds.has(raw.id))return;
      const messages=raw.messages.slice(0,200).filter(m=>m&&typeof m==="object"&&
        ["assistant","user"].includes(m.role)).map(m=>({
          role:m.role,
          text:typeof m.text==="string"?m.text.slice(0,30000):"",
          ...(typeof m.attachmentName==="string"?{attachmentName:m.attachmentName.slice(0,140)}:{}),
          ...(m.image||m.imageExpired?{imageExpired:true}:{}),
          ...(Array.isArray(m.sources)?{sources:m.sources.slice(0,10).filter(s=>s&&safeURL(s.url)).map(s=>({
            url:s.url,title:typeof s.title==="string"?s.title.slice(0,150):s.url,
            ...(Number.isInteger(s.end_index)?{end_index:s.end_index}:{})
          }))}:{})
        }));
      const id=typeof raw.id==="string"&&raw.id.length<=120?raw.id:newId();
      if(usedIds.has(id))return;
      usedIds.add(id);
      const name=typeof raw.title==="string"?raw.title.trim().slice(0,90):"Imported conversation";
      const validTime=t=>typeof t==="number"&&Number.isFinite(t)&&t>0&&t<4102444800000?t:Date.now();
      clean.push({
        id,title:name||"Imported conversation",messages,
        created:validTime(raw.created),updated:validTime(raw.updated),
        pinned:!!raw.pinned,folderId:folderMap.get(raw.folderId)||null
      });
    });
    if(!clean.length){folders=previousFolders;alert("No new conversations found. They may already be in your library.");return;}
    const previousChats=conversations;
    conversations=[...clean,...conversations];
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(safeConversationsForStorage()));
      localStorage.setItem(FOLDERS_KEY,JSON.stringify(folders));
    }catch(_){
      conversations=previousChats;folders=previousFolders;
      alert("Not enough browser storage to import this backup.");return;
    }
    renderHistory();render();
    window.dispatchEvent(new CustomEvent("alenaz:chats-updated"));
    alert("Imported "+countText(clean.length)+" into your local library.");
  }
  el("libraryImportInput")?.addEventListener("change",async event=>{
    const file=event.target.files?.[0];
    event.target.value="";
    await importFile(file);
  });
  // Local profile: identity on this device only, no passwords or misleading login form.
  const closeAccount=()=>account?.classList.add("hidden");
  const openAccount=()=>{
    if(!account)return;
    el("accountNameInput").value=(settings.displayName==="Guest"?"":settings.displayName)||"";
    account.classList.remove("hidden");
    closeSidebar();
    el("accountNameInput").focus();
  };
  el("accountCenterNav")?.addEventListener("click",openAccount);
  el("accountClose")?.addEventListener("click",closeAccount);
  account?.addEventListener("click",event=>{if(event.target===account)closeAccount();});
  el("accountSave")?.addEventListener("click",()=>{
    const name=(el("accountNameInput").value||"").trim().slice(0,30);
    if(!name){el("accountNameInput").focus();return;}
    settings.displayName=name;
    saveJSON(SETTINGS_KEY,settings);
    applySettings();
    closeAccount();
  });
  el("accountNameInput")?.addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();el("accountSave")?.click();}
  });
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    if(account&&!account.classList.contains("hidden")){event.stopPropagation();closeAccount();}
    if(modal&&!modal.classList.contains("hidden")){event.stopPropagation();modal.classList.add("hidden");}
  },true);
  window.addEventListener("alenaz:chats-updated",render);
  window.addEventListener("storage",event=>{
    if(event.key===FOLDERS_KEY){folders=readFolders();render();}
    if(event.key===STORAGE_KEY)render();
  });
  // Dedicated folder deletion context via a second-click confirmation control.
  folderRail?.addEventListener("contextmenu",event=>{
    const target=event.target.closest(".library-folder-row");
    if(!target)return;
    event.preventDefault();
    const index=[...folderRail.querySelectorAll(".library-folder-row")].indexOf(target);
    const folder=folders[index];if(folder)removeFolder(folder);
  });
  // The folder-delete button is also available via long-press-independent options.
  const originalOptions=folderOptions;
  // Deliberately keep rename and delete separate; no accidental destructive actions.
  el("librarySearch")?.addEventListener("keydown",event=>{
    if(event.key==="Escape"){event.target.value="";query="";render();}
  });
  render();
})();
