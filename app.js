"use strict";
/* AKT and KFP Practice. Static, offline-first. All progress lives in the browser (localStorage),
   with optional per-person cloud sync when the page runs inside a host that offers it. */
/* Data is one file per unit (data/units/<slug>.js), listed in data/index.js. A unit's file is fetched the first time it is needed:
   at start-up for units the person already has progress in, otherwise when they open the unit or pick it for a session. */
const CARDS=window.AKT_CARDS=[], QS=window.AKT_QUESTIONS=[];window.AKT_NOTES=[];
const INDEX=(window.AKT_INDEX&&window.AKT_INDEX.units)||[];
const TOPICS=[], CARD={}, QBY={}, LOADED={};
window.AKT_UNIT=function(d){if(LOADED[d.unit])return;LOADED[d.unit]=true;
  (d.notes||[]).forEach(n=>window.AKT_NOTES.push(n));(d.cards||[]).forEach(c=>{CARDS.push(c);CARD[c.id]=c});(d.questions||[]).forEach(q=>{QS.push(q);QBY[q.id]=q});TOPICS.push(d.unit)};
function unitMeta(u){return INDEX.find(x=>x.unit===u)}
function idUnit(id){const p=(String(id).match(/^[a-z]+/i)||[""])[0];return INDEX.find(x=>(x.prefix||[]).includes(p))}
function idLoaded(id){const m=idUnit(id);return !m||!!LOADED[m.unit]}
function loadUnit(u){const m=unitMeta(u);if(!m||LOADED[u])return Promise.resolve();if(m._p)return m._p;
  return m._p=new Promise((res,rej)=>{const s=document.createElement("script");s.src="data/units/"+m.slug+".js";s.onload=()=>res();s.onerror=()=>{m._p=null;s.remove();rej(new Error("load"))};document.head.appendChild(s)})}
function loadUnits(list){return Promise.all((list||[]).map(loadUnit))}
function openUnit(u,then){loadUnit(u).then(then,()=>{alertBar("Could not load "+u+". Check your connection and try again.")})}
function alertBar(msg){const a=document.getElementById("app");if(!a)return;const e=document.createElement("div");e.className="panel";e.setAttribute("role","alert");e.textContent=msg;a.insertBefore(e,a.firstChild);setTimeout(()=>e.remove(),6000)}
const LKEY="akt-practice-v1", DAY=864e5, VERSION="4.19";
const PACE={akt:96e3,kfp:205e3}; // exam time per question: 240 min / 150 and 240 min / 70
const NUMWORD=["","ONE","TWO","THREE","FOUR","FIVE","SIX"];

/* ---------- small helpers ---------- */
const $=(s,r)=>(r||document).querySelector(s);
function h(tag,attrs,kids){
  const e=document.createElement(tag);
  if(attrs)for(const k in attrs){const v=attrs[k];
    if(v===false||v==null)continue;
    if(k==="class")e.className=v;else if(k==="html")e.innerHTML=v;else if(k==="text")e.textContent=v;
    else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?"":v)}
  (kids||[]).forEach(c=>{if(c==null||c===false)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c)});
  return e;
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function plain(o){return JSON.parse(JSON.stringify(o))}
function dayKey(ts){const d=new Date(ts||Date.now());return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function fmtIvl(ms){if(ms<36e5)return Math.max(1,Math.round(ms/6e4))+" min";if(ms<DAY)return Math.round(ms/36e5)+" h";const d=ms/DAY;if(d<30)return Math.round(d)+" d";if(d<365)return (d/30).toFixed(1).replace(".0","")+" mo";return (d/365).toFixed(1)+" y"}
function fmtWhen(ts){const d=ts-Date.now();if(d<=0)return "now";if(d<36e5)return "in "+Math.ceil(d/6e4)+" min";if(d<DAY)return "in "+Math.round(d/36e5)+" h";return "in "+Math.round(d/DAY)+" d"}
function fmtClock(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000),hh=Math.floor(s/3600),mm=Math.floor(s%3600/60),ss=s%60;return (hh?hh+":"+String(mm).padStart(2,"0"):mm)+":"+String(ss).padStart(2,"0")}
function fmtDate(ts){return new Date(ts).toLocaleString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}
function pct(a,b){return b?Math.round(100*a/b)+"%":"–"}
function clip(s,n){return s.length>n?s.slice(0,n)+"…":s}
const CZ=/\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;
function cloze(c,reveal){return c.x.replace(CZ,(m,n,ans,hint)=>+n!==c.o?ans:reveal?'<span class="cz">'+ans+'</span>':'<span class="cz">[ '+(hint||"...")+' ]</span>')}

/* ---------- state ---------- */
function fresh(){return {v:3,q:{},cards:{},session:null,hist:[],log:{},notes:{},settings:{auto:false},updatedAt:0}}
let S=fresh();
function migrate(o){
  if(!o||![1,2,3].includes(o.v))return null;
  const old=o.v;o=Object.assign(fresh(),o);
  Object.keys(o.cards).forEach(id=>{const c=o.cards[id];if(!c.f)o.cards[id]={f:newCard(),sus:!!c.sus,src:c.src||[]}});
  if(old<3)o.session=null;
  /* Prune progress for items that no longer exist, but only in units whose data is loaded: an unloaded unit's progress is kept. */
  Object.keys(o.cards).forEach(id=>{if(!CARD[id]&&idLoaded(id))delete o.cards[id]});Object.keys(o.q||{}).forEach(id=>{if(!QBY[id]&&idLoaded(id))delete o.q[id]});
  o.hist=(o.hist||[]).filter(x=>x.ids&&x.ids.every(id=>QBY[id]||!idLoaded(id)));
  if(o.session){o.session.ids=o.session.ids.filter(id=>QBY[id]);if(!o.session.ids.length)o.session=null;else o.session.i=Math.min(o.session.i,o.session.ids.length-1)}
  o.settings=Object.assign({auto:false},o.settings);o.log=o.log||{};o.notes=o.notes||{};o.v=3;return o;
}
function loadLocal(){try{const r=localStorage.getItem(LKEY);if(r){const o=migrate(JSON.parse(r));if(o)S=o}}catch(e){}}
function saveLocal(){try{localStorage.setItem(LKEY,JSON.stringify(S));return true}catch(e){return false}}
function save(){S.updatedAt=Date.now();saveLocal();queuePush()}
function logDay(k){const d=dayKey();const r=S.log[d]||(S.log[d]={q:0,c:0,a:0});r[k]++;const keys=Object.keys(S.log).sort();while(keys.length>120)delete S.log[keys.shift()]}

/* ---------- optional cloud sync ---------- */
let ref=null,pushing=false,pushWanted=false,pushTimer=null,syncState="local";
function syncHtml(){const m={local:["","Saved on this device"],ok:["ok","Synced"],busy:["busy","Syncing"],err:["","Saved on this device"]}[syncState];return '<span class="dot '+m[0]+'"></span>'+m[1]}
function setSync(s){syncState=s;const el=$("#sync");if(el)el.innerHTML=syncHtml()}
async function initSync(){
  try{
    if(!window.claude||!window.claude.use)return;
    const [db,user]=await Promise.all([window.claude.use("db"),window.claude.use("user")]);
    if(!db||!user)return;const id=await user.id();if(!id)return;
    ref=db.doc("data/users/"+id+"/state");await pull();
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)pull()});
  }catch(e){setSync("err")}
}
async function pull(){
  if(!ref)return;
  try{setSync("busy");const snap=await ref.get();const d=snap.exists?snap.data():null;
    const m=d&&(d.updatedAt||0)>(S.updatedAt||0)?migrate(plain(d)):null;
    if(m){S=m;saveLocal();if(!(view==="session"&&pick.length))render()}
    else if((S.updatedAt||0)>((d&&d.updatedAt)||0))queuePush(0);
    setSync("ok")}catch(e){setSync("err")}
}
function queuePush(ms){if(!ref)return;clearTimeout(pushTimer);pushTimer=setTimeout(push,ms===undefined?1500:ms)}
async function push(){
  if(!ref)return;if(pushing){pushWanted=true;return}
  pushing=true;setSync("busy");
  try{await ref.set(plain(S));setSync("ok")}catch(e){setSync("err")}
  pushing=false;if(pushWanted){pushWanted=false;queuePush(500)}
}

/* ---------- flashcards: FSRS, default parameters, 90% retention ---------- */
const F=window.FSRS,SCHED=F.fsrs(F.generatorParameters({request_retention:0.9,enable_fuzz:true}));
const LEARN_AHEAD=20*6e4;
function newCard(){return plain(F.createEmptyCard(new Date()))}
function dueTs(id){return new Date(S.cards[id].f.due).getTime()}
function isOn(id){const c=S.cards[id];return !!(c&&!c.sus)}
function activate(ids,qid){
  ids.forEach(id=>{if(!CARD[id])return;let c=S.cards[id];
    if(!c)c=S.cards[id]={f:newCard()};else if(c.sus)c.sus=false;
    if(qid){c.src=c.src||[];if(!c.src.includes(qid))c.src.push(qid)}});
  save();
}
function suspend(ids){ids.forEach(id=>{if(S.cards[id])S.cards[id].sus=true});save()}
function activeIds(){return Object.keys(S.cards).filter(id=>CARD[id]&&isOn(id))}
function dueList(ahead){const lim=Date.now()+(ahead||0);return activeIds().filter(id=>dueTs(id)<=lim).sort((a,b)=>dueTs(a)-dueTs(b))}
function preview(id){const now=new Date(),r=SCHED.repeat(S.cards[id].f,now);return [1,2,3,4].map(g=>new Date(r[g].card.due).getTime()-now.getTime())}
let lastGrade=null;
function grade(id,g){
  const c=S.cards[id];lastGrade={id:id,f:plain(c.f),day:dayKey()};
  const wasReview=c.f.state===2;
  c.f=plain(SCHED.next(c.f,new Date(),g+1).card);
  logDay("c");if(wasReview){const r=S.log[dayKey()];r.r=(r.r||0)+1;if(g===0)r.a++}
  save();
}
function undoGrade(){if(!lastGrade||!S.cards[lastGrade.id])return;S.cards[lastGrade.id].f=lastGrade.f;const r=S.log[lastGrade.day];if(r&&r.c)r.c--;lastGrade=null;save()}

