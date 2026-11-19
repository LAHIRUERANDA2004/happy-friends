/* Use the same Firebase config as app.js. */
const firebaseConfig={apiKey:"AIzaSyA0n4NrCBhD-kQ_4ZifeAWVm045Rm8Jdrc",authDomain:"happy-friends-8f840.firebaseapp.com",projectId:"happy-friends-8f840",appId:"1:549080403446:web:fb2a894fddbc135cb24bd7"};
const ADMIN_EMAILS=["gizmogamingboy@gmail.com"],ADMIN_PASSWORD="12341234";
firebase.initializeApp(firebaseConfig);const auth=firebase.auth(),db=firebase.firestore(),$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let users={},emails={},passwordPassed=false,started=false;
const IMG_OK=/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;const safeImg=u=>{u=String(u||'');return IMG_OK.test(u)||/^https:\/\/[^\s"'<>]+$/.test(u)?u:''};
$('passLogin').onclick=()=>{if($('adminPass').value!==ADMIN_PASSWORD){$('loginMsg').textContent='Incorrect password.';return}passwordPassed=true;$('googleStep').hidden=false;$('loginMsg').textContent='Password accepted. Complete Google verification.'};
$('go').onclick=()=>{if(!passwordPassed)return alert('Enter the admin password first.');auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>alert(e.message))};
$('out').onclick=()=>auth.signOut();
auth.onAuthStateChanged(u=>{if(!u){$('login').hidden=false;$('panel').hidden=true;started=false;return}if(!passwordPassed||!ADMIN_EMAILS.includes((u.email||'').toLowerCase())){alert('Admin password and authorized Google account are both required.');auth.signOut();return}$('login').hidden=true;$('panel').hidden=false;$('who').textContent=u.email;if(!started){started=true;init()}});
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));b.classList.add('on');['users','chats','media','sites','social','controls','payments','archive'].forEach(id=>$(id).hidden=id!==b.dataset.t)});
function vipActive(u){return (u.vipUntil||0)>Date.now()}function status(u){const t=u.lastSeen?.toMillis?.()||0;if(Date.now()-t>90000)return'⚫ offline';return u.away?'🟠 away':'🟢 online'}
function render(){const q=$('q').value.toLowerCase();$('ub').innerHTML=Object.entries(users).filter(([id,u])=>((u.name||'')+' '+(u.email||emails[id]||'')).toLowerCase().includes(q)).map(([id,u])=>`<tr><td>${esc(u.name)} ${vipActive(u)?'<span class="vip">VIP</span>':''}</td><td>${esc(u.age??'—')}</td><td>${esc(u.gender||'—')}</td><td>${esc(u.accountType||'registered')}</td><td>${esc(u.email||emails[id]||'Guest')}</td><td>${u.coins||0}</td><td>${vipActive(u)?new Date(u.vipUntil).toLocaleString():'—'}</td><td>${status(u)}</td><td><button data-vip="${id}">${vipActive(u)?'Remove VIP':'Give VIP'}</button> <button class="${u.suspended?'act':'sus'}" data-ban="${id}">${u.suspended?'Unsuspend':'Suspend'}</button></td></tr>`).join('');$('uc').textContent=Object.keys(users).length;
document.querySelectorAll('[data-vip]').forEach(b=>b.onclick=async()=>{const id=b.dataset.vip,u=users[id];await db.collection('users').doc(id).update({vipUntil:vipActive(u)?0:Date.now()+365*24*60*60*1000,vipBy:'admin'});});document.querySelectorAll('[data-ban]').forEach(b=>b.onclick=()=>db.collection('users').doc(b.dataset.ban).update({suspended:!users[b.dataset.ban].suspended}));}
$('q').oninput=render;
function renderSites(s){$('siteRows').innerHTML=s.docs.map(d=>`<tr><td>${esc(d.data().name)}</td><td><a href="${esc(d.data().url)}" target="_blank" rel="noopener">${esc(d.data().url)}</a></td><td><button data-del="${d.id}">Delete</button></td></tr>`).join('');document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>db.collection('freeSites').doc(b.dataset.del).delete())}
$('addSite').onclick=async()=>{const name=$('siteName').value.trim(),url=$('siteUrl').value.trim();try{const u=new URL(url);if(!name||!['http:','https:'].includes(u.protocol))throw Error('Enter a name and valid http/https URL.');await db.collection('freeSites').add({name,url:u.href,createdAt:firebase.firestore.FieldValue.serverTimestamp()});$('siteName').value=$('siteUrl').value=''}catch(e){alert(e.message)}};
function init(){initExtra();db.collection('users').onSnapshot(s=>{users={};s.forEach(d=>users[d.id]=d.data());render()});db.collection('userPrivate').onSnapshot(s=>{emails={};s.forEach(d=>emails[d.id]=d.data().email);render()},e=>console.warn('userPrivate:',e.code||e.message));initChats();
 db.collection('messages').where('img','!=','').orderBy('img').limit(150).onSnapshot(ms=>{window.hfChats=ms.docs.map(d=>({id:d.id,type:'Chat image',name:d.data().name||'Member',caption:d.data().text||'',img:d.data().img,ts:d.data().ts}));renderMedia()});
 db.collection('stories').orderBy('ts','desc').limit(150).onSnapshot(ss=>{window.hfStories=ss.docs.map(d=>({id:d.id,type:'Story',name:d.data().name||'Member',caption:d.data().text||'',img:d.data().img,ts:d.data().ts}));renderMedia()});db.collection('freeSites').orderBy('createdAt','desc').onSnapshot(renderSites);db.collection('siteSettings').doc('socialLinks').onSnapshot(renderSocial)}

