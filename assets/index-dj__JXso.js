(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function e(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(n){if(n.ep)return;n.ep=!0;const o=e(n);fetch(n.href,o)}})();const L={grand:{name:"Sodor Grand",oscTypes:["sine","sine","sine","sine","sine","sine","sine"],gains:[.35,.2,.14,.09,.06,.04,.025],detune:[0,1200,1904,2404,2791,3110,3379],decayRates:[1,1.4,2,2.8,3.8,5,6.5],hammerNoise:.08,filterType:"lowpass",filterFreq:5e3,filterEndFreq:1e3,attack:.003,decay:2.5,sustain:.008,release:.6},electric:{name:"Electric Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,1200],attack:.01,decay:1,sustain:.3,release:.5},synth:{name:"Tidmouth Synth",oscTypes:["sawtooth","square"],gains:[.3,.2],detune:[0,5],filterType:"lowpass",filterFreq:1200,filterEndFreq:400,attack:.1,decay:.5,sustain:.5,release:1.2},organ:{name:"Vicarstown Organ",oscTypes:["sine","sine","sine"],gains:[.4,.2,.2],detune:[0,1200,1900],attack:.05,decay:.1,sustain:1,release:.8},whistle:{name:"Steam Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,2],filterType:"highpass",filterFreq:800,attack:.2,decay:.3,sustain:.7,release:.5},bell:{name:"Station Bell",oscTypes:["sine","sine","triangle"],gains:[.4,.3,.2],detune:[0,1200,2400],attack:.002,decay:2,sustain:.01,release:2}},q=1e-4,it=69,ct=c=>c<24?.15:c<48?.09:.06,lt=[{name:"p",below:.42,reference:.3},{name:"m",below:.72,reference:.57},{name:"f",below:1/0,reference:.85}],R=class R{constructor(){this.ctx=null,this.masterGainNode=null,this.compressor=null,this.reverb=null,this._volume=.8,this.activeVoices=[],this.maxPolyphony=64,this._pedalDown=!1,this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this.RES_FREQS=[55,65.41,77.78,92.5,110,130.81,155.56,185,220,261.63,311.13,369.99,440,523.25,622.25,740,880,1046.5,1244.5,1480,1760,2093,2489,2960,3520,4186],this.sampleCache=new Map,this.sampleLoads=new Map}get sampleBase(){return"/SodorPiano/".replace(/\/$/,"")+"/assets/samples/"}loadSample(t,e){const s=this.sampleCache.get(e);if(s)return Promise.resolve(s);const n=this.sampleLoads.get(e);if(n)return n;const o=fetch(this.sampleBase+e).then(a=>{if(!a.ok)throw new Error("HTTP "+a.status);return a.arrayBuffer()}).then(a=>t.decodeAudioData(a)).then(a=>(this.sampleCache.set(e,a),this.sampleLoads.delete(e),a)).catch(a=>{throw this.sampleLoads.delete(e),a});return this.sampleLoads.set(e,o),o}get pedal(){return this._pedalDown}get canResonate(){return this._pedalDown||this.activeVoices.length>0}get volume(){return this._volume}set volume(t){this._volume=Math.max(0,Math.min(1,t)),this.masterGainNode&&this.ctx&&this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime)}initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGainNode=this.ctx.createGain(),this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-18,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(4,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGainNode.connect(this.compressor),this.compressor.connect(this.ctx.destination),this.reverb=this.ctx.createConvolver(),this.reverb.buffer=pt(this.ctx);const t=this.ctx.createGain();t.gain.setValueAtTime(.5,this.ctx.currentTime),this.masterGainNode.connect(this.reverb),this.reverb.connect(t),t.connect(this.compressor),this.initResonance(this.ctx)}return this.ctx.state==="suspended"&&this.ctx.resume(),this.ctx}get output(){return this.masterGainNode}get currentTime(){return this.initCtx().currentTime}async preloadGrand(t){const e=this.initCtx(),s=new Set(t.map(n=>this.grandSample(n.keyIndex,n.velocity??.8).file));await Promise.allSettled([...s].map(n=>this.loadSample(e,n)))}dampVoice(t,e,s=.012){if(t.damper){if(e<t.startTime){t.damper.disconnect(),t.stopTime=e;return}const a=e+s*9,l=t.damping;if(l&&l.at<=e&&l.end<=a)return;const r=!l||e<=l.at?1:e>=l.end?q:l.from*Math.pow(q/l.from,(e-l.at)/(l.end-l.at));t.damper.gain.cancelScheduledValues(e),t.damper.gain.setValueAtTime(r,e),t.damper.gain.exponentialRampToValueAtTime(q,a),t.damping={from:r,at:e,end:a},t.stopScheduled||(t.sources.forEach(i=>{try{i.stop(a)}catch{}}),t.stopScheduled=!0),t.stopTime=Math.min(t.stopTime,a);return}const n=.03;t.gainNode.gain.cancelScheduledValues(e);const o=Math.max(t.gainNode.gain.value,1e-4);t.gainNode.gain.setValueAtTime(o,e),t.gainNode.gain.exponentialRampToValueAtTime(1e-4,e+n),t.oscillators.forEach(a=>{try{a.stop(e+n+.01)}catch{}}),t.sources.forEach(a=>{try{a.stop(e+n+.01)}catch{}})}dampAll(){if(!this.ctx)return;const t=this.ctx.currentTime;this.activeVoices.forEach(e=>this.dampVoice(e,t)),this.activeVoices=[]}setPedal(t){if(t===this._pedalDown||(this._pedalDown=t,!this.ctx))return;const e=this.ctx.currentTime;if(!t){const s=[...this.activeVoices];this.activeVoices=[],s.forEach(n=>this.dampVoice(n,e))}}initResonance(t){this.resonanceInput||(this.resonanceInput=t.createGain(),this.resonanceOutput=t.createGain(),this.resonanceFeed=t.createGain(),this.resonanceFeed.gain.setValueAtTime(1,t.currentTime),this.resonanceOutput.gain.setValueAtTime(1e-4,t.currentTime),this.resonanceOutput.gain.linearRampToValueAtTime(.0015,t.currentTime+.5),this.resonators=this.RES_FREQS.map(e=>t.createBiquadFilter()),this.resonators.forEach((e,s)=>{const n=this.RES_FREQS[s];e.type="bandpass";const o=30+s/this.RES_FREQS.length*40;e.frequency.setValueAtTime(n,t.currentTime),e.Q.setValueAtTime(o,t.currentTime),e.gain.setValueAtTime(1,t.currentTime),e.connect(this.resonanceOutput)}),this.resonanceInput.connect(this.resonanceFeed),this.resonators.forEach(e=>this.resonanceFeed.connect(e)),this.resonanceOutput.connect(this.masterGainNode))}managePolyphony(t,e,s=t.currentTime){for(this.activeVoices=this.activeVoices.filter(n=>n.keyIndex===e&&n.startTime<=s?(this.dampVoice(n,s,.04),!1):!0),this.activeVoices=this.activeVoices.filter(n=>n.stopTime>s);this.activeVoices.length>=this.maxPolyphony;){const n=this.activeVoices.shift();this.dampVoice(n,s,.03)}}getFrequency(t){return 27.5*Math.pow(2,t/12)}playNote(t,e="grand",s=1.2,n=.9,o){const a=this.initCtx(),l=Math.max(o??0,a.currentTime);if(this.managePolyphony(a,t,l),e==="grand"){const f=o===void 0&&s>=2;this.playGrandPiano(a,t,s,n,l,f).catch(v=>console.error("[SodorPiano] grand note error:",v));return}const r=L[e],i=l,p=this.getFrequency(t),h=!!r.decayRates,d=a.createGain();if(r.filterType){const f=a.createBiquadFilter();f.type=r.filterType,f.frequency.setValueAtTime(r.filterFreq||2e3,i),r.filterEndFreq&&f.frequency.exponentialRampToValueAtTime(r.filterEndFreq,i+r.decay),d.connect(f),f.connect(this.output)}else d.connect(this.output);if(h?(d.gain.setValueAtTime(1,i),d.gain.setValueAtTime(1,i+s),d.gain.exponentialRampToValueAtTime(.001,i+s+r.release)):(d.gain.setValueAtTime(0,i),d.gain.linearRampToValueAtTime(.4,i+r.attack),d.gain.exponentialRampToValueAtTime(r.sustain*.4,i+r.attack+r.decay),d.gain.exponentialRampToValueAtTime(.001,i+s+r.release)),r.hammerNoise&&r.hammerNoise>0){const f=Math.floor(a.sampleRate*.025),v=a.createBuffer(1,f,a.sampleRate),x=v.getChannelData(0);for(let M=0;M<f;M++)x[M]=Math.random()*2-1;const m=a.createBufferSource();m.buffer=v;const y=a.createBiquadFilter();y.type="bandpass",y.frequency.setValueAtTime(Math.min(p*3,8e3),i),y.Q.setValueAtTime(1,i);const k=a.createGain();k.gain.setValueAtTime(r.hammerNoise,i),k.gain.exponentialRampToValueAtTime(.001,i+.04),m.connect(y),y.connect(k),k.connect(d),m.start(i),m.stop(i+.05)}const u=[];r.oscTypes.forEach((f,v)=>{const x=a.createOscillator(),m=a.createGain();if(x.type=f,x.frequency.setValueAtTime(p,i),r.detune&&r.detune[v]!==void 0&&x.detune.setValueAtTime(r.detune[v],i),h){const y=r.decayRates[v]||1,k=r.gains[v],M=Math.max(1e-4,k*r.sustain);m.gain.setValueAtTime(0,i),m.gain.linearRampToValueAtTime(k,i+r.attack),m.gain.exponentialRampToValueAtTime(M,i+r.attack+r.decay/y),m.gain.exponentialRampToValueAtTime(1e-4,i+s+r.release)}else m.gain.setValueAtTime(r.gains[v],i);x.connect(m),m.connect(d),x.start(i),x.stop(i+s+r.release),u.push(x)}),this.activeVoices.push({keyIndex:t,gainNode:d,startTime:i,stopTime:i+s+r.release,oscillators:u,sources:[]})}grandSample(t,e){const s=R.GRAND_SAMPLE_MAP[t]||R.GRAND_SAMPLE_MAP[39],n=lt.find(a=>e<a.below);return{file:`${s.note.replace("#","s")}_${n.name}.mp3`,rate:s.rate,layer:n}}async playGrandPiano(t,e,s,n,o,a){if(!this.ctx||this.ctx.state==="closed")return;const l=this.ctx,r=Math.max(.05,Math.min(1,n)),{file:i,rate:p,layer:h}=this.grandSample(e,r);let d;try{d=await this.loadSample(l,i)}catch(g){console.error("[SodorPiano] failed to load sample",i,g),this.playGrandSynthFallback(l,e,s,r);return}const u=Math.max(o,l.currentTime),f=l.createBufferSource();f.buffer=d,f.playbackRate.setValueAtTime(p,u);const v=l.createGain(),x=.9*Math.min(1.4,Math.max(.5,r/h.reference));v.gain.setValueAtTime(0,u),v.gain.linearRampToValueAtTime(x,u+.003);const m=l.createGain();m.gain.setValueAtTime(1,u);const y=l.createBiquadFilter();y.type="peaking";const k=this.getFrequency(e);if(y.frequency.setValueAtTime(k<200?120:420,u),y.Q.setValueAtTime(.8,u),y.gain.setValueAtTime(k<200?2:1.2,u),f.connect(v),v.connect(m),m.connect(y),y.connect(this.output),this.canResonate&&this.resonanceInput){const g=l.createGain();g.gain.setValueAtTime(.18*r,u),g.gain.exponentialRampToValueAtTime(1e-4,u+.2),v.connect(g),g.connect(this.resonanceInput)}const M=u+d.duration/p,C={keyIndex:e,gainNode:v,damper:m,startTime:u,stopTime:M,oscillators:[],sources:[f]};f.start(u),!a&&e<it&&this.dampVoice(C,u+Math.max(.03,s),ct(e)),this.activeVoices.push(C)}playGrandSynthFallback(t,e,s,n=.9){const o=t.currentTime,a=this.getFrequency(e),l=t.createGain(),r=Math.max(.05,Math.min(1,n)),i=.5*(.3+.7*r);l.gain.setValueAtTime(0,o),l.gain.linearRampToValueAtTime(i,o+.004),l.gain.exponentialRampToValueAtTime(1e-4,o+s+.3),l.connect(this.output);const p=[],h=[1,2,3,4,5],d=[1,.45,.25,.14,.08];for(let u=0;u<h.length;u++){const f=t.createOscillator(),v=t.createGain();f.type="sine",f.frequency.setValueAtTime(a*h[u]*(1+3e-4*h[u]*h[u]),o),v.gain.setValueAtTime(d[u]*(.3+.7*r),o),v.gain.exponentialRampToValueAtTime(1e-4,o+s+.3),f.connect(v),v.connect(l),f.start(o),f.stop(o+s+.35),p.push(f)}this.activeVoices.push({keyIndex:e,gainNode:l,startTime:o,stopTime:o+s+.35,oscillators:p,sources:[]})}close(){this.ctx&&(this.activeVoices=[],this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this._pedalDown=!1,this.ctx.close(),this.ctx=null,this.compressor=null,this.reverb=null)}};R.GRAND_SAMPLE_MAP=[{note:"A0",rate:1},{note:"A0",rate:1.059463},{note:"C1",rate:.943874},{note:"C1",rate:1},{note:"C1",rate:1.059463},{note:"D#1",rate:.943874},{note:"D#1",rate:1},{note:"D#1",rate:1.059463},{note:"F#1",rate:.943874},{note:"F#1",rate:1},{note:"F#1",rate:1.059463},{note:"A1",rate:.943874},{note:"A1",rate:1},{note:"A1",rate:1.059463},{note:"C2",rate:.943874},{note:"C2",rate:1},{note:"C2",rate:1.059463},{note:"D#2",rate:.943874},{note:"D#2",rate:1},{note:"D#2",rate:1.059463},{note:"F#2",rate:.943874},{note:"F#2",rate:1},{note:"F#2",rate:1.059463},{note:"A2",rate:.943874},{note:"A2",rate:1},{note:"A2",rate:1.059463},{note:"C3",rate:.943874},{note:"C3",rate:1},{note:"C3",rate:1.059463},{note:"D#3",rate:.943874},{note:"D#3",rate:1},{note:"D#3",rate:1.059463},{note:"F#3",rate:.943874},{note:"F#3",rate:1},{note:"F#3",rate:1.059463},{note:"A3",rate:.943874},{note:"A3",rate:1},{note:"A3",rate:1.059463},{note:"C4",rate:.943874},{note:"C4",rate:1},{note:"C4",rate:1.059463},{note:"D#4",rate:.943874},{note:"D#4",rate:1},{note:"D#4",rate:1.059463},{note:"F#4",rate:.943874},{note:"F#4",rate:1},{note:"F#4",rate:1.059463},{note:"A4",rate:.943874},{note:"A4",rate:1},{note:"A4",rate:1.059463},{note:"C5",rate:.943874},{note:"C5",rate:1},{note:"C5",rate:1.059463},{note:"D#5",rate:.943874},{note:"D#5",rate:1},{note:"D#5",rate:1.059463},{note:"F#5",rate:.943874},{note:"F#5",rate:1},{note:"F#5",rate:1.059463},{note:"A5",rate:.943874},{note:"A5",rate:1},{note:"A5",rate:1.059463},{note:"C6",rate:.943874},{note:"C6",rate:1},{note:"C6",rate:1.059463},{note:"D#6",rate:.943874},{note:"D#6",rate:1},{note:"D#6",rate:1.059463},{note:"F#6",rate:.943874},{note:"F#6",rate:1},{note:"F#6",rate:1.059463},{note:"A6",rate:.943874},{note:"A6",rate:1},{note:"A6",rate:1.059463},{note:"C7",rate:.943874},{note:"C7",rate:1},{note:"C7",rate:1.059463},{note:"D#7",rate:.943874},{note:"D#7",rate:1},{note:"D#7",rate:1.059463},{note:"F#7",rate:.943874},{note:"F#7",rate:1},{note:"F#7",rate:1.059463},{note:"A7",rate:.943874},{note:"A7",rate:1},{note:"A7",rate:1.059463},{note:"C8",rate:.943874},{note:"C8",rate:1}];let O=R;function pt(c){const e=Math.floor(.012*c.sampleRate),s=Math.floor(1.6*c.sampleRate),n=c.createBuffer(2,s,c.sampleRate);for(let o=0;o<2;o++){const a=n.getChannelData(o);let l=0;for(let r=e;r<s;r++){const i=(r-e)/c.sampleRate,p=.25+.7*Math.min(1,i/1.6);l=p*l+(1-p)*(Math.random()*2-1),a[r]=l*Math.exp(-6.9*i/1.6)}}return n}const J=()=>({length:0,notes:[],tempos:[],dynamics:[],hairpins:[],pedals:[]}),tt=()=>({forward:!1,backward:0,endings:null}),ut=80/127,dt=120,ht=2e4,V=1e-6,$={pppppp:1,ppppp:5,pppp:10,ppp:16,pp:33,p:49,mp:64,mf:80,f:96,ff:112,fff:126,ffff:127,fffff:127,ffffff:127},z={sf:[112,void 0],sfz:[112,void 0],sffz:[126,void 0],fz:[112,void 0],rf:[112,void 0],rfz:[112,void 0],fp:[96,49],sfp:[112,49],sfpp:[112,33],pf:[49,96]};function et(c,t,e){const s=c.toLowerCase();if(s in $)return{offset:t,velocity:(e??$[s])/127};if(s in z){const[n,o]=z[s];return{offset:t,velocity:(e??n)/127,momentary:!0,after:o===void 0?void 0:o/127}}return null}function ft(c){const t=[],e=new Map;let s=0,n=1,o=!1;for(let a=0;a<c.length&&t.length<ht;){const l=c[a];o&&!l.endings&&(s=a,n=1,o=!1),l.forward&&a!==s&&(s=a,n=1);const r=l.endings!==null&&!l.endings.includes(n);if(r||t.push(a),l.backward>0){const i=e.get(a)??1;if(!r&&i<l.backward){e.set(a,i+1),n=i+1,o=!1,a=s;continue}e.set(a,l.backward),o=!0}a++}return t}function st(c,t,e,s=t.map((n,o)=>o)){const n=ft(e),o=Math.max(0,...t.map(x=>x.length)),a=[];for(let x=0;x<o;x++)a.push(Math.max(0,...t.map(m=>{var y;return((y=m[x])==null?void 0:y.length)??0})));const l=[];let r=0;for(const x of n)l.push(r),r+=a[x];const i=[],p=new Map,h=new Map,d=new Map;t.forEach((x,m)=>{const y=s[m];p.has(y)||(p.set(y,[]),h.set(y,[]),d.set(y,[])),n.forEach((k,M)=>{const C=x[k];if(!C)return;const g=l[M];for(const b of C.tempos)i.push({...b,offset:g+b.offset});for(const b of C.dynamics)p.get(y).push({...b,offset:g+b.offset});for(const b of C.hairpins)h.get(y).push({...b,offset:g+b.offset});for(const b of C.pedals)d.get(y).push({...b,offset:g+b.offset})})});const u=xt(i),f=new Map([...d].map(([x,m])=>[x,yt(m,r)])),v=[];return t.forEach((x,m)=>{const y=s[m],k=bt(p.get(y),h.get(y),r),M=f.get(y),C=new Map,g=[];n.forEach((b,A)=>{var T;for(const N of((T=x[b])==null?void 0:T.notes)??[]){const P=l[A]+N.offset,G=P+N.duration*(N.held??1),_=N.tieStop?C.get(N.keyIndex):void 0;if(_)_.release=G;else{const rt=Math.max(.05,Math.min(1,k(P)*(N.accent??1))),U={keyIndex:N.keyIndex,start:P,release:G,velocity:rt};g.push(U),C.set(N.keyIndex,U)}}});for(const b of g){const A=u(b.start);v.push({keyIndex:b.keyIndex,time:A,duration:u(M(b.release))-A,velocity:b.velocity})}}),{id:`imported-${Date.now()}`,title:c,thumbnail:"🎼",notes:v.sort((x,m)=>x.time-m.time)}}function mt(c,t){let e=ut,s;for(const n of c){if(n.offset>t+V)break;n.momentary?n.after!==void 0&&(e=n.after):e=n.velocity,s=n.momentary&&Math.abs(n.offset-t)<V?n.velocity:void 0}return{level:e,hit:s}}const I=[16,33,49,64,80,96,112,126].map(c=>c/127);function gt(c,t){const e=.003937007874015748;return t>0?I.find(s=>s>c+e)??1:[...I].reverse().find(s=>s<c-e)??I[0]}function bt(c,t,e){const s=[...c].sort((p,h)=>p.offset-h.offset),n=s.filter(p=>!p.momentary||p.after!==void 0),o=[],a=p=>{const{level:h,hit:d}=mt(s,p);if(d!==void 0)return d;const u=o.find(f=>p>=f.start-V&&p<f.end-V);return u?u.from+(u.to-u.from)*(p-u.start)/(u.end-u.start):h},l=[];let r=null;const i=[...t].sort((p,h)=>p.offset-h.offset||+(p.kind!=="end")-+(h.kind!=="end"));for(const p of i)r&&p.offset>r.start+V&&l.push({...r,end:p.offset}),p.kind==="end"?r=null:(!r||p.offset>r.start+V)&&(r={kind:p.kind,start:p.offset});r&&e>r.start+V&&l.push({...r,end:e});for(const p of l){const h=a(p.start),d=n.find(m=>m.offset>p.start+V&&m.offset<p.end-V),u=d?d.offset:p.end,f=n.find(m=>Math.abs(m.offset-u)<V),v=p.kind==="cresc"?1:-1,x=f&&Math.sign(f.velocity-h)===v?f.velocity:gt(h,v);o.push({start:p.start,end:u,from:h,to:x}),f||(s.push({offset:u,velocity:x}),s.sort((m,y)=>m.offset-y.offset))}return a}function yt(c,t){const e=[];let s=null;for(const n of[...c].sort((o,a)=>o.offset-a.offset||Number(o.down)-Number(a.down)))n.down&&s===null&&(s=n.offset),!n.down&&s!==null&&(e.push([s,n.offset]),s=null);return s!==null&&e.push([s,t]),n=>{const o=e.find(([a,l])=>n>a+V&&n<l);return o?o[1]:n}}function xt(c){var s;const t=c.filter(n=>n.bpm>0).sort((n,o)=>n.offset-o.offset),e=[{beat:0,seconds:0,secondsPerBeat:60/(((s=t[0])==null?void 0:s.bpm)??dt)}];for(const n of t){const o=e[e.length-1],a=o.seconds+(n.offset-o.beat)*o.secondsPerBeat;e.push({beat:n.offset,seconds:a,secondsPerBeat:60/n.bpm})}return n=>{let o=e[0];for(const a of e){if(a.beat>n)break;o=a}return o.seconds+(n-o.beat)*o.secondsPerBeat}}const H={C:0,D:2,E:4,F:5,G:7,A:9,B:11},vt=.125,K={staccatissimo:.33,spiccato:.33,staccato:.5,"detached-legato":.67,"strong-accent":.67,tenuto:1},Y={accent:1.5,"strong-accent":1.2},nt=(c,t)=>{var e;return((e=c.querySelector(t))==null?void 0:e.textContent)??void 0},F=(c,t,e)=>{const s=parseFloat(nt(c,t)??"");return Number.isFinite(s)?s:e},ot=c=>{var a,l;const e=new DOMParser().parseFromString(c,"text/xml");if(e.querySelector("parsererror"))throw new Error("The file is not valid XML");if(!e.querySelector("score-partwise"))throw new Error(e.querySelector("score-timewise")?"Timewise MusicXML is not supported; export the score as partwise MusicXML":"Not a MusicXML score");const s=((a=e.querySelector("work-title"))==null?void 0:a.textContent)||((l=e.querySelector("movement-title"))==null?void 0:l.textContent)||"Imported Melody",n=Array.from(e.querySelectorAll("part")),o=r=>Array.from(r.children).filter(i=>i.tagName==="measure");return st(s,n.map(r=>wt(o(r))),n.length?Tt(o(n[0])):[])};function wt(c){let t=1;return c.map(e=>{const s=J();let n=0,o=0,a=0;const l=(i,p,h)=>{if(!i)return;const d=p/t,u=parseFloat(i.getAttribute("tempo")??"");u>0&&s.tempos.push({offset:d,bpm:u});const f=parseFloat(i.getAttribute("dynamics")??"");f>=0&&!h.dynamic&&s.dynamics.push({offset:d,velocity:Math.min(1,f*.9/127)});const v=i.getAttribute("damper-pedal");v&&!h.pedal&&s.pedals.push({offset:d,down:v!=="no"})},r=(i,p)=>{const h=p/t,d=i.querySelector(":scope > sound"),u=parseFloat((d==null?void 0:d.getAttribute("dynamics"))??"");let f=!1;for(const x of Array.from(i.querySelectorAll("direction-type > dynamics > *"))){const m=et(x.tagName,h,u>=0?Math.min(127,u*.9):void 0);m&&(s.dynamics.push(m),f=!0)}for(const x of Array.from(i.querySelectorAll("direction-type > wedge"))){const m=x.getAttribute("type");m==="crescendo"&&s.hairpins.push({offset:h,kind:"cresc"}),m==="diminuendo"&&s.hairpins.push({offset:h,kind:"dim"}),m==="stop"&&s.hairpins.push({offset:h,kind:"end"})}let v=!1;for(const x of Array.from(i.querySelectorAll("direction-type > pedal"))){const m=x.getAttribute("type");(m==="stop"||m==="change")&&s.pedals.push({offset:h,down:!1}),(m==="start"||m==="change"||m==="resume")&&s.pedals.push({offset:h,down:!0}),m==="discontinue"&&s.pedals.push({offset:h,down:!1}),v=!0}l(d,p,{dynamic:f,pedal:v})};for(const i of Array.from(e.children))switch(i.tagName){case"attributes":t=F(i,"divisions",t);break;case"direction":r(i,n+F(i,":scope > offset",0));break;case"sound":l(i,n,{dynamic:!1,pedal:!1});break;case"forward":n+=F(i,"duration",0),o=Math.max(o,n);break;case"backup":n-=F(i,"duration",0);break;case"note":{if(i.querySelector("cue"))break;const p=i.querySelector("grace")!==null,h=i.querySelector("chord")!==null,d=p?0:F(i,":scope > duration",0),u=h?a:n,f=nt(i,"pitch > step");if(i.querySelector("rest")===null&&f&&f in H){const v=F(i,"pitch > octave",4),x=Math.round(F(i,"pitch > alter",0)),m=v*12+H[f]+x-9;m>=0&&m<88&&s.notes.push({keyIndex:m,offset:u/t,duration:p?vt:d/t,tieStop:i.querySelector('tie[type="stop"]')!==null,...At(i)})}!h&&!p&&(a=n,n+=d,o=Math.max(o,n));break}}return s.length=o/t,s})}function At(c){const t={};for(const e of Array.from(c.querySelectorAll("notations > articulations > *")))e.tagName in K&&(t.held=Math.min(t.held??1,K[e.tagName])),e.tagName in Y&&(t.accent=Math.max(t.accent??1,Y[e.tagName]));return t}function Tt(c){let t=null;return c.map(e=>{const s=tt();s.endings=t;for(const n of Array.from(e.querySelectorAll(":scope > barline"))){const o=n.querySelector("repeat");(o==null?void 0:o.getAttribute("direction"))==="forward"&&(s.forward=!0),(o==null?void 0:o.getAttribute("direction"))==="backward"&&(s.backward=parseInt(o.getAttribute("times")??"",10)||2);const a=n.querySelector("ending");a&&(a.getAttribute("type")==="start"?(t=(a.getAttribute("number")??"1").split(/[\s,]+/).map(l=>parseInt(l,10)).filter(l=>l>0),s.endings=t):(s.endings=s.endings??t,t=null))}return s})}const kt={long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,"16th":1/4,"32nd":1/8,"64th":1/16,"128th":1/32,"256th":1/64,"512th":1/128,"1024th":1/256},j={"8va":12,"8vb":-12,"15ma":24,"15mb":-24,"22ma":36,"22mb":-36},St=/^(acciaccatura|appoggiatura|grace\d+(after)?)$/,Mt=.125,Et=21,E=(c,t)=>Array.from(c.children).filter(e=>!t||e.tagName===t),S=(c,t)=>E(c,t)[0],w=(c,t)=>{var e,s;return(s=(e=S(c,t))==null?void 0:e.textContent)==null?void 0:s.trim()},D=c=>{const[t,e]=(c??"").split("/").map(Number);return t&&e?t/e*4:0},Nt=c=>{const t=new DOMParser().parseFromString(c,"text/xml");if(t.querySelector("parsererror"))throw new Error("The file is not valid XML");const e=t.documentElement,s=parseFloat(e.getAttribute("version")??"0");if(e.tagName!=="museScore")throw new Error("Not a MuseScore file");if(s<2)throw new Error("MuseScore 1 files are not supported; open and save the score in a later version of MuseScore");const n=S(e,"Score");if(!n)throw new Error("No score found in the MuseScore file");const{percussion:o,partOf:a}=Vt(n),l=E(n,"Staff").filter(p=>!o.has(p.getAttribute("id")??"")),r=l.map(p=>E(p,"Measure")),i=Number(w(n,"Division"))||480;return st(Ct(n),r.map(p=>Pt(p,i)),Lt(r),l.map((p,h)=>a.get(p.getAttribute("id")??"")??-1-h))};function Ct(c){var e,s,n,o;const t=E(c,"metaTag").find(a=>a.getAttribute("name")==="workTitle");if((e=t==null?void 0:t.textContent)!=null&&e.trim())return t.textContent.trim();for(const a of Array.from(c.querySelectorAll(":scope > Staff > VBox > Text")))if(((s=w(a,"style"))==null?void 0:s.toLowerCase())==="title"){const l=(o=(n=S(a,"text"))==null?void 0:n.textContent)==null?void 0:o.trim();if(l)return l}return"Imported Melody"}function Vt(c){const t=new Set,e=new Map;return E(c,"Part").forEach((s,n)=>{var o;for(const a of E(s,"Staff")){const l=a.getAttribute("id")??"";e.set(l,n),((o=S(a,"StaffType"))==null?void 0:o.getAttribute("group"))==="percussion"&&t.add(l)}}),{percussion:t,partOf:e}}const Ft=[[/staccatissimo/i,.33],[new RegExp("(?<!tenuto)staccato","i"),.5],[/tenutoStaccato|portato/i,.67],[/marcato(?!tenuto)/i,.67],[/tenuto/i,1]],Rt=[[/accent|sforzato/i,1.5],[/marcato/i,1.2]];function Dt(c){const t={};for(const e of E(c,"Articulation")){if(w(e,"play")==="0")continue;const s=w(e,"subtype")??"",n=Ft.filter(([a])=>a.test(s)).map(([,a])=>a);n.length&&(t.held=Math.min(t.held??1,...n));const o=Rt.filter(([a])=>a.test(s)).map(([,a])=>a);o.length&&(t.accent=Math.max(t.accent??1,...o))}return t}function B(c,t,e){const s=S(S(c,"next")??c,"location");return{startMeasure:t,startBeat:e,endMeasure:t+(Number(s&&w(s,"measures"))||0),endBeat:e+D(s&&w(s,"fractions"))}}function Pt(c,t){var p,h;let e=4,s=1,n=0;const o=[],a=[],l=[],r=new Map,i=c.map((d,u)=>{const f=J(),v=E(d,"voice");let x=0;for(const m of v.length?v:[d]){let y=0;const k=[],M=new Map,C=g=>{const b=w(g,"Tuplet");return b&&M.has(b)?M.get(b):k.reduce((A,T)=>A*T,1)};for(const g of E(m)){switch(g.tagName){case"TimeSig":{const b=Number(w(g,"sigN")),A=Number(w(g,"sigD")),T=Number(w(g,"stretchN")),N=Number(w(g,"stretchD"));s=T&&N?T/N:1,b&&A&&(e=b/A*4/s);break}case"Tempo":{const b=parseFloat(w(g,"tempo")??"");b>0&&f.tempos.push({offset:y,bpm:b*60});break}case"tick":y=Number(g.textContent)/t-n;break;case"location":y+=D(w(g,"fractions"));break;case"Tuplet":{const b=Number(w(g,"normalNotes")),A=Number(w(g,"actualNotes"));if(b&&A){const T=g.getAttribute("id");T?M.set(T,b/A):k.push(b/A)}break}case"endTuplet":k.pop();break;case"Dynamic":{const b=Number(w(g,"velocity")),A=et(w(g,"subtype")??"",y,b>0?b:void 0);A&&f.dynamics.push(A);break}case"Pedal":case"Ottava":case"HairPin":{const b=g.getAttribute("id");b&&r.set(b,{measure:u,beat:y,element:g});break}case"endSpanner":{const b=r.get(g.getAttribute("id")??"");if(!b)break;r.delete(g.getAttribute("id")??"");const A={startMeasure:b.measure,startBeat:b.beat,endMeasure:u,endBeat:y},T=b.element;T.tagName==="Pedal"&&a.push(A),T.tagName==="Ottava"&&o.push({...A,shift:j[w(T,"subtype")??""]??0}),T.tagName==="HairPin"&&l.push({...A,kind:Q(T)});break}case"Spanner":{const b=S(g,"Ottava");g.getAttribute("type")==="Ottava"&&b&&o.push({...B(g,u,y),shift:j[w(b,"subtype")??""]??0}),g.getAttribute("type")==="Pedal"&&S(g,"Pedal")&&a.push(B(g,u,y));const A=S(g,"HairPin");g.getAttribute("type")==="HairPin"&&A&&l.push({...B(g,u,y),kind:Q(A)});break}case"Rest":case"Chord":{const b=E(g).some(T=>St.test(T.tagName)),A=b?0:qt(g,e*s)*C(g)/s;if(g.tagName==="Chord")for(const T of E(g,"Note")){if(w(T,"play")==="0")continue;const N=Number(w(T,"pitch"));Number.isFinite(N)&&f.notes.push({keyIndex:N-Et,offset:y,duration:b?Mt:A,tieStop:It(T),...Dt(g)})}y+=A;break}}x=Math.max(x,y)}}return f.length=D(d.getAttribute("len")??void 0)||e||x,n+=f.length,f});Bt(i,o);for(const d of a){(p=i[d.startMeasure])==null||p.pedals.push({offset:d.startBeat,down:!0});const u=X(i,d);i[u.measure].pedals.push({offset:u.beat,down:!1})}for(const d of l){(h=i[d.startMeasure])==null||h.hairpins.push({offset:d.startBeat,kind:d.kind});const u=X(i,d);i[u.measure].hairpins.push({offset:u.beat,kind:"end"})}for(const d of i)d.notes=d.notes.filter(u=>u.keyIndex>=0&&u.keyIndex<88);return i}function X(c,t){let e=Math.min(t.endMeasure,c.length),s=e<c.length?t.endBeat:0;for(;e>t.startMeasure&&s<=0;)e--,s+=c[e].length;return{measure:e,beat:s}}const Q=c=>Number(w(c,"subtype")??0)%2===0?"cresc":"dim";function qt(c,t){const e=w(c,"durationType")??"quarter";if(e==="measure")return D(w(c,"duration"))||t;const s=kt[e]??1,n=Number(w(c,"dots"))||0;return s*(2-Math.pow(2,-n))}function It(c){return E(c,"Spanner").some(t=>t.getAttribute("type")==="Tie"&&S(t,"prev"))||S(c,"endSpanner")!==void 0}function Bt(c,t){const e=(s,n,o,a)=>s<o||s===o&&n<a;c.forEach((s,n)=>{for(const o of s.notes)for(const a of t)!e(n,o.offset,a.startMeasure,a.startBeat)&&e(n,o.offset,a.endMeasure,a.endBeat)&&(o.keyIndex+=a.shift)})}function Lt(c){const t=Math.max(0,...c.map(s=>s.length)),e=Array.from({length:t},tt);for(const s of c){const n=new Map;s.forEach((o,a)=>{S(o,"startRepeat")&&(e[a].forward=!0);const l=S(o,"endRepeat");l&&(e[a].backward=parseInt(l.textContent??"",10)||2);for(const r of E(o)){r.tagName==="Volta"&&r.getAttribute("id")&&n.set(r.getAttribute("id"),{start:a,endings:W(r)});const i=r.tagName==="endSpanner"?n.get(r.getAttribute("id")??""):void 0;if(i){n.delete(r.getAttribute("id"));const p=!E(o).slice(0,E(o).indexOf(r)).some(h=>h.tagName==="Chord"||h.tagName==="Rest");for(let h=i.start;h<(p?a:a+1);h++)e[h].endings=i.endings}}for(const r of Array.from(o.querySelectorAll(':scope > voice > Spanner[type="Volta"], :scope > Spanner[type="Volta"]'))){const i=S(r,"Volta");if(!i)continue;const p=W(i),h=S(S(r,"next")??r,"location"),d=Math.max(1,Number(h&&w(h,"measures"))||1);for(let u=a;u<Math.min(t,a+d);u++)e[u].endings=p}})}return e}const W=c=>(w(c,"endings")??"1").split(/[\s,]+/).map(t=>parseInt(t,10)).filter(t=>t>0),Ot=101010256,Gt=33639248,_t=67324752,Ut=c=>c.length>=4&&c[0]===80&&c[1]===75&&c[2]===3&&c[3]===4;class $t{constructor(t){this.bytes=t,this.entries=new Map,this.view=new DataView(t.buffer,t.byteOffset,t.byteLength),this.readCentralDirectory()}get names(){return[...this.entries.keys()]}has(t){return this.entries.has(t)}async readText(t){return at(await this.read(t))}async read(t){const e=this.entries.get(t);if(!e)throw new Error(`Missing file in archive: ${t}`);const s=e.localOffset;if(this.view.getUint32(s,!0)!==_t)throw new Error(`Corrupt archive entry: ${t}`);const n=s+30+this.view.getUint16(s+26,!0)+this.view.getUint16(s+28,!0),o=this.bytes.subarray(n,n+e.compressedSize);if(e.method===0)return o;if(e.method===8)return zt(o);throw new Error(`Unsupported compression method ${e.method} for ${t}`)}readCentralDirectory(){const t=this.findEndOfCentralDirectory(),e=this.view.getUint16(t+10,!0);let s=this.view.getUint32(t+16,!0);const n=new TextDecoder("utf-8");for(let o=0;o<e;o++){if(this.view.getUint32(s,!0)!==Gt)throw new Error("Corrupt archive: bad central directory");const a=this.view.getUint16(s+28,!0),l=this.view.getUint16(s+30,!0),r=this.view.getUint16(s+32,!0),i=n.decode(this.bytes.subarray(s+46,s+46+a));this.entries.set(i,{name:i,method:this.view.getUint16(s+10,!0),compressedSize:this.view.getUint32(s+20,!0),localOffset:this.view.getUint32(s+42,!0)}),s+=46+a+l+r}}findEndOfCentralDirectory(){const t=this.bytes.length-22,e=Math.max(0,t-65535);for(let s=t;s>=e;s--)if(this.view.getUint32(s,!0)===Ot)return s;throw new Error("Not a valid ZIP archive")}}async function zt(c){const t=new Blob([c]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(t).arrayBuffer())}function at(c){return c[0]===255&&c[1]===254?new TextDecoder("utf-16le").decode(c):c[0]===254&&c[1]===255?new TextDecoder("utf-16be").decode(c):new TextDecoder("utf-8").decode(c)}const Ht=".musicxml,.xml,.mxl,.mscz,.mscx";async function Kt(c){const t=new Uint8Array(await c.arrayBuffer()),e=Ut(t)?await Xt(new $t(t)):at(t);return Yt(e)}function Yt(c){return/<museScore[\s>]/.test(c)?Nt(c):ot(c)}const jt=/\.(mscx?|musicxml|xml)$/i;async function Xt(c){if(c.has("META-INF/container.xml")){const e=new DOMParser().parseFromString(await c.readText("META-INF/container.xml"),"text/xml"),s=Array.from(e.querySelectorAll("rootfile")).map(n=>n.getAttribute("full-path")??"").find(n=>jt.test(n)&&c.has(n));if(s)return c.readText(s)}const t=c.names.find(e=>/\.mscx?$/i.test(e))??c.names.find(e=>/\.(musicxml|xml)$/i.test(e)&&!e.startsWith("META-INF/"));if(!t)throw new Error("No score found in the archive");return c.readText(t)}const Qt=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],Wt=25,Zt=.3,Jt=80/127;class te{constructor(t){this.soundType="grand",this.activeKeys=new Set,this.isAutoPlaying=!1,this.tempoMultiplier=1,this.stopAutoPlayRequested=!1,this.currentScore=null,this.keyElements=new Map,this.container=t,this.audio=new O,this.render()}setSoundType(t){this.soundType=t,this.updateUI()}setPedal(t){this.audio.setPedal(t)}async loadMusicXml(t){try{return this.currentScore=ot(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to parse MusicXML:",e),e}}async loadScoreFile(t){try{return this.currentScore=await Kt(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to load score:",e),e}}async playScore(t){const e=t||this.currentScore;if(!e||this.isAutoPlaying)return;this.isAutoPlaying=!0,this.stopAutoPlayRequested=!1,this.updateUI();const s=e.notes;this.soundType==="grand"&&await this.audio.preloadGrand(s);const n=Math.max(0,...s.map(r=>r.time+(r.duration??.8)));let o=-.1,a=this.audio.currentTime,l=0;await new Promise(r=>{const i=()=>{if(this.stopAutoPlayRequested){clearInterval(p),r();return}const h=this.audio.currentTime;o+=(h-a)*this.tempoMultiplier,a=h;const d=o+Zt*this.tempoMultiplier;for(;l<s.length&&s[l].time<=d;){const u=s[l++],f=h+(u.time-o)/this.tempoMultiplier;this.playNote(u.keyIndex,(u.duration||.8)/this.tempoMultiplier,u.velocity??Jt,f)}l>=s.length&&o>=n&&(clearInterval(p),r())},p=setInterval(i,Wt);i()}),this.stopAutoPlayRequested&&this.audio.dampAll(),this.isAutoPlaying=!1,this.updateUI()}stopScore(){this.stopAutoPlayRequested=!0,this.audio.dampAll()}playNote(t,e=2.5,s=.8,n){if(this.audio.playNote(t,this.soundType,e,s,n),n===void 0)this.highlightKey(t);else{const o=Math.max(0,(n-this.audio.currentTime)*1e3);setTimeout(()=>this.highlightKey(t),o)}}highlightKey(t){const e=this.keyElements.get(t);e&&(e.classList.contains("sp-black-key"),e.classList.add("sp-active"),setTimeout(()=>e.classList.remove("sp-active"),250))}velocityFromPoint(t,e){const s=(t-e.top)/e.height,n=1-Math.max(0,Math.min(1,s));return Math.max(.06,Math.min(1,n))}render(){this.container.innerHTML=`
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
                  <input type="file" id="sp-xml-import" style="display:none" accept="${Ht}">
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
    `,this.setupEvents(),this.renderKeys(),this.renderSoundSelector()}setupEvents(){const t=this.container.querySelector("#sp-import-btn"),e=this.container.querySelector("#sp-xml-import"),s=this.container.querySelector("#sp-play-btn"),n=this.container.querySelector("#sp-stop-btn");t.onclick=()=>e.click(),e.onchange=async p=>{const h=p.target.files[0];if(e.value="",!!h)try{await this.loadScoreFile(h)}catch(d){alert(`Cannot read ${h.name}: ${d instanceof Error?d.message:d}`)}},s.onclick=()=>this.playScore(),n.onclick=()=>this.stopScore();const o=this.container.querySelector("#sp-pedal-btn");o.onclick=()=>{const p=!this.audio.pedal;this.audio.setPedal(p),o.classList.toggle("sp-pedal-on",p),o.setAttribute("aria-pressed",String(p))};const a=this.container.querySelector("#sp-vol-down"),l=this.container.querySelector("#sp-vol-up"),r=this.container.querySelector("#sp-tempo-down"),i=this.container.querySelector("#sp-tempo-up");a.onclick=()=>{this.audio.volume=Math.round((this.audio.volume-.1)*10)/10,this.updateUI()},l.onclick=()=>{this.audio.volume=Math.round((this.audio.volume+.1)*10)/10,this.updateUI()},r.onclick=()=>{this.tempoMultiplier=Math.max(.25,Math.round((this.tempoMultiplier-.25)*4)/4),this.updateUI()},i.onclick=()=>{this.tempoMultiplier=Math.min(2,Math.round((this.tempoMultiplier+.25)*4)/4),this.updateUI()}}renderKeys(){const t=this.container.querySelector("#sp-white-keys"),e=this.container.querySelector("#sp-keys-bed");t.innerHTML="",this.keyElements.clear();let s=0;const n=[],o=[];for(let l=0;l<88;l++){const r=(l+9)%12,i=Qt[r],p=Math.floor((l+9)/12);i.includes("#")?o.push({i:l,noteName:i,octave:p,whiteBefore:s}):(n.push({i:l,noteName:i,octave:p}),s++)}n.forEach(l=>{const r=document.createElement("div");if(r.className="sp-white-key",r.onmousedown=i=>this.playNote(l.i,2.5,this.velocityFromPoint(i.clientY,r.getBoundingClientRect())),r.ontouchstart=i=>{i.preventDefault(),this.playNote(l.i,2.5,this.velocityFromPoint(i.touches[0].clientY,r.getBoundingClientRect()))},l.noteName==="C"||l.i===0||l.i===87){const i=document.createElement("div");i.className="sp-key-label",i.textContent=`${l.noteName}${l.octave}`,r.appendChild(i)}t.appendChild(r),this.keyElements.set(l.i,r)});const a=1/52*100*.6;o.forEach(l=>{const r=document.createElement("div");r.className="sp-black-key";const i=l.whiteBefore/52*100;r.style.left=`${i-a/2}%`,r.style.width=`${a}%`,r.onmousedown=p=>this.playNote(l.i,2.5,this.velocityFromPoint(p.clientY,r.getBoundingClientRect())),r.ontouchstart=p=>{p.preventDefault(),this.playNote(l.i,2.5,this.velocityFromPoint(p.touches[0].clientY,r.getBoundingClientRect()))},e.appendChild(r),this.keyElements.set(l.i,r)})}renderSoundSelector(){const t=this.container.querySelector("#sp-sound-selector"),e=Object.keys(L);t.innerHTML=e.map(s=>`<button class="sp-sound-btn ${this.soundType===s?"sp-selected":""}" data-type="${s}">${L[s].name}</button>`).join(""),t.querySelectorAll("button").forEach(s=>{s.onclick=()=>this.setSoundType(s.getAttribute("data-type"))})}updateUI(){const t=this.container.querySelector("#sp-play-btn"),e=this.container.querySelector("#sp-stop-btn"),s=this.container.querySelector("#sp-title"),n=this.container.querySelector("#sp-subtitle"),o=this.container.querySelector("#sp-icon");this.isAutoPlaying?(o.classList.add("sp-playing"),n.textContent="Automated Performance System"):(o.classList.remove("sp-playing"),n.textContent="Integrated Synthesis System"),this.currentScore&&(t.style.display=this.isAutoPlaying?"none":"flex",e.style.display=this.isAutoPlaying?"flex":"none",s.textContent=this.isAutoPlaying?`PLAYING: ${this.currentScore.title}`:`SCORE: ${this.currentScore.title}`);const a=this.container.querySelector("#sp-vol-value"),l=this.container.querySelector("#sp-tempo-value");a&&(a.textContent=`${Math.round(this.audio.volume*100)}%`),l&&(l.textContent=`${this.tempoMultiplier.toFixed(2).replace(/0$/,"")}×`),this.renderSoundSelector()}}const Z=document.getElementById("piano-container");Z&&new te(Z);
