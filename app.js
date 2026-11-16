<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Happy Friends – Meet, chat, make friends</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<!-- WELCOME PAGE -->
<section id="welcome">
  <header class="top">
    <a class="logo" href="index.html" aria-label="Happy Friends home"><img src="logo.svg?v=2" width="42" height="42" alt="" onerror="this.style.display='none'"><span class="brand-word"><span>Happy</span><b>Friends</b></span></a>
    <div class="row">
      <a class="btn ghost" href="freesites.html">Free Websites</a><button class="icon" id="themeBtn" title="Change theme">🌙</button>
      <button class="btn ghost" data-login>Log in</button>
      <button class="btn" data-login>Sign in</button>
    </div>
  </header>
  <div class="hero">
    <h1>Say hi. Make a <span class="rot">friend</span> today.</h1>
    <p>Public chat rooms, private messages, 24-hour stories and daily coin rewards. Free to join with Google. 18+ only.</p>
    <button class="btn big pulse" data-login>Continue with Google</button><p id="authStatus" hidden style="margin:12px auto;color:var(--mut);font-size:13px">Connecting to Happy Friends…</p><div style="margin-top:12px"><button class="btn ghost" id="guestJoin">Join as Guest</button></div>
    <div class="bubbles"><i>👋</i><i>💬</i><i>🎁</i><i>📸</i><i>😊</i></div>
  </div>
</section>

<!-- APP -->
<section id="app" hidden>
  <header class="top">
    <button class="icon" id="usersBtn" title="Online users">👥</button>
    <a class="logo sm" href="index.html" aria-label="Happy Friends home"><img src="logo.svg?v=2" width="34" height="34" alt="" onerror="this.style.display='none'"><span class="brand-word"><span>Happy</span><b>Friends</b></span></a>
    <div class="row">
      <a class="btn ghost sm" href="freesites.html">Free Websites</a><button class="btn vip-btn sm" id="vipBtn">⭐ Get VIP</button>
      <button class="coin" id="coinBtn">🪙 <b id="coins">0</b></button>
      <button class="icon" id="themeBtn2">🌙</button>
      <img id="meImg" class="av" alt="me">
    </div>
  </header>
  <div class="stories" id="stories"></div>
  <div class="layout">
    <aside id="side">
      <h3>Rooms</h3>
      <div id="rooms"></div>
      <div class="row wrap"><button class="btn sm" id="newRoom">+ Room (50🪙)</button><button class="btn sm alt" id="randomBtn">🎲 Random chat</button></div>
      <h3>Private Inbox</h3><div id="dmInbox" class="dm-inbox"></div>\n            <h3>Users <small class="legend"><i class="dot on"></i>online <i class="dot away"></i>away <i class="dot off"></i>offline</small></h3>
      <div id="users"></div>
    </aside>
    <main>
      <div class="chathead"><b id="roomName"># Public chat</b><button class="icon" id="wallBtn" title="Wallpaper">🖼️</button></div>
      <div id="msgs"></div>
      <form id="sendForm">
        <label class="icon">📷<input type="file" id="chatImg" accept="image/*" hidden></label>
        <input id="msgIn" placeholder="Type a message…" autocomplete="off">
        <button class="btn">Send</button>
      </form>
    </main>
  </div>
  <nav class="bottom"><button id="tProfile">👤 Profile</button><button id="tStory">➕ Story</button><button id="tReward">🎁 Rewards</button><button id="tOut">🚪 Log out</button></nav>
</section>


<footer id="siteFooter" class="site-footer">
  <div class="footer-brand"><a class="logo footer-logo" href="index.html"><img src="logo.svg?v=2" width="54" height="54" alt=""><span class="brand-word"><span>Happy</span><b>Friends</b></span></a><small>© <span id="footerYear"></span> Happy Friends</small></div>
  <div class="footer-right"><p>Meet new people, make friends and stay connected with Happy Friends.</p><nav id="socialLinks" class="social-links" aria-label="Social media"></nav></div>
</footer>

<!-- MODAL (shared) -->
<div id="modal" hidden><div class="card" id="modalBody"></div></div>
<div id="toast"></div>

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>
<script src="app.js"></script>
</body>
</html>