function renderSocial(s){const links=s.exists&&Array.isArray(s.data().links)?s.data().links:[];$('socialRows').innerHTML=links.map((x,i)=>`<tr><td>${esc(x.icon||'↗')}</td><td>${esc(x.name)}</td><td><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url)}</a></td><td><button data-social-del="${i}">Delete</button></td></tr>`).join('')||'<tr><td colspan="4">No social links added yet.</td></tr>';document.querySelectorAll('[data-social-del]').forEach(b=>b.onclick=async()=>{const next=links.filter((_,i)=>i!==Number(b.dataset.socialDel));await db.collection('siteSettings').doc('socialLinks').set({links:next,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})})}
$('addSocial').onclick=async()=>{const name=$('socialName').value.trim(),icon=$('socialIcon').value.trim()||'↗',raw=$('socialUrl').value.trim();try{const u=new URL(raw);if(!name||!['https:'].includes(u.protocol))throw Error('Enter a platform name and a valid https:// URL.');const ref=db.collection('siteSettings').doc('socialLinks');await db.runTransaction(async tx=>{const snap=await tx.get(ref),links=snap.exists&&Array.isArray(snap.data().links)?snap.data().links:[];links.push({name,icon,url:u.href});tx.set(ref,{links,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})});$('socialName').value=$('socialIcon').value=$('socialUrl').value=''}catch(e){alert(e.message)}};
function renderMedia(){const all=[...(window.hfChats||[]),...(window.hfStories||[])].filter(x=>x.img);$('mediaGrid').innerHTML=all.length?all.map(x=>`<article class="media-card"><img loading="lazy" src="${esc(safeImg(x.img))}" alt="${esc(x.type)}"><div><b>${esc(x.type)}</b><p>${esc(x.name)}</p><small>${esc(x.caption)}</small><time>${x.ts?.toDate?x.ts.toDate().toLocaleString():''}</time></div></article>`).join(''):'<p class="note">No media found yet.</p>'}


