// Five-act source timing, with explicit breathing beats; voice files always play1x.
(function(){
 const P=window.PROC,holds=[[0,.45],[4.2,.3],[5.25,.3],[8.85,.45],[17.85,.6],[20.4,.375],[25.6,.375],[28.65,.3],[32.1,.675],[35.25,.6],[39.675,.45],[44.875,.25]];
 const warp=t=>t+holds.reduce((s,[a,d])=>s+(t>=a-1e-7?d:0),0);
 const inverse=t=>{let shift=0;for(const[a,d]of holds){if(t<a+shift)return t-shift;if(t<a+shift+d)return Math.max(0,a-1e-5);shift+=d;}return t-shift;};
 const snap=t=>{const f=t*60,c=Math.floor(f/9)*9;return[c,c+5,c+9].reduce((a,b)=>Math.abs(b-f)<Math.abs(a-f)?b:a)/60;};
 const pose=t=>{const f=Math.max(0,Math.round(t*60+1e-6));return(Math.floor(f/9)*9+(f%9>=5?5:0))/60;};
 P.TIMING={holds,warp,inverse,snap,pose};P.CLOCK=0;window.__FULL_EVENTS=[];
 P.STEP.q=pose;P.STEP.qg=pose;
 P.STEP.snap=(tl,A)=>{const NA=A===0?0:snap(warp(A));tl.getChildren(false,true,false).forEach(ch=>{if(ch.duration()!==0)return;const global=snap(warp(A+ch.startTime()));ch.startTime(Math.max(0,global-NA));const targets=ch.targets?ch.targets():[];const ids=targets.map(x=>x.id||x.parentElement?.id||'');const v={};for(const k of ['className','textContent','innerHTML','opacity','display','x','y','width','left','scale'])if(k in ch.vars)v[k]=ch.vars[k];window.__FULL_EVENTS.push({frame:Math.round(global*60),time:global,targets:ids,vars:v,actStart:NA});});};
 P.drive=(tl,scenes,dur,A=0)=>{const NA=A===0?0:snap(warp(A)),NE=snap(warp(A+dur)),ND=NE-NA;const d={_t:0};
  const paint=v=>{P.CLOCK=pose(NA+v);let old=Math.max(0,Math.min(dur-1e-6,inverse(P.CLOCK)-A));for(const s of scenes){const ns=s.start===0?NA:snap(warp(A+s.start)),ne=snap(warp(A+s.start+s.dur));if(P.CLOCK>=ns-1e-6&&P.CLOCK<ne-1e-6)s.layer.render(Math.max(0,old-s.start));}};
  Object.defineProperty(d,'t',{get(){return this._t},set(v){this._t=v;paint(v);}});tl.fromTo(d,{t:0},{t:ND,duration:ND,ease:'none'},0);paint(0);
 };
})();
