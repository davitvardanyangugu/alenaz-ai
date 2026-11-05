/* Alenaz Video Studio — safe preview; no paid jobs when API unavailable. */
(function () {
"use strict";
function mount() {
 const style=document.createElement("style");
 style.textContent=`.video-studio-launch{width:100%;margin:8px 0;padding:12px;border:1px solid #6655aa;border-radius:12px;background:#29203f;color:white;cursor:pointer}.video-studio-overlay{position:fixed;inset:0;background:#05050cdd;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}.video-studio-panel{background:#171727;color:#fff;border:1px solid #514772;border-radius:18px;max-width:550px;width:100%;padding:24px;max-height:90vh;overflow:auto}.video-studio-panel textarea,.video-studio-panel select{box-sizing:border-box;width:100%;background:#242438;color:#fff;border:1px solid #665c85;border-radius:8px;padding:12px;margin:8px 0}.video-studio-panel button{padding:10px 16px;border-radius:9px;border:0;cursor:pointer}.video-studio-panel button:disabled{opacity:.5;cursor:not-allowed}.video-studio-panel .video-warning{background:#3b2a20;padding:12px;border-radius:9px;line-height:1.5}`;
 document.head.appendChild(style);
 const launch=document.createElement("button");launch.type="button";launch.className="video-studio-launch";launch.textContent="🎬 Create a video";
 const target=document.getElementById("sidebarImage")||document.getElementById("newChatButton");
 if(target)target.insertAdjacentElement("afterend",launch);else document.body.appendChild(launch);
 launch.addEventListener("click",async()=>{
  const overlay=document.createElement("div");overlay.className="video-studio-overlay";
  const panel=document.createElement("section");panel.className="video-studio-panel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Video Studio");
  const title=document.createElement("h2");title.textContent="🎬 Alenaz Video Studio";
  const desc=document.createElement("p");desc.textContent="Plan your video. Paid rendering is disabled until an officially supported video API is available.";
  const prompt=document.createElement("textarea");prompt.rows=4;prompt.maxLength=4000;prompt.placeholder="Describe your video scene…";prompt.setAttribute("aria-label","Video prompt");
  const aspect=document.createElement("select");aspect.setAttribute("aria-label","Aspect ratio");
  [["1280x720","Landscape · 16:9"],["720x1280","Portrait · 9:16"]].forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;aspect.appendChild(o)});
  const duration=document.createElement("select");duration.setAttribute("aria-label","Duration");
  [4,8,12].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s+" seconds";duration.appendChild(o)});
  const status=document.createElement("p");status.className="video-warning";status.setAttribute("role","status");status.textContent="Checking video provider availability…";
  const generate=document.createElement("button");generate.textContent="Generate video";generate.disabled=true;
  const close=document.createElement("button");close.textContent="Close";close.style.marginLeft="8px";
  close.addEventListener("click",()=>overlay.remove());overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
  generate.addEventListener("click",()=>{}); // Deliberately no chargeable operation.
  panel.append(title,desc,prompt,aspect,duration,status,generate,close);overlay.appendChild(panel);document.body.appendChild(overlay);prompt.focus();
  try{const response=await fetch("/api/videos/capabilities",{cache:"no-store"});const data=await response.json();status.textContent=data.reason||"Video generation is currently unavailable.";generate.disabled=!data.enabled;if(data.enabled){generate.disabled=true;status.textContent="Provider status changed; rendering requires an audited API integration before enabling payments."}}
  catch(e){status.textContent="Cannot verify video provider access. Generation remains disabled."}
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})();