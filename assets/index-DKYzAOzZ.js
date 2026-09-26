(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function e(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=e(n);fetch(n.href,o)}})();const q={grand:{name:"Sodor Grand",oscTypes:["sine","sine","sine","sine","sine","sine","sine"],gains:[.35,.2,.14,.09,.06,.04,.025],detune:[0,1200,1904,2404,2791,3110,3379],decayRates:[1,1.4,2,2.8,3.8,5,6.5],hammerNoise:.08,filterType:"lowpass",filterFreq:5e3,filterEndFreq:1e3,attack:.003,decay:2.5,sustain:.008,release:.6},electric:{name:"Electric Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,1200],attack:.01,decay:1,sustain:.3,release:.5},synth:{name:"Tidmouth Synth",oscTypes:["sawtooth","square"],gains:[.3,.2],detune:[0,5],filterType:"lowpass",filterFreq:1200,filterEndFreq:400,attack:.1,decay:.5,sustain:.5,release:1.2},organ:{name:"Vicarstown Organ",oscTypes:["sine","sine","sine"],gains:[.4,.2,.2],detune:[0,1200,1900],attack:.05,decay:.1,sustain:1,release:.8},whistle:{name:"Steam Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,2],filterType:"highpass",filterFreq:800,attack:.2,decay:.3,sustain:.7,release:.5},bell:{name:"Station Bell",oscTypes:["sine","sine","triangle"],gains:[.4,.3,.2],detune:[0,1200,2400],attack:.002,decay:2,sustain:.01,release:2}},D=1e-4,nt=69,ot=l=>l<24?.15:l<48?.09:.06,at=[{name:"p",below:.42,reference:.3},{name:"m",below:.72,reference:.57},{name:"f",below:1/0,reference:.85}],V=class V{constructor(){this.ctx=null,this.masterGainNode=null,this.compressor=null,this.reverb=null,this._volume=.8,this.activeVoices=[],this.maxPolyphony=64,this._pedalDown=!1,this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this.RES_FREQS=[55,65.41,77.78,92.5,110,130.81,155.56,185,220,261.63,311.13,369.99,440,523.25,622.25,740,880,1046.5,1244.5,1480,1760,2093,2489,2960,3520,4186],this.sampleCache=new Map,this.sampleLoads=new Map}get sampleBase(){return"/SodorPiano/".replace(/\/$/,"")+"/assets/samples/"}loadSample(t,e){const s=this.sampleCache.get(e);if(s)return Promise.resolve(s);const n=this.sampleLoads.get(e);if(n)return n;const o=fetch(this.sampleBase+e).then(a=>{if(!a.ok)throw new Error("HTTP "+a.status);return a.arrayBuffer()}).then(a=>t.decodeAudioData(a)).then(a=>(this.sampleCache.set(e,a),this.sampleLoads.delete(e),a)).catch(a=>{throw this.sampleLoads.delete(e),a});return this.sampleLoads.set(e,o),o}get pedal(){return this._pedalDown}get canResonate(){return this._pedalDown||this.activeVoices.length>0}get volume(){return this._volume}set volume(t){this._volume=Math.max(0,Math.min(1,t)),this.masterGainNode&&this.ctx&&this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime)}initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGainNode=this.ctx.createGain(),this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-18,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(4,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGainNode.connect(this.compressor),this.compressor.connect(this.ctx.destination),this.reverb=this.ctx.createConvolver(),this.reverb.buffer=rt(this.ctx);const t=this.ctx.createGain();t.gain.setValueAtTime(.5,this.ctx.currentTime),this.masterGainNode.connect(this.reverb),this.reverb.connect(t),t.connect(this.compressor),this.initResonance(this.ctx)}return this.ctx.state==="suspended"&&this.ctx.resume(),this.ctx}get output(){return this.masterGainNode}get currentTime(){return this.initCtx().currentTime}async preloadGrand(t){const e=this.initCtx(),s=new Set(t.map(n=>this.grandSample(n.keyIndex,n.velocity??.8).file));await Promise.allSettled([...s].map(n=>this.loadSample(e,n)))}dampVoice(t,e,s=.012){if(t.damper){if(e<t.startTime){t.damper.disconnect(),t.stopTime=e;return}const a=e+s*9,i=t.damping;if(i&&i.at<=e&&i.end<=a)return;const r=!i||e<=i.at?1:e>=i.end?D:i.from*Math.pow(D/i.from,(e-i.at)/(i.end-i.at));t.damper.gain.cancelScheduledValues(e),t.damper.gain.setValueAtTime(r,e),t.damper.gain.exponentialRampToValueAtTime(D,a),t.damping={from:r,at:e,end:a},t.stopScheduled||(t.sources.forEach(c=>{try{c.stop(a)}catch{}}),t.stopScheduled=!0),t.stopTime=Math.min(t.stopTime,a);return}const n=.03;t.gainNode.gain.cancelScheduledValues(e);const o=Math.max(t.gainNode.gain.value,1e-4);t.gainNode.gain.setValueAtTime(o,e),t.gainNode.gain.exponentialRampToValueAtTime(1e-4,e+n),t.oscillators.forEach(a=>{try{a.stop(e+n+.01)}catch{}}),t.sources.forEach(a=>{try{a.stop(e+n+.01)}catch{}})}dampAll(){if(!this.ctx)return;const t=this.ctx.currentTime;this.activeVoices.forEach(e=>this.dampVoice(e,t)),this.activeVoices=[]}setPedal(t){if(t===this._pedalDown||(this._pedalDown=t,!this.ctx))return;const e=this.ctx.currentTime;if(!t){const s=[...this.activeVoices];this.activeVoices=[],s.forEach(n=>this.dampVoice(n,e))}}initResonance(t){this.resonanceInput||(this.resonanceInput=t.createGain(),this.resonanceOutput=t.createGain(),this.resonanceFeed=t.createGain(),this.resonanceFeed.gain.setValueAtTime(1,t.currentTime),this.resonanceOutput.gain.setValueAtTime(1e-4,t.currentTime),this.resonanceOutput.gain.linearRampToValueAtTime(.0015,t.currentTime+.5),this.resonators=this.RES_FREQS.map(e=>t.createBiquadFilter()),this.resonators.forEach((e,s)=>{const n=this.RES_FREQS[s];e.type="bandpass";const o=30+s/this.RES_FREQS.length*40;e.frequency.setValueAtTime(n,t.currentTime),e.Q.setValueAtTime(o,t.currentTime),e.gain.setValueAtTime(1,t.currentTime),e.connect(this.resonanceOutput)}),this.resonanceInput.connect(this.resonanceFeed),this.resonators.forEach(e=>this.resonanceFeed.connect(e)),this.resonanceOutput.connect(this.masterGainNode))}managePolyphony(t,e,s=t.currentTime){for(this.activeVoices=this.activeVoices.filter(n=>n.keyIndex===e&&n.startTime<=s?(this.dampVoice(n,s,.04),!1):!0),this.activeVoices=this.activeVoices.filter(n=>n.stopTime>s);this.activeVoices.length>=this.maxPolyphony;){const n=this.activeVoices.shift();this.dampVoice(n,s,.03)}}getFrequency(t){return 27.5*Math.pow(2,t/12)}playNote(t,e="grand",s=1.2,n=.9,o){const a=this.initCtx(),i=Math.max(o??0,a.currentTime);if(this.managePolyphony(a,t,i),e==="grand"){const b=o===void 0&&s>=2;this.playGrandPiano(a,t,s,n,i,b).catch(h=>console.error("[SodorPiano] grand note error:",h));return}const r=q[e],c=i,p=this.getFrequency(t),u=!!r.decayRates,d=a.createGain();if(r.filterType){const b=a.createBiquadFilter();b.type=r.filterType,b.frequency.setValueAtTime(r.filterFreq||2e3,c),r.filterEndFreq&&b.frequency.exponentialRampToValueAtTime(r.filterEndFreq,c+r.decay),d.connect(b),b.connect(this.output)}else d.connect(this.output);if(u?(d.gain.setValueAtTime(1,c),d.gain.setValueAtTime(1,c+s),d.gain.exponentialRampToValueAtTime(.001,c+s+r.release)):(d.gain.setValueAtTime(0,c),d.gain.linearRampToValueAtTime(.4,c+r.attack),d.gain.exponentialRampToValueAtTime(r.sustain*.4,c+r.attack+r.decay),d.gain.exponentialRampToValueAtTime(.001,c+s+r.release)),r.hammerNoise&&r.hammerNoise>0){const b=Math.floor(a.sampleRate*.025),h=a.createBuffer(1,b,a.sampleRate),v=h.getChannelData(0);for(let f=0;f<b;f++)v[f]=Math.random()*2-1;const m=a.createBufferSource();m.buffer=h;const A=a.createBiquadFilter();A.type="bandpass",A.frequency.setValueAtTime(Math.min(p*3,8e3),c),A.Q.setValueAtTime(1,c);const S=a.createGain();S.gain.setValueAtTime(r.hammerNoise,c),S.gain.exponentialRampToValueAtTime(.001,c+.04),m.connect(A),A.connect(S),S.connect(d),m.start(c),m.stop(c+.05)}const g=[];r.oscTypes.forEach((b,h)=>{const v=a.createOscillator(),m=a.createGain();if(v.type=b,v.frequency.setValueAtTime(p,c),r.detune&&r.detune[h]!==void 0&&v.detune.setValueAtTime(r.detune[h],c),u){const A=r.decayRates[h]||1,S=r.gains[h],f=Math.max(1e-4,S*r.sustain);m.gain.setValueAtTime(0,c),m.gain.linearRampToValueAtTime(S,c+r.attack),m.gain.exponentialRampToValueAtTime(f,c+r.attack+r.decay/A),m.gain.exponentialRampToValueAtTime(1e-4,c+s+r.release)}else m.gain.setValueAtTime(r.gains[h],c);v.connect(m),m.connect(d),v.start(c),v.stop(c+s+r.release),g.push(v)}),this.activeVoices.push({keyIndex:t,gainNode:d,startTime:c,stopTime:c+s+r.release,oscillators:g,sources:[]})}grandSample(t,e){const s=V.GRAND_SAMPLE_MAP[t]||V.GRAND_SAMPLE_MAP[39],n=at.find(a=>e<a.below);return{file:`${s.note.replace("#","s")}_${n.name}.mp3`,rate:s.rate,layer:n}}async playGrandPiano(t,e,s,n,o,a){if(!this.ctx||this.ctx.state==="closed")return;const i=this.ctx,r=Math.max(.05,Math.min(1,n)),{file:c,rate:p,layer:u}=this.grandSample(e,r);let d;try{d=await this.loadSample(i,c)}catch(y){console.error("[SodorPiano] failed to load sample",c,y),this.playGrandSynthFallback(i,e,s,r);return}const g=Math.max(o,i.currentTime),b=i.createBufferSource();b.buffer=d,b.playbackRate.setValueAtTime(p,g);const h=i.createGain(),v=.9*Math.min(1.4,Math.max(.5,r/u.reference));h.gain.setValueAtTime(0,g),h.gain.linearRampToValueAtTime(v,g+.003);const m=i.createGain();m.gain.setValueAtTime(1,g);const A=i.createBiquadFilter();A.type="peaking";const S=this.getFrequency(e);if(A.frequency.setValueAtTime(S<200?120:420,g),A.Q.setValueAtTime(.8,g),A.gain.setValueAtTime(S<200?2:1.2,g),b.connect(h),h.connect(m),m.connect(A),A.connect(this.output),this.canResonate&&this.resonanceInput){const y=i.createGain();y.gain.setValueAtTime(.18*r,g),y.gain.exponentialRampToValueAtTime(1e-4,g+.2),h.connect(y),y.connect(this.resonanceInput)}const f=g+d.duration/p,x={keyIndex:e,gainNode:h,damper:m,startTime:g,stopTime:f,oscillators:[],sources:[b]};b.start(g),!a&&e<nt&&this.dampVoice(x,g+Math.max(.03,s),ot(e)),this.activeVoices.push(x)}playGrandSynthFallback(t,e,s,n=.9){const o=t.currentTime,a=this.getFrequency(e),i=t.createGain(),r=Math.max(.05,Math.min(1,n)),c=.5*(.3+.7*r);i.gain.setValueAtTime(0,o),i.gain.linearRampToValueAtTime(c,o+.004),i.gain.exponentialRampToValueAtTime(1e-4,o+s+.3),i.connect(this.output);const p=[],u=[1,2,3,4,5],d=[1,.45,.25,.14,.08];for(let g=0;g<u.length;g++){const b=t.createOscillator(),h=t.createGain();b.type="sine",b.frequency.setValueAtTime(a*u[g]*(1+3e-4*u[g]*u[g]),o),h.gain.setValueAtTime(d[g]*(.3+.7*r),o),h.gain.exponentialRampToValueAtTime(1e-4,o+s+.3),b.connect(h),h.connect(i),b.start(o),b.stop(o+s+.35),p.push(b)}this.activeVoices.push({keyIndex:e,gainNode:i,startTime:o,stopTime:o+s+.35,oscillators:p,sources:[]})}close(){this.ctx&&(this.activeVoices=[],this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this._pedalDown=!1,this.ctx.close(),this.ctx=null,this.compressor=null,this.reverb=null)}};V.GRAND_SAMPLE_MAP=[{note:"A0",rate:1},{note:"A0",rate:1.059463},{note:"C1",rate:.943874},{note:"C1",rate:1},{note:"C1",rate:1.059463},{note:"D#1",rate:.943874},{note:"D#1",rate:1},{note:"D#1",rate:1.059463},{note:"F#1",rate:.943874},{note:"F#1",rate:1},{note:"F#1",rate:1.059463},{note:"A1",rate:.943874},{note:"A1",rate:1},{note:"A1",rate:1.059463},{note:"C2",rate:.943874},{note:"C2",rate:1},{note:"C2",rate:1.059463},{note:"D#2",rate:.943874},{note:"D#2",rate:1},{note:"D#2",rate:1.059463},{note:"F#2",rate:.943874},{note:"F#2",rate:1},{note:"F#2",rate:1.059463},{note:"A2",rate:.943874},{note:"A2",rate:1},{note:"A2",rate:1.059463},{note:"C3",rate:.943874},{note:"C3",rate:1},{note:"C3",rate:1.059463},{note:"D#3",rate:.943874},{note:"D#3",rate:1},{note:"D#3",rate:1.059463},{note:"F#3",rate:.943874},{note:"F#3",rate:1},{note:"F#3",rate:1.059463},{note:"A3",rate:.943874},{note:"A3",rate:1},{note:"A3",rate:1.059463},{note:"C4",rate:.943874},{note:"C4",rate:1},{note:"C4",rate:1.059463},{note:"D#4",rate:.943874},{note:"D#4",rate:1},{note:"D#4",rate:1.059463},{note:"F#4",rate:.943874},{note:"F#4",rate:1},{note:"F#4",rate:1.059463},{note:"A4",rate:.943874},{note:"A4",rate:1},{note:"A4",rate:1.059463},{note:"C5",rate:.943874},{note:"C5",rate:1},{note:"C5",rate:1.059463},{note:"D#5",rate:.943874},{note:"D#5",rate:1},{note:"D#5",rate:1.059463},{note:"F#5",rate:.943874},{note:"F#5",rate:1},{note:"F#5",rate:1.059463},{note:"A5",rate:.943874},{note:"A5",rate:1},{note:"A5",rate:1.059463},{note:"C6",rate:.943874},{note:"C6",rate:1},{note:"C6",rate:1.059463},{note:"D#6",rate:.943874},{note:"D#6",rate:1},{note:"D#6",rate:1.059463},{note:"F#6",rate:.943874},{note:"F#6",rate:1},{note:"F#6",rate:1.059463},{note:"A6",rate:.943874},{note:"A6",rate:1},{note:"A6",rate:1.059463},{note:"C7",rate:.943874},{note:"C7",rate:1},{note:"C7",rate:1.059463},{note:"D#7",rate:.943874},{note:"D#7",rate:1},{note:"D#7",rate:1.059463},{note:"F#7",rate:.943874},{note:"F#7",rate:1},{note:"F#7",rate:1.059463},{note:"A7",rate:.943874},{note:"A7",rate:1},{note:"A7",rate:1.059463},{note:"C8",rate:.943874},{note:"C8",rate:1}];let P=V;function rt(l){const e=Math.floor(.012*l.sampleRate),s=Math.floor(1.6*l.sampleRate),n=l.createBuffer(2,s,l.sampleRate);for(let o=0;o<2;o++){const a=n.getChannelData(o);let i=0;for(let r=e;r<s;r++){const c=(r-e)/l.sampleRate,p=.25+.7*Math.min(1,c/1.6);i=p*i+(1-p)*(Math.random()*2-1),a[r]=i*Math.exp(-6.9*c/1.6)}}return n}const X=()=>({length:0,notes:[],tempos:[],dynamics:[],pedals:[]}),Q=()=>({forward:!1,backward:0,endings:null}),it=80/127,ct=120,lt=2e4,I=1e-6,G={pppppp:1,ppppp:5,pppp:10,ppp:16,pp:33,p:49,mp:64,mf:80,f:96,ff:112,fff:126,ffff:127,fffff:127,ffffff:127},_={sf:[112,void 0],sfz:[112,void 0],sffz:[126,void 0],fz:[112,void 0],rf:[112,void 0],rfz:[112,void 0],fp:[96,49],sfp:[112,49],sfpp:[112,33],pf:[49,96]};function W(l,t,e){const s=l.toLowerCase();if(s in G)return{offset:t,velocity:(e??G[s])/127};if(s in _){const[n,o]=_[s];return{offset:t,velocity:(e??n)/127,momentary:!0,after:o===void 0?void 0:o/127}}return null}function pt(l){const t=[],e=new Map;let s=0,n=1,o=!1;for(let a=0;a<l.length&&t.length<lt;){const i=l[a];o&&!i.endings&&(s=a,n=1,o=!1),i.forward&&a!==s&&(s=a,n=1);const r=i.endings!==null&&!i.endings.includes(n);if(r||t.push(a),i.backward>0){const c=e.get(a)??1;if(!r&&c<i.backward){e.set(a,c+1),n=c+1,o=!1,a=s;continue}e.set(a,i.backward),o=!0}a++}return t}function Z(l,t,e,s=t.map((n,o)=>o)){const n=pt(e),o=Math.max(0,...t.map(h=>h.length)),a=[];for(let h=0;h<o;h++)a.push(Math.max(0,...t.map(v=>{var m;return((m=v[h])==null?void 0:m.length)??0})));const i=[];let r=0;for(const h of n)i.push(r),r+=a[h];const c=[],p=new Map,u=new Map;t.forEach((h,v)=>{const m=s[v];p.has(m)||(p.set(m,[]),u.set(m,[])),n.forEach((A,S)=>{const f=h[A];if(!f)return;const x=i[S];for(const y of f.tempos)c.push({...y,offset:x+y.offset});for(const y of f.dynamics)p.get(m).push({...y,offset:x+y.offset});for(const y of f.pedals)u.get(m).push({...y,offset:x+y.offset})})});const d=ht(c),g=new Map([...u].map(([h,v])=>[h,dt(v,r)])),b=[];return t.forEach((h,v)=>{const m=s[v],A=p.get(m).sort((y,T)=>y.offset-T.offset),S=g.get(m),f=new Map,x=[];n.forEach((y,T)=>{var E;for(const N of((E=h[y])==null?void 0:E.notes)??[]){const R=i[T]+N.offset,B=R+N.duration*(N.held??1),O=N.tieStop?f.get(N.keyIndex):void 0;if(O)O.release=B;else{const st=Math.max(.05,Math.min(1,ut(A,R)*(N.accent??1))),L={keyIndex:N.keyIndex,start:R,release:B,velocity:st};x.push(L),f.set(N.keyIndex,L)}}});for(const y of x){const T=d(y.start);b.push({keyIndex:y.keyIndex,time:T,duration:d(S(y.release))-T,velocity:y.velocity})}}),{id:`imported-${Date.now()}`,title:l,thumbnail:"🎼",notes:b.sort((h,v)=>h.time-v.time)}}function ut(l,t){let e=it,s;for(const n of l){if(n.offset>t+I)break;n.momentary?n.after!==void 0&&(e=n.after):e=n.velocity,s=n.momentary&&Math.abs(n.offset-t)<I?n.velocity:void 0}return s??e}function dt(l,t){const e=[];let s=null;for(const n of[...l].sort((o,a)=>o.offset-a.offset||Number(o.down)-Number(a.down)))n.down&&s===null&&(s=n.offset),!n.down&&s!==null&&(e.push([s,n.offset]),s=null);return s!==null&&e.push([s,t]),n=>{const o=e.find(([a,i])=>n>a+I&&n<i);return o?o[1]:n}}function ht(l){var s;const t=l.filter(n=>n.bpm>0).sort((n,o)=>n.offset-o.offset),e=[{beat:0,seconds:0,secondsPerBeat:60/(((s=t[0])==null?void 0:s.bpm)??ct)}];for(const n of t){const o=e[e.length-1],a=o.seconds+(n.offset-o.beat)*o.secondsPerBeat;e.push({beat:n.offset,seconds:a,secondsPerBeat:60/n.bpm})}return n=>{let o=e[0];for(const a of e){if(a.beat>n)break;o=a}return o.seconds+(n-o.beat)*o.secondsPerBeat}}const U={C:0,D:2,E:4,F:5,G:7,A:9,B:11},ft=.125,$={staccatissimo:.33,spiccato:.33,staccato:.5,"detached-legato":.67,"strong-accent":.67,tenuto:1},z={accent:1.5,"strong-accent":1.2},J=(l,t)=>{var e;return((e=l.querySelector(t))==null?void 0:e.textContent)??void 0},C=(l,t,e)=>{const s=parseFloat(J(l,t)??"");return Number.isFinite(s)?s:e},tt=l=>{var a,i;const e=new DOMParser().parseFromString(l,"text/xml");if(e.querySelector("parsererror"))throw new Error("The file is not valid XML");if(!e.querySelector("score-partwise"))throw new Error(e.querySelector("score-timewise")?"Timewise MusicXML is not supported; export the score as partwise MusicXML":"Not a MusicXML score");const s=((a=e.querySelector("work-title"))==null?void 0:a.textContent)||((i=e.querySelector("movement-title"))==null?void 0:i.textContent)||"Imported Melody",n=Array.from(e.querySelectorAll("part")),o=r=>Array.from(r.children).filter(c=>c.tagName==="measure");return Z(s,n.map(r=>mt(o(r))),n.length?bt(o(n[0])):[])};function mt(l){let t=1;return l.map(e=>{const s=X();let n=0,o=0,a=0;const i=(c,p,u)=>{if(!c)return;const d=p/t,g=parseFloat(c.getAttribute("tempo")??"");g>0&&s.tempos.push({offset:d,bpm:g});const b=parseFloat(c.getAttribute("dynamics")??"");b>=0&&!u.dynamic&&s.dynamics.push({offset:d,velocity:Math.min(1,b*.9/127)});const h=c.getAttribute("damper-pedal");h&&!u.pedal&&s.pedals.push({offset:d,down:h!=="no"})},r=(c,p)=>{const u=p/t,d=c.querySelector(":scope > sound"),g=parseFloat((d==null?void 0:d.getAttribute("dynamics"))??"");let b=!1;for(const v of Array.from(c.querySelectorAll("direction-type > dynamics > *"))){const m=W(v.tagName,u,g>=0?Math.min(127,g*.9):void 0);m&&(s.dynamics.push(m),b=!0)}let h=!1;for(const v of Array.from(c.querySelectorAll("direction-type > pedal"))){const m=v.getAttribute("type");(m==="stop"||m==="change")&&s.pedals.push({offset:u,down:!1}),(m==="start"||m==="change"||m==="resume")&&s.pedals.push({offset:u,down:!0}),m==="discontinue"&&s.pedals.push({offset:u,down:!1}),h=!0}i(d,p,{dynamic:b,pedal:h})};for(const c of Array.from(e.children))switch(c.tagName){case"attributes":t=C(c,"divisions",t);break;case"direction":r(c,n+C(c,":scope > offset",0));break;case"sound":i(c,n,{dynamic:!1,pedal:!1});break;case"forward":n+=C(c,"duration",0),o=Math.max(o,n);break;case"backup":n-=C(c,"duration",0);break;case"note":{if(c.querySelector("cue"))break;const p=c.querySelector("grace")!==null,u=c.querySelector("chord")!==null,d=p?0:C(c,":scope > duration",0),g=u?a:n,b=J(c,"pitch > step");if(c.querySelector("rest")===null&&b&&b in U){const h=C(c,"pitch > octave",4),v=Math.round(C(c,"pitch > alter",0)),m=h*12+U[b]+v-9;m>=0&&m<88&&s.notes.push({keyIndex:m,offset:g/t,duration:p?ft:d/t,tieStop:c.querySelector('tie[type="stop"]')!==null,...gt(c)})}!u&&!p&&(a=n,n+=d,o=Math.max(o,n));break}}return s.length=o/t,s})}function gt(l){const t={};for(const e of Array.from(l.querySelectorAll("notations > articulations > *")))e.tagName in $&&(t.held=Math.min(t.held??1,$[e.tagName])),e.tagName in z&&(t.accent=Math.max(t.accent??1,z[e.tagName]));return t}function bt(l){let t=null;return l.map(e=>{const s=Q();s.endings=t;for(const n of Array.from(e.querySelectorAll(":scope > barline"))){const o=n.querySelector("repeat");(o==null?void 0:o.getAttribute("direction"))==="forward"&&(s.forward=!0),(o==null?void 0:o.getAttribute("direction"))==="backward"&&(s.backward=parseInt(o.getAttribute("times")??"",10)||2);const a=n.querySelector("ending");a&&(a.getAttribute("type")==="start"?(t=(a.getAttribute("number")??"1").split(/[\s,]+/).map(i=>parseInt(i,10)).filter(i=>i>0),s.endings=t):(s.endings=s.endings??t,t=null))}return s})}const yt={long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,"16th":1/4,"32nd":1/8,"64th":1/16,"128th":1/32,"256th":1/64,"512th":1/128,"1024th":1/256},K={"8va":12,"8vb":-12,"15ma":24,"15mb":-24,"22ma":36,"22mb":-36},xt=/^(acciaccatura|appoggiatura|grace\d+(after)?)$/,vt=.125,wt=21,M=(l,t)=>Array.from(l.children).filter(e=>!t||e.tagName===t),k=(l,t)=>M(l,t)[0],w=(l,t)=>{var e,s;return(s=(e=k(l,t))==null?void 0:e.textContent)==null?void 0:s.trim()},F=l=>{const[t,e]=(l??"").split("/").map(Number);return t&&e?t/e*4:0},At=l=>{const t=new DOMParser().parseFromString(l,"text/xml");if(t.querySelector("parsererror"))throw new Error("The file is not valid XML");const e=t.documentElement,s=parseFloat(e.getAttribute("version")??"0");if(e.tagName!=="museScore")throw new Error("Not a MuseScore file");if(s<2)throw new Error("MuseScore 1 files are not supported; open and save the score in a later version of MuseScore");const n=k(e,"Score");if(!n)throw new Error("No score found in the MuseScore file");const{percussion:o,partOf:a}=St(n),i=M(n,"Staff").filter(p=>!o.has(p.getAttribute("id")??"")),r=i.map(p=>M(p,"Measure")),c=Number(w(n,"Division"))||480;return Z(Tt(n),r.map(p=>Nt(p,c)),Rt(r),i.map((p,u)=>a.get(p.getAttribute("id")??"")??-1-u))};function Tt(l){var e,s,n,o;const t=M(l,"metaTag").find(a=>a.getAttribute("name")==="workTitle");if((e=t==null?void 0:t.textContent)!=null&&e.trim())return t.textContent.trim();for(const a of Array.from(l.querySelectorAll(":scope > Staff > VBox > Text")))if(((s=w(a,"style"))==null?void 0:s.toLowerCase())==="title"){const i=(o=(n=k(a,"text"))==null?void 0:n.textContent)==null?void 0:o.trim();if(i)return i}return"Imported Melody"}function St(l){const t=new Set,e=new Map;return M(l,"Part").forEach((s,n)=>{var o;for(const a of M(s,"Staff")){const i=a.getAttribute("id")??"";e.set(i,n),((o=k(a,"StaffType"))==null?void 0:o.getAttribute("group"))==="percussion"&&t.add(i)}}),{percussion:t,partOf:e}}const kt=[[/staccatissimo/i,.33],[new RegExp("(?<!tenuto)staccato","i"),.5],[/tenutoStaccato|portato/i,.67],[/marcato(?!tenuto)/i,.67],[/tenuto/i,1]],Mt=[[/accent|sforzato/i,1.5],[/marcato/i,1.2]];function Et(l){const t={};for(const e of M(l,"Articulation")){if(w(e,"play")==="0")continue;const s=w(e,"subtype")??"",n=kt.filter(([a])=>a.test(s)).map(([,a])=>a);n.length&&(t.held=Math.min(t.held??1,...n));const o=Mt.filter(([a])=>a.test(s)).map(([,a])=>a);o.length&&(t.accent=Math.max(t.accent??1,...o))}return t}function Y(l,t,e){const s=k(k(l,"next")??l,"location");return{startMeasure:t,startBeat:e,endMeasure:t+(Number(s&&w(s,"measures"))||0),endBeat:e+F(s&&w(s,"fractions"))}}function Nt(l,t){var c;let e=4,s=1,n=0;const o=[],a=[],i=new Map,r=l.map((p,u)=>{const d=X(),g=M(p,"voice");let b=0;for(const h of g.length?g:[p]){let v=0;const m=[],A=new Map,S=f=>{const x=w(f,"Tuplet");return x&&A.has(x)?A.get(x):m.reduce((y,T)=>y*T,1)};for(const f of M(h)){switch(f.tagName){case"TimeSig":{const x=Number(w(f,"sigN")),y=Number(w(f,"sigD")),T=Number(w(f,"stretchN")),E=Number(w(f,"stretchD"));s=T&&E?T/E:1,x&&y&&(e=x/y*4/s);break}case"Tempo":{const x=parseFloat(w(f,"tempo")??"");x>0&&d.tempos.push({offset:v,bpm:x*60});break}case"tick":v=Number(f.textContent)/t-n;break;case"location":v+=F(w(f,"fractions"));break;case"Tuplet":{const x=Number(w(f,"normalNotes")),y=Number(w(f,"actualNotes"));if(x&&y){const T=f.getAttribute("id");T?A.set(T,x/y):m.push(x/y)}break}case"endTuplet":m.pop();break;case"Dynamic":{const x=Number(w(f,"velocity")),y=W(w(f,"subtype")??"",v,x>0?x:void 0);y&&d.dynamics.push(y);break}case"Pedal":case"Ottava":{const x=f.getAttribute("id");x&&i.set(x,{measure:u,beat:v,shift:f.tagName==="Ottava"?K[w(f,"subtype")??""]??0:void 0});break}case"endSpanner":{const x=i.get(f.getAttribute("id")??"");if(!x)break;i.delete(f.getAttribute("id")??"");const y={startMeasure:x.measure,startBeat:x.beat,endMeasure:u,endBeat:v};x.shift===void 0?a.push(y):o.push({...y,shift:x.shift});break}case"Spanner":{const x=k(f,"Ottava");f.getAttribute("type")==="Ottava"&&x&&o.push({...Y(f,u,v),shift:K[w(x,"subtype")??""]??0}),f.getAttribute("type")==="Pedal"&&k(f,"Pedal")&&a.push(Y(f,u,v));break}case"Rest":case"Chord":{const x=M(f).some(T=>xt.test(T.tagName)),y=x?0:Ct(f,e*s)*S(f)/s;if(f.tagName==="Chord")for(const T of M(f,"Note")){if(w(T,"play")==="0")continue;const E=Number(w(T,"pitch"));Number.isFinite(E)&&d.notes.push({keyIndex:E-wt,offset:v,duration:x?vt:y,tieStop:Vt(T),...Et(f)})}v+=y;break}}b=Math.max(b,v)}}return d.length=F(p.getAttribute("len")??void 0)||e||b,n+=d.length,d});Ft(r,o);for(const p of a){(c=r[p.startMeasure])==null||c.pedals.push({offset:p.startBeat,down:!0});let u=Math.min(p.endMeasure,r.length),d=u<r.length?p.endBeat:0;for(;u>p.startMeasure&&d<=0;)u--,d+=r[u].length;r[u].pedals.push({offset:d,down:!1})}for(const p of r)p.notes=p.notes.filter(u=>u.keyIndex>=0&&u.keyIndex<88);return r}function Ct(l,t){const e=w(l,"durationType")??"quarter";if(e==="measure")return F(w(l,"duration"))||t;const s=yt[e]??1,n=Number(w(l,"dots"))||0;return s*(2-Math.pow(2,-n))}function Vt(l){return M(l,"Spanner").some(t=>t.getAttribute("type")==="Tie"&&k(t,"prev"))||k(l,"endSpanner")!==void 0}function Ft(l,t){const e=(s,n,o,a)=>s<o||s===o&&n<a;l.forEach((s,n)=>{for(const o of s.notes)for(const a of t)!e(n,o.offset,a.startMeasure,a.startBeat)&&e(n,o.offset,a.endMeasure,a.endBeat)&&(o.keyIndex+=a.shift)})}function Rt(l){const t=Math.max(0,...l.map(s=>s.length)),e=Array.from({length:t},Q);for(const s of l){const n=new Map;s.forEach((o,a)=>{k(o,"startRepeat")&&(e[a].forward=!0);const i=k(o,"endRepeat");i&&(e[a].backward=parseInt(i.textContent??"",10)||2);for(const r of M(o)){r.tagName==="Volta"&&r.getAttribute("id")&&n.set(r.getAttribute("id"),{start:a,endings:j(r)});const c=r.tagName==="endSpanner"?n.get(r.getAttribute("id")??""):void 0;if(c){n.delete(r.getAttribute("id"));const p=!M(o).slice(0,M(o).indexOf(r)).some(u=>u.tagName==="Chord"||u.tagName==="Rest");for(let u=c.start;u<(p?a:a+1);u++)e[u].endings=c.endings}}for(const r of Array.from(o.querySelectorAll(':scope > voice > Spanner[type="Volta"], :scope > Spanner[type="Volta"]'))){const c=k(r,"Volta");if(!c)continue;const p=j(c),u=k(k(r,"next")??r,"location"),d=Math.max(1,Number(u&&w(u,"measures"))||1);for(let g=a;g<Math.min(t,a+d);g++)e[g].endings=p}})}return e}const j=l=>(w(l,"endings")??"1").split(/[\s,]+/).map(t=>parseInt(t,10)).filter(t=>t>0),Dt=101010256,qt=33639248,Pt=67324752,It=l=>l.length>=4&&l[0]===80&&l[1]===75&&l[2]===3&&l[3]===4;class Bt{constructor(t){this.bytes=t,this.entries=new Map,this.view=new DataView(t.buffer,t.byteOffset,t.byteLength),this.readCentralDirectory()}get names(){return[...this.entries.keys()]}has(t){return this.entries.has(t)}async readText(t){return et(await this.read(t))}async read(t){const e=this.entries.get(t);if(!e)throw new Error(`Missing file in archive: ${t}`);const s=e.localOffset;if(this.view.getUint32(s,!0)!==Pt)throw new Error(`Corrupt archive entry: ${t}`);const n=s+30+this.view.getUint16(s+26,!0)+this.view.getUint16(s+28,!0),o=this.bytes.subarray(n,n+e.compressedSize);if(e.method===0)return o;if(e.method===8)return Ot(o);throw new Error(`Unsupported compression method ${e.method} for ${t}`)}readCentralDirectory(){const t=this.findEndOfCentralDirectory(),e=this.view.getUint16(t+10,!0);let s=this.view.getUint32(t+16,!0);const n=new TextDecoder("utf-8");for(let o=0;o<e;o++){if(this.view.getUint32(s,!0)!==qt)throw new Error("Corrupt archive: bad central directory");const a=this.view.getUint16(s+28,!0),i=this.view.getUint16(s+30,!0),r=this.view.getUint16(s+32,!0),c=n.decode(this.bytes.subarray(s+46,s+46+a));this.entries.set(c,{name:c,method:this.view.getUint16(s+10,!0),compressedSize:this.view.getUint32(s+20,!0),localOffset:this.view.getUint32(s+42,!0)}),s+=46+a+i+r}}findEndOfCentralDirectory(){const t=this.bytes.length-22,e=Math.max(0,t-65535);for(let s=t;s>=e;s--)if(this.view.getUint32(s,!0)===Dt)return s;throw new Error("Not a valid ZIP archive")}}async function Ot(l){const t=new Blob([l]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(t).arrayBuffer())}function et(l){return l[0]===255&&l[1]===254?new TextDecoder("utf-16le").decode(l):l[0]===254&&l[1]===255?new TextDecoder("utf-16be").decode(l):new TextDecoder("utf-8").decode(l)}const Lt=".musicxml,.xml,.mxl,.mscz,.mscx";async function Gt(l){const t=new Uint8Array(await l.arrayBuffer()),e=It(t)?await $t(new Bt(t)):et(t);return _t(e)}function _t(l){return/<museScore[\s>]/.test(l)?At(l):tt(l)}const Ut=/\.(mscx?|musicxml|xml)$/i;async function $t(l){if(l.has("META-INF/container.xml")){const e=new DOMParser().parseFromString(await l.readText("META-INF/container.xml"),"text/xml"),s=Array.from(e.querySelectorAll("rootfile")).map(n=>n.getAttribute("full-path")??"").find(n=>Ut.test(n)&&l.has(n));if(s)return l.readText(s)}const t=l.names.find(e=>/\.mscx?$/i.test(e))??l.names.find(e=>/\.(musicxml|xml)$/i.test(e)&&!e.startsWith("META-INF/"));if(!t)throw new Error("No score found in the archive");return l.readText(t)}const zt=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],Kt=25,Yt=.3,jt=80/127;class Ht{constructor(t){this.soundType="grand",this.activeKeys=new Set,this.isAutoPlaying=!1,this.tempoMultiplier=1,this.stopAutoPlayRequested=!1,this.currentScore=null,this.keyElements=new Map,this.container=t,this.audio=new P,this.render()}setSoundType(t){this.soundType=t,this.updateUI()}setPedal(t){this.audio.setPedal(t)}async loadMusicXml(t){try{return this.currentScore=tt(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to parse MusicXML:",e),e}}async loadScoreFile(t){try{return this.currentScore=await Gt(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to load score:",e),e}}async playScore(t){const e=t||this.currentScore;if(!e||this.isAutoPlaying)return;this.isAutoPlaying=!0,this.stopAutoPlayRequested=!1,this.updateUI();const s=e.notes;this.soundType==="grand"&&await this.audio.preloadGrand(s);const n=Math.max(0,...s.map(r=>r.time+(r.duration??.8)));let o=-.1,a=this.audio.currentTime,i=0;await new Promise(r=>{const c=()=>{if(this.stopAutoPlayRequested){clearInterval(p),r();return}const u=this.audio.currentTime;o+=(u-a)*this.tempoMultiplier,a=u;const d=o+Yt*this.tempoMultiplier;for(;i<s.length&&s[i].time<=d;){const g=s[i++],b=u+(g.time-o)/this.tempoMultiplier;this.playNote(g.keyIndex,(g.duration||.8)/this.tempoMultiplier,g.velocity??jt,b)}i>=s.length&&o>=n&&(clearInterval(p),r())},p=setInterval(c,Kt);c()}),this.stopAutoPlayRequested&&this.audio.dampAll(),this.isAutoPlaying=!1,this.updateUI()}stopScore(){this.stopAutoPlayRequested=!0,this.audio.dampAll()}playNote(t,e=2.5,s=.8,n){if(this.audio.playNote(t,this.soundType,e,s,n),n===void 0)this.highlightKey(t);else{const o=Math.max(0,(n-this.audio.currentTime)*1e3);setTimeout(()=>this.highlightKey(t),o)}}highlightKey(t){const e=this.keyElements.get(t);e&&(e.classList.contains("sp-black-key"),e.classList.add("sp-active"),setTimeout(()=>e.classList.remove("sp-active"),250))}velocityFromPoint(t,e){const s=(t-e.top)/e.height,n=1-Math.max(0,Math.min(1,s));return Math.max(.06,Math.min(1,n))}render(){this.container.innerHTML=`
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
                  <input type="file" id="sp-xml-import" style="display:none" accept="${Lt}">
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
    `,this.setupEvents(),this.renderKeys(),this.renderSoundSelector()}setupEvents(){const t=this.container.querySelector("#sp-import-btn"),e=this.container.querySelector("#sp-xml-import"),s=this.container.querySelector("#sp-play-btn"),n=this.container.querySelector("#sp-stop-btn");t.onclick=()=>e.click(),e.onchange=async p=>{const u=p.target.files[0];if(e.value="",!!u)try{await this.loadScoreFile(u)}catch(d){alert(`Cannot read ${u.name}: ${d instanceof Error?d.message:d}`)}},s.onclick=()=>this.playScore(),n.onclick=()=>this.stopScore();const o=this.container.querySelector("#sp-pedal-btn");o.onclick=()=>{const p=!this.audio.pedal;this.audio.setPedal(p),o.classList.toggle("sp-pedal-on",p),o.setAttribute("aria-pressed",String(p))};const a=this.container.querySelector("#sp-vol-down"),i=this.container.querySelector("#sp-vol-up"),r=this.container.querySelector("#sp-tempo-down"),c=this.container.querySelector("#sp-tempo-up");a.onclick=()=>{this.audio.volume=Math.round((this.audio.volume-.1)*10)/10,this.updateUI()},i.onclick=()=>{this.audio.volume=Math.round((this.audio.volume+.1)*10)/10,this.updateUI()},r.onclick=()=>{this.tempoMultiplier=Math.max(.25,Math.round((this.tempoMultiplier-.25)*4)/4),this.updateUI()},c.onclick=()=>{this.tempoMultiplier=Math.min(2,Math.round((this.tempoMultiplier+.25)*4)/4),this.updateUI()}}renderKeys(){const t=this.container.querySelector("#sp-white-keys"),e=this.container.querySelector("#sp-keys-bed");t.innerHTML="",this.keyElements.clear();let s=0;const n=[],o=[];for(let i=0;i<88;i++){const r=(i+9)%12,c=zt[r],p=Math.floor((i+9)/12);c.includes("#")?o.push({i,noteName:c,octave:p,whiteBefore:s}):(n.push({i,noteName:c,octave:p}),s++)}n.forEach(i=>{const r=document.createElement("div");if(r.className="sp-white-key",r.onmousedown=c=>this.playNote(i.i,2.5,this.velocityFromPoint(c.clientY,r.getBoundingClientRect())),r.ontouchstart=c=>{c.preventDefault(),this.playNote(i.i,2.5,this.velocityFromPoint(c.touches[0].clientY,r.getBoundingClientRect()))},i.noteName==="C"||i.i===0||i.i===87){const c=document.createElement("div");c.className="sp-key-label",c.textContent=`${i.noteName}${i.octave}`,r.appendChild(c)}t.appendChild(r),this.keyElements.set(i.i,r)});const a=1/52*100*.6;o.forEach(i=>{const r=document.createElement("div");r.className="sp-black-key";const c=i.whiteBefore/52*100;r.style.left=`${c-a/2}%`,r.style.width=`${a}%`,r.onmousedown=p=>this.playNote(i.i,2.5,this.velocityFromPoint(p.clientY,r.getBoundingClientRect())),r.ontouchstart=p=>{p.preventDefault(),this.playNote(i.i,2.5,this.velocityFromPoint(p.touches[0].clientY,r.getBoundingClientRect()))},e.appendChild(r),this.keyElements.set(i.i,r)})}renderSoundSelector(){const t=this.container.querySelector("#sp-sound-selector"),e=Object.keys(q);t.innerHTML=e.map(s=>`<button class="sp-sound-btn ${this.soundType===s?"sp-selected":""}" data-type="${s}">${q[s].name}</button>`).join(""),t.querySelectorAll("button").forEach(s=>{s.onclick=()=>this.setSoundType(s.getAttribute("data-type"))})}updateUI(){const t=this.container.querySelector("#sp-play-btn"),e=this.container.querySelector("#sp-stop-btn"),s=this.container.querySelector("#sp-title"),n=this.container.querySelector("#sp-subtitle"),o=this.container.querySelector("#sp-icon");this.isAutoPlaying?(o.classList.add("sp-playing"),n.textContent="Automated Performance System"):(o.classList.remove("sp-playing"),n.textContent="Integrated Synthesis System"),this.currentScore&&(t.style.display=this.isAutoPlaying?"none":"flex",e.style.display=this.isAutoPlaying?"flex":"none",s.textContent=this.isAutoPlaying?`PLAYING: ${this.currentScore.title}`:`SCORE: ${this.currentScore.title}`);const a=this.container.querySelector("#sp-vol-value"),i=this.container.querySelector("#sp-tempo-value");a&&(a.textContent=`${Math.round(this.audio.volume*100)}%`),i&&(i.textContent=`${this.tempoMultiplier.toFixed(2).replace(/0$/,"")}×`),this.renderSoundSelector()}}const H=document.getElementById("piano-container");H&&new Ht(H);
