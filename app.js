const {useState,useEffect,useRef,useMemo}=React; const html=htm.bind(React.createElement);

/* ============ DATA MODEL: {id, ward:'1'..'48'|'mixed', name, relType, relName, house, street, phone, village, age?, sample?} ============ */
const WARDS=Array.from({length:48},(_,i)=>String(i+1));
const LBL=w=>w==='mixed'?'Mixed Data':'Ward '+w;
const RELS={F:'Father',H:'Husband',M:'Mother',W:'Wife',O:'Other'};
/* Records: [ward, name, relType, relName, house, street, phone, village, age, reviewNote]. Ward 'mixed' = Mixed Data. Edit this list to update data. */
const sb=supabase.createClient(SUPA_URL,SUPA_KEY);
const fromRow=r=>({id:r.id,ward:r.ward,name:r.name,relType:r.rel_type||'',relName:r.rel_name||'',house:r.house||'',street:r.street||'',phone:r.phone||'',village:r.village||'',age:r.age||'',review:r.review||''});
const toRow=m=>({ward:m.ward,name:m.name,rel_type:m.relType||'',rel_name:m.relName||'',house:m.house||'',street:m.street||'',phone:m.phone||'',village:m.village||'',age:m.age||'',review:m.review||''});
const idb=(()=>{const open=()=>new Promise((res,rej)=>{const r=indexedDB.open('mlc',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 return{get:async k=>{try{const d=await open();return await new Promise(res=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)})}catch(e){return null}},
  set:async(k,v)=>{try{const d=await open();await new Promise(res=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=res;t.onerror=res})}catch(e){}}}})();
async function fetchAll(){const c=await sb.from('members').select('id',{count:'exact',head:true});if(c.error)throw c.error;const n=c.count||0;
  const pages=await Promise.all(Array.from({length:Math.ceil(n/1000)},(_,i)=>sb.from('members').select('*').order('id').range(i*1000,i*1000+999)));
  return pages.flatMap(p=>{if(p.error)throw p.error;return p.data}).map(fromRow)}
const applyChange=(l,p)=>{if(p.eventType==='DELETE')return l.filter(x=>x.id!==p.old.id);const m=fromRow(p.new);return l.some(x=>x.id===m.id)?l.map(x=>x.id===m.id?m:x):[m,...l]};
const SAMPLE0={name:'Ravi Kumar',relType:'F',relName:'Ramesh',house:'4-2-18',street:'VT Colony',phone:'',village:'Nalgonda',ward:'12'};

/* ============ MESSAGE TEMPLATE: python-style {name} placeholders ============ */
const KEYS=['name','relation','relation_type','relation_name','address','street','phone','ward','village'];
const relText=m=>[RELS[m.relType]||m.relType,m.relName].filter(Boolean).join(': ');
const valuesOf=m=>({name:m.name,relation:relText(m),relation_type:RELS[m.relType]||m.relType||'',relation_name:m.relName,address:m.house,street:m.street,phone:m.phone,ward:LBL(m.ward),village:m.village});
const fill=(t,m)=>{const v=valuesOf(m);return t.replace(/\{(\w+)\}/g,(s,k)=>{const x=v[k.toLowerCase()];return x===undefined?s:(x||'')}).replace(/ {2,}/g,' ')};
const unknown=t=>[...new Set([...t.matchAll(/\{(\w+)\}/g)].map(x=>x[1].toLowerCase()).filter(k=>!KEYS.includes(k)))];

