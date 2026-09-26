(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const r of n)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function e(n){const r={};return n.integrity&&(r.integrity=n.integrity),n.referrerPolicy&&(r.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?r.credentials="include":n.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(n){if(n.ep)return;n.ep=!0;const r=e(n);fetch(n.href,r)}})();const $={grand:{name:"Sodor Grand",oscTypes:["sine","sine","sine","sine","sine","sine","sine"],gains:[.35,.2,.14,.09,.06,.04,.025],detune:[0,1200,1904,2404,2791,3110,3379],decayRates:[1,1.4,2,2.8,3.8,5,6.5],hammerNoise:.08,filterType:"lowpass",filterFreq:5e3,filterEndFreq:1e3,attack:.003,decay:2.5,sustain:.008,release:.6},electric:{name:"Electric Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,1200],attack:.01,decay:1,sustain:.3,release:.5},synth:{name:"Tidmouth Synth",oscTypes:["sawtooth","square"],gains:[.3,.2],detune:[0,5],filterType:"lowpass",filterFreq:1200,filterEndFreq:400,attack:.1,decay:.5,sustain:.5,release:1.2},organ:{name:"Vicarstown Organ",oscTypes:["sine","sine","sine"],gains:[.4,.2,.2],detune:[0,1200,1900],attack:.05,decay:.1,sustain:1,release:.8},whistle:{name:"Steam Whistle",oscTypes:["sine","triangle"],gains:[.4,.4],detune:[0,2],filterType:"highpass",filterFreq:800,attack:.2,decay:.3,sustain:.7,release:.5},bell:{name:"Station Bell",oscTypes:["sine","sine","triangle"],gains:[.4,.3,.2],detune:[0,1200,2400],attack:.002,decay:2,sustain:.01,release:2}},G=1e-4,ut=69,dt=a=>a<24?.15:a<48?.09:.06,ft=[{name:"p",below:.42,reference:.3},{name:"m",below:.72,reference:.57},{name:"f",below:1/0,reference:.85}],O=class O{constructor(){this.ctx=null,this.masterGainNode=null,this.compressor=null,this.reverb=null,this._volume=.8,this.activeVoices=[],this.maxPolyphony=64,this._pedalDown=!1,this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this.RES_FREQS=[55,65.41,77.78,92.5,110,130.81,155.56,185,220,261.63,311.13,369.99,440,523.25,622.25,740,880,1046.5,1244.5,1480,1760,2093,2489,2960,3520,4186],this.sampleCache=new Map,this.sampleLoads=new Map}get sampleBase(){return"/SodorPiano/".replace(/\/$/,"")+"/assets/samples/"}loadSample(t,e){const s=this.sampleCache.get(e);if(s)return Promise.resolve(s);const n=this.sampleLoads.get(e);if(n)return n;const r=fetch(this.sampleBase+e).then(o=>{if(!o.ok)throw new Error("HTTP "+o.status);return o.arrayBuffer()}).then(o=>t.decodeAudioData(o)).then(o=>(this.sampleCache.set(e,o),this.sampleLoads.delete(e),o)).catch(o=>{throw this.sampleLoads.delete(e),o});return this.sampleLoads.set(e,r),r}get pedal(){return this._pedalDown}get canResonate(){return this._pedalDown||this.activeVoices.length>0}get volume(){return this._volume}set volume(t){this._volume=Math.max(0,Math.min(1,t)),this.masterGainNode&&this.ctx&&this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime)}initCtx(){if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext),this.masterGainNode=this.ctx.createGain(),this.masterGainNode.gain.setValueAtTime(this._volume,this.ctx.currentTime),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-18,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(4,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGainNode.connect(this.compressor),this.compressor.connect(this.ctx.destination),this.reverb=this.ctx.createConvolver(),this.reverb.buffer=ht(this.ctx);const t=this.ctx.createGain();t.gain.setValueAtTime(.5,this.ctx.currentTime),this.masterGainNode.connect(this.reverb),this.reverb.connect(t),t.connect(this.compressor),this.initResonance(this.ctx)}return this.ctx.state==="suspended"&&this.ctx.resume(),this.ctx}get output(){return this.masterGainNode}get currentTime(){return this.initCtx().currentTime}async preloadGrand(t){const e=this.initCtx(),s=new Set(t.map(n=>this.grandSample(n.keyIndex,n.velocity??.8).file));await Promise.allSettled([...s].map(n=>this.loadSample(e,n)))}dampVoice(t,e,s=.012){if(t.damper){if(e<t.startTime){t.damper.disconnect(),t.stopTime=e;return}const o=e+s*9,c=t.damping;if(c&&c.at<=e&&c.end<=o)return;const l=!c||e<=c.at?1:e>=c.end?G:c.from*Math.pow(G/c.from,(e-c.at)/(c.end-c.at));t.damper.gain.cancelScheduledValues(e),t.damper.gain.setValueAtTime(l,e),t.damper.gain.exponentialRampToValueAtTime(G,o),t.damping={from:l,at:e,end:o},t.stopScheduled||(t.sources.forEach(i=>{try{i.stop(o)}catch{}}),t.stopScheduled=!0),t.stopTime=Math.min(t.stopTime,o);return}const n=.03;t.gainNode.gain.cancelScheduledValues(e);const r=Math.max(t.gainNode.gain.value,1e-4);t.gainNode.gain.setValueAtTime(r,e),t.gainNode.gain.exponentialRampToValueAtTime(1e-4,e+n),t.oscillators.forEach(o=>{try{o.stop(e+n+.01)}catch{}}),t.sources.forEach(o=>{try{o.stop(e+n+.01)}catch{}})}dampAll(){if(!this.ctx)return;const t=this.ctx.currentTime;this.activeVoices.forEach(e=>this.dampVoice(e,t)),this.activeVoices=[]}setPedal(t){if(t===this._pedalDown||(this._pedalDown=t,!this.ctx))return;const e=this.ctx.currentTime;if(!t){const s=[...this.activeVoices];this.activeVoices=[],s.forEach(n=>this.dampVoice(n,e))}}initResonance(t){this.resonanceInput||(this.resonanceInput=t.createGain(),this.resonanceOutput=t.createGain(),this.resonanceFeed=t.createGain(),this.resonanceFeed.gain.setValueAtTime(1,t.currentTime),this.resonanceOutput.gain.setValueAtTime(1e-4,t.currentTime),this.resonanceOutput.gain.linearRampToValueAtTime(.0015,t.currentTime+.5),this.resonators=this.RES_FREQS.map(e=>t.createBiquadFilter()),this.resonators.forEach((e,s)=>{const n=this.RES_FREQS[s];e.type="bandpass";const r=30+s/this.RES_FREQS.length*40;e.frequency.setValueAtTime(n,t.currentTime),e.Q.setValueAtTime(r,t.currentTime),e.gain.setValueAtTime(1,t.currentTime),e.connect(this.resonanceOutput)}),this.resonanceInput.connect(this.resonanceFeed),this.resonators.forEach(e=>this.resonanceFeed.connect(e)),this.resonanceOutput.connect(this.masterGainNode))}managePolyphony(t,e,s=t.currentTime){for(this.activeVoices=this.activeVoices.filter(n=>n.keyIndex===e&&n.startTime<=s?(this.dampVoice(n,s,.04),!1):!0),this.activeVoices=this.activeVoices.filter(n=>n.stopTime>s);this.activeVoices.length>=this.maxPolyphony;){const n=this.activeVoices.shift();this.dampVoice(n,s,.03)}}getFrequency(t){return 27.5*Math.pow(2,t/12)}playNote(t,e="grand",s=1.2,n=.9,r){const o=this.initCtx(),c=Math.max(r??0,o.currentTime);if(this.managePolyphony(o,t,c),e==="grand"){const y=r===void 0&&s>=2;this.playGrandPiano(o,t,s,n,c,y).catch(A=>console.error("[SodorPiano] grand note error:",A));return}const l=$[e],i=c,p=this.getFrequency(t),h=!!l.decayRates,d=o.createGain();if(l.filterType){const y=o.createBiquadFilter();y.type=l.filterType,y.frequency.setValueAtTime(l.filterFreq||2e3,i),l.filterEndFreq&&y.frequency.exponentialRampToValueAtTime(l.filterEndFreq,i+l.decay),d.connect(y),y.connect(this.output)}else d.connect(this.output);if(h?(d.gain.setValueAtTime(1,i),d.gain.setValueAtTime(1,i+s),d.gain.exponentialRampToValueAtTime(.001,i+s+l.release)):(d.gain.setValueAtTime(0,i),d.gain.linearRampToValueAtTime(.4,i+l.attack),d.gain.exponentialRampToValueAtTime(l.sustain*.4,i+l.attack+l.decay),d.gain.exponentialRampToValueAtTime(.001,i+s+l.release)),l.hammerNoise&&l.hammerNoise>0){const y=Math.floor(o.sampleRate*.025),A=o.createBuffer(1,y,o.sampleRate),x=A.getChannelData(0);for(let M=0;M<y;M++)x[M]=Math.random()*2-1;const b=o.createBufferSource();b.buffer=A;const v=o.createBiquadFilter();v.type="bandpass",v.frequency.setValueAtTime(Math.min(p*3,8e3),i),v.Q.setValueAtTime(1,i);const S=o.createGain();S.gain.setValueAtTime(l.hammerNoise,i),S.gain.exponentialRampToValueAtTime(.001,i+.04),b.connect(v),v.connect(S),S.connect(d),b.start(i),b.stop(i+.05)}const u=[];l.oscTypes.forEach((y,A)=>{const x=o.createOscillator(),b=o.createGain();if(x.type=y,x.frequency.setValueAtTime(p,i),l.detune&&l.detune[A]!==void 0&&x.detune.setValueAtTime(l.detune[A],i),h){const v=l.decayRates[A]||1,S=l.gains[A],M=Math.max(1e-4,S*l.sustain);b.gain.setValueAtTime(0,i),b.gain.linearRampToValueAtTime(S,i+l.attack),b.gain.exponentialRampToValueAtTime(M,i+l.attack+l.decay/v),b.gain.exponentialRampToValueAtTime(1e-4,i+s+l.release)}else b.gain.setValueAtTime(l.gains[A],i);x.connect(b),b.connect(d),x.start(i),x.stop(i+s+l.release),u.push(x)}),this.activeVoices.push({keyIndex:t,gainNode:d,startTime:i,stopTime:i+s+l.release,oscillators:u,sources:[]})}grandSample(t,e){const s=O.GRAND_SAMPLE_MAP[t]||O.GRAND_SAMPLE_MAP[39],n=ft.find(o=>e<o.below);return{file:`${s.note.replace("#","s")}_${n.name}.mp3`,rate:s.rate,layer:n}}async playGrandPiano(t,e,s,n,r,o){if(!this.ctx||this.ctx.state==="closed")return;const c=this.ctx,l=Math.max(.05,Math.min(1,n)),{file:i,rate:p,layer:h}=this.grandSample(e,l);let d;try{d=await this.loadSample(c,i)}catch(f){console.error("[SodorPiano] failed to load sample",i,f),this.playGrandSynthFallback(c,e,s,l);return}const u=Math.max(r,c.currentTime),y=c.createBufferSource();y.buffer=d,y.playbackRate.setValueAtTime(p,u);const A=c.createGain(),x=.9*Math.min(1.4,Math.max(.5,l/h.reference));A.gain.setValueAtTime(0,u),A.gain.linearRampToValueAtTime(x,u+.003);const b=c.createGain();b.gain.setValueAtTime(1,u);const v=c.createBiquadFilter();v.type="peaking";const S=this.getFrequency(e);if(v.frequency.setValueAtTime(S<200?120:420,u),v.Q.setValueAtTime(.8,u),v.gain.setValueAtTime(S<200?2:1.2,u),y.connect(A),A.connect(b),b.connect(v),v.connect(this.output),this.canResonate&&this.resonanceInput){const f=c.createGain();f.gain.setValueAtTime(.18*l,u),f.gain.exponentialRampToValueAtTime(1e-4,u+.2),A.connect(f),f.connect(this.resonanceInput)}const M=u+d.duration/p,m={keyIndex:e,gainNode:A,damper:b,startTime:u,stopTime:M,oscillators:[],sources:[y]};y.start(u),!o&&e<ut&&this.dampVoice(m,u+Math.max(.03,s),dt(e)),this.activeVoices.push(m)}playGrandSynthFallback(t,e,s,n=.9){const r=t.currentTime,o=this.getFrequency(e),c=t.createGain(),l=Math.max(.05,Math.min(1,n)),i=.5*(.3+.7*l);c.gain.setValueAtTime(0,r),c.gain.linearRampToValueAtTime(i,r+.004),c.gain.exponentialRampToValueAtTime(1e-4,r+s+.3),c.connect(this.output);const p=[],h=[1,2,3,4,5],d=[1,.45,.25,.14,.08];for(let u=0;u<h.length;u++){const y=t.createOscillator(),A=t.createGain();y.type="sine",y.frequency.setValueAtTime(o*h[u]*(1+3e-4*h[u]*h[u]),r),A.gain.setValueAtTime(d[u]*(.3+.7*l),r),A.gain.exponentialRampToValueAtTime(1e-4,r+s+.3),y.connect(A),A.connect(c),y.start(r),y.stop(r+s+.35),p.push(y)}this.activeVoices.push({keyIndex:e,gainNode:c,startTime:r,stopTime:r+s+.35,oscillators:p,sources:[]})}close(){this.ctx&&(this.activeVoices=[],this.resonanceInput=null,this.resonanceOutput=null,this.resonanceFeed=null,this.resonators=[],this._pedalDown=!1,this.ctx.close(),this.ctx=null,this.compressor=null,this.reverb=null)}};O.GRAND_SAMPLE_MAP=[{note:"A0",rate:1},{note:"A0",rate:1.059463},{note:"C1",rate:.943874},{note:"C1",rate:1},{note:"C1",rate:1.059463},{note:"D#1",rate:.943874},{note:"D#1",rate:1},{note:"D#1",rate:1.059463},{note:"F#1",rate:.943874},{note:"F#1",rate:1},{note:"F#1",rate:1.059463},{note:"A1",rate:.943874},{note:"A1",rate:1},{note:"A1",rate:1.059463},{note:"C2",rate:.943874},{note:"C2",rate:1},{note:"C2",rate:1.059463},{note:"D#2",rate:.943874},{note:"D#2",rate:1},{note:"D#2",rate:1.059463},{note:"F#2",rate:.943874},{note:"F#2",rate:1},{note:"F#2",rate:1.059463},{note:"A2",rate:.943874},{note:"A2",rate:1},{note:"A2",rate:1.059463},{note:"C3",rate:.943874},{note:"C3",rate:1},{note:"C3",rate:1.059463},{note:"D#3",rate:.943874},{note:"D#3",rate:1},{note:"D#3",rate:1.059463},{note:"F#3",rate:.943874},{note:"F#3",rate:1},{note:"F#3",rate:1.059463},{note:"A3",rate:.943874},{note:"A3",rate:1},{note:"A3",rate:1.059463},{note:"C4",rate:.943874},{note:"C4",rate:1},{note:"C4",rate:1.059463},{note:"D#4",rate:.943874},{note:"D#4",rate:1},{note:"D#4",rate:1.059463},{note:"F#4",rate:.943874},{note:"F#4",rate:1},{note:"F#4",rate:1.059463},{note:"A4",rate:.943874},{note:"A4",rate:1},{note:"A4",rate:1.059463},{note:"C5",rate:.943874},{note:"C5",rate:1},{note:"C5",rate:1.059463},{note:"D#5",rate:.943874},{note:"D#5",rate:1},{note:"D#5",rate:1.059463},{note:"F#5",rate:.943874},{note:"F#5",rate:1},{note:"F#5",rate:1.059463},{note:"A5",rate:.943874},{note:"A5",rate:1},{note:"A5",rate:1.059463},{note:"C6",rate:.943874},{note:"C6",rate:1},{note:"C6",rate:1.059463},{note:"D#6",rate:.943874},{note:"D#6",rate:1},{note:"D#6",rate:1.059463},{note:"F#6",rate:.943874},{note:"F#6",rate:1},{note:"F#6",rate:1.059463},{note:"A6",rate:.943874},{note:"A6",rate:1},{note:"A6",rate:1.059463},{note:"C7",rate:.943874},{note:"C7",rate:1},{note:"C7",rate:1.059463},{note:"D#7",rate:.943874},{note:"D#7",rate:1},{note:"D#7",rate:1.059463},{note:"F#7",rate:.943874},{note:"F#7",rate:1},{note:"F#7",rate:1.059463},{note:"A7",rate:.943874},{note:"A7",rate:1},{note:"A7",rate:1.059463},{note:"C8",rate:.943874},{note:"C8",rate:1}];let j=O;function ht(a){const e=Math.floor(.012*a.sampleRate),s=Math.floor(1.6*a.sampleRate),n=a.createBuffer(2,s,a.sampleRate);for(let r=0;r<2;r++){const o=n.getChannelData(r);let c=0;for(let l=e;l<s;l++){const i=(l-e)/a.sampleRate,p=.25+.7*Math.min(1,i/1.6);c=p*c+(1-p)*(Math.random()*2-1),o[l]=c*Math.exp(-6.9*i/1.6)}}return n}const nt=()=>({length:0,notes:[],tempos:[],dynamics:[],hairpins:[],pedals:[]}),ot=()=>({forward:!1,backward:0,voltas:[],markers:[],jump:null,sectionEnd:!1}),mt=80/127,gt=120,at=2e4,q=1e-6,H={pppppp:1,ppppp:5,pppp:10,ppp:16,pp:33,p:49,mp:64,mf:80,f:96,ff:112,fff:126,ffff:127,fffff:127,ffffff:127},K={sf:[112,void 0],sfz:[112,void 0],sffz:[126,void 0],fz:[112,void 0],rf:[112,void 0],rfz:[112,void 0],fp:[96,49],sfp:[112,49],sfpp:[112,33],pf:[49,96]};function rt(a,t,e){const s=a.toLowerCase();if(s in H)return{offset:t,velocity:(e??H[s])/127};if(s in K){const[n,r]=K[s];return{offset:t,velocity:(e??n)/127,momentary:!0,after:r===void 0?void 0:r/127}}return null}function bt(a){const t=[];let e=0;return a.forEach((s,n)=>{(s.sectionEnd||n===a.length-1)&&(t.push(...yt(a,e,n+1)),e=n+1)}),t.slice(0,at)}function yt(a,t,e){const s=[],n=vt(a,t,e),r=n.map((m,f)=>At(n,f)),o=wt(n),c=new Map,l=new Set,i=xt(a,t,e);let p=[{start:t,pass:1,done:!1}];const h=()=>p[p.length-1];let d=t;const u=new Map;o.forEach((m,f)=>{m&&!u.has(m)&&a[t+f].backward>0&&u.set(m,i.get(t+f).start)});const y=o.map(m=>u.has(m)?u.get(m):void 0),A=m=>{const f=y[m-t];if(f===void 0)return h().pass;const g=f??d;for(let w=p.length-1;w>=0;w--)if(p[w].start===g)return p[w].pass;return h().pass};let x=null;const b=m=>{const f=[];for(let g=t;g<e;g++)a[g].markers.includes(m)&&f.push(g);return f},v=m=>a.slice(m,e).some(f=>f.backward>0),S=(m,f)=>n[m-t].every(g=>g.includes(f)),M=m=>{let f=0;for(let w=m;w<e&&(w===m||!a[w].forward);w++){const T=a[w].backward;T>0&&(f+=Math.max(0,T-1-(c.get(w)??0)))}const g=h().pass;for(let w=g+1;w<=g+f;w++)if(S(m,w))return!0;return!1};for(let m=t;m<e&&s.length<at;){const f=a[m],g=!x||x.playRepeats||m>x.from,T=!g||x&&!x.playRepeats&&o[m-t]>0&&o[m-t]===o[x.from-t]?r[m-t]:A(m);if(g&&f.forward&&h().start!==m&&S(m,T)){for(;p.length>1&&h().done;)p.pop();p.push({start:m,pass:1,done:!1})}if(!S(m,T)){if(!g||v(m)){m++;continue}let V=m+1;for(;V<e&&!(n[V-t].length&&S(V,T));)V++;m=V;continue}if(s.push(m),x&&x.until===m&&!(g&&M(m))){if(x.coda===null)break;m=x.coda,x=null,d=m,p=[{start:m,pass:1,done:!1}];continue}const R=f.jump;if(R&&!l.has(m)&&!(g&&M(m))){l.add(m);const V=b(R.to),F=R.to==="start"?t:V.filter(P=>P<=m).pop()??V[0]??null;if(F!==null){const P=R.until==="end"?[]:b(R.until),D=P.find(I=>I>=F)??P[0]??null,z=R.continueAt?b(R.continueAt):[];if(x={from:m,until:D,coda:D===null?null:z.find(I=>I>m)??z[0]??null,playRepeats:R.playRepeats},R.playRepeats&&c.clear(),m=F,d=R.playRepeats?t:F,p=[{start:d,pass:1,done:!1}],R.playRepeats){let I=F;for(;I>t&&!a[I].forward;)I--;a[I].forward&&p.push({start:I,pass:1,done:!1})}continue}}if(g&&f.backward>0){const V=i.get(m),F=V.start??d;let P=p.map(D=>D.start).lastIndexOf(F);if(P<0&&(p.push({start:F,pass:1,done:!1}),P=p.length-1),p=p.slice(0,P+1),(c.get(m)??0)<f.backward-1){if(c.set(m,(c.get(m)??0)+1),h().pass++,h().done=!1,V.nested)for(let D=F+1;D<m;D++)c.delete(D);m=F;continue}h().done=!0}m++}return s}function xt(a,t,e){const s=new Map,n=[];let r=null;for(let o=t;o<e;o++)if(a[o].forward&&(n.push(o),r=o),a[o].backward>0){const c=n.pop();s.set(o,c!==void 0?{start:c,nested:!0}:{start:r,nested:!1})}return s}function vt(a,t,e){const s=Array.from({length:e-t},()=>[]);for(let n=t;n<e;n++)for(const r of a[n].voltas){let o=Math.min(e,n+Math.max(1,r.length));if(r.open&&!a[n].forward){for(let c=n;c<e&&!(c>n&&(a[c].voltas.length||a[c].forward));c++)if(a[c].backward>0){o=Math.max(o,c+1);break}}for(let c=n;c<o;c++)s[c-t].push(r.endings)}return s}function wt(a){let t=0;return a.map((e,s)=>e.length?s>0&&a[s-1].length?t:++t:0)}function At(a,t){if(!a[t].length)return 0;let e=t,s=t;for(;e>0&&a[e-1].length;)e--;for(;s<a.length-1&&a[s+1].length;)s++;return Math.max(...a.slice(e,s+1).flat(2))}function it(a,t,e,s=t.map((n,r)=>r)){const n=bt(e),r=Math.max(0,...t.map(x=>x.length)),o=[];for(let x=0;x<r;x++)o.push(Math.max(0,...t.map(b=>{var v;return((v=b[x])==null?void 0:v.length)??0})));const c=[];let l=0;for(const x of n)c.push(l),l+=o[x];const i=[],p=new Map,h=new Map,d=new Map;t.forEach((x,b)=>{const v=s[b];p.has(v)||(p.set(v,[]),h.set(v,[]),d.set(v,[])),n.forEach((S,M)=>{const m=x[S];if(!m)return;const f=c[M];for(const g of m.tempos)i.push({...g,offset:f+g.offset});for(const g of m.dynamics)p.get(v).push({...g,offset:f+g.offset});for(const g of m.hairpins)h.get(v).push({...g,offset:f+g.offset});for(const g of m.pedals)d.get(v).push({...g,offset:f+g.offset})})});const u=Et(i),y=new Map([...d].map(([x,b])=>[x,Mt(b,l)])),A=[];return t.forEach((x,b)=>{const v=s[b],S=St(p.get(v),h.get(v),l),M=y.get(v),m=new Map,f=[];n.forEach((g,w)=>{var T;for(const C of((T=x[g])==null?void 0:T.notes)??[]){const R=c[w]+C.offset,V=R+C.duration*(C.held??1),F=C.tieStop?m.get(C.keyIndex):void 0;if(F)F.release=V;else{const P=Math.max(.05,Math.min(1,S(R)*(C.accent??1))),D={keyIndex:C.keyIndex,start:R,release:V,velocity:P};f.push(D),m.set(C.keyIndex,D)}}});for(const g of f){const w=u(g.start);A.push({keyIndex:g.keyIndex,time:w,duration:u(M(g.release))-w,velocity:g.velocity})}}),{id:`imported-${Date.now()}`,title:a,thumbnail:"🎼",notes:A.sort((x,b)=>x.time-b.time)}}function kt(a,t){let e=mt,s;for(const n of a){if(n.offset>t+q)break;n.momentary?n.after!==void 0&&(e=n.after):e=n.velocity,s=n.momentary&&Math.abs(n.offset-t)<q?n.velocity:void 0}return{level:e,hit:s}}const _=[16,33,49,64,80,96,112,126].map(a=>a/127);function Tt(a,t){const e=.003937007874015748;return t>0?_.find(s=>s>a+e)??1:[..._].reverse().find(s=>s<a-e)??_[0]}function St(a,t,e){const s=[...a].sort((p,h)=>p.offset-h.offset),n=s.filter(p=>!p.momentary||p.after!==void 0),r=[],o=p=>{const{level:h,hit:d}=kt(s,p);if(d!==void 0)return d;const u=r.find(y=>p>=y.start-q&&p<y.end-q);return u?u.from+(u.to-u.from)*(p-u.start)/(u.end-u.start):h},c=[];let l=null;const i=[...t].sort((p,h)=>p.offset-h.offset||+(p.kind!=="end")-+(h.kind!=="end"));for(const p of i)l&&p.offset>l.start+q&&c.push({...l,end:p.offset}),p.kind==="end"?l=null:(!l||p.offset>l.start+q)&&(l={kind:p.kind,start:p.offset});l&&e>l.start+q&&c.push({...l,end:e});for(const p of c){const h=o(p.start),d=n.find(b=>b.offset>p.start+q&&b.offset<p.end-q),u=d?d.offset:p.end,y=n.find(b=>Math.abs(b.offset-u)<q),A=p.kind==="cresc"?1:-1,x=y&&Math.sign(y.velocity-h)===A?y.velocity:Tt(h,A);r.push({start:p.start,end:u,from:h,to:x}),y||(s.push({offset:u,velocity:x}),s.sort((b,v)=>b.offset-v.offset))}return o}function Mt(a,t){const e=[];let s=null;for(const n of[...a].sort((r,o)=>r.offset-o.offset||Number(r.down)-Number(o.down)))n.down&&s===null&&(s=n.offset),!n.down&&s!==null&&(e.push([s,n.offset]),s=null);return s!==null&&e.push([s,t]),n=>{const r=e.find(([o,c])=>n>o+q&&n<c);return r?r[1]:n}}function Et(a){var s;const t=a.filter(n=>n.bpm>0).sort((n,r)=>n.offset-r.offset),e=[{beat:0,seconds:0,secondsPerBeat:60/(((s=t[0])==null?void 0:s.bpm)??gt)}];for(const n of t){const r=e[e.length-1],o=r.seconds+(n.offset-r.beat)*r.secondsPerBeat;e.push({beat:n.offset,seconds:o,secondsPerBeat:60/n.bpm})}return n=>{let r=e[0];for(const o of e){if(o.beat>n)break;r=o}return r.seconds+(n-r.beat)*r.secondsPerBeat}}const Y={C:0,D:2,E:4,F:5,G:7,A:9,B:11},Nt=.125,X={staccatissimo:.33,spiccato:.33,staccato:.5,"detached-legato":.67,"strong-accent":.67,tenuto:1},Q={accent:1.5,"strong-accent":1.2},ct=(a,t)=>{var e;return((e=a.querySelector(t))==null?void 0:e.textContent)??void 0},B=(a,t,e)=>{const s=parseFloat(ct(a,t)??"");return Number.isFinite(s)?s:e},lt=a=>{var o,c;const e=new DOMParser().parseFromString(a,"text/xml");if(e.querySelector("parsererror"))throw new Error("The file is not valid XML");if(!e.querySelector("score-partwise"))throw new Error(e.querySelector("score-timewise")?"Timewise MusicXML is not supported; export the score as partwise MusicXML":"Not a MusicXML score");const s=((o=e.querySelector("work-title"))==null?void 0:o.textContent)||((c=e.querySelector("movement-title"))==null?void 0:c.textContent)||"Imported Melody",n=Array.from(e.querySelectorAll("part")),r=l=>Array.from(l.children).filter(i=>i.tagName==="measure");return it(s,n.map(l=>Ct(r(l))),n.length?Vt(r(n[0])):[])};function Ct(a){let t=1;return a.map(e=>{const s=nt();let n=0,r=0,o=0;const c=(i,p,h)=>{if(!i)return;const d=p/t,u=parseFloat(i.getAttribute("tempo")??"");u>0&&s.tempos.push({offset:d,bpm:u});const y=parseFloat(i.getAttribute("dynamics")??"");y>=0&&!h.dynamic&&s.dynamics.push({offset:d,velocity:Math.min(1,y*.9/127)});const A=i.getAttribute("damper-pedal");A&&!h.pedal&&s.pedals.push({offset:d,down:A!=="no"})},l=(i,p)=>{const h=p/t,d=i.querySelector(":scope > sound"),u=parseFloat((d==null?void 0:d.getAttribute("dynamics"))??"");let y=!1;for(const x of Array.from(i.querySelectorAll("direction-type > dynamics > *"))){const b=rt(x.tagName,h,u>=0?Math.min(127,u*.9):void 0);b&&(s.dynamics.push(b),y=!0)}for(const x of Array.from(i.querySelectorAll("direction-type > wedge"))){const b=x.getAttribute("type");b==="crescendo"&&s.hairpins.push({offset:h,kind:"cresc"}),b==="diminuendo"&&s.hairpins.push({offset:h,kind:"dim"}),b==="stop"&&s.hairpins.push({offset:h,kind:"end"})}let A=!1;for(const x of Array.from(i.querySelectorAll("direction-type > pedal"))){const b=x.getAttribute("type");(b==="stop"||b==="change")&&s.pedals.push({offset:h,down:!1}),(b==="start"||b==="change"||b==="resume")&&s.pedals.push({offset:h,down:!0}),b==="discontinue"&&s.pedals.push({offset:h,down:!1}),A=!0}c(d,p,{dynamic:y,pedal:A})};for(const i of Array.from(e.children))switch(i.tagName){case"attributes":t=B(i,"divisions",t);break;case"direction":l(i,n+B(i,":scope > offset",0));break;case"sound":c(i,n,{dynamic:!1,pedal:!1});break;case"forward":n+=B(i,"duration",0),r=Math.max(r,n);break;case"backup":n-=B(i,"duration",0);break;case"note":{if(i.querySelector("cue"))break;const p=i.querySelector("grace")!==null,h=i.querySelector("chord")!==null,d=p?0:B(i,":scope > duration",0),u=h?o:n,y=ct(i,"pitch > step");if(i.querySelector("rest")===null&&y&&y in Y){const A=B(i,"pitch > octave",4),x=Math.round(B(i,"pitch > alter",0)),b=A*12+Y[y]+x-9;b>=0&&b<88&&s.notes.push({keyIndex:b,offset:u/t,duration:p?Nt:d/t,tieStop:i.querySelector('tie[type="stop"]')!==null,...Rt(i)})}!h&&!p&&(o=n,n+=d,r=Math.max(r,n));break}}return s.length=r/t,s})}function Rt(a){const t={};for(const e of Array.from(a.querySelectorAll("notations > articulations > *")))e.tagName in X&&(t.held=Math.min(t.held??1,X[e.tagName])),e.tagName in Q&&(t.accent=Math.max(t.accent??1,Q[e.tagName]));return t}function Vt(a){const t=a.map(()=>ot());let e=null;const s=(o,c)=>{e&&(t[e.start].voltas.push({endings:e.endings,length:o-e.start+1,open:c}),e=null)};a.forEach((o,c)=>{const l=t[c];for(const i of Array.from(o.querySelectorAll(":scope > barline"))){const p=i.querySelector("repeat");(p==null?void 0:p.getAttribute("direction"))==="forward"&&(l.forward=!0),(p==null?void 0:p.getAttribute("direction"))==="backward"&&(l.backward=parseInt(p.getAttribute("times")??"",10)||2);const h=i.querySelector("ending");if(!h)continue;const d=h.getAttribute("type");d==="start"?(s(c-1,!1),e={start:c,endings:(h.getAttribute("number")??"1").split(/[\s,]+/).map(u=>parseInt(u,10)).filter(u=>u>0)}):s(c,d==="discontinue")}for(const i of Array.from(o.querySelectorAll("sound"))){const p=i.getAttribute("segno"),h=i.getAttribute("coda"),d=i.getAttribute("tocoda");p!==null&&l.markers.push(`segno:${p}`),h!==null&&l.markers.push(`coda:${h}`),d!==null&&l.markers.push(`tocoda:${d}`),i.getAttribute("fine")!==null&&l.markers.push("fine");const u=i.getAttribute("dalsegno");(i.getAttribute("dacapo")==="yes"||u!==null)&&(l.jump={to:u!==null?`segno:${u}`:"start",until:"end",continueAt:"",playRepeats:!1})}}),s(a.length-1,!0);const n=t.flatMap(o=>o.markers).find(o=>o.startsWith("tocoda:")),r=t.some(o=>o.markers.includes("fine"));for(const o of t)o.jump&&(n?(o.jump.until=n,o.jump.continueAt=`coda:${n.slice(7)}`):r&&(o.jump.until="fine"));return t}const Ft={long:16,breve:8,whole:4,half:2,quarter:1,eighth:.5,"16th":1/4,"32nd":1/8,"64th":1/16,"128th":1/32,"256th":1/64,"512th":1/128,"1024th":1/256},W={"8va":12,"8vb":-12,"15ma":24,"15mb":-24,"22ma":36,"22mb":-36},Dt=/^(acciaccatura|appoggiatura|grace\d+(after)?)$/,qt=.125,Pt=21,N=(a,t)=>Array.from(a.children).filter(e=>!t||e.tagName===t),E=(a,t)=>N(a,t)[0],k=(a,t)=>{var e,s;return(s=(e=E(a,t))==null?void 0:e.textContent)==null?void 0:s.trim()},L=a=>{const[t,e]=(a??"").split("/").map(Number);return t&&e?t/e*4:0},It=a=>{const{score:t,staffElements:e,staves:s,partOf:n}=Bt(a),r=Number(k(t,"Division"))||480;return it(Ot(t),s.map(o=>$t(o,r)),Kt(s),e.map((o,c)=>n.get(o.getAttribute("id")??"")??-1-c))};function Bt(a){const t=new DOMParser().parseFromString(a,"text/xml");if(t.querySelector("parsererror"))throw new Error("The file is not valid XML");const e=t.documentElement,s=parseFloat(e.getAttribute("version")??"0");if(e.tagName!=="museScore")throw new Error("Not a MuseScore file");if(s<2)throw new Error("MuseScore 1 files are not supported; open and save the score in a later version of MuseScore");const n=E(e,"Score");if(!n)throw new Error("No score found in the MuseScore file");const{percussion:r,partOf:o}=Lt(n),c=N(n,"Staff").filter(i=>!r.has(i.getAttribute("id")??"")),l=c.map(i=>N(i,"Measure"));return{score:n,staffElements:c,staves:l,partOf:o}}function Ot(a){var e,s,n,r;const t=N(a,"metaTag").find(o=>o.getAttribute("name")==="workTitle");if((e=t==null?void 0:t.textContent)!=null&&e.trim())return t.textContent.trim();for(const o of Array.from(a.querySelectorAll(":scope > Staff > VBox > Text")))if(((s=k(o,"style"))==null?void 0:s.toLowerCase())==="title"){const c=(r=(n=E(o,"text"))==null?void 0:n.textContent)==null?void 0:r.trim();if(c)return c}return"Imported Melody"}function Lt(a){const t=new Set,e=new Map;return N(a,"Part").forEach((s,n)=>{var r;for(const o of N(s,"Staff")){const c=o.getAttribute("id")??"";e.set(c,n),((r=E(o,"StaffType"))==null?void 0:r.getAttribute("group"))==="percussion"&&t.add(c)}}),{percussion:t,partOf:e}}const Gt=[[/staccatissimo/i,.33],[new RegExp("(?<!tenuto)staccato","i"),.5],[/tenutoStaccato|portato/i,.67],[/marcato(?!tenuto)/i,.67],[/tenuto/i,1]],_t=[[/accent|sforzato/i,1.5],[/marcato/i,1.2]];function Ut(a){const t={};for(const e of N(a,"Articulation")){if(k(e,"play")==="0")continue;const s=k(e,"subtype")??"",n=Gt.filter(([o])=>o.test(s)).map(([,o])=>o);n.length&&(t.held=Math.min(t.held??1,...n));const r=_t.filter(([o])=>o.test(s)).map(([,o])=>o);r.length&&(t.accent=Math.max(t.accent??1,...r))}return t}function U(a,t,e){const s=E(E(a,"next")??a,"location");return{startMeasure:t,startBeat:e,endMeasure:t+(Number(s&&k(s,"measures"))||0),endBeat:e+L(s&&k(s,"fractions"))}}function $t(a,t){var p,h;let e=4,s=1,n=0;const r=[],o=[],c=[],l=new Map,i=a.map((d,u)=>{const y=nt(),A=N(d,"voice");let x=0;for(const b of A.length?A:[d]){let v=0;const S=[],M=new Map,m=f=>{const g=k(f,"Tuplet");return g&&M.has(g)?M.get(g):S.reduce((w,T)=>w*T,1)};for(const f of N(b)){switch(f.tagName){case"TimeSig":{const g=Number(k(f,"sigN")),w=Number(k(f,"sigD")),T=Number(k(f,"stretchN")),C=Number(k(f,"stretchD"));s=T&&C?T/C:1,g&&w&&(e=g/w*4/s);break}case"Tempo":{const g=parseFloat(k(f,"tempo")??"");g>0&&y.tempos.push({offset:v,bpm:g*60});break}case"tick":v=Number(f.textContent)/t-n;break;case"location":v+=L(k(f,"fractions"));break;case"Tuplet":{const g=Number(k(f,"normalNotes")),w=Number(k(f,"actualNotes"));if(g&&w){const T=f.getAttribute("id");T?M.set(T,g/w):S.push(g/w)}break}case"endTuplet":S.pop();break;case"Dynamic":{const g=Number(k(f,"velocity")),w=rt(k(f,"subtype")??"",v,g>0?g:void 0);w&&y.dynamics.push(w);break}case"Pedal":case"Ottava":case"HairPin":{const g=f.getAttribute("id");g&&l.set(g,{measure:u,beat:v,element:f});break}case"endSpanner":{const g=l.get(f.getAttribute("id")??"");if(!g)break;l.delete(f.getAttribute("id")??"");const w={startMeasure:g.measure,startBeat:g.beat,endMeasure:u,endBeat:v},T=g.element;T.tagName==="Pedal"&&o.push(w),T.tagName==="Ottava"&&r.push({...w,shift:W[k(T,"subtype")??""]??0}),T.tagName==="HairPin"&&c.push({...w,kind:J(T)});break}case"Spanner":{const g=E(f,"Ottava");f.getAttribute("type")==="Ottava"&&g&&r.push({...U(f,u,v),shift:W[k(g,"subtype")??""]??0}),f.getAttribute("type")==="Pedal"&&E(f,"Pedal")&&o.push(U(f,u,v));const w=E(f,"HairPin");f.getAttribute("type")==="HairPin"&&w&&c.push({...U(f,u,v),kind:J(w)});break}case"Rest":case"Chord":{const g=N(f).some(T=>Dt.test(T.tagName)),w=g?0:jt(f,e*s)*m(f)/s;if(f.tagName==="Chord")for(const T of N(f,"Note")){if(k(T,"play")==="0")continue;const C=Number(k(T,"pitch"));Number.isFinite(C)&&y.notes.push({keyIndex:C-Pt,offset:v,duration:g?qt:w,tieStop:zt(T),...Ut(f)})}v+=w;break}}x=Math.max(x,v)}}return y.length=L(d.getAttribute("len")??void 0)||e||x,n+=y.length,y});Ht(i,r);for(const d of o){(p=i[d.startMeasure])==null||p.pedals.push({offset:d.startBeat,down:!0});const u=Z(i,d);i[u.measure].pedals.push({offset:u.beat,down:!1})}for(const d of c){(h=i[d.startMeasure])==null||h.hairpins.push({offset:d.startBeat,kind:d.kind});const u=Z(i,d);i[u.measure].hairpins.push({offset:u.beat,kind:"end"})}for(const d of i)d.notes=d.notes.filter(u=>u.keyIndex>=0&&u.keyIndex<88);return i}function Z(a,t){let e=Math.min(t.endMeasure,a.length),s=e<a.length?t.endBeat:0;for(;e>t.startMeasure&&s<=0;)e--,s+=a[e].length;return{measure:e,beat:s}}const J=a=>Number(k(a,"subtype")??0)%2===0?"cresc":"dim";function jt(a,t){const e=k(a,"durationType")??"quarter";if(e==="measure")return L(k(a,"duration"))||t;const s=Ft[e]??1,n=Number(k(a,"dots"))||0;return s*(2-Math.pow(2,-n))}function zt(a){return N(a,"Spanner").some(t=>t.getAttribute("type")==="Tie"&&E(t,"prev"))||E(a,"endSpanner")!==void 0}function Ht(a,t){const e=(s,n,r,o)=>s<r||s===r&&n<o;a.forEach((s,n)=>{for(const r of s.notes)for(const o of t)!e(n,r.offset,o.startMeasure,o.startBeat)&&e(n,r.offset,o.endMeasure,o.endBeat)&&(r.keyIndex+=o.shift)})}function Kt(a){const t=Math.max(0,...a.map(s=>s.length)),e=Array.from({length:t},ot);for(const s of a){const n=new Map;s.forEach((r,o)=>{E(r,"startRepeat")&&(e[o].forward=!0);const c=E(r,"endRepeat");c&&(e[o].backward=parseInt(c.textContent??"",10)||2);for(const i of N(r,"Marker")){const p=k(i,"label");p&&!e[o].markers.includes(p)&&e[o].markers.push(p)}const l=E(r,"Jump");l&&k(l,"jumpTo")&&(e[o].jump={to:k(l,"jumpTo"),until:k(l,"playUntil")||"end",continueAt:k(l,"continueAt")??"",playRepeats:k(l,"playRepeats")==="1"});for(const i of N(r)){i.tagName==="Volta"&&i.getAttribute("id")&&n.set(i.getAttribute("id"),{start:o,endings:et(i),isOpen:tt(i)});const p=i.tagName==="endSpanner"?n.get(i.getAttribute("id")??""):void 0;if(p){n.delete(i.getAttribute("id"));const d=(!N(r).slice(0,N(r).indexOf(i)).some(u=>u.tagName==="Chord"||u.tagName==="Rest")?o:o+1)-p.start;d>0&&e[p.start].voltas.push({endings:p.endings,length:d,open:p.isOpen})}}for(const i of Array.from(r.querySelectorAll(':scope > voice > Spanner[type="Volta"], :scope > Spanner[type="Volta"]'))){const p=E(i,"Volta");if(!p)continue;const h=E(E(i,"next")??i,"location"),d=Math.max(1,Number(h&&k(h,"measures"))||1);e[o].voltas.push({endings:et(p),length:d,open:tt(p)})}for(let i=r;i&&(i===r||i.tagName!=="Measure");i=i.nextElementSibling)N(i,"LayoutBreak").some(p=>k(p,"subtype")==="section")&&(e[o].sectionEnd=!0)})}return e}const tt=a=>k(a,"endHookType")!=="1",et=a=>(k(a,"endings")??"1").split(/[\s,]+/).map(t=>parseInt(t,10)).filter(t=>t>0),Yt=101010256,Xt=33639248,Qt=67324752,Wt=a=>a.length>=4&&a[0]===80&&a[1]===75&&a[2]===3&&a[3]===4;class Zt{constructor(t){this.bytes=t,this.entries=new Map,this.view=new DataView(t.buffer,t.byteOffset,t.byteLength),this.readCentralDirectory()}get names(){return[...this.entries.keys()]}has(t){return this.entries.has(t)}async readText(t){return pt(await this.read(t))}async read(t){const e=this.entries.get(t);if(!e)throw new Error(`Missing file in archive: ${t}`);const s=e.localOffset;if(this.view.getUint32(s,!0)!==Qt)throw new Error(`Corrupt archive entry: ${t}`);const n=s+30+this.view.getUint16(s+26,!0)+this.view.getUint16(s+28,!0),r=this.bytes.subarray(n,n+e.compressedSize);if(e.method===0)return r;if(e.method===8)return Jt(r);throw new Error(`Unsupported compression method ${e.method} for ${t}`)}readCentralDirectory(){const t=this.findEndOfCentralDirectory(),e=this.view.getUint16(t+10,!0);let s=this.view.getUint32(t+16,!0);const n=new TextDecoder("utf-8");for(let r=0;r<e;r++){if(this.view.getUint32(s,!0)!==Xt)throw new Error("Corrupt archive: bad central directory");const o=this.view.getUint16(s+28,!0),c=this.view.getUint16(s+30,!0),l=this.view.getUint16(s+32,!0),i=n.decode(this.bytes.subarray(s+46,s+46+o));this.entries.set(i,{name:i,method:this.view.getUint16(s+10,!0),compressedSize:this.view.getUint32(s+20,!0),localOffset:this.view.getUint32(s+42,!0)}),s+=46+o+c+l}}findEndOfCentralDirectory(){const t=this.bytes.length-22,e=Math.max(0,t-65535);for(let s=t;s>=e;s--)if(this.view.getUint32(s,!0)===Yt)return s;throw new Error("Not a valid ZIP archive")}}async function Jt(a){const t=new Blob([a]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return new Uint8Array(await new Response(t).arrayBuffer())}function pt(a){return a[0]===255&&a[1]===254?new TextDecoder("utf-16le").decode(a):a[0]===254&&a[1]===255?new TextDecoder("utf-16be").decode(a):new TextDecoder("utf-8").decode(a)}const te=".musicxml,.xml,.mxl,.mscz,.mscx";async function ee(a){const t=new Uint8Array(await a.arrayBuffer()),e=Wt(t)?await oe(new Zt(t)):pt(t);return se(e)}function se(a){return/<museScore[\s>]/.test(a)?It(a):lt(a)}const ne=/\.(mscx?|musicxml|xml)$/i;async function oe(a){if(a.has("META-INF/container.xml")){const e=new DOMParser().parseFromString(await a.readText("META-INF/container.xml"),"text/xml"),s=Array.from(e.querySelectorAll("rootfile")).map(n=>n.getAttribute("full-path")??"").find(n=>ne.test(n)&&a.has(n));if(s)return a.readText(s)}const t=a.names.find(e=>/\.mscx?$/i.test(e))??a.names.find(e=>/\.(musicxml|xml)$/i.test(e)&&!e.startsWith("META-INF/"));if(!t)throw new Error("No score found in the archive");return a.readText(t)}const ae=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],re=25,ie=.3,ce=80/127;class le{constructor(t){this.soundType="grand",this.activeKeys=new Set,this.isAutoPlaying=!1,this.tempoMultiplier=1,this.stopAutoPlayRequested=!1,this.currentScore=null,this.keyElements=new Map,this.container=t,this.audio=new j,this.render()}setSoundType(t){this.soundType=t,this.updateUI()}setPedal(t){this.audio.setPedal(t)}async loadMusicXml(t){try{return this.currentScore=lt(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to parse MusicXML:",e),e}}async loadScoreFile(t){try{return this.currentScore=await ee(t),this.updateUI(),this.currentScore}catch(e){throw console.error("Failed to load score:",e),e}}async playScore(t){const e=t||this.currentScore;if(!e||this.isAutoPlaying)return;this.isAutoPlaying=!0,this.stopAutoPlayRequested=!1,this.updateUI();const s=e.notes;this.soundType==="grand"&&await this.audio.preloadGrand(s);const n=Math.max(0,...s.map(l=>l.time+(l.duration??.8)));let r=-.1,o=this.audio.currentTime,c=0;await new Promise(l=>{const i=()=>{if(this.stopAutoPlayRequested){clearInterval(p),l();return}const h=this.audio.currentTime;r+=(h-o)*this.tempoMultiplier,o=h;const d=r+ie*this.tempoMultiplier;for(;c<s.length&&s[c].time<=d;){const u=s[c++],y=h+(u.time-r)/this.tempoMultiplier;this.playNote(u.keyIndex,(u.duration||.8)/this.tempoMultiplier,u.velocity??ce,y)}c>=s.length&&r>=n&&(clearInterval(p),l())},p=setInterval(i,re);i()}),this.stopAutoPlayRequested&&this.audio.dampAll(),this.isAutoPlaying=!1,this.updateUI()}stopScore(){this.stopAutoPlayRequested=!0,this.audio.dampAll()}playNote(t,e=2.5,s=.8,n){if(this.audio.playNote(t,this.soundType,e,s,n),n===void 0)this.highlightKey(t);else{const r=Math.max(0,(n-this.audio.currentTime)*1e3);setTimeout(()=>this.highlightKey(t),r)}}highlightKey(t){const e=this.keyElements.get(t);e&&(e.classList.contains("sp-black-key"),e.classList.add("sp-active"),setTimeout(()=>e.classList.remove("sp-active"),250))}velocityFromPoint(t,e){const s=(t-e.top)/e.height,n=1-Math.max(0,Math.min(1,s));return Math.max(.06,Math.min(1,n))}render(){this.container.innerHTML=`
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
                  <input type="file" id="sp-xml-import" style="display:none" accept="${te}">
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
    `,this.setupEvents(),this.renderKeys(),this.renderSoundSelector()}setupEvents(){const t=this.container.querySelector("#sp-import-btn"),e=this.container.querySelector("#sp-xml-import"),s=this.container.querySelector("#sp-play-btn"),n=this.container.querySelector("#sp-stop-btn");t.onclick=()=>e.click(),e.onchange=async p=>{const h=p.target.files[0];if(e.value="",!!h)try{await this.loadScoreFile(h)}catch(d){alert(`Cannot read ${h.name}: ${d instanceof Error?d.message:d}`)}},s.onclick=()=>this.playScore(),n.onclick=()=>this.stopScore();const r=this.container.querySelector("#sp-pedal-btn");r.onclick=()=>{const p=!this.audio.pedal;this.audio.setPedal(p),r.classList.toggle("sp-pedal-on",p),r.setAttribute("aria-pressed",String(p))};const o=this.container.querySelector("#sp-vol-down"),c=this.container.querySelector("#sp-vol-up"),l=this.container.querySelector("#sp-tempo-down"),i=this.container.querySelector("#sp-tempo-up");o.onclick=()=>{this.audio.volume=Math.round((this.audio.volume-.1)*10)/10,this.updateUI()},c.onclick=()=>{this.audio.volume=Math.round((this.audio.volume+.1)*10)/10,this.updateUI()},l.onclick=()=>{this.tempoMultiplier=Math.max(.25,Math.round((this.tempoMultiplier-.25)*4)/4),this.updateUI()},i.onclick=()=>{this.tempoMultiplier=Math.min(2,Math.round((this.tempoMultiplier+.25)*4)/4),this.updateUI()}}renderKeys(){const t=this.container.querySelector("#sp-white-keys"),e=this.container.querySelector("#sp-keys-bed");t.innerHTML="",this.keyElements.clear();let s=0;const n=[],r=[];for(let c=0;c<88;c++){const l=(c+9)%12,i=ae[l],p=Math.floor((c+9)/12);i.includes("#")?r.push({i:c,noteName:i,octave:p,whiteBefore:s}):(n.push({i:c,noteName:i,octave:p}),s++)}n.forEach(c=>{const l=document.createElement("div");if(l.className="sp-white-key",l.onmousedown=i=>this.playNote(c.i,2.5,this.velocityFromPoint(i.clientY,l.getBoundingClientRect())),l.ontouchstart=i=>{i.preventDefault(),this.playNote(c.i,2.5,this.velocityFromPoint(i.touches[0].clientY,l.getBoundingClientRect()))},c.noteName==="C"||c.i===0||c.i===87){const i=document.createElement("div");i.className="sp-key-label",i.textContent=`${c.noteName}${c.octave}`,l.appendChild(i)}t.appendChild(l),this.keyElements.set(c.i,l)});const o=1/52*100*.6;r.forEach(c=>{const l=document.createElement("div");l.className="sp-black-key";const i=c.whiteBefore/52*100;l.style.left=`${i-o/2}%`,l.style.width=`${o}%`,l.onmousedown=p=>this.playNote(c.i,2.5,this.velocityFromPoint(p.clientY,l.getBoundingClientRect())),l.ontouchstart=p=>{p.preventDefault(),this.playNote(c.i,2.5,this.velocityFromPoint(p.touches[0].clientY,l.getBoundingClientRect()))},e.appendChild(l),this.keyElements.set(c.i,l)})}renderSoundSelector(){const t=this.container.querySelector("#sp-sound-selector"),e=Object.keys($);t.innerHTML=e.map(s=>`<button class="sp-sound-btn ${this.soundType===s?"sp-selected":""}" data-type="${s}">${$[s].name}</button>`).join(""),t.querySelectorAll("button").forEach(s=>{s.onclick=()=>this.setSoundType(s.getAttribute("data-type"))})}updateUI(){const t=this.container.querySelector("#sp-play-btn"),e=this.container.querySelector("#sp-stop-btn"),s=this.container.querySelector("#sp-title"),n=this.container.querySelector("#sp-subtitle"),r=this.container.querySelector("#sp-icon");this.isAutoPlaying?(r.classList.add("sp-playing"),n.textContent="Automated Performance System"):(r.classList.remove("sp-playing"),n.textContent="Integrated Synthesis System"),this.currentScore&&(t.style.display=this.isAutoPlaying?"none":"flex",e.style.display=this.isAutoPlaying?"flex":"none",s.textContent=this.isAutoPlaying?`PLAYING: ${this.currentScore.title}`:`SCORE: ${this.currentScore.title}`);const o=this.container.querySelector("#sp-vol-value"),c=this.container.querySelector("#sp-tempo-value");o&&(o.textContent=`${Math.round(this.audio.volume*100)}%`),c&&(c.textContent=`${this.tempoMultiplier.toFixed(2).replace(/0$/,"")}×`),this.renderSoundSelector()}}const st=document.getElementById("piano-container");st&&new le(st);
