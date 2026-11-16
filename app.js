/* ===== 1. PASTE YOUR FIREBASE CONFIG ===== */
const firebaseConfig={apiKey:"AIzaSyA0n4NrCBhD-kQ_4ZifeAWVm045Rm8Jdrc",authDomain:"happy-friends-8f840.firebaseapp.com",projectId:"happy-friends-8f840",appId:"1:549080403446:web:fb2a894fddbc135cb24bd7"};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(),db=firebase.firestore(),TS=()=>firebase.firestore.FieldValue.serverTimestamp(),INC=n=>firebase.firestore.FieldValue.increment(n);
const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WALLS={Sunset:'linear-gradient(135deg,#ffd6a5,#ffadad)',Ocean:'linear-gradient(135deg,#a0e7e5,#b4f8c8)',Lavender:'linear-gradient(135deg,#cdb4db,#a2d2ff)',Mint:'linear-gradient(135deg,#d8f3dc,#fefae0)',Night:'linear-gradient(135deg,#243b55,#141e30)',Candy:'linear-gradient(135deg,#fbc2eb,#a6c1ee)'};
const COST={story:10,room:50,wall:30,vip:100},DAILY=20,SHARE=10,IMG=1;
let me=null,my=null,users={},room='public',roomTitle='# Public chat',unsub=null,first=true,start=Date.now(),timers=[];

/* theme */
function setTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem('hf-theme',t);$('themeBtn').textContent=$('themeBtn2').textContent=t==='dark'?'☀️':'🌙'}
setTheme(localStorage.getItem('hf-theme')||'light');
$('themeBtn').onclick=$('themeBtn2').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');

/* helpers */
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)}
function modal(html){$('modalBody').innerHTML=html;$('modal').hidden=false}
function closeModal(){$('modal').hidden=true}
$('modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
let ctx;function beep(f=880){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);o.start();o.stop(ctx.currentTime+.35)}catch(e){}}
function resize(file,max=800){return new Promise(res=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.7))};i.src=r.result};r.readAsDataURL(file)})}
async function spend(n){const ref=db.collection('users').doc(me.uid);try{await db.runTransaction(async t=>{const d=await t.get(ref);if((d.data().coins||0)<n)throw 0;t.update(ref,{coins:INC(-n)})});return true}catch(e){toast('Not enough coins 🪙');return false}}
const today=()=>new Date().toISOString().slice(0,10);
function status(u){const t=u.lastSeen?.toMillis?.()||0;if(Date.now()-t>90000)return'off';return u.away?'away':'on'}
const dmId=uid=>[me.uid,uid].sort().join('_');

/* auth */
document.querySelectorAll('[data-login]').forEach(b=>b.onclick=()=>auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>toast(e.message)));
$('guestJoin').onclick=()=>auth.signInAnonymously().catch(e=>toast('Guest sign-in failed: '+e.message));
auth.onAuthStateChanged(async u=>{
  if(!u){me=null;$('app').hidden=true;$('welcome').hidden=false;timers.forEach(clearInterval);return}
  me=u;const snap=await db.collection('users').doc(u.uid).get();
  if(!snap.exists){onboard();return}
  if(snap.data().suspended){await auth.signOut();alert('Your account is suspended.');return}
  begin();
});
function onboard(){
  const guest=!!me.isAnonymous;
  const lookHtml='<label>Looking for</label><select id="oLook">'+['Friendship','Short term relationship','Long term relationship','To marry','Fun'].map(x=>'<option>'+x+'</option>').join('')+'</select>';
  modal(`<h2>${guest?'Join as a Guest 👋':'Welcome! 🎉'}</h2>
  <p style="color:var(--mut)">${guest?'Guest accounts can chat. Stories, chat wallpapers and profile picture uploads require Google registration.':'You must be 18 or older.'}</p>
  <label>Your name</label><input id="oName" value="${esc(guest?'':me.displayName||'')}">
  <label>Age</label><input id="oAge" type="number" min="18" max="100" inputmode="numeric" placeholder="Your age">
  <label>Gender</label><select id="oGender"><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select>
  ${guest?'':lookHtml}
  <button class="btn" id="oGo">Join Happy Friends</button>`);
  $('oGo').onclick=async()=>{
    const name=$('oName').value.trim(),age=Number($('oAge').value),gender=$('oGender').value;
    if(!name)return toast('Enter your name');
    if(!Number.isInteger(age)||age<18||age>100)return toast('You must be 18 or older');
    if(!gender)return toast('Select your gender');
    const data={name,age,gender,accountType:guest?'guest':'registered',photo:guest?'':(me.photoURL||''),email:guest?'':(me.email||''),location:'',looking:guest?'Guest':$('oLook').value,coins:guest?0:50,lastDaily:'',lastShare:'',away:false,lastSeen:TS(),suspended:false,wallpaper:'',created:TS()};
    await db.collection('users').doc(me.uid).set(data);
    closeModal();begin();
  };
}