/* ===== v4: payments + view-once archive ===== */
const PLAN_GRANT={vip_week:{days:7},vip_month:{days:30},vip_year:{days:365},coins_150:{coins:150},coins_500:{coins:500},coins_1500:{coins:1500}};
window.hfPay={};
function initExtra(){
  const ref=db.collection('siteSettings').doc('platform');
  ref.onSnapshot(s=>{const d=Object.assign({botsOff:false,showOfflineMembers:false},s.exists?s.data():{});
    $('botsOffToggle').checked=!!d.botsOff;$('offlineToggle').checked=!!d.showOfflineMembers;
    $('ctlState').textContent='Bots: '+(d.botsOff?'OFF (disabled)':'ON (active)')+'  ·  Offline non-VIP members: '+(d.showOfflineMembers?'visible':'hidden');
  },e=>console.warn('settings:',e.code||e.message));
  const save=(k,v)=>ref.set({[k]:v,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:(auth.currentUser||{}).email||''},{merge:true}).catch(e=>alert('Could not save: '+(e.code||e.message)));
  $('botsOffToggle').onchange=e=>save('botsOff',e.target.checked);
  $('offlineToggle').onchange=e=>save('showOfflineMembers',e.target.checked);
  db.collection('payments').orderBy('ts','desc').limit(300).onSnapshot(s=>{
    window.hfPay={};
    $('payRows').innerHTML=s.docs.map(d=>{const p=d.data();window.hfPay[d.id]=p;const t=p.ts&&p.ts.toDate?p.ts.toDate().toLocaleString():'';
      return `<tr><td>${esc(p.name)}</td><td>${esc(p.email)}</td><td style="font-size:11px">${esc(p.uid)}</td><td>${esc(p.label||p.plan)}</td><td>$${esc(p.amount)}</td><td><b style="color:${p.status==='paid'?'#16a34a':'#d97706'}">${esc(p.status)}</b></td><td>${esc(t)}</td><td>${p.status==='paid'?'✅ Granted':`<button data-pay="${d.id}">Approve &amp; Grant</button>`} <button class="sus" data-paydel="${d.id}">Delete</button></td></tr>`}).join('')||'<tr><td colspan="8">No orders yet</td></tr>';
    document.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>approvePay(b.dataset.pay));
    document.querySelectorAll('[data-paydel]').forEach(b=>b.onclick=()=>{if(confirm('Delete this order record?'))db.collection('payments').doc(b.dataset.paydel).delete()});
  },e=>console.warn('payments:',e.code||e.message));
  db.collection('admin_media_archive').orderBy('ts','desc').limit(200).onSnapshot(s=>{
    $('archGrid').innerHTML=s.docs.map(d=>{const a=d.data(),t=a.ts&&a.ts.toDate?a.ts.toDate().toLocaleString():'';
      return `<article class="media-card"><img loading="lazy" src="${esc(safeImg(a.imageData))}" alt="View-once photo"><div><b>From: ${esc(a.senderName)}</b><p>To: ${esc(a.recipientName)}</p><small>${esc(a.senderUid)} → ${esc(a.recipientUid)}<br>${esc(t)}</small><br><button class="sus" data-archdel="${d.id}">Delete</button></div></article>`}).join('')||'<p class="note">No view-once photos yet.</p>';
    document.querySelectorAll('[data-archdel]').forEach(b=>b.onclick=()=>{if(confirm('Delete this archive record permanently?'))db.collection('admin_media_archive').doc(b.dataset.archdel).delete()});
  },e=>console.warn('archive:',e.code||e.message));
}
async function approvePay(id){
  const p=window.hfPay[id];if(!p||p.status==='paid')return;
  const g=PLAN_GRANT[p.plan];if(!g)return alert('Unknown plan: '+p.plan);
  if(!confirm('Grant '+(p.label||p.plan)+' to '+p.name+' ('+p.email+')?\nOnly approve after you confirmed the order in Lemon Squeezy.'))return;
  const u=users[p.uid]||{},FV=firebase.firestore.FieldValue,b=db.batch();
  b.update(db.collection('payments').doc(id),{status:'paid',approvedAt:FV.serverTimestamp()});
  b.update(db.collection('users').doc(p.uid),g.days?{vipUntil:Math.max(Date.now(),u.vipUntil||0)+g.days*864e5,vipBy:'purchase'}:{coins:FV.increment(g.coins)});
  try{await b.commit()}catch(e){alert('Failed: '+(e.code||e.message))}
}
document.addEventListener('click',e=>{if(e.target.matches&&e.target.matches('.media-card img'))e.target.classList.toggle('zoom')});


