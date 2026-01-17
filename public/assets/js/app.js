const API_BASE = "/cityguard/api/";

const SZEREPKOR_HU = {
  admin: "Adminisztrátor",
  staff: "Ügyintéző",
  citizen: "Lakos",
};
const STATUSZ_HU = {
  new: "Új",
  in_progress: "Folyamatban",
  resolved: "Megoldva",
  rejected: "Elutasítva",
};
const statusHu = (s) => STATUSZ_HU[s] ?? s;

function $(sel) {
  return document.querySelector(sel);
}

async function api(path, method = "GET", body = null) {
  const opt = { method, headers: {} };
  if (body !== null) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

function setText(el, text = "") {
  if (el) el.textContent = text || "";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showAuthPanel(which) {
  $("#loginCard").classList.toggle("hidden", which !== "login");
  $("#registerCard").classList.toggle("hidden", which !== "register");
  setText($("#loginMsg"), "");
  setText($("#regMsg"), "");
}

function showAuthedUI(user) {
  $("#authWrap").classList.toggle("hidden", !!user);
  $("#newReportCard").classList.toggle("hidden", !user);
  $("#reportsCard").classList.toggle("hidden", !user);
  $("#btnLogout").classList.toggle("hidden", !user);

  if (!user) {
    setText($("#me"), "Nincs bejelentkezve");
    $("#roleBadge").textContent = "—";
    showAuthPanel("login");
    return;
  }

  setText($("#me"), `${user.name} (${SZEREPKOR_HU[user.role] ?? user.role})`);
  $("#roleBadge").textContent = SZEREPKOR_HU[user.role] ?? user.role;
}

let ME = null;

/* ===== HELY meghatározás (GPS vagy térkép) ===== */
let LOCATION = { lat: null, lng: null, acc: null, method: "gps" };

let reportMap = null;
let reportMarker = null;

function updateLocationUI() {
  const gpsEl = $("#gpsStatus");
  const mapEl = $("#mapStatus");

  if (!gpsEl || !mapEl) return;

  if (LOCATION.lat === null || LOCATION.lng === null) {
    setText(gpsEl, "Helymeghatározás: nincs megadva.");
    setText(mapEl, "Nincs helyszín kiválasztva.");
    return;
  }

  const coords = `${LOCATION.lat.toFixed(6)}, ${LOCATION.lng.toFixed(6)}`;
  const accTxt = LOCATION.acc ? ` (±${Math.round(LOCATION.acc)} m)` : "";

  if (LOCATION.method === "gps") {
    setText(gpsEl, `GPS OK: ${coords}${accTxt}`);
    setText(mapEl, "Nincs helyszín kiválasztva.");
  } else {
    setText(gpsEl, "Helymeghatározás: nincs megadva.");
    setText(mapEl, `Térképen kijelölve: ${coords}`);
  }
}

async function getGps() {
  setText($("#createMsg"), "");

  if (!("geolocation" in navigator)) {
    setText($("#createMsg"), "A böngésző nem támogatja a helymeghatározást.");
    return false;
  }

  setText($("#gpsStatus"), "Helymeghatározás folyamatban…");

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        LOCATION = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy,
          method: "gps",
        };
        updateLocationUI();
        resolve(true);
      },
      (err) => {
        LOCATION.lat = null;
        LOCATION.lng = null;
        LOCATION.acc = null;
        updateLocationUI();

        let msg = "Nem sikerült meghatározni a helyzetet.";
        if (err.code === 1) msg = "A helymeghatározás nincs engedélyezve.";
        if (err.code === 2) msg = "A helyzet jelenleg nem elérhető.";
        if (err.code === 3) msg = "Időtúllépés a helymeghatározásnál.";

        setText($("#createMsg"), msg);
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function initReportMap() {
  if (reportMap) return;

  reportMap = L.map("reportMap", {
    zoomControl: true,
  }).setView([47.4979, 19.0402], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(reportMap);

  reportMap.on("click", function (e) {
    LOCATION = {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      acc: null,
      method: "map",
    };

    if (reportMarker) {
      reportMarker.setLatLng(e.latlng);
    } else {
      reportMarker = L.marker(e.latlng, {
        draggable: true,
      }).addTo(reportMap);

      reportMarker.on("dragend", function (ev) {
        LOCATION.lat = ev.target.getLatLng().lat;
        LOCATION.lng = ev.target.getLatLng().lng;
        updateLocationUI();
      });
    }

    updateLocationUI();
  });
}

/* ===== kategóriák betöltése ===== */
async function loadCategories() {
  const sel = $("#categorySelect");
  sel.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— Válassz kategóriát —";
  sel.appendChild(ph);

  try {
    const data = await api("categories_list.php");
    if (!data.items || data.items.length === 0) {
      throw { error: "Nincs kategória az adatbázisban." };
    }

    data.items.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });

    // Alapértelmezett kiválasztás (ha van legalább egy kategória)
    if (data.items.length > 0) {
      sel.value = data.items[0].id;
    }
  } catch (e) {
    setText(
      $("#createMsg"),
      e.error || "Nem sikerült betölteni a kategóriákat.",
    );
  }
}

function canManage() {
  return ME && (ME.role === "admin" || ME.role === "staff");
}

/* ===== státusz módosítás ===== */
function addStatusControls(li, report) {
  if (!canManage()) return;

  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.gap = "8px";
  wrap.style.marginTop = "10px";
  wrap.style.alignItems = "center";
  wrap.style.flexWrap = "wrap";

  const sel = document.createElement("select");
  [
    ["new", "Új"],
    ["in_progress", "Folyamatban"],
    ["resolved", "Megoldva"],
    ["rejected", "Elutasítva"],
  ].forEach(([val, label]) => {
    const o = document.createElement("option");
    o.value = val;
    o.textContent = label;
    if (val === report.status) o.selected = true;
    sel.appendChild(o);
  });

  const btn = document.createElement("button");
  btn.className = "btn btn-soft";
  btn.type = "button";
  btn.textContent = "Mentés";

  const msg = document.createElement("span");
  msg.className = "muted small";

  btn.addEventListener("click", async () => {
    msg.textContent = "";
    try {
      await api("reports_update_status.php", "POST", {
        report_id: report.id,
        status: sel.value,
      });
      msg.textContent = "Mentve";
      await loadReports();
    } catch (e) {
      msg.textContent = e.error || "Hiba";
    }
  });

  wrap.appendChild(sel);
  wrap.appendChild(btn);
  wrap.appendChild(msg);
  li.appendChild(wrap);
}

/* ===== kommentek kezelése ===== */
async function loadComments(reportId, container) {
  container.innerHTML = `<div class="muted small">Betöltés…</div>`;
  try {
    const data = await api(
      `comments_list.php?report_id=${encodeURIComponent(reportId)}`,
    );
    const items = data.items ?? [];

    if (items.length === 0) {
      container.innerHTML = `<div class="muted small">Még nincs komment</div>`;
      return;
    }

    container.innerHTML = items
      .map(
        (c) => `
      <div class="comment">
        <div class="comment-head">
          <b>${escapeHtml(c.author)}</b>
          <span class="muted small">(${escapeHtml(SZEREPKOR_HU[c.author_role] ?? c.author_role)}) • ${escapeHtml(c.created_at)}</span>
        </div>
        <div>${escapeHtml(c.comment)}</div>
      </div>
    `,
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<div class="muted small">${escapeHtml(e.error || "Hiba a kommentek betöltésekor")}</div>`;
  }
}

function addCommentControls(li, report) {
  if (!canManage()) return;

  const box = document.createElement("div");
  box.className = "comment-box";

  box.innerHTML = `
    <div class="row" style="margin-top:12px; gap:10px;">
      <button class="btn btn-soft" type="button" data-action="toggle">Kommentek mutatása</button>
      <button class="btn btn-soft" type="button" data-action="thanks">Köszönő üzenet</button>
    </div>

    <div class="hidden" data-comments-container style="margin-top:12px;">
      <div class="comment-list"></div>

      <label style="margin:12px 0 6px; display:block;">Ügyintézői megjegyzés</label>
      <textarea rows="3" placeholder="pl. Köszönjük a bejelentést! A hibát rögzítettük, tervezett javítás: ..."></textarea>

      <div class="row" style="margin-top:10px; gap:10px;">
        <button class="btn btn-primary" type="button" data-action="send">Elküldés</button>
        <span class="muted small" data-msg></span>
      </div>
    </div>
  `;

  const toggleBtn = box.querySelector('[data-action="toggle"]');
  const thanksBtn = box.querySelector('[data-action="thanks"]');
  const container = box.querySelector("[data-comments-container]");
  const list = box.querySelector(".comment-list");
  const textarea = box.querySelector("textarea");
  const sendBtn = box.querySelector('[data-action="send"]');
  const msgEl = box.querySelector("[data-msg]");

  toggleBtn.addEventListener("click", async () => {
    container.classList.toggle("hidden");
    if (!container.classList.contains("hidden")) {
      await loadComments(report.id, list);
    }
  });

  thanksBtn.addEventListener("click", () => {
    textarea.value =
      "Köszönjük a bejelentést! A hibát rögzítettük, és hamarosan intézkedünk.";
    container.classList.remove("hidden");
    textarea.focus();
  });

  sendBtn.addEventListener("click", async () => {
    const comment = textarea.value.trim();
    if (!comment) {
      msgEl.textContent = "Írj be egy megjegyzést!";
      return;
    }

    msgEl.textContent = "";
    try {
      await api("comments_create.php", "POST", {
        report_id: report.id,
        comment,
      });
      textarea.value = "";
      msgEl.textContent = "Elküldve";
      await loadComments(report.id, list);
    } catch (e) {
      msgEl.textContent = e.error || "Hiba történt";
    }
  });

  li.appendChild(box);
}

/* ===== Bejelentések lista ===== */
async function loadReports() {
  const ul = $("#list");
  ul.innerHTML = "";

  const status = $("#filterStatus")?.value || "";
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";

  try {
    const data = await api(`reports_list.php${qs}`);

    if (!data.items || data.items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Nincs találat.";
      ul.appendChild(li);
      return;
    }

    data.items.forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="report-top">
          <div><b>#${r.id}</b> <span class="chip chip--${r.status}">${statusHu(r.status)}</span></div>
          <div class="muted small">${r.created_at}</div>
        </div>
        <div class="report-title">${escapeHtml(r.title)}</div>
        <div class="muted">${escapeHtml(r.category)} • ${escapeHtml(r.address)}</div>
        <div class="muted small">Beküldte: ${escapeHtml(r.created_by)}</div>
      `;

      addStatusControls(li, r);
      addCommentControls(li, r);

      ul.appendChild(li);
    });
  } catch (e) {
    const li = document.createElement("li");
    li.textContent = "Hiba történt a bejelentések betöltésekor.";
    ul.appendChild(li);
  }
}

