/** Regression checks for Alenaz's local productivity features. Run: node --test tests/test_features.cjs */
const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const code = fs.readFileSync(path.join(__dirname,"../static/features.js"),"utf8");

class MockEvent {
  constructor(type,options={}) {this.type=type;this.detail=options.detail || null;this.key=options.key;}
  preventDefault() {}
  stopPropagation() {}
}
class MockElement {
  constructor(id="") {
    this.id=id;this.value="";this.children=[];this.listeners={};this.className="";
    this.textContent="";this.style={};this.isConnected=true;
    this.classList={_s:new Set(["hidden"]),add(value){this._s.add(value)},remove(value){this._s.delete(value)},contains(value){return this._s.has(value)}};
  }
  addEventListener(type,callback) {(this.listeners[type] ||= []).push(callback);}
  dispatchEvent(event) {(this.listeners[event.type] || []).forEach(fn=>fn(event));return true;}
  click() {this.dispatchEvent(new MockEvent("click"));}
  append(...children) {this.children.push(...children);}
  appendChild(child) {this.children.push(child);}
  replaceChildren(...children) {this.children=[...children];}
  setAttribute(key,value) {this[key]=String(value);}
  focus() {this.ownerDocument.activeElement=this;}
  remove() {this.isConnected=false;}
  getClientRects() {return [1];}
}
function boot() {
  const elements=new Map(),store=new Map(),downloads=[],notifications=[];
  const document={
    activeElement:null,
    createElement(tag) {const node=new MockElement(tag);node.ownerDocument=this;return node;},
    getElementById(id) {
      if(!elements.has(id)) {
        const node=new MockElement(id);node.ownerDocument=this;elements.set(id,node);
      }
      return elements.get(id);
    },
    body:null
  };
  document.body=document.createElement("body");
  const listeners={};
  const window={
    addEventListener(type,fn){(listeners[type] ||= []).push(fn);},
    dispatchEvent(event){(listeners[event.type] || []).forEach(fn=>fn(event));},
    AlenazLibrary:{close() {}}
  };
  const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))};
  const URL={createObjectURL(blob){downloads.push(blob);return "blob:test";},revokeObjectURL(){}};
  const Blob=class {constructor(parts,config){this.content=parts.join("");this.type=config.type;}};
  const context={
    document,window,localStorage,Event:MockEvent,Blob,URL,setTimeout(){},
    currentId:null,
    currentConversation:()=>({id:"abc",title:"Test chat",messages:[
      {role:"user",text:"Hello"},
      {role:"assistant",text:"World",sources:[{title:"unsafe",url:"javascript:alert(1)"},{title:"valid",url:"https://example.com"}]}
    ]}),
    safeExternalUrl:url=>typeof url==="string"&&url.startsWith("https://")?url:null,
    showNotice:message=>notifications.push(message),
    Date,console,
  };
  vm.runInNewContext(code,context,{filename:"features.js"});
  return {context,document,window,store,downloads,notifications};
}

test("unsent drafts survive switches and are removed after send",()=>{
  const {context,document,window,store}=boot();
  const input=document.getElementById("promptInput");
  input.value="My new draft";input.dispatchEvent(new MockEvent("input"));
  assert.equal(JSON.parse(store.get("alenaz_drafts_v1")).new.text,"My new draft");

  window.dispatchEvent(new MockEvent("alenaz:before-chat-switch",{detail:{reason:"load"}}));
  context.currentId="chat-1";
  window.dispatchEvent(new MockEvent("alenaz:after-chat-switch"));
  assert.equal(input.value,"");

  input.value="My chat draft";input.dispatchEvent(new MockEvent("input"));
  window.dispatchEvent(new MockEvent("alenaz:before-chat-switch",{detail:{reason:"load"}}));
  context.currentId=null;
  window.dispatchEvent(new MockEvent("alenaz:after-chat-switch"));
  assert.equal(input.value,"My new draft");

  window.dispatchEvent(new MockEvent("alenaz:before-chat-switch",{detail:{reason:"load"}}));
  context.currentId="chat-1";
  window.dispatchEvent(new MockEvent("alenaz:after-chat-switch"));
  assert.equal(input.value,"My chat draft");

  window.dispatchEvent(new MockEvent("alenaz:message-sent",{detail:{conversationId:"chat-1"}}));
  assert.equal(JSON.parse(store.get("alenaz_drafts_v1"))["chat:chat-1"],undefined);
});

test("prompt templates are editable and never sent automatically",()=>{
  const {document}=boot();
  document.getElementById("promptLibraryNav").click();
  const cards=document.getElementById("promptLibraryCards");
  assert.equal(cards.children.length,14);
  cards.children[0].children.at(-1).click();
  assert.match(document.getElementById("promptInput").value,/Teach me \[topic\]/);
  assert.equal(document.getElementById("modeSelect").value,"study");
});

test("Markdown transcript includes conversation but excludes unsafe source links",()=>{
  const {document,downloads}=boot();
  document.getElementById("exportMarkdown").click();
  assert.equal(downloads.length,1);
  assert.match(downloads[0].content,/## You\n\nHello/);
  assert.match(downloads[0].content,/## Alenaz\n\nWorld/);
  assert.match(downloads[0].content,/https:\/\/example.com/);
  assert.doesNotMatch(downloads[0].content,/javascript:alert/);
});