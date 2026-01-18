<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Cityguard – Térkép</title>

  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div class="logo">CG</div>
      <div class="brand-text">
        <div class="brand-title">Cityguard</div>
        <div class="brand-sub">Térkép nézet</div>
      </div>
    </div>

    <div class="topbar-right">
      <a class="btn btn-soft" href="./" style="color: white;">Bejelentések</a>
      <span id="me">Betöltés…</span>
      <button id="btnLogout" class="btn btn-ghost hidden" type="button">Kijelentkezés</button>
    </div>
  </header>

  <main class="container">
    <section class="card">
      <h2>Bejelentések a térképen</h2>
      <p class="muted">A markerre kattintva részletek jelennek meg.</p>

      <div id="map" style="height: 70vh; border-radius: 16px; overflow: hidden; border: 1px solid rgba(15,23,42,0.10);"></div>
      <p id="mapMsg" class="msg"></p>
    </section>
  </main>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="assets/js/map.js"></script>
</body>
</html>