/* ---------- questions and sessions ---------- */
let view="home",pick=[],timerHandle=null,resultIdx=0;
let builder={topics:new Set(TOPICS),subs:new Set(),fmt:"akt",filter:"all",len:10,mode:"tutor"};
function qStat(id){return S.q[id]||{n:0,c:0}}
function stemNodes(q){const out=[];String(q.s||"").split(/\n\n+/).forEach(t=>out.push(h("p",{class:"stem",text:t})));
  if(q.b||q.tb){const kids=[];(q.b||[]).forEach(b=>{kids.push(h("div",{class:"blk"},[h("div",{class:"blkh",text:b.h+":"}),h("ul",{},b.i.map(x=>h("li",{text:x})))]))});
    if(kids.length)out.push(h("div",{class:"blks"},kids));
    if(q.tb)out.push(h("div",{class:"tablewrap"},[h("table",{class:"res"},[h("thead",{},[h("tr",{},q.tb.h.map(c=>h("th",{text:c})))]),h("tbody",{},q.tb.r.map(r=>h("tr",{},r.map(c=>h("td",{text:c})))))])]));
    if(q.s2)String(q.s2).split(/\n\n+/).forEach(t=>out.push(h("p",{class:"stem",text:t})))}
  return out}
function srcNode(q){return q.src&&q.src.length?h("p",{class:"muted sm src",text:"Sources: "+q.src.join("; ")+(q.v?" ("+q.v+")":"")}):null}
function maxPts(q){return q.sc.slice().sort((a,b)=>b-a).slice(0,q.n).reduce((a,b)=>a+b,0)}
function pool(b){
  b=b||builder;
  if(b.ids){const set=new Set(b.ids);return QS.filter(q=>set.has(q.id))}
  return QS.filter(q=>b.topics.has(q.t)&&(!b.subs||!b.subs.size||b.subs.has(q.t+"|"+q.l))&&(b.fmt==="both"||q.y===b.fmt)).filter(q=>{const s=qStat(q.id);
    if(b.filter==="unseen")return s.n===0;if(b.filter==="wrong")return s.n>0&&s.last===false;if(b.filter==="flag")return !!s.flag;return true});
}
function startSession(b){
  b=b||builder;let p=pool(b);if(!p.length)return;
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{})}catch(e){}
  if(S.session)endSession();
  const unseen=shuffle(p.filter(q=>qStat(q.id).n===0)),seen=shuffle(p.filter(q=>qStat(q.id).n>0));
  p=unseen.concat(seen);const chosen=shuffle(b.len?p.slice(0,b.len):p);
  const ids=chosen.map(q=>q.id),now=Date.now();
  S.session={ids:ids,i:0,ans:{},elim:{},started:now,topics:[...(b.topics||[])],mode:b.mode,fmt:b.fmt};
  if(b.mode==="exam")S.session.deadline=now+chosen.reduce((a,q)=>a+PACE[q.y],0);
  save();go("session");
}
function scoreAnswer(q,p){
  if(q.y==="akt")return {p:p[0],ok:p[0]===q.a,pts:p[0]===q.a?1:0,max:1};
  const pts=p.reduce((a,i)=>a+q.sc[i],0),max=maxPts(q);return {p:p.slice().sort((a,b)=>a-b),ok:pts===max,pts:pts,max:max};
}
function record(qid,p){
  const q=QBY[qid],a=scoreAnswer(q,p);S.session.ans[qid]=a;
  if(S.session.mode==="tutor")commit(qid,a);
  save();
}
function commit(qid,a){
  const s=S.q[qid]||(S.q[qid]={n:0,c:0});s.n++;if(a.ok)s.c++;s.last=a.ok;s.at=Date.now();logDay("q");
  if(!a.ok&&S.settings.auto)activate(QBY[qid].c,qid);
}
function toggleFlag(qid){const s=S.q[qid]||(S.q[qid]={n:0,c:0});s.flag=!s.flag;save()}
function endSession(){
  const ses=S.session;if(!ses)return false;
  if(ses.mode==="exam")ses.ids.forEach(id=>{if(!ses.ans[id]){const q=QBY[id];ses.ans[id]={p:q.y==="akt"?-1:[],ok:false,pts:0,max:q.y==="akt"?1:maxPts(q),blank:true}}commit(id,ses.ans[id])});
  const done=ses.ids.filter(id=>ses.ans[id]);
  if(done.length){
    const pts=done.reduce((a,id)=>a+ses.ans[id].pts/ses.ans[id].max,0);
    S.hist.unshift({at:Date.now(),ms:Date.now()-ses.started,ids:done,ans:ses.ans,n:done.length,c:done.filter(id=>ses.ans[id].ok).length,pts:Math.round(pts*100)/100,mode:ses.mode,fmt:ses.fmt});
    S.hist=S.hist.slice(0,40);
  }
  S.session=null;save();return done.length>0;
}

/* ---------- routing and chrome ---------- */
const VIEWS=["home","questions","session","results","flashcards","review","deck","notes","progress","more"];
const TABS=[["home","Home","M3 11l9-8 9 8M5 10v10h14V10"],["questions","Questions","M9 9a3 3 0 1 1 4 2.8c-.8.4-1 1-1 2.2M12 18h.01M4 4h16v16H4z"],["flashcards","Flashcards","M4 7h13v11H4zM7 4h13v11"],["notes","Notes","M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"],["progress","Progress","M4 20V10M10 20V4M16 20v-7M22 20H2"],["more","More","M5 12h.01M12 12h.01M19 12h.01"]];
function go(v,opts){view=v;pick=[];shown=false;if(opts&&opts.idx!==undefined)resultIdx=opts.idx;try{history.replaceState(null,"","#"+v)}catch(e){}render();window.scrollTo(0,0);const a=$("#app");if(a&&opts&&opts.focus)a.focus()}
function foot(kids){const f=$("#foot"),i=$("#footin");i.innerHTML="";if(!kids){f.classList.add("hide");return}f.classList.remove("hide");kids.forEach(k=>k&&i.appendChild(k))}
function topbar(title,back){
  return h("header",{class:"top"},[back?h("button",{class:"linkbtn",text:"‹ "+back[1],onclick:()=>go(back[0])}):null,h("h1",{text:title}),h("div",{class:"sync",id:"sync",html:syncHtml()})]);
}
function drawTabs(){
  const t=$("#tabs");t.innerHTML="";
  const inFlow=view==="session"||view==="review";
  t.classList.toggle("hide",inFlow);$("#foot").style.bottom=inFlow?"0":"";
  const cur={results:"questions",deck:"flashcards"}[view]||view,due=dueList().length;
  TABS.forEach(x=>{const b=h("button",{class:cur===x[0]?"on":"","aria-current":cur===x[0]?"page":null,onclick:()=>{unitOpen=null;go(x[0])}});
    b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+x[2]+'"/></svg>';
    if(x[0]==="flashcards"&&due)b.appendChild(h("span",{class:"badge",text:String(due)}));
    b.appendChild(h("span",{text:x[1]}));t.appendChild(b)});
}
function render(){
  clearInterval(timerHandle);timerHandle=null;
  const app=$("#app");app.innerHTML="";foot(null);
  if(view==="session"&&!S.session)view="home";
  drawTabs();
  ({home:vHome,questions:vQuestions,session:vSession,results:vResults,flashcards:vFlashcards,review:vReview,deck:vDeck,notes:vNotes,progress:vProgress,more:vMore})[view](app);
}
/* ---------- notes ---------- */
let noteOpen=null,noteSec=null;
function NOTES(){return window.AKT_NOTES||[]}
const DISCLAIMER="For exam preparation only. The content is written from current Australian guidelines and checked against them, but it has not been reviewed by a medical college or a publisher, and guidelines change. Check the current source before applying anything to a patient. It is not for clinical decisions.";
function reportLink(what,label){const u="https://github.com/LeBunt/RACGP-Prep/issues/new?title="+encodeURIComponent("Error report: "+what)+"&body="+encodeURIComponent("Where: "+what+"\nApp version: "+VERSION+"\n\nWhat is wrong, and the source that shows it:\n");
  return h("a",{class:"report",href:u,target:"_blank",rel:"noopener",text:label||"Report an error"})}
/* Every unit of the 2022 RACGP curriculum and syllabus (two core health units, then the 35 contextual units). Units with no content yet show as planned. */
const UNITS=["Aboriginal and Torres Strait Islander health","Rural health","Abuse and violence","Addiction medicine","Cardiovascular health","Child and youth health","Dermatological presentations","Disability care","Disaster health","Doctors' health","Ear, nose, throat and oral health","Education in general practice","Emergency medicine","Endocrine and metabolic health","Eye presentations","Gastrointestinal health","Haematological presentations","Infectious diseases","Integrative medicine","Justice system health","Kidney and urinary health","Men's health","Mental health","Migrant, refugee and asylum seeker health","Military and veteran health","Musculoskeletal presentations","Neurological presentations","Occupational and environmental medicine","Older persons' health","Pain management","Palliative care","Pregnancy and reproductive health","Research in general practice","Respiratory health","Sexual health and gender diversity","Travel medicine","Women's health"];
let unitOpen=null,noteQuery="";
function builtUnits(){return INDEX.map(x=>x.unit)}
function allUnitsPanel(){const built=builtUnits(),list=built.concat(UNITS.filter(u=>!built.includes(u)));
  return h("div",{class:"panel"},[h("h2",{text:"All units"}),h("p",{class:"muted sm",style:"margin:-6px 0 4px",text:built.length+" of "+list.length+" units of the RACGP curriculum built so far."})].concat(list.map(u=>{const st=unitStats(u),on=built.includes(u);
    return h("button",{class:"btn big notebtn unitbtn"+(on?"":" planned"),onclick:()=>openUnit(u,()=>{unitOpen=u;noteOpen=null;go("notes");window.scrollTo(0,0)})},[
      h("span",{class:"nt"},[h("b",{text:u}),h("span",{text:on?st.notes+" notes · "+st.qs+" questions · "+st.cs+" cards":"Planned · 0 notes · 0 questions · 0 cards"})]),h("span",{class:"chev","aria-hidden":"true",text:"›"})])})))}
