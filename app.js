'use strict';
const GOALS = Object.freeze({ steps: 10000, activeKcal: 600, exerciseMin: 30, sleep: 8 });
(async () => {
  const {DAY,finite,esc,ts,fmt,duration,date}=HealthCharts;
  const avg=a=>a.length?a.reduce((s,p)=>s+p.y,0)/a.length:null;
  const app = document.getElementById('app');
  let range=30;
  const routes=[['overview','Overview','home'],['body','Body','body'],['activity','Activity','flame'],['sleep','Sleep','moon'],['heart','Heart','heart'],['mood','Mood','mood']];
  const paths={home:'<path d="M4 11l8-7 8 7v10h-6v-7h-4v7H4z"/>',body:'<circle cx="12" cy="5" r="2"/><path d="M5 9h14M12 9v6m-3 6 3-6 3 6"/>',flame:'<path d="M12 21C2 20 5 11 9 7c0 4 3 4 3 4s-1-5 3-8c0 5 9 14-3 18z"/>',moon:'<path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z"/>',heart:'<path d="M12 21S2 14 4 8c1-4 6-4 8-1 2-3 7-3 8 1 2 6-8 13-8 13z"/>',mood:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 5 8 0M8 8v1m8-1v1"/>'};
  const icon = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${paths[k]}</svg>`;
  const nav = (route,cls) => `<nav class="${cls}" aria-label="${cls==='rail'?'Main':'Mobile'} navigation">${cls==='rail'?`<div class="logo">${icon('heart')}</div>`:''}<div class="group">${routes.map(([r,l,i])=>`<a href="#/${r}" class="${r===route?'on':''}" aria-label="${l}" ${r===route?'aria-current="page"':''}>${icon(i)}<span>${l}</span></a>`).join('')}</div></nav>`;
  const value=(unit='',n=0,minutes=false)=>v=>minutes?duration(v):`${fmt(v,n)}${finite(v)&&unit?' '+unit:''}`;
  const currentRoute=()=>routes.some(r=>r[0]===location.hash.slice(2))?location.hash.slice(2):'overview';
  const segment=disabled=>`<div class="seg" aria-label="Chart range">${[7,30,90,365,0].map(r=>`<button data-range="${r}" aria-pressed="${r===range}"${disabled?' disabled':''}>${r===0?'All':r===365?'1Y':r+'D'}</button>`).join('')}</div>`;
  // Overview shells: the loading state and the real page share these so cards keep their final size.
  const block=cls=>`<span class="block ${cls}"></span>`;
  const noReadings=cls=>`<div class="no-readings ${cls}">No readings</div>`;
  const plain=v=>fmt(v);
  const todayGoals=[
    {label:'Move',key:'activeKcal',goal:GOALS.activeKcal,goalText:fmt(GOALS.activeKcal)+' kcal',color:'var(--m-red)',shown:plain,value:value('kcal')},
    {label:'Steps',key:'steps',goal:GOALS.steps,goalText:fmt(GOALS.steps),color:'var(--m-orange)',shown:plain,value:value()},
    {label:'Exercise',key:'exerciseMin',goal:GOALS.exerciseMin,goalText:GOALS.exerciseMin+' min',color:'var(--m-green)',shown:plain,value:value('min')},
    {label:'Sleep',key:'sleep',goal:GOALS.sleep*60,goalText:GOALS.sleep+'h',color:'var(--m-blue)',shown:duration,value:duration}
  ];
  const kpis=[
    {key:'weight',title:'Weight',unit:'lb',n:1,better:-1,color:'var(--m-blue)'},
    {key:'bodyFat',title:'Body fat',unit:'%',n:1,better:-1,color:'var(--m-orange)'},
    {key:'leanMass',title:'Lean mass',unit:'lb',n:1,better:1,color:'var(--m-teal)'},
    {key:'restingHR',title:'Resting heart rate',unit:'bpm',n:0,better:-1,color:'var(--m-red)'}
  ];
  const stagePalette=[['core','Core','var(--m-core)'],['deep','Deep','var(--m-deep)'],['rem','REM','var(--m-rem)'],['awake','Awake','var(--m-awake)']];
  const todayCard=(chart,shown,cls='')=>`<section class="card today ${cls}"><h2>Today</h2>${chart}<div class="goals">${todayGoals.map((g,i)=>`<div class="goal"><span class="lab"><i class="key" style="background:${g.color}"></i>${g.label}</span><span class="val"><b>${shown(i)}</b> <span class="lab">/ ${g.goalText}</span></span></div>`).join('')}</div></section>`;
  const nightCard=(asleep,inBed,stage,chart,cls='')=>`<section class="card lastnight ${cls}"><h2>Last night</h2><div class="split"><div class="left"><div class="stats"><div><div class="lab">Asleep</div><div class="num">${asleep}</div></div><div><div class="lab">In bed</div><div class="num">${inBed}</div></div></div><div class="stage-slot">${stage}</div></div>${chart}</div></section>`;
  const kpiCard=(k,fig,pill,chart,cls='')=>`<section class="card kpi ${cls}" data-metric="${k.key}"><h2 class="lab">${k.title}</h2><div class="line"><div class="fig">${fig}</div>${pill}</div>${chart}</section>`;
  const featuredCard=(title,chart,cls='')=>`<section class="card featured ${cls}"><h2>${title}</h2>${chart}</section>`;
  const stepsCard=(chart,cls='')=>`<section class="card stepsweek ${cls}"><h2>Steps this week</h2>${chart}</section>`;
  const overviewPage=(content,disabled)=>nav('overview','rail')+`<main><header class="top"><h1 tabindex="-1">Overview</h1>${segment(disabled)}</header><div class="grid overview">${content}</div></main>`+nav('overview','tabbar');
  const loadingCards=()=>todayCard(block('block-ring'),()=>block('block-val'))+
    nightCard(block('block-num'),block('block-num'),block('block-stage')+block('block-keys'),block('h-night'))+
    kpis.map(k=>kpiCard(k,block('block-num'),block('block-pill'),block('h-mini'))).join('')+
    featuredCard(block('block-title'),block('h-feature'))+stepsCard(block('h-steps'));
  // Until data arrives: Overview shows its loading cards (plus the error card on failure); other routes behave as before.
  let failed=false;
  function paintPending(){
    const route=currentRoute();
    document.body.dataset.route=route;document.body.dataset.state=failed?'error':'loading';
    if(route==='overview')app.innerHTML=overviewPage((failed?'<section class="card error-card" role="alert"><h2>Couldn\'t load health data</h2><button class="retry" data-retry>Try again</button></section>':'')+loadingCards(),true);
    else app.innerHTML=failed?'<main><h1>Health</h1><p role="alert">Couldn’t load data.json.</p><button onclick="location.reload()">Retry</button></main>':'<main><h1>Health</h1><p role="status">Loading…</p></main>';
  }
  window.addEventListener('hashchange',paintPending);
  const data=await new Promise(resolve=>{
    const attempt=async retrying=>{
      failed=false;paintPending();
      try {
        const response = await fetch('./data.json',{cache:'no-store'}); if (!response.ok) throw Error();
        const json = await response.json(); if (!json||typeof json!=='object'||!['daily','body','sleep'].some(k=>k in json)) throw Error();
        resolve(json);
      } catch { failed=true;paintPending();if(retrying)app.querySelector('[data-retry]')?.focus(); }
    };
    app.addEventListener('click',e=>{if(e.target.closest('[data-retry]'))attempt(true);});
    attempt(false);
  });
  window.removeEventListener('hashchange',paintPending);
  const points = (rows,key) => (rows || []).filter(r=>finite(r[key])&&Number.isFinite(ts(r.d))).map(r=>({x:ts(r.d),y:r[key]})).sort((a,b)=>a.x-b.x);
  const daily = key => points((data.daily?.d || []).map((d,i)=>({d,[key]:data.daily[key]?.[i]})),key);
  const body = key => points((data.body || []).filter(r=>r.src===data.primaryScale),key);
  const sleep = key => points(data.sleep,key);
  const last = a => a[a.length-1];
  const snapshot = Math.max(...(data.daily?.d || []).map(ts).filter(Number.isFinite),...['weight','bodyFat','leanMass'].flatMap(k=>body(k).map(p=>p.x)),...sleep('total').map(p=>p.x));
  const now = Number.isFinite(snapshot) ? snapshot : Date.now();
  // Readings are date-only, on the charts' UTC-noon scale; age is measured from there against the real clock.
  const updatedLabel=()=>Number.isFinite(snapshot)&&Date.now()-snapshot>DAY?`<span class="updated">Updated ${date(snapshot)}</span>`:'';
  const colors={weight:'#007AFF',bodyFat:'#AF52DE',leanMass:'#30B0C7',restingHR:'#FF2D55',hrv:'#30B0C7',vo2:'#007AFF',steps:'#FF9500',activeKcal:'#FA114F',exerciseMin:'#65A30D',distanceMi:'#007AFF',respRate:'#007AFF',score:'#5E5CE6',mood:'#AF52DE',total:'#5E5CE6'};
  const card=(title,content,span='',color='')=>`<section class="card ${span}"><h2 class="ch">${color?`<span class="dot" style="background:${color}"></span>`:''}${esc(title)}</h2>${content}</section>`;
  function delta(a,n=0,minutes=false){
    const p=last(a),old=p&&last(a.filter(q=>q.x<=p.x-30*DAY));
    if(!old)return '<span class="pill neu">— · 30D</span>';
    const d=p.y-old.y;return `<span class="pill neu">${d>0?'▲':d<0?'▼':'='} ${minutes?duration(Math.abs(d)):fmt(Math.abs(d),n)} · 30D</span>`;
  }
  const number=(a,unit,n,minutes=false)=>`<div class="big"><span class="num">${minutes?duration(last(a)?.y):fmt(last(a)?.y,n)}</span><span class="unit">${unit}</span>${delta(a,n,minutes)}</div>`;
  function metric(title,a,key,unit='',n=0,span='',minutes=false,name=key+'-spark'){
    return card(title,number(a,unit,n,minutes)+`<div class="mt spark">${HealthCharts.line(name,a,{range,now,color:colors[key],value:value(unit,n,minutes)})}</div>`,span,colors[key]);
  }
  function trendMetric(title,a,key,unit,n=0){
    return card(title,`<div class="metric-header">${number(a,unit,n)}</div>`+HealthCharts.line(key+'-trend',a,{range,now,color:colors[key],value:value(unit,n),large:true}),'s4',colors[key]);
  }
  const nights=(data.sleep||[]).filter(r=>Number.isFinite(ts(r.d))).slice().sort((a,b)=>ts(a.d)-ts(b.d));
  const night=last(nights);
  function goals(onlySleep=false,span='s2'){
    const entries=onlySleep?[{label:'Sleep',y:night?.total,goal:GOALS.sleep*60,goalText:GOALS.sleep+'h',color:colors.total,value:duration}]:[
      {label:'Active energy',y:daily('activeKcal').find(p=>p.x===now)?.y,goal:GOALS.activeKcal,color:colors.activeKcal,value:value('kcal')},
      {label:'Steps',y:daily('steps').find(p=>p.x===now)?.y,goal:GOALS.steps,color:colors.steps,value:value()},
      {label:'Sleep',y:night&&now-ts(night.d)<=DAY?night.total:null,goal:GOALS.sleep*60,goalText:GOALS.sleep+'h',color:colors.total,value:duration},
      {label:'Exercise',y:daily('exerciseMin').find(p=>p.x===now)?.y,goal:GOALS.exerciseMin,color:colors.exerciseMin,value:value('min')}
    ];
    return card(onlySleep?'Goal':'Today',`<div class="row ringrow">${HealthCharts.rings(onlySleep?'sleep-goal':'today-rings',entries)}<div class="legend">${entries.map(e=>`<div class="it"><span class="k">${e.label}</span><span class="p">${finite(e.y)?fmt(e.y/e.goal*100)+'%':'—'}</span><span class="v">${e.value(e.y)}<small>/ ${e.goalText||e.value(e.goal)}</small></span></div>`).join('')}</div></div>`,span);
  }
  const stage=name=>HealthCharts.stages(name,night);
  const hours=name=>HealthCharts.bars(name,sleep('total').map(p=>({...p,y:p.y/60})),{now:night?ts(night.d):now,range:7,color:colors.total,value:value('h',1),sleepRows:nights,compact:name.startsWith('overview-')});
  const workouts=()=>card('Workouts',`<div class="list">${(data.workouts||[]).slice().sort((a,b)=>ts(b.d)-ts(a.d)).slice(0,10).map(w=>`<div class="li"><span>${esc(w.type||'—')}<time>${date(ts(w.d))}</time></span><span>${fmt(w.min)} min</span></div>`).join('')||'—'}</div>`,'s4');
  const cssPx=name=>()=>parseInt(getComputedStyle(document.body).getPropertyValue(name),10);
  const inRange=a=>a.filter(p=>(!range||p.x>=now-range*DAY)&&p.x<=now);
  // Change over the selected range, first to last reading on the chart, at display precision. null means fewer than 2 readings.
  const changeOf=(a,n)=>{const w=inRange(a);return w.length<2?null:Number((last(w).y-w[0].y).toFixed(n));};
  const amount=(d,k)=>`${fmt(Math.abs(d),k.n)}${k.unit==='%'?'%':' '+k.unit}`;
  const changePill=(d,k)=>d===null?'':d===0?'<span class="pill flat">= 0</span>':`<span class="pill ${d*k.better>0?'good':'bad'}">${d>0?'▲':'▼'} ${amount(d,k)}</span>`;
  const kpiSeries={weight:()=>body('weight'),bodyFat:()=>body('bodyFat'),leanMass:()=>body('leanMass'),restingHR:()=>daily('restingHR')};
  function overviewCards(){
    // Today shows only values recorded on the real local date; older values read "—" and leave their ring empty.
    const lt=new Date(),todayTs=ts(`${lt.getFullYear()}-${String(lt.getMonth()+1).padStart(2,'0')}-${String(lt.getDate()).padStart(2,'0')}`);
    const entries=todayGoals.map(g=>({...g,y:g.key==='sleep'?(night&&ts(night.d)===todayTs?night.total:null):daily(g.key).find(p=>p.x===todayTs)?.y}));
    const hasToday=entries.some(e=>finite(e.y)),hasAny=Number.isFinite(snapshot);
    const today=todayCard(hasToday||hasAny?HealthCharts.rings('today-rings',entries,{size:112,stroke:10,gap:2,track:.18,hideEmpty:true}):noReadings('block-ring'),i=>entries[i].shown(entries[i].y),hasToday?'':'is-empty');
    // Sleep rows have no end time: the record's date is the wake morning and it counts as ended at local noon that day.
    const [ny,nm,nd]=String(night?.d).slice(0,10).split('-').map(Number),recent=night&&Date.now()-new Date(ny,nm-1,nd,12).getTime()<=36*3600000?night:null;
    const hasNight=finite(recent?.total),hasStages=stagePalette.some(([k])=>finite(recent?.[k]));
    const nightView=nightCard(duration(recent?.total),duration(recent?.inBed),hasStages?HealthCharts.stages('overview-stages',recent,{palette:stagePalette,gap:2,rx:3,height:12,fitted:true}):hasNight?noReadings('h-stage'):'',
      hasNight?HealthCharts.thinBars('overview-hours',sleep('total').map(p=>({...p,y:p.y/60})),{now:ts(recent.d),color:'var(--m-core)',value:value('h',1),short:v=>fmt(v,1),height:cssPx('--h-night'),sleepRows:nights,goal:GOALS.sleep,label:'Hours asleep, 7 nights'}):noReadings('h-night'),hasNight?'':'is-empty');
    const cards=kpis.map(k=>{
      const a=kpiSeries[k.key](),w=inRange(a),empty=!w.length;
      return kpiCard(k,`<span class="num">${fmt(last(w)?.y,k.n)}</span>${empty?'':` <span class="lab">${k.unit}</span>`}`,empty?'':changePill(changeOf(a,k.n),k),
        empty?noReadings('h-mini'):HealthCharts.tickMarks(k.key+'-spark',a,{range,now,color:k.color,value:value(k.unit,k.n),height:cssPx('--h-mini'),label:k.title+' trend'}),empty?'is-empty':'');
    }).join('');
    const weight=kpis[0],weights=body('weight'),moved=changeOf(weights,weight.n),hasWeight=inRange(weights).length>0;
    const featured=featuredCard(moved===null?'Weight':moved===0?'Weight steady':`Weight ${moved<0?'down':'up'} ${amount(moved,weight)}`,
      hasWeight?HealthCharts.featureLine('overview-weight-trend',weights,{range,now,color:weight.color,value:value('lb',1),height:cssPx('--h-feature'),label:'Weight trend'}):noReadings('h-feature'),hasWeight?'':'is-empty');
    // Steps this week: the 7 local days ending today; days without data get no bar.
    const steps=daily('steps'),hasSteps=steps.some(p=>finite(p.y)&&p.x>todayTs-7*DAY&&p.x<=todayTs);
    const stepsView=stepsCard(hasSteps?HealthCharts.thinBars('overview-steps',steps,{now:todayTs,skipEmpty:true,color:'var(--m-orange)',value:value('steps'),short:v=>v>=1000?fmt(v/1000,1)+'k':fmt(v),height:cssPx('--h-steps'),label:'Steps, last 7 days'}):noReadings('h-steps'),hasSteps?'':'is-empty');
    return today+nightView+cards+featured+stepsView;
  }
  function render(){
    HealthCharts.reset();
    const route=currentRoute();
    document.body.dataset.route=route;document.body.dataset.state='ready';
    const title=routes.find(r=>r[0]===route)[1];let content='';
    if(route==='overview')content=overviewCards();
    if(route==='body')content=[['weight','Weight','lb'],['bodyFat','Body fat','%'],['leanMass','Lean mass','lb']].map(([k,l,u])=>trendMetric(l,body(k),k,u,1)).join('');
    if(route==='activity')content=goals(false,'s4')+[
      ['steps','Steps','',0],['activeKcal','Active energy','kcal',0],['exerciseMin','Exercise','min',0],['distanceMi','Distance','mi',1]
    ].map(([k,l,u,n])=>card(l,HealthCharts.bars(k+'-bars',daily(k),{range,now,color:colors[k]||'#007AFF',value:value(u,n)}),'s3',colors[k])+metric(l,daily(k),k,u,n)).join('')+workouts();
    if(route==='sleep'){
      content=card('Last night',`<div class="big"><span class="num">${duration(night?.total)}</span><span class="unit">asleep</span></div><div class="in-bed">In bed ${duration(night?.inBed)}</div>${stage('sleep-stages')}`,'s3',colors.total)+goals(true,'')+
        card('Hours asleep',hours('sleep-hours'),'s2',colors.total)+card('Sleep trend',HealthCharts.line('sleep-trend',sleep('total').map(p=>({...p,y:p.y/60})),{range,now,color:colors.total,value:value('h',1),large:true}),'s2',colors.total);
      const hasScore=sleep('score').length>0;
      content+=metric('HRV',daily('hrv'),'hrv','ms',0,hasScore?'':'s2')+metric('Respiratory rate',daily('respRate'),'respRate','br/min',1,hasScore?'s2':'s2');
      if(hasScore)content+=metric('Sleep score',sleep('score'),'score');
    }
    if(route==='heart')content=[['restingHR','Resting HR','bpm',0],['hrv','HRV','ms',0],['vo2','VO₂ max','mL/kg/min',1]].map(([k,l,u,n])=>trendMetric(l,daily(k),k,u,n)).join('');
    if(route==='mood'){
      const entries=(data.mood||[]).filter(m=>Number.isFinite(ts(m.d))).slice().sort((a,b)=>ts(a.d)-ts(b.d));
      const a=entries.filter(m=>finite(m.valence)).map(m=>({x:ts(m.d),y:m.valence,label:m.label,emotions:m.emotions}));
      content=card('Mood',HealthCharts.line('mood-valence',a,{range,now,color:colors.mood,value:value('',2),large:true,mood:true}),'s4',colors.mood)+
        card('Entries',`<div class="list">${entries.filter(m=>(!range||ts(m.d)>=now-range*DAY)&&ts(m.d)<=now).reverse().map(m=>`<div class="li"><span>${esc(m.label||'—')}<time>${date(ts(m.d))}</time></span><b>${fmt(m.valence,2)}</b></div>`).join('')||'—'}</div>`,'s4');
    }
    app.innerHTML=nav(route,'rail')+`<main><header class="top"><h1 tabindex="-1">${title}</h1>${route==='overview'?updatedLabel():''}${segment(false)}${route==='overview'?'':`<div class="chip dsk">${date(now)}</div><div class="avatar dsk">${icon('heart')}</div>`}</header>${data.sample===true?'<p class="sample-notice">Sample data. Not real health readings.</p>':''}<div class="grid ${route}">${content}</div></main>`+nav(route,'tabbar');
    document.title=`Health · ${title}`;
    HealthCharts.bind(app);
    app.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{range=Number(b.dataset.range);render();app.querySelector(`[data-range="${range}"]`).focus();}));
  }
  window.addEventListener('hashchange',()=>{render();app.querySelector('h1').focus();});
  render();
})();
