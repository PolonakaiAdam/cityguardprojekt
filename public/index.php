<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Cityguard</title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <div class="logo">CG</div>
      <div class="brand-text">
        <div class="brand-title">Cityguard</div>
        <div class="brand-sub">Városi bejelentő és ügykezelő rendszer</div>
      </div>
    </div>

    <div class="topbar-right">
      <a class="btn btn-soft" href="map.php" style="color: white;">Térkép</a>
      <span id="me">Betöltés…</span>
      <button id="btnLogout" class="btn btn-ghost hidden" type="button">Kijelentkezés</button>
    </div>
  </header>

  <main class="container">
    <!-- BEJELENTKEZÉS / REGISZTRÁCIÓ -->
    <section id="authWrap" class="auth-wrap">
      <!-- BELÉPÉS -->
      <section id="loginCard" class="card auth-card">
        <h2>Belépés</h2>
        <p class="muted">Jelentkezz be a bejelentések kezeléséhez.</p>

        <label>Email cím</label>
        <input id="loginEmail" placeholder="pl. valaki@email.hu" autocomplete="username" />

        <label>Jelszó</label>
        <input id="loginPassword" type="password" placeholder="jelszó" autocomplete="current-password" />

        <button id="btnLogin" class="btn btn-primary w100" type="button">Belépés</button>
        <p id="loginMsg" class="msg"></p>

        <div class="switch">
          <span class="muted">Nincs még fiókod?</span>
          <button id="toRegister" class="link-btn" type="button">Regisztrálok</button>
        </div>
      </section>

      <!-- REGISZTRÁCIÓ -->
      <section id="registerCard" class="card auth-card hidden">
        <h2>Regisztráció</h2>
        <p class="muted">Hozz létre fiókot pár másodperc alatt.</p>

        <label>Név</label>
        <input id="regName" placeholder="pl. Kovács Anna" autocomplete="name" />

        <label>Email cím</label>
        <input id="regEmail" placeholder="pl. valaki@email.hu" autocomplete="email" />

        <label>Jelszó (legalább 8 karakter)</label>
        <input id="regPassword" type="password" placeholder="jelszó" autocomplete="new-password" />

        <button id="btnRegister" class="btn btn-primary w100" type="button">Regisztráció</button>
        <p id="regMsg" class="msg"></p>

        <div class="switch">
          <span class="muted">Van már fiókod?</span>
          <button id="toLogin" class="link-btn" type="button">Belépek</button>
        </div>
      </section>
    </section>

    <!-- ÚJ BEJELENTÉS -->
    <section id="newReportCard" class="card hidden">
      <div class="card-head">
        <h2>Új bejelentés</h2>
        <span class="badge" id="roleBadge">—</span>
      </div>

      <div class="grid2">
        <div>
          <label>Kategória</label>
          <select id="categorySelect"></select>
        </div>
        <div>
          <label>Helyszín / cím (szöveg)</label>
          <input id="reportAddress" placeholder="pl. Szeged, Kossuth Lajos u. 12." />
        </div>
      </div>

      <label>Rövid cím</label>
      <input id="reportTitle" placeholder="pl. Nagy kátyú a kereszteződésben" />

      <label>Részletes leírás</label>
      <textarea id="reportDesc" rows="4" placeholder="Írd le röviden, mi a probléma, mióta tart, és miért sürgős."></textarea>

      <div class="card" style="margin-top:16px; padding:16px;">
        <b>Helymeghatározás (kötelező)</b>
        <p class="muted small" style="margin:8px 0 12px;">
          Válaszd ki, hogyan szeretnéd megadni a helyszínt:
        </p>

        <div class="row" style="gap: 16px; flex-wrap: wrap; align-items: center;">
          <label style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <input type="radio" name="locationMethod" value="gps" checked />
              GPS – aktuális pozíció
          </label>
          <label style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <input type="radio" name="locationMethod" value="map" />
              Térképen jelölés
          </label>
        </div>

        <div id="gpsSection" style="margin-top:16px;">
          <div class="row" style="align-items:center; gap:12px;">
            <span id="gpsStatus" class="muted">Helymeghatározás: nincs megadva.</span>
            <button id="btnGetGps" class="btn btn-soft" type="button">GPS lekérése</button>
          </div>
        </div>

        <div id="mapSection" class="hidden" style="margin-top:16px;">
          <div id="reportMap" style="height:320px; border-radius:12px; overflow:hidden; border:1px solid rgba(15,23,42,0.12);"></div>
          <p class="muted small" style="margin:8px 0;">Kattints a térképre a pontos helyszín kijelöléséhez (a jelölő húzható)</p>
          <span id="mapStatus" class="muted">Nincs helyszín kiválasztva.</span>
        </div>
      </div>

      <button id="btnCreateReport" class="btn btn-primary w100" type="button" style="margin-top:20px;">Bejelentés elküldése</button>
      <p id="createMsg" class="msg"></p>
    </section>

    <!-- BEJELENTÉSEK -->
    <section id="reportsCard" class="card hidden">
      <div class="row">
        <h2>Bejelentések</h2>
        <div class="row">
          <button id="btnLoad" class="btn btn-soft" type="button">Frissítés</button>
          <select id="filterStatus">
            <option value="">(összes állapot)</option>
            <option value="new">Új</option>
            <option value="in_progress">Folyamatban</option>
            <option value="resolved">Megoldva</option>
            <option value="rejected">Elutasítva</option>
          </select>
        </div>
      </div>

      <ul id="list" class="list"></ul>
    </section>
  </main>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>