function openNote(ref){unitOpen=null;const p=String(ref||"").split("#");noteOpen=p[0];noteSec=p[1]||null;go("notes");
  if(noteSec)setTimeout(()=>{const e=document.getElementById("ns-"+noteSec);if(e){e.open=true;e.scrollIntoView({block:"start"});e.classList.add("flash")}},60)}
function noteLabel(ref){const p=String(ref||"").split("#"),n=NOTES().find(x=>x.id===p[0]);if(!n)return null;const s=n.sections.find(x=>x.id===p[1]);return n.title+(s?" › "+s.h:"")}
/* Inline formatting for notes text: reference markers become small superscripts, and a short label before a colon at the start of a bullet is set in bold. */
function rich(t,lead){const out=[];let s=String(t);
  if(lead){const m=s.match(/^([A-Z][^:.;]{1,38}):\s/);if(m){out.push(h("strong",{text:m[1]+":"})," ");s=s.slice(m[0].length)}}
  s.split(/((?:\[\d+\])+)/).forEach(part=>{if(/^(?:\[\d+\])+$/.test(part))out.push(h("sup",{class:"nref",text:part.replace(/\]\[/g,",").replace(/[\[\]]/g,"")}));else if(part)out.push(part)});
  return out}
function noteBlock(b){
  if(b.p)return h("p",{class:"np"},rich(b.p));
  if(b.ul)return h("ul",{class:"nul"},b.ul.map(x=>h("li",{},rich(x,true))));
  if(b.key)return h("div",{class:"key"},[h("b",{text:"Take-home"})].concat(rich(b.key)));
  if(b.tb){const H=b.tb.h,R=b.tb.r,n=H.length;
    /* Tables stay tables on a phone. Column widths follow how much text each column holds, so the wordy column gets the room.
       A table too heavy to fit (three or more wordy columns) keeps a readable minimum width and scrolls sideways, first column pinned. */
    const avg=H.map((x,i)=>Math.max(String(x).length*.8,R.reduce((a,r)=>a+String(r[i]==null?"":r[i]).length,0)/Math.max(1,R.length)));
    let w=avg.map(x=>Math.sqrt(Math.min(x,120)+4));const tot=w.reduce((a,x)=>a+x,0);w=w.map(x=>Math.max(100*x/tot,n>2?13:22));const t2=w.reduce((a,x)=>a+x,0);w=w.map(x=>100*x/t2);
    /* Estimated lines in the tallest cell at phone width (about 350 px of table, 7.8 px per character). */
    const lines=Math.max(...R.map(r=>Math.max(...r.map((c,i)=>String(c==null?"":c).length/(3.5*w[i]/7.8)))));
    const heavy=n>=3&&lines>8.5;
    const tbl=h("table",{class:"res nt"+(heavy?" wide":""),style:heavy?"min-width:"+Math.max(500,n*150)+"px":""},[h("colgroup",{},w.map(x=>h("col",{style:"width:"+x.toFixed(1)+"%"}))),h("thead",{},[h("tr",{},H.map(c=>h("th",{text:c})))]),h("tbody",{},R.map(r=>h("tr",{},r.map((c,i)=>h(i?"td":"th",i?{}:{scope:"row"},rich(c))))))]);
    return h("div",{class:"ntable"+(heavy?" scrolls":"")},[h("div",{class:"tablewrap"},[tbl]),heavy?h("div",{class:"swipe","aria-hidden":"true",text:"Swipe the table sideways for more ›"}):null].filter(Boolean))}
  return null}
function noteQs(n){return QS.filter(q=>String(q.nt||"").split("#")[0]===n.id)}
function noteCards(n){return CARDS.filter(c=>String(c.nt||"").split("#")[0]===n.id)}
function noteRead(id){return !!(S.notes[id]&&S.notes[id].read)}
function setRead(id,on){const r=S.notes[id]||(S.notes[id]={});if(on)r.read=Date.now();else delete r.read;save()}
function unitStats(u){const m=unitMeta(u);if(m&&!LOADED[u])return {notes:m.notes,read:0,qs:m.questions,att:0,cs:m.cards,on:0,next:null,unloaded:true};
  const ns=NOTES().filter(x=>x.unit===u);const qs=QS.filter(q=>q.t===u),cs=CARDS.filter(c=>c.t===u);
  return {notes:ns.length,read:ns.filter(x=>noteRead(x.id)).length,qs:qs.length,att:qs.filter(q=>qStat(q.id).n>0).length,cs:cs.length,on:cs.filter(c=>isOn(c.id)).length,next:ns.find(x=>!noteRead(x.id))}}
function unitPanel(u,withList){const st=unitStats(u);const kids=[h("h2",{class:"nh2",text:u}),
    h("div",{class:"bar",role:"progressbar","aria-valuemin":"0","aria-valuemax":String(st.notes),"aria-valuenow":String(st.read),"aria-label":"Notes read"},[h("i",{style:"width:"+(st.notes?100*st.read/st.notes:0)+"%"})]),
    h("div",{class:"unitrow"},[h("div",{class:"u"},[h("b",{text:st.read+"/"+st.notes}),h("span",{text:"notes read"})]),h("div",{class:"u"},[h("b",{text:st.att+"/"+st.qs}),h("span",{text:"questions tried"})]),h("div",{class:"u"},[h("b",{text:st.on+"/"+st.cs}),h("span",{text:"cards in rotation"})])])];
  if(st.unloaded)kids.push(h("button",{class:"btn primary",style:"width:100%;margin-top:12px",text:"Open this unit",onclick:()=>openUnit(u,()=>{unitOpen=u;noteOpen=null;go("notes")})}));
  if(withList&&!st.notes)kids.push(h("p",{class:"muted",style:"margin:14px 0 0",text:"Nothing here yet. This unit is planned: its notes, questions and flashcards will appear here when it is built."}));
  if(withList)NOTES().filter(x=>x.unit===u).forEach(x=>{const nq=noteQs(x).length,nc=noteCards(x).length,rd=noteRead(x.id);
    kids.push(h("button",{class:"btn big notebtn"+(rd?" read":""),"aria-label":x.title+(rd?", read":", not read"),onclick:()=>{noteOpen=x.id;noteSec=null;go("notes");window.scrollTo(0,0)}},[
      h("span",{class:"tick","aria-hidden":"true",text:"✓"}),h("span",{class:"nt"},[h("b",{text:x.title}),h("span",{text:nq+" question"+(nq===1?"":"s")+" · "+nc+" card"+(nc===1?"":"s")+(x.audio?" · audio":"")})]),h("span",{class:"chev","aria-hidden":"true",text:"›"})]))});
  else if(st.next)kids.push(h("button",{class:"btn primary",style:"width:100%;margin-top:12px",text:(st.read?"Next to read: ":"Start reading: ")+clip(st.next.title,44),onclick:()=>{noteOpen=st.next.id;noteSec=null;go("notes");window.scrollTo(0,0)}}));
  return h("div",{class:"panel"},kids)}
/* Audio overview for a notes page: resumes where you stopped, optional offline copy. */
function audioBlock(n){
  if(!n.audio||!n.audio.src)return null;
  const st=S.notes[n.id]||(S.notes[n.id]={});const au=h("audio",{controls:"",preload:"none",src:n.audio.src});
  const msg=h("p",{class:"note",text:"AI-generated audio overview of this page. The written notes are the reference."});
  au.addEventListener("loadedmetadata",()=>{if(st.pos&&st.pos<au.duration-5)au.currentTime=st.pos;au.playbackRate=S.settings.rate||1});
  let last=0;au.addEventListener("timeupdate",()=>{if(Math.abs(au.currentTime-last)>5){last=au.currentTime;st.pos=Math.floor(last);saveLocal()}});
  au.addEventListener("ended",()=>{st.pos=0;st.heard=Date.now();save()});
  const rates=[1,1.25,1.5,2];const rrow=h("div",{class:"ar"});
  const draw=()=>{rrow.innerHTML="";rrow.appendChild(h("span",{class:"muted sm",text:"Speed"}));rates.forEach(r=>rrow.appendChild(h("button",{class:"chip"+((S.settings.rate||1)===r?" on":""),"aria-pressed":String((S.settings.rate||1)===r),text:r+"×",onclick:()=>{S.settings.rate=r;au.playbackRate=r;save();draw()}})));
    rrow.appendChild(h("button",{class:"chip",text:"−15 s","aria-label":"Back 15 seconds",onclick:()=>{au.currentTime=Math.max(0,au.currentTime-15)}}));
    if(window.caches){const off=h("button",{class:"chip",text:"Save offline"});
      caches.open("akt-audio").then(c=>c.match(n.audio.src)).then(hit=>{if(hit){off.textContent="Saved offline ✓";off.disabled=true;hit.blob().then(b=>{const t=au.currentTime;au.src=URL.createObjectURL(b);if(t)au.currentTime=t})}}).catch(()=>{});
      off.onclick=()=>{off.textContent="Saving…";off.disabled=true;fetch(n.audio.src).then(r=>{if(!r.ok)throw 0;return caches.open("akt-audio").then(c=>c.put(n.audio.src,r))}).then(()=>{off.textContent="Saved offline ✓"}).catch(()=>{off.textContent="Could not save";off.disabled=false})};
      rrow.appendChild(off)}};
  draw();
  return h("div",{class:"audio"},[h("div",{class:"ah"},[h("b",{text:"Listen"}),h("span",{text:n.audio.mins?n.audio.mins+" min":""})]),au,rrow,msg])}
