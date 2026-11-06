/* Alenaz AI voice: spoken text and short recordings sent to the configured AI provider. */
(function () {
"use strict";
const $=id=>document.getElementById(id);
const VOICES=["marin","cedar","coral","alloy","sage","nova"];
let voice="marin";
try {const stored=localStorage.getItem("alenaz_ai_voice_v1");if(VOICES.includes(stored))voice=stored;}catch(_){}
const choice=$("aiVoiceChoice");
if(choice)choice.value=voice;
choice?.addEventListener("change",()=>{
  if(!VOICES.includes(choice.value))return;
  voice=choice.value;
  try{localStorage.setItem("alenaz_ai_voice_v1",voice);}catch(_){}
  status("Next voice playback will use "+voice+".");
});
function status(msg){if($("voiceStatus"))$("voiceStatus").textContent=msg||"";}
function readable(input){
  return String(input||"")
    .replace(/!\[[^\]]*\]\([^)]*\)/g,"")
    .replace(/\[([^\]]{1,180})\]\(https?:\/\/[^)]+\)/g,"$1")
    .replace(/https?:\/\/\S+/g,"")
    .replace(/\x60{1,3}/g,"")
    .replace(/[\\*_#>~|]/g," ")
    .replace(/\p{Extended_Pictographic}/gu,"")
    .replace(/[\uFE0E\uFE0F]/g,"")
    .replace(/\[\d+\]/g,"")
    .replace(/[ \t]{2,}/g," ").trim().slice(0,1300);
}
let player=null,url=null,abort=null,activeButton=null;
function stopSpeech(){
  if(abort){abort.abort();abort=null;}
  if(player){player.pause();player.src="";player=null;}
  if(url){URL.revokeObjectURL(url);url=null;}
  if(activeButton){activeButton.textContent="▶ Listen";activeButton.disabled=false;activeButton.setAttribute("aria-pressed","false");activeButton=null;}
}
async function play(input,button){
  if(button&&button===activeButton){stopSpeech();status("Playback stopped.");return;}
  stopSpeech();
  const text=readable(input);
  if(!text){status("This message has no text to read.");return;}
  activeButton=button||null;
  if(button){button.textContent="■ Stop";button.setAttribute("aria-pressed","true");}
  status("Generating a natural AI voice…");
  abort=new AbortController();
  const signal=abort.signal;
  try{
    const rate=window.AlenazPremiumLab?.voiceRate?.()||1;
    const resp=await fetch("/api/voice/speak",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text,voice,speed:rate}),signal
    });
    if(!resp.ok){const info=await resp.json().catch(()=>({}));throw new Error(info.error||"AI voice unavailable.");}
    const blob=await resp.blob();
    if(signal.aborted)return;
    url=URL.createObjectURL(blob);
    player=new Audio(url);
    player.onended=()=>{stopSpeech();status("");};
    player.onerror=()=>{stopSpeech();status("Could not play AI audio.");};
    await player.play();
    status("Playing AI-generated voice.");
  }catch(err){
    if(!signal.aborted){
      stopSpeech();
      status(err.name==="NotAllowedError"?"Browser blocked playback. Tap Listen again.":err.message||"Voice unavailable.");
    }
  }finally{if(abort?.signal===signal)abort=null;}
}
let recorder=null,stream=null,chunks=[],timer=null,recording=false,busy=false;
function resetMic(){
  recording=false;
  if(timer){clearTimeout(timer);timer=null;}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  const b=$("voiceButton");
  if(b){b.textContent="◉";b.title="Record a voice message";b.setAttribute("aria-label","Record a voice message");b.setAttribute("aria-pressed","false");}
}
function mimeForRecorder(){
  const types=["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/ogg"];
  return types.find(type=>window.MediaRecorder?.isTypeSupported?.(type))||"";
}
async function transcribe(blob,mime){
  const button=$("voiceButton");busy=true;if(button)button.disabled=true;
  status("Transcribing speech…");
  try{
    if(!blob.size)throw Error("No voice was recorded.");
    if(blob.size>2*1024*1024)throw Error("Recording too large. Keep it under 20 seconds.");
    const ext=mime.includes("mp4")?"m4a":mime.includes("ogg")?"ogg":"webm";
    const data=new FormData();
    data.append("audio",blob,"recording."+ext);
    const resp=await fetch("/api/voice/transcribe",{method:"POST",body:data});
    const answer=await resp.json().catch(()=>({}));
    if(!resp.ok)throw Error(answer.error||"Could not transcribe the audio.");
    const transcript=String(answer.text||"").trim();
    if(!transcript)throw Error("No clear speech was detected.");
    const input=$("promptInput");
    if(input){input.value=input.value.trim()?input.value.trim()+"\n"+transcript:transcript;input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();}
    status("Transcript added. Review it and press Send.");
  }catch(err){status(err.message||"Voice transcription failed.");}
  finally{busy=false;if(button)button.disabled=false;resetMic();}
}
function stopRecording(){
  if(recorder?.state!=="recording")return;
  recorder.stop();status("Processing your voice…");
}
async function toggleRecording(){
  if(busy)return;
  if(recording){stopRecording();return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
    status("Microphone recording is unavailable. Try an up-to-date Safari or Chrome browser.");
    return;
  }
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const preferred=mimeForRecorder();
    recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined);
    const mime=(recorder.mimeType||preferred||"audio/webm").split(";")[0];
    chunks=[];
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    recorder.onerror=()=>{resetMic();status("Microphone recording failed.");};
    recorder.onstop=()=>{
      const blob=new Blob(chunks,{type:mime});
      chunks=[];recorder=null;resetMic();void transcribe(blob,mime);
    };
    recorder.start();recording=true;
    const button=$("voiceButton");
    if(button){button.textContent="■";button.title="Stop recording";button.setAttribute("aria-label","Stop recording");button.setAttribute("aria-pressed","true");}
    status("Recording… Tap ■ to stop. Max 20 seconds.");
    timer=setTimeout(stopRecording,20000);
  }catch(_){resetMic();status("Microphone permission unavailable. Check your browser settings.");}
}
window.AlenazVoice={play,stopSpeech,toggleRecording,selected:()=>voice};
})();