/* app start */
function begin(){
  $('welcome').hidden=true;$('app').hidden=false;
  db.collection('users').doc(me.uid).onSnapshot(d=>{my=d.data();if(!my)return;if(my.suspended){auth.signOut();return}
    $('coins').textContent=my.coins||0;$('meImg').src=my.photo||'';$('msgs').style.backgroundImage=my.wallpaper?WALLS[my.wallpaper]:'none';$('vipBtn').textContent=(my.vipUntil||0)>Date.now()?'⭐ VIP active':'⭐ Get VIP';$('vipBtn').classList.toggle('vip-active',(my.vipUntil||0)>Date.now())});
  db.collection('users').onSnapshot(s=>{users={};s.forEach(d=>users[d.id]=d.data());renderUsers()});
  const ping=()=>db.collection('users').doc(me.uid).update({lastSeen:TS(),away:document.hidden}).catch(()=>{});
  ping();timers.push(setInterval(ping,30000),setInterval(renderUsers,30000));
  document.addEventListener('visibilitychange',ping);
  db.collection('rooms').onSnapshot(s=>{$('rooms').innerHTML=`<div class="r ${room==='public'?'on':''}" data-r="public"># Public chat</div>`+s.docs.map(d=>`<div class="r ${room===d.id?'on':''}" data-r="${d.id}"># ${esc(d.data().name)}</div>`).join('');
    document.querySelectorAll('[data-r]').forEach(e=>e.onclick=()=>{openRoom(e.dataset.r,e.textContent);$('side').classList.remove('open')})});
  db.collection('stories').where('exp','>',Date.now()).onSnapshot(s=>{const l=s.docs.map(d=>d.data()).sort((a,b)=>b.exp-a.exp);
    $('stories').innerHTML=l.length?l.map((x,i)=>`<div class="st" data-i="${i}"><img src="${x.photo||''}"><span>${esc(x.name)}</span></div>`).join(''):'<small style="color:var(--mut)">No stories yet. Post one!</small>';
    document.querySelectorAll('.st').forEach(e=>e.onclick=()=>{const x=l[e.dataset.i];modal(`<h2>${esc(x.name)}</h2><img class="big" src="${x.img}"><p style="margin-top:8px">${esc(x.text)}</p><button class="btn" onclick="closeModal()">Close</button>`)})});
  // incoming DM alerts
  db.collection('messages').where('to','==',me.uid).onSnapshot(s=>s.docChanges().forEach(c=>{const m=c.doc.data();if(c.type==='added'&&m.ts&&m.ts.toMillis()>start&&m.room!==room){beep(660);toast('💌 '+m.name+': '+(m.text||'sent a photo'))}}));
  openRoom('public','# Public chat');
  if(my&&my.lastDaily!==today())setTimeout(rewards,800);
}
function renderUsers(){
  const l=Object.entries(users).filter(([id])=>id!==me.uid&&!users[id].suspended).map(([id,u])=>({id,u,s:status(u)})).sort((a,b)=>Number((b.u.vipUntil||0)>Date.now())-Number((a.u.vipUntil||0)>Date.now())||'on away off'.indexOf(a.s)-'on away off'.indexOf(b.s));
  $('users').innerHTML=l.map(({id,u,s})=>`<div class="u" data-u="${id}"><img src="${u.photo||''}"><div><b>${esc(u.name)} ${(u.vipUntil||0)>Date.now()?'<span class="vip-badge">VIP</span>':''}</b><small>${esc(u.location||'')} · ${esc(u.looking)}</small></div><i class="dot ${s}"></i></div>`).join('')||'<small>No users yet</small>';
  document.querySelectorAll('[data-u]').forEach(e=>e.onclick=()=>{openRoom(dmId(e.dataset.u),'💬 '+users[e.dataset.u].name,e.dataset.u);$('side').classList.remove('open')});
}
$('usersBtn').onclick=()=>$('side').classList.toggle('open');