function vNotes(app){
  const all=NOTES(),n=all.find(x=>x.id===noteOpen);
  if(!n){app.appendChild(topbar("Notes"));
    if(!all.length){app.appendChild(h("div",{class:"panel"},[h("p",{text:"No notes yet."})]));return}
    if(!unitOpen){const box=h("input",{type:"search",class:"nsearch",placeholder:"Search all notes","aria-label":"Search all notes",value:noteQuery||""}),out=h("div",{class:"nresults"});
      const run=()=>{noteQuery=box.value;const q=box.value.trim().toLowerCase();out.innerHTML="";if(q.length<2)return;const hits=[];
        all.forEach(n=>n.sections.forEach(s=>{const txt=[s.h].concat(s.body.map(b=>b.p||b.key||(b.ul?b.ul.join(" · "):"")||(b.tb?b.tb.r.map(r=>r.join(" – ")).join(" · "):""))).join(" · ");const i=txt.toLowerCase().indexOf(q);if(i>=0&&hits.length<30)hits.push({n,s,snip:(i>50?"…":"")+txt.slice(Math.max(0,i-50),i+90)+"…"})}));
        if(!hits.length){out.appendChild(h("p",{class:"muted sm",text:"No matches."}));return}
        hits.forEach(x=>out.appendChild(h("button",{class:"btn nhit",onclick:()=>openNote(x.n.id+"#"+x.s.id)},[h("b",{text:x.n.title+" › "+x.s.h}),h("span",{text:x.snip})])))};
      box.addEventListener("input",run);app.appendChild(h("div",{class:"panel"},[box,out]));if(noteQuery)run()}
    if(unitOpen){app.innerHTML="";app.appendChild(h("header",{class:"top"},[h("button",{class:"linkbtn",text:"‹ All units",onclick:()=>{unitOpen=null;go("home")}}),h("h1",{text:"Unit"})]));app.appendChild(unitPanel(unitOpen,true));return}
    builtUnits().forEach(u=>app.appendChild(unitPanel(u,true)));
    app.appendChild(h("p",{class:"muted sm",style:"padding:0 4px",text:"Written from primary sources and organised by RACGP curriculum topic. Each page lists what was read and when."}));return}
  app.appendChild(h("header",{class:"top"},[h("button",{class:"linkbtn",text:"‹ Notes",onclick:()=>{noteOpen=null;go("notes")}}),h("h1",{text:"Notes"})]));
  const qs=noteQs(n),cs=noteCards(n),idx=all.filter(x=>x.unit===n.unit),pos=idx.indexOf(n);
  const kids=[h("p",{class:"muted sm",style:"margin:0 0 4px",text:n.unit+" · page "+(pos+1)+" of "+idx.length}),h("h2",{class:"nh1",text:n.title}),h("p",{class:"muted sm",text:"Sources checked "+(n.checked||n.updated)+" · updated "+n.updated+" · "+qs.length+" question"+(qs.length===1?"":"s")+" · "+cs.length+" flashcard"+(cs.length===1?"":"s")}),
    audioBlock(n),
    n.brief&&n.brief.length?h("div",{class:"brief"},[h("b",{text:"In brief"}),h("ul",{},n.brief.map(x=>h("li",{text:x})))]):null,
    h("div",{class:"ntoc",id:"ntoc"},n.sections.map(s=>h("button",{class:"chip","data-sec":s.id,text:s.h,onclick:()=>{const e=document.getElementById("ns-"+s.id);if(e){e.open=true;e.scrollIntoView({block:"start",behavior:"smooth"})}}}))),
    h("div",{class:"ntools"},[h("button",{class:"linkbtn sm",text:"Collapse all",onclick:ev=>{const ds=[...document.querySelectorAll("details.nsec")],anyOpen=ds.some(d=>d.open);ds.forEach(d=>d.open=!anyOpen);ev.target.textContent=anyOpen?"Expand all":"Collapse all"}})])].filter(Boolean);
  n.sections.forEach(s=>{kids.push(h("details",{id:"ns-"+s.id,class:"nsec",open:""},[h("summary",{class:"nh3"},[h("span",{text:s.h})])].concat(s.body.map(noteBlock))))});
  if(n.curriculum&&n.curriculum.length)kids.push(h("section",{class:"nsec"},[h("h3",{class:"nh3",text:"RACGP curriculum topics covered"}),h("ul",{class:"nul"},n.curriculum.map(x=>h("li",{text:x})))]));
  kids.push(h("section",{class:"nsec"},[h("h3",{class:"nh3",text:"References"}),h("ol",{class:"nrefs"},n.refs.map(r=>{const li=h("li",{},[r.cite+" "]);if(r.url)li.appendChild(h("a",{href:r.url,target:"_blank",rel:"noopener",text:"Open source"}));return li}))]));
  const rd=noteRead(n.id),off=cs.filter(c=>!isOn(c.id)).length,prev=idx[pos-1],next=idx[pos+1];
  const open=x=>{noteOpen=x.id;noteSec=null;go("notes");window.scrollTo(0,0)};
  kids.push(h("div",{class:"nend"},[
    h("button",{class:"btn"+(rd?" done":" primary"),"aria-pressed":String(rd),text:rd?"✓ Read. Tap to undo":"Mark as read",onclick:()=>{const y=window.scrollY;setRead(n.id,!rd);render();window.scrollTo(0,y)}}),
    qs.length?h("button",{class:"btn",text:"Practise the "+qs.length+" question"+(qs.length===1?"":"s")+" on this page",onclick:()=>startSession({ids:qs.map(q=>q.id),mode:"tutor",fmt:"both"})}):null,
    cs.length?h("button",{class:"btn",disabled:!off,text:off?"Add "+off+" flashcard"+(off===1?"":"s")+" to my rotation":"All "+cs.length+" flashcards are in your rotation",onclick:()=>{const y=window.scrollY;activate(cs.map(c=>c.id));render();window.scrollTo(0,y)}}):null,
    (prev||next)?h("div",{class:"nnav"},[prev?h("button",{class:"btn",text:"‹ "+clip(prev.title,34),onclick:()=>open(prev)}):h("span",{style:"flex:1"}),next?h("button",{class:"btn nx",text:clip(next.title,34)+" ›",onclick:()=>open(next)}):h("span",{style:"flex:1"})]):null].filter(Boolean)));
  kids.push(h("p",{class:"muted sm",style:"margin:14px 0 0;text-align:center"},[reportLink("Notes: "+n.title,"Report an error on this page")]));
  app.appendChild(h("div",{class:"panel notes"},kids));
  /* Highlight the section being read in the sticky bar. */
  if(window.IntersectionObserver){const bar=document.getElementById("ntoc");const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting&&bar&&bar.isConnected){const id=e.target.id.slice(3);bar.querySelectorAll(".chip").forEach(c=>{const on=c.getAttribute("data-sec")===id;c.classList.toggle("on",on);if(on&&bar.scrollWidth>bar.clientWidth)bar.scrollTo({left:c.offsetLeft-bar.clientWidth/2+c.clientWidth/2,behavior:"smooth"})})}})},{rootMargin:"-15% 0px -75% 0px"});
    document.querySelectorAll("details.nsec[id]").forEach(d=>io.observe(d))}
}
function noteLink(q){const l=q.nt&&noteLabel(q.nt);return l?h("button",{class:"btn small notelink",text:"Read the notes: "+l,onclick:()=>openNote(q.nt)}):null}
function seg(opts,cur,set){return h("div",{class:"chips"},opts.map(o=>h("button",{class:"chip"+(cur===o[0]?" on":""),"aria-pressed":String(cur===o[0]),text:o[1],onclick:()=>{set(o[0]);render()}})))}
function stat(v,l){return h("div",{class:"stat"},[h("b",{text:String(v)}),h("span",{text:l})])}

/* ---------- home ---------- */
function resumePanel(){
  const ses=S.session;if(!ses)return null;const done=Object.keys(ses.ans).length;
  return h("div",{class:"panel resume"},[
    h("div",{class:"t",text:(ses.mode==="exam"?"Exam":"Session")+" in progress"}),
    h("div",{class:"s",text:done+" of "+ses.ids.length+" answered · "+(ses.topics.length===TOPICS.length?"All topics":ses.topics.join(", "))+(ses.deadline?" · "+fmtClock(ses.deadline-Date.now())+" left":"")}),
    h("div",{class:"row"},[h("button",{class:"btn primary grow",text:"Continue",onclick:()=>go("session")}),
      h("button",{class:"btn",text:"Finish now",onclick:()=>{const any=endSession();go(any?"results":"home",{idx:0})}})])]);
}
function weakest(n){
  const m={};QS.forEach(q=>{const s=qStat(q.id);if(!s.n)return;const k=q.t+" · "+q.l;const r=m[k]||(m[k]={k:k,t:q.t,l:q.l,n:0,c:0});r.n++;if(s.last)r.c++});
  return Object.values(m).filter(r=>r.c<r.n).sort((a,b)=>a.c/a.n-b.c/b.n||b.n-a.n).slice(0,n);
}
function vHome(app){
  app.appendChild(topbar("AKT and KFP Practice"));
  if(!S.settings.tipOff)app.appendChild(h("div",{class:"panel"},[h("div",{class:"row",style:"align-items:flex-start"},[
    h("div",{class:"grow sm"},[h("b",{text:"Your progress is stored in this browser. "}),"On iPhone, iPad or Safari, add this page to your home screen so it is not cleared after a week away. Take a backup now and then under More."]),
    h("button",{class:"btn small",text:"Got it",onclick:()=>{S.settings.tipOff=true;save();render()}})])]));
  if(!S.settings.discOff)app.appendChild(h("div",{class:"panel"},[h("div",{class:"row",style:"align-items:flex-start"},[
    h("div",{class:"grow sm"},[h("b",{text:"Before you start. "}),DISCLAIMER]),
    h("button",{class:"btn small",text:"Understood",onclick:()=>{S.settings.discOff=true;save();render()}})])]));
  const r=resumePanel();if(r)app.appendChild(r);
  const due=dueList().length,act=activeIds().length;
  const att=QS.filter(q=>qStat(q.id).n>0),cor=att.filter(q=>qStat(q.id).last===true).length;
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Today"}),
    h("div",{class:"stats"},[stat(due,"flashcards due"),stat(att.length+"/"+QS.length,"questions attempted"),stat(pct(cor,att.length),"correct on latest try")]),
    h("div",{class:"row",style:"margin-top:12px"},[
      h("button",{class:"btn primary grow",text:"10 mixed AKT questions",onclick:()=>startSession({topics:new Set(TOPICS),fmt:"akt",filter:att.length<QS.filter(q=>q.y==="akt").length?"unseen":"all",len:10,mode:"tutor"})}),
      h("button",{class:"btn grow",disabled:!due,text:due?"Review "+due+" card"+(due===1?"":"s"):"No cards due",onclick:()=>go("review")})])]));
  builtUnits().forEach(u=>app.appendChild(unitPanel(u,false)));
  app.appendChild(allUnitsPanel());
  const w=weakest(4);
  if(w.length)app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Weakest topics"}),h("div",{class:"stack"},w.map(x=>
    h("div",{class:"row"},[h("div",{class:"grow"},[h("div",{text:x.l}),h("div",{class:"muted sm",text:x.t+" · "+x.c+" of "+x.n+" correct"})]),
      h("button",{class:"btn small",text:"Add its cards",onclick:()=>{activate(CARDS.filter(c=>c.t===x.t&&c.l===x.l).map(c=>c.id));render()}})])))]));
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"How this works"}),h("div",{class:"prose sm"},[
    h("p",{text:"Answer practice questions. When you get one wrong, the flashcards that cover it are one tap away from going into your review rotation. Cards come back on a spaced schedule until they stick."}),
    h("p",{class:"muted",text:QS.filter(q=>q.y==="akt").length+" AKT questions, "+QS.filter(q=>q.y==="kfp").length+" KFP questions and "+CARDS.length+" flashcards across "+NOTES().length+" notes pages. "+act+" cards in your rotation."})])]));
}

