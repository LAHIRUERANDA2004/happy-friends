const BOT_COUNTRIES=['LK','LK','LK','LK','LK','IN','IN','US','GB','CA','AU','AE','DE','FR','SG','MY','PK','BD','NP','QA','IT','JP','ZA','NZ','NL','SE','KR','TR','BR','ID','PH','TH','SA','KW','MV','CH','ES'];
/* =====================================================================
   HAPPY FRIENDS — SIMULATED BOTS (client-side only, nothing is written
   to Firestore by bots)
   ---------------------------------------------------------------------
   Everything is derived from the current time with a seeded random
   generator, so every visitor sees the SAME bots and the SAME bot
   messages at the same moment, without any server.

   • Female bots online fluctuate between FEMALE_MIN..FEMALE_MAX
   • Male bots online fluctuate between MALE_MIN..MALE_MAX
   • Names rotate automatically every hour (see bot-names.js)
   ===================================================================== */
const BOT_CONFIG = {
  enabled: true,           // set to false to switch all bots off
  labelAsBot: false,       // true = show a small "bot" tag next to bot names
  FEMALE_MIN: 3, FEMALE_MAX: 5,
  MALE_MIN: 4,   MALE_MAX: 7,
  COUNT_SLOT_MS: 45000,    // how often the online count may change
  NAME_ROTATE_MS: 60 * 60 * 1000, // names change every hour
  CHAT_SLOT_MS: 35000,     // one possible bot message per slot
  CHAT_PROB_PUBLIC: 0.6,   // chance of a bot message per slot in Public chat
  CHAT_PROB_OTHER: 0.35    // ... in other rooms
};

const BOT_CITIES = ['Colombo', 'Kandy', 'Galle', 'Kurunegala', 'Negombo', 'Matara', 'Gampaha', 'Jaffna', 'Kegalle', 'Anuradhapura', 'Ratnapura', 'Badulla'];
const BOT_LOOKING = ['Friendship', 'Friendship', 'Fun', 'Long term relationship'];

/* ---- friendly, wholesome messages (English + a little Singlish) ---- */
const BOT_MESSAGES = [
  'Hi everyone 👋', 'Hello! How is everyone today? 😊', 'Kohomada? 😄', 'Good morning friends ☀️',
  'Hey hey! Anyone up for a chat?', 'Hi! I am new here, nice to meet you all 🙌', 'Supiri day today! 😎',
  'What are you all up to?', 'Hello hello 😁', 'Ayubowan everyone 🙏', 'Hi! Where are you all from?',
  'Anyone watching the cricket? 🏏', 'Just had some rice and curry, so good 😋', 'Rain again in my area 🌧️',
  'What music are you listening to right now? 🎧', 'Machan, kohomada oyata?', 'I love this chat, so friendly 💛',
  'Happy to be here 😊', 'Hi hi, anyone from Colombo?', 'Monawada karanne? 😄', 'Any movie suggestions for tonight? 🎬',
  'Tea or coffee? I always pick tea ☕', 'Long day at work, just relaxing now 😌', 'Hello from Kandy! 🌄',
  'Hi everyone, hope you are all doing great ✨', 'Weekend plans anyone?', 'Anyone here like travelling? ✈️',
  'I just finished a good book 📚', 'Heyyy 😄', 'Nice to see so many people online today!',
  'Lol that is funny 😂', 'Haha true 😂', 'Same here 😄', 'Agree with that 👍', 'Wow nice! 😍',
  'Welcome to the chat everyone 🎉', 'Hope you all have a lovely day 🌸', 'Good night soon, but chatting a bit more 🌙',
  'What is your favourite Sri Lankan food? 🍛', 'Mine is kottu, hands down 😆', 'Hi, how was your day?',
  'Anyone playing games tonight? 🎮', 'Kawuruda inne? 👀', 'Hello from Galle 🌊', 'Sorry, I was away for a bit 😅',
  'Back again! Did I miss anything?', 'This is such a nice community 💬', 'I love sunsets, today was beautiful 🌅',
  'Best place to visit in Sri Lanka? Ella for me ⛰️', 'Hi all, quick break from studying 📖', 'Good vibes only ✌️'
];
const BOT_REPLIES = [
  'Hi! 😊 Nice to meet you', 'Hello! How are you?', 'Haha 😄', 'Kohomada? Hondata inne neda?', 'Thanks for saying hi! 💛',
  'I am good, just chilling 😌', 'That sounds nice!', 'Same here 😄', 'Ayubowan! 🙏', 'Tell me more about you?',
  'Haha true 😂', 'Nice 👍', 'What are you up to today?', 'Lovely, have a great day ✨', 'Oh really? That is cool 😊'
];
const BOT_WELCOMES = ['Welcome {name}! 👋', 'Hi {name}, nice to see you here 😊', 'Hello {name}! Welcome 🎉', 'Hey {name}, ayubowan! 🙏'];

