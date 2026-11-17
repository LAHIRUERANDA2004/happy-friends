/* =====================================================================
   HAPPY FRIENDS – PAYMENTS (Lemon Squeezy)
   1) Create the 6 products in Lemon Squeezy (see README.txt)
   2) Paste each product's CHECKOUT URL below (Share > Copy link)
   ===================================================================== */
const LS_CHECKOUT = {
  vip_week:   'PASTE_LEMON_SQUEEZY_CHECKOUT_URL_VIP_1_WEEK',
  vip_month:  'PASTE_LEMON_SQUEEZY_CHECKOUT_URL_VIP_1_MONTH',
  vip_year:   'PASTE_LEMON_SQUEEZY_CHECKOUT_URL_VIP_1_YEAR',
  coins_150:  'PASTE_LEMON_SQUEEZY_CHECKOUT_URL_150_COINS',
  coins_500:  'PASTE_LEMON_SQUEEZY_CHECKOUT_URL_500_COINS',
  coins_1500: 'PASTE_LEMON_SQUEEZY_CHECKOUT_URL_1500_COINS'
};
const PLANS = {
  vip_week:   {type:'vip',   label:'VIP – 1 Week',  price:1,  days:7},
  vip_month:  {type:'vip',   label:'VIP – 1 Month', price:2,  days:30},
  vip_year:   {type:'vip',   label:'VIP – 1 Year',  price:10, days:365},
  coins_150:  {type:'coins', label:'150 Coins',     price:1,  coins:150},
  coins_500:  {type:'coins', label:'500 Coins',     price:2,  coins:500},
  coins_1500: {type:'coins', label:'1,500 Coins',   price:5,  coins:1500}
};
const _fbCfg={apiKey:"AIzaSyA0n4NrCBhD-kQ_4ZifeAWVm045Rm8Jdrc",authDomain:"happy-friends-8f840.firebaseapp.com",projectId:"happy-friends-8f840",appId:"1:549080403446:web:fb2a894fddbc135cb24bd7"};
const _app = firebase.apps.length ? firebase.app() : firebase.initializeApp(_fbCfg);
const _auth = firebase.auth(), _db = firebase.firestore();

/* productType: 'vip' | 'coins'   planId: key of PLANS */
async function buyWithLemonSqueezy(productType, planId){
  const plan = PLANS[planId];
  if(!plan || plan.type !== productType){ alert('Unknown plan.'); return; }
  const u = _auth.currentUser;
  if(!u || u.isAnonymous){ alert('Please sign in with Google first. You will be taken to the home page.'); location.href='index.html'; return; }
  const base = LS_CHECKOUT[planId];
  if(!base || /^PASTE_/.test(base)){ alert('This checkout link is not configured yet.'); return; }
  let name = u.displayName || 'Member';
  try{ const s = await _db.collection('users').doc(u.uid).get(); if(s.exists) name = s.data().name || name; }catch(e){}
  try{   // log a pending payment intent (admin approves it after Lemon Squeezy confirms the order)
    await _db.collection('payments').add({uid:u.uid,email:u.email||'',name,plan:planId,productType,label:plan.label,
      amount:plan.price,currency:'USD',status:'pending',ts:firebase.firestore.FieldValue.serverTimestamp(),createdAt:Date.now()});
  }catch(e){ console.error('Could not log pending payment:',e); }
  const q = 'checkout[email]='+encodeURIComponent(u.email||'')+'&checkout[custom][user_id]='+encodeURIComponent(u.uid)+'&checkout[custom][plan]='+encodeURIComponent(planId);
  location.href = base + (base.indexOf('?')>-1 ? '&' : '?') + q;
}