/* ---------- question builder ---------- */
function vQuestions(app){
  app.appendChild(topbar("Questions"));
  const r=resumePanel();if(r)app.appendChild(r);
  const b=builder,p=pool(),n=b.len?Math.min(b.len,p.length):p.length;
  const chips=h("div",{class:"chips"},builtUnits().map(t=>{const ld=!!LOADED[t],m=unitMeta(t)||{},qs=QS.filter(q=>q.t===t&&(b.fmt==="both"||q.y===b.fmt)),un=ld?qs.filter(q=>qStat(q.id).n===0).length:(b.fmt==="both"?m.questions:m[b.fmt])||0;
    return h("button",{class:"chip"+(b.topics.has(t)?" on":""),"aria-pressed":String(b.topics.has(t)),onclick:()=>{if(b.topics.has(t)){b.topics.delete(t);render()}else openUnit(t,()=>{b.topics.add(t);render()})}},[t,h("small",{text:un?un+" new":"all done"})])}));
  const subL=[];QS.forEach(q=>{const k=q.t+"|"+q.l;if(b.topics.has(q.t)&&(b.fmt==="both"||q.y===b.fmt)&&!subL.includes(k))subL.push(k)});
  [...b.subs].forEach(k=>{if(!subL.includes(k))b.subs.delete(k)});
  const subChips=h("div",{class:"chips"},[h("button",{class:"chip"+(!b.subs.size?" on":""),"aria-pressed":String(!b.subs.size),text:"All topics",onclick:()=>{b.subs.clear();render()}})].concat(subL.map(k=>{const l=k.split("|")[1],qs=QS.filter(q=>q.t+"|"+q.l===k&&(b.fmt==="both"||q.y===b.fmt));
    return h("button",{class:"chip"+(b.subs.has(k)?" on":""),"aria-pressed":String(b.subs.has(k)),onclick:()=>{b.subs.has(k)?b.subs.delete(k):b.subs.add(k);render()}},[l,h("small",{text:String(qs.length)})])})));
  const secs=p.slice(0,n||0).length?(b.len?shuffle(p).slice(0,n):p).reduce((a,q)=>a+PACE[q.y],0):0;
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"New session"}),h("div",{class:"stack"},[
    h("div",{class:"field"},[h("div",{class:"lab",text:"Format"}),seg([["akt","AKT (single best answer)"],["kfp","KFP (multiple selection)"],["both","Both"]],b.fmt,v=>b.fmt=v)]),
    h("div",{class:"field"},[h("div",{class:"lab",text:"Units"}),chips,h("button",{class:"linkbtn sm",text:b.topics.size===TOPICS.length?"Clear all":"Select all",onclick:()=>{b.topics=b.topics.size===TOPICS.length?new Set():new Set(TOPICS);render()}})]),
    subL.length>1?h("div",{class:"field"},[h("div",{class:"lab",text:"Topics"}),subChips]):null,
    h("div",{class:"field"},[h("div",{class:"lab",text:"Which questions"}),seg([["all","All"],["unseen","Not yet attempted"],["wrong","Previously incorrect"],["flag","Flagged"]],b.filter,v=>b.filter=v)]),
    h("div",{class:"field"},[h("div",{class:"lab",text:"Length"}),seg([[5,"5"],[10,"10"],[20,"20"],[0,"All"]],b.len,v=>b.len=v)]),
    h("div",{class:"field"},[h("div",{class:"lab",text:"Mode"}),seg([["tutor","Tutor: answer and explanation after each question"],["exam","Exam: timed, answers at the end"]],b.mode,v=>b.mode=v)]),
    h("button",{class:"btn primary big",disabled:!n,text:n?"Start "+n+" question"+(n===1?"":"s")+(b.mode==="exam"?" · "+Math.round(secs/6e4)+" min":""):"No questions match",onclick:()=>startSession()}),
    S.session?h("div",{class:"muted sm",style:"text-align:center",text:"Starting a new session finishes the one in progress."}):null].filter(Boolean))]));
  if(S.hist.length){
    const list=h("div",{class:"panel"},[h("h2",{text:"Past sessions"})]);
    S.hist.slice(0,12).forEach((x,i)=>list.appendChild(h("div",{class:"sumrow"},[
      h("span",{class:"tag "+(x.c/x.n>=.7?"good":x.c/x.n>=.5?"warn":"bad"),text:x.c+"/"+x.n}),
      h("div",{class:"tx"},[h("div",{text:fmtDate(x.at)}),h("div",{class:"muted sm",text:(x.mode==="exam"?"Exam":"Tutor")+" · "+(x.fmt||"akt").toUpperCase()+(x.ms?" · "+Math.max(1,Math.round(x.ms/6e4))+" min":"")})]),
      h("button",{class:"btn small",text:"Review",onclick:()=>go("results",{idx:i})})])));
    app.appendChild(list);
  }
}

/* ---------- shared question rendering ---------- */
function linkedBlock(q,wrong,rerender){
  const ids=q.c.filter(id=>CARD[id]),off=ids.filter(id=>!isOn(id)),box=h("div",{class:"linked"});
  if(wrong)box.appendChild(off.length
    ?h("div",{class:"callout"},[h("b",{text:off.length+" linked flashcard"+(off.length===1?" is":"s are")+" not in your rotation."}),
        h("button",{class:"btn primary",text:"Add "+(off.length===ids.length?"all "+ids.length:"the remaining "+off.length)+" to my rotation",onclick:()=>{activate(ids,q.id);rerender()}})])
    :h("div",{class:"callout good"},[h("b",{text:"✓ All "+ids.length+" linked flashcards are in your rotation."})]));
  box.appendChild(h("h3",{},["Linked flashcards ",h("span",{class:"tag grey",text:String(ids.length)}),!wrong&&off.length?h("button",{class:"linkbtn sm",text:"Add all",onclick:()=>{activate(ids,q.id);rerender()}}):null]));
  ids.forEach(id=>box.appendChild(cardRow(id,q.id,rerender)));
  return box;
}
function cardRow(id,qid,rerender){
  const c=CARD[id],on=isOn(id);
  return h("div",{class:"fc"+(on?" on":"")},[
    h("div",{class:"tx"},[h("div",{html:cloze(c,true)}),h("div",{class:"meta",text:c.t+" · "+c.l+(on&&S.cards[id].f.reps?" · next "+fmtWhen(dueTs(id)):"")})]),
    h("button",{class:"tog"+(on?" on":""),"aria-pressed":String(on),text:on?"In rotation":"Add",title:on?"Remove from rotation":"Add to rotation",onclick:()=>{on?suspend([id]):activate([id],qid);rerender()}})]);
}
function optionList(q,a,opts){
  // a = recorded answer or null; opts: {reveal, elim, onPick, onElim}
  const box=h("div",{role:q.y==="akt"?"radiogroup":"group","aria-label":"Answer options"});
  q.o.forEach((o,i)=>{
    const sel=a?(q.y==="akt"?a.p===i:a.p.includes(i)):pick.includes(i);
    let cls="opt"+(q.y==="kfp"?" multi":""),badge=null;
    if(opts.reveal){
      if(q.y==="akt"){if(i===q.a)cls+=" right";else if(sel)cls+=" wrong"}
      else{if(q.sc[i]>0&&sel)cls+=" right";else if(q.sc[i]>0)cls+=" missed";else if(sel)cls+=" wrong";
        if(q.sc[i]>0)badge=h("span",{class:"tag "+(sel?"good":"warn"),style:"margin-left:8px",text:(sel?"+":"missed ")+q.sc[i]})}
    }else{if(sel)cls+=" sel";if(opts.elim&&opts.elim.includes(i))cls+=" out"}
    const btn=h("button",{class:cls,disabled:!!opts.locked,role:q.y==="akt"?"radio":"checkbox","aria-checked":String(sel),onclick:()=>opts.onPick&&opts.onPick(i)},[
      h("span",{class:"k",text:String.fromCharCode(65+i)}),
      h("span",{class:"grow"},[h("div",{class:"otx"},[o,badge]),opts.reveal&&q.x?h("div",{class:"why",text:q.x[i]}):null])]);
    box.appendChild(h("div",{class:"optrow"},[btn,!opts.reveal&&!opts.locked&&opts.onElim?h("button",{class:"strike"+(opts.elim&&opts.elim.includes(i)?" on":""),title:"Cross out this option","aria-label":"Cross out option "+String.fromCharCode(65+i),"aria-pressed":String(!!(opts.elim&&opts.elim.includes(i))),text:"✕",onclick:()=>opts.onElim(i)}):null]));
  });
  return box;
}
function verdict(q,a){
  if(a.blank)return h("div",{class:"verdict bad",text:"Not answered"});
  if(q.y==="akt")return h("div",{class:"verdict "+(a.ok?"good":"bad"),text:a.ok?"Correct":"Incorrect. The best answer is "+String.fromCharCode(65+q.a)+"."});
  return h("div",{class:"verdict "+(a.ok?"good":a.pts?"part":"bad"),text:a.pts+" of "+a.max+" marks"+(a.ok?"":a.pts?" (partial credit)":"")});
}
const FKEY="akt_flags_v1";
function loadFlags(){try{return JSON.parse(localStorage.getItem(FKEY)||"{}")}catch(e){return {}}}
function saveFlags(F){try{localStorage.setItem(FKEY,JSON.stringify(F))}catch(e){}}
function flagRow(q){const cur=loadFlags()[q.id];const n=()=>Object.keys(loadFlags()).length;
  const inp=h("input",{class:"flaginp",type:"text",placeholder:"What is wrong with this question? (optional)",value:cur?cur.note:""});
  const status=h("span",{class:"muted sm",text:cur?"Flagged":""});
  const btn=h("button",{class:"btn small",text:cur?"Update flag":"Flag this question",onclick:()=>{const F=loadFlags();F[q.id]={note:inp.value.trim(),rev:q.rev||"old",t:new Date().toISOString().slice(0,16)};saveFlags(F);status.textContent="Flagged ("+n()+" in total)";btn.textContent="Update flag"}});
  const copy=h("button",{class:"btn small",text:"Copy all flags",onclick:()=>{const F=loadFlags();const txt=Object.keys(F).map(id=>id+" ["+F[id].rev+"]: "+(F[id].note||"(no note)")).join("\n")||"No flags yet";
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>{status.textContent="Copied "+n()+" flags. Paste them into the chat."}).catch(()=>{status.textContent=txt})}});
  return h("div",{class:"flagrow"},[inp,h("div",{class:"row"},[btn,copy,status]),h("div",{style:"margin-top:6px"},[reportLink("Question "+q.id,"Report an error in this question")])])}