/* chat */
let peer=null;
function openRoom(id,title,to){
  room=id;peer=to||null;roomTitle=title;$('roomName').textContent=title;first=true;if(unsub)unsub();
  unsub=db.collection('messages').where('room','==',id).orderBy('ts').limitToLast(100).onSnapshot(s=>{
    const box=$('msgs');box.innerHTML='';
    s.forEach(d=>{const m=d.data();if(!m.ts)return;const mine=m.from===me.uid;
      box.insertAdjacentHTML('beforeend',`<div class="m ${mine?'me':''}">${mine?'':`<b>${esc(m.name)}</b><br>`}${esc(m.text)}${m.img?`<img src="${m.img}">`:''}<time>${m.ts.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div>`)});
    box.scrollTop=box.scrollHeight;
    if(!first)s.docChanges().forEach(c=>{if(c.type==='added'&&c.doc.data().from!==me.uid)beep()});first=false;
  },e=>toast('Create the Firestore index (see console link)'));
}
async function send(text,img){
  if(!text&&!img)return;
  await db.collection('messages').add({room,from:me.uid,to:peer,name:my.name,photo:my.photo||'',text:text||'',img:img||'',ts:TS()});
  if(img&&peer){db.collection('users').doc(me.uid).update({coins:INC(IMG)});toast('+'+IMG+' 🪙 for sharing a photo')}
}
$('sendForm').onsubmit=e=>{e.preventDefault();const t=$('msgIn').value.trim();$('msgIn').value='';send(t)};
$('chatImg').onchange=async e=>{if(e.target.files[0])send('',await resize(e.target.files[0]));e.target.value=''};
$('randomBtn').onclick=()=>{const l=Object.entries(users).filter(([id,u])=>id!==me.uid&&!u.suspended&&status(u)!=='off');
  if(!l.length)return toast('Nobody is online right now');const [id,u]=l[Math.floor(Math.random()*l.length)];openRoom(dmId(id),'🎲 '+u.name,id);$('side').classList.remove('open')};
$('newRoom').onclick=()=>modal(`<h2>New chat room</h2><p style="color:var(--mut)">Costs ${COST.room} 🪙</p><label>Room name</label><input id="rn" maxlength="24"><button class="btn" id="rg">Create</button>`)||($('rg').onclick=async()=>{const n=$('rn').value.trim();if(!n)return;if(await spend(COST.room)){await db.collection('rooms').add({name:n,owner:me.uid,ts:TS()});closeModal();toast('Room created 🎉')}});

/* wallpaper */
$('wallBtn').onclick=()=>{if(my?.accountType==='guest')return toast('Chat wallpapers are for registered users. Register with Google to unlock this feature.');modal(`<h2>Chat wallpaper</h2><p style="color:var(--mut)">Each costs ${COST.wall} 🪙</p><div class="wp">${Object.entries(WALLS).map(([k,v])=>`<div data-w="${k}" style="background:${v}" title="${k}"></div>`).join('')}</div><button class="btn" onclick="closeModal()">Close</button>`);
  document.querySelectorAll('[data-w]').forEach(e=>e.onclick=async()=>{if(await spend(COST.wall)){await db.collection('users').doc(me.uid).update({wallpaper:e.dataset.w});closeModal()}})};

/* six-hour member VIP */
$('vipBtn').onclick=async()=>{if(my?.accountType==='guest')return toast('VIP is available to registered members only. Register with Google first.');if((my.vipUntil||0)>Date.now())return toast('Your VIP is active until '+new Date(my.vipUntil).toLocaleTimeString());if(!await spend(COST.vip))return;const until=Math.max(Date.now(),my.vipUntil||0)+6*60*60*1000;await db.collection('users').doc(me.uid).update({vipUntil:until,vipBy:'coins'});toast('VIP activated for 6 hours! ⭐')};

