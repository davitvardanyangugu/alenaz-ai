/* Alenaz languages — local preferences, VIP languages and broad ISO 639-1 catalog.
   Other language names can be entered directly. Assistant support depends on the model. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const CODES = "aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg sh si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu".split(" ");
  const VALID = new Set(CODES);
  const VIP = [
    {code:"hy",name:"Armenian",native:"Հայերեն",flag:"🇦🇲"},
    {code:"ru",name:"Russian",native:"Русский",flag:"🇷🇺"},
    {code:"en",name:"English",native:"English",flag:"🇬🇧"}
  ];
  const FALLBACK_NAMES = {
    af:"Afrikaans",am:"Amharic",ar:"Arabic",az:"Azerbaijani",be:"Belarusian",bg:"Bulgarian",bn:"Bengali",
    bs:"Bosnian",ca:"Catalan",cs:"Czech",cy:"Welsh",da:"Danish",de:"German",el:"Greek",es:"Spanish",
    et:"Estonian",eu:"Basque",fa:"Persian",fi:"Finnish",fr:"French",ga:"Irish",gd:"Scottish Gaelic",
    he:"Hebrew",hi:"Hindi",hr:"Croatian",hu:"Hungarian",id:"Indonesian",is:"Icelandic",it:"Italian",
    ja:"Japanese",ka:"Georgian",kk:"Kazakh",km:"Khmer",ko:"Korean",ku:"Kurdish",ky:"Kyrgyz",
    la:"Latin",lt:"Lithuanian",lv:"Latvian",mk:"Macedonian",ml:"Malayalam",mn:"Mongolian",mr:"Marathi",
    ms:"Malay",my:"Burmese",ne:"Nepali",nl:"Dutch",no:"Norwegian",pa:"Punjabi",pl:"Polish",
    ps:"Pashto",pt:"Portuguese",ro:"Romanian",sk:"Slovak",sl:"Slovenian",so:"Somali",sq:"Albanian",
    sr:"Serbian",sv:"Swedish",sw:"Swahili",ta:"Tamil",te:"Telugu",th:"Thai",tr:"Turkish",
    uk:"Ukrainian",ur:"Urdu",uz:"Uzbek",vi:"Vietnamese",yi:"Yiddish",zh:"Chinese",zu:"Zulu"
  };
  const STRINGS = {
    en: {
      languages:"Languages", languageSub:"Choose the language Alenaz speaks with you.", vip:"VIP PRIORITY", allLanguages:"ALL LANGUAGES",
      search:"Search languages by name or code…", custom:"Can't find it? Enter another language", customPlaceholder:"e.g. Western Armenian, Hmong, K'iche'",
      useCustom:"Choose language", close:"Close", selected:"Selected", count:"standard language options",
      languageNote:"Armenian, Russian and English have priority interface translations. Other languages change AI replies; some interface text stays in English. Model accuracy and voice support may vary.",
      current:"Current language", newChat:"New conversation", home:"Home", webSearch:"Web search", images:"Image generation",
      command:"Command center", promptLibrary:"Prompt library", savedChats:"Saved chats", account:"Account & sync",
      overview:"Overview", quickActions:"Quick actions", searchButton:"Search", recentChats:"RECENT CHATS",
      findChat:"Find a conversation…", export:"Backup", exportChat:"Chat .md", shortcuts:"Keys",
      greeting:"YOUR SPACE TO THINK BIG", headline1:"Where good ideas", headline2:"become ", headline3:"great things",
      intro:"Meet your new creative sidekick. For the questions, the big plans, and everything you haven't imagined yet.",
      start:"Start creating", explore:"Explore ideas", toolkit:"What do you feel like doing?",
      ask:"Ask anything", research:"Go explore", art:"Make some art", build:"Build something",
      askDesc:"Turn a question into your next breakthrough.",researchDesc:"Search the web and get to the interesting stuff.",
      artDesc:"Dream it up. Watch it come to life.",buildDesc:"From the first line to a finished project.",
      inspiration:"Try one of these.", disclaimer:"Alenaz can make mistakes. Verify information that matters.",
      promptPlaceholder:"Ask Alenaz anything…", preferences:"Preferences", profileQuestion:"What should Alenaz call you?",
      aloud:"Read answers aloud", aloudDesc:"Use your device's built-in text-to-speech voice.",
      compact:"Compact conversations", compactDesc:"Display messages closer together.",
      privacy:"About Alenaz & privacy", privacyDesc:"Alenaz is an AI assistant application created by David Vardanyan and powered by an external AI provider. Your chat history and preferences are saved in this browser, not in a cloud account. When you send messages, use web search, or upload files, that content is processed by the configured AI service. You can export your chats from Saved Chats or clear locally saved conversations here.",
      clear:"Clear all local conversations", save:"Save preferences", modeAuto:"✳ Auto mode",modeStudy:"◎ Study mode",
      modeCreative:"✿ Creative mode",modeCode:"⌘ Code mode",chooseLanguage:"Choose language", languageRow:"Interface & AI response language",
      invalidCustom:"Enter a language name using letters, spaces, hyphens or apostrophes (2–60 characters).",
      allCount:"184 standard choices, plus other languages by name"
    },
    hy: {
      languages:"Լեզուներ", languageSub:"Ընտրիր, թե ինչ լեզվով խոսի քեզ հետ Alenaz-ը։",vip:"VIP ԱՌԱՋՆԱՀԵՐԹ",allLanguages:"ԲՈԼՈՐ ԼԵԶՈՒՆԵՐԸ",
      search:"Որոնել լեզու՝ անունով կամ կոդով…",custom:"Չկա՞ ցանկում։ Մուտքագրիր այլ լեզու",customPlaceholder:"օրինակ՝ Արևմտահայերեն, Hmong",
      useCustom:"Ընտրել լեզուն",close:"Փակել",selected:"Ընտրված է",count:"ստանդարտ լեզու",
      languageNote:"Հայերենը, ռուսերենը և անգլերենը ունեն առաջնահերթ միջերեսային թարգմանություններ։ Մյուս լեզուները փոխում են AI-ի պատասխանների լեզուն․ միջերեսի որոշ մասեր մնում են անգլերեն։ Որակը և ձայնային աջակցությունը կարող են տարբերվել։",
      current:"Ընտրված լեզու",newChat:"Նոր զրույց",home:"Գլխավոր",webSearch:"Որոնում համացանցում",images:"Նկարների ստեղծում",
      command:"Հրամանների կենտրոն",promptLibrary:"Հուշումների գրադարան",savedChats:"Պահված զրույցներ",account:"Հաշիվ և համաժամեցում",
      overview:"Գլխավոր",quickActions:"Արագ գործողություններ",searchButton:"Որոնել",recentChats:"ՎԵՐՋԻՆ ԶՐՈՒՅՑՆԵՐ",
      findChat:"Գտնել զրույց…",export:"Պահուստ",exportChat:"Զրույց .md",shortcuts:"Դյուրանցումներ",
      greeting:"ՔՈ ՏԱՐԱԾՔԸ՝ ՄԵԾ ԳԱՂԱՓԱՐՆԵՐԻ ՀԱՄԱՐ",headline1:"Լավ գաղափարները",headline2:"դառնում են ",headline3:"մեծ գործեր",
      intro:"Քո ստեղծագործ օգնականը՝ հարցերի, մեծ ծրագրերի և նոր գաղափարների համար։",
      start:"Սկսել",explore:"Բացահայտել գաղափարներ",toolkit:"Ի՞նչ կցանկանաս անել։",
      ask:"Հարց տուր",research:"Ուսումնասիրել",art:"Ստեղծել նկար",build:"Ստեղծել ծրագիր",
      askDesc:"Հարցդ դարձրու նոր բացահայտում։",researchDesc:"Որոնիր համացանցում ու գտիր օգտակար նյութեր։",
      artDesc:"Նկարագրիր գաղափարդ և ստեղծիր պատկեր։",buildDesc:"Գաղափարից մինչև պատրաստի նախագիծ։",
      inspiration:"Փորձիր սրանք։",disclaimer:"Alenaz-ը կարող է սխալվել։ Կարևոր տեղեկությունը ստուգիր։",
      promptPlaceholder:"Հարցրու Alenaz-ին…",preferences:"Կարգավորումներ",profileQuestion:"Ինչպե՞ս դիմի քեզ Alenaz-ը։",
      aloud:"Բարձրաձայն կարդալ պատասխանները",aloudDesc:"Օգտագործել սարքի ձայնային հնարավորությունները։",
      compact:"Կոմպակտ զրույցներ",compactDesc:"Հաղորդագրությունները ավելի մոտ դասավորել։",
      privacy:"Alenaz-ի և գաղտնիության մասին",privacyDesc:"Alenaz-ը Դավիթ Վարդանյանի ստեղծած AI հավելվածն է, որն աշխատում է արտաքին AI մատակարարի միջոցով։ Զրույցներն ու կարգավորումները պահվում են այս դիտարկիչում, ոչ թե ամպային հաշվում։ Ուղարկված հաղորդագրություններն ու ֆայլերը մշակվում են ընտրված AI ծառայության կողմից։ Զրույցները կարող ես արտահանել կամ ջնջել։",
      clear:"Ջնջել տեղային բոլոր զրույցները",save:"Պահպանել կարգավորումները",modeAuto:"✳ Ավտոմատ",modeStudy:"◎ Ուսուցում",
      modeCreative:"✿ Ստեղծագործական",modeCode:"⌘ Ծրագրավորում",chooseLanguage:"Ընտրել լեզուն",languageRow:"Միջերեսի և AI-ի պատասխանների լեզու",
      invalidCustom:"Գրիր լեզվի անունը՝ տառերով, բացատներով կամ գծիկներով (2–60 նիշ)։",
      allCount:"184 ստանդարտ տարբերակ և լրացուցիչ լեզուներ՝ ըստ անվան"
    },
    ru: {
      languages:"Языки",languageSub:"Выбери язык, на котором Alenaz будет общаться с тобой.",vip:"VIP · ПРИОРИТЕТ",allLanguages:"ВСЕ ЯЗЫКИ",
      search:"Поиск языка по названию или коду…",custom:"Не нашёл язык? Введи его название",customPlaceholder:"Например: западноармянский, Hmong",
      useCustom:"Выбрать язык",close:"Закрыть",selected:"Выбрано",count:"стандартных языков",
      languageNote:"Для армянского, русского и английского есть приоритетные переводы интерфейса. Другие языки меняют язык ответов ИИ, но часть интерфейса остаётся на английском. Качество и поддержка озвучивания могут отличаться.",
      current:"Текущий язык",newChat:"Новый чат",home:"Главная",webSearch:"Поиск в интернете",images:"Генерация изображений",
      command:"Командный центр",promptLibrary:"Библиотека запросов",savedChats:"Сохранённые чаты",account:"Аккаунт и синхронизация",
      overview:"Обзор",quickActions:"Быстрые действия",searchButton:"Поиск",recentChats:"НЕДАВНИЕ ЧАТЫ",
      findChat:"Найти чат…",export:"Резервная копия",exportChat:"Чат .md",shortcuts:"Клавиши",
      greeting:"ПРОСТРАНСТВО ДЛЯ БОЛЬШИХ ИДЕЙ",headline1:"Хорошие идеи",headline2:"становятся ",headline3:"великими делами",
      intro:"Твой творческий помощник — для вопросов, больших планов и новых идей.",
      start:"Начать",explore:"Исследовать идеи",toolkit:"Что хочешь сделать?",
      ask:"Задать вопрос",research:"Исследовать",art:"Создать изображение",build:"Создать проект",
      askDesc:"Преврати вопрос в открытие.",researchDesc:"Ищи в интернете и находи самое интересное.",
      artDesc:"Придумай и воплоти.",buildDesc:"От первой строки до готового проекта.",
      inspiration:"Попробуй это.",disclaimer:"Alenaz может ошибаться. Проверяй важную информацию.",
      promptPlaceholder:"Спроси Alenaz о чём угодно…",preferences:"Настройки",profileQuestion:"Как Alenaz должен к тебе обращаться?",
      aloud:"Озвучивать ответы",aloudDesc:"Использовать голосовые возможности устройства.",
      compact:"Компактные сообщения",compactDesc:"Расположить сообщения ближе друг к другу.",
      privacy:"О приложении и конфиденциальности",privacyDesc:"Alenaz — приложение с ИИ, созданное Давидом Варданяном и работающее через внешнего поставщика ИИ. Чаты и настройки хранятся в этом браузере, а не в облачном аккаунте. Отправленные сообщения и файлы обрабатываются ИИ-сервисом. Вы можете экспортировать или удалить локальные чаты.",
      clear:"Удалить все локальные чаты",save:"Сохранить настройки",modeAuto:"✳ Авто",modeStudy:"◎ Обучение",
      modeCreative:"✿ Творчество",modeCode:"⌘ Программирование",chooseLanguage:"Выбрать язык",languageRow:"Язык интерфейса и ответов ИИ",
      invalidCustom:"Введите название языка из букв, пробелов, дефисов или апострофов (2–60 символов).",
      allCount:"184 стандартных языка и дополнительные по названию"
    }
  };
  const ui = (key) => (STRINGS[activeUi()] || STRINGS.en)[key] || STRINGS.en[key] || key;
  const activeUi = () => ["hy","ru","en"].includes(settings.language) ? settings.language : "en";
  function validCustom(name) {
    return typeof name === "string" && name.length >= 2 && name.length <= 60 &&
      /^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}'’\-]{1,59}$/u.test(name);
  }
  function normalize(value) {
    if (typeof value !== "string") return "en";
    if (VALID.has(value)) return value;
    if (value.startsWith("custom:") && validCustom(value.slice(7))) return value;
    return "en";
  }
  settings.language = normalize(settings.language || "en");
  const isVip = code => VIP.some(v=>v.code===code);
  const displayEn = (code) => {
    const priority = VIP.find(v=>v.code===code);
    if (priority) return priority.name;
    try { return new Intl.DisplayNames(["en"],{type:"language"}).of(code) || FALLBACK_NAMES[code] || code; }
    catch (_) { return FALLBACK_NAMES[code] || code; }
  };
  const displayNative = code => {
    const priority = VIP.find(v=>v.code===code);
    if(priority) return priority.native;
    try {return new Intl.DisplayNames([code],{type:"language"}).of(code) || displayEn(code);}
    catch (_) {return displayEn(code);}
  };
  const labelFor = code => {
    if (code.startsWith("custom:")) return code.slice(7);
    const vip = VIP.find(v=>v.code===code);
    if(vip) return vip.native;
    return displayNative(code);
  };
  const ALL = CODES.filter(code=>!isVip(code)).map(code=>({code,name:displayEn(code),native:displayNative(code)}))
    .sort((a,b)=>a.name.localeCompare(b.name,"en"));
  let modal = $("languageModal"), lastFocused = null, search = $("languageSearch"), returnToSettings = false;
  function setText(selector,key) {
    const el = document.querySelector(selector);
    if(el) el.textContent = ui(key);
  }
  function replaceButtonText(id,key) {
    const el = $(id);
    if(!el) return;
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim()) {node.textContent = " " + ui(key) + " ";return;}
    }
  }
  const nodeLabels = [
    ["#newChatButton span:nth-child(2)","newChat"],["#profileName","profileName"],
    ["#settingsTitle","preferences"],["#profileNameInputTitle","profileQuestion"],
    ["#readAloudLabel","aloud"],["#readAloudDesc","aloudDesc"],
    ["#compactLabel","compact"],["#compactDesc","compactDesc"],
    ["#privacyTitle","privacy"],["#privacyDescription","privacyDesc"],
    ["#saveSettings","save"],["#clearHistoryButton","clear"],
    ["#languageSettingTitle","languages"],["#languageSettingDescription","languageRow"],
    ["#languageTitle","languages"],["#languageSubtitle","languageSub"],["#languageVipTitle","vip"],["#languageAllTitle","allLanguages"],
    ["#languageCustomTitle","custom"],["#languageCustomButton","useCustom"],["#languageNote","languageNote"],
    ["#languageCurrentTitle","current"],["#languageCountLabel","allCount"],
    ["#sidebarSearchLabel","webSearch"],["#sidebarImageLabel","images"],
    ["#commandNavLabel","command"],["#promptLibraryNavLabel","promptLibrary"],
    ["#savedChatsNavLabel","savedChats"],["#accountCenterLabel","account"],
    ["#homeNavLabel","home"],["#sidebarHistoryTitle","recentChats"],
    ["#heroIntro","intro"],["#toolsHeading","toolkit"],
    ["#inspirationHeading","inspiration"],["#alDisclaimer","disclaimer"],
    [".tool-talk .tool-bottom strong","ask"],[".tool-research .tool-bottom strong","research"],
    [".tool-art .tool-bottom strong","art"],[".tool-build .tool-bottom strong","build"],
    [".tool-talk .tool-bottom small","askDesc"],[".tool-research .tool-bottom small","researchDesc"],
    [".tool-art .tool-bottom small","artDesc"],[".tool-build .tool-bottom small","buildDesc"],
    ["#heroStartLabel","start"],["#heroExploreLabel","explore"],
    ["#languageModalClose","close"]
  ];
  function updateLanguageUI() {
    const code = normalize(settings.language);
    const uiLang = activeUi();
    document.documentElement.lang = code.startsWith("custom:") ? "en" : code;
    // Keep navigation layout stable; direction only changes inside editable text.
    if($("promptInput")) $("promptInput").dir = ["ar","fa","he","ur","ps","sd","ug","yi","dv"].includes(code) ? "rtl" : "auto";
    for(const [selector,key] of nodeLabels) {
      if(key === "profileName") continue;
      setText(selector,key);
    }
    const p = document.querySelector(".hero-editorial h1");
    if(p) {
      const textNodes = Array.from(p.childNodes).filter(n=>n.nodeType===3);
      if(textNodes[0]) textNodes[0].textContent = ui("headline1");
      if(textNodes[1]) textNodes[1].textContent = ui("headline2");
      const accent = p.querySelector(".headline-highlight");
      if(accent && accent.firstChild) accent.firstChild.textContent = ui("headline3");
    }
    const placeholders=[["historySearch","findChat"],["promptInput","promptPlaceholder"],
      ["languageSearch","search"],["customLanguageInput","customPlaceholder"]];
    placeholders.forEach(([id,key])=>{const el=$(id);if(el) el.placeholder=ui(key);});
    [["sidebarSearch","webSearch"],["sidebarImage","images"],["openCommandFromSidebar","command"],
      ["promptLibraryNav","promptLibrary"],["savedChatsNav","savedChats"],["accountCenterNav","account"],
      ["homeNav","home"],["searchToggle","searchButton"]].forEach(([id,key])=>{
        if(!$(id)?.querySelector("[id$='Label']"))replaceButtonText(id,key);
      });
    const mode = $("modeSelect");
    if(mode) [["auto","modeAuto"],["study","modeStudy"],["creative","modeCreative"],["code","modeCode"]]
      .forEach(([value,key])=>{const opt=mode.querySelector('option[value="'+value+'"]');if(opt)opt.textContent=ui(key);});
    const head = $("languageButtonLabel");
    if(head) head.textContent = code.startsWith("custom:") ? "🌐" : code.toUpperCase();
    const current = $("languageCurrent");
    if(current) current.textContent = labelFor(code);
    const title = $("languageButton");
    if(title) title.setAttribute("aria-label",ui("languages")+" — "+labelFor(code));
    const close = $("languageModalClose");
    if(close) close.setAttribute("aria-label",ui("close"));
    const customBtn=$("languageCustomButton");
    if(customBtn) customBtn.title=ui("chooseLanguage");
    if(search) search.setAttribute("aria-label",ui("search"));
    const currentChoice=$("languageCurrentChoice");
    if(currentChoice) currentChoice.textContent=labelFor(code);
    const active = $("languageSettingButton");
    if(active) active.setAttribute("aria-label",ui("languages")+" — "+labelFor(code));
    if(!$("viewTitle")?.dataset?.original) $("viewTitle")?.setAttribute("data-original","overview");
    const label = $("languagesInlineLabel");
    if(label) label.textContent = ui("languages");
    const intro = $("langScreenDescription");
    if(intro) intro.textContent = ui("languageSub");
  }
  const matches = (value,query)=> !query || value.toLocaleLowerCase().includes(query);
  function createOption(item, vip) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-option" + (vip ? " vip-language" : "") +
      (settings.language === item.code ? " selected" : "");
    button.setAttribute("aria-pressed",String(settings.language===item.code));
    const lead = document.createElement("span");
    lead.className = "language-native";
    lead.textContent = (vip ? item.flag+" " : "")+item.native;
    const subtitle = document.createElement("span");
    subtitle.className = "language-english";
    subtitle.textContent = item.name + " · " + item.code.toUpperCase();
    const check = document.createElement("span");
    check.className = "language-check";
    check.textContent = settings.language === item.code ? "✓" : (vip ? "✦" : "");
    button.append(lead,subtitle,check);
    button.addEventListener("click",()=>chooseLanguage(item.code));
    return button;
  }
  function renderOptions() {
    const q=(search?.value||"").trim().toLocaleLowerCase();
    const vipList=$("languageVipList"), allList=$("languageAllList");
    if(vipList){
      vipList.replaceChildren();
      VIP.filter(item=>matches(item.name,q)||matches(item.native,q)||matches(item.code,q))
        .forEach(item=>vipList.appendChild(createOption(item,true)));
      const group=$("languageVipSection");
      if(group) group.classList.toggle("hidden",vipList.children.length===0);
    }
    if(allList) {
      allList.replaceChildren();
      ALL.filter(item=>matches(item.name,q)||matches(item.native,q)||matches(item.code,q))
        .forEach(item=>allList.appendChild(createOption(item,false)));
      const empty=$("languageEmpty");
      if(empty) empty.classList.toggle("hidden",allList.children.length>0 || (vipList && vipList.children.length>0));
    }
    if($("languageFoundCount")) {
      const count = (vipList?.children?.length||0)+(allList?.children?.length||0);
      $("languageFoundCount").textContent = count+" / "+CODES.length+" "+ui("count");
    }
  }
  function closeModal() {
    modal?.classList.add("hidden");
    document.body.classList.remove("language-dialog-open");
    if(returnToSettings) $("settingsModal")?.classList.remove("hidden");
    returnToSettings = false;
    if(lastFocused && lastFocused.isConnected) lastFocused.focus();
  }
  function openModal() {
    if(!modal)return;
    lastFocused=document.activeElement;
    returnToSettings = !!$("settingsModal") && !$("settingsModal").classList.contains("hidden");
    $("settingsModal")?.classList.add("hidden");
    modal.classList.remove("hidden");
    document.body.classList.add("language-dialog-open");
    updateLanguageUI();
    renderOptions();
    search?.focus();
  }
  function chooseLanguage(value) {
    const code=normalize(value);
    if(value !== code) return;
    settings.language=code;
    saveJSON(SETTINGS_KEY,settings);
    updateLanguageUI();
    window.dispatchEvent(new CustomEvent("alenaz:language-changed",{detail:{language:code}}));
    closeModal();
  }
  $("languageButton")?.addEventListener("click",openModal);
  $("languageSettingButton")?.addEventListener("click",openModal);
  $("languageModalClose")?.addEventListener("click",closeModal);
  modal?.addEventListener("click",e=>{if(e.target===modal)closeModal();});
  modal?.addEventListener("keydown",e=>{
    if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closeModal();}
    if(e.key==="Tab"){
      const nodes=Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled])')).filter(n=>n.getClientRects().length);
      if(!nodes.length)return;
      if(e.shiftKey && document.activeElement===nodes[0]){e.preventDefault();nodes[nodes.length-1].focus();}
      else if(!e.shiftKey && document.activeElement===nodes[nodes.length-1]){e.preventDefault();nodes[0].focus();}
    }
  });
  search?.addEventListener("input",renderOptions);
  $("languageCustomButton")?.addEventListener("click",()=>{
    const input=$("customLanguageInput");
    const value=(input?.value||"").trim();
    if(!validCustom(value)){
      const message=$("languageCustomError");
      if(message){message.textContent=ui("invalidCustom");message.classList.remove("hidden");}
      input?.focus();return;
    }
    $("languageCustomError")?.classList.add("hidden");
    chooseLanguage("custom:"+value);
  });
  $("customLanguageInput")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();$("languageCustomButton")?.click();}
  });
  window.addEventListener("alenaz:language-changed",()=>{
    updateLanguageUI();
    renderOptions();
  });
  updateLanguageUI();
  renderOptions();
  window.AlenazLanguages = {catalogSize:CODES.length,get:()=>settings.language,choose:chooseLanguage,
    open:openModal,display:labelFor,translate:ui,
    speechLocale:()=>{
      if(settings.language==="hy")return "hy-AM";
      if(settings.language==="ru")return "ru-RU";
      if(settings.language==="en")return "en-US";
      return VALID.has(settings.language) ? settings.language : (navigator.language || "en-US");
    }};
})();