function feedback(q,a,rerender){
  return h("div",{class:"panel"},[verdict(q,a),h("p",{class:"explain",text:q.e}),srcNode(q),noteLink(q),
    q.k?h("div",{class:"key"},[h("b",{text:"Take-home"}),q.k]):null,
    h("div",{class:"muted sm",style:"margin-top:8px",text:q.t+" · "+q.l}),flagRow(q),linkedBlock(q,!a.ok,rerender)]);
}

/* ---------- session ---------- */
function vSession(app){
  const ses=S.session,exam=ses.mode==="exam";
  if(exam&&Date.now()>=ses.deadline){endSession();return go("results",{idx:0})}
  ses.i=Math.max(0,Math.min(ses.i,ses.ids.length-1));
  const qid=ses.ids[ses.i],q=QBY[qid],a=ses.ans[qid],revealed=!exam&&!!a;
  if(exam&&a&&!pick.length)pick=q.y==="akt"?[a.p]:a.p.slice();
  const elim=ses.elim[qid]||[];
  const timer=exam?h("span",{class:"timer",id:"timer","aria-label":"Time remaining"}):null;
  const flagged=!!qStat(qid).flag;
  app.appendChild(h("header",{class:"top"},[h("button",{class:"linkbtn",text:"‹ Pause",onclick:()=>go("home")}),h("h1",{text:exam?"Exam":"Practice"}),timer,
    h("button",{class:"btn small","aria-pressed":String(flagged),text:flagged?"⚑ Flagged":"⚐ Flag",onclick:()=>{toggleFlag(qid);render()}})]));
  const answered=Object.keys(ses.ans).length,right=ses.ids.filter(id=>ses.ans[id]&&ses.ans[id].ok).length;
  app.appendChild(h("div",{class:"qhead"},[h("span",{class:"n",text:"Question "+(ses.i+1)+" of "+ses.ids.length}),h("span",{class:"tag",text:q.t}),h("span",{class:"tag grey",text:q.y.toUpperCase()}),h("span",{class:"grow"}),
    h("span",{class:"muted sm num",text:exam?answered+" answered":answered?right+"/"+answered+" correct":""})]));
  app.appendChild(h("div",{class:"seg","aria-label":"Question navigator"},ses.ids.map((id,i)=>{const x=ses.ans[id];
    return h("button",{class:(x?(exam?"d":x.ok?"g":"b"):"")+(i===ses.i?" cur":"")+(qStat(id).flag?" f":""),title:"Question "+(i+1),"aria-label":"Go to question "+(i+1),onclick:()=>{if(exam||ses.ans[id]||i===ses.i||ses.ans[ses.ids[ses.i]]){ses.i=i;pick=[];save();render()}}})})));
  const lim=q.y==="kfp"?q.n:1;
  const panel=h("div",{class:"panel"},[...stemNodes(q),h("p",{class:"lead",text:q.q}),
    q.y==="kfp"&&!revealed?h("div",{class:"muted sm num",style:"margin:-6px 0 10px",text:pick.length+" of "+q.n+" selected"}):null,
    optionList(q,revealed?a:null,{reveal:revealed,locked:revealed,elim:elim,
      onPick:i=>{if(q.y==="akt")pick=[i];else if(pick.includes(i))pick=pick.filter(x=>x!==i);else if(pick.length<lim)pick=pick.concat(i);else return flashLimit(q.n);
        if(exam){if(pick.length)record(qid,pick);else{delete ses.ans[qid];save()}}render()},
      onElim:i=>{const e=ses.elim[qid]||(ses.elim[qid]=[]);const k=e.indexOf(i);k>=0?e.splice(k,1):e.push(i);pick=pick.filter(x=>x!==i);if(exam){if(pick.length)record(qid,pick);else delete ses.ans[qid]}save();render()}})]);
  app.appendChild(panel);
  const last=ses.i===ses.ids.length-1;
  if(exam){
    const tick=()=>{const left=ses.deadline-Date.now(),el=$("#timer");if(el){el.textContent=fmtClock(left);el.classList.toggle("low",left<6e4)}if(left<=0){clearInterval(timerHandle);endSession();go("results",{idx:0})}};
    tick();timerHandle=setInterval(tick,1000);
    const un=ses.ids.length-answered;
    foot([h("button",{class:"btn",disabled:ses.i===0,text:"Previous",onclick:()=>{ses.i--;pick=[];save();render();window.scrollTo(0,0)}}),
      last?h("button",{class:"btn primary",text:"Finish exam",onclick:function(){
          if(un&&!this.dataset.sure){this.dataset.sure="1";this.textContent=un+" unanswered. Finish anyway?";return}
          endSession();go("results",{idx:0})}})
        :h("button",{class:"btn primary",text:"Next",onclick:()=>{ses.i++;pick=[];save();render();window.scrollTo(0,0)}})]);
  }else if(revealed){
    app.appendChild(feedback(q,a,render));
    foot([h("button",{class:"btn primary",text:last?"Finish session":"Next question",onclick:()=>{if(last){endSession();go("results",{idx:0})}else{ses.i++;pick=[];save();render();window.scrollTo(0,0)}}})]);
  }else{
    foot([h("button",{class:"btn primary",disabled:!pick.length,text:q.y==="kfp"&&pick.length&&pick.length<q.n?"Submit with only "+pick.length+" selected":"Submit answer",onclick:()=>{const p=pick;pick=[];record(qid,p);render()}})]);
  }
}
function flashLimit(n){const b=$("#footin .btn.primary")||$("#footin .btn");const m=$(".lead");if(m){let w=$("#limwarn");if(!w){w=h("div",{id:"limwarn",class:"callout",role:"status",style:"margin:0 0 12px"});m.after(w)}w.textContent="You can select "+NUMWORD[n].toLowerCase()+" only. Deselect one to change your answer. In the real exam, extra selections lose marks."}}

/* ---------- results ---------- */
function vResults(app){
  const hs=S.hist[resultIdx]||S.hist[0];
  app.appendChild(topbar("Session results",["questions","Questions"]));
  if(!hs){app.appendChild(h("div",{class:"panel empty"},[h("b",{text:"No sessions yet"}),h("div",{text:"Finish a session and the results appear here."})]));return}
  const ids=hs.ids.filter(id=>QBY[id]),wrong=ids.filter(id=>!hs.ans[id].ok);
  const wc=[...new Set(wrong.flatMap(id=>QBY[id].c))].filter(id=>CARD[id]),off=wc.filter(id=>!isOn(id));
  const score=hs.pts!==undefined?hs.pts:hs.c;
  app.appendChild(h("div",{class:"panel"},[
    h("div",{class:"score",text:pct(score,hs.n)}),
    h("div",{class:"muted",text:hs.c+" of "+hs.n+" fully correct · "+(hs.mode==="exam"?"Exam":"Tutor")+" · "+fmtDate(hs.at)+(hs.ms?" · "+Math.max(1,Math.round(hs.ms/6e4))+" min":"")}),
    wrong.length?(off.length
      ?h("div",{class:"callout"},[h("b",{text:wrong.length+" missed question"+(wrong.length===1?"":"s")+" link to "+wc.length+" flashcards. "+off.length+" are not in your rotation."}),
          h("button",{class:"btn primary",text:"Add all "+off.length+" to my rotation",onclick:()=>{wrong.forEach(id=>activate(QBY[id].c,id));render()}})])
      :h("div",{class:"callout good"},[h("b",{text:"✓ Every flashcard linked to your missed questions is in your rotation ("+wc.length+")."})]))
      :h("div",{class:"callout good"},[h("b",{text:"Clean sheet. No flashcards needed from this one."})])]));
  const byT={};ids.forEach(id=>{const q=QBY[id],r=byT[q.t]||(byT[q.t]={n:0,c:0});r.n++;if(hs.ans[id].ok)r.c++});
  if(Object.keys(byT).length>1)app.appendChild(h("div",{class:"panel"},[h("h2",{text:"By topic"}),h("div",{class:"stack"},Object.keys(byT).map(t=>
    h("div",{class:"trow"},[h("span",{text:t}),h("em",{text:byT[t].c+" of "+byT[t].n}),h("div",{class:"bar"},[h("i",{class:"g",style:"width:"+100*byT[t].c/byT[t].n+"%"}),h("i",{class:"b",style:"width:"+100*(byT[t].n-byT[t].c)/byT[t].n+"%"})])])))]));
  const list=h("div",{class:"panel"},[h("h2",{text:"Questions"})]);
  ids.forEach((id,i)=>{const q=QBY[id],a=hs.ans[id];
    const det=h("div",{class:"hide",style:"margin-top:10px"});
    const open=()=>{if(det.classList.toggle("hide"))return;det.innerHTML="";stemNodes(q).forEach(n=>det.appendChild(n));det.appendChild(h("p",{class:"lead",text:q.q}));
      det.appendChild(optionList(q,a.blank?(q.y==="akt"?{p:-1}:{p:[]}):a,{reveal:true,locked:true}));det.appendChild(feedback(q,a,()=>{det.classList.add("hide");open()}))};
    list.appendChild(h("div",{class:"sumrow"},[h("span",{class:"tag "+(a.ok?"good":a.pts?"warn":"bad"),text:a.ok?"✓":a.pts?a.pts+"/"+a.max:"✗"}),
      h("div",{class:"tx"},[h("div",{text:(i+1)+". "+clip(q.s,120)}),h("div",{class:"muted sm",text:q.t+" · "+q.l+" · "+q.y.toUpperCase()}),
        h("button",{class:"linkbtn sm",style:"padding-left:0",text:"Show question, explanations and "+q.c.length+" flashcards",onclick:open}),det])]))});
  app.appendChild(list);
  const due=dueList().length;
  foot([due?h("button",{class:"btn primary",text:"Review "+due+" flashcard"+(due===1?"":"s"),onclick:()=>go("review")}):null,h("button",{class:"btn"+(due?"":" primary"),text:"New session",onclick:()=>go("questions")})]);
}

