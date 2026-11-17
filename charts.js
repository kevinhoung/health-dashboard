'use strict';
// UTC noon keeps daily readings and calendar boundaries on the same time scale.
const HealthCharts = (() => {
  const DAY=86400000;
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ts=d=>Date.parse(String(d).slice(0,10)+'T12:00:00Z');
  const fmt=(v,n=0)=>finite(v)?v.toLocaleString(undefined,{minimumFractionDigits:n,maximumFractionDigits:n}):'—';
  const duration=v=>finite(v)?`${Math.floor(Math.round(v)/60)}h ${Math.round(v)%60}m`:'—';
  const date=(x,options={month:'short',day:'numeric'})=>new Date(x).toLocaleDateString(undefined,{...options,timeZone:'UTC'});
  const scale=(a,b,c,d)=>x=>c+(x-a)/(b-a||DAY)*(d-c);
  const floor=(x,mode)=>{
    const d=new Date(x);d.setUTCHours(12,0,0,0);
    if(mode==='week')d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
    if(mode==='month')d.setUTCDate(1);
    if(mode==='year'){d.setUTCMonth(0,1);}
    return +d;
  };
  const advance=(x,mode,n=1)=>{const d=new Date(x);if(mode==='month')d.setUTCMonth(d.getUTCMonth()+n);else if(mode==='year')d.setUTCFullYear(d.getUTCFullYear()+n);else d.setUTCDate(d.getUTCDate()+n*(mode==='week'?7:1));return +d;};
  function bucketize(points,mode) {
    const groups=new Map();
    points.filter(p=>finite(p.x)&&finite(p.y)).sort((a,b)=>a.x-b.x).forEach(p=>{
      const x=mode==='point'?p.x:floor(p.x,mode);
      if(!groups.has(x))groups.set(x,[]);groups.get(x).push(p);
    });
    let previous=null;
    return [...groups].map(([x,rows])=>{
      const values=rows.map(p=>p.y),y=values.reduce((a,b)=>a+b,0)/values.length;
      const result={x,y,min:Math.min(...values),max:Math.max(...values),count:values.length,change:previous===null?null:y-previous,rows,end:mode==='point'?x:advance(x,mode)};
      previous=y;return result;
    });
  }
  // Tick schedule: 7D daily, 30D weekly, 90D fortnightly, 1Y monthly; All adapts to the span.
  function tickPlan(start,end,range){
    if(range===7)return ['day',1];if(range===30)return ['week',1];if(range===90)return ['week',2];if(range===365)return ['month',1];
    const span=end-start;if(span>3*365*DAY)return ['year',1];if(span>400*DAY)return ['month',3];if(span>120*DAY)return ['month',1];return ['week',1];
  }
  function ticks(start,end,range) {
    const [mode,step]=tickPlan(start,end,range);
    let x=floor(start,mode);if(x<start)x=advance(x,mode);
    const out=[];for(;x<=end;x=advance(x,mode,step))out.push(x);
    return out;
  }
  const modeFor=(range,span=Infinity)=>range===7?'day':range===30||range===90||(range===0&&span<=120*DAY)?'week':'month';
  const period=(x,mode)=>mode==='week'?`Week of ${date(x)}`:mode==='month'?date(x,{month:'long',year:'numeric'}):date(x,{weekday:'short',month:'short',day:'numeric'});
  function bucketDetails(b,mode,value) {
    if(!finite(b.y))return [period(b.x,mode),'— · No reading'];
    if(mode==='point'||mode==='day')return [period(b.x,mode),value(b.y)];
    return [period(b.x,mode),`Average ${value(b.y)}`,`${value(b.min)}–${value(b.max)}`,`${b.count} reading${b.count===1?'':'s'}`,`Change ${finite(b.change)?`${b.change>0?'▲':b.change<0?'▼':'='} ${value(Math.abs(b.change))}`:'—'}`];
  }
  let tip,active=null;
  function tooltip(){
    if(!tip){tip=document.createElement('div');tip.className='tip';tip.id='chart-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);
      document.addEventListener('pointerdown',e=>{if(active&&!active.el.contains(e.target))active.hide();});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active)active.hide();});
    }return tip;
  }
  function attachScrub(el,getModel){
    const shared=tooltip();let index=-1,drag=false,pinned=false;
    el.setAttribute('tabindex','0');el.setAttribute('role','img');
    function hide(){shared.hidden=true;el.removeAttribute('aria-describedby');el.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));const line=el.querySelector('.cursor');if(line)line.setAttribute('visibility','hidden');if(active?.el===el)active=null;pinned=false;}
    function show(i){
      const m=getModel();if(!m.items.length){hide();return;}if(active&&active.el!==el)active.hide();
      index=Math.max(0,Math.min(i,m.items.length-1));const item=m.items[index];
      active={el,hide};shared.dataset.bucket=m.mode||'point';shared.innerHTML=item.lines.map((s,j)=>`<div${j===0?' class="tip-title"':''}>${esc(s)}</div>`).join('');shared.hidden=false;el.setAttribute('aria-describedby',shared.id);
      el.querySelectorAll('.selected').forEach(n=>n.classList.remove('selected'));el.querySelectorAll(`[data-index="${index}"]`).forEach(n=>n.classList.add('selected'));
      const line=el.querySelector('.cursor');if(line){line.setAttribute('x1',item.px);line.setAttribute('x2',item.px);line.setAttribute('visibility','visible');}
      const r=el.getBoundingClientRect(),x=r.left+item.px/m.width*r.width,y=r.top+(item.py??20)/(m.height||200)*r.height;
      // sit beside the cursor inside the chart's top edge so the card's headline number stays readable
      const w=shared.offsetWidth,h=shared.offsetHeight,margin=8,gap=14;
      let left=x+gap;if(left+w>window.innerWidth-margin)left=x-gap-w;
      const top=Math.max(margin,Math.min(r.top+6,window.innerHeight-h-margin));
      shared.style.left=`${Math.max(margin,left)}px`;shared.style.top=`${top}px`;
    }
    function move(e){const m=getModel(),r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*m.width;let best=0;m.items.forEach((p,i)=>{if(Math.abs(p.px-x)<Math.abs(m.items[best].px-x))best=i;});show(best);}
    el.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag=true;pinned=e.pointerType!=='mouse';el.setPointerCapture(e.pointerId);move(e);});
    el.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||drag)move(e);});
    el.addEventListener('pointerup',()=>{drag=false;});
    el.addEventListener('pointercancel',()=>{drag=false;hide();});
    el.addEventListener('pointerleave',()=>{if(!drag&&!pinned)hide();});
    el.addEventListener('blur',()=>{if(!pinned)hide();});
    el.addEventListener('keydown',e=>{const m=getModel();if(['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Escape')hide();else show(e.key==='Home'?0:e.key==='End'?m.items.length-1:index<0?0:index+(e.key==='ArrowRight'?1:-1));}});
    return hide;
  }
  const models=new Map();let serial=0;
  const cursorLine=(h,bottom=h-28)=>`<line class="cursor" y1="8" y2="${bottom}" visibility="hidden"/>`;
  // Charts are drawn at their real pixel width (see fit) so text and strokes are never stretched.
  function register(name,label,width,height,items,mode,body,cls='trend',rebuild=null,bottom){
    const id=`chart-${++serial}`;models.set(id,{width,height,items,mode,rebuild});
    return `<svg id="${id}" data-chart="${esc(name)}" class="${cls}" ${cls==='stage-chart'?'preserveAspectRatio="none"':''} style="--h:${height}px" viewBox="0 0 ${width} ${height}" aria-label="${esc(label)}">${body}${cursorLine(height,bottom)}</svg>`;
  }
  function fit(root){
    root.querySelectorAll('[data-chart]').forEach(el=>{
      const m=models.get(el.id);if(!m||!m.rebuild)return;
      const w=Math.round(el.getBoundingClientRect().width);if(w<60||w===m.width)return;
      const r=m.rebuild(w);Object.assign(m,{width:r.width,items:r.items,mode:r.mode});
      el.classList.toggle('no-data',!!r.empty);el.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);el.style.setProperty('--h',`${r.height}px`);el.innerHTML=r.svg+cursorLine(r.height,r.bottom);
    });
  }
  function bind(root){fit(root);root.querySelectorAll('[data-chart]').forEach(el=>attachScrub(el,()=>models.get(el.id)));
    if(!bind.resize){let t;bind.resize=()=>{clearTimeout(t);t=setTimeout(()=>{if(active)active.hide();fit(document);},120);};window.addEventListener('resize',bind.resize);}}
  function reset(){if(active)active.hide();models.clear();}
  const tickLabel=(x,start,end,range)=>range===7?date(x,{weekday:'short',day:'numeric'}):range===365?date(x,{month:'short'}):range===0?(end-start>3*365*DAY?date(x,{year:'numeric'}):end-start>120*DAY?date(x,{month:'short',year:'numeric'}):date(x)):date(x);
  function axis(start,end,range,X,W,H,L,Y,yValues,yFormat= v=>fmt(v,1)){
    const times=ticks(start,end,range),gapPx=times.length>1?Math.abs(X(times[1])-X(times[0])):W;
    return yValues.map(v=>`<line class="gridline" x1="${L}" x2="${W-14}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-7}" y="${Y(v)+4}" text-anchor="end">${esc(yFormat(v))}</text>`).join('')+times.map((x,i)=>{
      const label=tickLabel(x,start,end,range);
      const show=i%Math.max(1,Math.ceil((range===7?44:64)/gapPx))===0;
      return `<line class="gridline" x1="${X(x)}" x2="${X(x)}" y1="8" y2="${H-30}"/><line class="xtick" data-t="${x}" x1="${X(x)}" x2="${X(x)}" y1="${H-30}" y2="${H-25}"/><text class="xt" data-t="${x}" x="${X(x)}" y="${H-8}" text-anchor="middle"${show?'':' visibility="hidden"'}>${esc(label)}</text>`;
    }).join('');
  }
  function line(name,all,opts={}){
    const build=W=>lineCore(all,{...opts,W}),r=build();
    return register(name,opts.label||name,r.width,r.height,r.items,r.mode,r.svg,r.empty?'trend no-data':opts.cls||'trend',build,r.bottom);
  }
  function lineCore(all,{range=30,now,color='#007AFF',value=v=>fmt(v,1),large=false,mood=false,W:W0,frame=null,draw=null}={}){
    const start=range?now-range*DAY:(all[0]?.x??now-DAY),end=now;
    const a=all.filter(p=>p.x>=start&&p.x<=end&&finite(p.y));
    const W=W0||(large?800:240),f=frame?frame():{},H=f.H??(large?200:64),L=f.L??(large?58:5),R=f.R??(large?40:5),T=f.T??10,B=f.B??(large?32:5);
    const ys=a.map(p=>p.y),min=ys.length?Math.min(...ys):0,max=ys.length?Math.max(...ys):1,pad=(max-min)*.15||1;
    const lo=mood?-1:(min>=0?Math.max(0,min-pad):min-pad),hi=mood?1:max+pad,X=scale(start,end,L,W-R),Y=scale(lo,hi,H-B,T),mode=mood?'point':modeFor(range,end-start);
    let buckets=bucketize(all.filter(p=>p.x<=end),mode).filter(b=>b.end>start&&b.x<=end);
    if(mode==='day'){
      const map=new Map(buckets.map(b=>[b.x,b]));buckets=[];
      for(let x=floor(start,'day');x<=end;x+=DAY)buckets.push(map.get(x)||{x,end:x+DAY,y:null,count:0});
    }
    const items=buckets.map(b=>{
      const x=mode==='day'&&b.rows?.length?b.rows[0].x:Math.max(start,Math.min(end,(b.x+b.end)/2));
      const lines=mood&&b.rows?.length?b.rows.flatMap(p=>[date(p.x),p.label||'—',`Valence ${fmt(p.y,2)}`,Array.isArray(p.emotions)?p.emotions.join(', ')||'—':p.emotions||'—']):bucketDetails(b,mode,value);
      return {px:X(x),py:finite(b.y)?Y(b.y):H/2,lines};
    });
    if(!a.length)return {width:W,height:H,items:[],mode,svg:`<text x="${W/2}" y="${H/2}" text-anchor="middle">—</text>`,empty:true};
    if(draw)return {width:W,height:H,items,mode,bottom:H-B,svg:draw({a,start,end,X,Y,W,H,L,R,B,lo,hi})};
    let svg=large?axis(start,end,range,X,W,H,L,Y,[lo,(lo+hi)/2,hi]):'';
    if(mood)svg+=`<line class="zero" x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    if(!mood)svg+=`<path d="${a.map((p,i)=>`${i?'L':'M'}${X(p.x)} ${Y(p.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg+=a.map(p=>`<circle class="pt" data-t="${p.x}" cx="${X(p.x)}" cy="${Y(p.y)}" r="${mood?5:large?3:2}" fill="${color}"/>`).join('');
    if(!a.length)svg+=`<text x="${W/2}" y="${H/2}" text-anchor="middle">—</text>`;
    return {width:W,height:H,items,mode,svg};
  }
  // Equal-length floating ticks: vertical position is the value, so slow metrics still show movement.
  function tickMarks(name,all,{height,color,...opts}){
    const pitch=5,size=()=>Math.round(height()/4);
    return line(name,all,{...opts,color,cls:'trend mini',frame:()=>({H:height(),L:2,R:2,T:size()/2,B:size()/2}),draw:({a,X,Y,L})=>{
      const slots=new Map();a.forEach(p=>{const k=Math.round((X(p.x)-L)/pitch);if(!slots.has(k))slots.set(k,[]);slots.get(k).push(p.y);});
      return [...slots].map(([k,v])=>`<rect class="tick" x="${L+k*pitch-1.5}" y="${Y(v.reduce((s,y)=>s+y,0)/v.length)-size()/2}" width="3" height="${size()}" rx="1.5" fill="${color}"/>`).join('');
    }});
  }
  // One line, three faint gridlines on round values, a direct end label, no legend.
  function featureLine(name,all,{height,color,value,range,...opts}){
    return line(name,all,{...opts,range,color,value,frame:()=>({H:height(),L:40,R:72,T:8,B:24}),draw:({a,start,end,X,Y,W,H,L,R,lo,hi})=>{
      const rough=(hi-lo)/3,mag=10**Math.floor(Math.log10(rough)),step=[5,2,1].map(m=>m*mag).find(m=>m<=rough)||mag,mid=Math.round((lo+hi)/2/step)*step,digits=Math.max(0,-Math.floor(Math.log10(step)));
      let svg=[mid+step,mid,mid-step].map(v=>`<line class="gridline" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${esc(fmt(v,digits))}</text>`).join('');
      const times=ticks(start,end,range),gap=times.length>1?Math.abs(X(times[1])-X(times[0])):W,tail=a[a.length-1];
      svg+=times.map((x,i)=>`<text class="xt" x="${X(x)}" y="${H-6}" text-anchor="middle"${i%Math.max(1,Math.ceil(64/gap))===0?'':' visibility="hidden"'}>${esc(tickLabel(x,start,end,range))}</text>`).join('');
      svg+=`<path d="${a.map((p,i)=>`${i?'L':'M'}${X(p.x)} ${Y(p.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      return svg+`<circle cx="${X(tail.x)}" cy="${Y(tail.y)}" r="4" fill="${color}"/><text class="now" x="${X(tail.x)+8}" y="${Y(tail.y)+4}">${esc(value(tail.y))}</text>`;
    }});
  }
  function bars(name,all,opts={}){
    const build=W=>barsCore(all,{...opts,W}),r=build();
    return register(name,name,r.width,r.height,r.items,r.mode,r.svg,opts.compact?'trend compact-chart':'trend',build);
  }
  function barLines(b,mode,value,sleepRows){
    let lines=[period(b.x,mode),finite(b.y)?value(b.y):'— · No reading'];
    if(sleepRows){const night=sleepRows.find(r=>ts(r.d)===b.x);lines=night?[date(b.x),`Asleep ${duration(night.total)}`,`In bed ${duration(night.inBed)}`,...['core','rem','deep','awake'].filter(k=>finite(night[k])).map(k=>`${k==='rem'?'REM':k[0].toUpperCase()+k.slice(1)} ${duration(night[k])}`)]:[date(b.x),'— · No reading'];}
    else if(mode!=='day'&&finite(b.y))lines.push('Average per day');
    return lines;
  }
  function barsCore(all,{range=7,now,color='#007AFF',value=v=>fmt(v),sleepRows=null,compact=false,W:W0}={}){
    const isSleep=!!sleepRows,W=W0||(compact?320:800),H=compact?160:200,L=compact?36:58,R=compact?14:30,T=20,B=32;
    const end=now,start=isSleep?end-6*DAY:range?end-(range===7?6:range===30?29:range)*DAY:(all[0]?.x??end-6*DAY);
    const mode=isSleep||range===7||range===30?'day':range===90?'week':'month';
    const grouped=bucketize(all.filter(p=>p.x>=start&&p.x<=end),mode),map=new Map(grouped.map(b=>[b.x,b]));let slots=[];
    for(let x=floor(start,mode);x<=end;x=advance(x,mode))slots.push(map.get(x)||{x,end:advance(x,mode),y:null});
    const max=Math.max(isSleep?12:1,...slots.filter(b=>finite(b.y)).map(b=>b.y));
    const top=isSleep?Math.ceil(max/4)*4:max*1.12,Y=scale(0,top,H-B,T),step=(W-L-R)/Math.max(1,slots.length),X=x=>L+step*(slots.findIndex(b=>b.x===x)+.5),width=Math.min(isSleep?22:24,step*.65);
    let svg=[0,top/2,top].map(v=>`<line class="gridline" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-7}" y="${Y(v)+4}" text-anchor="end">${fmt(v,v<10?1:0)}${isSleep?'h':''}</text>`).join('');
    if(isSleep){svg='';for(let v=0;v<=top;v+=4)svg+=`<line class="gridline" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-7}" y="${Y(v)+4}" text-anchor="end">${v}h</text>`;svg+=`<line class="goal-line" x1="${L}" x2="${W-R}" y1="${Y(8)}" y2="${Y(8)}"/>`;}
    const items=slots.map((b,i)=>{
      const px=X(b.x),lines=barLines(b,mode,value,sleepRows);
      svg+=`<rect class="bar" data-index="${i}" data-t="${b.x}" x="${px-width/2}" y="${finite(b.y)?Y(b.y):H-B-1}" width="${width}" height="${finite(b.y)?Math.max(1,Y(0)-Y(b.y)):1}" rx="${width/2}" fill="${finite(b.y)?color:'#bbb'}"/>`;
      const show=i%Math.max(1,Math.ceil((isSleep||range===7?34:60)/step))===0;
      svg+=`<line class="xtick" data-t="${b.x}" x1="${px}" x2="${px}" y1="${H-B}" y2="${H-B+5}"/><text class="xt" data-t="${b.x}" x="${px}" y="${H-8}" text-anchor="middle"${show?'':' visibility="hidden"'}>${isSleep||range===7?date(b.x,{weekday:'short'}):date(b.x,mode==='month'?{month:'short',year:'2-digit'}:{month:'short',day:'numeric'})}</text>`;
      if(isSleep&&finite(b.y))svg+=`<text class="bar-value" x="${px}" y="${Y(b.y)-6}" text-anchor="middle">${fmt(b.y,1)}</text>`;
      return {px,py:finite(b.y)?Y(b.y):H/2,lines};
    });
    return {width:W,height:H,items,mode,svg};
  }
  // Seven thin bars from zero with the latest highlighted; day and value sit under each bar.
  function thinBars(name,all,opts){
    const build=W=>thinBarsCore(all,{...opts,W}),r=build();
    return register(name,opts.label||name,r.width,r.height,r.items,r.mode,r.svg,'trend thin',build,r.bottom);
  }
  function thinBarsCore(all,{now,color,value,short=v=>fmt(v),height,sleepRows=null,goal=null,W=320,skipEmpty=false}){
    const H=height(),B=36,end=floor(now,'day'),map=new Map(bucketize(all.filter(p=>p.x>end-7*DAY&&p.x<=end+DAY),'day').map(b=>[b.x,b])),slots=[];
    for(let i=6;i>=0;i--){const x=end-i*DAY;slots.push(map.get(x)||{x,y:null});}
    const top=Math.max(goal?goal*1.125:1,...slots.filter(b=>finite(b.y)).map(b=>b.y*1.08)),Y=scale(0,top,H-B,goal?4:8),step=W/7;
    let svg=`<line class="gridline" x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    if(goal)svg+=`<line class="goal-line" x1="0" x2="${W}" y1="${Y(goal)}" y2="${Y(goal)}"/><text x="${W}" y="${Y(goal)-4}" text-anchor="end">${goal}h</text>`;
    const items=slots.map((b,i)=>{
      const px=step*(i+.5),latest=i===slots.length-1,cls=latest?' class="now"':'';
      if(!(skipEmpty&&!finite(b.y)))svg+=`<rect class="bar${latest?' latest':''}" data-index="${i}" x="${px-4}" y="${finite(b.y)?Y(b.y):Y(0)-1}" width="8" height="${finite(b.y)?Math.max(1,Y(0)-Y(b.y)):1}" rx="2" fill="${color}" fill-opacity="${latest?1:.55}"/>`;
      svg+=`<text${cls} x="${px}" y="${H-B+14}" text-anchor="middle">${date(b.x,{weekday:'short'})}</text><text${cls} x="${px}" y="${H-5}" text-anchor="middle">${finite(b.y)?esc(short(b.y)):'—'}</text>`;
      return {px,py:finite(b.y)?Y(b.y):H/2,lines:barLines(b,'day',value,sleepRows)};
    });
    return {width:W,height:H,items,mode:'day',svg,bottom:H-B};
  }
  function rings(name,entries,{size=172,stroke=entries.length===1?18:12,gap=5,track=.15,hideEmpty=false}={}){
    const c=size/2;
    const svg=entries.map((e,i)=>{const r=c-stroke/2-i*(stroke+gap),len=2*Math.PI*r;return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${e.color}" stroke-opacity="${track}" stroke-width="${stroke}"/>`+(hideEmpty&&!finite(e.y)?'':`<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${e.color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${finite(e.y)?Math.max(0,Math.min(e.y/e.goal,1))*len:0} ${len}" transform="rotate(-90 ${c} ${c})"/>`);}).join('');
    return register(name,'Goal progress',size,size,[{px:c,py:c,lines:entries.map(e=>`${e.label} ${e.value(e.y)} / ${e.goalText||e.value(e.goal)}`)}],'point',svg,'rings');
  }
  function stages(name,night,{palette=[['core','Core','#8E8CF0'],['rem','REM','#3FC1E8'],['deep','Deep','#5E5CE6'],['awake','Awake','#FFB340']],gap=0,rx=0,height=14,fitted=false}={}){
    const stages=palette.filter(([k])=>finite(night?.[k]));
    const total=stages.reduce((s,[k])=>s+Math.max(0,night[k]),0);
    // fitted bars redraw at real pixel width so gap and rx are true pixels despite preserveAspectRatio="none"
    const build=(W=800)=>{let x=0;const items=[],svg=stages.map(([k,label,color],i)=>{const width=total?Math.max(0,night[k])/total*W:0;items.push({px:x+width/2,py:height/2,lines:[label,duration(night[k]),`${fmt(total?night[k]/total*100:0,1)}% of the night`]});const out=`<rect data-index="${i}"${rx?` rx="${rx}"`:''} x="${x}" y="0" width="${i<stages.length-1?Math.max(0,width-gap):width}" height="${height}" fill="${color}"/>`;x+=width;return out;}).join('');return {width:W,height,items,mode:'point',svg};};
    const r=build();
    return register(name,'Sleep stages',r.width,height,r.items,'point',r.svg,'stage-chart',fitted?build:null)+(!total?'<div class="empty">—</div>':'')+`<div class="keys">${stages.map(([k,label,color])=>`<span style="--share:${total?Math.max(0,night[k])/total*100:0}"><i style="background:${color}"></i>${label} <b>${duration(night[k])}</b></span>`).join('')}</div>`;
  }
  return {DAY,finite,esc,ts,fmt,duration,date,scale,floor,advance,bucketize,ticks,modeFor,attachScrub,line,tickMarks,featureLine,bars,thinBars,rings,stages,bind,reset};
})();
if(typeof module!=='undefined')module.exports=HealthCharts;
