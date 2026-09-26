(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(n){if(n.ep)return;n.ep=!0;const i=e(n);fetch(n.href,i)}})();const At="modulepreload",Tt=function(c){return"/SodorPiano/"+c},Q={},Mt=function(t,e,s){let n=Promise.resolve();if(e&&e.length>0){let o=function(l){return Promise.all(l.map(a=>Promise.resolve(a).then(m=>({status:"fulfilled",value:m}),m=>({status:"rejected",reason:m}))))};document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),p=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));n=o(e.map(l=>{if(l=Tt(l),l in Q)return;Q[l]=!0;const a=l.endsWith(".css"),m=a?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${m}`))return;const u=document.createElement("link");if(u.rel=a?"stylesheet":At,a||(u.as="script"),u.crossOrigin="",u.href=l,p&&u.setAttribute("nonce",p),document.head.appendChild(u),a)return new Promise((d,y)=>{u.addEventListener("load",d),u.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${l}`)))})}))}function i(o){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=o,window.dispatchEvent(r),!r.defaultPrevented)throw o}return n.then(o=>{for(const r of o||[])r.status==="rejected"&&i(r.reason);return t().catch(i)})},K={grand:{name:"Sodor Grand",oscTypes:["sine","sine","sine","sine","sine","sine","sine"],gains:[.35,.2,.14,.09,.06,.04,.025],detune:[0,1200,1904,2404,2791,3110,3379],decayRates:[1,1.4,2,2.8,3.8,5,6.5],hammerNoise:.08,filterType:"lowpass",filterFreq:5e3,filterEndFreq:1e3,attack:.003,decay:2.5,sustain:.008,release:.6},electric:{name:"Electric Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,1200],attack:.01,decay:1,sustain:.3,release:.5},synth:{name:"Tidmouth Synth",oscTypes:["sawtooth","square"],gains:[.3,.2],detune:[0,5],filterType:"lowpass",filterFreq:1200,filterEndFreq:400,attack:.1,decay:.5,sustain:.5,release:1.2},organ:{name:"Vicarstown Organ",oscTypes:["sine","sine","sine"],gains:[.4,.2,.2],detune:[0,1200,1900],attack:.05,decay:.1,sustain:1,release:.8},whistle:{name:"Steam Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,2],filterType:"highpass",filterFreq:800,attack:.2,decay:.3,sustain:.7,release:.5},bell:{name:"Station Bell",oscTypes:["sine","sine","triangle"],gains:[.4,.3,.2],detune:[0,1200,2400],attack:.002,decay:2,sustain:.01,release:2}},H=1e-4,Et=69,Nt=c=>c<24?.15:c<48?.09:.06,Ct=[{name:"p",below:.42,reference:.3},{name:"m",below:.72,reference:.57},{name:"f",below:1/0,reference:.85}],U=class U{constructor(){this.ctx=null,this.masterGainNode=null,this.compressor=null,this.reverb=null,this._volume=.8,this.activeVoices=[],this.maxPolyphony=64,this._pedalDown=!1,this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this.RES_FREQS=[55,65.41,77.78,92.5,110,130.81,155.56,185,220,261.63,311.13,369.99,440,523.25,622.25,740,880,1046.5,1244.5,1480,1760,2093,2489,2960,3520,4186],this.sampleCache=new Map,this.sampleLoads=new Map}get sampleBase(){return"/SodorPiano/".replace(/\/$/,"")+"/assets/samples/"}loadSample(t,e){const s=this.sampleCache.get(e);if(s)return Promise.resolve(s);const n=this.sampleLoads.get(e);if(n)return n;const i=fetch(this.sampleBase+e).then(o=>{if(!o.ok)throw new Error("HTTP "+o.status);return o.arrayBuffer()}).then(o=>t.decodeAudioData(o)).then(o=>(this.sampleCache.set(e,o),this.sampleLoads.delete(e),o)).catch(o=>{throw this.sampleLoads.delete(e),o});return this.sampleLoads.set(e,i),i}get pedal(){return this._pedalDown}get canResonate(){return this._pedalDown||this.activeVoices.length>0}get volume(){return this._volume}set volume(t){this._volume=Math.max(0,Math.min(1,t)),this.masterGainNode&&this.ctx&&this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime)}initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGainNode=this.ctx.createGain(),this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-18,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(4,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGainNode.connect(this.compressor),this.compressor.connect(this.ctx.destination),this.reverb=this.ctx.createConvolver(),this.reverb.buffer=Vt(this.ctx);const t=this.ctx.createGain();t.gain.setValueAtTime(.5,this.ctx.currentTime),this.masterGainNode.connect(this.reverb),this.reverb.connect(t),t.connect(this.compressor),this.initResonance(this.ctx)}return this.ctx.state==="suspended"&&this.ctx.resume(),this.ctx}get output(){return this.masterGainNode}get currentTime(){return this.initCtx().currentTime}async preloadGrand(t){const e=this.initCtx(),s=new Set(t.map(n=>this.grandSample(n.keyIndex,n.velocity??.8).file));await Promise.allSettled([...s].map(n=>this.loadSample(e,n)))}dampVoice(t,e,s=.012){if(t.damper){if(e<t.startTime){t.damper.disconnect(),t.stopTime=e;return}const o=e+s*9,r=t.damping;if(r&&r.at<=e&&r.end<=o)return;const p=!r||e<=r.at?1:e>=r.end?H:r.from*Math.pow(H/r.from,(e-r.at)/(r.end-r.at));t.damper.gain.cancelScheduledValues(e),t.damper.gain.setValueAtTime(p,e),t.damper.gain.exponentialRampToValueAtTime(H,o),t.damping={from:p,at:e,end:o},t.stopScheduled||(t.sources.forEach(l=>{try{l.stop(o)}catch{}}),t.stopScheduled=!0),t.stopTime=Math.min(t.stopTime,o);return}const n=.03;t.gainNode.gain.cancelScheduledValues(e);const i=Math.max(t.gainNode.gain.value,1e-4);t.gainNode.gain.setValueAtTime(i,e),t.gainNode.gain.exponentialRampToValueAtTime(1e-4,e+n),t.oscillators.forEach(o=>{try{o.stop(e+n+.01)}catch{}}),t.sources.forEach(o=>{try{o.stop(e+n+.01)}catch{}})}dampAll(){if(!this.ctx)return;const t=this.ctx.currentTime;this.activeVoices.forEach(e=>this.dampVoice(e,t)),this.activeVoices=[]}setPedal(t){if(t===this._pedalDown||(this._pedalDown=t,!this.ctx))return;const e=this.ctx.currentTime;if(!t){const s=[...this.activeVoices];this.activeVoices=[],s.forEach(n=>this.dampVoice(n,e))}}initResonance(t){this.resonanceInput||(this.resonanceInput=t.createGain(),this.resonanceOutput=t.createGain(),this.resonanceFeed=t.createGain(),this.resonanceFeed.gain.setValueAtTime(1,t.currentTime),this.resonanceOutput.gain.setValueAtTime(1e-4,t.currentTime),this.resonanceOutput.gain.linearRampToValueAtTime(.0015,t.currentTime+.5),this.resonators=this.RES_FREQS.map(e=>t.createBiquadFilter()),this.resonators.forEach((e,s)=>{const n=this.RES_FREQS[s];e.type="bandpass";const i=30+s/this.RES_FREQS.length*40;e.frequency.setValueAtTime(n,t.currentTime),e.Q.setValueAtTime(i,t.currentTime),e.gain.setValueAtTime(1,t.currentTime),e.connect(this.resonanceOutput)}),this.resonanceInput.connect(this.resonanceFeed),this.resonators.forEach(e=>this.resonanceFeed.connect(e)),this.resonanceOutput.connect(this.masterGainNode))}managePolyphony(t,e,s=t.currentTime){for(this.activeVoices=this.activeVoices.filter(n=>n.keyIndex===e&&n.startTime<=s?(this.dampVoice(n,s,.04),!1):!0),this.activeVoices=this.activeVoices.filter(n=>n.stopTime>s);this.activeVoices.length>=this.maxPolyphony;){const n=this.activeVoices.shift();this.dampVoice(n,s,.03)}}getFrequency(t){return 27.5*Math.pow(2,t/12)}playNote(t,e="grand",s=1.2,n=.9,i){const o=this.initCtx(),r=Math.max(i??0,o.currentTime);if(this.managePolyphony(o,t,r),e==="grand"){const y=i===void 0&&s>=2;this.playGrandPiano(o,t,s,n,r,y).catch(v=>console.error("[SodorPiano] grand note error:",v));return}const p=K[e],l=r,a=this.getFrequency(t),m=!!p.decayRates,u=o.createGain();if(p.filterType){const y=o.createBiquadFilter();y.type=p.filterType,y.frequency.setValueAtTime(p.filterFreq||2e3,l),p.filterEndFreq&&y.frequency.exponentialRampToValueAtTime(p.filterEndFreq,l+p.decay),u.connect(y),y.connect(this.output)}else u.connect(this.output);if(m?(u.gain.setValueAtTime(1,l),u.gain.setValueAtTime(1,l+s),u.gain.exponentialRampToValueAtTime(.001,l+s+p.release)):(u.gain.setValueAtTime(0,l),u.gain.linearRampToValueAtTime(.4,l+p.attack),u.gain.exponentialRampToValueAtTime(p.sustain*.4,l+p.attack+p.decay),u.gain.exponentialRampToValueAtTime(.001,l+s+p.release)),p.hammerNoise&&p.hammerNoise>0){const y=Math.floor(o.sampleRate*.025),v=o.createBuffer(1,y,o.sampleRate),S=v.getChannelData(0);for(let M=0;M<y;M++)S[M]=Math.random()*2-1;const x=o.createBufferSource();x.buffer=v;const b=o.createBiquadFilter();b.type="bandpass",b.frequency.setValueAtTime(Math.min(a*3,8e3),l),b.Q.setValueAtTime(1,l);const k=o.createGain();k.gain.setValueAtTime(p.hammerNoise,l),k.gain.exponentialRampToValueAtTime(.001,l+.04),x.connect(b),b.connect(k),k.connect(u),x.start(l),x.stop(l+.05)}const d=[];p.oscTypes.forEach((y,v)=>{const S=o.createOscillator(),x=o.createGain();if(S.type=y,S.frequency.setValueAtTime(a,l),p.detune&&p.detune[v]!==void 0&&S.detune.setValueAtTime(p.detune[v],l),m){const b=p.decayRates[v]||1,k=p.gains[v],M=Math.max(1e-4,k*p.sustain);x.gain.setValueAtTime(0,l),x.gain.linearRampToValueAtTime(k,l+p.attack),x.gain.exponentialRampToValueAtTime(M,l+p.attack+p.decay/b),x.gain.exponentialRampToValueAtTime(1e-4,l+s+p.release)}else x.gain.setValueAtTime(p.gains[v],l);S.connect(x),x.connect(u),S.start(l),S.stop(l+s+p.release),d.push(S)}),this.activeVoices.push({keyIndex:t,gainNode:u,startTime:l,stopTime:l+s+p.release,oscillators:d,sources:[]})}grandSample(t,e){const s=U.GRAND_SAMPLE_MAP[t]||U.GRAND_SAMPLE_MAP[39],n=Ct.find(o=>e<o.below);return{file:`${s.note.replace("#","s")}_${n.name}.mp3`,rate:s.rate,layer:n}}async playGrandPiano(t,e,s,n,i,o){if(!this.ctx||this.ctx.state==="closed")return;const r=this.ctx,p=Math.max(.05,Math.min(1,n)),{file:l,rate:a,layer:m}=this.grandSample(e,p);let u;try{u=await this.loadSample(r,l)}catch(f){console.error("[SodorPiano] failed to load sample",l,f),this.playGrandSynthFallback(r,e,s,p);return}const d=Math.max(i,r.currentTime),y=r.createBufferSource();y.buffer=u,y.playbackRate.setValueAtTime(a,d);const v=r.createGain(),S=.9*Math.min(1.4,Math.max(.5,p/m.reference));v.gain.setValueAtTime(0,d),v.gain.linearRampToValueAtTime(S,d+.003);const x=r.createGain();x.gain.setValueAtTime(1,d);const b=r.createBiquadFilter();b.type="peaking";const k=this.getFrequency(e);if(b.frequency.setValueAtTime(k<200?120:420,d),b.Q.setValueAtTime(.8,d),b.gain.setValueAtTime(k<200?2:1.2,d),y.connect(v),v.connect(x),x.connect(b),b.connect(this.output),this.canResonate&&this.resonanceInput){const f=r.createGain();f.gain.setValueAtTime(.18*p,d),f.gain.exponentialRampToValueAtTime(1e-4,d+.2),v.connect(f),f.connect(this.resonanceInput)}const M=d+u.duration/a,g={keyIndex:e,gainNode:v,damper:x,startTime:d,stopTime:M,oscillators:[],sources:[y]};y.start(d),!o&&e<Et&&this.dampVoice(g,d+Math.max(.03,s),Nt(e)),this.activeVoices.push(g)}playGrandSynthFallback(t,e,s,n=.9){const i=t.currentTime,o=this.getFrequency(e),r=t.createGain(),p=Math.max(.05,Math.min(1,n)),l=.5*(.3+.7*p);r.gain.setValueAtTime(0,i),r.gain.linearRampToValueAtTime(l,i+.004),r.gain.exponentialRampToValueAtTime(1e-4,i+s+.3),r.connect(this.output);const a=[],m=[1,2,3,4,5],u=[1,.45,.25,.14,.08];for(let d=0;d<m.length;d++){const y=t.createOscillator(),v=t.createGain();y.type="sine",y.frequency.setValueAtTime(o*m[d]*(1+3e-4*m[d]*m[d]),i),v.gain.setValueAtTime(u[d]*(.3+.7*p),i),v.gain.exponentialRampToValueAtTime(1e-4,i+s+.3),y.connect(v),v.connect(r),y.start(i),y.stop(i+s+.35),a.push(y)}this.activeVoices.push({keyIndex:e,gainNode:r,startTime:i,stopTime:i+s+.35,oscillators:a,sources:[]})}close(){this.ctx&&(this.activeVoices=[],this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this._pedalDown=!1,this.ctx.close(),this.ctx=null,this.compressor=null,this.reverb=null)}};U.GRAND_SAMPLE_MAP=[{note:"A0",rate:1},{note:"A0",rate:1.059463},{note:"C1",rate:.943874},{note:"C1",rate:1},{note:"C1",rate:1.059463},{note:"D#1",rate:.943874},{note:"D#1",rate:1},{note:"D#1",rate:1.059463},{note:"F#1",rate:.943874},{note:"F#1",rate:1},{note:"F#1",rate:1.059463},{note:"A1",rate:.943874},{note:"A1",rate:1},{note:"A1",rate:1.059463},{note:"C2",rate:.943874},{note:"C2",rate:1},{note:"C2",rate:1.059463},{note:"D#2",rate:.943874},{note:"D#2",rate:1},{note:"D#2",rate:1.059463},{note:"F#2",rate:.943874},{note:"F#2",rate:1},{note:"F#2",rate:1.059463},{note:"A2",rate:.943874},{note:"A2",rate:1},{note:"A2",rate:1.059463},{note:"C3",rate:.943874},{note:"C3",rate:1},{note:"C3",rate:1.059463},{note:"D#3",rate:.943874},{note:"D#3",rate:1},{note:"D#3",rate:1.059463},{note:"F#3",rate:.943874},{note:"F#3",rate:1},{note:"F#3",rate:1.059463},{note:"A3",rate:.943874},{note:"A3",rate:1},{note:"A3",rate:1.059463},{note:"C4",rate:.943874},{note:"C4",rate:1},{note:"C4",rate:1.059463},{note:"D#4",rate:.943874},{note:"D#4",rate:1},{note:"D#4",rate:1.059463},{note:"F#4",rate:.943874},{note:"F#4",rate:1},{note:"F#4",rate:1.059463},{note:"A4",rate:.943874},{note:"A4",rate:1},{note:"A4",rate:1.059463},{note:"C5",rate:.943874},{note:"C5",rate:1},{note:"C5",rate:1.059463},{note:"D#5",rate:.943874},{note:"D#5",rate:1},{note:"D#5",rate:1.059463},{note:"F#5",rate:.943874},{note:"F#5",rate:1},{note:"F#5",rate:1.059463},{note:"A5",rate:.943874},{note:"A5",rate:1},{note:"A5",rate:1.059463},{note:"C6",rate:.943874},{note:"C6",rate:1},{note:"C6",rate:1.059463},{note:"D#6",rate:.943874},{note:"D#6",rate:1},{note:"D#6",rate:1.059463},{note:"F#6",rate:.943874},{note:"F#6",rate:1},{note:"F#6",rate:1.059463},{note:"A6",rate:.943874},{note:"A6",rate:1},{note:"A6",rate:1.059463},{note:"C7",rate:.943874},{note:"C7",rate:1},{note:"C7",rate:1.059463},{note:"D#7",rate:.943874},{note:"D#7",rate:1},{note:"D#7",rate:1.059463},{note:"F#7",rate:.943874},{note:"F#7",rate:1},{note:"F#7",rate:1.059463},{note:"A7",rate:.943874},{note:"A7",rate:1},{note:"A7",rate:1.059463},{note:"C8",rate:.943874},{note:"C8",rate:1}];let W=U;function Vt(c){const e=Math.floor(.012*c.sampleRate),s=Math.floor(1.6*c.sampleRate),n=c.createBuffer(2,s,c.sampleRate);for(let i=0;i<2;i++){const o=n.getChannelData(i);let r=0;for(let p=e;p<s;p++){const l=(p-e)/c.sampleRate,a=.25+.7*Math.min(1,l/1.6);r=a*r+(1-a)*(Math.random()*2-1),o[p]=r*Math.exp(-6.9*l/1.6)}}return n}const ft=()=>({length:0,notes:[],tempos:[],dynamics:[],hairpins:[],pedals:[]}),mt=()=>({forward:!1,backward:0,voltas:[],markers:[],jump:null,sectionEnd:!1}),Pt=80/127,Rt=120,gt=2e4,V=1e-6,Z={pppppp:1,ppppp:5,pppp:10,ppp:16,pp:33,p:49,mp:64,mf:80,f:96,ff:112,fff:126,ffff:127,fffff:127,ffffff:127},J={sf:[112,void 0],sfz:[112,void 0],sffz:[126,void 0],fz:[112,void 0],rf:[112,void 0],rfz:[112,void 0],fp:[96,49],sfp:[112,49],sfpp:[112,33],pf:[49,96]};function yt(c,t,e){const s=c.toLowerCase();if(s in Z)return{offset:t,velocity:(e??Z[s])/127};if(s in J){const[n,i]=J[s];return{offset:t,velocity:(e??n)/127,momentary:!0,after:i===void 0?void 0:i/127}}return null}function Ft(c){const t=[];let e=0;return c.forEach((s,n)=>{(s.sectionEnd||n===c.length-1)&&(t.push(...qt(c,e,n+1)),e=n+1)}),t.slice(0,gt)}function qt(c,t,e){const s=[],n=It(c,t,e),i=n.map((g,f)=>Bt(n,f)),o=Lt(n),r=new Map,p=new Set,l=Dt(c,t,e);let a=[{start:t,pass:1,done:!1}];const m=()=>a[a.length-1];let u=t;const d=new Map;o.forEach((g,f)=>{g&&!d.has(g)&&c[t+f].backward>0&&d.set(g,l.get(t+f).start)});const y=o.map(g=>d.has(g)?d.get(g):void 0),v=g=>{const f=y[g-t];if(f===void 0)return m().pass;const h=f??u;for(let w=a.length-1;w>=0;w--)if(a[w].start===h)return a[w].pass;return m().pass};let S=null;const x=g=>{const f=[];for(let h=t;h<e;h++)c[h].markers.includes(g)&&f.push(h);return f},b=g=>c.slice(g,e).some(f=>f.backward>0),k=(g,f)=>n[g-t].every(h=>h.includes(f)),M=g=>{let f=0;for(let w=g;w<e&&(w===g||!c[w].forward);w++){const T=c[w].backward;T>0&&(f+=Math.max(0,T-1-(r.get(w)??0)))}const h=m().pass;for(let w=h+1;w<=h+f;w++)if(k(g,w))return!0;return!1};for(let g=t;g<e&&s.length<gt;){const f=c[g],h=!S||S.playRepeats||g>S.from,T=!h||S&&!S.playRepeats&&o[g-t]>0&&o[g-t]===o[S.from-t]?i[g-t]:v(g);if(h&&f.forward&&m().start!==g&&k(g,T)){for(;a.length>1&&m().done;)a.pop();a.push({start:g,pass:1,done:!1})}if(!k(g,T)){if(!h||b(g)){g++;continue}let P=g+1;for(;P<e&&!(n[P-t].length&&k(P,T));)P++;g=P;continue}if(s.push(g),S&&S.until===g&&!(h&&M(g))){if(S.coda===null)break;g=S.coda,S=null,u=g,a=[{start:g,pass:1,done:!1}];continue}const C=f.jump;if(C&&!p.has(g)&&!(h&&M(g))){p.add(g);const P=x(C.to),F=C.to==="start"?t:P.filter(I=>I<=g).pop()??P[0]??null;if(F!==null){const I=C.until==="end"?[]:x(C.until),L=I.find(q=>q>=F)??I[0]??null,X=C.continueAt?x(C.continueAt):[];if(S={from:g,until:L,coda:L===null?null:X.find(q=>q>g)??X[0]??null,playRepeats:C.playRepeats},C.playRepeats&&r.clear(),g=F,u=C.playRepeats?t:F,a=[{start:u,pass:1,done:!1}],C.playRepeats){let q=F;for(;q>t&&!c[q].forward;)q--;c[q].forward&&a.push({start:q,pass:1,done:!1})}continue}}if(h&&f.backward>0){const P=l.get(g),F=P.start??u;let I=a.map(L=>L.start).lastIndexOf(F);if(I<0&&(a.push({start:F,pass:1,done:!1}),I=a.length-1),a=a.slice(0,I+1),(r.get(g)??0)<f.backward-1){if(r.set(g,(r.get(g)??0)+1),m().pass++,m().done=!1,P.nested)for(let L=F+1;L<g;L++)r.delete(L);g=F;continue}m().done=!0}g++}return s}function Dt(c,t,e){const s=new Map,n=[];let i=null;for(let o=t;o<e;o++)if(c[o].forward&&(n.push(o),i=o),c[o].backward>0){const r=n.pop();s.set(o,r!==void 0?{start:r,nested:!0}:{start:i,nested:!1})}return s}function It(c,t,e){const s=Array.from({length:e-t},()=>[]);for(let n=t;n<e;n++)for(const i of c[n].voltas){let o=Math.min(e,n+Math.max(1,i.length));if(i.open&&!c[n].forward){for(let r=n;r<e&&!(r>n&&(c[r].voltas.length||c[r].forward));r++)if(c[r].backward>0){o=Math.max(o,r+1);break}}for(let r=n;r<o;r++)s[r-t].push(i.endings)}return s}function Lt(c){let t=0;return c.map((e,s)=>e.length?s>0&&c[s-1].length?t:++t:0)}function Bt(c,t){if(!c[t].length)return 0;let e=t,s=t;for(;e>0&&c[e-1].length;)e--;for(;s<c.length-1&&c[s+1].length;)s++;return Math.max(...c.slice(e,s+1).flat(2))}function bt(c,t,e,s=t.map((n,i)=>i)){const n=Ft(e),i=Math.max(0,...t.map(x=>x.length)),o=[];for(let x=0;x<i;x++)o.push(Math.max(0,...t.map(b=>{var k;return((k=b[x])==null?void 0:k.length)??0})));const r=[];let p=0;for(const x of n)r.push(p),p+=o[x];const l=[],a=new Map,m=new Map,u=new Map;t.forEach((x,b)=>{const k=s[b];a.has(k)||(a.set(k,[]),m.set(k,[]),u.set(k,[])),n.forEach((M,g)=>{const f=x[M];if(!f)return;const h=r[g];for(const w of f.tempos)l.push({...w,offset:h+w.offset});for(const w of f.dynamics)a.get(k).push({...w,offset:h+w.offset});for(const w of f.hairpins)m.get(k).push({...w,offset:h+w.offset});for(const w of f.pedals)u.get(k).push({...w,offset:h+w.offset})})});const d=$t(l),y=new Map([...u].map(([x,b])=>[x,Ut(b,p)])),v=new Map;t.forEach((x,b)=>{const k=s[b];v.has(k)||v.set(k,[]),n.forEach((M,g)=>{var f;for(const h of((f=x[M])==null?void 0:f.notes)??[])v.get(k).push({...h,start:r[g]+h.offset})})});const S=[];for(const[x,b]of v){const k=Gt(a.get(x),m.get(x),p),M=y.get(x),g=new Map,f=[];for(const h of[...b].sort((w,T)=>w.start-T.start)){const w=h.start+h.duration*(h.held??1),T=h.tieStop?g.get(h.keyIndex):void 0;if(T&&T.start<=h.start+V)T.release=Math.max(T.release,w);else{const D=Math.max(.05,Math.min(1,k(h.start)*(h.accent??1))),C={keyIndex:h.keyIndex,start:h.start,release:w,velocity:D,letter:h.letter,alter:h.alter};f.push(C),g.set(h.keyIndex,C)}}for(const h of f){const w=d(h.start);S.push({keyIndex:h.keyIndex,time:w,duration:d(M(h.release))-w,hold:d(h.release)-w,velocity:h.velocity,letter:h.letter,alter:h.alter})}}return{id:`imported-${Date.now()}`,title:c,thumbnail:"🎼",notes:S.sort((x,b)=>x.time-b.time),measures:r.map(d),measureOrder:n}}function Ot(c,t){let e=Pt,s;for(const n of c){if(n.offset>t+V)break;n.momentary?n.after!==void 0&&(e=n.after):e=n.velocity,s=n.momentary&&Math.abs(n.offset-t)<V?n.velocity:void 0}return{level:e,hit:s}}const z=[16,33,49,64,80,96,112,126].map(c=>c/127);function _t(c,t){const e=.003937007874015748;return t>0?z.find(s=>s>c+e)??1:[...z].reverse().find(s=>s<c-e)??z[0]}function Gt(c,t,e){const s=[...c].sort((a,m)=>a.offset-m.offset),n=s.filter(a=>!a.momentary||a.after!==void 0),i=[],o=a=>{const{level:m,hit:u}=Ot(s,a);if(u!==void 0)return u;const d=i.find(y=>a>=y.start-V&&a<y.end-V);return d?d.from+(d.to-d.from)*(a-d.start)/(d.end-d.start):m},r=[];let p=null;const l=[...t].sort((a,m)=>a.offset-m.offset||+(a.kind!=="end")-+(m.kind!=="end"));for(const a of l)p&&a.offset>p.start+V&&r.push({...p,end:a.offset}),a.kind==="end"?p=null:(!p||a.offset>p.start+V)&&(p={kind:a.kind,start:a.offset});p&&e>p.start+V&&r.push({...p,end:e});for(const a of r){const m=o(a.start),u=n.find(x=>x.offset>a.start+V&&x.offset<a.end-V),d=u?u.offset:a.end,y=n.find(x=>Math.abs(x.offset-d)<V),v=a.kind==="cresc"?1:-1,S=y&&Math.sign(y.velocity-m)===v?y.velocity:_t(m,v);i.push({start:a.start,end:d,from:m,to:S}),y||(s.push({offset:d,velocity:S}),s.sort((x,b)=>x.offset-b.offset))}return o}function Ut(c,t){const e=[];let s=null;for(const n of[...c].sort((i,o)=>i.offset-o.offset||Number(i.down)-Number(o.down)))n.down&&s===null&&(s=n.offset),!n.down&&s!==null&&(e.push([s,n.offset]),s=null);return s!==null&&e.push([s,t]),n=>{const i=e.find(([o,r])=>n>o+V&&n<r);return i?i[1]:n}}function $t(c){var s;const t=c.filter(n=>n.bpm>0).sort((n,i)=>n.offset-i.offset),e=[{beat:0,seconds:0,secondsPerBeat:60/(((s=t[0])==null?void 0:s.bpm)??Rt)}];for(const n of t){const i=e[e.length-1],o=i.seconds+(n.offset-i.beat)*i.secondsPerBeat;e.push({beat:n.offset,seconds:o,secondsPerBeat:60/n.bpm})}return n=>{let i=e[0];for(const o of e){if(o.beat>n)break;i=o}return i.seconds+(n-i.beat)*i.secondsPerBeat}}const tt={C:0,D:2,E:4,F:5,G:7,A:9,B:11},jt=.125,et={staccatissimo:.33,spiccato:.33,staccato:.5,"detached-legato":.67,"strong-accent":.67,tenuto:1},st={accent:1.5,"strong-accent":1.2},xt=(c,t)=>{var e;return((e=c.querySelector(t))==null?void 0:e.textContent)??void 0},B=(c,t,e)=>{const s=parseFloat(xt(c,t)??"");return Number.isFinite(s)?s:e},wt=c=>{var o,r;const e=new DOMParser().parseFromString(c,"text/xml");if(e.querySelector("parsererror"))throw new Error("The file is not valid XML");if(!e.querySelector("score-partwise"))throw new Error(e.querySelector("score-timewise")?"Timewise MusicXML is not supported; export the score as partwise MusicXML":"Not a MusicXML score");const s=((o=e.querySelector("work-title"))==null?void 0:o.textContent)||((r=e.querySelector("movement-title"))==null?void 0:r.textContent)||"Imported Melody",n=Array.from(e.querySelectorAll("part")),i=p=>Array.from(p.children).filter(l=>l.tagName==="measure");return bt(s,n.map(p=>Ht(i(p))),n.length?zt(i(n[0])):[])};function Ht(c){let t=1;return c.map(e=>{const s=ft();let n=0,i=0,o=0,r={};const p=(a,m,u)=>{if(!a)return;const d=m/t,y=parseFloat(a.getAttribute("tempo")??"");y>0&&s.tempos.push({offset:d,bpm:y});const v=parseFloat(a.getAttribute("dynamics")??"");v>=0&&!u.dynamic&&s.dynamics.push({offset:d,velocity:Math.min(1,v*.9/127)});const S=a.getAttribute("damper-pedal");S&&!u.pedal&&s.pedals.push({offset:d,down:S!=="no"})},l=(a,m)=>{const u=m/t,d=a.querySelector(":scope > sound"),y=parseFloat((d==null?void 0:d.getAttribute("dynamics"))??"");let v=!1;for(const x of Array.from(a.querySelectorAll("direction-type > dynamics > *"))){const b=yt(x.tagName,u,y>=0?Math.min(127,y*.9):void 0);b&&(s.dynamics.push(b),v=!0)}for(const x of Array.from(a.querySelectorAll("direction-type > wedge"))){const b=x.getAttribute("type");b==="crescendo"&&s.hairpins.push({offset:u,kind:"cresc"}),b==="diminuendo"&&s.hairpins.push({offset:u,kind:"dim"}),b==="stop"&&s.hairpins.push({offset:u,kind:"end"})}let S=!1;for(const x of Array.from(a.querySelectorAll("direction-type > pedal"))){const b=x.getAttribute("type");(b==="stop"||b==="change")&&s.pedals.push({offset:u,down:!1}),(b==="start"||b==="change"||b==="resume")&&s.pedals.push({offset:u,down:!0}),b==="discontinue"&&s.pedals.push({offset:u,down:!1}),S=!0}p(d,m,{dynamic:v,pedal:S})};for(const a of Array.from(e.children))switch(a.tagName){case"attributes":t=B(a,"divisions",t);break;case"direction":l(a,n+B(a,":scope > offset",0));break;case"sound":p(a,n,{dynamic:!1,pedal:!1});break;case"forward":n+=B(a,"duration",0),i=Math.max(i,n);break;case"backup":n-=B(a,"duration",0);break;case"note":{if(a.querySelector("cue"))break;const m=a.querySelector("grace")!==null,u=a.querySelector("chord")!==null,d=m?0:B(a,":scope > duration",0),y=u?o:n,v=xt(a,"pitch > step");if(a.querySelector("rest")===null&&v&&v in tt){const S=B(a,"pitch > octave",4),x=Math.round(B(a,"pitch > alter",0)),b=S*12+tt[v]+x-9;b>=0&&b<88&&s.notes.push({keyIndex:b,offset:y/t,duration:m?jt:d/t,tieStop:a.querySelector('tie[type="stop"]')!==null,letter:"CDEFGAB".indexOf(v),alter:x,...u?{...r,...nt(a)}:r=nt(a)})}!u&&!m&&(o=n,n+=d,i=Math.max(i,n));break}}return s.length=i/t,s})}function nt(c){const t={},e=Array.from(c.querySelectorAll("notations > articulations > *")),s=e.some(n=>n.tagName==="tenuto");for(const n of e)n.tagName in et&&!(s&&n.tagName==="strong-accent")&&(t.held=Math.min(t.held??1,et[n.tagName])),n.tagName in st&&(t.accent=Math.max(t.accent??1,st[n.tagName]));return t}function zt(c){const t=c.map(()=>mt());let e=null;const s=(o,r)=>{e&&(t[e.start].voltas.push({endings:e.endings,length:o-e.start+1,open:r}),e=null)};c.forEach((o,r)=>{const p=t[r];for(const l of Array.from(o.querySelectorAll(":scope > barline"))){const a=l.querySelector("repeat");(a==null?void 0:a.getAttribute("direction"))==="forward"&&(p.forward=!0),(a==null?void 0:a.getAttribute("direction"))==="backward"&&(p.backward=parseInt(a.getAttribute("times")??"",10)||2);const m=l.querySelector("ending");if(!m)continue;const u=m.getAttribute("type");u==="start"?(s(r-1,!1),e={start:r,endings:(m.getAttribute("number")??"1").split(/[\s,]+/).map(d=>parseInt(d,10)).filter(d=>d>0)}):s(r,u==="discontinue")}for(const l of Array.from(o.querySelectorAll("sound"))){const a=l.getAttribute("segno"),m=l.getAttribute("coda"),u=l.getAttribute("tocoda");a!==null&&p.markers.push(`segno:${a}`),m!==null&&p.markers.push(`coda:${m}`),u!==null&&p.markers.push(`tocoda:${u}`),l.getAttribute("fine")!==null&&p.markers.push("fine");const d=l.getAttribute("dalsegno");(l.getAttribute("dacapo")==="yes"||d!==null)&&(p.jump={to:d!==null?`segno:${d}`:"start",until:"end",continueAt:"",playRepeats:!1})}}),s(c.length-1,!0);const n=t.flatMap(o=>o.markers).find(o=>o.startsWith("tocoda:")),i=t.some(o=>o.markers.includes("fine"));for(const o of t)o.jump&&(n?(o.jump.until=n,o.jump.continueAt=`coda:${n.slice(7)}`):i&&(o.jump.until="fine"));return t}const Yt={long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,"16th":1/4,"32nd":1/8,"64th":1/16,"128th":1/32,"256th":1/64,"512th":1/128,"1024th":1/256},ot={"8va":12,"8vb":-12,"15ma":24,"15mb":-24,"22ma":36,"22mb":-36},Kt=/^(acciaccatura|appoggiatura|grace\d+(after)?)$/,Wt=.125,Xt=21,N=(c,t)=>Array.from(c.children).filter(e=>!t||e.tagName===t),E=(c,t)=>N(c,t)[0],A=(c,t)=>{var e,s;return(s=(e=E(c,t))==null?void 0:e.textContent)==null?void 0:s.trim()},j=c=>{const[t,e]=(c??"").split("/").map(Number);return t&&e?t/e*4:0},Qt=c=>{const{score:t,staffElements:e,staves:s,partOf:n}=Zt(c),i=Number(A(t,"Division"))||480;return bt(Jt(t),s.map(o=>oe(o,i)),pe(s),e.map((o,r)=>n.get(o.getAttribute("id")??"")??-1-r))};function Zt(c){const t=new DOMParser().parseFromString(c,"text/xml");if(t.querySelector("parsererror"))throw new Error("The file is not valid XML");const e=t.documentElement,s=parseFloat(e.getAttribute("version")??"0");if(e.tagName!=="museScore")throw new Error("Not a MuseScore file");if(s<2)throw new Error("MuseScore 1 files are not supported; open and save the score in a later version of MuseScore");const n=E(e,"Score");if(!n)throw new Error("No score found in the MuseScore file");const{percussion:i,partOf:o}=te(n),r=N(n,"Staff").filter(l=>!i.has(l.getAttribute("id")??"")),p=r.map(l=>N(l,"Measure"));return{score:n,staffElements:r,staves:p,partOf:o}}function Jt(c){var e,s,n,i;const t=N(c,"metaTag").find(o=>o.getAttribute("name")==="workTitle");if((e=t==null?void 0:t.textContent)!=null&&e.trim())return t.textContent.trim();for(const o of Array.from(c.querySelectorAll(":scope > Staff > VBox > Text")))if(((s=A(o,"style"))==null?void 0:s.toLowerCase())==="title"){const r=(i=(n=E(o,"text"))==null?void 0:n.textContent)==null?void 0:i.trim();if(r)return r}return"Imported Melody"}function te(c){const t=new Set,e=new Map;return N(c,"Part").forEach((s,n)=>{var i;for(const o of N(s,"Staff")){const r=o.getAttribute("id")??"";e.set(r,n),((i=E(o,"StaffType"))==null?void 0:i.getAttribute("group"))==="percussion"&&t.add(r)}}),{percussion:t,partOf:e}}const ee=[[/staccatissimo/i,.33],[new RegExp("(?<!tenuto)staccato","i"),.5],[/tenutoStaccato|portato/i,.67],[/marcato(?!tenuto)/i,.67],[/tenuto/i,1]],se=[[/accent|sforzato/i,1.5],[/marcato/i,1.2]];function ne(c){const t={};for(const e of N(c,"Articulation")){if(A(e,"play")==="0")continue;const s=A(e,"subtype")??"",n=ee.filter(([o])=>o.test(s)).map(([,o])=>o);n.length&&(t.held=Math.min(t.held??1,...n));const i=se.filter(([o])=>o.test(s)).map(([,o])=>o);i.length&&(t.accent=Math.max(t.accent??1,...i))}return t}function Y(c,t,e){const s=E(E(c,"next")??c,"location");return{startMeasure:t,startBeat:e,endMeasure:t+(Number(s&&A(s,"measures"))||0),endBeat:e+j(s&&A(s,"fractions"))}}function oe(c,t){var a,m;let e=4,s=1,n=0;const i=[],o=[],r=[],p=new Map,l=c.map((u,d)=>{const y=ft(),v=N(u,"voice");let S=0;for(const x of v.length?v:[u]){let b=0;const k=[],M=new Map,g=f=>{const h=A(f,"Tuplet");return h&&M.has(h)?M.get(h):k.reduce((w,T)=>w*T,1)};for(const f of N(x)){switch(f.tagName){case"TimeSig":{const h=Number(A(f,"sigN")),w=Number(A(f,"sigD")),T=Number(A(f,"stretchN")),D=Number(A(f,"stretchD"));s=T&&D?T/D:1,h&&w&&(e=h/w*4/s);break}case"Tempo":{const h=parseFloat(A(f,"tempo")??"");h>0&&y.tempos.push({offset:b,bpm:h*60});break}case"tick":b=Number(f.textContent)/t-n;break;case"location":b+=j(A(f,"fractions"));break;case"Tuplet":{const h=Number(A(f,"normalNotes")),w=Number(A(f,"actualNotes"));if(h&&w){const T=f.getAttribute("id");T?M.set(T,h/w):k.push(h/w)}break}case"endTuplet":k.pop();break;case"Dynamic":{const h=Number(A(f,"velocity")),w=yt(A(f,"subtype")??"",b,h>0?h:void 0);w&&y.dynamics.push(w);break}case"Pedal":case"Ottava":case"HairPin":{const h=f.getAttribute("id");h&&p.set(h,{measure:d,beat:b,element:f});break}case"endSpanner":{const h=p.get(f.getAttribute("id")??"");if(!h)break;p.delete(f.getAttribute("id")??"");const w={startMeasure:h.measure,startBeat:h.beat,endMeasure:d,endBeat:b},T=h.element;T.tagName==="Pedal"&&o.push(w),T.tagName==="Ottava"&&i.push({...w,shift:ot[A(T,"subtype")??""]??0}),T.tagName==="HairPin"&&r.push({...w,kind:at(T)});break}case"Spanner":{const h=E(f,"Ottava");f.getAttribute("type")==="Ottava"&&h&&i.push({...Y(f,d,b),shift:ot[A(h,"subtype")??""]??0}),f.getAttribute("type")==="Pedal"&&E(f,"Pedal")&&o.push(Y(f,d,b));const w=E(f,"HairPin");f.getAttribute("type")==="HairPin"&&w&&r.push({...Y(f,d,b),kind:at(w)});break}case"Rest":case"Chord":{const h=N(f).some(T=>Kt.test(T.tagName)),w=h?0:re(f,e*s,g(f))/s;if(f.tagName==="Chord")for(const T of N(f,"Note")){if(A(T,"play")==="0")continue;const D=Number(A(T,"pitch"));Number.isFinite(D)&&y.notes.push({keyIndex:D-Xt,offset:b,duration:h?Wt:w,tieStop:ce(T),...ae(T),...ne(f)})}b+=w;break}}S=Math.max(S,b)}}return y.length=j(u.getAttribute("len")??void 0)||e||S,n+=y.length,y});le(l,i);for(const u of o){(a=l[u.startMeasure])==null||a.pedals.push({offset:u.startBeat,down:!0});const d=it(l,u);l[d.measure].pedals.push({offset:d.beat,down:!1})}for(const u of r){(m=l[u.startMeasure])==null||m.hairpins.push({offset:u.startBeat,kind:u.kind});const d=it(l,u);l[d.measure].hairpins.push({offset:d.beat,kind:"end"})}for(const u of l)u.notes=u.notes.filter(d=>d.keyIndex>=0&&d.keyIndex<88);return l}function it(c,t){let e=Math.min(t.endMeasure,c.length),s=e<c.length?t.endBeat:0;for(;e>t.startMeasure&&s<=0;)e--,s+=c[e].length;return{measure:e,beat:s}}const at=c=>Number(A(c,"subtype")??0)%2===0?"cresc":"dim",ie=[3,0,4,1,5,2,6];function ae(c){const t=Number(A(c,"tpc"));return Number.isInteger(t)?{letter:ie[((t+1)%7+7)%7],alter:Math.floor((t+1)/7)-2}:{}}function re(c,t,e=1){const s=j(A(c,"duration"));if(s)return s;const n=A(c,"durationType")??"quarter";if(n==="measure")return t;const i=Yt[n]??1,o=Number(A(c,"dots"))||0;return i*(2-Math.pow(2,-o))*e}function ce(c){return N(c,"Spanner").some(t=>t.getAttribute("type")==="Tie"&&E(t,"prev"))||E(c,"endSpanner")!==void 0}function le(c,t){const e=(s,n,i,o)=>s<i||s===i&&n<o;c.forEach((s,n)=>{for(const i of s.notes)for(const o of t)!e(n,i.offset,o.startMeasure,o.startBeat)&&e(n,i.offset,o.endMeasure,o.endBeat)&&(i.keyIndex+=o.shift)})}function pe(c){const t=Math.max(0,...c.map(s=>s.length)),e=Array.from({length:t},mt);for(const s of c){const n=new Map;s.forEach((i,o)=>{E(i,"startRepeat")&&(e[o].forward=!0);const r=E(i,"endRepeat");r&&(e[o].backward=parseInt(r.textContent??"",10)||2);for(const l of N(i,"Marker")){const a=A(l,"label");a&&!e[o].markers.includes(a)&&e[o].markers.push(a)}const p=E(i,"Jump");p&&A(p,"jumpTo")&&(e[o].jump={to:A(p,"jumpTo"),until:A(p,"playUntil")||"end",continueAt:A(p,"continueAt")??"",playRepeats:A(p,"playRepeats")==="1"});for(const l of N(i)){l.tagName==="Volta"&&l.getAttribute("id")&&n.set(l.getAttribute("id"),{start:o,endings:ct(l),isOpen:rt(l)});const a=l.tagName==="endSpanner"?n.get(l.getAttribute("id")??""):void 0;if(a){n.delete(l.getAttribute("id"));const u=(!N(i).slice(0,N(i).indexOf(l)).some(d=>d.tagName==="Chord"||d.tagName==="Rest")?o:o+1)-a.start;u>0&&e[a.start].voltas.push({endings:a.endings,length:u,open:a.isOpen})}}for(const l of Array.from(i.querySelectorAll(':scope > voice > Spanner[type="Volta"], :scope > Spanner[type="Volta"]'))){const a=E(l,"Volta");if(!a)continue;const m=E(E(l,"next")??l,"location"),u=Math.max(1,Number(m&&A(m,"measures"))||1);e[o].voltas.push({endings:ct(a),length:u,open:rt(a)})}for(let l=i;l&&(l===i||l.tagName!=="Measure");l=l.nextElementSibling)N(l,"LayoutBreak").some(a=>A(a,"subtype")==="section")&&(e[o].sectionEnd=!0)})}return e}const rt=c=>A(c,"endHookType")!=="1",ct=c=>(A(c,"endings")??"1").split(/[\s,]+/).map(t=>parseInt(t,10)).filter(t=>t>0),ue=101010256,de=33639248,he=67324752,fe=c=>c.length>=4&&c[0]===80&&c[1]===75&&c[2]===3&&c[3]===4;class me{constructor(t){this.bytes=t,this.entries=new Map,this.view=new DataView(t.buffer,t.byteOffset,t.byteLength),this.readCentralDirectory()}get names(){return[...this.entries.keys()]}has(t){return this.entries.has(t)}async readText(t){return vt(await this.read(t))}async read(t){const e=this.entries.get(t);if(!e)throw new Error(`Missing file in archive: ${t}`);const s=e.localOffset;if(this.view.getUint32(s,!0)!==he)throw new Error(`Corrupt archive entry: ${t}`);const n=s+30+this.view.getUint16(s+26,!0)+this.view.getUint16(s+28,!0),i=this.bytes.subarray(n,n+e.compressedSize);if(e.method===0)return i;if(e.method===8)return ge(i);throw new Error(`Unsupported compression method ${e.method} for ${t}`)}readCentralDirectory(){const t=this.findEndOfCentralDirectory(),e=this.view.getUint16(t+10,!0);let s=this.view.getUint32(t+16,!0);const n=new TextDecoder("utf-8");for(let i=0;i<e;i++){if(this.view.getUint32(s,!0)!==de)throw new Error("Corrupt archive: bad central directory");const o=this.view.getUint16(s+28,!0),r=this.view.getUint16(s+30,!0),p=this.view.getUint16(s+32,!0),l=n.decode(this.bytes.subarray(s+46,s+46+o));this.entries.set(l,{name:l,method:this.view.getUint16(s+10,!0),compressedSize:this.view.getUint32(s+20,!0),localOffset:this.view.getUint32(s+42,!0)}),s+=46+o+r+p}}findEndOfCentralDirectory(){const t=this.bytes.length-22,e=Math.max(0,t-65535);for(let s=t;s>=e;s--)if(this.view.getUint32(s,!0)===ue)return s;throw new Error("Not a valid ZIP archive")}}async function ge(c){const t=new Blob([c]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(t).arrayBuffer())}function vt(c){return c[0]===255&&c[1]===254?new TextDecoder("utf-16le").decode(c):c[0]===254&&c[1]===255?new TextDecoder("utf-16be").decode(c):new TextDecoder("utf-8").decode(c)}const ye=".musicxml,.xml,.mxl,.mscz,.mscx";async function be(c){const t=new Uint8Array(await c.arrayBuffer()),e=fe(t)?await ve(new me(t)):vt(t);return xe(e)}function xe(c){const t=/<museScore[\s>]/.test(c)?"mscx":"musicxml";return{...t==="mscx"?Qt(c):wt(c),source:{format:t,text:c}}}const we=/\.(mscx?|musicxml|xml)$/i;async function ve(c){if(c.has("META-INF/container.xml")){const e=new DOMParser().parseFromString(await c.readText("META-INF/container.xml"),"text/xml"),s=Array.from(e.querySelectorAll("rootfile")).map(n=>n.getAttribute("full-path")??"").find(n=>we.test(n)&&c.has(n));if(s)return c.readText(s)}const t=c.names.find(e=>/\.mscx?$/i.test(e))??c.names.find(e=>/\.(musicxml|xml)$/i.test(e)&&!e.startsWith("META-INF/"));if(!t)throw new Error("No score found in the archive");return c.readText(t)}const Se=[[0,0],[0,1],[1,0],[1,1],[2,0],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1],[6,0]],ke={[-2]:"𝄫",[-1]:"♭",1:"♯",2:"𝄪"},G=28,O=[30,32,34,36,38],_=[18,20,22,24,26],lt=44,pt=12,ut=4,Ae=12,$=.3,R={background:"#0b1224",line:"rgba(148,163,184,0.45)",barline:"rgba(148,163,184,0.18)",clef:"#94a3b8",note:"#e2e8f0",past:"rgba(226,232,240,0.35)",active:"#ec4899",live:"#f472b6",playhead:"rgba(236,72,153,0.7)"};class Te{constructor(t){this.canvas=t,this.score=null,this.maxHold=0,this.live=[],this.scoreTop=lt,this.scoreBottom=pt,this.width=0,this.height=0,this.ctx=t.getContext("2d")}setScore(t){this.score=t,this.maxHold=((t==null?void 0:t.notes)??[]).reduce((e,s)=>Math.max(e,s.hold??s.duration??0),0),this.scoreTop=lt,this.scoreBottom=pt;for(const e of(t==null?void 0:t.notes)??[]){const s=this.position(this.place(e.keyIndex,0,0,e));this.scoreTop=Math.max(this.scoreTop,s+2),this.scoreBottom=Math.min(this.scoreBottom,s-2)}}position(t){return t.letter+7*Math.floor((t.keyIndex+9-t.alter)/12)}addLiveNote(t,e){this.live.push({keyIndex:t,at:e}),this.live=this.live.filter(s=>e-s.at<Ae)}hasLiveNotes(t){return this.live.some(e=>t-e.at<this.secondsBehind())}resize(){const t=this.canvas.getBoundingClientRect();if(!t.width||!t.height)return!1;const e=window.devicePixelRatio||1;return(this.width!==t.width||this.height!==t.height||this.canvas.width!==Math.round(t.width*e))&&(this.width=t.width,this.height=t.height,this.canvas.width=Math.round(t.width*e),this.canvas.height=Math.round(t.height*e)),this.ctx.setTransform(e,0,0,e,0,0),!0}draw(t,e){var p;if(!this.resize())return;const{ctx:s,width:n,height:i}=this,o=this.geometry();s.fillStyle=R.background,s.fillRect(0,0,n,i),s.strokeStyle=R.line,s.lineWidth=1;for(const l of O)this.hline(o.left,n,o.y(l,!0));for(const l of _)this.hline(o.left,n,o.y(l,!1));s.save(),s.beginPath(),s.rect(o.left,0,n-o.left,i),s.clip();const r=l=>o.playhead+(l-t)*o.pps;s.strokeStyle=R.barline;for(const l of((p=this.score)==null?void 0:p.measures)??[]){const a=r(l);a<o.left||a>n||(s.beginPath(),s.moveTo(Math.round(a)+.5,o.y(O[4],!0)),s.lineTo(Math.round(a)+.5,o.y(_[0],!1)),s.stroke())}for(const l of this.visibleNotes(t,o)){const a=l.time+l.hold<t?R.past:l.time<=t?R.active:R.note;this.drawNote(l,r(l.time),r(l.time+l.hold),a,o)}for(const l of this.live){const a=o.playhead+(l.at-e)*o.pps;a<o.left-o.pps*$||this.drawNote(this.place(l.keyIndex,l.at,$),a,a+$*o.pps,R.live,o)}s.restore(),s.strokeStyle=R.playhead,s.lineWidth=2,s.beginPath(),s.moveTo(o.playhead,o.y(O[4],!0)-o.step*4),s.lineTo(o.playhead,o.y(_[0],!1)+o.step*4),s.stroke(),this.drawClefs(o)}secondsBehind(){const t=this.geometry();return(t.playhead-t.left)/t.pps+$}geometry(){const t=this.width,e=this.height;let s=this.scoreTop,n=this.scoreBottom;for(const l of this.live){const a=this.position(this.place(l.keyIndex,0,0));s=Math.max(s,a+2),n=Math.min(n,a-2)}const i=Math.max(1.5,e/(s-G+2*ut+(G-n))),o=(s-G)*i,r=o+2*ut*i,p=Math.max(i*9,30);return{step:i,left:p,playhead:p+(t-p)*.2,pps:Math.max(60,(t-p)/7),y:(l,a)=>(a?o:r)-(l-G)*i}}visibleNotes(t,e){var l;const s=((l=this.score)==null?void 0:l.notes)??[],n=t-(e.playhead-e.left)/e.pps-this.maxHold,i=t+(this.width-e.playhead)/e.pps;let o=0,r=s.length;for(;o<r;){const a=o+r>>1;s[a].time<n?o=a+1:r=a}const p=[];for(let a=o;a<s.length&&s[a].time<=i;a++)p.push(this.place(s[a].keyIndex,s[a].time,s[a].hold??s[a].duration??.5,s[a]));return p}place(t,e,s,n){const[i,o]=(n==null?void 0:n.letter)!==void 0?[n.letter,n.alter??0]:Se[(t+9)%12];return{keyIndex:t,time:e,hold:s,letter:i,alter:o}}drawNote(t,e,s,n,i){const{ctx:o,step:r}={ctx:this.ctx,step:i.step},p=this.position(t),l=p>=G,a=i.y(p,l),m=l?O:_,u=[];for(let v=m[4]+2;v<=p;v+=2)u.push(v);for(let v=m[0]-2;v>=p;v-=2)u.push(v);o.strokeStyle=n,o.lineWidth=1;for(const v of u)this.hline(e-r*1.9,e+r*1.9,i.y(v,l));o.fillStyle=n,o.globalAlpha=.35;const d=Math.max(e+r,s);o.fillRect(e,a-r*.55,d-e,r*1.1),o.globalAlpha=1,o.beginPath(),o.ellipse(e,a,r*1.3,r*.9,-.35,0,Math.PI*2),o.fill();const y=ke[t.alter];y&&(o.font=`${Math.round(r*3.8)}px "Noto Music", "Segoe UI Symbol", "Apple Symbols", serif`,o.textAlign="right",o.textBaseline="middle",o.fillText(y,e-r*1.6,a))}drawClefs(t){const{ctx:e}=this;e.fillStyle=R.background,e.fillRect(0,0,t.left,this.height),e.strokeStyle=R.line,e.lineWidth=1;for(const n of O)this.hline(t.step,t.left,t.y(n,!0));for(const n of _)this.hline(t.step,t.left,t.y(n,!1));e.beginPath(),e.moveTo(t.step+.5,t.y(O[4],!0)),e.lineTo(t.step+.5,t.y(_[0],!1)),e.stroke(),e.fillStyle=R.clef,e.textAlign="left",e.textBaseline="alphabetic";const s=n=>`${Math.round(n)}px "Noto Music", "Segoe UI Symbol", "Apple Symbols", serif`;e.font=s(t.step*8.5),e.fillText("𝄞",t.step*1.8,t.y(30,!0)+t.step*1.6),e.font=s(t.step*7.2),e.fillText("𝄢",t.step*1.8,t.y(24,!1)+t.step*2.6)}hline(t,e,s){const n=Math.round(s)+.5;this.ctx.beginPath(),this.ctx.moveTo(t,n),this.ctx.lineTo(e,n),this.ctx.stroke()}}const Me=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],Ee=25,Ne=.3,Ce=80/127,St="sodorpiano.staff",dt="sodorpiano.view",Ve=.2;class Pe{constructor(t){this.soundType="grand",this.activeKeys=new Set,this.isAutoPlaying=!1,this.tempoMultiplier=1,this.stopAutoPlayRequested=!1,this.currentScore=null,this.keyElements=new Map,this.staffVisible=!0,this.staffFrame=0,this.fullView=!1,this.notation=null,this.engraved=null,this.engraving=null,this.shownScore=null,this.scorePosition=0,this.scoreClockTime=0,this.container=t,this.audio=new W,this.staffVisible=Re(),this.fullView=kt(dt)==="full",this.render()}setSoundType(t){this.soundType=t,this.updateUI()}setPedal(t){this.audio.setPedal(t)}async loadMusicXml(t){try{return this.currentScore={...wt(t),source:{format:"musicxml",text:t}},this.showScore(this.currentScore),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to parse MusicXML:",e),e}}async loadScoreFile(t){try{return this.currentScore=await be(t),this.showScore(this.currentScore),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to load score:",e),e}}async playScore(t){const e=t||this.currentScore;if(!e||this.isAutoPlaying)return;this.isAutoPlaying=!0,this.stopAutoPlayRequested=!1,this.updateUI();const s=e.notes;this.soundType==="grand"&&await this.audio.preloadGrand(s);const n=Math.max(0,...s.map(o=>o.time+(o.duration??.8)));this.showScore(e),this.scorePosition=-.1,this.scoreClockTime=this.audio.currentTime,this.drawStaff();let i=0;await new Promise(o=>{const r=()=>{if(this.stopAutoPlayRequested){clearInterval(p),o();return}const l=this.audio.currentTime;this.scorePosition+=(l-this.scoreClockTime)*this.tempoMultiplier,this.scoreClockTime=l;const a=this.scorePosition,m=a+Ne*this.tempoMultiplier;for(;i<s.length&&s[i].time<=m;){const u=s[i++],d=l+(u.time-a)/this.tempoMultiplier;this.playNote(u.keyIndex,(u.duration||.8)/this.tempoMultiplier,u.velocity??Ce,d)}i>=s.length&&a>=n&&(clearInterval(p),o())},p=setInterval(r,Ee);r()}),this.stopAutoPlayRequested&&this.audio.dampAll(),this.isAutoPlaying=!1,this.scorePosition=0,this.drawStaff(),this.updateUI()}stopScore(){this.stopAutoPlayRequested=!0,this.audio.dampAll()}playNote(t,e=2.5,s=.8,n){if(this.audio.playNote(t,this.soundType,e,s,n),n===void 0)this.highlightKey(t),this.staff.addLiveNote(t,performance.now()/1e3),this.drawStaff();else{const i=Math.max(0,(n-this.audio.currentTime)*1e3);setTimeout(()=>this.highlightKey(t),i)}}showScore(t){this.shownScore=t,this.staff.setScore(t),this.scorePosition=0,this.updateView()}updateView(){const t=this.container.querySelector("#sp-staff"),e=this.container.querySelector("#sp-notation"),s=this.container.querySelector("#sp-notation-status"),n=this.container.querySelector("#sp-view-btn");n.textContent=this.fullView?"Full score":"Simple staff",n.classList.toggle("sp-staff-on",this.fullView);const i=this.shownScore,o=this.fullView&&!!(i!=null&&i.source),r=o&&this.engraved===i;t.classList.toggle("sp-staff-full",o),e.style.display=o?"":"none",this.container.querySelector("#sp-staff-canvas").style.display=o?"none":"",s.style.display=r?"none":"",o&&!r&&this.engraving!==i&&this.staffVisible&&this.engrave(i),this.drawStaff()}async engrave(t){const e=this.container.querySelector("#sp-notation-status"),s=this.container.querySelector("#sp-notation-sheet");this.engraving=t,e.textContent="Engraving the score…";try{if(!this.notation){const{NotationView:n}=await Mt(async()=>{const{NotationView:i}=await import("./notation-Ce-Je4pZ.js");return{NotationView:i}},[]);this.notation=new n(this.container.querySelector("#sp-notation"),s)}await new Promise(n=>setTimeout(n,30)),await this.notation.load(t),this.engraving===t&&(this.engraved=t)}catch(n){console.error("[SodorPiano] engraving failed:",n),this.engraving===t&&(e.textContent="The full score cannot be shown for this file.");return}finally{this.engraving===t&&(this.engraving=null)}this.updateView()}staffPosition(){return this.isAutoPlaying?this.scorePosition+(this.audio.currentTime-this.scoreClockTime)*this.tempoMultiplier:this.scorePosition}drawStaff(){if(!this.staffVisible||this.staffFrame)return;const t=()=>{if(this.staffFrame=0,!this.staffVisible)return;const e=performance.now()/1e3;if(this.notation&&this.fullView&&this.shownScore&&this.engraved===this.shownScore){const s=this.container.querySelector("#sp-notation");this.notation.draw(this.staffPosition(),s.clientWidth*Ve,this.isAutoPlaying,.12*this.tempoMultiplier)}else this.staff.draw(this.staffPosition(),e);(this.isAutoPlaying||this.staff.hasLiveNotes(e))&&(this.staffFrame=requestAnimationFrame(t))};this.staffFrame=requestAnimationFrame(t)}setStaffVisible(t,e=!0){if(this.staffVisible=t,e)try{localStorage.setItem(St,t?"1":"0")}catch{}const s=this.container.querySelector("#sp-staff"),n=this.container.querySelector("#sp-staff-btn");s.style.display=t?"":"none",this.container.querySelector("#sp-view-btn").style.display=t?"":"none",n.classList.toggle("sp-staff-on",t),n.setAttribute("aria-pressed",String(t)),this.updateView()}setFullView(t){this.fullView=t;try{localStorage.setItem(dt,t?"full":"simple")}catch{}this.updateView()}highlightKey(t){const e=this.keyElements.get(t);e&&(e.classList.contains("sp-black-key"),e.classList.add("sp-active"),setTimeout(()=>e.classList.remove("sp-active"),250))}velocityFromPoint(t,e){const s=(t-e.top)/e.height,n=1-Math.max(0,Math.min(1,s));return Math.max(.06,Math.min(1,n))}render(){this.container.innerHTML=`
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
          flex-wrap: wrap;
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
        .sp-staff {
          position: relative;
          height: clamp(110px, 26vh, 230px);
          margin-bottom: 10px;
          border-radius: 12px;
          overflow: hidden;
          background: #0b1224;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }
        .sp-staff canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .sp-staff.sp-staff-full {
          height: clamp(150px, 34vh, 320px);
          background: #fbfaf4;
        }
        .sp-notation {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .sp-notation-sheet {
          position: absolute;
          left: 0;
          top: 0;
          transform-origin: 0 0;
          will-change: transform;
        }
        .sp-notation-playhead {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 20%;
          width: 2px;
          background: rgba(219,39,119,0.75);
          pointer-events: none;
        }
        .sp-notation-status {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #475569;
          background: #fbfaf4;
        }
        .sp-btn-staff {
          background: #1e293b;
          color: #cbd5e1;
        }
        .sp-btn-staff:hover { background: #334155; }
        .sp-btn-staff.sp-staff-on {
          background: #6366f1;
          color: white;
          box-shadow: 0 0 15px rgba(99,102,241,0.45);
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
                  <input type="file" id="sp-xml-import" style="display:none" accept="${ye}">
                  <button class="sp-btn sp-btn-pedal" id="sp-pedal-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 10h16"/><path d="M6 10v6h4v-6"/><circle cx="18" cy="13" r="3"/><circle cx="18" cy="13" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                    Pedal
                  </button>
                  <button class="sp-btn sp-btn-staff" id="sp-staff-btn" title="Show or hide the scrolling staff">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="21" y2="18"/><circle cx="14" cy="12" r="2" fill="currentColor" stroke="none"/>
                    </svg>
                    Staff
                  </button>
                  <button class="sp-btn sp-btn-staff" id="sp-view-btn" title="Switch between the simple staff and the full score">Simple staff</button>
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
          <div class="sp-staff" id="sp-staff">
            <canvas id="sp-staff-canvas"></canvas>
            <div class="sp-notation" id="sp-notation" style="display:none">
              <div class="sp-notation-sheet" id="sp-notation-sheet"></div>
              <div class="sp-notation-playhead"></div>
              <div class="sp-notation-status" id="sp-notation-status"></div>
            </div>
          </div>
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
    `,this.staff=new Te(this.container.querySelector("#sp-staff-canvas")),this.setupEvents(),this.renderKeys(),this.renderSoundSelector(),this.setStaffVisible(this.staffVisible,!1),typeof ResizeObserver<"u"&&new ResizeObserver(()=>{var t;(t=this.notation)==null||t.fit(),this.drawStaff()}).observe(this.container.querySelector("#sp-staff"))}setupEvents(){const t=this.container.querySelector("#sp-import-btn"),e=this.container.querySelector("#sp-xml-import"),s=this.container.querySelector("#sp-play-btn"),n=this.container.querySelector("#sp-stop-btn");t.onclick=()=>e.click(),e.onchange=async u=>{const d=u.target.files[0];if(e.value="",!!d)try{await this.loadScoreFile(d)}catch(y){alert(`Cannot read ${d.name}: ${y instanceof Error?y.message:y}`)}};const i=this.container.querySelector("#sp-staff-btn");i.onclick=()=>this.setStaffVisible(!this.staffVisible);const o=this.container.querySelector("#sp-view-btn");o.onclick=()=>this.setFullView(!this.fullView),s.onclick=()=>this.playScore(),n.onclick=()=>this.stopScore();const r=this.container.querySelector("#sp-pedal-btn");r.onclick=()=>{const u=!this.audio.pedal;this.audio.setPedal(u),r.classList.toggle("sp-pedal-on",u),r.setAttribute("aria-pressed",String(u))};const p=this.container.querySelector("#sp-vol-down"),l=this.container.querySelector("#sp-vol-up"),a=this.container.querySelector("#sp-tempo-down"),m=this.container.querySelector("#sp-tempo-up");p.onclick=()=>{this.audio.volume=Math.round((this.audio.volume-.1)*10)/10,this.updateUI()},l.onclick=()=>{this.audio.volume=Math.round((this.audio.volume+.1)*10)/10,this.updateUI()},a.onclick=()=>{this.tempoMultiplier=Math.max(.25,Math.round((this.tempoMultiplier-.25)*4)/4),this.updateUI()},m.onclick=()=>{this.tempoMultiplier=Math.min(2,Math.round((this.tempoMultiplier+.25)*4)/4),this.updateUI()}}renderKeys(){const t=this.container.querySelector("#sp-white-keys"),e=this.container.querySelector("#sp-keys-bed");t.innerHTML="",this.keyElements.clear();let s=0;const n=[],i=[];for(let r=0;r<88;r++){const p=(r+9)%12,l=Me[p],a=Math.floor((r+9)/12);l.includes("#")?i.push({i:r,noteName:l,octave:a,whiteBefore:s}):(n.push({i:r,noteName:l,octave:a}),s++)}n.forEach(r=>{const p=document.createElement("div");if(p.className="sp-white-key",p.onmousedown=l=>this.playNote(r.i,2.5,this.velocityFromPoint(l.clientY,p.getBoundingClientRect())),p.ontouchstart=l=>{l.preventDefault(),this.playNote(r.i,2.5,this.velocityFromPoint(l.touches[0].clientY,p.getBoundingClientRect()))},r.noteName==="C"||r.i===0||r.i===87){const l=document.createElement("div");l.className="sp-key-label",l.textContent=`${r.noteName}${r.octave}`,p.appendChild(l)}t.appendChild(p),this.keyElements.set(r.i,p)});const o=1/52*100*.6;i.forEach(r=>{const p=document.createElement("div");p.className="sp-black-key";const l=r.whiteBefore/52*100;p.style.left=`${l-o/2}%`,p.style.width=`${o}%`,p.onmousedown=a=>this.playNote(r.i,2.5,this.velocityFromPoint(a.clientY,p.getBoundingClientRect())),p.ontouchstart=a=>{a.preventDefault(),this.playNote(r.i,2.5,this.velocityFromPoint(a.touches[0].clientY,p.getBoundingClientRect()))},e.appendChild(p),this.keyElements.set(r.i,p)})}renderSoundSelector(){const t=this.container.querySelector("#sp-sound-selector"),e=Object.keys(K);t.innerHTML=e.map(s=>`<button class="sp-sound-btn ${this.soundType===s?"sp-selected":""}" data-type="${s}">${K[s].name}</button>`).join(""),t.querySelectorAll("button").forEach(s=>{s.onclick=()=>this.setSoundType(s.getAttribute("data-type"))})}updateUI(){const t=this.container.querySelector("#sp-play-btn"),e=this.container.querySelector("#sp-stop-btn"),s=this.container.querySelector("#sp-title"),n=this.container.querySelector("#sp-subtitle"),i=this.container.querySelector("#sp-icon");this.isAutoPlaying?(i.classList.add("sp-playing"),n.textContent="Automated Performance System"):(i.classList.remove("sp-playing"),n.textContent="Integrated Synthesis System"),this.currentScore&&(t.style.display=this.isAutoPlaying?"none":"flex",e.style.display=this.isAutoPlaying?"flex":"none",s.textContent=this.isAutoPlaying?`PLAYING: ${this.currentScore.title}`:`SCORE: ${this.currentScore.title}`);const o=this.container.querySelector("#sp-vol-value"),r=this.container.querySelector("#sp-tempo-value");o&&(o.textContent=`${Math.round(this.audio.volume*100)}%`),r&&(r.textContent=`${this.tempoMultiplier.toFixed(2).replace(/0$/,"")}×`),this.renderSoundSelector()}}function kt(c){try{return localStorage.getItem(c)}catch{return null}}function Re(){const c=kt(St);return c!==null?c==="1":window.innerHeight>=600&&window.innerWidth>=700}const ht=document.getElementById("piano-container");ht&&new Pe(ht);export{Kt as G,N as a,E as b,A as c,re as d,j as f,ce as i,pe as p,Zt as r,ae as s};