/* ---------- flashcards ---------- */
let shown=false,reviewed=0;
function vFlashcards(app){
  app.appendChild(topbar("Flashcards"));
  const ids=activeIds(),due=dueList().length,learn=ids.filter(id=>S.cards[id].f.state!==2).length;
  const soon=ids.filter(id=>dueTs(id)>Date.now()&&dueTs(id)<=Date.now()+DAY).length;
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Review"}),
    h("div",{class:"stats"},[stat(due,"due now"),stat(soon,"due in the next 24 h"),stat(ids.length,"in rotation")]),
    h("button",{class:"btn primary big",style:"margin-top:12px",disabled:!due,text:due?"Review "+due+" card"+(due===1?"":"s"):"Nothing due",onclick:()=>go("review")}),
    h("div",{class:"muted sm",style:"margin-top:8px",text:ids.length?learn+" still being learned, "+(ids.length-learn)+" on long intervals. Scheduling uses FSRS at 90% target retention.":"Cards enter your rotation when you add them from a missed question or from the deck."})]));
  const t=h("div",{class:"panel"},[h("h2",{text:"Deck"})]);
  TOPICS.forEach(tp=>{const cs=CARDS.filter(c=>c.t===tp),on=cs.filter(c=>isOn(c.id)).length;
    t.appendChild(h("div",{class:"trow",style:"margin-bottom:10px"},[h("span",{text:tp}),h("em",{text:on+" of "+cs.length+" in rotation"}),h("div",{class:"bar"},[h("i",{class:"a",style:"width:"+100*on/cs.length+"%"})])]))});
  t.appendChild(h("button",{class:"btn",text:"Browse and search all "+CARDS.length+" cards",onclick:()=>go("deck")}));
  app.appendChild(t);
}
function vReview(app){
  app.appendChild(h("header",{class:"top"},[h("button",{class:"linkbtn",text:"‹ Done",onclick:()=>{reviewed=0;go("flashcards")}}),h("h1",{text:"Review"}),
    lastGrade?h("button",{class:"btn small",text:"Undo",onclick:()=>{undoGrade();reviewed=Math.max(0,reviewed-1);shown=false;render()}}):null]));
  const q=dueList(LEARN_AHEAD);
  if(!q.length){
    const next=activeIds().map(dueTs).sort((a,b)=>a-b)[0];
    app.appendChild(h("div",{class:"panel empty"},[h("b",{text:reviewed?"Done. "+reviewed+" reviewed.":"Nothing due"}),
      h("div",{text:next?"Next card due "+fmtWhen(next)+".":"No cards in your rotation yet."}),
      h("div",{class:"row",style:"justify-content:center;margin-top:16px"},[h("button",{class:"btn primary",text:"Practice questions",onclick:()=>{reviewed=0;go("questions")}}),h("button",{class:"btn",text:"Browse deck",onclick:()=>{reviewed=0;go("deck")}})])]));
    return;
  }
  const id=q[0],c=CARD[id],st=S.cards[id];
  app.appendChild(h("div",{class:"qhead"},[h("span",{class:"n",text:q.length+" to go"}),h("span",{class:"tag",text:c.t}),h("span",{class:"tag grey",text:c.l}),h("span",{class:"grow"}),
    h("button",{class:"linkbtn sm",text:"Remove from rotation",onclick:()=>{suspend([id]);shown=false;render()}})]));
  const img=shown&&c.i?h("img",{class:"sumimg",src:imgSrc(c.i),alt:"Summary notes covering this card. Select to enlarge.",loading:"lazy",tabindex:"0",onclick:()=>zoom(imgSrc(c.i)),onerror:function(){this.remove()}}):null;
  app.appendChild(h("div",{class:"panel"},[h("div",{class:"card-face"},[h("div",{html:cloze(c,shown)}),shown&&c.e?h("div",{class:"card-extra",html:c.e}):null,shown&&c.src?h("p",{class:"muted sm src",text:"Source: "+c.src}):null,shown?noteLink(c):null]),img]));
  if(shown&&st.src&&st.src.length){const s=st.src.map(x=>QBY[x]).filter(Boolean)[0];if(s)app.appendChild(h("div",{class:"muted sm",style:"padding:0 4px",text:"Added from a missed question: "+clip(s.s,90)}))}
  if(!shown)foot([h("button",{class:"btn primary",text:"Show answer",onclick:()=>{shown=true;render()}})]);
  else{const pv=preview(id);
    foot([h("div",{class:"grades"},[["Again","again"],["Hard",""],["Good",""],["Easy","easy"]].map((x,i)=>
      h("button",{class:"btn "+x[1],onclick:()=>{grade(id,i);shown=false;reviewed++;render();window.scrollTo(0,0)}},[x[0],h("small",{text:fmtIvl(pv[i])})])))]);}
}
function imgSrc(n){return (window.AKT_IMG&&window.AKT_IMG[n])||"img/"+n}
function zoom(src){const z=$("#zoom");$("#zoomimg").src=src;z.classList.remove("hide");$("#zoomclose").focus()}
function unzoom(){$("#zoom").classList.add("hide")}

/* ---------- deck browser ---------- */
let df={t:"",l:"",s:"all",q:"",lim:60};
function vDeck(app){
  app.appendChild(topbar("Deck",["flashcards","Flashcards"]));
  const lectures=[...new Set(CARDS.filter(c=>!df.t||c.t===df.t).map(c=>c.l))];
  if(df.l&&!lectures.includes(df.l))df.l="";
  const sel=(id,label,opts,cur,set)=>{const s=h("select",{id:id,"aria-label":label},opts.map(o=>{const e=h("option",{value:o[0],text:o[1]});if(o[0]===cur)e.selected=true;return e}));s.addEventListener("change",()=>{set(s.value);df.lim=60;render()});return s};
  const search=h("input",{type:"search",id:"decksearch","aria-label":"Search cards",placeholder:"Search cards",value:df.q});
  let t=null;search.addEventListener("input",()=>{clearTimeout(t);t=setTimeout(()=>{df.q=search.value;df.lim=60;render();const n=$("#decksearch");if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},250)});
  const ql=df.q.trim().toLowerCase();
  const list=CARDS.filter(c=>(!df.t||c.t===df.t)&&(!df.l||c.l===df.l)&&(df.s==="all"||(df.s==="on")===isOn(c.id))&&(!ql||(c.x+" "+c.e).toLowerCase().includes(ql)));
  const onN=list.filter(c=>isOn(c.id)).length,narrow=df.t||df.l||ql;
  app.appendChild(h("div",{class:"panel"},[h("div",{class:"row",style:"margin-bottom:10px"},[
      sel("decktopic","Topic",[["","All topics"]].concat(TOPICS.map(x=>[x,x])),df.t,v=>{df.t=v;df.l=""}),
      sel("decklecture","Topic",[["","All topics"]].concat(lectures.map(x=>[x,x])),df.l,v=>df.l=v),
      sel("deckstatus","Status",[["all","Any status"],["on","In rotation"],["off","Not in rotation"]],df.s,v=>df.s=v)]),
    search,
    h("div",{class:"row",style:"margin-top:12px"},[h("span",{class:"muted sm grow num",text:list.length+" cards · "+onN+" in rotation"}),
      narrow&&list.length&&onN<list.length?h("button",{class:"btn small",text:"Add all "+list.length,onclick:()=>{activate(list.map(c=>c.id));render()}}):null,
      (narrow||df.s==="on")&&onN?h("button",{class:"btn small",text:"Remove all",onclick:()=>{suspend(list.map(c=>c.id));render()}}):null])]));
  const box=h("div");
  list.slice(0,df.lim).forEach(c=>box.appendChild(cardRow(c.id,null,()=>{const y=window.scrollY;render();window.scrollTo(0,y)})));
  if(list.length>df.lim)box.appendChild(h("button",{class:"btn big",text:"Show more ("+(list.length-df.lim)+" left)",onclick:()=>{df.lim+=120;const y=window.scrollY;render();window.scrollTo(0,y)}}));
  if(!list.length)box.appendChild(h("div",{class:"panel empty"},[h("b",{text:"No cards match"}),h("div",{text:"Try a different search or clear the filters."})]));
  app.appendChild(box);
}

