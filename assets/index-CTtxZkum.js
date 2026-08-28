(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))a(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function a(i){if(i.ep)return;i.ep=!0;const n=t(i);fetch(i.href,n)}})();const M={grand:{name:"Sodor Grand",oscTypes:["sine","sine","sine","sine","sine","sine","sine"],gains:[.35,.2,.14,.09,.06,.04,.025],detune:[0,1200,1904,2404,2791,3110,3379],decayRates:[1,1.4,2,2.8,3.8,5,6.5],hammerNoise:.08,filterType:"lowpass",filterFreq:5e3,filterEndFreq:1e3,attack:.003,decay:2.5,sustain:.008,release:.6},electric:{name:"Electric Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,1200],attack:.01,decay:1,sustain:.3,release:.5},synth:{name:"Tidmouth Synth",oscTypes:["sawtooth","square"],gains:[.3,.2],detune:[0,5],filterType:"lowpass",filterFreq:1200,filterEndFreq:400,attack:.1,decay:.5,sustain:.5,release:1.2},organ:{name:"Vicarstown Organ",oscTypes:["sine","sine","sine"],gains:[.4,.2,.2],detune:[0,1200,1900],attack:.05,decay:.1,sustain:1,release:.8},whistle:{name:"Steam Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,2],filterType:"highpass",filterFreq:800,attack:.2,decay:.3,sustain:.7,release:.5},bell:{name:"Station Bell",oscTypes:["sine","sine","triangle"],gains:[.4,.3,.2],detune:[0,1200,2400],attack:.002,decay:2,sustain:.01,release:2}},A=class A{constructor(){this.ctx=null,this.masterGainNode=null,this.compressor=null,this._volume=.8,this.activeVoices=[],this.maxPolyphony=32,this._pedalDown=!1,this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this.RES_FREQS=[55,65.41,77.78,92.5,110,130.81,155.56,185,220,261.63,311.13,369.99,440,523.25,622.25,740,880,1046.5,1244.5,1480,1760,2093,2489,2960,3520,4186],this.sampleCache=new Map,this.sampleLoads=new Map}get sampleBase(){return"/SodorPiano/".replace(/\/$/,"")+"/assets/samples/"}loadSample(e,t){const a=this.sampleCache.get(t);if(a)return Promise.resolve(a);const i=this.sampleLoads.get(t);if(i)return i;const n=fetch(this.sampleBase+t).then(o=>{if(!o.ok)throw new Error("HTTP "+o.status);return o.arrayBuffer()}).then(o=>e.decodeAudioData(o)).then(o=>(this.sampleCache.set(t,o),this.sampleLoads.delete(t),o)).catch(o=>{throw this.sampleLoads.delete(t),o});return this.sampleLoads.set(t,n),n}get pedal(){return this._pedalDown}get canResonate(){return this._pedalDown||this.activeVoices.length>0}get volume(){return this._volume}set volume(e){this._volume=Math.max(0,Math.min(1,e)),this.masterGainNode&&this.ctx&&this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime)}initCtx(){return this.ctx||(this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGainNode=this.ctx.createGain(),this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-18,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(4,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGainNode.connect(this.compressor),this.compressor.connect(this.ctx.destination),this.initResonance(this.ctx)),this.ctx.state==="suspended"&&this.ctx.resume(),this.ctx}get output(){return this.masterGainNode}dampVoice(e,t){e.gainNode.gain.cancelScheduledValues(t);const i=Math.max(e.gainNode.gain.value,1e-4);e.gainNode.gain.setValueAtTime(i,t),e.gainNode.gain.exponentialRampToValueAtTime(1e-4,t+.03),e.oscillators.forEach(n=>{try{n.stop(t+.03+.01)}catch{}}),e.sources.forEach(n=>{try{n.stop(t+.03+.01)}catch{}})}dampAll(){if(!this.ctx)return;const e=this.ctx.currentTime;this.activeVoices.forEach(t=>this.dampVoice(t,e)),this.activeVoices=[]}setPedal(e){if(e===this._pedalDown||(this._pedalDown=e,!this.ctx))return;const t=this.ctx.currentTime;if(!e){const a=[...this.activeVoices];this.activeVoices=[],a.forEach(i=>this.dampVoice(i,t))}}initResonance(e){this.resonanceInput||(this.resonanceInput=e.createGain(),this.resonanceOutput=e.createGain(),this.resonanceFeed=e.createGain(),this.resonanceFeed.gain.setValueAtTime(1,e.currentTime),this.resonanceOutput.gain.setValueAtTime(1e-4,e.currentTime),this.resonanceOutput.gain.linearRampToValueAtTime(.0015,e.currentTime+.5),this.resonators=this.RES_FREQS.map(t=>e.createBiquadFilter()),this.resonators.forEach((t,a)=>{const i=this.RES_FREQS[a];t.type="bandpass";const n=30+a/this.RES_FREQS.length*40;t.frequency.setValueAtTime(i,e.currentTime),t.Q.setValueAtTime(n,e.currentTime),t.gain.setValueAtTime(1,e.currentTime),t.connect(this.resonanceOutput)}),this.resonanceInput.connect(this.resonanceFeed),this.resonators.forEach(t=>this.resonanceFeed.connect(t)),this.resonanceOutput.connect(this.masterGainNode))}managePolyphony(e,t){const a=e.currentTime;for(this.activeVoices=this.activeVoices.filter(i=>i.keyIndex===t?(this.dampVoice(i,a),!1):!0),this.activeVoices=this.activeVoices.filter(i=>i.stopTime>a?!0:(this.dampVoice(i,a),!1));this.activeVoices.length>=this.maxPolyphony;){const i=this.activeVoices.shift();this.dampVoice(i,a)}}getFrequency(e){return 27.5*Math.pow(2,e/12)}playNote(e,t="grand",a=1.2,i=.9){const n=this.initCtx();if(this.managePolyphony(n,e),t==="grand"){this.playGrandPiano(n,e,a,i).catch(d=>console.error("[SodorPiano] grand note error:",d));return}const o=M[t],s=n.currentTime,r=this.getFrequency(e),h=!!o.decayRates,c=n.createGain();if(o.filterType){const d=n.createBiquadFilter();d.type=o.filterType,d.frequency.setValueAtTime(o.filterFreq||2e3,s),o.filterEndFreq&&d.frequency.exponentialRampToValueAtTime(o.filterEndFreq,s+o.decay),c.connect(d),d.connect(this.output)}else c.connect(this.output);if(h?(c.gain.setValueAtTime(1,s),c.gain.setValueAtTime(1,s+a),c.gain.exponentialRampToValueAtTime(.001,s+a+o.release)):(c.gain.setValueAtTime(0,s),c.gain.linearRampToValueAtTime(.4,s+o.attack),c.gain.exponentialRampToValueAtTime(o.sustain*.4,s+o.attack+o.decay),c.gain.exponentialRampToValueAtTime(.001,s+a+o.release)),o.hammerNoise&&o.hammerNoise>0){const d=Math.floor(n.sampleRate*.025),u=n.createBuffer(1,d,n.sampleRate),p=u.getChannelData(0);for(let m=0;m<d;m++)p[m]=Math.random()*2-1;const l=n.createBufferSource();l.buffer=u;const f=n.createBiquadFilter();f.type="bandpass",f.frequency.setValueAtTime(Math.min(r*3,8e3),s),f.Q.setValueAtTime(1,s);const y=n.createGain();y.gain.setValueAtTime(o.hammerNoise,s),y.gain.exponentialRampToValueAtTime(.001,s+.04),l.connect(f),f.connect(y),y.connect(c),l.start(s),l.stop(s+.05)}o.oscTypes.forEach((d,u)=>{const p=n.createOscillator(),l=n.createGain();if(p.type=d,p.frequency.setValueAtTime(r,s),o.detune&&o.detune[u]!==void 0&&p.detune.setValueAtTime(o.detune[u],s),h){const f=o.decayRates[u]||1,y=o.gains[u],m=Math.max(1e-4,y*o.sustain);l.gain.setValueAtTime(0,s),l.gain.linearRampToValueAtTime(y,s+o.attack),l.gain.exponentialRampToValueAtTime(m,s+o.attack+o.decay/f),l.gain.exponentialRampToValueAtTime(1e-4,s+a+o.release)}else l.gain.setValueAtTime(o.gains[u],s);p.connect(l),l.connect(c),p.start(s),p.stop(s+a+o.release)})}async playGrandPiano(e,t,a,i=.9){if(!this.ctx||this.ctx.state==="closed")return;const n=this.ctx,o=Math.max(.05,Math.min(1,i)),s=A.GRAND_SAMPLE_MAP[t]||A.GRAND_SAMPLE_MAP[39],r=o>=.75?"f":o>=.4?"m":"p",c=`${s.note.replace("#","s")}_${r}.mp3`;let d;try{d=await this.loadSample(n,c)}catch(x){console.error("[SodorPiano] failed to load sample",c,x),this.playGrandSynthFallback(n,t,a,o);return}const u=n.currentTime,p=n.createBufferSource();p.buffer=d,p.playbackRate.setValueAtTime(s.rate,u);const l=n.createGain(),y=(r==="p"?.7:r==="m"?.85:1)*(.55+.45*o);l.gain.setValueAtTime(0,u),l.gain.linearRampToValueAtTime(y,u+.003);const m=n.createBiquadFilter();m.type="peaking";const v=this.getFrequency(t);if(m.frequency.setValueAtTime(v<200?120:420,u),m.Q.setValueAtTime(.8,u),m.gain.setValueAtTime(v<200?2:1.2,u),p.connect(l),l.connect(m),m.connect(this.output),this.canResonate&&this.resonanceInput){const x=n.createGain();x.gain.setValueAtTime(.18*o,u),x.gain.exponentialRampToValueAtTime(1e-4,u+.2),l.connect(x),x.connect(this.resonanceInput)}const S=d.duration/s.rate,V=a>=2,k=u+(V?S:Math.max(.05,a)),T=Math.min(.8,Math.max(.25,a*.25)),w=k+T;p.start(u),l.gain.exponentialRampToValueAtTime(1e-4,k+T),p.stop(w+.02),this.activeVoices.push({keyIndex:t,gainNode:l,stopTime:w,oscillators:[],sources:[p]})}playGrandSynthFallback(e,t,a,i=.9){const n=e.currentTime,o=this.getFrequency(t),s=e.createGain(),r=Math.max(.05,Math.min(1,i)),h=.5*(.3+.7*r);s.gain.setValueAtTime(0,n),s.gain.linearRampToValueAtTime(h,n+.004),s.gain.exponentialRampToValueAtTime(1e-4,n+a+.3),s.connect(this.output);const c=[],d=[1,2,3,4,5],u=[1,.45,.25,.14,.08];for(let p=0;p<d.length;p++){const l=e.createOscillator(),f=e.createGain();l.type="sine",l.frequency.setValueAtTime(o*d[p]*(1+3e-4*d[p]*d[p]),n),f.gain.setValueAtTime(u[p]*(.3+.7*r),n),f.gain.exponentialRampToValueAtTime(1e-4,n+a+.3),l.connect(f),f.connect(s),l.start(n),l.stop(n+a+.35),c.push(l)}this.activeVoices.push({keyIndex:t,gainNode:s,stopTime:n+a+.35,oscillators:c,sources:[]})}close(){this.ctx&&(this.activeVoices=[],this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this._pedalDown=!1,this.ctx.close(),this.ctx=null,this.compressor=null)}};A.GRAND_SAMPLE_MAP=[{note:"A0",rate:1},{note:"A0",rate:1.059463},{note:"C1",rate:.943874},{note:"C1",rate:1},{note:"C1",rate:1.059463},{note:"D#1",rate:.943874},{note:"D#1",rate:1},{note:"D#1",rate:1.059463},{note:"F#1",rate:.943874},{note:"F#1",rate:1},{note:"F#1",rate:1.059463},{note:"A1",rate:.943874},{note:"A1",rate:1},{note:"A1",rate:1.059463},{note:"C2",rate:.943874},{note:"C2",rate:1},{note:"C2",rate:1.059463},{note:"D#2",rate:.943874},{note:"D#2",rate:1},{note:"D#2",rate:1.059463},{note:"F#2",rate:.943874},{note:"F#2",rate:1},{note:"F#2",rate:1.059463},{note:"A2",rate:.943874},{note:"A2",rate:1},{note:"A2",rate:1.059463},{note:"C3",rate:.943874},{note:"C3",rate:1},{note:"C3",rate:1.059463},{note:"D#3",rate:.943874},{note:"D#3",rate:1},{note:"D#3",rate:1.059463},{note:"F#3",rate:.943874},{note:"F#3",rate:1},{note:"F#3",rate:1.059463},{note:"A3",rate:.943874},{note:"A3",rate:1},{note:"A3",rate:1.059463},{note:"C4",rate:.943874},{note:"C4",rate:1},{note:"C4",rate:1.059463},{note:"D#4",rate:.943874},{note:"D#4",rate:1},{note:"D#4",rate:1.059463},{note:"F#4",rate:.943874},{note:"F#4",rate:1},{note:"F#4",rate:1.059463},{note:"A4",rate:.943874},{note:"A4",rate:1},{note:"A4",rate:1.059463},{note:"C5",rate:.943874},{note:"C5",rate:1},{note:"C5",rate:1.059463},{note:"D#5",rate:.943874},{note:"D#5",rate:1},{note:"D#5",rate:1.059463},{note:"F#5",rate:.943874},{note:"F#5",rate:1},{note:"F#5",rate:1.059463},{note:"A5",rate:.943874},{note:"A5",rate:1},{note:"A5",rate:1.059463},{note:"C6",rate:.943874},{note:"C6",rate:1},{note:"C6",rate:1.059463},{note:"D#6",rate:.943874},{note:"D#6",rate:1},{note:"D#6",rate:1.059463},{note:"F#6",rate:.943874},{note:"F#6",rate:1},{note:"F#6",rate:1.059463},{note:"A6",rate:.943874},{note:"A6",rate:1},{note:"A6",rate:1.059463},{note:"C7",rate:.943874},{note:"C7",rate:1},{note:"C7",rate:1.059463},{note:"D#7",rate:.943874},{note:"D#7",rate:1},{note:"D#7",rate:1.059463},{note:"F#7",rate:.943874},{note:"F#7",rate:1},{note:"F#7",rate:1.059463},{note:"A7",rate:.943874},{note:"A7",rate:1},{note:"A7",rate:1.059463},{note:"C8",rate:.943874},{note:"C8",rate:1}];let P=A;const _=q=>{var c,d;const t=new DOMParser().parseFromString(q,"text/xml"),a=[],i=((c=t.querySelector("work-title"))==null?void 0:c.textContent)||((d=t.querySelector("movement-title"))==null?void 0:d.textContent)||"Imported Melody";let n=120;const o=t.querySelector("sound[tempo]");o&&(n=parseFloat(o.getAttribute("tempo")||"120"));let s=60/n;const r={C:0,D:2,E:4,F:5,G:7,A:9,B:11};return t.querySelectorAll("part").forEach(u=>{let p=0,l=1;u.querySelectorAll("measure").forEach(y=>{var S,V,k,T,w,x;let m=0,v=0;for(const g of Array.from(y.children))if(g.tagName==="attributes"){const b=g.querySelector("divisions");b&&(l=parseInt(b.textContent||"1",10))}else if(g.tagName==="direction"){const b=g.querySelector("sound[tempo]");b&&(s=60/parseFloat(b.getAttribute("tempo")||"120"))}else if(g.tagName==="sound"){const b=g.getAttribute("tempo");b&&(s=60/parseFloat(b))}else if(g.tagName==="forward"){const b=parseInt(((S=g.querySelector("duration"))==null?void 0:S.textContent)||"0",10);m+=b,v=Math.max(v,m)}else if(g.tagName==="backup"){const b=parseInt(((V=g.querySelector("duration"))==null?void 0:V.textContent)||"0",10);m-=b}else if(g.tagName==="note"){const b=g.querySelector("rest")!==null,G=g.querySelector("chord")!==null,R=parseInt(((k=g.querySelector("duration"))==null?void 0:k.textContent)||"0",10),N=(T=g.querySelector("pitch > step"))==null?void 0:T.textContent,B=parseInt(((w=g.querySelector("pitch > octave"))==null?void 0:w.textContent)||"4",10),I=parseInt(((x=g.querySelector("pitch > alter"))==null?void 0:x.textContent)||"0",10),O=g.querySelector('tie[type="stop"]')!==null;if(!b&&N){const C=B*12+r[N]+I-9,D=R/l*s*.8;if(C>=0&&C<88)if(O){const F=[...a].reverse().find(L=>L.keyIndex===C);F&&(F.duration=(F.duration||0)+D)}else a.push({keyIndex:C,time:p+m/l*s,duration:D})}G||(m+=R,v=Math.max(v,m))}p+=v/l*s})}),{id:`imported-${Date.now()}`,title:i,thumbnail:"🎼",notes:a.sort((u,p)=>u.time-p.time)}},$=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];class z{constructor(e){this.soundType="grand",this.activeKeys=new Set,this.isAutoPlaying=!1,this.tempoMultiplier=1,this.stopAutoPlayRequested=!1,this.currentScore=null,this.keyElements=new Map,this.container=e,this.audio=new P,this.render()}setSoundType(e){this.soundType=e,this.updateUI()}setPedal(e){this.audio.setPedal(e)}async loadMusicXml(e){try{return this.currentScore=_(e),this.updateUI(),this.currentScore}catch(t){throw console.error("Failed to parse MusicXML:",t),t}}async playScore(e){const t=e||this.currentScore;if(!(!t||this.isAutoPlaying)){this.isAutoPlaying=!0,this.stopAutoPlayRequested=!1,this.updateUI();for(let a=0;a<t.notes.length&&!this.stopAutoPlayRequested;a++){const i=t.notes[a];this.playNote(i.keyIndex,(i.duration||.8)/this.tempoMultiplier,.75);const n=t.notes[a+1];if(n){const o=(n.time-i.time)*1e3/this.tempoMultiplier;await new Promise(s=>{const r=setInterval(()=>{this.stopAutoPlayRequested&&(clearTimeout(h),clearInterval(r),s())},50),h=setTimeout(()=>{clearInterval(r),s()},o)})}}this.isAutoPlaying=!1,this.audio.dampAll(),this.updateUI()}}stopScore(){this.stopAutoPlayRequested=!0,this.audio.dampAll()}playNote(e,t=2.5,a=.8){this.audio.playNote(e,this.soundType,t,a),this.highlightKey(e)}highlightKey(e){const t=this.keyElements.get(e);t&&(t.classList.contains("sp-black-key"),t.classList.add("sp-active"),setTimeout(()=>t.classList.remove("sp-active"),250))}velocityFromPoint(e,t){const a=(e-t.top)/t.height,i=1-Math.max(0,Math.min(1,a));return Math.max(.06,Math.min(1,i))}render(){this.container.innerHTML=`
      <style>
        .sp-root {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: #020617;
          border-radius: 40px;
          overflow: hidden;
          border: 4px solid #1e293b;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          user-select: none;
          box-sizing: border-box;
        }
        .sp-root *, .sp-root *::before, .sp-root *::after {
          box-sizing: border-box;
        }

        /* Top Console */
        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          background: linear-gradient(to bottom, #0f172a, #020617);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .sp-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .sp-icon {
          width: 40px;
          height: 40px;
          background: #db2777;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          transition: background 0.3s;
        }
        .sp-icon.sp-playing {
          background: #10b981;
          animation: sp-pulse 2s infinite;
        }
        @keyframes sp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .sp-icon svg {
          width: 24px;
          height: 24px;
        }
        .sp-title {
          font-size: 22px;
          font-weight: 900;
          color: white;
          line-height: 1.1;
        }
        .sp-subtitle {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          margin-top: 4px;
        }
        .sp-controls-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          margin-top: 8px;
        }
        .sp-sound-btns {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sp-sound-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .sp-sound-btn:hover {
          background: #334155;
          color: #e2e8f0;
        }
        .sp-sound-btn.sp-selected {
          background: #db2777;
          color: white;
          border-color: #f472b6;
          box-shadow: 0 0 15px rgba(236,72,153,0.4);
        }
        .sp-action-group {
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 1px solid rgba(255,255,255,0.1);
          padding-left: 16px;
        }
        .sp-btn {
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .sp-btn svg { width: 12px; height: 12px; }
        .sp-btn-import {
          background: #1e293b;
          color: #cbd5e1;
        }
        .sp-btn-import:hover { background: #334155; }
        .sp-btn-play {
          background: #059669;
          color: white;
          box-shadow: 0 4px 6px rgba(5,150,105,0.2);
        }
        .sp-btn-play:hover { background: #10b981; }
        .sp-btn-stop {
          background: #dc2626;
          color: white;
          box-shadow: 0 4px 6px rgba(220,38,38,0.2);
        }
        .sp-btn-stop:hover { background: #ef4444; }
        .sp-btn-pedal {
          background: #1e293b;
          color: #cbd5e1;
        }
        .sp-btn-pedal:hover { background: #334155; }
        .sp-btn-pedal.sp-pedal-on {
          background: #34d399;
          color: #052e16;
          box-shadow: 0 0 15px rgba(52,211,153,0.5);
        }
        .sp-btn-exit {
          padding: 8px 24px;
          background: #1e293b;
          color: white;
          font-weight: 900;
          border-radius: 8px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sp-btn-exit:hover { background: #7f1d1d; }
        .sp-btn-exit svg { width: 16px; height: 16px; }

        .sp-knob-group {
          display: flex;
          align-items: center;
          gap: 6px;
          border-left: 1px solid rgba(255,255,255,0.1);
          padding-left: 16px;
        }
        .sp-knob-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          min-width: 32px;
        }
        .sp-knob-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          line-height: 1;
          padding: 0;
        }
        .sp-knob-btn:hover {
          background: #334155;
          color: #e2e8f0;
        }
        .sp-knob-value {
          font-size: 11px;
          font-weight: 700;
          color: #e2e8f0;
          min-width: 36px;
          text-align: center;
        }

        /* Piano Bed */
        .sp-piano-bed {
          flex: 1;
          background: #0f172a;
          padding: 8px 24px 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .sp-keys-frame {
          width: 100%;
          aspect-ratio: 52/9;
          background: #1e293b;
          border-radius: 12px;
          padding: 4px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .sp-keys-inner {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .sp-white-keys {
          display: flex;
          height: 100%;
        }
        .sp-white-key {
          flex: 1;
          position: relative;
          border-radius: 0 0 6px 6px;
          border-left: 1px solid rgba(148,163,184,0.6);
          border-right: 1px solid rgba(148,163,184,0.6);
          cursor: pointer;
          background: #f8f8f2;
          box-shadow: inset 0 -3px 4px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.1);
          transition: background 0.08s;
        }
        .sp-white-key:hover { background: #f0f0ea; }
        .sp-white-key:active { background: #e8e8e0; }
        .sp-white-key.sp-active {
          background: #fce7f3;
          box-shadow: inset 0 -2px 3px rgba(219,39,119,0.15), 0 2px 4px rgba(0,0,0,0.1);
        }
        .sp-key-label {
          position: absolute;
          bottom: 8px;
          left: 0;
          width: 100%;
          text-align: center;
          pointer-events: none;
          opacity: 0.4;
          font-size: 7px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sp-black-key {
          position: absolute;
          top: 0;
          height: 62%;
          border-radius: 0 0 4px 4px;
          cursor: pointer;
          z-index: 2;
          background: linear-gradient(to bottom, #333, #222, #111);
          box-shadow: 2px 5px 8px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,255,255,0.05);
          transition: background 0.08s;
        }
        .sp-black-key:hover {
          background: linear-gradient(to bottom, #3a3a3a, #2a2a2a, #1a1a1a);
        }
        .sp-black-key:active {
          background: linear-gradient(to bottom, #2a2a2a, #1a1a1a, #0a0a0a);
        }
        .sp-black-key.sp-active {
          background: linear-gradient(to bottom, #f472b6, #ec4899, #be185d);
          box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 0 15px rgba(236,72,153,0.8);
        }

        /* Bottom Status Bar */
        .sp-footer {
          padding: 24px;
          background: rgba(2,6,23,0.8);
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 48px;
        }
        .sp-status-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sp-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: sp-pulse 2s infinite;
        }
        .sp-status-dot.sp-green { background: #10b981; }
        .sp-status-dot.sp-blue { background: #3b82f6; }
        .sp-status-dot.sp-pink { background: #ec4899; }
        .sp-status-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        @media (max-width: 768px) {
          .sp-header { padding: 12px; flex-wrap: wrap; gap: 8px; }
          .sp-title { font-size: 16px; }
          .sp-piano-bed { padding: 4px 8px 8px; }
          .sp-footer { padding: 12px; gap: 24px; }
          .sp-action-group, .sp-knob-group { border-left: none; padding-left: 0; }
        }
      </style>
      <div class="sp-root">
        <div class="sp-header">
          <div class="sp-header-left">
            <div class="sp-icon" id="sp-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div>
              <div class="sp-title" id="sp-title">SODOR PIANO STUDIO</div>
              <div class="sp-subtitle" id="sp-subtitle">Integrated Synthesis System</div>
              <div class="sp-controls-row">
                <div class="sp-sound-btns" id="sp-sound-selector"></div>
                <div class="sp-knob-group">
                  <span class="sp-knob-label">Vol</span>
                  <button class="sp-knob-btn" id="sp-vol-down">&minus;</button>
                  <span class="sp-knob-value" id="sp-vol-value">80%</span>
                  <button class="sp-knob-btn" id="sp-vol-up">+</button>
                </div>
                <div class="sp-knob-group">
                  <span class="sp-knob-label">Tempo</span>
                  <button class="sp-knob-btn" id="sp-tempo-down">&minus;</button>
                  <span class="sp-knob-value" id="sp-tempo-value">1.0&times;</span>
                  <button class="sp-knob-btn" id="sp-tempo-up">+</button>
                </div>
                <div class="sp-action-group">
                  <input type="file" id="sp-xml-import" style="display:none" accept=".musicxml,.xml">
                  <button class="sp-btn sp-btn-pedal" id="sp-pedal-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 10h16"/><path d="M6 10v6h4v-6"/><circle cx="18" cy="13" r="3"/><circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                    Pedal
                  </button>
                  <button class="sp-btn sp-btn-import" id="sp-import-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import XML
                  </button>
                  <button class="sp-btn sp-btn-play" id="sp-play-btn" style="display:none">
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Play Song
                  </button>
                  <button class="sp-btn sp-btn-stop" id="sp-stop-btn" style="display:none">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Stop
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sp-piano-bed">
          <div class="sp-keys-frame">
            <div class="sp-keys-inner" id="sp-keys-bed">
              <div class="sp-white-keys" id="sp-white-keys"></div>
            </div>
          </div>
        </div>

        <div class="sp-footer">
          <div class="sp-status-item">
            <div class="sp-status-dot sp-green"></div>
            <span class="sp-status-label">A0 Range Limit</span>
          </div>
          <div class="sp-status-item">
            <div class="sp-status-dot sp-blue"></div>
            <span class="sp-status-label">Multi-Touch Ready</span>
          </div>
          <div class="sp-status-item">
            <div class="sp-status-dot sp-pink"></div>
            <span class="sp-status-label">C8 Range Limit</span>
          </div>
        </div>
      </div>
    `,this.setupEvents(),this.renderKeys(),this.renderSoundSelector()}setupEvents(){const e=this.container.querySelector("#sp-import-btn"),t=this.container.querySelector("#sp-xml-import"),a=this.container.querySelector("#sp-play-btn"),i=this.container.querySelector("#sp-stop-btn");e.onclick=()=>t.click(),t.onchange=c=>{const d=c.target.files[0];if(!d)return;const u=new FileReader;u.onload=async p=>{var f;const l=(f=p.target)==null?void 0:f.result;await this.loadMusicXml(l)},u.readAsText(d)},a.onclick=()=>this.playScore(),i.onclick=()=>this.stopScore();const n=this.container.querySelector("#sp-pedal-btn");n.onclick=()=>{const c=!this.audio.pedal;this.audio.setPedal(c),n.classList.toggle("sp-pedal-on",c),n.setAttribute("aria-pressed",String(c))};const o=this.container.querySelector("#sp-vol-down"),s=this.container.querySelector("#sp-vol-up"),r=this.container.querySelector("#sp-tempo-down"),h=this.container.querySelector("#sp-tempo-up");o.onclick=()=>{this.audio.volume=Math.round((this.audio.volume-.1)*10)/10,this.updateUI()},s.onclick=()=>{this.audio.volume=Math.round((this.audio.volume+.1)*10)/10,this.updateUI()},r.onclick=()=>{this.tempoMultiplier=Math.max(.25,Math.round((this.tempoMultiplier-.25)*4)/4),this.updateUI()},h.onclick=()=>{this.tempoMultiplier=Math.min(2,Math.round((this.tempoMultiplier+.25)*4)/4),this.updateUI()}}renderKeys(){const e=this.container.querySelector("#sp-white-keys"),t=this.container.querySelector("#sp-keys-bed");e.innerHTML="",this.keyElements.clear();let a=0;const i=[],n=[];for(let s=0;s<88;s++){const r=(s+9)%12,h=$[r],c=Math.floor((s+9)/12);h.includes("#")?n.push({i:s,noteName:h,octave:c,whiteBefore:a}):(i.push({i:s,noteName:h,octave:c}),a++)}i.forEach(s=>{const r=document.createElement("div");if(r.className="sp-white-key",r.onmousedown=h=>this.playNote(s.i,2.5,this.velocityFromPoint(h.clientY,r.getBoundingClientRect())),r.ontouchstart=h=>{h.preventDefault(),this.playNote(s.i,2.5,this.velocityFromPoint(h.touches[0].clientY,r.getBoundingClientRect()))},s.noteName==="C"||s.i===0||s.i===87){const h=document.createElement("div");h.className="sp-key-label",h.textContent=`${s.noteName}${s.octave}`,r.appendChild(h)}e.appendChild(r),this.keyElements.set(s.i,r)});const o=1/52*100*.6;n.forEach(s=>{const r=document.createElement("div");r.className="sp-black-key";const h=s.whiteBefore/52*100;r.style.left=`${h-o/2}%`,r.style.width=`${o}%`,r.onmousedown=c=>this.playNote(s.i,2.5,this.velocityFromPoint(c.clientY,r.getBoundingClientRect())),r.ontouchstart=c=>{c.preventDefault(),this.playNote(s.i,2.5,this.velocityFromPoint(c.touches[0].clientY,r.getBoundingClientRect()))},t.appendChild(r),this.keyElements.set(s.i,r)})}renderSoundSelector(){const e=this.container.querySelector("#sp-sound-selector"),t=Object.keys(M);e.innerHTML=t.map(a=>`<button class="sp-sound-btn ${this.soundType===a?"sp-selected":""}" data-type="${a}">${M[a].name}</button>`).join(""),e.querySelectorAll("button").forEach(a=>{a.onclick=()=>this.setSoundType(a.getAttribute("data-type"))})}updateUI(){const e=this.container.querySelector("#sp-play-btn"),t=this.container.querySelector("#sp-stop-btn"),a=this.container.querySelector("#sp-title"),i=this.container.querySelector("#sp-subtitle"),n=this.container.querySelector("#sp-icon");this.isAutoPlaying?(n.classList.add("sp-playing"),i.textContent="Automated Performance System"):(n.classList.remove("sp-playing"),i.textContent="Integrated Synthesis System"),this.currentScore&&(e.style.display=this.isAutoPlaying?"none":"flex",t.style.display=this.isAutoPlaying?"flex":"none",a.textContent=this.isAutoPlaying?`PLAYING: ${this.currentScore.title}`:`SCORE: ${this.currentScore.title}`);const o=this.container.querySelector("#sp-vol-value"),s=this.container.querySelector("#sp-tempo-value");o&&(o.textContent=`${Math.round(this.audio.volume*100)}%`),s&&(s.textContent=`${this.tempoMultiplier.toFixed(2).replace(/0$/,"")}×`),this.renderSoundSelector()}}const E=document.getElementById("piano-container");E&&new z(E);
