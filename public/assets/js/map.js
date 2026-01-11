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

function setText(el, t = "") {
  el.textContent = t;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// egyszerű színes marker (divIcon)
function markerIcon(status) {
  const cls =
    {
      new: "m-new",
      in_progress: "m-prog",
      resolved: "m-ok",
      rejected: "m-rej",
    }[status] || "m-prog";

  return L.divIcon({
    className: `cg-marker ${cls}`,
    html: `<div class="pin"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

async function init() {
  const me = await api("auth_me.php");
  if (!me.user) {
    location.href = "./";
    return;
  }

  setText(
    $("#me"),
    `${me.user.name} (${SZEREPKOR_HU[me.user.role] ?? me.user.role})`
  );
  $("#btnLogout").classList.remove("hidden");
  $("#btnLogout").addEventListener("click", async () => {
    await api("auth_logout.php", "POST", {});
    location.href = "./";
  });

  const map = L.map("map", {
    // pinch zoom maradhat a térképen, de a böngésző zoom tiltva van viewport + touch-action miatt
    zoomControl: true,
  }).setView([47.4979, 19.0402], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  // minimál CSS markerhez (inline)
  const style = document.createElement("style");
  style.textContent = `
    .cg-marker .pin{width:14px;height:14px;border-radius:999px;border:2px solid rgba(15,23,42,.35);box-shadow:0 10px 20px rgba(2,6,23,.25);}
    .cg-marker.m-new .pin{background:rgba(245,158,11,.95)}
    .cg-marker.m-prog .pin{background:rgba(14,165,233,.95)}
    .cg-marker.m-ok .pin{background:rgba(34,197,94,.95)}
    .cg-marker.m-rej .pin{background:rgba(239,68,68,.95)}
  `;
  document.head.appendChild(style);

  let items = [];
  try {
    const data = await api("reports_geo_list.php");
    items = data.items ?? [];
  } catch (e) {
    setText(
      $("#mapMsg"),
      e.error || "Nem sikerült betölteni a térképes adatokat."
    );
  }

  if (items.length === 0) {
    setText(
      $("#mapMsg"),
      "Nincs megjeleníthető bejelentés (nincs koordináta)."
    );
    return;
  }

  const bounds = [];
  items.forEach((r) => {
    const lat = Number(r.latitude),
      lng = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    bounds.push([lat, lng]);

    const html = `
      <b>#${r.id} – ${escapeHtml(r.title)}</b><br/>
      Állapot: <b>${escapeHtml(statusHu(r.status))}</b><br/>
      Kategória: ${escapeHtml(r.category)}<br/>
      Cím: ${escapeHtml(r.address)}<br/>
      Beküldte: ${escapeHtml(r.created_by)}<br/>
      <span style="color:#64748b;font-size:12px;">${escapeHtml(
        r.created_at
      )}</span>
    `;

    L.marker([lat, lng], { icon: markerIcon(r.status) })
      .addTo(map)
      .bindPopup(html);
  });

  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
}

init();