/* rewards */
function rewards(){const ok=my.lastDaily!==today(),sh=my.lastShare!==today();
  modal(`<h2>🎁 Rewards</h2><p>Balance: <b>${my.coins} 🪙</b></p>
  <button class="btn" id="rd" ${ok?'':'disabled style="opacity:.5"'}>${ok?`Collect daily ${DAILY} 🪙`:'Come back tomorrow'}</button>
  <button class="btn alt" id="rs" ${sh?'':'disabled style="opacity:.5"'}>Share site, get ${SHARE} 🪙</button>
  <p style="color:var(--mut);font-size:13px;margin-top:12px">Earn ${IMG} 🪙 for each photo you send in a private chat. Spend coins on stories (${COST.story}), rooms (${COST.room}) and wallpapers (${COST.wall}).</p>`);
  $('rd').onclick=async()=>{if(!ok)return;await db.collection('users').doc(me.uid).update({coins:INC(DAILY),lastDaily:today()});closeModal();toast('+'+DAILY+' 🪙 collected!')};
  $('rs').onclick=async()=>{if(!sh)return;const d={title:'Happy Friends',text:'Meet new friends on Happy Friends!',url:location.origin+location.pathname};
    try{navigator.share?await navigator.share(d):await navigator.clipboard.writeText(d.url)}catch(e){return}
    await db.collection('users').doc(me.uid).update({coins:INC(SHARE),lastShare:today()});closeModal();toast('+'+SHARE+' 🪙 thanks for sharing!')};
}
$('tReward').onclick=$('coinBtn').onclick=rewards;

/* stories */
$('tStory').onclick=()=>{if(my?.accountType==='guest')return toast('Stories are for registered users. Register with Google to post stories.');modal(`<h2>New story</h2><p style="color:var(--mut)">Lasts 24 hours · ${COST.story} 🪙</p><label>Photo</label><input type="file" id="sf" accept="image/*"><label>Caption</label><input id="sc" maxlength="80"><button class="btn" id="sg">Post story</button>`);
  $('sg').onclick=async()=>{const f=$('sf').files[0];if(!f)return toast('Choose a photo');if(!await spend(COST.story))return;
    await db.collection('stories').add({uid:me.uid,name:my.name,photo:my.photo||'',img:await resize(f),text:$('sc').value,ts:TS(),exp:Date.now()+864e5});closeModal();toast('Story posted ✨')}};

/* profile */
$('tProfile').onclick=$('meImg').onclick=()=>{
  const guest=my.accountType==='guest';
  modal(`<h2>My profile</h2><img class="av" id="pv" src="${my.photo||''}" style="width:80px;height:80px">
  ${guest?'<p style="color:var(--mut);font-size:13px">Register with Google to upload a profile picture and unlock stories and chat wallpapers.</p>':'<label>Change picture</label><input type="file" id="pf" accept="image/*">'}
  <label>Name</label><input id="pn" value="${esc(my.name)}"><label>Location</label><input id="pl" value="${esc(my.location)}" placeholder="e.g. Kandy, Sri Lanka">
  <label>Looking for</label><select id="pk">${['Friendship','Short term relationship','Long term relationship','To marry','Fun'].map(x=>`<option ${x===my.looking?'selected':''}>${x}</option>`).join('')}</select>
  <button class="btn" id="ps">Save</button>${guest?'<button class="btn alt" id="upgrade">Register with Google</button>':''}`);
  let pic=my.photo;
  if(!guest)$('pf').onchange=async e=>{if(e.target.files[0]){pic=await resize(e.target.files[0],200);$('pv').src=pic}};
  $('ps').onclick=async()=>{const update={name:$('pn').value.trim()||my.name,location:$('pl').value.trim(),looking:$('pk').value};if(!guest)update.photo=pic;await db.collection('users').doc(me.uid).update(update);closeModal();toast('Profile saved')};
  if(guest)$('upgrade').onclick=async()=>{try{const result=await auth.currentUser.linkWithPopup(new firebase.auth.GoogleAuthProvider());await db.collection('users').doc(me.uid).update({accountType:'registered',email:result.user.email,photo:result.user.photoURL||''});closeModal();toast('Google registration complete!')}catch(e){toast('Registration failed: '+e.message)}};
};
$('tOut').onclick=()=>{db.collection('users').doc(me.uid).update({lastSeen:firebase.firestore.Timestamp.fromMillis(0)}).finally(()=>auth.signOut())};
