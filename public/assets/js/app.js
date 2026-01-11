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
  el.textContent = text;
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

/* ===== GPS (kötelező) ===== */
let GPS = { lat: null, lng: null, acc: null };

function updateGpsUI() {
  const el = $("#gpsStatus");
  if (!el) return;

  if (GPS.lat === null || GPS.lng === null) {
    el.textContent = "Helymeghatározás: nincs megadva.";
    return;
  }
  el.textContent = `Helymeghatározás OK: ${GPS.lat.toFixed(
    5
  )}, ${GPS.lng.toFixed(5)} (±${Math.round(GPS.acc)} m)`;
}

async function getGps() {
  setText($("#createMsg"), "");

  if (!("geolocation" in navigator)) {
    setText($("#createMsg"), "A böngésző nem támogatja a helymeghatározást.");
    return false;
  }

  // iOS/Android sokszor csak user action után promptol — ezért csak gombnyomásra hívjuk.
  setText($("#gpsStatus"), "Helymeghatározás folyamatban…");

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        GPS.lat = pos.coords.latitude;
        GPS.lng = pos.coords.longitude;
        GPS.acc = pos.coords.accuracy;
        updateGpsUI();
        resolve(true);
      },
      (err) => {
        GPS.lat = null;
        GPS.lng = null;
        GPS.acc = null;
        updateGpsUI();

        let msg = "Nem sikerült meghatározni a helyzetet.";
        if (err && err.code === 1)
          msg =
            "A helymeghatározás nincs engedélyezve. Engedélyezd a böngészőben, különben nem küldhető be bejelentés.";
        if (err && err.code === 2)
          msg = "A helyzet nem elérhető (GPS/jel). Próbáld újra.";
        if (err && err.code === 3)
          msg = "Időtúllépés a helymeghatározásnál. Próbáld újra.";

        setText($("#createMsg"), msg);
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/* ===== kategóriák / listázás ===== */
async function loadCategories() {
  const sel = $("#categorySelect");
  sel.innerHTML = "";

  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "— Válassz kategóriát —";
  sel.appendChild(ph);

  const data = await api("categories_list.php");
  if (!data.items || data.items.length === 0)
    throw { error: "Nincs kategória az adatbázisban." };

  data.items.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  sel.value = String(data.items[0].id);
}

function canManage() {
  return ME && (ME.role === "admin" || ME.role === "staff");
}

/* ===== státusz állítás ===== */
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
  btn.textContent = "Állapot mentése";

  const msg = document.createElement("span");
  msg.className = "muted small";

  btn.addEventListener("click", async () => {
    msg.textContent = "";
    try {
      await api("reports_update_status.php", "POST", {
        report_id: report.id,
        status: sel.value,
      });
      msg.textContent = "Mentve.";
      await loadReports();
    } catch (e) {
      msg.textContent = e.error || "Hiba.";
    }
  });

  wrap.appendChild(sel);
  wrap.appendChild(btn);
  wrap.appendChild(msg);
  li.appendChild(wrap);
}

/* ===== kommentek (admin/staff) ===== */
async function loadComments(reportId, container) {
  container.innerHTML = `<div class="muted small">Betöltés…</div>`;
  try {
    const data = await api(
      `comments_list.php?report_id=${encodeURIComponent(reportId)}`
    );
    const items = data.items ?? [];
    if (items.length === 0) {
      container.innerHTML = `<div class="muted small">Még nincs komment.</div>`;
      return;
    }

    container.innerHTML = items
      .map(
        (c) => `
      <div class="comment">
        <div class="comment-head">
          <b>${escapeHtml(c.author)}</b>
          <span class="muted small">(${escapeHtml(
            SZEREPKOR_HU[c.author_role] ?? c.author_role
          )}) • ${escapeHtml(c.created_at)}</span>
        </div>
        <div>${escapeHtml(c.comment)}</div>
      </div>
    `
      )
      .join("");
  } catch (e) {
    container.innerHTML = `<div class="muted small">${escapeHtml(
      e.error || "Hiba a kommentek betöltésekor."
    )}</div>`;
  }
}