/* ===== v5: separated chat history (Public rooms vs Private pairs) ===== */
const PUBLIC_DEFAULTS=[{id:'public',name:'Public chat'},{id:'lounge',name:'Friends Lounge'},{id:'music',name:'Music & Movies'},{id:'night',name:'Night Owls'}];
let chatMode='public',chatSel=null,chatRecent=[],customRoomsA=[],threadUnsub=null,seenName={};
const isPrivMsg=m=>!!(m.isPrivate||m.to);
const keyOf=m=>isPrivMsg(m)?(m.pairKey||m.room||''):(m.roomId||m.room||'');
const nameOf=(uid,fb)=>(users[uid]&&users[uid].name)||seenName[uid]||fb||'Member';
function pairLabelOf(key,fb){const ids=String(key).split('_');if(ids.length!==2)return fb||('Chat '+key);return nameOf(ids[0])+' & '+nameOf(ids[1])+"'s Chat"}
function roomNameOf(id,fb){const r=[...PUBLIC_DEFAULTS,...customRoomsA].find(x=>x.id===id);return r?r.name:(fb||id)}
function initChats(){
  db.collection('rooms').onSnapshot(s=>{customRoomsA=s.docs.map(d=>({id:d.id,name:d.data().name||'Room'}));renderChatList()},e=>console.warn('rooms:',e.code||e.message));
  db.collection('messages').orderBy('ts','desc').limit(1500).onSnapshot(s=>{
    chatRecent=s.docs.map(d=>d.data());seenName={};
    chatRecent.forEach(m=>{if(m.from&&m.name)seenName[m.from]=m.name;if(m.to&&m.toName)seenName[m.to]=seenName[m.to]||m.toName});
    renderChatList()},e=>console.warn('messages:',e.code||e.message));
  document.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-ct]').forEach(x=>x.classList.remove('on'));b.classList.add('on');chatMode=b.dataset.ct;chatSel=null;openThread(null);renderChatList()});
  $('chatQ').oninput=renderChatList;
}
function buildThreads(){
  const map=new Map();
  if(chatMode==='public')[...PUBLIC_DEFAULTS,...customRoomsA].forEach(r=>map.set(r.id,{key:r.id,label:'# '+r.name,count:0,last:0,preview:''}));
  chatRecent.forEach(m=>{
    if(isPrivMsg(m)!==(chatMode==='private'))return;
    const k=keyOf(m);if(!k)return;
    let t=map.get(k);
    if(!t){t={key:k,label:chatMode==='private'?pairLabelOf(k,m.pairLabel):'# '+roomNameOf(k,m.roomName),count:0,last:0,preview:''};map.set(k,t)}
    t.count++;const ms=m.ts&&m.ts.toMillis?m.ts.toMillis():(m.createdAt||0);
    if(ms>=t.last){t.last=ms;t.preview=(m.name||'')+': '+(m.text||(m.img?'📷 photo':''))}
  });
  if(chatMode==='private')map.forEach(t=>{t.label=pairLabelOf(t.key,t.label)});
  const q=$('chatQ').value.trim().toLowerCase();
  return [...map.values()].filter(t=>!q||t.label.toLowerCase().includes(q)).sort((a,b)=>b.last-a.last||a.label.localeCompare(b.label));
}
function renderChatList(){
  const list=buildThreads();
  $('chatList').innerHTML=list.length?list.map(t=>`<div class="thread ${t.key===chatSel?'on':''}" data-k="${esc(t.key)}"><b>${esc(t.label)}</b><small>${t.count} recent msg${t.count===1?'':'s'}${t.last?' · '+new Date(t.last).toLocaleString():''}</small><small>${esc((t.preview||'').slice(0,60))}</small>${chatMode==='private'?`<button class="mini-del" data-del-k="${esc(t.key)}" title="Delete chat history">🗑 Delete</button>`:''}</div>`).join(''):'<p class="note">No chats yet.</p>';
  $('chatList').querySelectorAll('[data-k]').forEach(el=>el.onclick=()=>{chatSel=el.dataset.k;openThread(chatSel);renderChatList()});
  $('chatList').querySelectorAll('[data-del-k]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteThread(b.dataset.delK)});
}
const msOf=m=>m.ts&&m.ts.toMillis?m.ts.toMillis():(m.createdAt||0);
function rowsHtml(msgs){return msgs.map(m=>`<tr><td>${msOf(m)?new Date(msOf(m)).toLocaleString():''}</td><td>${esc(m.name)}</td><td>${esc(m.text)}${m.img?`<img class="chat" src="${esc(safeImg(m.img))}">`:''}</td></tr>`).join('')||'<tr><td colspan="3" class="note">No messages in this chat yet.</td></tr>'}
function openThread(key){
  if(threadUnsub){threadUnsub();threadUnsub=null}
  $('chatWarn').hidden=true;$('delThread').hidden=!(key&&chatMode==='private');
  if(!key){$('chatTitle').textContent='Select a chat';$('chatSub').textContent='';$('cb').innerHTML='';return}
  const t=buildThreads().find(x=>x.key===key);
  $('chatTitle').textContent=t?t.label:key;
  $('chatSub').textContent=chatMode==='private'?'Private 1-on-1 thread (latest 500 messages)':'Public room (latest 500 messages)';
  const col=db.collection('messages');
  // 1) normal query: needs composite index room ASC + ts (see firestore.indexes.json)
  threadUnsub=col.where('room','==',key).orderBy('ts','desc').limit(500).onSnapshot(s=>{
    $('cb').innerHTML=rowsHtml(s.docs.map(d=>d.data()).reverse());
  },e=>{
    console.warn('thread query failed, using fallback:',e.code||e.message);
    if(threadUnsub){threadUnsub();threadUnsub=null}
    // 2) fallback: plain equality query (automatic single-field index, no composite index),
    //    sorted in JavaScript. Also picks up old documents that have no `ts` field.
    threadUnsub=col.where('room','==',key).onSnapshot(s=>{
      const msgs=s.docs.map(d=>d.data()).sort((a,b)=>msOf(a)-msOf(b)).slice(-500);
      $('cb').innerHTML=rowsHtml(msgs);
      $('chatWarn').hidden=false;
      $('chatWarn').textContent=(e.code==='failed-precondition'?'Index missing or still building – ':'Compatibility mode – ')+'messages loaded without the composite index. Deploy firestore.indexes.json (or click the index link in the browser console) to switch back to the fast query.';
    },e2=>{$('cb').innerHTML='<tr><td colspan="3">Could not load: '+esc(e2.code||e2.message)+'</td></tr>'});
  });
}

/* ---- delete a private chat thread (all messages of that pair) ---- */
function askConfirm(title,body,okText){
  return new Promise(res=>{
    $('dmTitle').textContent=title;$('dmBody').textContent=body;$('dmOk').textContent=okText;$('dmOk').disabled=false;$('dmCancel').disabled=false;$('delModal').hidden=false;
    const done=v=>{$('delModal').hidden=true;$('dmOk').onclick=$('dmCancel').onclick=null;res(v)};
    $('dmOk').onclick=()=>done(true);$('dmCancel').onclick=()=>done(false);
  });
}
async function collectPrivateRefs(key){
  const ids=String(key).split('_'),col=db.collection('messages'),found=new Map(),qs=[];
  const rooms=[key];if(ids.length===2)rooms.push(ids[1]+'_'+ids[0]);          // both uid orders
  rooms.forEach(r=>qs.push(col.where('room','==',r).get()));                    // new + legacy (room == pair key)
  qs.push(col.where('pairKey','==',key).get());                                 // new field
  if(ids.length===2)qs.push(col.where('participants','array-contains',ids[0]).get().then(s=>({docs:s.docs.filter(d=>{const p=d.data().participants;return Array.isArray(p)&&p.includes(ids[0])&&p.includes(ids[1])})}))); // legacy safety net
  const results=await Promise.all(qs);
  results.forEach(s=>s.docs.forEach(d=>{if(d.data().isPrivate!==false)found.set(d.id,d.ref)}));  // never touch public messages
  return [...found.values()];
}
async function deleteThread(key){
  const label=pairLabelOf(key,($('chatTitle').textContent||key));
  if(!await askConfirm('Delete chat history?',`This will permanently delete ALL messages in "${label}" from Firestore. Both users will lose this conversation. This cannot be undone. (Archived view-once photos are kept.)`,'Yes, delete permanently'))return;
  const btn=$('delThread');btn.disabled=true;const old=btn.textContent;btn.textContent='Deleting…';
  try{
    const refs=await collectPrivateRefs(key);
    for(let i=0;i<refs.length;i+=400){const b=db.batch();refs.slice(i,i+400).forEach(r=>b.delete(r));await b.commit();btn.textContent='Deleting… '+Math.min(i+400,refs.length)+'/'+refs.length}
    chatRecent=chatRecent.filter(m=>!(isPrivMsg(m)&&keyOf(m)===key));   // remove from list immediately
    chatSel=null;openThread(null);renderChatList();
    alert('Deleted '+refs.length+' message'+(refs.length===1?'':'s')+' from "'+label+'".');
  }catch(e){alert('Delete failed: '+(e.code||e.message))}
  finally{btn.disabled=false;btn.textContent=old}
}
$('delThread').onclick=()=>{if(chatMode==='private'&&chatSel)deleteThread(chatSel)};