/* ===== Auth refresh ===== */
async function refreshMe() {
  try {
    const data = await api("auth_me.php");
    ME = data.user;
    showAuthedUI(ME);

    if (ME) {
      await loadCategories();
      await loadReports();
      updateLocationUI();
    }
  } catch (e) {
    showAuthedUI(null);
  }
  return ME;
}

/* ===== Eseménykezelők ===== */

// Helyszín módszer váltás
document.querySelectorAll('input[name="locationMethod"]').forEach((radio) => {
  radio.addEventListener("change", function () {
    LOCATION.method = this.value;

    $("#gpsSection")?.classList.toggle("hidden", this.value !== "gps");
    $("#mapSection")?.classList.toggle("hidden", this.value !== "map");

    if (this.value === "map" && !reportMap) {
      initReportMap();
    }

    updateLocationUI();
  });
});

$("#btnGetGps")?.addEventListener("click", getGps);

$("#btnCreateReport")?.addEventListener("click", async () => {
  setText($("#createMsg"), "");

  const categoryId = Number($("#categorySelect")?.value);
  if (!categoryId) {
    setText($("#createMsg"), "Válassz kategóriát!");
    return;
  }

  const title = $("#reportTitle")?.value?.trim();
  if (!title) {
    setText($("#createMsg"), "Add meg a bejelentés címét!");
    return;
  }

  if (LOCATION.lat === null || LOCATION.lng === null) {
    setText(
      $("#createMsg"),
      "Kötelező helyszínt megadni (GPS vagy térképen jelölés)!",
    );
    return;
  }

  try {
    const payload = {
      category_id: categoryId,
      address: $("#reportAddress")?.value?.trim() || "",
      title: title,
      description: $("#reportDesc")?.value?.trim() || "",
      latitude: LOCATION.lat,
      longitude: LOCATION.lng,
    };

    const res = await api("reports_create.php", "POST", payload);

    setText(
      $("#createMsg"),
      `Sikeres beküldés! Bejelentés sorszáma: #${res.id}`,
    );

    // Reset űrlap
    $("#reportTitle").value = "";
    $("#reportDesc").value = "";
    $("#reportAddress").value = "";
    $("#categorySelect").value = "";

    LOCATION = { lat: null, lng: null, acc: null, method: "gps" };
    if (reportMarker) reportMarker.remove();
    reportMarker = null;
    if (reportMap) reportMap.setView([47.4979, 19.0402], 13);
    updateLocationUI();

    await loadReports();
  } catch (e) {
    setText($("#createMsg"), e.error || "Hiba történt a beküldés során");
  }
});