function addCommentControls(li, report) {
  if (!canManage()) return;

  const box = document.createElement("div");
  box.className = "comment-box";

  box.innerHTML = `
    <div class="row" style="margin-top:10px;">
      <button class="btn btn-soft" type="button" data-action="toggleComments">Kommentek</button>
      <button class="btn btn-soft" type="button" data-action="thanks">Köszönjük</button>
    </div>

    <div class="hidden" data-comments>
      <div style="margin-top:10px;" class="comment-list"></div>

      <label style="margin-top:10px;">Admin/Ügyintéző komment</label>
      <textarea rows="3" placeholder="pl. Köszönjük a bejelentést! A hibát rögzítettük, hamarosan intézkedünk."></textarea>

      <div class="row">
        <button class="btn btn-primary" type="button" data-action="sendComment">Komment elküldése</button>
        <span class="muted small" data-msg></span>
      </div>
    </div>
  `;

  const toggleBtn = box.querySelector('[data-action="toggleComments"]');
  const thanksBtn = box.querySelector('[data-action="thanks"]');
  const wrap = box.querySelector("[data-comments]");
  const list = box.querySelector(".comment-list");
  const ta = box.querySelector("textarea");
  const sendBtn = box.querySelector('[data-action="sendComment"]');
  const msg = box.querySelector("[data-msg]");

  toggleBtn.addEventListener("click", async () => {
    wrap.classList.toggle("hidden");
    if (!wrap.classList.contains("hidden")) {
      await loadComments(report.id, list);
    }
  });

  thanksBtn.addEventListener("click", async () => {
    ta.value =
      "Köszönjük a bejelentést! A hibát rögzítettük, és hamarosan intézkedünk.";
    wrap.classList.remove("hidden");
    await loadComments(report.id, list);
    ta.focus();
  });

  sendBtn.addEventListener("click", async () => {
    msg.textContent = "";
    const comment = ta.value.trim();
    if (!comment) {
      msg.textContent = "Írj be egy kommentet!";
      return;
    }

    try {
      await api("comments_create.php", "POST", {
        report_id: report.id,
        comment,
      });
      ta.value = "";
      msg.textContent = "Elküldve.";
      await loadComments(report.id, list);
    } catch (e) {
      msg.textContent = e.error || "Hiba.";
    }
  });

  li.appendChild(box);
}

/* ===== report list ===== */
async function loadReports() {
  const ul = $("#list");
  ul.innerHTML = "";

  const status = $("#filterStatus").value;
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
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
        <div><b>#${r.id}</b> <span class="chip chip--${escapeHtml(
      r.status
    )}">${escapeHtml(statusHu(r.status))}</span></div>
        <div class="muted small">${escapeHtml(r.created_at)}</div>
      </div>
      <div class="report-title">${escapeHtml(r.title)}</div>
      <div class="muted">${escapeHtml(r.category)} • ${escapeHtml(
      r.address
    )}</div>
      <div class="muted small">Beküldte: ${escapeHtml(r.created_by)}</div>
    `;

    addStatusControls(li, r);
    addCommentControls(li, r);

    ul.appendChild(li);
  });
}

/* ===== auth refresh ===== */
async function refreshMe() {
  const data = await api("auth_me.php");
  ME = data.user;
  showAuthedUI(ME);

  if (ME) {
    await loadCategories().catch((e) =>
      setText(
        $("#createMsg"),
        e.error || "Nem sikerült betölteni a kategóriákat."
      )
    );
    await loadReports().catch(() => {});
    // FONTOS: itt NEM hívunk getGps()-t automatikusan, mert sok mobil csak user actionre promptol.
    updateGpsUI();
  }

  return ME;
}

/* ===== EVENTS ===== */
$("#toRegister").addEventListener("click", () => showAuthPanel("register"));
$("#toLogin").addEventListener("click", () => showAuthPanel("login"));

$("#btnGetGps").addEventListener("click", getGps);

$("#btnLogin").addEventListener("click", async () => {
  setText($("#loginMsg"), "");
  try {
    await api("auth_login.php", "POST", {
      email: $("#loginEmail").value,
      password: $("#loginPassword").value,
    });
    setText($("#loginMsg"), "Sikeres belépés!");
    await refreshMe();
  } catch (e) {
    setText($("#loginMsg"), e.error || "Hiba történt.");
  }
});

$("#btnRegister").addEventListener("click", async () => {
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
    setText($("#regMsg"), e.error || "Hiba történt.");
  }
});

$("#btnLogout").addEventListener("click", async () => {
  try {
    await api("auth_logout.php", "POST", {});
  } finally {
    // GPS reset
    GPS = { lat: null, lng: null, acc: null };
    updateGpsUI();
    await refreshMe();
  }
});

$("#btnCreateReport").addEventListener("click", async () => {
  setText($("#createMsg"), "");

  const categoryId = Number($("#categorySelect").value);
  if (!categoryId) {
    setText($("#createMsg"), "Válassz kategóriát!");
    return;
  }

  // GPS kötelező + ha nincs, szóljunk és javasoljuk a gombot
  if (GPS.lat === null || GPS.lng === null) {
    setText(
      $("#createMsg"),
      "A GPS helyzet kötelező. Nyomd meg a „Helyzet meghatározása” gombot és engedélyezd a hozzáférést."
    );
    return;
  }

  try {
    const payload = {
      category_id: categoryId,
      address: $("#reportAddress").value,
      title: $("#reportTitle").value,
      description: $("#reportDesc").value,
      latitude: GPS.lat,
      longitude: GPS.lng,
    };

    const res = await api("reports_create.php", "POST", payload);
    setText($("#createMsg"), `Bejelentés elküldve! Azonosító: #${res.id}`);

    $("#reportTitle").value = "";
    $("#reportDesc").value = "";

    await loadReports();
  } catch (e) {
    setText($("#createMsg"), e.error || "Hiba történt.");
  }
});

$("#btnLoad").addEventListener("click", loadReports);
$("#filterStatus").addEventListener("change", loadReports);

/* init */
showAuthPanel("login");
updateGpsUI();
refreshMe();