/* ---------- progress ---------- */
function vProgress(app){
  app.appendChild(topbar("Progress"));
  const att=QS.filter(q=>qStat(q.id).n>0),cor=att.filter(q=>qStat(q.id).last===true).length;
  const days=[];for(let i=13;i>=0;i--)days.push(dayKey(Date.now()-i*DAY));
  const logs=days.map(d=>S.log[d]||{q:0,c:0,a:0});
  const rev=Object.values(S.log).reduce((a,r)=>a+(r.r||0),0),lap=Object.values(S.log).reduce((a,r)=>a+(r.a||0),0);
  let streak=0;for(let i=0;;i++){const r=S.log[dayKey(Date.now()-i*DAY)];if(r&&(r.q||r.c))streak++;else if(i>0)break;else continue;if(i>400)break}
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Overall"}),h("div",{class:"stats four"},[
    stat(att.length+"/"+QS.length,"questions attempted"),stat(pct(cor,att.length),"correct on latest try"),stat(rev?pct(rev-lap,rev):"–","flashcard retention"),stat(streak,"day streak")])]));
  const mx=Math.max(1,...logs.map(r=>r.q+r.c));
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Last 14 days"}),
    h("div",{class:"act",role:"img","aria-label":"Daily activity for the last 14 days: "+logs.reduce((a,r)=>a+r.q,0)+" questions and "+logs.reduce((a,r)=>a+r.c,0)+" card reviews"},logs.map((r,i)=>h("div",{title:days[i]+": "+r.q+" questions, "+r.c+" card reviews"},[h("i",{class:"c",style:"height:"+100*r.c/mx+"%"}),h("i",{class:"q",style:"height:"+100*r.q/mx+"%"})]))),
    h("div",{class:"actlab"},[h("span",{text:new Date(Date.now()-13*DAY).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}),h("span",{text:"Busiest day: "+mx*(logs.some(r=>r.q+r.c)?1:0)+" items"}),h("span",{text:"Today"})]),
    h("div",{class:"legend"},[h("span",{},[h("i",{style:"background:var(--accent)"}),"Questions"]),h("span",{},[h("i",{style:"background:var(--warn)"}),"Card reviews"])])]));
  const tp=h("div",{class:"panel"},[h("h2",{text:"By unit"})]),st=h("div",{class:"stack"});
  TOPICS.forEach(t=>{const qs=QS.filter(q=>q.t===t),g=qs.filter(q=>qStat(q.id).last===true).length,b=qs.filter(q=>qStat(q.id).last===false).length;
    st.appendChild(h("div",{class:"trow"},[h("span",{text:t}),h("em",{text:g+" right · "+b+" wrong · "+(qs.length-g-b)+" new"}),h("div",{class:"bar"},[h("i",{class:"g",style:"width:"+100*g/qs.length+"%"}),h("i",{class:"b",style:"width:"+100*b/qs.length+"%"})])]))});
  tp.appendChild(st);app.appendChild(tp);
  const m={};QS.forEach(q=>{const k=q.t+"|"+q.l,r=m[k]||(m[k]={t:q.t,l:q.l,n:0,a:0,c:0});r.n++;const s=qStat(q.id);if(s.n){r.a++;if(s.last)r.c++}});
  const rows=Object.values(m).sort((x,y)=>(x.a?x.c/x.a:2)-(y.a?y.c/y.a:2)||x.l.localeCompare(y.l));
  const tb=h("table",{class:"lec"},[h("thead",{},[h("tr",{},[h("th",{text:"Topic"}),h("th",{class:"r",text:"Tried"}),h("th",{class:"r",text:"Correct"}),h("th",{class:"r",text:"Cards in rotation"})])]),
    h("tbody",{},rows.map(r=>{const cs=CARDS.filter(c=>c.t===r.t&&c.l===r.l);return h("tr",{},[h("td",{},TOPICS.length>1?[r.l,h("div",{class:"muted sm",text:r.t})]:[r.l]),h("td",{class:"r",text:r.a+"/"+r.n}),h("td",{class:"r",text:r.a?pct(r.c,r.a):"–"}),h("td",{class:"r",text:cs.filter(c=>isOn(c.id)).length+"/"+cs.length})])}))]);
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"By topic, weakest first"}),h("div",{class:"tablewrap"},[tb])]));
}

/* ---------- more: settings, backup, about ---------- */
function vMore(app){
  app.appendChild(topbar("More"));
  const auto=h("input",{type:"checkbox",id:"autoadd"});auto.checked=!!S.settings.auto;auto.addEventListener("change",()=>{S.settings.auto=auto.checked;save()});
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Settings"}),h("label",{class:"switch",for:"autoadd"},[auto,h("span",{text:"When I get a question wrong, add its linked flashcards to my rotation automatically"})])]));
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Backup"}),h("div",{class:"prose sm muted"},[h("p",{text:"Progress is stored in this browser only. A backup is a small text file you can keep, or use to move your progress to another device."})]),backupBlock()]));
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"About"}),h("div",{class:"prose sm"},[h("p",{text:DISCLAIMER}),
    h("p",{},["Each notes page lists its sources and when they were last checked. Found a mistake? ",reportLink("the app in general","Report it here"),"."])])]));
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Install"}),h("div",{class:"prose sm"},[
    h("p",{text:"iPhone and iPad: open in Safari, tap Share, then Add to Home Screen. Android and desktop Chrome or Edge: use Install app in the browser menu. Installed, it works offline and keeps its data."})])]));
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"About"}),h("div",{class:"prose sm"},[
    h("p",{text:"A study aid for the RACGP Applied Knowledge Test and Key Feature Problem exams. Questions are original and written to resemble the exam formats: single best answer for the AKT, and multiple selection with weighted marks for the KFP."}),
    h("p",{text:"It is not affiliated with or endorsed by the RACGP. Content is for exam preparation by doctors, is not clinical advice, and has not been formally peer reviewed. Each notes page lists its sources and where they disagree. Check anything that matters against current Australian guidelines."}),
    h("p",{class:"muted",text:"Version "+VERSION+" · "+QS.length+" questions · "+CARDS.length+" flashcards · scheduling by FSRS (ts-fsrs, MIT licence)."})])]));
  const reset=h("div",{},[h("button",{class:"btn small danger",text:"Reset all progress",onclick:function(){
    this.parentNode.replaceChildren(h("span",{class:"sm",text:"This wipes question history and flashcard scheduling in this browser. "}),h("button",{class:"btn small danger",text:"Yes, reset",onclick:()=>{const s=S.settings;S=fresh();S.settings=s;save();render()}}),document.createTextNode(" "),h("button",{class:"btn small",text:"Cancel",onclick:render}))}})]);
  app.appendChild(h("div",{class:"panel"},[h("h2",{text:"Reset"}),reset]));
}
function backupBlock(){
  const ta=h("textarea",{class:"hide",id:"backupcode",spellcheck:"false","aria-label":"Backup code"});
  const msg=h("div",{class:"muted sm",role:"status",style:"margin-top:6px"});
  const file=h("input",{type:"file",id:"backupfile",accept:".json,application/json,text/plain",class:"hide","aria-label":"Backup file"});
  const restoreBtn=h("button",{class:"btn small hide",text:"Restore from this code",onclick:()=>restore(ta.value)});
  function restore(txt){let o=null;try{o=migrate(JSON.parse(txt))}catch(e){}if(!o){msg.textContent="That is not a valid backup. Paste the whole code, or choose the backup file.";return}S=o;save();render()}
  file.addEventListener("change",()=>{const f=file.files[0];if(!f)return;const r=new FileReader();r.onload=()=>restore(String(r.result));r.readAsText(f)});
  return h("div",{},[h("div",{class:"row"},[
    h("button",{class:"btn small",text:"Back up progress",onclick:()=>{
      const txt=JSON.stringify(S);ta.value=txt;ta.classList.remove("hide");restoreBtn.classList.add("hide");ta.select();
      try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"}));a.download="akt-practice-backup-"+dayKey()+".json";document.body.appendChild(a);a.click();a.remove()}catch(e){}
      const fb=()=>{msg.textContent="Copy the code above and keep it somewhere safe, such as an email to yourself."};
      try{navigator.clipboard.writeText(txt).then(()=>{msg.textContent="Backup copied to the clipboard. Keep it somewhere safe, such as an email to yourself."},fb)}catch(e){fb()}}}),
    h("button",{class:"btn small",text:"Restore from code",onclick:()=>{ta.value="";ta.placeholder="Paste a backup code here";ta.classList.remove("hide");restoreBtn.classList.remove("hide");ta.focus();msg.textContent="Restoring replaces the progress in this browser."}}),
    h("button",{class:"btn small",text:"Restore from file",onclick:()=>file.click()})]),ta,restoreBtn,file,msg]);
}

/* ---------- keyboard ---------- */
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("#zoom").classList.contains("hide")){unzoom();return}
  if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key.toLowerCase();
  if(view==="session"&&S.session){
    const q=QBY[S.session.ids[S.session.i]];if(!q)return;
    const i=k.length===1?(k>="a"&&k<="n"?k.charCodeAt(0)-97:k>="1"&&k<="9"?+k-1:-1):-1;
    if(i>=0&&i<q.o.length){const b=document.querySelectorAll(".optrow .opt")[i];if(b&&!b.disabled){e.preventDefault();b.click()}return}
    if(k==="enter"){const b=$("#footin .btn.primary");if(b&&!b.disabled&&document.activeElement.tagName!=="BUTTON"){e.preventDefault();b.click()}}
  }else if(view==="review"){
    const gb=document.querySelectorAll("#footin .grades .btn");
    if(!shown&&(k===" "||k==="enter")){e.preventDefault();const b=$("#footin .btn.primary");if(b)b.click()}
    else if(shown&&k.length===1&&"1234".includes(k)){if(gb[+k-1])gb[+k-1].click()}
    else if(shown&&(k===" "||k==="enter")){e.preventDefault();if(gb[2])gb[2].click()}
  }
});
$("#zoomclose").addEventListener("click",unzoom);$("#zoom").addEventListener("click",e=>{if(e.target.id==="zoom")unzoom()});

/* ---------- boot ---------- */
function unitsNeededAtStart(){const need=new Set();
  try{const o=JSON.parse(localStorage.getItem(LKEY)||"null");if(o){Object.keys(o.q||{}).concat(Object.keys(o.cards||{}),Object.keys(o.notes||{}),(o.session&&o.session.ids)||[]).forEach(id=>{const m=idUnit(id);if(m)need.add(m.unit)})}}catch(e){}
  if(!need.size)INDEX.slice(0,INDEX.length<=3?3:1).forEach(m=>need.add(m.unit));
  return [...need]}
function start(){
loadLocal();
builder.topics=new Set(TOPICS);
(function(){const x=(location.hash||"").slice(1);if(VIEWS.includes(x))view=x;if((view==="session"&&!S.session)||view==="review")view=view==="review"?"flashcards":"home"})();
window.addEventListener("hashchange",()=>{const x=(location.hash||"").slice(1);if(VIEWS.includes(x)&&x!==view){view=x;pick=[];render()}});
render();initSync();
}
loadUnits(unitsNeededAtStart()).then(start,()=>{start();alertBar("Some content could not be loaded. Check your connection, then reopen the app.")});
try{if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)&&window.top===window.self)navigator.serviceWorker.register("sw.js").catch(()=>{})}catch(e){}
