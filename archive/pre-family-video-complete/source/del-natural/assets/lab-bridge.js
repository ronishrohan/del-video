// Actual procedural lab modules, unchanged except monochrome provider pips.
(function(){
 const P=window.PROC,original=P.layer;LAB.FONT='"Geist Mono",monospace';LAB.CODEX=[214,218,224];LAB.CLAUDE=[214,218,224];
 const variants=Object.fromEntries(LAB.vars.map(v=>[v.name,v]));
 const table={
 'a1-c1':['Bayer flow',0,1,.0,150],
 'a1-i0':['Bayer flow',0,1,2,215],
 'a1-c2a':['ASCII shade',1.45,1.2,1,215],
 'a1-c2b':['Pixel sort',1.7,1,2,215],
 'a1-c2c':['Cell growth',1.95,2,2,215],
 'a1-c3':['Halftone field',2.13,1,2,215],
 'a2-cagent':['Mux split',5.25,.8,1.7,215],
 'a2-cshell':['Tab multiply',6.74,.8,.9,215],
 'a2-ccas':['Mux split',17.85,3,1.7,215],
 'a3-crust':['ASCII shade',18.75,.8,1,215],
 'a3-cgpu':['Halftone field',20.75,.9,3,215],
 'a4-cpx':['Pixel sort',27.75,1,3,215],
 'a4-cdive':['Search hit',30.25,1,2,215],
 'a4-cbutter':['Butter glide',32.1,1,1,215],
 'a5-cq1':['Bayer flow',39.675,.6,12,155],
 'a5-cq2':['Bayer flow',40.8,.6,13,155],
 'a5-cend':['Atkinson gradient',41.775,.25,4,92]
 };
 P.layer=(canvas,opts={})=>{const L=original(canvas,opts),cfg=table[canvas.id];if(!cfg)return L;const[name,start,speed,offset,fg]=cfg,v=variants[name];if(!v)throw new Error('Missing actual lab module '+name);
  const W=canvas.id==='a4-cbutter'?1920:Math.max(opts.w||640,v.frag?640:480);canvas.width=W;canvas.height=W*9/16;const ctx=canvas.getContext('2d'),state={};const th={bg:[11,12,14],fg:[fg,fg+2,Math.min(255,fg+5)],ac:[230,232,235]};
  const NS=Number(canvas.closest("section.shot").dataset.start);
  L.render=t=>{const time=Math.max(0,P.CLOCK-NS)*speed+offset;if(v.frag)renderGL(v,ctx,canvas.width,canvas.height,time,v.seed,th);else v.draw(ctx,canvas.width,canvas.height,time,v.seed,th,state);};return L;
 };
})();
