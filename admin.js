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
function init(){initExtra();db.collection('users').onSnapshot(s=>{users={};s.forEach(d=>users[d.id]=d.data());render()});db.collection('userPrivate').onSnapshot(s=>{emails={};s.forEach(d=>emails[d.id]=d.data().email);render()},e=>console.warn('userPrivate:',e.code||e.message));db.collection('messages').orderBy('ts','desc').limit(300).onSnapshot(s=>{$('cb').innerHTML=s.docs.map(d=>{const m=d.data();return`<tr><td>${m.ts?m.ts.toDate().toLocaleString():''}</td><td>${esc(m.to?'Private chat':m.room)}</td><td>${esc(m.name)}</td><td>${esc(m.text)}${m.img?`<img class="chat" src="${esc(safeImg(m.img))}">`:''}</td></tr>`}).join('')});
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
