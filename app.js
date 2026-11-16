/* =====================================================================
   HAPPY FRIENDS — app.js
   (Firebase config below is your ORIGINAL config, unchanged.)
   Load order in index.html:  bot-names.js → bots.js → app.js
   ===================================================================== */
/* ===== 1. FIREBASE CONFIG (unchanged) ===== */
const firebaseConfig={apiKey:"AIzaSyA0n4NrCBhD-kQ_4ZifeAWVm045Rm8Jdrc",authDomain:"happy-friends-8f840.firebaseapp.com",projectId:"happy-friends-8f840",appId:"1:549080403446:web:fb2a894fddbc135cb24bd7"};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(),db=firebase.firestore(),TS=()=>firebase.firestore.FieldValue.serverTimestamp(),INC=n=>firebase.firestore.FieldValue.increment(n);
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WALLS={Sunset:'linear-gradient(135deg,#ffd6a5,#ffadad)',Ocean:'linear-gradient(135deg,#a0e7e5,#b4f8c8)',Lavender:'linear-gradient(135deg,#cdb4db,#a2d2ff)',Mint:'linear-gradient(135deg,#d8f3dc,#fefae0)',Night:'linear-gradient(135deg,#243b55,#141e30)',Candy:'linear-gradient(135deg,#fbc2eb,#a6c1ee)'};
const COST={story:10,room:50,wall:30,vip:100},DAILY=20,SHARE=10,IMG=1;
/* Built-in public rooms (shared by everyone; bots chat in them too). Edit freely. */
const DEFAULT_ROOMS=[{id:'public',name:'Public chat'},{id:'lounge',name:'Friends Lounge'},{id:'music',name:'Music & Movies'},{id:'night',name:'Night Owls'}];
const BASE_TITLE='Happy Friends – Meet, chat, make friends';

/* ---------- state ---------- */
let me=null,my=null,users={},startedUid=null,appStarted=false,onboarding=false,guestAuth=null,migrated=false;
let unsubs=[],timers=[];
let room='public',roomKind='room',roomTitle='Public chat',peer=null,botPeer=null,roomUnsub=null,roomToken=0;
let realDocs=[],botMsgs=[],botChats={},lastBotCheck=0,firstLoad=true;
let inboxIncoming=[],inboxOutgoing=[],incomingReady=false,unreadByRoom={},lastRead={};
let customRooms=[],storiesAll=[],storiesShown=[];
let remoteTypers=new Map(),botTypers=new Map(),typingUnsub=null,typingWrittenAt=0,typingIdle=null,typingDocRoom=null;
let welcomed=false,welcomeTimers=[],rosterKey='',tickCount=0;
const nodes=new Map();
const start=Date.now();
let soundOn=localStorage.getItem('hf-sound')!=='off';

/* ---------- small helpers ---------- */
const IMG_OK=/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
function safeImg(u){u=String(u||'');if(IMG_OK.test(u))return u;if(/^https:\/\/[^\s"'<>]+$/.test(u))return u;return''}
const gcls=g=>g==='Male'?'g-male':g==='Female'?'g-female':'g-other';
const gsym=g=>g==='Male'?'<span class="gsym g-male" title="Male">♂</span>':g==='Female'?'<span class="gsym g-female" title="Female">♀</span>':'';
function avatar(u){
  const p=safeImg(u&&u.photo);if(p)return p;
  const ch=((u&&u.name||'?').trim()[0]||'?').toUpperCase(),col=u&&u.gender==='Male'?'#3b82f6':u&&u.gender==='Female'?'#ec4899':'#8b5cf6';
  return 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="'+col+'"/><text x="32" y="43" font-size="30" font-family="Arial" font-weight="700" text-anchor="middle" fill="#fff">'+esc(ch)+'</text></svg>');
}
function nameHtml(u){return '<span class="nm '+gcls(u&&u.gender)+'">'+esc(u&&u.name||'Member')+'</span>'+gsym(u&&u.gender)+(u&&u.isBot&&BOT_CONFIG.labelAsBot?' <span class="bot-tag">bot</span>':'')}
const today=()=>new Date().toISOString().slice(0,10);
const isVip=u=>!!u&&(u.vipUntil||0)>Date.now();
/* avatar with optional animated gold VIP ring */
const avHtml=(u,cls,attrs)=>'<span class="avw'+(isVip(u)?' vip-ring':'')+'"><img class="'+(cls||'')+'" src="'+esc(avatar(u))+'" '+(attrs||'')+' alt=""></span>';
/* WhatsApp-style ticks */
const CHK='<path d="M1 5.8l3.4 3.4L11 1.6"/>',CHK2='<path d="M5.6 8.4l.8.8L15 1.6"/>';
const TK={wait:'<span class="tk wait" title="Sending">🕓</span>',
  sent:'<svg class="tk" viewBox="0 0 16 11" title="Sent">'+CHK+'</svg>',
  deliv:'<svg class="tk" viewBox="0 0 16 11" title="Delivered">'+CHK+CHK2+'</svg>',
  read:'<svg class="tk read" viewBox="0 0 16 11" title="Seen">'+CHK+CHK2+'</svg>'};
const ackSent=new Set();
/* mark messages addressed to me as delivered / read (recipient only; allowed by firestore.rules) */
function ack(docs,field){
  if(!me)return;
  const todo=docs.filter(d=>{const m=d.data();return m.to===me.uid&&!m[field]&&!d.metadata.hasPendingWrites&&!ackSent.has(field+d.id)}).slice(0,100);
  if(!todo.length)return;
  const b=db.batch();
  todo.forEach(d=>{ackSent.add(field+d.id);const u=field==='readAt'?{readAt:TS()}:{deliveredAt:TS()};if(field==='readAt'&&!d.data().deliveredAt)u.deliveredAt=TS();b.update(d.ref,u)});
  b.commit().catch(e=>{console.warn('Receipt update skipped:',e.code||e.message);todo.forEach(d=>ackSent.delete(field+d.id))});
}
const rnd=(a,b)=>a+Math.random()*(b-a);
const stampOf=m=>Number(m.createdAt)||(m.ts&&m.ts.toMillis&&m.ts.toMillis())||0;

/* ---------- theme ---------- */
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem('hf-theme',t)}catch(e){}$('themeBtn').textContent=$('themeBtn2').textContent=t==='dark'?'☀️':'🌙'}
setTheme(localStorage.getItem('hf-theme')||'light');
$('themeBtn').onclick=$('themeBtn2').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');

/* ---------- toast / modal / loader ---------- */
let toastTimer;
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2600)}
let modalLocked=false;
function modal(html,locked){modalLocked=!!locked;$('modalBody').innerHTML=html;$('modal').hidden=false}
function closeModal(){modalLocked=false;$('modal').hidden=true}
$('modal').onclick=e=>{if(e.target.id==='modal'&&!modalLocked)closeModal()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').hidden&&!modalLocked)closeModal()});
function showLoader(t){$('loaderText').textContent=t||'Loading…';$('loader').hidden=false}
function hideLoader(){$('loader').hidden=true}
function setBusy(btn,on,label){
  if(!btn)return;
  if(on){if(btn.dataset.busy==='1')return;btn.dataset.busy='1';btn.dataset.label=btn.textContent;btn.classList.add('loading');btn.disabled=true;if(label)btn.textContent=label}
  else if(btn.dataset.busy==='1'){btn.dataset.busy='0';btn.classList.remove('loading');btn.disabled=false;if(btn.dataset.label)btn.textContent=btn.dataset.label}
}
function setAuthStatus(t,err){const s=$('authStatus');if(!s)return;s.hidden=!t;s.textContent=t||'';s.classList.toggle('err',!!err)}

/* ---------- sound ---------- */
let actx;
function beep(f=880){if(!soundOn)return;try{actx=actx||new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();const o=actx.createOscillator(),g=actx.createGain();o.connect(g);g.connect(actx.destination);o.frequency.value=f;g.gain.setValueAtTime(.12,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+.3);o.start();o.stop(actx.currentTime+.3)}catch(e){}}
function paintSound(){const b=$('soundBtn');if(b){b.textContent=soundOn?'🔔':'🔕';b.title=soundOn?'Sound on (tap to mute)':'Sound off (tap to unmute)'}}
$('soundBtn').onclick=()=>{soundOn=!soundOn;try{localStorage.setItem('hf-sound',soundOn?'on':'off')}catch(e){}paintSound();if(soundOn)beep(740)};paintSound();

/* ---------- images ---------- */
function resize(file,max=1200){return new Promise((resolve,reject)=>{if(!file||!file.type.startsWith('image/'))return reject(new Error('Please choose an image file.'));const r=new FileReader();r.onerror=()=>reject(new Error('Could not read the selected image.'));r.onload=()=>{const i=new Image();i.onerror=()=>reject(new Error('This image could not be opened.'));i.onload=()=>{const scale=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(i.width*scale));c.height=Math.max(1,Math.round(i.height*scale));const cx=c.getContext('2d');if(!cx)return reject(new Error('Image processing is not supported by this browser.'));cx.drawImage(i,0,0,c.width,c.height);c.toBlob(blob=>blob?resolve(blob):reject(new Error('Image compression failed.')),'image/jpeg',.76)};i.src=r.result};r.readAsDataURL(file)})}
function prefixLength(d){return d.indexOf(',')+1}
const blobToDataUrl=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Could not read image.'));r.readAsDataURL(b)});
// Compress to a data URL below maxBytes (kept under Firestore's 1 MiB document limit).
async function imageToDataUrl(file,maxDimension=900,maxBytes=500*1024){
  if(!file||!file.type.startsWith('image/'))throw new Error('Please choose an image file.');
  let blob=await resize(file,maxDimension),quality=.72,out='';
  for(let i=0;i<5;i++){
    out=await blobToDataUrl(blob);
    if(Math.ceil((out.length-prefixLength(out))*3/4)<=maxBytes)return out;
    quality=Math.max(.3,quality-.1);
    const img=await new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(new Error('Could not process image.'));im.src=out});
    const c=document.createElement('canvas');c.width=Math.round(img.width*.85);c.height=Math.round(img.height*.85);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Image compression failed.')),'image/jpeg',quality));
  }
  out=await blobToDataUrl(blob);
  if(out.length<900000)return out;
  throw new Error('Image is too large. Please choose a smaller image.');
}
const uploadImage=(file,folder,max=1200)=>imageToDataUrl(file,max,500*1024);

