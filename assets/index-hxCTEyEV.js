(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(n){if(n.ep)return;n.ep=!0;const i=e(n);fetch(n.href,i)}})();const O={grand:{name:"Sodor Grand",oscTypes:["sine","sine","sine","sine","sine","sine","sine"],gains:[.35,.2,.14,.09,.06,.04,.025],detune:[0,1200,1904,2404,2791,3110,3379],decayRates:[1,1.4,2,2.8,3.8,5,6.5],hammerNoise:.08,filterType:"lowpass",filterFreq:5e3,filterEndFreq:1e3,attack:.003,decay:2.5,sustain:.008,release:.6},electric:{name:"Electric Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,1200],attack:.01,decay:1,sustain:.3,release:.5},synth:{name:"Tidmouth Synth",oscTypes:["sawtooth","square"],gains:[.3,.2],detune:[0,5],filterType:"lowpass",filterFreq:1200,filterEndFreq:400,attack:.1,decay:.5,sustain:.5,release:1.2},organ:{name:"Vicarstown Organ",oscTypes:["sine","sine","sine"],gains:[.4,.2,.2],detune:[0,1200,1900],attack:.05,decay:.1,sustain:1,release:.8},whistle:{name:"Steam Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,2],filterType:"highpass",filterFreq:800,attack:.2,decay:.3,sustain:.7,release:.5},bell:{name:"Station Bell",oscTypes:["sine","sine","triangle"],gains:[.4,.3,.2],detune:[0,1200,2400],attack:.002,decay:2,sustain:.01,release:2}},B=1e-4,lt=69,pt=r=>r<24?.15:r<48?.09:.06,ut=[{name:"p",below:.42,reference:.3},{name:"m",below:.72,reference:.57},{name:"f",below:1/0,reference:.85}],q=class q{constructor(){this.ctx=null,this.masterGainNode=null,this.compressor=null,this.reverb=null,this._volume=.8,this.activeVoices=[],this.maxPolyphony=64,this._pedalDown=!1,this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this.RES_FREQS=[55,65.41,77.78,92.5,110,130.81,155.56,185,220,261.63,311.13,369.99,440,523.25,622.25,740,880,1046.5,1244.5,1480,1760,2093,2489,2960,3520,4186],this.sampleCache=new Map,this.sampleLoads=new Map}get sampleBase(){return"/SodorPiano/".replace(/\/$/,"")+"/assets/samples/"}loadSample(t,e){const s=this.sampleCache.get(e);if(s)return Promise.resolve(s);const n=this.sampleLoads.get(e);if(n)return n;const i=fetch(this.sampleBase+e).then(o=>{if(!o.ok)throw new Error("HTTP "+o.status);return o.arrayBuffer()}).then(o=>t.decodeAudioData(o)).then(o=>(this.sampleCache.set(e,o),this.sampleLoads.delete(e),o)).catch(o=>{throw this.sampleLoads.delete(e),o});return this.sampleLoads.set(e,i),i}get pedal(){return this._pedalDown}get canResonate(){return this._pedalDown||this.activeVoices.length>0}get volume(){return this._volume}set volume(t){this._volume=Math.max(0,Math.min(1,t)),this.masterGainNode&&this.ctx&&this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime)}initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGainNode=this.ctx.createGain(),this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-18,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(4,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGainNode.connect(this.compressor),this.compressor.connect(this.ctx.destination),this.reverb=this.ctx.createConvolver(),this.reverb.buffer=dt(this.ctx);const t=this.ctx.createGain();t.gain.setValueAtTime(.5,this.ctx.currentTime),this.masterGainNode.connect(this.reverb),this.reverb.connect(t),t.connect(this.compressor),this.initResonance(this.ctx)}return this.ctx.state==="suspended"&&this.ctx.resume(),this.ctx}get output(){return this.masterGainNode}get currentTime(){return this.initCtx().currentTime}async preloadGrand(t){const e=this.initCtx(),s=new Set(t.map(n=>this.grandSample(n.keyIndex,n.velocity??.8).file));await Promise.allSettled([...s].map(n=>this.loadSample(e,n)))}dampVoice(t,e,s=.012){if(t.damper){if(e<t.startTime){t.damper.disconnect(),t.stopTime=e;return}const o=e+s*9,c=t.damping;if(c&&c.at<=e&&c.end<=o)return;const l=!c||e<=c.at?1:e>=c.end?B:c.from*Math.pow(B/c.from,(e-c.at)/(c.end-c.at));t.damper.gain.cancelScheduledValues(e),t.damper.gain.setValueAtTime(l,e),t.damper.gain.exponentialRampToValueAtTime(B,o),t.damping={from:l,at:e,end:o},t.stopScheduled||(t.sources.forEach(a=>{try{a.stop(o)}catch{}}),t.stopScheduled=!0),t.stopTime=Math.min(t.stopTime,o);return}const n=.03;t.gainNode.gain.cancelScheduledValues(e);const i=Math.max(t.gainNode.gain.value,1e-4);t.gainNode.gain.setValueAtTime(i,e),t.gainNode.gain.exponentialRampToValueAtTime(1e-4,e+n),t.oscillators.forEach(o=>{try{o.stop(e+n+.01)}catch{}}),t.sources.forEach(o=>{try{o.stop(e+n+.01)}catch{}})}dampAll(){if(!this.ctx)return;const t=this.ctx.currentTime;this.activeVoices.forEach(e=>this.dampVoice(e,t)),this.activeVoices=[]}setPedal(t){if(t===this._pedalDown||(this._pedalDown=t,!this.ctx))return;const e=this.ctx.currentTime;if(!t){const s=[...this.activeVoices];this.activeVoices=[],s.forEach(n=>this.dampVoice(n,e))}}initResonance(t){this.resonanceInput||(this.resonanceInput=t.createGain(),this.resonanceOutput=t.createGain(),this.resonanceFeed=t.createGain(),this.resonanceFeed.gain.setValueAtTime(1,t.currentTime),this.resonanceOutput.gain.setValueAtTime(1e-4,t.currentTime),this.resonanceOutput.gain.linearRampToValueAtTime(.0015,t.currentTime+.5),this.resonators=this.RES_FREQS.map(e=>t.createBiquadFilter()),this.resonators.forEach((e,s)=>{const n=this.RES_FREQS[s];e.type="bandpass";const i=30+s/this.RES_FREQS.length*40;e.frequency.setValueAtTime(n,t.currentTime),e.Q.setValueAtTime(i,t.currentTime),e.gain.setValueAtTime(1,t.currentTime),e.connect(this.resonanceOutput)}),this.resonanceInput.connect(this.resonanceFeed),this.resonators.forEach(e=>this.resonanceFeed.connect(e)),this.resonanceOutput.connect(this.masterGainNode))}managePolyphony(t,e,s=t.currentTime){for(this.activeVoices=this.activeVoices.filter(n=>n.keyIndex===e&&n.startTime<=s?(this.dampVoice(n,s,.04),!1):!0),this.activeVoices=this.activeVoices.filter(n=>n.stopTime>s);this.activeVoices.length>=this.maxPolyphony;){const n=this.activeVoices.shift();this.dampVoice(n,s,.03)}}getFrequency(t){return 27.5*Math.pow(2,t/12)}playNote(t,e="grand",s=1.2,n=.9,i){const o=this.initCtx(),c=Math.max(i??0,o.currentTime);if(this.managePolyphony(o,t,c),e==="grand"){const y=i===void 0&&s>=2;this.playGrandPiano(o,t,s,n,c,y).catch(v=>console.error("[SodorPiano] grand note error:",v));return}const l=O[e],a=c,p=this.getFrequency(t),h=!!l.decayRates,f=o.createGain();if(l.filterType){const y=o.createBiquadFilter();y.type=l.filterType,y.frequency.setValueAtTime(l.filterFreq||2e3,a),l.filterEndFreq&&y.frequency.exponentialRampToValueAtTime(l.filterEndFreq,a+l.decay),f.connect(y),y.connect(this.output)}else f.connect(this.output);if(h?(f.gain.setValueAtTime(1,a),f.gain.setValueAtTime(1,a+s),f.gain.exponentialRampToValueAtTime(.001,a+s+l.release)):(f.gain.setValueAtTime(0,a),f.gain.linearRampToValueAtTime(.4,a+l.attack),f.gain.exponentialRampToValueAtTime(l.sustain*.4,a+l.attack+l.decay),f.gain.exponentialRampToValueAtTime(.001,a+s+l.release)),l.hammerNoise&&l.hammerNoise>0){const y=Math.floor(o.sampleRate*.025),v=o.createBuffer(1,y,o.sampleRate),u=v.getChannelData(0);for(let S=0;S<y;S++)u[S]=Math.random()*2-1;const m=o.createBufferSource();m.buffer=v;const g=o.createBiquadFilter();g.type="bandpass",g.frequency.setValueAtTime(Math.min(p*3,8e3),a),g.Q.setValueAtTime(1,a);const T=o.createGain();T.gain.setValueAtTime(l.hammerNoise,a),T.gain.exponentialRampToValueAtTime(.001,a+.04),m.connect(g),g.connect(T),T.connect(f),m.start(a),m.stop(a+.05)}const d=[];l.oscTypes.forEach((y,v)=>{const u=o.createOscillator(),m=o.createGain();if(u.type=y,u.frequency.setValueAtTime(p,a),l.detune&&l.detune[v]!==void 0&&u.detune.setValueAtTime(l.detune[v],a),h){const g=l.decayRates[v]||1,T=l.gains[v],S=Math.max(1e-4,T*l.sustain);m.gain.setValueAtTime(0,a),m.gain.linearRampToValueAtTime(T,a+l.attack),m.gain.exponentialRampToValueAtTime(S,a+l.attack+l.decay/g),m.gain.exponentialRampToValueAtTime(1e-4,a+s+l.release)}else m.gain.setValueAtTime(l.gains[v],a);u.connect(m),m.connect(f),u.start(a),u.stop(a+s+l.release),d.push(u)}),this.activeVoices.push({keyIndex:t,gainNode:f,startTime:a,stopTime:a+s+l.release,oscillators:d,sources:[]})}grandSample(t,e){const s=q.GRAND_SAMPLE_MAP[t]||q.GRAND_SAMPLE_MAP[39],n=ut.find(o=>e<o.below);return{file:`${s.note.replace("#","s")}_${n.name}.mp3`,rate:s.rate,layer:n}}async playGrandPiano(t,e,s,n,i,o){if(!this.ctx||this.ctx.state==="closed")return;const c=this.ctx,l=Math.max(.05,Math.min(1,n)),{file:a,rate:p,layer:h}=this.grandSample(e,l);let f;try{f=await this.loadSample(c,a)}catch(b){console.error("[SodorPiano] failed to load sample",a,b),this.playGrandSynthFallback(c,e,s,l);return}const d=Math.max(i,c.currentTime),y=c.createBufferSource();y.buffer=f,y.playbackRate.setValueAtTime(p,d);const v=c.createGain(),u=.9*Math.min(1.4,Math.max(.5,l/h.reference));v.gain.setValueAtTime(0,d),v.gain.linearRampToValueAtTime(u,d+.003);const m=c.createGain();m.gain.setValueAtTime(1,d);const g=c.createBiquadFilter();g.type="peaking";const T=this.getFrequency(e);if(g.frequency.setValueAtTime(T<200?120:420,d),g.Q.setValueAtTime(.8,d),g.gain.setValueAtTime(T<200?2:1.2,d),y.connect(v),v.connect(m),m.connect(g),g.connect(this.output),this.canResonate&&this.resonanceInput){const b=c.createGain();b.gain.setValueAtTime(.18*l,d),b.gain.exponentialRampToValueAtTime(1e-4,d+.2),v.connect(b),b.connect(this.resonanceInput)}const S=d+f.duration/p,C={keyIndex:e,gainNode:v,damper:m,startTime:d,stopTime:S,oscillators:[],sources:[y]};y.start(d),!o&&e<lt&&this.dampVoice(C,d+Math.max(.03,s),pt(e)),this.activeVoices.push(C)}playGrandSynthFallback(t,e,s,n=.9){const i=t.currentTime,o=this.getFrequency(e),c=t.createGain(),l=Math.max(.05,Math.min(1,n)),a=.5*(.3+.7*l);c.gain.setValueAtTime(0,i),c.gain.linearRampToValueAtTime(a,i+.004),c.gain.exponentialRampToValueAtTime(1e-4,i+s+.3),c.connect(this.output);const p=[],h=[1,2,3,4,5],f=[1,.45,.25,.14,.08];for(let d=0;d<h.length;d++){const y=t.createOscillator(),v=t.createGain();y.type="sine",y.frequency.setValueAtTime(o*h[d]*(1+3e-4*h[d]*h[d]),i),v.gain.setValueAtTime(f[d]*(.3+.7*l),i),v.gain.exponentialRampToValueAtTime(1e-4,i+s+.3),y.connect(v),v.connect(c),y.start(i),y.stop(i+s+.35),p.push(y)}this.activeVoices.push({keyIndex:e,gainNode:c,startTime:i,stopTime:i+s+.35,oscillators:p,sources:[]})}close(){this.ctx&&(this.activeVoices=[],this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this._pedalDown=!1,this.ctx.close(),this.ctx=null,this.compressor=null,this.reverb=null)}};q.GRAND_SAMPLE_MAP=[{note:"A0",rate:1},{note:"A0",rate:1.059463},{note:"C1",rate:.943874},{note:"C1",rate:1},{note:"C1",rate:1.059463},{note:"D#1",rate:.943874},{note:"D#1",rate:1},{note:"D#1",rate:1.059463},{note:"F#1",rate:.943874},{note:"F#1",rate:1},{note:"F#1",rate:1.059463},{note:"A1",rate:.943874},{note:"A1",rate:1},{note:"A1",rate:1.059463},{note:"C2",rate:.943874},{note:"C2",rate:1},{note:"C2",rate:1.059463},{note:"D#2",rate:.943874},{note:"D#2",rate:1},{note:"D#2",rate:1.059463},{note:"F#2",rate:.943874},{note:"F#2",rate:1},{note:"F#2",rate:1.059463},{note:"A2",rate:.943874},{note:"A2",rate:1},{note:"A2",rate:1.059463},{note:"C3",rate:.943874},{note:"C3",rate:1},{note:"C3",rate:1.059463},{note:"D#3",rate:.943874},{note:"D#3",rate:1},{note:"D#3",rate:1.059463},{note:"F#3",rate:.943874},{note:"F#3",rate:1},{note:"F#3",rate:1.059463},{note:"A3",rate:.943874},{note:"A3",rate:1},{note:"A3",rate:1.059463},{note:"C4",rate:.943874},{note:"C4",rate:1},{note:"C4",rate:1.059463},{note:"D#4",rate:.943874},{note:"D#4",rate:1},{note:"D#4",rate:1.059463},{note:"F#4",rate:.943874},{note:"F#4",rate:1},{note:"F#4",rate:1.059463},{note:"A4",rate:.943874},{note:"A4",rate:1},{note:"A4",rate:1.059463},{note:"C5",rate:.943874},{note:"C5",rate:1},{note:"C5",rate:1.059463},{note:"D#5",rate:.943874},{note:"D#5",rate:1},{note:"D#5",rate:1.059463},{note:"F#5",rate:.943874},{note:"F#5",rate:1},{note:"F#5",rate:1.059463},{note:"A5",rate:.943874},{note:"A5",rate:1},{note:"A5",rate:1.059463},{note:"C6",rate:.943874},{note:"C6",rate:1},{note:"C6",rate:1.059463},{note:"D#6",rate:.943874},{note:"D#6",rate:1},{note:"D#6",rate:1.059463},{note:"F#6",rate:.943874},{note:"F#6",rate:1},{note:"F#6",rate:1.059463},{note:"A6",rate:.943874},{note:"A6",rate:1},{note:"A6",rate:1.059463},{note:"C7",rate:.943874},{note:"C7",rate:1},{note:"C7",rate:1.059463},{note:"D#7",rate:.943874},{note:"D#7",rate:1},{note:"D#7",rate:1.059463},{note:"F#7",rate:.943874},{note:"F#7",rate:1},{note:"F#7",rate:1.059463},{note:"A7",rate:.943874},{note:"A7",rate:1},{note:"A7",rate:1.059463},{note:"C8",rate:.943874},{note:"C8",rate:1}];let G=q;function dt(r){const e=Math.floor(.012*r.sampleRate),s=Math.floor(1.6*r.sampleRate),n=r.createBuffer(2,s,r.sampleRate);for(let i=0;i<2;i++){const o=n.getChannelData(i);let c=0;for(let l=e;l<s;l++){const a=(l-e)/r.sampleRate,p=.25+.7*Math.min(1,a/1.6);c=p*c+(1-p)*(Math.random()*2-1),o[l]=c*Math.exp(-6.9*a/1.6)}}return n}const tt=()=>({length:0,notes:[],tempos:[],dynamics:[],hairpins:[],pedals:[]}),et=()=>({forward:!1,backward:0,voltas:[],markers:[],jump:null,sectionEnd:!1}),ft=80/127,ht=120,st=2e4,R=1e-6,$={pppppp:1,ppppp:5,pppp:10,ppp:16,pp:33,p:49,mp:64,mf:80,f:96,ff:112,fff:126,ffff:127,fffff:127,ffffff:127},j={sf:[112,void 0],sfz:[112,void 0],sffz:[126,void 0],fz:[112,void 0],rf:[112,void 0],rfz:[112,void 0],fp:[96,49],sfp:[112,49],sfpp:[112,33],pf:[49,96]};function nt(r,t,e){const s=r.toLowerCase();if(s in $)return{offset:t,velocity:(e??$[s])/127};if(s in j){const[n,i]=j[s];return{offset:t,velocity:(e??n)/127,momentary:!0,after:i===void 0?void 0:i/127}}return null}function mt(r){const t=[];let e=0;return r.forEach((s,n)=>{(s.sectionEnd||n===r.length-1)&&(t.push(...gt(r,e,n+1)),e=n+1)}),t.slice(0,st)}function gt(r,t,e){const s=[],n=bt(r,t,e),i=n.map((u,m)=>xt(n,m)),o=yt(n),c=new Map,l=new Set;let a=t,p=1,h=null;const f=u=>{const m=[];for(let g=t;g<e;g++)r[g].markers.includes(u)&&m.push(g);return m},d=u=>r.slice(u,e).some(m=>m.backward>0),y=(u,m)=>n[u-t].every(g=>g.includes(m)),v=u=>{let m=0;for(let g=u;g<e&&(g===u||!r[g].forward);g++){const T=r[g].backward;T>0&&(m+=Math.max(0,T-1-(c.get(g)??0)))}for(let g=p+1;g<=p+m;g++)if(y(u,g))return!0;return!1};for(let u=t;u<e&&s.length<st;){const m=r[u],g=!h||h.playRepeats||u>h.from,S=!g||h&&!h.playRepeats&&o[u-t]>0&&o[u-t]===o[h.from-t]?i[u-t]:p;if(g&&m.forward&&u!==a&&y(u,S)&&(a=u,p=1),!y(u,S)){if(!g||d(u)){u++;continue}let x=u+1;for(;x<e&&!(n[x-t].length&&y(x,S));)x++;u=x;continue}if(s.push(u),h&&h.until===u&&!(g&&v(u))){if(h.coda===null)break;u=h.coda,h=null,a=u,p=1;continue}const b=m.jump;if(b&&!l.has(u)&&!(g&&v(u))){l.add(u);const x=f(b.to),A=b.to==="start"?t:x.filter(k=>k<=u).pop()??x[0]??null;if(A!==null){const k=b.until==="end"?[]:f(b.until),M=k.find(D=>D>=A)??k[0]??null,F=b.continueAt?f(b.continueAt):[];if(h={from:u,until:M,coda:M===null?null:F.find(D=>D>u)??F[0]??null,playRepeats:b.playRepeats},b.playRepeats&&c.clear(),u=A,a=A,b.playRepeats)for(;a>t&&!r[a].forward;)a--;p=1;continue}}if(g&&m.backward>0&&(c.get(u)??0)<m.backward-1){c.set(u,(c.get(u)??0)+1),p++,u=a;continue}u++}return s}function bt(r,t,e){const s=Array.from({length:e-t},()=>[]);for(let n=t;n<e;n++)for(const i of r[n].voltas){let o=Math.min(e,n+Math.max(1,i.length));if(i.open&&!r[n].forward){for(let c=n;c<e&&!(c>n&&(r[c].voltas.length||r[c].forward));c++)if(r[c].backward>0){o=Math.max(o,c+1);break}}for(let c=n;c<o;c++)s[c-t].push(i.endings)}return s}function yt(r){let t=0;return r.map((e,s)=>e.length?s>0&&r[s-1].length?t:++t:0)}function xt(r,t){if(!r[t].length)return 0;let e=t,s=t;for(;e>0&&r[e-1].length;)e--;for(;s<r.length-1&&r[s+1].length;)s++;return Math.max(...r.slice(e,s+1).flat(2))}function ot(r,t,e,s=t.map((n,i)=>i)){const n=mt(e),i=Math.max(0,...t.map(u=>u.length)),o=[];for(let u=0;u<i;u++)o.push(Math.max(0,...t.map(m=>{var g;return((g=m[u])==null?void 0:g.length)??0})));const c=[];let l=0;for(const u of n)c.push(l),l+=o[u];const a=[],p=new Map,h=new Map,f=new Map;t.forEach((u,m)=>{const g=s[m];p.has(g)||(p.set(g,[]),h.set(g,[]),f.set(g,[])),n.forEach((T,S)=>{const C=u[T];if(!C)return;const b=c[S];for(const x of C.tempos)a.push({...x,offset:b+x.offset});for(const x of C.dynamics)p.get(g).push({...x,offset:b+x.offset});for(const x of C.hairpins)h.get(g).push({...x,offset:b+x.offset});for(const x of C.pedals)f.get(g).push({...x,offset:b+x.offset})})});const d=Tt(a),y=new Map([...f].map(([u,m])=>[u,kt(m,l)])),v=[];return t.forEach((u,m)=>{const g=s[m],T=At(p.get(g),h.get(g),l),S=y.get(g),C=new Map,b=[];n.forEach((x,A)=>{var k;for(const M of((k=u[x])==null?void 0:k.notes)??[]){const F=c[A]+M.offset,D=F+M.duration*(M.held??1),_=M.tieStop?C.get(M.keyIndex):void 0;if(_)_.release=D;else{const ct=Math.max(.05,Math.min(1,T(F)*(M.accent??1))),U={keyIndex:M.keyIndex,start:F,release:D,velocity:ct};b.push(U),C.set(M.keyIndex,U)}}});for(const x of b){const A=d(x.start);v.push({keyIndex:x.keyIndex,time:A,duration:d(S(x.release))-A,velocity:x.velocity})}}),{id:`imported-${Date.now()}`,title:r,thumbnail:"🎼",notes:v.sort((u,m)=>u.time-m.time)}}function vt(r,t){let e=ft,s;for(const n of r){if(n.offset>t+R)break;n.momentary?n.after!==void 0&&(e=n.after):e=n.velocity,s=n.momentary&&Math.abs(n.offset-t)<R?n.velocity:void 0}return{level:e,hit:s}}const I=[16,33,49,64,80,96,112,126].map(r=>r/127);function wt(r,t){const e=.003937007874015748;return t>0?I.find(s=>s>r+e)??1:[...I].reverse().find(s=>s<r-e)??I[0]}function At(r,t,e){const s=[...r].sort((p,h)=>p.offset-h.offset),n=s.filter(p=>!p.momentary||p.after!==void 0),i=[],o=p=>{const{level:h,hit:f}=vt(s,p);if(f!==void 0)return f;const d=i.find(y=>p>=y.start-R&&p<y.end-R);return d?d.from+(d.to-d.from)*(p-d.start)/(d.end-d.start):h},c=[];let l=null;const a=[...t].sort((p,h)=>p.offset-h.offset||+(p.kind!=="end")-+(h.kind!=="end"));for(const p of a)l&&p.offset>l.start+R&&c.push({...l,end:p.offset}),p.kind==="end"?l=null:(!l||p.offset>l.start+R)&&(l={kind:p.kind,start:p.offset});l&&e>l.start+R&&c.push({...l,end:e});for(const p of c){const h=o(p.start),f=n.find(m=>m.offset>p.start+R&&m.offset<p.end-R),d=f?f.offset:p.end,y=n.find(m=>Math.abs(m.offset-d)<R),v=p.kind==="cresc"?1:-1,u=y&&Math.sign(y.velocity-h)===v?y.velocity:wt(h,v);i.push({start:p.start,end:d,from:h,to:u}),y||(s.push({offset:d,velocity:u}),s.sort((m,g)=>m.offset-g.offset))}return o}function kt(r,t){const e=[];let s=null;for(const n of[...r].sort((i,o)=>i.offset-o.offset||Number(i.down)-Number(o.down)))n.down&&s===null&&(s=n.offset),!n.down&&s!==null&&(e.push([s,n.offset]),s=null);return s!==null&&e.push([s,t]),n=>{const i=e.find(([o,c])=>n>o+R&&n<c);return i?i[1]:n}}function Tt(r){var s;const t=r.filter(n=>n.bpm>0).sort((n,i)=>n.offset-i.offset),e=[{beat:0,seconds:0,secondsPerBeat:60/(((s=t[0])==null?void 0:s.bpm)??ht)}];for(const n of t){const i=e[e.length-1],o=i.seconds+(n.offset-i.beat)*i.secondsPerBeat;e.push({beat:n.offset,seconds:o,secondsPerBeat:60/n.bpm})}return n=>{let i=e[0];for(const o of e){if(o.beat>n)break;i=o}return i.seconds+(n-i.beat)*i.secondsPerBeat}}const z={C:0,D:2,E:4,F:5,G:7,A:9,B:11},St=.125,H={staccatissimo:.33,spiccato:.33,staccato:.5,"detached-legato":.67,"strong-accent":.67,tenuto:1},K={accent:1.5,"strong-accent":1.2},at=(r,t)=>{var e;return((e=r.querySelector(t))==null?void 0:e.textContent)??void 0},V=(r,t,e)=>{const s=parseFloat(at(r,t)??"");return Number.isFinite(s)?s:e},rt=r=>{var o,c;const e=new DOMParser().parseFromString(r,"text/xml");if(e.querySelector("parsererror"))throw new Error("The file is not valid XML");if(!e.querySelector("score-partwise"))throw new Error(e.querySelector("score-timewise")?"Timewise MusicXML is not supported; export the score as partwise MusicXML":"Not a MusicXML score");const s=((o=e.querySelector("work-title"))==null?void 0:o.textContent)||((c=e.querySelector("movement-title"))==null?void 0:c.textContent)||"Imported Melody",n=Array.from(e.querySelectorAll("part")),i=l=>Array.from(l.children).filter(a=>a.tagName==="measure");return ot(s,n.map(l=>Mt(i(l))),n.length?Nt(i(n[0])):[])};function Mt(r){let t=1;return r.map(e=>{const s=tt();let n=0,i=0,o=0;const c=(a,p,h)=>{if(!a)return;const f=p/t,d=parseFloat(a.getAttribute("tempo")??"");d>0&&s.tempos.push({offset:f,bpm:d});const y=parseFloat(a.getAttribute("dynamics")??"");y>=0&&!h.dynamic&&s.dynamics.push({offset:f,velocity:Math.min(1,y*.9/127)});const v=a.getAttribute("damper-pedal");v&&!h.pedal&&s.pedals.push({offset:f,down:v!=="no"})},l=(a,p)=>{const h=p/t,f=a.querySelector(":scope > sound"),d=parseFloat((f==null?void 0:f.getAttribute("dynamics"))??"");let y=!1;for(const u of Array.from(a.querySelectorAll("direction-type > dynamics > *"))){const m=nt(u.tagName,h,d>=0?Math.min(127,d*.9):void 0);m&&(s.dynamics.push(m),y=!0)}for(const u of Array.from(a.querySelectorAll("direction-type > wedge"))){const m=u.getAttribute("type");m==="crescendo"&&s.hairpins.push({offset:h,kind:"cresc"}),m==="diminuendo"&&s.hairpins.push({offset:h,kind:"dim"}),m==="stop"&&s.hairpins.push({offset:h,kind:"end"})}let v=!1;for(const u of Array.from(a.querySelectorAll("direction-type > pedal"))){const m=u.getAttribute("type");(m==="stop"||m==="change")&&s.pedals.push({offset:h,down:!1}),(m==="start"||m==="change"||m==="resume")&&s.pedals.push({offset:h,down:!0}),m==="discontinue"&&s.pedals.push({offset:h,down:!1}),v=!0}c(f,p,{dynamic:y,pedal:v})};for(const a of Array.from(e.children))switch(a.tagName){case"attributes":t=V(a,"divisions",t);break;case"direction":l(a,n+V(a,":scope > offset",0));break;case"sound":c(a,n,{dynamic:!1,pedal:!1});break;case"forward":n+=V(a,"duration",0),i=Math.max(i,n);break;case"backup":n-=V(a,"duration",0);break;case"note":{if(a.querySelector("cue"))break;const p=a.querySelector("grace")!==null,h=a.querySelector("chord")!==null,f=p?0:V(a,":scope > duration",0),d=h?o:n,y=at(a,"pitch > step");if(a.querySelector("rest")===null&&y&&y in z){const v=V(a,"pitch > octave",4),u=Math.round(V(a,"pitch > alter",0)),m=v*12+z[y]+u-9;m>=0&&m<88&&s.notes.push({keyIndex:m,offset:d/t,duration:p?St:f/t,tieStop:a.querySelector('tie[type="stop"]')!==null,...Et(a)})}!h&&!p&&(o=n,n+=f,i=Math.max(i,n));break}}return s.length=i/t,s})}function Et(r){const t={};for(const e of Array.from(r.querySelectorAll("notations > articulations > *")))e.tagName in H&&(t.held=Math.min(t.held??1,H[e.tagName])),e.tagName in K&&(t.accent=Math.max(t.accent??1,K[e.tagName]));return t}function Nt(r){const t=r.map(()=>et());let e=null;const s=(o,c)=>{e&&(t[e.start].voltas.push({endings:e.endings,length:o-e.start+1,open:c}),e=null)};r.forEach((o,c)=>{const l=t[c];for(const a of Array.from(o.querySelectorAll(":scope > barline"))){const p=a.querySelector("repeat");(p==null?void 0:p.getAttribute("direction"))==="forward"&&(l.forward=!0),(p==null?void 0:p.getAttribute("direction"))==="backward"&&(l.backward=parseInt(p.getAttribute("times")??"",10)||2);const h=a.querySelector("ending");if(!h)continue;const f=h.getAttribute("type");f==="start"?(s(c-1,!1),e={start:c,endings:(h.getAttribute("number")??"1").split(/[\s,]+/).map(d=>parseInt(d,10)).filter(d=>d>0)}):s(c,f==="discontinue")}for(const a of Array.from(o.querySelectorAll("sound"))){const p=a.getAttribute("segno"),h=a.getAttribute("coda"),f=a.getAttribute("tocoda");p!==null&&l.markers.push(`segno:${p}`),h!==null&&l.markers.push(`coda:${h}`),f!==null&&l.markers.push(`tocoda:${f}`),a.getAttribute("fine")!==null&&l.markers.push("fine");const d=a.getAttribute("dalsegno");(a.getAttribute("dacapo")==="yes"||d!==null)&&(l.jump={to:d!==null?`segno:${d}`:"start",until:"end",continueAt:"",playRepeats:!1})}}),s(r.length-1,!0);const n=t.flatMap(o=>o.markers).find(o=>o.startsWith("tocoda:")),i=t.some(o=>o.markers.includes("fine"));for(const o of t)o.jump&&(n?(o.jump.until=n,o.jump.continueAt=`coda:${n.slice(7)}`):i&&(o.jump.until="fine"));return t}const Ct={long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,"16th":1/4,"32nd":1/8,"64th":1/16,"128th":1/32,"256th":1/64,"512th":1/128,"1024th":1/256},Y={"8va":12,"8vb":-12,"15ma":24,"15mb":-24,"22ma":36,"22mb":-36},Rt=/^(acciaccatura|appoggiatura|grace\d+(after)?)$/,Vt=.125,Ft=21,N=(r,t)=>Array.from(r.children).filter(e=>!t||e.tagName===t),E=(r,t)=>N(r,t)[0],w=(r,t)=>{var e,s;return(s=(e=E(r,t))==null?void 0:e.textContent)==null?void 0:s.trim()},P=r=>{const[t,e]=(r??"").split("/").map(Number);return t&&e?t/e*4:0},Dt=r=>{const{score:t,staffElements:e,staves:s,partOf:n}=qt(r),i=Number(w(t,"Division"))||480;return ot(Pt(t),s.map(o=>Gt(o,i)),jt(s),e.map((o,c)=>n.get(o.getAttribute("id")??"")??-1-c))};function qt(r){const t=new DOMParser().parseFromString(r,"text/xml");if(t.querySelector("parsererror"))throw new Error("The file is not valid XML");const e=t.documentElement,s=parseFloat(e.getAttribute("version")??"0");if(e.tagName!=="museScore")throw new Error("Not a MuseScore file");if(s<2)throw new Error("MuseScore 1 files are not supported; open and save the score in a later version of MuseScore");const n=E(e,"Score");if(!n)throw new Error("No score found in the MuseScore file");const{percussion:i,partOf:o}=Bt(n),c=N(n,"Staff").filter(a=>!i.has(a.getAttribute("id")??"")),l=c.map(a=>N(a,"Measure"));return{score:n,staffElements:c,staves:l,partOf:o}}function Pt(r){var e,s,n,i;const t=N(r,"metaTag").find(o=>o.getAttribute("name")==="workTitle");if((e=t==null?void 0:t.textContent)!=null&&e.trim())return t.textContent.trim();for(const o of Array.from(r.querySelectorAll(":scope > Staff > VBox > Text")))if(((s=w(o,"style"))==null?void 0:s.toLowerCase())==="title"){const c=(i=(n=E(o,"text"))==null?void 0:n.textContent)==null?void 0:i.trim();if(c)return c}return"Imported Melody"}function Bt(r){const t=new Set,e=new Map;return N(r,"Part").forEach((s,n)=>{var i;for(const o of N(s,"Staff")){const c=o.getAttribute("id")??"";e.set(c,n),((i=E(o,"StaffType"))==null?void 0:i.getAttribute("group"))==="percussion"&&t.add(c)}}),{percussion:t,partOf:e}}const It=[[/staccatissimo/i,.33],[new RegExp("(?<!tenuto)staccato","i"),.5],[/tenutoStaccato|portato/i,.67],[/marcato(?!tenuto)/i,.67],[/tenuto/i,1]],Lt=[[/accent|sforzato/i,1.5],[/marcato/i,1.2]];function Ot(r){const t={};for(const e of N(r,"Articulation")){if(w(e,"play")==="0")continue;const s=w(e,"subtype")??"",n=It.filter(([o])=>o.test(s)).map(([,o])=>o);n.length&&(t.held=Math.min(t.held??1,...n));const i=Lt.filter(([o])=>o.test(s)).map(([,o])=>o);i.length&&(t.accent=Math.max(t.accent??1,...i))}return t}function L(r,t,e){const s=E(E(r,"next")??r,"location");return{startMeasure:t,startBeat:e,endMeasure:t+(Number(s&&w(s,"measures"))||0),endBeat:e+P(s&&w(s,"fractions"))}}function Gt(r,t){var p,h;let e=4,s=1,n=0;const i=[],o=[],c=[],l=new Map,a=r.map((f,d)=>{const y=tt(),v=N(f,"voice");let u=0;for(const m of v.length?v:[f]){let g=0;const T=[],S=new Map,C=b=>{const x=w(b,"Tuplet");return x&&S.has(x)?S.get(x):T.reduce((A,k)=>A*k,1)};for(const b of N(m)){switch(b.tagName){case"TimeSig":{const x=Number(w(b,"sigN")),A=Number(w(b,"sigD")),k=Number(w(b,"stretchN")),M=Number(w(b,"stretchD"));s=k&&M?k/M:1,x&&A&&(e=x/A*4/s);break}case"Tempo":{const x=parseFloat(w(b,"tempo")??"");x>0&&y.tempos.push({offset:g,bpm:x*60});break}case"tick":g=Number(b.textContent)/t-n;break;case"location":g+=P(w(b,"fractions"));break;case"Tuplet":{const x=Number(w(b,"normalNotes")),A=Number(w(b,"actualNotes"));if(x&&A){const k=b.getAttribute("id");k?S.set(k,x/A):T.push(x/A)}break}case"endTuplet":T.pop();break;case"Dynamic":{const x=Number(w(b,"velocity")),A=nt(w(b,"subtype")??"",g,x>0?x:void 0);A&&y.dynamics.push(A);break}case"Pedal":case"Ottava":case"HairPin":{const x=b.getAttribute("id");x&&l.set(x,{measure:d,beat:g,element:b});break}case"endSpanner":{const x=l.get(b.getAttribute("id")??"");if(!x)break;l.delete(b.getAttribute("id")??"");const A={startMeasure:x.measure,startBeat:x.beat,endMeasure:d,endBeat:g},k=x.element;k.tagName==="Pedal"&&o.push(A),k.tagName==="Ottava"&&i.push({...A,shift:Y[w(k,"subtype")??""]??0}),k.tagName==="HairPin"&&c.push({...A,kind:Q(k)});break}case"Spanner":{const x=E(b,"Ottava");b.getAttribute("type")==="Ottava"&&x&&i.push({...L(b,d,g),shift:Y[w(x,"subtype")??""]??0}),b.getAttribute("type")==="Pedal"&&E(b,"Pedal")&&o.push(L(b,d,g));const A=E(b,"HairPin");b.getAttribute("type")==="HairPin"&&A&&c.push({...L(b,d,g),kind:Q(A)});break}case"Rest":case"Chord":{const x=N(b).some(k=>Rt.test(k.tagName)),A=x?0:_t(b,e*s)*C(b)/s;if(b.tagName==="Chord")for(const k of N(b,"Note")){if(w(k,"play")==="0")continue;const M=Number(w(k,"pitch"));Number.isFinite(M)&&y.notes.push({keyIndex:M-Ft,offset:g,duration:x?Vt:A,tieStop:Ut(k),...Ot(b)})}g+=A;break}}u=Math.max(u,g)}}return y.length=P(f.getAttribute("len")??void 0)||e||u,n+=y.length,y});$t(a,i);for(const f of o){(p=a[f.startMeasure])==null||p.pedals.push({offset:f.startBeat,down:!0});const d=X(a,f);a[d.measure].pedals.push({offset:d.beat,down:!1})}for(const f of c){(h=a[f.startMeasure])==null||h.hairpins.push({offset:f.startBeat,kind:f.kind});const d=X(a,f);a[d.measure].hairpins.push({offset:d.beat,kind:"end"})}for(const f of a)f.notes=f.notes.filter(d=>d.keyIndex>=0&&d.keyIndex<88);return a}function X(r,t){let e=Math.min(t.endMeasure,r.length),s=e<r.length?t.endBeat:0;for(;e>t.startMeasure&&s<=0;)e--,s+=r[e].length;return{measure:e,beat:s}}const Q=r=>Number(w(r,"subtype")??0)%2===0?"cresc":"dim";function _t(r,t){const e=w(r,"durationType")??"quarter";if(e==="measure")return P(w(r,"duration"))||t;const s=Ct[e]??1,n=Number(w(r,"dots"))||0;return s*(2-Math.pow(2,-n))}function Ut(r){return N(r,"Spanner").some(t=>t.getAttribute("type")==="Tie"&&E(t,"prev"))||E(r,"endSpanner")!==void 0}function $t(r,t){const e=(s,n,i,o)=>s<i||s===i&&n<o;r.forEach((s,n)=>{for(const i of s.notes)for(const o of t)!e(n,i.offset,o.startMeasure,o.startBeat)&&e(n,i.offset,o.endMeasure,o.endBeat)&&(i.keyIndex+=o.shift)})}function jt(r){const t=Math.max(0,...r.map(s=>s.length)),e=Array.from({length:t},et);for(const s of r){const n=new Map;s.forEach((i,o)=>{E(i,"startRepeat")&&(e[o].forward=!0);const c=E(i,"endRepeat");c&&(e[o].backward=parseInt(c.textContent??"",10)||2);for(const a of N(i,"Marker")){const p=w(a,"label");p&&!e[o].markers.includes(p)&&e[o].markers.push(p)}const l=E(i,"Jump");l&&w(l,"jumpTo")&&(e[o].jump={to:w(l,"jumpTo"),until:w(l,"playUntil")||"end",continueAt:w(l,"continueAt")??"",playRepeats:w(l,"playRepeats")==="1"});for(const a of N(i)){a.tagName==="Volta"&&a.getAttribute("id")&&n.set(a.getAttribute("id"),{start:o,endings:Z(a),isOpen:W(a)});const p=a.tagName==="endSpanner"?n.get(a.getAttribute("id")??""):void 0;if(p){n.delete(a.getAttribute("id"));const f=(!N(i).slice(0,N(i).indexOf(a)).some(d=>d.tagName==="Chord"||d.tagName==="Rest")?o:o+1)-p.start;f>0&&e[p.start].voltas.push({endings:p.endings,length:f,open:p.isOpen})}}for(const a of Array.from(i.querySelectorAll(':scope > voice > Spanner[type="Volta"], :scope > Spanner[type="Volta"]'))){const p=E(a,"Volta");if(!p)continue;const h=E(E(a,"next")??a,"location"),f=Math.max(1,Number(h&&w(h,"measures"))||1);e[o].voltas.push({endings:Z(p),length:f,open:W(p)})}for(let a=i;a&&(a===i||a.tagName!=="Measure");a=a.nextElementSibling)N(a,"LayoutBreak").some(p=>w(p,"subtype")==="section")&&(e[o].sectionEnd=!0)})}return e}const W=r=>w(r,"endHookType")!=="1",Z=r=>(w(r,"endings")??"1").split(/[\s,]+/).map(t=>parseInt(t,10)).filter(t=>t>0),zt=101010256,Ht=33639248,Kt=67324752,Yt=r=>r.length>=4&&r[0]===80&&r[1]===75&&r[2]===3&&r[3]===4;class Xt{constructor(t){this.bytes=t,this.entries=new Map,this.view=new DataView(t.buffer,t.byteOffset,t.byteLength),this.readCentralDirectory()}get names(){return[...this.entries.keys()]}has(t){return this.entries.has(t)}async readText(t){return it(await this.read(t))}async read(t){const e=this.entries.get(t);if(!e)throw new Error(`Missing file in archive: ${t}`);const s=e.localOffset;if(this.view.getUint32(s,!0)!==Kt)throw new Error(`Corrupt archive entry: ${t}`);const n=s+30+this.view.getUint16(s+26,!0)+this.view.getUint16(s+28,!0),i=this.bytes.subarray(n,n+e.compressedSize);if(e.method===0)return i;if(e.method===8)return Qt(i);throw new Error(`Unsupported compression method ${e.method} for ${t}`)}readCentralDirectory(){const t=this.findEndOfCentralDirectory(),e=this.view.getUint16(t+10,!0);let s=this.view.getUint32(t+16,!0);const n=new TextDecoder("utf-8");for(let i=0;i<e;i++){if(this.view.getUint32(s,!0)!==Ht)throw new Error("Corrupt archive: bad central directory");const o=this.view.getUint16(s+28,!0),c=this.view.getUint16(s+30,!0),l=this.view.getUint16(s+32,!0),a=n.decode(this.bytes.subarray(s+46,s+46+o));this.entries.set(a,{name:a,method:this.view.getUint16(s+10,!0),compressedSize:this.view.getUint32(s+20,!0),localOffset:this.view.getUint32(s+42,!0)}),s+=46+o+c+l}}findEndOfCentralDirectory(){const t=this.bytes.length-22,e=Math.max(0,t-65535);for(let s=t;s>=e;s--)if(this.view.getUint32(s,!0)===zt)return s;throw new Error("Not a valid ZIP archive")}}async function Qt(r){const t=new Blob([r]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(t).arrayBuffer())}function it(r){return r[0]===255&&r[1]===254?new TextDecoder("utf-16le").decode(r):r[0]===254&&r[1]===255?new TextDecoder("utf-16be").decode(r):new TextDecoder("utf-8").decode(r)}const Wt=".musicxml,.xml,.mxl,.mscz,.mscx";async function Zt(r){const t=new Uint8Array(await r.arrayBuffer()),e=Yt(t)?await ee(new Xt(t)):it(t);return Jt(e)}function Jt(r){return/<museScore[\s>]/.test(r)?Dt(r):rt(r)}const te=/\.(mscx?|musicxml|xml)$/i;async function ee(r){if(r.has("META-INF/container.xml")){const e=new DOMParser().parseFromString(await r.readText("META-INF/container.xml"),"text/xml"),s=Array.from(e.querySelectorAll("rootfile")).map(n=>n.getAttribute("full-path")??"").find(n=>te.test(n)&&r.has(n));if(s)return r.readText(s)}const t=r.names.find(e=>/\.mscx?$/i.test(e))??r.names.find(e=>/\.(musicxml|xml)$/i.test(e)&&!e.startsWith("META-INF/"));if(!t)throw new Error("No score found in the archive");return r.readText(t)}const se=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],ne=25,oe=.3,ae=80/127;class re{constructor(t){this.soundType="grand",this.activeKeys=new Set,this.isAutoPlaying=!1,this.tempoMultiplier=1,this.stopAutoPlayRequested=!1,this.currentScore=null,this.keyElements=new Map,this.container=t,this.audio=new G,this.render()}setSoundType(t){this.soundType=t,this.updateUI()}setPedal(t){this.audio.setPedal(t)}async loadMusicXml(t){try{return this.currentScore=rt(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to parse MusicXML:",e),e}}async loadScoreFile(t){try{return this.currentScore=await Zt(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to load score:",e),e}}async playScore(t){const e=t||this.currentScore;if(!e||this.isAutoPlaying)return;this.isAutoPlaying=!0,this.stopAutoPlayRequested=!1,this.updateUI();const s=e.notes;this.soundType==="grand"&&await this.audio.preloadGrand(s);const n=Math.max(0,...s.map(l=>l.time+(l.duration??.8)));let i=-.1,o=this.audio.currentTime,c=0;await new Promise(l=>{const a=()=>{if(this.stopAutoPlayRequested){clearInterval(p),l();return}const h=this.audio.currentTime;i+=(h-o)*this.tempoMultiplier,o=h;const f=i+oe*this.tempoMultiplier;for(;c<s.length&&s[c].time<=f;){const d=s[c++],y=h+(d.time-i)/this.tempoMultiplier;this.playNote(d.keyIndex,(d.duration||.8)/this.tempoMultiplier,d.velocity??ae,y)}c>=s.length&&i>=n&&(clearInterval(p),l())},p=setInterval(a,ne);a()}),this.stopAutoPlayRequested&&this.audio.dampAll(),this.isAutoPlaying=!1,this.updateUI()}stopScore(){this.stopAutoPlayRequested=!0,this.audio.dampAll()}playNote(t,e=2.5,s=.8,n){if(this.audio.playNote(t,this.soundType,e,s,n),n===void 0)this.highlightKey(t);else{const i=Math.max(0,(n-this.audio.currentTime)*1e3);setTimeout(()=>this.highlightKey(t),i)}}highlightKey(t){const e=this.keyElements.get(t);e&&(e.classList.contains("sp-black-key"),e.classList.add("sp-active"),setTimeout(()=>e.classList.remove("sp-active"),250))}velocityFromPoint(t,e){const s=(t-e.top)/e.height,n=1-Math.max(0,Math.min(1,s));return Math.max(.06,Math.min(1,n))}render(){this.container.innerHTML=`
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
                  <input type="file" id="sp-xml-import" style="display:none" accept="${Wt}">
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
    `,this.setupEvents(),this.renderKeys(),this.renderSoundSelector()}setupEvents(){const t=this.container.querySelector("#sp-import-btn"),e=this.container.querySelector("#sp-xml-import"),s=this.container.querySelector("#sp-play-btn"),n=this.container.querySelector("#sp-stop-btn");t.onclick=()=>e.click(),e.onchange=async p=>{const h=p.target.files[0];if(e.value="",!!h)try{await this.loadScoreFile(h)}catch(f){alert(`Cannot read ${h.name}: ${f instanceof Error?f.message:f}`)}},s.onclick=()=>this.playScore(),n.onclick=()=>this.stopScore();const i=this.container.querySelector("#sp-pedal-btn");i.onclick=()=>{const p=!this.audio.pedal;this.audio.setPedal(p),i.classList.toggle("sp-pedal-on",p),i.setAttribute("aria-pressed",String(p))};const o=this.container.querySelector("#sp-vol-down"),c=this.container.querySelector("#sp-vol-up"),l=this.container.querySelector("#sp-tempo-down"),a=this.container.querySelector("#sp-tempo-up");o.onclick=()=>{this.audio.volume=Math.round((this.audio.volume-.1)*10)/10,this.updateUI()},c.onclick=()=>{this.audio.volume=Math.round((this.audio.volume+.1)*10)/10,this.updateUI()},l.onclick=()=>{this.tempoMultiplier=Math.max(.25,Math.round((this.tempoMultiplier-.25)*4)/4),this.updateUI()},a.onclick=()=>{this.tempoMultiplier=Math.min(2,Math.round((this.tempoMultiplier+.25)*4)/4),this.updateUI()}}renderKeys(){const t=this.container.querySelector("#sp-white-keys"),e=this.container.querySelector("#sp-keys-bed");t.innerHTML="",this.keyElements.clear();let s=0;const n=[],i=[];for(let c=0;c<88;c++){const l=(c+9)%12,a=se[l],p=Math.floor((c+9)/12);a.includes("#")?i.push({i:c,noteName:a,octave:p,whiteBefore:s}):(n.push({i:c,noteName:a,octave:p}),s++)}n.forEach(c=>{const l=document.createElement("div");if(l.className="sp-white-key",l.onmousedown=a=>this.playNote(c.i,2.5,this.velocityFromPoint(a.clientY,l.getBoundingClientRect())),l.ontouchstart=a=>{a.preventDefault(),this.playNote(c.i,2.5,this.velocityFromPoint(a.touches[0].clientY,l.getBoundingClientRect()))},c.noteName==="C"||c.i===0||c.i===87){const a=document.createElement("div");a.className="sp-key-label",a.textContent=`${c.noteName}${c.octave}`,l.appendChild(a)}t.appendChild(l),this.keyElements.set(c.i,l)});const o=1/52*100*.6;i.forEach(c=>{const l=document.createElement("div");l.className="sp-black-key";const a=c.whiteBefore/52*100;l.style.left=`${a-o/2}%`,l.style.width=`${o}%`,l.onmousedown=p=>this.playNote(c.i,2.5,this.velocityFromPoint(p.clientY,l.getBoundingClientRect())),l.ontouchstart=p=>{p.preventDefault(),this.playNote(c.i,2.5,this.velocityFromPoint(p.touches[0].clientY,l.getBoundingClientRect()))},e.appendChild(l),this.keyElements.set(c.i,l)})}renderSoundSelector(){const t=this.container.querySelector("#sp-sound-selector"),e=Object.keys(O);t.innerHTML=e.map(s=>`<button class="sp-sound-btn ${this.soundType===s?"sp-selected":""}" data-type="${s}">${O[s].name}</button>`).join(""),t.querySelectorAll("button").forEach(s=>{s.onclick=()=>this.setSoundType(s.getAttribute("data-type"))})}updateUI(){const t=this.container.querySelector("#sp-play-btn"),e=this.container.querySelector("#sp-stop-btn"),s=this.container.querySelector("#sp-title"),n=this.container.querySelector("#sp-subtitle"),i=this.container.querySelector("#sp-icon");this.isAutoPlaying?(i.classList.add("sp-playing"),n.textContent="Automated Performance System"):(i.classList.remove("sp-playing"),n.textContent="Integrated Synthesis System"),this.currentScore&&(t.style.display=this.isAutoPlaying?"none":"flex",e.style.display=this.isAutoPlaying?"flex":"none",s.textContent=this.isAutoPlaying?`PLAYING: ${this.currentScore.title}`:`SCORE: ${this.currentScore.title}`);const o=this.container.querySelector("#sp-vol-value"),c=this.container.querySelector("#sp-tempo-value");o&&(o.textContent=`${Math.round(this.audio.volume*100)}%`),c&&(c.textContent=`${this.tempoMultiplier.toFixed(2).replace(/0$/,"")}×`),this.renderSoundSelector()}}const J=document.getElementById("piano-container");J&&new re(J);