// Auth események
$("#toRegister")?.addEventListener("click", () => showAuthPanel("register"));
$("#toLogin")?.addEventListener("click", () => showAuthPanel("login"));

$("#btnLogin")?.addEventListener("click", async () => {
  setText($("#loginMsg"), "");
  try {
    await api("auth_login.php", "POST", {
      email: $("#loginEmail").value,
      password: $("#loginPassword").value,
    });
    setText($("#loginMsg"), "Sikeres belépés!");
    await refreshMe();
  } catch (e) {
    setText($("#loginMsg"), e.error || "Hibás email vagy jelszó");
  }
});

$("#btnRegister")?.addEventListener("click", async () => {
  setText($("#regMsg"), "");
  try {
    await api("auth_register.php", "POST", {
      name: $("#regName").value,
      email: $("#regEmail").value,
      password: $("#regPassword").value,
    });
    setText($("#regMsg"), "Sikeres regisztráció! Most jelentkezz be.");
    showAuthPanel("login");
    $("#loginEmail").value = $("#regEmail").value;
    $("#loginPassword").value = "";
    $("#loginPassword").focus();
  } catch (e) {
    setText($("#regMsg"), e.error || "Hiba történt a regisztráció során");
  }
});

$("#btnLogout")?.addEventListener("click", async () => {
  try {
    await api("auth_logout.php", "POST", {});
  } finally {
    LOCATION = { lat: null, lng: null, acc: null, method: "gps" };
    updateLocationUI();
    await refreshMe();
  }
});

$("#btnLoad")?.addEventListener("click", loadReports);
$("#filterStatus")?.addEventListener("change", loadReports);

/* ===== Inicializálás ===== */
document.addEventListener("DOMContentLoaded", () => {
  showAuthPanel("login");
  updateLocationUI();
  refreshMe();
});
