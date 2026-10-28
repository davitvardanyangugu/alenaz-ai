/** Browser-independent tests for Alenaz client behavior. Run: node --test tests/test_frontend.cjs */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.join(__dirname, "../static/app.js"), "utf8");

class Classes {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
  toggle(value, enabled) {
    if (enabled === undefined) enabled = !this.contains(value);
    if (enabled) this.add(value); else this.remove(value);
    return enabled;
  }
}

class Element {
  constructor(id = "") {
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.isConnected = true;
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.classList = new Classes();
    this.value = "";
    this._text = "";
    this.placeholder = "";
    this.disabled = false;
    this.scrollHeight = 40;
    this.scrollTop = 0;
  }
  get textContent() { return this._text + this.children.map(x => x.textContent || "").join(""); }
  set textContent(value) { this._text = String(value); this.replaceChildren(); }
  get innerHTML() { return this._text; }
  set innerHTML(value) { this._text = String(value); this.replaceChildren(); }
  appendChild(child) {
    child.parentNode = this;
    child.isConnected = this.isConnected;
    this.children.push(child);
    return child;
  }
  replaceChildren(...children) {
    for (const child of this.children) {child.parentNode = null; child.isConnected = false;}
    this.children = [];
    for (const child of children) this.appendChild(child);
  }
  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this);
    this.parentNode = null;
    this.isConnected = false;
  }
  addEventListener(type, callback) {
    (this.listeners[type] ||= []).push(callback);
  }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  focus() {}
  click() { (this.listeners.click || []).forEach(fn => fn({target:this})); }
}

function createRuntime(fetchOverride) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  const store = new Map();
  const context = vm.createContext({
    document: {
      getElementById: get,
      createElement: tag => new Element(tag),
      querySelector: query => query === ".conversation" ? get("conversation") : null,
      querySelectorAll: () => [],
      body: new Element("body"),
    },
    window: {
      innerWidth: 1200,
      dispatchEvent() {},
      addEventListener() {},
    },
    localStorage: {
      getItem: key => store.get(key) || null,
      setItem: (key,value) => store.set(key,String(value)),
    },
    CustomEvent: class { constructor(type) {this.type=type;} },
    requestAnimationFrame: fn => fn(),
    navigator: {language:"en-US"},
    console: {warn(){}},
    URL, AbortController, TextDecoder,
    fetch: async (url,options) => {
      if (url === "/api/health") return {
        json: async () => ({chat_model:"test",configured:true,hourly_limit:30,image_daily_limit:3})
      };
      if (fetchOverride) return fetchOverride(url,options);
      throw new Error("Unexpected request " + url);
    },
  });
  vm.runInContext(code, context, {filename:"app.js"});
  return {context, elements, store};
}

test("browser does not turn non-HTTP citations into clickable URLs", () => {
  const {context} = createRuntime();
  assert.equal(vm.runInContext('safeExternalUrl("javascript:alert(1)")',context),null);
  assert.equal(vm.runInContext('safeExternalUrl("data:text/html,hi")',context),null);
  assert.equal(vm.runInContext('safeExternalUrl("https://user:password@example.com")',context),null);
  assert.equal(vm.runInContext('safeExternalUrl("https://example.com\\\\evil")',context),null);
  assert.equal(vm.runInContext('safeExternalUrl("https://example.com")',context),"https://example.com/");
});

test("a reply from an inactive conversation never enters the visible chat", () => {
  const {context,elements} = createRuntime();
  vm.runInContext("currentId = 'current'",context);
  const count = elements.get("messages").children.length;
  vm.runInContext(
    "showReplyIfActive({id:'previous'}, {role:'assistant',text:'wrong conversation'})",
    context
  );
  assert.equal(elements.get("messages").children.length,count);
});

test("Stop generating aborts request and saves a stopped message", async () => {
  let abortObserved = false;
  const {context,store,elements} = createRuntime((url, options) => {
    if (url !== "/api/chat_stream") throw new Error("Wrong endpoint");
    return new Promise((resolve,reject) => {
      options.signal.addEventListener("abort",() => {
        abortObserved = true;
        const err = new Error("Aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  });
  elements.get("promptInput").value = "Start a long answer";
  const running = vm.runInContext("sendMessage()",context);
  assert.equal(elements.get("sendButton").attributes["aria-label"],"Stop generating");
  vm.runInContext("sendMessage()",context);
  await running;
  assert.equal(abortObserved,true);
  const chats = JSON.parse(store.get("alenaz_conversations_v1"));
  assert.equal(chats.length,1);
  assert.equal(chats[0].messages.at(-1).text,"Request stopped.");
  assert.equal(elements.get("sendButton").attributes["aria-label"],"Send message");
});