async function spend(n){const ref=db.collection('users').doc(me.uid);try{await db.runTransaction(async t=>{const d=await t.get(ref);if((d.data().coins||0)<n)throw new Error('coins');t.update(ref,{coins:INC(-n)})});return true}catch(e){toast(e&&e.message==='coins'?'Not enough coins 🪙':'Could not complete: '+(e.code||e.message));return false}}
function status(u){const t=u.lastSeen&&u.lastSeen.toMillis?u.lastSeen.toMillis():0;if(Date.now()-t>90000)return'off';return u.away?'away':'on'}
const dmId=uid=>[me.uid,String(uid)].sort().join('_');

/* ---------- footer / social links ---------- */
function renderSocialLinks(data){
  const box=$('socialLinks');if(!box)return;
  const links=Array.isArray(data&&data.links)?data.links:[];
  box.innerHTML=links.filter(x=>x&&x.url&&x.name&&/^https:\/\//.test(x.url)).map(x=>`<a class="social-link" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.name)}" title="${esc(x.name)}"><span>${esc(x.icon||'↗')}</span><small>${esc(x.name)}</small></a>`).join('');
}
$('footerYear').textContent=new Date().getFullYear();
db.collection('siteSettings').doc('socialLinks').onSnapshot(s=>renderSocialLinks(s.exists?s.data():{}),e=>console.warn('Social links unavailable:',e.code||e.message));

/* =====================================================================
   AUTH  (fast: popup opens instantly, guest form shows instantly)
   ===================================================================== */
const googleProvider=new firebase.auth.GoogleAuthProvider();googleProvider.setCustomParameters({prompt:'select_account'});
function authErrorMessage(e){
  const code=(e&&e.code)||'';
  const m={'auth/unauthorized-domain':'This website domain is not authorized in Firebase. Add it in Firebase Authentication > Settings > Authorized domains.','auth/operation-not-allowed':'This sign-in method is disabled. Enable it under Firebase Authentication > Sign-in method.','auth/popup-blocked':'The sign-in popup was blocked. Please allow popups and try again.','auth/popup-closed-by-user':'Sign-in was cancelled.','auth/cancelled-popup-request':'Sign-in was cancelled.','auth/network-request-failed':'Network error. Check your internet connection and try again.','auth/credential-already-in-use':'That Google account is already registered. Log out and sign in with Google instead.','auth/unauthorized-continue-uri':'Firebase rejected this website address. Check the authorized domains.'};
  return m[code]||('Sign-in failed: '+((e&&e.message)||code||'Unknown error'));
}
let signingIn=false;
async function startGoogleSignIn(btn){
  if(signingIn)return;signingIn=true;
  setBusy(btn,true,'Opening Google…');setAuthStatus('Opening Google sign-in…');
  try{
    // IMPORTANT: no `await` before this call, so browsers treat the popup as user-initiated (opens instantly).
    await auth.signInWithPopup(googleProvider);
    setAuthStatus('Signed in — loading your profile…');
  }catch(e){
    const code=e&&e.code;
    if(code==='auth/popup-blocked'||code==='auth/operation-not-supported-in-this-environment'){
      try{sessionStorage.setItem('hf-redirect','1');setAuthStatus('Redirecting to Google…');await auth.signInWithRedirect(googleProvider);return}catch(e2){e=e2}
    }
    if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request'){setAuthStatus('')}
    else{console.error('Google sign-in failed:',e);setAuthStatus(authErrorMessage(e),true);toast(authErrorMessage(e))}
  }finally{signingIn=false;setBusy(btn,false)}
}
document.querySelectorAll('[data-login]').forEach(b=>b.addEventListener('click',()=>startGoogleSignIn(b)));
// Only needed after a redirect sign-in (skipped otherwise → faster page start).
if(sessionStorage.getItem('hf-redirect')){sessionStorage.removeItem('hf-redirect');auth.getRedirectResult().catch(e=>{console.error('Redirect sign-in failed:',e);setAuthStatus(authErrorMessage(e),true)})}

/* Guest: the form opens INSTANTLY while the anonymous sign-in runs in the background. */
$('guestJoin').addEventListener('click',()=>{
  if(onboarding||auth.currentUser)return;
  guestAuth=auth.signInAnonymously();
  guestAuth.catch(e=>{console.error('Guest sign-in failed:',e);toast(authErrorMessage(e));onboarding=false;guestAuth=null;closeModal()});
  onboard(true);
});

auth.onAuthStateChanged(u=>{
  if(!u){
    if(onboarding&&guestAuth)return;   // guest sign-in still in flight; ignore the initial "signed out" event
    teardown();me=null;my=null;startedUid=null;$('app').hidden=true;$('welcome').hidden=false;hideLoader();document.title=BASE_TITLE;return;
  }
  if(startedUid===u.uid)return;
  me=u;startedUid=u.uid;
  if(!onboarding)showLoader('Loading your profile…');
  startSession();
});

function startSession(){
  const uid=me.uid;
  try{lastRead=JSON.parse(localStorage.getItem('hf-lr-'+uid)||'{}')}catch(e){lastRead={}}
  unsubs.push(db.collection('users').doc(uid).onSnapshot(d=>{
    if(!auth.currentUser||auth.currentUser.uid!==uid)return;
    if(!d.exists){hideLoader();if(!onboarding)onboard(!!me.isAnonymous);return}
    my=d.data();
    if(my.suspended){alert('Your account is suspended.');auth.signOut();return}
    if(onboarding){onboarding=false;guestAuth=null;closeModal()}   // profile exists now -> sign-up form is done
    if(!appStarted){appStarted=true;begin()}
    paintProfile();
  },err=>{
    console.error('Profile loading failed:',err);hideLoader();
    setAuthStatus('Could not load your profile ('+(err.code||err.message)+'). Check your Firestore rules, then try again.',true);
    toast('Profile load failed: '+(err.code||err.message));
  }));
}
function teardown(){
  unsubs.forEach(f=>{try{f()}catch(e){}});unsubs=[];
  timers.forEach(clearInterval);timers=[];
  if(roomUnsub){roomUnsub();roomUnsub=null}
  if(typingUnsub){typingUnsub();typingUnsub=null}
  welcomeTimers.forEach(clearTimeout);welcomeTimers=[];
  appStarted=false;onboarding=false;migrated=false;users={};realDocs=[];botMsgs=[];botChats={};inboxIncoming=[];inboxOutgoing=[];incomingReady=false;unreadByRoom={};welcomed=false;rosterKey='';
  remoteTypers.clear();botTypers.clear();nodes.clear();ackSent.clear();
  const m=$('msgs');if(m)m.innerHTML='';
}

function onboard(guest){
  onboarding=true;hideLoader();setAuthStatus('');
  const lookHtml='<label>Looking for</label><select id="oLook">'+['Friendship','Short term relationship','Long term relationship','To marry','Fun'].map(x=>'<option>'+x+'</option>').join('')+'</select>';
  modal(`<h2>${guest?'Join as a Guest 👋':'Welcome! 🎉'}</h2>
  <p style="color:var(--mut)">${guest?'Guest accounts can chat. Stories, chat wallpapers and profile picture uploads require Google registration.':'You must be 18 or older.'}</p>
  <label>Your name</label><input id="oName" maxlength="24" value="${esc(guest?'':(me&&me.displayName)||'')}" autocomplete="nickname">
  <label>Age</label><input id="oAge" type="number" min="18" max="100" inputmode="numeric" placeholder="Your age">
  <label>Gender</label><select id="oGender"><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select>
  ${guest?'':lookHtml}
  <button class="btn" id="oGo">Join Happy Friends</button>
  <button class="btn ghost" id="oCancel" type="button">Cancel</button>`,true);
  setTimeout(()=>{const n=$('oName');if(n)n.focus()},50);
  $('oCancel').onclick=cancelOnboard;
  $('oGo').onclick=async()=>{
    const name=$('oName').value.trim(),age=Number($('oAge').value),gender=$('oGender').value;
    if(!name)return toast('Enter your name');
    if(!Number.isInteger(age)||age<18||age>100)return toast('You must be 18 or older');
    if(!gender)return toast('Select your gender');
    const look=guest?'Guest':$('oLook').value,btn=$('oGo');
    setBusy(btn,true,'Joining…');
    try{
      if(!auth.currentUser&&guestAuth)await guestAuth;
      const u=auth.currentUser;if(!u)throw new Error('Not signed in yet. Please try again.');
      me=u;
      const data={name,age,gender,accountType:guest?'guest':'registered',photo:guest?'':(u.photoURL||''),location:'',looking:look,coins:guest?0:50,lastDaily:'',lastShare:'',away:false,lastSeen:TS(),suspended:false,wallpaper:'',created:TS()};
      const batch=db.batch();
      batch.set(db.collection('users').doc(u.uid),data);
      if(!guest&&u.email)batch.set(db.collection('userPrivate').doc(u.uid),{email:u.email,updatedAt:TS()});   // email kept private (not in the public users list)
      await batch.commit();
      // FIX: the profile snapshot may already have started the app (local write) before commit() resolves.
      // Only close the sign-up form if it is still open, and never show the loader after the app has started.
      if(onboarding){onboarding=false;guestAuth=null;closeModal()}
      if(appStarted)hideLoader();
      else{showLoader('Starting chat…');setTimeout(()=>{if(appStarted)hideLoader()},5000)}
    }catch(err){console.error(err);toast('Could not save your profile: '+(err.code||err.message));setBusy(btn,false)}
  };
}
function cancelOnboard(){
  const done=()=>{const u=auth.currentUser;onboarding=false;guestAuth=null;closeModal();if(u&&u.isAnonymous)u.delete().catch(()=>auth.signOut());else auth.signOut()};
  if(!auth.currentUser&&guestAuth)guestAuth.then(done,()=>{onboarding=false;guestAuth=null;closeModal()});else done();
}

/* =====================================================================
   APP START
   ===================================================================== */
function paintProfile(){
  $('coins').textContent=my.coins||0;
  $('meImg').src=avatar(my);$('meWrap').classList.toggle('vip-ring',isVip(my));
  $('msgs').style.backgroundImage=my.wallpaper&&WALLS[my.wallpaper]?WALLS[my.wallpaper]:'none';
  const vip=(my.vipUntil||0)>Date.now();
  $('vipBtn').textContent=vip?'⭐ VIP active':'⭐ Get VIP';$('vipBtn').classList.toggle('vip-active',vip);
  if(my.email&&!migrated){migrated=true;   // move any old public email into the private collection
    db.collection('userPrivate').doc(me.uid).set({email:my.email,updatedAt:TS()},{merge:true}).then(()=>db.collection('users').doc(me.uid).update({email:firebase.firestore.FieldValue.delete()})).catch(e=>console.warn('Email move skipped:',e.code||e.message))}
}
const listenErr=name=>e=>console.warn(name+' listener:',e.code||e.message);

function begin(){
  if(!me)return;
  setAuthStatus('');hideLoader();$('welcome').hidden=true;$('app').hidden=false;
  // users (most recently active first → scales better than loading everyone)
  unsubs.push(db.collection('users').orderBy('lastSeen','desc').limit(200).onSnapshot(s=>{users={};s.forEach(d=>users[d.id]=d.data());renderUsers();renderInbox();paintRoomHead()},listenErr('Users')));
  // private inbox: every message sent to me / by me (room = sorted UID pair)
  unsubs.push(db.collection('messages').where('to','==',me.uid).onSnapshot(s=>{
    inboxIncoming=s.docs;ack(s.docs,'deliveredAt');
    if(incomingReady)s.docChanges().forEach(c=>{
      if(c.type!=='added')return;const m=c.doc.data();
      if(stampOf(m)<=start-5000||c.doc.metadata.hasPendingWrites)return;
      if(m.room!==room||document.hidden){beep(660);toast('💌 '+(m.name||'Member')+': '+(m.text||'sent a photo'))}
    });
    incomingReady=true;renderInbox();
  },listenErr('Inbox incoming')));
  unsubs.push(db.collection('messages').where('from','==',me.uid).where('isPrivate','==',true).onSnapshot(s=>{inboxOutgoing=s.docs;renderInbox()},listenErr('Inbox outgoing')));
  unsubs.push(db.collection('rooms').onSnapshot(s=>{customRooms=s.docs.map(d=>({id:d.id,name:d.data().name||'Room'}));renderRooms()},listenErr('Rooms')));
  unsubs.push(db.collection('stories').where('exp','>',Date.now()).onSnapshot(s=>{storiesAll=s.docs.map(d=>({id:d.id,...d.data()}));renderStories()},listenErr('Stories')));
  const ping=()=>db.collection('users').doc(me.uid).update({lastSeen:TS(),away:document.hidden}).catch(()=>{});
  ping();
  timers.push(setInterval(ping,30000),setInterval(()=>{renderUsers();paintRoomHead()},30000),setInterval(roomTick,1000),setInterval(rosterWatch,5000),setInterval(renderStories,60000));
  renderRooms();rosterWatch();
  openRoom({id:'public',kind:'room',title:'Public chat'});
  if(my&&my.lastDaily!==today())setTimeout(()=>{if(my&&$('modal').hidden)rewards()},1200);
}
document.addEventListener('visibilitychange',()=>{if(!me||!appStarted)return;db.collection('users').doc(me.uid).update({lastSeen:TS(),away:document.hidden}).catch(()=>{});if(!document.hidden)markReadCurrent()});

/* =====================================================================
   ROOMS LIST
   ===================================================================== */
function renderRooms(){
  const box=$('rooms');if(!box)return;
  const all=[...DEFAULT_ROOMS,...customRooms.filter(r=>!DEFAULT_ROOMS.some(d=>d.id===r.id))];
  box.innerHTML=all.map(r=>`<div class="r ${roomKind==='room'&&room===r.id?'on':''}" data-r="${esc(r.id)}" data-n="${esc(r.name)}"># ${esc(r.name)}</div>`).join('');
}
$('rooms').onclick=e=>{const el=e.target.closest('[data-r]');if(!el)return;openRoom({id:el.dataset.r,kind:'room',title:el.dataset.n});$('side').classList.remove('open')};

/* =====================================================================
   PEOPLE (real users + simulated bots) — gender colours
   ===================================================================== */
function peopleList(){
  const real=Object.entries(users).filter(([id,u])=>id!==me.uid&&!u.suspended).map(([id,u])=>({id,u,s:status(u),bot:false}));
  const bots=botsOnlineAt().map(b=>({id:b.id,u:b,s:'on',bot:true}));
  const vip=x=>Number((x.u.vipUntil||0)>Date.now());
  return [...real,...bots].sort((a,b)=>vip(b)-vip(a)||'on away off'.indexOf(a.s)-'on away off'.indexOf(b.s));
}
function renderUsers(){
  if(!me)return;
  const l=peopleList(),online=l.filter(x=>x.s!=='off').length;
  const h=$('onlineCount');if(h)h.textContent=online+' online';
  $('users').innerHTML=l.map(({id,u,s,bot})=>{
    const unread=bot?0:(unreadByRoom[dmId(id)]||0);
    return `<div class="u ${gcls(u.gender)}" ${bot?'data-bot':'data-u'}="${esc(id)}">${avHtml(u,'ring '+gcls(u.gender))}<div><b>${nameHtml(u)} ${(u.vipUntil||0)>Date.now()?'<span class="vip-badge">VIP</span>':''}</b><small>${esc(u.location||'')}${u.location&&u.looking?' · ':''}${esc(u.looking||'')}</small></div>${unread?`<span class="badge">${unread>99?'99+':unread}</span>`:''}<i class="dot ${s}"></i></div>`;
  }).join('')||'<small>No users yet</small>';
}
$('users').onclick=e=>{
  const el=e.target.closest('[data-u],[data-bot]');if(!el)return;
  if(el.dataset.bot){const b=botById(el.dataset.bot);if(b)openBotChat(b)}
  else openDm(el.dataset.u);
  $('side').classList.remove('open');
};
function rosterWatch(){const k=botsOnlineAt().map(b=>b.id).join();if(k!==rosterKey){rosterKey=k;renderUsers();paintRoomHead()}}
$('usersBtn').onclick=()=>$('side').classList.toggle('open');

/* =====================================================================
   PRIVATE INBOX + UNREAD BADGES
   ===================================================================== */
function saveRead(){try{localStorage.setItem('hf-lr-'+me.uid,JSON.stringify(lastRead))}catch(e){}}
function markRead(r){
  if(!me||!r)return;
  let latest=Date.now();inboxIncoming.forEach(d=>{const m=d.data();if(m.room===r)latest=Math.max(latest,stampOf(m))});
  if((lastRead[r]||0)>=latest&&!unreadByRoom[r])return;
  lastRead[r]=latest;saveRead();renderInbox();renderUsers();
}
function markReadCurrent(){if(roomKind==='dm'&&!document.hidden){markRead(room);ack(realDocs,'readAt')}}
function renderInbox(){
  if(!me)return;
  const grouped=new Map();unreadByRoom={};let total=0;
  inboxIncoming.forEach(d=>{const m=d.data();if(!m.room||!m.to||m.room==='public')return;
    if(stampOf(m)>(lastRead[m.room]||0)&&!(roomKind==='dm'&&m.room===room&&!document.hidden)){unreadByRoom[m.room]=(unreadByRoom[m.room]||0)+1;total++}});
  [...inboxIncoming,...inboxOutgoing].forEach(d=>{
    const m=d.data(),other=m.from===me.uid?m.to:m.from;
    if(!other||!m.room||!m.to||m.room==='public')return;
    const st=stampOf(m),old=grouped.get(m.room);
    if(!old||st>old.stamp)grouped.set(m.room,{room:m.room,other,stamp:st,m});
  });
  const items=[...grouped.values()].sort((a,b)=>b.stamp-a.stamp);
  const box=$('dmInbox');
  if(box)box.innerHTML=items.map(x=>{
    const u=users[x.other]||{name:x.m.name,gender:x.m.gender},un=unreadByRoom[x.room]||0;
    const preview=x.m.img?'📷 Photo':(x.m.text||'Message');
    return `<button class="dm-inbox-item ${roomKind==='dm'&&room===x.room?'active':''} ${un?'has-unread':''}" data-dm="${esc(x.other)}"><span class="dm-top"><b>${nameHtml(u)}</b>${un?`<span class="badge">${un>99?'99+':un}</span>`:''}</span><small>${esc(preview.slice(0,48))}</small></button>`;
  }).join('')||'<small class="inbox-empty">No private chats yet</small>';
  const ub=$('usersBadge');if(ub){ub.hidden=!total;ub.textContent=total>99?'99+':total}
  document.title=total?'('+total+') '+BASE_TITLE:BASE_TITLE;
}
$('dmInbox').onclick=e=>{const el=e.target.closest('[data-dm]');if(!el)return;openDm(el.dataset.dm);$('side').classList.remove('open')};

/* =====================================================================
   CHAT ROOMS  (public rooms vs isolated 1-on-1 rooms)
   ===================================================================== */
function openDm(uid){const u=users[uid]||{name:'Member'};openRoom({id:dmId(uid),kind:'dm',peer:uid,title:u.name})}
function openBotChat(b){openRoom({id:'bot:'+b.id,kind:'bot',bot:b,title:b.name})}

function paintRoomHead(){
  const t=$('roomName'),meta=$('roomMeta');if(!t||!meta||!me)return;
  if(roomKind==='dm'){
    const u=users[peer]||{name:'Member'},s=u.lastSeen?status(u):'off';
    t.innerHTML='💬 '+nameHtml(u);
    meta.innerHTML=`<i class="dot ${s}"></i> ${s==='on'?'Online':s==='away'?'Away':'Offline'}${u.age?' · '+esc(u.age):''}`;
  }else if(roomKind==='bot'){
    t.innerHTML='💬 '+nameHtml(botPeer);
    meta.innerHTML=`<i class="dot on"></i> Online${botPeer.age?' · '+esc(botPeer.age):''}`;
  }else{
    const real=Object.entries(users).filter(([id,u])=>id===me.uid||status(u)!=='off').length;
    t.textContent='# '+roomTitle;meta.textContent='👥 '+(real+botsOnlineAt().length)+' online';
  }
}

function openRoom(o){
  clearTypingDoc();
  room=o.id;roomKind=o.kind;peer=o.kind==='dm'?o.peer:null;botPeer=o.kind==='bot'?o.bot:null;roomTitle=o.title;
  const token=++roomToken;realDocs=[];botMsgs=[];firstLoad=true;remoteTypers.clear();botTypers.clear();
  welcomeTimers.forEach(clearTimeout);welcomeTimers=[];
  if(roomUnsub){roomUnsub();roomUnsub=null}
  if(typingUnsub){typingUnsub();typingUnsub=null}
  nodes.clear();$('msgs').innerHTML='';$('newPill').hidden=true;
  paintRoomHead();renderRooms();renderTyping();
  if(roomKind==='dm')markRead(room);else renderInbox();
  if(roomKind==='bot'){renderMessages(true);firstLoad=false}
  else{
    const priv=roomKind==='dm';
    // Private rooms: only messages whose `participants` include ME. Public rooms: only isPrivate==false.
    const base=()=>{const q=db.collection('messages').where('room','==',room);return priv?q.where('participants','array-contains',me.uid):q.where('isPrivate','==',false)};
    const handle=s=>{
      if(token!==roomToken)return;
      realDocs=s.docs;renderMessages(firstLoad);
      if(!firstLoad)s.docChanges().forEach(c=>{if(c.type==='added'&&c.doc.data().from!==me.uid&&!c.doc.metadata.hasPendingWrites)beep()});
      firstLoad=false;if(priv)markReadCurrent();
    };
    const listen=ordered=>{
      const q=ordered?base().orderBy('ts').limitToLast(100):base();
      roomUnsub=q.onSnapshot({includeMetadataChanges:true},handle,e=>{
        if(token!==roomToken)return;
        if(ordered&&e.code==='failed-precondition'){console.warn('Missing Firestore index — using the slower unordered query. Deploy firestore.indexes.json.');if(roomUnsub){roomUnsub();roomUnsub=null}listen(false);return}
        console.error('Chat listener failed:',e);toast('Chat update failed: '+(e.code||e.message));
      });
    };
    listen(true);
    // typing indicators (other real users)
    let initial=true;
    typingUnsub=db.collection('typing').where('room','==',room).onSnapshot(s=>{
      if(token!==roomToken)return;
      s.docChanges().forEach(c=>{const d=c.doc.data();if(!d||d.uid===me.uid)return;
        if(c.type==='removed')remoteTypers.delete(d.uid);
        else if(!initial)remoteTypers.set(d.uid,{name:d.name||'Someone',seen:Date.now()})});
      initial=false;renderTyping();
    },listenErr('Typing'));
    if(roomKind==='room'){
      lastBotCheck=Date.now();
      botMsgs=botEventsBetween(room,lastBotCheck-12*60000,lastBotCheck);
      renderMessages(true);
      if(room==='public'&&!welcomed&&BOT_CONFIG.enabled)scheduleWelcome();
    }
  }
  if(!('ontouchstart' in window))$('msgIn').focus();
}

/* ---- keyed, flicker-free message rendering ---- */
function buildItems(){
  const items=[];
  if(roomKind==='bot'){
    (botChats[botPeer.id]||[]).forEach(x=>items.push({key:x.id,mine:x.mine,ms:x.ms,text:x.text,img:x.img,name:botPeer.name,gender:botPeer.gender,bot:true,pending:false,tick:x.mine?'read':''}));
  }else{
    realDocs.forEach(d=>{const m=d.data(),mine=m.from===me.uid,sender=users[m.from];
      items.push({key:d.id,mine,ms:stampOf(m)||Date.now(),text:m.text,img:m.img,name:m.name,gender:(sender&&sender.gender)||m.gender,story:m.storyReply,pending:d.metadata.hasPendingWrites,tick:mine&&m.isPrivate?(d.metadata.hasPendingWrites?'wait':m.readAt?'read':m.deliveredAt?'deliv':'sent'):''})});
    if(roomKind==='room')botMsgs.forEach(e=>items.push({key:e.id,mine:false,ms:e.at,text:e.text,name:e.bot.name,gender:e.bot.gender,bot:true,pending:false}));
  }
  return items.sort((a,b)=>a.ms-b.ms);
}
function msgHtml(it){
  const story=it.story?`<div class="story-reply-context"><b>↩ Replied to ${esc(it.story.storyOwnerName||'a story')}</b>${it.story.storyText?`<span>${esc(it.story.storyText)}</span>`:''}</div>`:'';
  const head=it.mine?'':`<div class="mh"><b class="nm ${gcls(it.gender)}">${esc(it.name||'Member')}</b>${gsym(it.gender)}${it.bot&&BOT_CONFIG.labelAsBot?' <span class="bot-tag">bot</span>':''}</div>`;
  const img=safeImg(it.img);
  return head+story+(it.text?`<span class="mt">${esc(it.text)}</span>`:'')+(img?`<img loading="lazy" alt="photo" src="${esc(img)}">`:'')+'<time></time>';
}
function timeText(it){return new Date(it.ms).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(it.pending&&!it.tick?' · sending…':'')}
function timeHtml(it){return esc(timeText(it))+(it.tick?TK[it.tick]:'')}
function renderMessages(forceScroll){
  const box=$('msgs');if(!box)return;
  const wasNear=box.scrollHeight-box.scrollTop-box.clientHeight<140,prevTop=box.scrollTop;
  const items=buildItems(),seen=new Set();let prev=null,addedOthers=0;
  items.forEach(it=>{
    seen.add(it.key);let el=nodes.get(it.key);
    if(!el){el=document.createElement('div');el.className='m'+(it.mine?' me':'');el.dataset.id=it.key;el.innerHTML=msgHtml(it);nodes.set(it.key,el);if(!it.mine)addedOthers++}
    el.querySelector('time').innerHTML=timeHtml(it);
    const expected=prev?prev.nextSibling:box.firstChild;
    if(expected!==el)box.insertBefore(el,expected);
    prev=el;
  });
  nodes.forEach((el,k)=>{if(!seen.has(k)){el.remove();nodes.delete(k)}});
  const last=items[items.length-1],mineLast=last&&last.mine;
  if(forceScroll)box.scrollTop=box.scrollHeight;
  else if(wasNear||mineLast){box.scrollTo({top:box.scrollHeight,behavior:'smooth'});$('newPill').hidden=true}
  else{box.scrollTop=prevTop;if(addedOthers)$('newPill').hidden=false}
}
$('newPill').onclick=()=>{const b=$('msgs');b.scrollTo({top:b.scrollHeight,behavior:'smooth'});$('newPill').hidden=true};
$('msgs').addEventListener('scroll',()=>{const b=$('msgs');if(b.scrollHeight-b.scrollTop-b.clientHeight<60)$('newPill').hidden=true},{passive:true});
$('msgs').addEventListener('click',e=>{if(e.target.tagName==='IMG'){modal(`<img class="big" src="${esc(e.target.src)}" alt=""><button class="btn alt" onclick="closeModal()">Close</button>`)}});

/* ---- bots in rooms ---- */
function roomTick(){
  if(!me||!appStarted)return;
  const now=Date.now();tickCount++;
  remoteTypers.forEach((v,k)=>{if(now-v.seen>5000)remoteTypers.delete(k)});
  botTypers.forEach((v,k)=>{if(v.until<now)botTypers.delete(k)});
  if(roomKind==='room'&&BOT_CONFIG.enabled){
    const fresh=botEventsBetween(room,lastBotCheck+1,now);lastBotCheck=now;
    let changed=false;
    fresh.forEach(e=>{if(!botMsgs.some(x=>x.id===e.id)){botMsgs.push(e);changed=true}});
    if(botMsgs.length>60)botMsgs=botMsgs.slice(-60);
    if(changed)renderMessages(false);
    botEventsBetween(room,now,now+2500).forEach(e=>botTypers.set(e.bot.id,{name:e.bot.name,until:e.at+300}));
  }
  renderTyping();
  if(tickCount%10===0)paintRoomHead();
}
function scheduleWelcome(){
  welcomed=true;
  welcomeTimers.push(setTimeout(()=>{
    if(room!=='public'||roomKind!=='room'||!my)return;
    const bots=botsOnlineAt();if(!bots.length)return;
    const b=bots[Math.floor(Math.random()*bots.length)];
    botTypers.set(b.id,{name:b.name,until:Date.now()+2200});renderTyping();
    welcomeTimers.push(setTimeout(()=>{if(room!=='public'||roomKind!=='room')return;botMsgs.push({id:'welcome_'+Date.now(),at:Date.now(),bot:b,text:botWelcomeText(my.name||'friend')});renderMessages(false)},2200));
  },5000+Math.random()*4000));
}
/* ---- 1-on-1 chat with a bot: local only, never saved to Firestore ---- */
function botSay(b,text){
  if(!botChats[b.id])botChats[b.id]=[];
  botChats[b.id].push({id:'b'+Date.now()+Math.random(),mine:false,text,ms:Date.now()});
  if(roomKind==='bot'&&botPeer&&botPeer.id===b.id)renderMessages(false);
}
function sendToBot(text,img){
  const b=botPeer;if(!botChats[b.id])botChats[b.id]=[];
  botChats[b.id].push({id:'m'+Date.now()+Math.random(),mine:true,text:text||'',img:img||'',ms:Date.now()});
  renderMessages(false);
  const wait=rnd(1200,3200);
  botTypers.set(b.id,{name:b.name,until:Date.now()+wait});renderTyping();
  setTimeout(()=>botSay(b,img&&!text?'Nice photo! 😍':botReplyText()),wait);
  return true;
}

/* ---- typing indicators ---- */
function renderTyping(){
  const el=$('typing');if(!el)return;
  const now=Date.now(),names=[];
  remoteTypers.forEach(v=>{if(now-v.seen<=5000)names.push(v.name)});
  botTypers.forEach((v,k)=>{if(v.until>=now&&(roomKind==='room'||(roomKind==='bot'&&botPeer&&botPeer.id===k)))names.push(v.name)});
  if(!names.length){el.hidden=true;return}
  el.innerHTML=`<span class="dots"><i></i><i></i><i></i></span> ${names.slice(0,3).map(esc).join(', ')}${names.length>3?' and others':''} ${names.length>1?'are':'is'} typing…`;el.hidden=false;
}
function clearTypingDoc(){
  clearTimeout(typingIdle);
  if(me&&typingDocRoom){db.collection('typing').doc(typingDocRoom+'__'+me.uid).delete().catch(()=>{});typingDocRoom=null;typingWrittenAt=0}
}
$('msgIn').addEventListener('input',()=>{
  if(!me||!my||roomKind==='bot')return;
  const now=Date.now();
  if($('msgIn').value.trim()&&now-typingWrittenAt>2500){
    typingWrittenAt=now;typingDocRoom=room;
    db.collection('typing').doc(room+'__'+me.uid).set({room,uid:me.uid,name:my.name||'Member',at:TS()}).catch(()=>{});
  }
  clearTimeout(typingIdle);typingIdle=setTimeout(clearTypingDoc,4000);
});

/* ---- sending ---- */
async function send(text,img){
  if(!text&&!img)return false;
  if(!me||!my){toast('Your profile is still loading. Please try again.');return false}
  if(roomKind==='bot')return sendToBot(text,img);
  const sendRoom=room,sendPeer=peer;   // capture BEFORE the async write
  if(sendPeer&&sendRoom!==dmId(sendPeer)){toast('Private chat changed. Please reopen the conversation and try again.');return false}
  const isPrivate=!!sendPeer;
  try{
    clearTypingDoc();
    await db.collection('messages').add({room:sendRoom,from:me.uid,to:sendPeer||null,participants:isPrivate?[me.uid,sendPeer]:[],isPrivate,name:my.name||'Member',gender:my.gender||'',photo:'',text:text||'',img:img||'',createdAt:Date.now(),ts:TS()});
    if(img&&sendPeer){db.collection('users').doc(me.uid).update({coins:INC(IMG)}).catch(console.error);toast('+'+IMG+' 🪙 for sharing a photo')}
    return true;
  }catch(err){console.error('Message send failed:',err);toast('Message not sent: '+(err.code||err.message));return false}
}
$('sendForm').onsubmit=async e=>{
  e.preventDefault();
  const input=$('msgIn'),btn=$('sendBtn'),t=input.value.trim();if(!t)return;
  input.value='';btn.disabled=true;           // instant feedback: clear the box right away
  const ok=await send(t);
  if(!ok&&!input.value)input.value=t;          // restore text if sending failed
  btn.disabled=false;
};
$('chatImg').onchange=async e=>{const input=e.target,file=input.files[0];if(!file)return;try{toast('Compressing image…');const d=await imageToDataUrl(file,900,500*1024);await send('',d)}catch(err){console.error('Image send failed:',err);toast('Image not sent: '+(err.code||err.message))}finally{input.value=''}};
$('randomBtn').onclick=()=>{
  const l=peopleList().filter(x=>x.s!=='off');
  if(!l.length)return toast('Nobody is online right now');
  const x=l[Math.floor(Math.random()*l.length)];
  if(x.bot)openBotChat(x.u);else openDm(x.id);
  $('side').classList.remove('open');
};
$('newRoom').onclick=()=>{
  modal(`<h2>New chat room</h2><p style="color:var(--mut)">Costs ${COST.room} 🪙</p><label>Room name</label><input id="rn" maxlength="24"><button class="btn" id="rg">Create</button>`);
  $('rg').onclick=async()=>{const n=$('rn').value.trim();if(!n)return;const b=$('rg');setBusy(b,true,'Creating…');if(await spend(COST.room)){try{await db.collection('rooms').add({name:n,owner:me.uid,ts:TS()});closeModal();toast('Room created 🎉')}catch(e){toast('Could not create room: '+(e.code||e.message))}}setBusy(b,false)};
};

/* ---- wallpaper / VIP ---- */
$('wallBtn').onclick=()=>{
  if(!my)return;
  if(my.accountType==='guest')return toast('Chat wallpapers are for registered users. Register with Google to unlock this feature.');
  modal(`<h2>Chat wallpaper</h2><p style="color:var(--mut)">Each costs ${COST.wall} 🪙</p><div class="wp">${Object.entries(WALLS).map(([k,v])=>`<div data-w="${k}" style="background:${v}" title="${k}"></div>`).join('')}</div><button class="btn" onclick="closeModal()">Close</button>`);
  document.querySelectorAll('[data-w]').forEach(e=>e.onclick=async()=>{if(await spend(COST.wall)){await db.collection('users').doc(me.uid).update({wallpaper:e.dataset.w});closeModal()}});
};
$('vipBtn').onclick=async()=>{
  if(!my)return;
  if(my.accountType==='guest')return toast('VIP is available to registered members only. Register with Google first.');
  if((my.vipUntil||0)>Date.now())return toast('Your VIP is active until '+new Date(my.vipUntil).toLocaleTimeString());
  if(!await spend(COST.vip))return;
  const until=Math.max(Date.now(),my.vipUntil||0)+6*60*60*1000;
  await db.collection('users').doc(me.uid).update({vipUntil:until,vipBy:'coins'});toast('VIP activated for 6 hours! ⭐');
};

/* ---- rewards ---- */
function rewards(){
  if(!my)return;
  const ok=my.lastDaily!==today(),sh=my.lastShare!==today();
  modal(`<h2>🎁 Rewards</h2><p>Balance: <b>${my.coins||0} 🪙</b></p>
  <button class="btn" id="rd" ${ok?'':'disabled style="opacity:.5"'}>${ok?`Collect daily ${DAILY} 🪙`:'Come back tomorrow'}</button>
  <button class="btn alt" id="rs" ${sh?'':'disabled style="opacity:.5"'}>Share site, get ${SHARE} 🪙</button>
  <p style="color:var(--mut);font-size:13px;margin-top:12px">Earn ${IMG} 🪙 for each photo you send in a private chat. Spend coins on stories (${COST.story}), rooms (${COST.room}) and wallpapers (${COST.wall}).</p>`);
  $('rd').onclick=async()=>{if(!ok)return;$('rd').disabled=true;try{await db.collection('users').doc(me.uid).update({coins:INC(DAILY),lastDaily:today()});closeModal();toast('+'+DAILY+' 🪙 collected!')}catch(e){toast('Could not collect: '+(e.code||e.message))}};
  $('rs').onclick=async()=>{if(!sh)return;const d={title:'Happy Friends',text:'Meet new friends on Happy Friends!',url:location.origin+location.pathname};
    try{navigator.share?await navigator.share(d):await navigator.clipboard.writeText(d.url)}catch(e){return}
    $('rs').disabled=true;await db.collection('users').doc(me.uid).update({coins:INC(SHARE),lastShare:today()});closeModal();toast('+'+SHARE+' 🪙 thanks for sharing!')};
}
$('tReward').onclick=$('coinBtn').onclick=rewards;

/* ---- stories ---- */
function renderStories(){
  const box=$('stories');if(!box)return;
  storiesShown=storiesAll.filter(x=>x.exp>Date.now()).sort((a,b)=>b.exp-a.exp);
  box.innerHTML=storiesShown.length?storiesShown.map((x,i)=>`<div class="st" data-i="${i}"><img loading="lazy" alt="" src="${esc(avatar({name:x.name,photo:x.photo}))}"><span>${esc(x.name)}</span></div>`).join(''):'<small style="color:var(--mut)">No stories yet. Post one!</small>';
}
$('stories').onclick=e=>{const el=e.target.closest('.st');if(el)openStory(storiesShown[el.dataset.i])};
async function openStory(x){
  if(!x||!me)return;
  try{if(me.uid!==x.uid)await db.collection('stories').doc(x.id).collection('views').doc(me.uid).set({uid:me.uid,name:(my&&my.name)||'Member',photo:(my&&my.photo)||'',viewedAt:TS()},{merge:true})}catch(err){console.warn('Story view could not be recorded:',err.code||err.message)}
  const own=me.uid===x.uid;let views='';
  if(own){try{const vs=await db.collection('stories').doc(x.id).collection('views').get();views=`<details class="story-viewers" open><summary>👀 Viewers (${vs.size})</summary>${vs.docs.map(v=>`<div>${esc(v.data().name||'Member')}</div>`).join('')||'<small>No viewers yet</small>'}</details>`}catch(err){views='<small>Viewer list unavailable. Check Firestore rules.</small>'}}
  modal(`<h2>${esc(x.name)}</h2><img class="big" alt="" src="${esc(safeImg(x.img))}"><p style="margin-top:8px">${esc(x.text)}</p>${own?views:`<form id="storyReplyForm" class="story-reply-form"><input id="storyReplyInput" maxlength="500" placeholder="Reply to ${esc(x.name)}'s story…" autocomplete="off"><button class="btn" type="submit">Send reply</button></form>`}${own?'<button class="btn danger" id="deleteMyStory" type="button">Delete my story</button>':''}<button class="btn alt" onclick="closeModal()">Close</button>`);
  if(own){$('deleteMyStory').onclick=async()=>{if(!confirm('Delete this story? This cannot be undone.'))return;try{await db.collection('stories').doc(x.id).delete();closeModal();toast('Your story was deleted')}catch(err){console.error('Story delete failed:',err);toast('Story delete failed: '+(err.code||err.message))}}}
  else $('storyReplyForm').onsubmit=async ev=>{
    ev.preventDefault();const input=$('storyReplyInput'),btn=$('storyReplyForm').querySelector('button'),reply=input.value.trim();
    if(!reply)return toast('Type a reply first');if(!my)return toast('Your profile is still loading');
    btn.disabled=true;
    try{await db.collection('messages').add({room:dmId(x.uid),from:me.uid,to:x.uid,participants:[me.uid,x.uid],isPrivate:true,name:my.name||'Member',gender:my.gender||'',photo:'',text:reply,img:'',createdAt:Date.now(),ts:TS(),storyReply:{storyId:x.id,storyOwner:x.uid,storyOwnerName:x.name||'Member',storyText:x.text||''}});input.value='';closeModal();toast('Story reply sent to inbox 💌')}
    catch(err){console.error('Story reply failed:',err);toast('Reply not sent: '+(err.code||err.message))}finally{btn.disabled=false}
  };
}
$('tStory').onclick=()=>{
  if(!my)return;
  if(my.accountType==='guest')return toast('Stories are for registered users. Register with Google to post stories.');
  modal(`<h2>New story</h2><p style="color:var(--mut)">Lasts 24 hours · ${COST.story} 🪙</p><label>Photo</label><input type="file" id="sf" accept="image/*"><label>Caption</label><input id="sc" maxlength="80"><button class="btn" id="sg">Post story</button>`);
  $('sg').onclick=async()=>{
    const f=$('sf').files[0];if(!f)return toast('Choose a photo');
    const b=$('sg');setBusy(b,true,'Posting…');
    try{
      const img=await imageToDataUrl(f,1000,500*1024);
      if(!await spend(COST.story))return;
      await db.collection('stories').add({uid:me.uid,name:my.name,photo:my.photo||'',img,text:$('sc').value,ts:TS(),exp:Date.now()+864e5});
      closeModal();toast('Story posted ✨');
    }catch(err){console.error(err);toast('Story upload failed: '+(err.code||err.message))}finally{setBusy(b,false)}
  };
};

/* ---- profile ---- */
$('tProfile').onclick=$('meImg').onclick=()=>{
  if(!my)return toast('Your profile is still loading');
  const guest=my.accountType==='guest';
  modal(`<h2>My profile</h2><span class="avw${isVip(my)?' vip-ring':''}"><img class="av" id="pv" src="${esc(avatar(my))}" style="width:80px;height:80px" alt=""></span>
  <p style="margin-top:6px">${nameHtml(my)} · ${esc(my.age||'')}</p>
  ${guest?'<p style="color:var(--mut);font-size:13px">Register with Google to upload a profile picture and unlock stories and chat wallpapers.</p>':'<label>Change picture</label><input type="file" id="pf" accept="image/*">'}
  <label>Name</label><input id="pn" maxlength="24" value="${esc(my.name)}"><label>Location</label><input id="pl" value="${esc(my.location)}" placeholder="e.g. Kandy, Sri Lanka" maxlength="40">
  <label>Looking for</label><select id="pk">${['Friendship','Short term relationship','Long term relationship','To marry','Fun'].map(x=>`<option ${x===my.looking?'selected':''}>${x}</option>`).join('')}</select>
  <button class="btn" id="ps">Save</button>${guest?'<button class="btn alt" id="upgrade">Register with Google</button>':''}`);
  let pic=my.photo;
  if(!guest)$('pf').onchange=async e=>{if(e.target.files[0]){try{toast('Uploading profile photo…');pic=await uploadImage(e.target.files[0],'profile',500);$('pv').src=pic}catch(err){console.error(err);toast('Photo upload failed: '+(err.code||err.message))}}};
  $('ps').onclick=async()=>{const b=$('ps');setBusy(b,true,'Saving…');const update={name:$('pn').value.trim()||my.name,location:$('pl').value.trim(),looking:$('pk').value};if(!guest)update.photo=pic||'';try{await db.collection('users').doc(me.uid).update(update);closeModal();toast('Profile saved')}catch(e){toast('Could not save: '+(e.code||e.message));setBusy(b,false)}};
  if(guest)$('upgrade').onclick=async()=>{const b=$('upgrade');setBusy(b,true,'Opening Google…');try{const result=await auth.currentUser.linkWithPopup(googleProvider);const batch=db.batch();batch.update(db.collection('users').doc(me.uid),{accountType:'registered',photo:result.user.photoURL||''});batch.set(db.collection('userPrivate').doc(me.uid),{email:result.user.email||'',updatedAt:TS()},{merge:true});await batch.commit();closeModal();toast('Google registration complete!')}catch(e){toast(authErrorMessage(e));setBusy(b,false)}};
};
$('tOut').onclick=()=>{
  if(!me)return;
  if(my&&my.accountType==='guest'&&!confirm('Guest accounts cannot be recovered after logging out. Register with Google first (Profile → Register with Google) to keep your account. Log out anyway?'))return;
  clearTypingDoc();
  db.collection('users').doc(me.uid).update({lastSeen:firebase.firestore.Timestamp.fromMillis(0)}).catch(()=>{}).finally(()=>auth.signOut());
};
window.addEventListener('pagehide',clearTypingDoc);