/* ============ HELPERS ============ */
const digits=p=>(p||'').replace(/\D/g,'');
const ten=p=>{let d=digits(p);if(d.length===12&&d.startsWith('91'))d=d.slice(2);else if(d.length===11&&d[0]==='0')d=d.slice(1);return d};
const validPhone=p=>/^[6-9]\d{9}$/.test(ten(p));
const waNum=p=>'91'+ten(p);
const CO=new Intl.Collator('en',{sensitivity:'base',numeric:true});
const cmp=(a,b)=>{const x=(a.street||'').trim(),y=(b.street||'').trim();if(!x!==!y)return x?-1:1;return CO.compare(x,y)||CO.compare((a.name||'').trim(),(b.name||'').trim())};
const hay=m=>m._h||(m._h=[m.name,m.relType,RELS[m.relType],m.relName,m.house,m.street,m.phone,m.village,m.review?'review '+m.review:'',LBL(m.ward)].join(' ').toLowerCase());
const isDup=(list,m)=>list.some(x=>x.id!==m.id&&x.ward===m.ward&&x.name.trim().toLowerCase()===m.name.trim().toLowerCase()&&((m.phone&&x.phone===m.phone)||(m.house&&(x.house||'').toLowerCase()===m.house.toLowerCase())||(!m.phone&&!m.house)));
function usePersist(k,init){const[s,set]=useState(()=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):init}catch(e){return init}});useEffect(()=>{try{localStorage.setItem(k,JSON.stringify(s))}catch(e){}},[s]);return[s,set]}
function parseCSV(t){const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}else if(ch=='"')q=true;else if(ch==','){r.push(c);c=''}else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;r.push(c);rows.push(r);r=[];c=''}else c+=ch}if(c||r.length){r.push(c);rows.push(r)}return rows.filter(x=>x.some(y=>y.trim()))}
const HM={ward:'ward',name:'name',reltype:'relType',relationtype:'relType',relname:'relName',relationname:'relName',houseno:'house',house:'house',housenumber:'house',address:'house',street:'street',streetarea:'street',area:'street',phone:'phone',mobile:'phone',phonenumber:'phone',village:'village',villagetown:'village',town:'village',age:'age'};
const csvOut=l=>['ward,name,relType,relName,house,street,phone,village,age'].concat(l.map(m=>[m.ward,m.name,m.relType,m.relName,m.house,m.street,m.phone,m.village,m.age||''].map(x=>'"'+String(x||'').replace(/"/g,'""')+'"').join(','))).join('\n');

/* ============ COMPONENTS ============ */
const Head=({title,onBack,onMenu,right,more,menuEl})=>html`<header>${onBack?html`<button onClick=${onBack} aria-label="Back">←</button>`:html`<button onClick=${onMenu} aria-label="Settings">☰</button>`}<span style=${{flex:1}}>${title}</span>${right}${more&&html`<button onClick=${more} aria-label="More">⋮</button>`}${menuEl}</header>`;
const SearchBar=({value,onChange,ph,inputRef,onMic})=>html`<div className="sb"><span className="sbi">🔍</span><input ref=${inputRef} type="search" value=${value} onChange=${e=>onChange(e.target.value)} placeholder=${ph} aria-label=${ph}/>${onMic&&html`<button className="mic" onClick=${onMic} aria-label="Voice search">🎤</button>`}</div>`;
const WardBadge=({w})=>html`<span className=${'badge'+(w==='mixed'?' mx':'')}>${LBL(w)}</span>`;
const WardTile=({w,onClick})=>html`<button className=${'tile'+(w==='mixed'?' mix':'')} onClick=${onClick}>${w==='mixed'?html`<b>Mixed<br/>Data</b>`:html`<b>${w}</b><small>Ward</small>`}</button>`;
function Field({label,req,err,children}){return html`<label className="f"><span>${label}${req?' *':''}</span>${children}${err&&html`<em>${err}</em>`}</label>`}
const rows=m=>[['Relation',relText(m)],['Address',m.house],['Street/Area',m.street],['Village/Town',m.village],['Age',m.age],['Phone',m.phone],['To check',m.review]].filter(r=>r[1]);
function Acts({m,msgText,onWa,onSms,big}){const has=validPhone(m.phone);const body=encodeURIComponent(fill(msgText,m));
  return html`<div className=${'acts'+(big?' big':'')}><a className=${'btn fill'+(has?'':' off')} href=${has?`https://wa.me/${waNum(m.phone)}?text=${body}`:undefined} target="_blank" rel="noopener" onClick=${e=>onWa(e,m)}>💬 WhatsApp</a>
   <a className=${'btn'+(has?'':' off')} href=${has?`sms:${ten(m.phone)}?body=${body}`:undefined} onClick=${e=>onSms(e,m)}>✉ SMS</a>
   <a className=${'btn'+(has?'':' off')} href=${has?`tel:${ten(m.phone)}`:undefined}>📞 Call</a></div>`}
const MemberCard=({m,showWard,onOpen,...p})=>html`<div className="mem"><h4 onClick=${()=>onOpen(m)}><span>${m.name}</span><span className="row" style=${{flex:'none'}}>${m.review&&html`<span className="badge sm">REVIEW</span>`}${showWard&&html`<${WardBadge} w=${m.ward}/>`}</span></h4>
  <div className="kv" onClick=${()=>onOpen(m)}>${rows(m).map(([k,v])=>html`<${React.Fragment} key=${k}><span>${k}</span><span>: ${v}</span><//>`)}</div><${Acts} m=${m} ...${p}/></div>`;
function Detail({m,...p}){const ic={Relation:'👪',Address:'🏠','Street/Area':'📍','Village/Town':'🏘',Age:'🎂',Phone:'📞','To check':'⚠️'};
  return html`<div className="pad"><div className="dcard"><div className="avatar">👤</div><h2>${m.name}</h2><${WardBadge} w=${m.ward}/>
   <div className="drows">${rows(m).map(([k,v])=>html`<div key=${k} className="drow"><span>${ic[k]}</span><span className="dk">${k}</span><span>: ${v}</span></div>`)}</div></div><${Acts} big m=${m} ...${p}/></div>`}
const Sky=()=>html`<svg className="sky" viewBox="0 0 400 90" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g fill="#f7b6d2"><rect x="0" y="60" width="40" height="30"/><rect x="45" y="45" width="30" height="45"/><rect x="80" y="55" width="35" height="35"/><path d="M130 90V50a30 30 0 0 1 60 0v40z"/><rect x="140" y="20" width="6" height="30"/><rect x="174" y="20" width="6" height="30"/><rect x="200" y="50" width="35" height="40"/><rect x="240" y="35" width="28" height="55"/><rect x="272" y="58" width="40" height="32"/><path d="M320 90V60a22 22 0 0 1 44 0v30z"/><rect x="368" y="50" width="32" height="40"/></g></svg>`;

function Login(){
  const[em,setEm]=useState('');const[pw,setPw]=useState('');const[err,setErr]=useState('');const[busy,setBusy]=useState(false);
  async function go(){if(!em.trim()||!pw){setErr('Enter the email and password.');return}setBusy(true);setErr('');
    const{error}=await sb.auth.signInWithPassword({email:em.trim(),password:pw});setBusy(false);if(error)setErr(navigator.onLine?'Wrong email or password.':'No internet connection.')}
  return html`<div className="login"><div className="lcard"><div className="lbadge">MLC</div><h2>Ward-wise List</h2><p className="mut">Sign in with the team email and password.</p>
   <label className="f"><span>Email</span><input type="email" autoComplete="username" value=${em} onChange=${e=>setEm(e.target.value)}/></label>
   <label className="f"><span>Password</span><input type="password" autoComplete="current-password" value=${pw} onChange=${e=>setPw(e.target.value)} onKeyDown=${e=>{if(e.key==='Enter')go()}}/></label>
   ${err&&html`<p className="err" role="alert">${err}</p>`}<button className="btn fill" style=${{width:'100%'}} disabled=${busy} onClick=${go}>${busy?'Signing in...':'Sign in'}</button></div></div>`;
}

function MemberForm({init,members,onSave,onCancel}){
  const[f,setF]=useState(init||{ward:'',name:'',relType:'F',relName:'',house:'',street:'',phone:'',village:'Nalgonda'});
  const[e,setE]=useState({}); const set=k=>ev=>setF({...f,[k]:ev.target.value});
  function submit(){const er={};
    if(!f.ward)er.ward='Choose a ward or Mixed Data.'; if(!f.name.trim())er.name='Enter the member name.';
    if(f.phone&&!validPhone(f.phone))er.phone='Enter a valid 10-digit mobile number starting with 6 to 9.';
    const m={...f,id:f.id||'m'+Date.now(),name:f.name.trim(),sample:false};
    if(!Object.keys(er).length&&isDup(members,m))er.name='This member already exists in '+LBL(m.ward)+'.';
    setE(er); if(!Object.keys(er).length)onSave(m)}
  return html`<div className="pad"><${Field} label="Ward Number" req err=${e.ward}><select value=${f.ward} onChange=${set('ward')}><option value="">Select ward (1 - 48)</option>${WARDS.map(w=>html`<option key=${w} value=${w}>Ward ${w}</option>`)}<option value="mixed">Mixed Data</option></select><//>
   <${Field} label="Member Name" req err=${e.name}><input value=${f.name} onChange=${set('name')} placeholder="Enter member name"/><//>
   <div className="row"><${Field} label="Relation Type"><select value=${f.relType} onChange=${set('relType')}>${Object.entries(RELS).map(([k,v])=>html`<option key=${k} value=${k}>${k} - ${v}</option>`)}</select><//>
   <${Field} label="Relation Name"><input value=${f.relName} onChange=${set('relName')} placeholder="Enter relation name"/><//></div>
   <${Field} label="House Number / Address"><input value=${f.house} onChange=${set('house')} placeholder="e.g. 4-2-18"/><//>
   <${Field} label="Street / Area"><input value=${f.street} onChange=${set('street')} placeholder="Enter street or area"/><//>
   <${Field} label="Phone Number" err=${e.phone}><input type="tel" inputMode="numeric" value=${f.phone} onChange=${set('phone')} placeholder="Enter phone number"/><//>
   <${Field} label="Village/Town Name"><input value=${f.village} onChange=${set('village')} placeholder="Enter village or town"/><//>
   <div className="row"><button className="btn" onClick=${onCancel}>Cancel</button><button className="btn fill" onClick=${submit}>Save Member</button></div></div>`;
}

function Settings({members,addMany,onLogout}){
  const[csv,setCsv]=useState('');const[out,setOut]=useState('');const[info,setInfo]=useState('');const[busy,setBusy]=useState(false);
  const cnt=w=>members.filter(m=>m.ward===w).length;
  async function doImport(text){const rows=parseCSV(text);if(rows.length<2){setInfo('No rows found. The first row must be the column names.');return}
    const hd=rows[0].map(h=>HM[h.toLowerCase().replace(/[^a-z]/g,'')]||null);let add=[],dup=0,bad=0,list=members.slice();
    rows.slice(1).forEach((r,i)=>{const m={id:'i'+Date.now()+'-'+i,sample:false,relType:'F',relName:'',house:'',street:'',phone:'',village:'',ward:''};hd.forEach((k,j)=>{if(k)m[k]=(r[j]||'').trim()});
      m.ward=/mixed/i.test(m.ward)?'mixed':String(parseInt(m.ward,10)||'');m.phone=digits(m.phone).slice(-10);
      if(!m.name||!(m.ward==='mixed'||WARDS.includes(m.ward))){bad++;return}
      if(isDup(list,m)){dup++;return}add.push(m);list.push(m)});
    setBusy(true);try{await addMany(add);setInfo(`Imported ${add.length}. Skipped ${dup} duplicates and ${bad} rows with a missing name or invalid ward.`)}catch(e){setInfo('Import failed: '+(navigator.onLine?e.message:'no internet connection.'))}setBusy(false)}
  return html`<div className="pad"><div className="card"><h3>Add or import member records</h3><p className="mut">Use the + button for one member. To add many, upload a CSV or paste it below. Column names: ward, name, relType, relName, house, street, phone, village. The Excel headers (Ward, House No, Street, Name, Rel Type, Relation Name, Mobile) also work. Use "mixed" as the ward for Mixed Data. Imported records appear on every team member’s phone.</p>
   <input type="file" accept=".csv,text/csv" disabled=${busy} onChange=${e=>{const f=e.target.files[0];if(f)f.text().then(doImport)}}/>
   <textarea style=${{marginTop:8}} value=${csv} onChange=${e=>setCsv(e.target.value)} placeholder="Paste CSV text here"/>
   <div className="row" style=${{marginTop:8}}><button className="btn fill" disabled=${busy} onClick=${()=>doImport(csv)}>${busy?'Importing...':'Import pasted CSV'}</button><button className="btn" onClick=${()=>setOut(csvOut(members))}>Show CSV of all records</button></div>
   ${info&&html`<p className="mut">${info}</p>`}${out&&html`<textarea readOnly value=${out} style=${{marginTop:8}}/>`}</div>
   <div className="card"><h3>Live data</h3><p className="mut">Records are stored online and shared with the whole team. Any addition, edit or deletion shows up on every phone within seconds. Saved data stays available to view without internet, but changes need a connection. Rows marked REVIEW have an uncertain Nalgonda spelling or a missing phone number.</p>
    <div className="row"><button className="btn" onClick=${onLogout}>Log out</button></div></div>
   <div className="card"><h3>Records per ward (${members.length} total)</h3><table><tbody>${WARDS.concat('mixed').map(w=>html`<tr key=${w}><td>${LBL(w)}</td><td>${cnt(w)}</td></tr>`)}</tbody></table></div></div>`;
}

/* ============ APP ============ */
function App(){
  const[boot,setBoot]=useState(true);const[scr,setScr]=useState('home');const[ward,setWard]=useState('');
  const[q,setQ]=useState('');const[wq,setWq]=useState('');const[edit,setEdit]=useState(null);const[toast,setToast]=useState(null);
  const[noImg,setNoImg]=useState(false);const[sel,setSel]=useState(null);const[bk,setBk]=useState('home');const[menu,setMenu]=useState(false);
  const[session,setSession]=useState(undefined);const[cached,setCached]=useState(null);const[raw,setRaw]=useState([]);const[sync,setSync]=useState('');const[lim,setLim]=useState(150);
  const members=useMemo(()=>raw.slice().sort(cmp),[raw]);
  const[msg,setMsgL]=usePersist('mlc_msg_v1',{text:'',saved:false});
  const setMsg=v=>{setMsgL(v);sb.from('app_settings').upsert({key:'common_message',value:v}).then(({error})=>{if(error)setToast({text:'Message saved on this phone only. Check your internet connection.'})})};
  async function addMany(list){for(let i=0;i<list.length;i+=500){const{data,error}=await sb.from('members').insert(list.slice(i,i+500).map(toRow)).select();if(error)throw error;setRaw(l=>l.concat(data.map(fromRow)))}}
  async function remove(id){const{error}=await sb.from('members').delete().eq('id',id);if(error){setToast({text:'Could not delete: '+(navigator.onLine?error.message:'no internet connection.')});return false}setRaw(l=>l.filter(x=>x.id!==id));return true}
  async function logout(){await sb.auth.signOut();await idb.set('members',[]);setRaw([]);setCached(false);go('home')}
  const uid=session&&session.user.id;
  const[draft,setDraft]=useState(msg.text);const[editing,setEditing]=useState(!msg.saved);
  const[photo,setPhoto]=useState(()=>{try{return localStorage.getItem('mlc_photo_v1')||''}catch(e){return ''}});
  const ta=useRef(),sr=useRef(),wsr=useRef();
  useEffect(()=>{const t=setTimeout(()=>setBoot(false),2200);return()=>clearTimeout(t)},[]);
  useEffect(()=>{try{photo?localStorage.setItem('mlc_photo_v1',photo):localStorage.removeItem('mlc_photo_v1')}catch(e){}},[photo]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(null),9000);return()=>clearTimeout(t)}},[toast]);
  useEffect(()=>{idb.get('members').then(c=>{if(c&&c.length)setRaw(c);setCached(!!(c&&c.length))});sb.auth.getSession().then(({data})=>setSession(data.session||null)).catch(()=>setSession(null));
    const{data:l}=sb.auth.onAuthStateChange((_e,x)=>setSession(x));return()=>l.subscription.unsubscribe()},[]);
  useEffect(()=>{if(!uid)return;let ok=true;setSync('Updating...');
    fetchAll().then(l=>{if(!ok)return;setRaw(l);idb.set('members',l);setSync('')}).catch(()=>{if(ok)setSync('Offline. Showing saved data.')});
    sb.from('app_settings').select('value').eq('key','common_message').maybeSingle().then(({data})=>{if(ok&&data&&data.value){setMsgL(data.value);setDraft(data.value.text||'');setEditing(!data.value.saved)}});
    const ch=sb.channel('mlc-live').on('postgres_changes',{event:'*',schema:'public',table:'members'},p=>setRaw(l=>applyChange(l,p))).subscribe();
    return()=>{ok=false;sb.removeChannel(ch)}},[uid]);
  useEffect(()=>{if(!raw.length)return;const t=setTimeout(()=>idb.set('members',raw),3000);return()=>clearTimeout(t)},[raw]);
  const go=(s,w)=>{setScr(s);setMenu(false);if(w!==undefined)setWard(w);setWq('');setLim(150);window.scrollTo(0,0)};
  const open=m=>{setBk(scr);setSel(m.id);setScr('detail');setMenu(false);window.scrollTo(0,0)};
  const cur=members.find(m=>m.id===sel);
  const saved=msg.saved?msg.text:'';
  function insert(k){const el=ta.current;const tag='{'+k+'}';if(!el){setDraft(draft+tag);return}const a=el.selectionStart,b=el.selectionEnd;setDraft(draft.slice(0,a)+tag+draft.slice(b));setTimeout(()=>{el.focus();el.selectionStart=el.selectionEnd=a+tag.length},0)}
  const notify=(m,note)=>setToast({text:fill(saved,m)||'(No common message saved. The chat will open without text.)',to:m.name,note});
  async function onWa(e,m){
    if(!photo){notify(m,'Opening WhatsApp. Review the message, then send it yourself.');return}
    e.preventDefault();const text=fill(saved,m);const url=`https://wa.me/${waNum(m.phone)}?text=${encodeURIComponent(text)}`;
    try{const b=await(await fetch(photo)).blob();const f=new File([b],'photo.'+(b.type.split('/')[1]||'jpg'),{type:b.type});
      if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text});notify(m,'Choose WhatsApp in the share sheet and pick the contact. Nothing is sent automatically.');return}}catch(x){}
    window.open(url,'_blank','noopener');notify(m,'The photo could not be attached from here. WhatsApp opened with the text only. Attach the photo yourself in the chat.')}
  const onSms=(e,m)=>notify(m,'Opening your SMS app with the text filled in.');
  function pick(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>setPhoto(r.result);r.readAsDataURL(f);e.target.value=''}
  function mic(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){setToast({text:'Voice search is not supported on this device.'});return}const r=new R();r.lang='en-IN';r.onresult=e=>setQ(e.results[0][0].transcript);r.start()}
  async function save(m){const ex=members.some(x=>x.id===m.id);
    const{data,error}=await(ex?sb.from('members').update({...toRow(m),updated_at:new Date().toISOString()}).eq('id',m.id):sb.from('members').insert(toRow(m))).select().single();
    if(error){setToast({text:'Could not save: '+(navigator.onLine?error.message:'no internet connection.')});return}
    const nm=fromRow(data);setRaw(l=>ex?l.map(x=>x.id===nm.id?nm:x):[nm,...l.filter(x=>x.id!==nm.id)]);setEdit(null);setToast({text:(ex?'Updated ':'Added ')+nm.name+' in '+LBL(nm.ward)+'.'});go('ward',nm.ward)}
  const common={msgText:saved,onWa,onSms,onOpen:open};
  const card=(m,sw)=>html`<${MemberCard} key=${m.id} m=${m} showWard=${sw} ...${common}/>`;

  if(boot||session===undefined||cached===null)return noImg?html`<div className="splash"><img className="sp-photo" src="icons/splash.png" alt="" onError=${e=>{e.target.style.display='none'}}/><h1>MLC<br/>WARD-WISE LIST</h1><div className="dv"><i></i><b></b><i></i></div><p>Shri Kancharla Bhupal Reddy</p><small>Nalgonda</small><div className="spin" role="status" aria-label="Loading"></div><${Sky}/></div>`:html`<div className="splash-full"><img src="icons/splash.png" alt="MLC Ward-wise List" onError=${()=>setNoImg(true)}/></div>`;
  if(!session&&!(cached&&!navigator.onLine))return html`<${Login}/>`;
  const hits=q.trim()?members.filter(m=>hay(m).includes(q.trim().toLowerCase())):[];
  const list=scr==='ward'?members.filter(m=>m.ward===ward&&(!wq.trim()||hay(m).includes(wq.trim().toLowerCase()))):members.filter(m=>!wq.trim()||hay(m).includes(wq.trim().toLowerCase()));
  const sample0=SAMPLE0,pv=fill(draft,sample0),unk=unknown(draft);
  let body;
  if(scr==='home')body=html`<div className="pad">
    <div className="card"><div className="ch"><span className="ci">💬</span><div><h3>Common Message</h3><p className="mut">Type a message to share with members. Use {name} for each member’s name.</p></div></div>
     ${editing?html`<textarea ref=${ta} value=${draft} onChange=${e=>setDraft(e.target.value)} placeholder="Type your message here..."/>
      <div className="chips">${KEYS.map(k=>html`<button key=${k} className="chip" onClick=${()=>insert(k)}>{${k}}</button>`)}</div>
      <div className="row"><button className="btn fill" onClick=${()=>{setMsg({text:draft,saved:true});setEditing(false)}}>Save</button><button className="btn" onClick=${()=>setDraft('')}>Clear</button></div>`
     :html`<div className="prev">${msg.text||'No message saved.'}</div><div className="row" style=${{marginTop:8}}><button className="btn" onClick=${()=>{setDraft(msg.text);setEditing(true)}}>Edit</button><button className="btn" onClick=${()=>{setMsg({text:'',saved:false});setDraft('');setEditing(true)}}>Clear</button></div>`}
     <p className="mut" style=${{marginTop:10,marginBottom:2}}>Preview for ${sample0.name}:</p><div className="prev">${(editing?pv:fill(msg.text,sample0))||'Nothing to preview yet.'}</div>
     ${editing&&unk.length>0&&html`<p className="mut" style=${{color:'#d11'}}>Unknown placeholder${unk.length>1?'s':''}: ${unk.map(u=>'{'+u+'}').join(', ')}. They will be sent as typed.</p>`}</div>
    <div className="card"><div className="ch"><span className="ci">🖼</span><div><h3>WhatsApp Photo</h3><p className="mut">Optional attachment for WhatsApp</p></div></div>
     <div className="row">${photo&&html`<img className="thumb" src=${photo} alt="Selected photo"/>`}
     <label className="btn" style=${{cursor:'pointer'}}>🖼 ${photo?'Replace Photo':'Choose Photo'}<input type="file" accept="image/*" onChange=${pick} hidden/></label>${photo&&html`<button className="btn" onClick=${()=>setPhoto('')}>Remove</button>`}</div></div>
    <${SearchBar} inputRef=${sr} value=${q} onChange=${setQ} ph="Search members across all wards..." onMic=${mic}/>
    ${q.trim()?(hits.length?html`<div>${hits.length>100&&html`<p className="mut">Showing the first 100 of ${hits.length} matches. Type more to narrow down.</p>`}${hits.slice(0,100).map(m=>html`<button key=${m.id} className="res" onClick=${()=>{setQ('');open(m)}}><span className="av">👤</span><span style=${{flex:1}}><b>${m.name}</b><br/><span className="mut">${[relText(m),m.street,m.phone].filter(Boolean).join(' | ')}</span></span><${WardBadge} w=${m.ward}/><span className="chev">›</span></button>`)}</div>`:html`<div className="empty">No members found.</div>`)
     :html`<div className="grid">${WARDS.map(w=>html`<${WardTile} key=${w} w=${w} onClick=${()=>go('ward',w)}/>`)}<${WardTile} w="mixed" onClick=${()=>go('ward','mixed')}/></div>`}</div>`;
  else if(scr==='ward'||scr==='all')body=html`<div className="pad"><${SearchBar} inputRef=${wsr} value=${wq} onChange=${setWq} ph=${scr==='ward'?'Search in '+LBL(ward)+'...':'Search all members...'}/><p className="mut">Total Members: ${list.length}</p>
    ${list.length?list.slice(0,lim).map(m=>card(m,scr==='all')):html`<div className="empty">${scr==='ward'&&!members.some(m=>m.ward===ward)?LBL(ward)+' has no records yet. Tap + to add the first member.':'No members found.'}</div>`}${list.length>lim&&html`<button className="btn" style=${{width:'100%'}} onClick=${()=>setLim(lim+150)}>Show more (${list.length-lim} left)</button>`}</div>`;
  else if(scr==='detail'&&cur)body=html`<${Detail} m=${cur} msgText=${saved} onWa=${onWa} onSms=${onSms}/>`;
  else if(scr==='form')body=html`<${MemberForm} init=${edit||{ward:ward?ward:'',name:'',relType:'F',relName:'',house:'',street:'',phone:'',village:'Nalgonda'}} members=${members} onSave=${save} onCancel=${()=>{setEdit(null);go(ward?'ward':'home')}}/>`;
  else body=html`<${Settings} members=${members} addMany=${addMany} onLogout=${logout}/>`;
  const title=scr==='home'?'MLC Ward-wise List':scr==='ward'?LBL(ward):scr==='all'?'All Members':scr==='detail'?'Member Details':scr==='form'?(edit?'Edit Member':'Add Member'):'Settings';
  const items=scr==='home'?[['Settings',()=>go('settings')],['All Members',()=>go('all')]]:scr==='ward'?[['Add member here',()=>{setEdit(null);setScr('form')}]]:scr==='detail'&&cur?[['Edit',()=>{setEdit(cur);setScr('form')}],['Delete',()=>{if(confirm('Delete '+cur.name+'?')){remove(cur.id).then(ok=>{if(ok)setScr(bk)})}}]]:[];
  const menuEl=menu&&items.length>0&&html`<div className="menu">${items.map(([l,f])=>html`<button key=${l} onClick=${()=>{setMenu(false);f()}}>${l}</button>`)}</div>`;
  const back=scr==='home'?null:()=>{scr==='detail'?setScr(bk):go(scr==='form'&&ward?'ward':'home')};
  return html`<div className="app"><${Head} title=${title} onBack=${back} onMenu=${()=>go('settings')} menuEl=${menuEl} more=${items.length?()=>setMenu(!menu):null} right=${scr==='ward'?html`<button onClick=${()=>wsr.current&&wsr.current.focus()} aria-label="Search">🔍</button>`:null}/>${sync&&html`<div className="sync">${sync}</div>`}${body}
   ${toast&&html`<div className="toast" onClick=${()=>setToast(null)} role="status">${toast.to&&html`<b>Message for ${toast.to}:</b><br/>`}${toast.text}${toast.note&&html`<small>${toast.note}</small>`}</div>`}
   <nav><button className=${scr==='home'?'on':''} onClick=${()=>go('home')}><span className="ic">🏠</span>Home</button>
    <button onClick=${()=>{go('home');setTimeout(()=>sr.current&&sr.current.focus(),50)}}><span className="ic">🔍</span>Search</button>
    <button className="plus" aria-label="Add new member" onClick=${()=>{setEdit(null);setScr('form')}}>+</button>
    <button className=${scr==='all'?'on':''} onClick=${()=>go('all')}><span className="ic">👥</span>Members</button>
    <button className=${scr==='settings'?'on':''} onClick=${()=>go('settings')}><span className="ic">⚙️</span>Settings</button></nav></div>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);