/* ---- seeded random helpers ---- */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function seededShuffle(arr, seed) { const a = arr.slice(), r = mulberry32(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---- roster: who is online at time t ---- */
const _rosterCache = {};
function botPoolForHour(hourSlot) {
  if (_rosterCache[hourSlot]) return _rosterCache[hourSlot];
  const uniq = arr => Array.from(new Set((arr || []).map(x => String(x).trim()).filter(Boolean)));
  const f = seededShuffle(uniq(typeof femaleNames !== 'undefined' ? femaleNames : []), hourSlot * 31 + 7).slice(0, BOT_CONFIG.FEMALE_MAX);
  const m = seededShuffle(uniq(typeof maleNames !== 'undefined' ? maleNames : []), hourSlot * 17 + 3).slice(0, BOT_CONFIG.MALE_MAX);
  const mk = (name, gender) => {
    const h = hashStr(gender + name + hourSlot);
    return { id: 'bot_' + (gender === 'Female' ? 'f' : 'm') + '_' + hashStr(name + gender), name, gender, isBot: true, age: 19 + h % 16, location: BOT_CITIES[h % BOT_CITIES.length], looking: BOT_LOOKING[h % BOT_LOOKING.length], countryCode: BOT_COUNTRIES[(h >> 3) % BOT_COUNTRIES.length] };
  };
  const pool = { female: f.map(n => mk(n, 'Female')), male: m.map(n => mk(n, 'Male')) };
  Object.keys(_rosterCache).forEach(k => { if (Number(k) < hourSlot - 2) delete _rosterCache[k]; });
  return (_rosterCache[hourSlot] = pool);
}
function botsOnlineAt(t) {
  if (!BOT_CONFIG.enabled) return [];
  t = t || Date.now();
  const pool = botPoolForHour(Math.floor(t / BOT_CONFIG.NAME_ROTATE_MS));
  const r = mulberry32(Math.floor(t / BOT_CONFIG.COUNT_SLOT_MS) * 7919 + 13);
  const fc = Math.min(pool.female.length, BOT_CONFIG.FEMALE_MIN + Math.floor(r() * (BOT_CONFIG.FEMALE_MAX - BOT_CONFIG.FEMALE_MIN + 1)));
  const mc = Math.min(pool.male.length, BOT_CONFIG.MALE_MIN + Math.floor(r() * (BOT_CONFIG.MALE_MAX - BOT_CONFIG.MALE_MIN + 1)));
  // interleave so the list looks natural
  const out = [], F = pool.female.slice(0, fc), M = pool.male.slice(0, mc);
  for (let i = 0; i < Math.max(F.length, M.length); i++) { if (M[i]) out.push(M[i]); if (F[i]) out.push(F[i]); }
  return out;
}
function botById(id) {
  const t = Date.now();
  const hour = Math.floor(t / BOT_CONFIG.NAME_ROTATE_MS);
  for (const h of [hour, hour - 1]) { const p = botPoolForHour(h); const b = [...p.female, ...p.male].find(x => x.id === id); if (b) return b; }
  return null;
}

/* ---- bot chatter: a deterministic (optional) message for each time slot ---- */
function botEventForSlot(roomId, slot) {
  if (!BOT_CONFIG.enabled) return null;
  const r = mulberry32((hashStr(String(roomId)) ^ Math.imul(slot, 2654435761)) >>> 0);
  const p = roomId === 'public' ? BOT_CONFIG.CHAT_PROB_PUBLIC : BOT_CONFIG.CHAT_PROB_OTHER;
  if (r() > p) return null;
  const at = slot * BOT_CONFIG.CHAT_SLOT_MS + Math.floor(r() * BOT_CONFIG.CHAT_SLOT_MS * 0.8);
  const online = botsOnlineAt(at);
  if (!online.length) return null;
  const bot = online[Math.floor(r() * online.length)];
  const text = BOT_MESSAGES[Math.floor(r() * BOT_MESSAGES.length)];
  return { id: 'botmsg_' + roomId + '_' + slot, at, bot, text };
}
/* all bot messages for a room between two times (used for history + live) */
function botEventsBetween(roomId, from, to) {
  const out = [], s0 = Math.floor(from / BOT_CONFIG.CHAT_SLOT_MS), s1 = Math.floor(to / BOT_CONFIG.CHAT_SLOT_MS);
  for (let s = s0; s <= s1; s++) { const e = botEventForSlot(roomId, s); if (e && e.at >= from && e.at <= to) out.push(e); }
  return out;
}
function botReplyText() { return BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)]; }
function botWelcomeText(name) { return BOT_WELCOMES[Math.floor(Math.random() * BOT_WELCOMES.length)].replace('{name}', name); }
