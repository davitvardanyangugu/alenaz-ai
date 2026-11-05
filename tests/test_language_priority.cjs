/** Regression checks for equal language priority. Run: node --test tests/test_language_priority.cjs */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.join(__dirname,"../static/languages.js"),"utf8");

class FakeElement {
  constructor(id) {
    this.id = id; this.value = ""; this.children = []; this.listeners = {};
    this.attributes = {}; this.textContent = ""; this.isConnected = true;
    this.classList = {
      items: new Set(["hidden"]),
      add(key) {this.items.add(key);},
      remove(key) {this.items.delete(key);},
      contains(key) {return this.items.has(key);},
      toggle(key,enabled) {enabled ? this.items.add(key) : this.items.delete(key);}
    };
  }
  append(...items) {this.children.push(...items);}
  appendChild(item) {this.children.push(item);}
  replaceChildren(...items) {this.children = items;}
  addEventListener(type, callback) {(this.listeners[type] ||= []).push(callback);}
  setAttribute(name,value) {this.attributes[name] = value;}
  focus() {}
  getClientRects() {return [{}];}
  querySelectorAll() {return [];}
  click() {(this.listeners.click || []).forEach(fn=>fn({}));}
}

function setup() {
  const elements = new Map(), listeners = {}, store = {};
  const ids = [
    "languageVipList","languageAllList","languageVipSection","languageOtherSection",
    "languageEmpty","languageFoundCount","languageSearch","languageCurrent",
    "languageCurrentChoice","languageButton","languageButtonLabel","languageModal",
    "languageSettingButton","languageModalClose"
  ];
  ids.forEach(id=>elements.set(id,new FakeElement(id)));
  const document = {
    getElementById:id=>elements.get(id)||null,
    createElement:tag=>new FakeElement(tag),
    querySelector:()=>null,
    documentElement:{lang:""},
    body:{classList:{add(){},remove(){}}},
    activeElement:null,
  };
  const window = {
    addEventListener(type,fn) {(listeners[type] ||= []).push(fn);},
    dispatchEvent(event) {(listeners[event.type] || []).forEach(fn=>fn(event));},
  };
  const settings = {language:"en"};
  class CustomEvent {constructor(type,opts){this.type=type;this.detail=opts?.detail;}}
  vm.runInNewContext(code, {
    document, window, settings, CustomEvent,
    saveJSON:(key,value)=>{store[key]=JSON.stringify(value);},
    SETTINGS_KEY:"alenaz_settings_v1",
    navigator:{language:"en-US"},
    Intl
  }, {filename:"languages.js"});
  return {elements, window, settings, document, store};
}

test("182 equally styled priority languages, Azerbaijani and Turkish separately",()=>{
  const {elements,window} = setup();
  const priority = elements.get("languageVipList").children;
  const other = elements.get("languageAllList").children;
  assert.equal(window.AlenazLanguages.catalogSize,184);
  assert.equal(priority.length,182);
  assert.equal(other.length,2);
  assert.ok(priority.every(item=>item.className.includes("priority-language")));
  const codes = items=>items.map(item=>item.children[1].textContent.split(" · ").at(-1));
  assert.deepEqual(codes(other),["AZ","TR"]);
  for (const code of ["HY","RU","EN"]) assert.ok(codes(priority).includes(code));
  assert.ok(!codes(priority).includes("AZ") && !codes(priority).includes("TR"));
});

test("languages from either section remain selectable with the same settings API",()=>{
  const {window,settings,store,document} = setup();
  for (const code of ["hy","ru","en","fr","az","tr"]) {
    window.AlenazLanguages.choose(code);
    assert.equal(settings.language,code);
    assert.equal(JSON.parse(store.alenaz_settings_v1).language,code);
    assert.equal(document.documentElement.lang,code);
  }
});
