'use strict';
/* =========================================================
   Calicat — meal planner + calorie counter (vanilla JS)
   ========================================================= */

/* ---------- utils ---------- */
const STORE_KEY = 'calicat:v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);
const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');
const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const fmtQ = (n) => (Math.round(n * 100) / 100).toString();

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const todayKey = () => keyOf(new Date());
const be = (y) => y + 543;
const TH_DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const TH_DOW_S = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TH_MON = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_MON_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function startOfWeek(d, ws = state.settings.weekStart) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(x, -((x.getDay() - ws + 7) % 7));
}
const dayLabel = (k) => { const d = parseKey(k); return `${TH_DOW[d.getDay()]} ${d.getDate()} ${TH_MON_S[d.getMonth()]}`; };

/* ---------- images ---------- */
const FLUENT = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';
const fl = (name) => `${FLUENT}${encodeURIComponent(name)}/3D/${name.toLowerCase().replace(/ /g, '_')}_3d.png`;
const DPR = Math.min(2, window.devicePixelRatio || 1);
function imgSrc(src, w = 400) {
  if (!src) return '';
  if (src.startsWith('u:')) return `https://images.unsplash.com/photo-${src.slice(2)}?w=${Math.round(w * DPR)}&q=72&auto=format&fit=crop`;
  return src;
}
const recipeSrc = (r, w) => imgSrc(r?.img, w);
function photo(r, w = 120, cls = '') {
  const s = recipeSrc(r, w);
  return `<span class="ph ${cls}">${s ? `<img src="${esc(s)}" alt="" loading="lazy" decoding="async">` : `<img class="ph-3d" src="${fl('Shallow pan of food')}" alt="" loading="lazy">`}</span>`;
}
function suggestIcons(name, limit = 8) {
  const q = String(name || '').trim().toLowerCase(); if (!q) return [];
  const scored = [];
  for (const [n, kw] of ICON_LIB) {
    let best = 0;
    for (const w of kw.split(' ')) if (w && (q === w || (w.length >= 3 && q.includes(w)) || (q.length >= 2 && w.includes(q)))) best = Math.max(best, w.length + (q === w ? 50 : 0));
    if (n.toLowerCase().includes(q)) best = Math.max(best, q.length);
    if (best) scored.push([best, n]);
  }
  scored.sort((x, y) => y[0] - x[0]);
  const top = scored[0]?.[0] || 0;
  return scored.filter((x) => x[0] >= top * 0.6).slice(0, limit).map((x) => x[1]);
}
const iconSrc = (icon) => (/^(data:|https?:)/.test(icon) ? icon : fl(icon));
function ingIcon(id) {
  const I = ING[id];
  if (I?.icon) return iconSrc(I.icon);
  if (ING_ICON[id]) return fl(ING_ICON[id]);
  if (I?.custom) { const g = suggestIcons(I.name, 1)[0]; if (g) return fl(g); }
  return fl(ING_CATS[I?.cat]?.icon || 'Shopping cart');
}
const ingImg = (id, cls = 'ii') => `<img class="${cls}" src="${ingIcon(id)}" alt="" loading="lazy">`;
const catImg = (c, cls = 'ii') => `<img class="${cls}" src="${fl(ING_CATS[c]?.icon || 'Shopping cart')}" alt="" loading="lazy">`;

/* ---------- icons & illustrations ---------- */
const ICON = {
  flame: '<path d="M12 3c.5 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.6-3.8 2-6.5 1.4.9 2.4 2.1 2.8 3.6C12 8.6 12.3 6 12 3z"/>',
  plan: '<rect x="4" y="5" width="16" height="15" rx="3.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  menu: '<path d="M6 4h10.5A2.5 2.5 0 0 1 19 6.5V20H8a2 2 0 0 1-2-2z"/><path d="M6 18a2 2 0 0 1 2-2h11M10 8h5"/>',
  cart: '<path d="M3 4h2.2l2.2 10.6a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.5L20.5 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  fridge: '<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M6 10h12M9.5 6v1.5M9.5 13v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor"/><circle cx="15" cy="15" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.1" fill="currentColor"/><circle cx="9" cy="15" r="1.1" fill="currentColor"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20 16l-4.5-4.5L7 20"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;

/* มาสคอต: แมวลายเส้นแบบ doodle (หน้าแมวเดียวกับโลโก้) */
const CAT_HEAD = 'M22 66C22 52 26 42 31 35L28 9L51 26C54 25.3 57 25 60 25C63 25 66 25.3 69 26L92 9L89 35C94 42 98 52 98 66C98 88 82 102 60 102C38 102 22 88 22 66Z';
function catFace() {
  return `<path d="${CAT_HEAD}" fill="#fff"/>
    <path d="M33 22l5 7M87 22l-5 7" stroke-width="2.4"/>
    <ellipse cx="35" cy="78" rx="6" ry="3.4" fill="var(--pink)" stroke="none"/><ellipse cx="85" cy="78" rx="6" ry="3.4" fill="var(--pink)" stroke="none"/>
    <g class="eyes"><ellipse cx="45" cy="61" rx="7" ry="9" fill="#fff"/><ellipse cx="75" cy="61" rx="7" ry="9" fill="#fff"/>
      <g class="pupils" fill="currentColor" stroke="none"><ellipse cx="47" cy="63.5" rx="3" ry="4.5"/><ellipse cx="77" cy="63.5" rx="3" ry="4.5"/></g></g>
    <path d="M56 74h8l-4 4.5z" fill="currentColor"/>
    <path d="M60 78.5q-2.5 6-8 4M60 78.5q2.5 6 8 4"/>
    <path d="M30 74l-18-3M30 81l-17 3M90 74l18-3M90 81l17 3" stroke-width="2.4"/>`;
}
function catSVG({ cls = '', body = false } = {}) {
  if (!body) return `<svg class="cat ${cls}" viewBox="0 0 120 112" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${catFace()}</svg>`;
  return `<svg class="cat doodle ${cls}" viewBox="-8 -14 150 196" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path class="tail" d="M98 166C128 166 136 136 120 118c-6-7-14-4-12 4" stroke-width="3.4"/>
    <path d="M30 168C24 132 34 104 60 104s36 28 30 64z" fill="#fff"/>
    <path d="M44 168q6-9 12 0M64 168q6-9 12 0" />
    <path d="M52 124q8 6 16 0" stroke-width="2.4" opacity=".55"/>
    ${catFace()}
    <g class="sparkles" stroke-width="2.4">
      <path d="M118 8v14M111 15h14" /><path d="M-2 40v10M-7 45h10" />
      <path d="M126 70c0-4 6-4 6 0 0-4 6-4 6 0 0 5-6 8-6 8s-6-3-6-8z" fill="var(--blush)" stroke="var(--blush)" />
    </g>
  </svg>`;
}
const peek = () => `<span class="peek" aria-hidden="true"><span></span><span></span></span>`;
/* แมวเกาะขอบจาน (ครึ่งบนของหัว + อุ้งเท้า) */
function catPeek() {
  return `<svg class="cat-peek" viewBox="0 0 120 66" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M22 64C22 52 26 42 31 35L28 9L51 26C54 25.3 57 25 60 25C63 25 66 25.3 69 26L92 9L89 35C94 42 98 52 98 64" fill="var(--cat-fill, #fff)"/>
    <path d="M33 22l5 7M87 22l-5 7" stroke-width="2.4"/>
    <ellipse cx="45" cy="52" rx="6.5" ry="8.5" fill="#fff"/><ellipse cx="46.5" cy="54.5" rx="3" ry="4.4" fill="currentColor" stroke="none"/>
    <ellipse cx="75" cy="52" rx="6.5" ry="8.5" fill="#fff"/><ellipse cx="76.5" cy="54.5" rx="3" ry="4.4" fill="currentColor" stroke="none"/>
    <path d="M12 65c0-6 4-10 10-10s10 4 10 10M88 65c0-6 4-10 10-10s10 4 10 10" fill="var(--cat-fill, #fff)"/>
  </svg>`;
}

function ring(val, goal, size = 140, sw = 12) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, p = goal ? Math.min(val / goal, 1) : 0;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" class="ring-bg"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" class="ring-fg ${status(val)}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

/* ---------- state ---------- */
function seedRecipes() {
  return SEED_RECIPES.map((r) => ({ ...clone(r), ing: r.ing.map(([id, q, u]) => ({ id, q, u })), kcalOverride: null, steps: [...(RECIPE_STEPS[r.id]?.steps || [])], time: RECIPE_STEPS[r.id]?.time || null }));
}
function defaultState() {
  return {
    v: 2,
    settings: { goal: 1800, slots: ['breakfast', 'lunch', 'dinner'], weekStart: 1, name: '', waterGoal: 2000, avatar: '', avatarBg: 'pink' },
    profile: { sex: 'f', age: 25, weight: 55, height: 160, activity: 1.375, aim: -300, allergies: [], dislikes: [] },
    customIngs: [],
    ingMeta: {},
    recipes: seedRecipes(),
    plan: {},
    shopChecked: {},
    fridge: ['egg', 'chicken_breast', 'tomato', 'garlic', 'holy_basil'],
    water: {},
  };
}
function seedDemo(s) {
  const start = startOfWeek(new Date(), s.settings.weekStart);
  DEMO_WEEK.forEach((def, i) => {
    const m = {};
    for (const slot in def) m[slot] = def[slot].map((rid) => ({ rid, s: 1 }));
    s.plan[keyOf(addDays(start, i))] = { slots: SLOT_ORDER.filter((x) => s.settings.slots.includes(x) || def[x]), m };
  });
}
function migrate(s) {
  // v1 → v2: อีโมจิ → รูปจริง
  for (const r of s.recipes || []) {
    if (!r.img) { const seed = SEED_RECIPES.find((x) => x.id === r.id); if (seed) r.img = seed.img; }
    delete r.emoji;
    // v3: วิธีทำทีละขั้น
    if (!Array.isArray(r.steps)) { const st = RECIPE_STEPS[r.id]; r.steps = st ? [...st.steps] : []; if (st && r.time == null) r.time = st.time; }
  }
  s.v = 2;
  return s;
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw), d = defaultState();
      return migrate({ ...d, ...s, water: s.water || {}, ingMeta: s.ingMeta || {}, settings: { ...d.settings, ...s.settings }, profile: { ...d.profile, ...s.profile } });
    }
  } catch (e) { /* ignore */ }
  const s = defaultState();
  state = s;
  seedDemo(s);
  return s;
}
let state = null;
state = load();

function save() {
  const def = state.settings.slots.slice().sort().join();
  for (const k in state.plan) {
    const d = state.plan[k];
    for (const s in d.m) if (!d.m[s] || !d.m[s].length) delete d.m[s];
    if (!Object.keys(d.m).length && d.slots.slice().sort().join() === def) delete state.plan[k];
  }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch (e) { toast('พื้นที่เก็บข้อมูลเต็ม ลองลบรูปที่อัปโหลดออกบ้างนะ'); return false; }
}

/* ---------- ingredients ---------- */
let ING = {}, ING_BY_NAME = new Map();
const BASE_ING = {};
for (const [id, name, cat, kcal, units = {}, opt = {}] of ING_DATA) BASE_ING[id] = { id, name, cat, kcal, units, ...opt };
function buildIng() {
  ING = {};
  if (!state.settings.noBase) for (const id in BASE_ING) ING[id] = { ...BASE_ING[id], builtin: true };
  for (const [id, o] of Object.entries(state.ingMeta || {})) if (ING[id]) ING[id] = { ...ING[id], ...o, edited: Object.keys(o).some((k) => k !== 'active') };
  for (const c of state.customIngs) ING[c.id] = { units: {}, ...c, custom: true };
  ING_BY_NAME = new Map(Object.values(ING).map((i) => [i.name.trim().toLowerCase(), i]));
  const dl = $('#ing-list');
  if (dl) dl.innerHTML = Object.values(ING).filter(isActive).map((i) => `<option value="${esc(i.name)}"></option>`).join('');
}
const isActive = (i) => (typeof i === 'string' ? ING[i] : i)?.active !== false;
const usedIn = (id) => state.recipes.filter((r) => r.ing.some((x) => x.id === id));
const unitsOf = (id) => ({ ...GENERIC_UNITS, ...(ING[id]?.units || {}) });
const toGrams = (id, q, u) => num(q) * (unitsOf(id)[u] ?? 1);
const findIng = (name) => ING_BY_NAME.get(String(name || '').trim().toLowerCase());

/* ---------- recipes & calories ---------- */
const rec = (id) => state.recipes.find((r) => r.id === id);
function recipeTotal(r) {
  return r.ing.reduce((a, x) => { const I = ING[x.id]; return a + (I ? (I.kcal * toGrams(x.id, x.q, x.u)) / 100 : 0); }, 0);
}
function perServing(r) {
  if (r.kcalOverride != null && r.kcalOverride !== '') return num(r.kcalOverride);
  return recipeTotal(r) / Math.max(1, num(r.servings, 1));
}
function recipeFlags(r) {
  const al = new Set(state.profile.allergies || []), dl = new Set(state.profile.dislikes || []);
  const ids = [...new Set((r?.ing || []).map((x) => x.id))];
  return { allergy: ids.filter((i) => al.has(i)), dislike: ids.filter((i) => dl.has(i)) };
}
const isAvoided = (r) => recipeFlags(r).allergy.length > 0; // ไม่ชอบทาน = แค่บอกไว้ ไม่ตัดออก
function flagBadge(r, cls = '') {
  const f = recipeFlags(r), names = (ids) => ids.map((i) => ING[i]?.name).join(', ');
  if (f.allergy.length) return `<span class="flag allergy ${cls}" title="มี ${esc(names(f.allergy))}">แพ้</span>`;
  if (f.dislike.length) return `<span class="flag dislike ${cls}" title="มี ${esc(names(f.dislike))} — ไม่ต้องใส่ก็ได้">มี${esc(names(f.dislike.slice(0, 1)))}${f.dislike.length > 1 ? ` +${f.dislike.length - 1}` : ''}</span>`;
  return '';
}
async function allergyOk(r) {
  const f = recipeFlags(r); if (!f.allergy.length) return true;
  return confirmBox(`เมนูนี้มี <b>${f.allergy.map((i) => esc(ING[i]?.name)).join(', ')}</b><br><small>ซึ่งคุณระบุว่าแพ้ ยังจะเพิ่มลงแพลนไหม?</small>`, 'เพิ่มอยู่ดี', true);
}
const SOURCES = { buy: 'ซื้อมา', out: 'กินนอกบ้าน', delivery: 'เดลิเวอรี่', home: 'ทำเอง' };
/* รายการในแพลน: {rid} = เมนูในสมุด, {qn, qk} = บันทึกกินนอก/ซื้อมา (ไม่มีวัตถุดิบ) */
function itemRec(it) {
  if (it.rid) return rec(it.rid);
  if (it.qn != null) return { id: 'q', quick: true, name: it.qn, img: it.qi || '', ing: [], servings: 1, kcalOverride: num(it.qk), type: 'main', slots: [], src: it.src || 'buy', note: it.note || '' };
  return null;
}
const itemKcal = (it) => { const r = itemRec(it); return r ? perServing(r) * num(it.s, 1) : 0; };

/* ---------- plan helpers ---------- */
function getDay(k, create = false) {
  let d = state.plan[k];
  if (!d && create) d = state.plan[k] = { slots: [...state.settings.slots], m: {} };
  return d;
}
function daySlots(k) {
  const d = state.plan[k];
  const set = new Set(d ? d.slots : state.settings.slots);
  if (d) for (const s in d.m) if (d.m[s]?.length) set.add(s);
  return SLOT_ORDER.filter((s) => set.has(s));
}
function allItems(k) {
  const d = state.plan[k]; if (!d) return [];
  const out = [];
  for (const slot of SLOT_ORDER) for (const it of d.m[slot] || []) { const r = itemRec(it); if (r) out.push({ r, s: it.s, slot, eaten: !!it.eaten, it }); }
  return out;
}
const eatenKcal = (k) => allItems(k).filter((x) => x.eaten).reduce((a, x) => a + perServing(x.r) * num(x.s, 1), 0);
const dayKcal = (k) => allItems(k).reduce((a, x) => a + perServing(x.r) * num(x.s, 1), 0);
function status(kc) {
  if (!kc) return 'none';
  const r = kc / state.settings.goal;
  return r < 0.85 ? 'low' : r <= 1.1 ? 'ok' : 'over';
}
function addToPlan(k, slot, rid, s = 1) {
  const d = getDay(k, true);
  if (!d.slots.includes(slot)) d.slots.push(slot);
  (d.m[slot] ||= []).push({ rid, s });
  lastAdded = `${k}|${slot}|${d.m[slot].length - 1}`;
  save(); refreshAll();
  setTimeout(() => { lastAdded = ''; }, 600);
}
let lastAdded = '';
function weekKeys(d) { const s = startOfWeek(d); return Array.from({ length: 7 }, (_, i) => keyOf(addDays(s, i))); }
function rangeKeys(from, to) {
  const out = []; for (let d = parseKey(from); keyOf(d) <= to; d = addDays(d, 1)) out.push(keyOf(d)); return out;
}
function viewKeys() {
  const c = ui.cursor;
  if (ui.view === 'week') return weekKeys(c);
  if (ui.view === 'month') return rangeKeys(keyOf(new Date(c.getFullYear(), c.getMonth(), 1)), keyOf(new Date(c.getFullYear(), c.getMonth() + 1, 0)));
  return rangeKeys(`${c.getFullYear()}-01-01`, `${c.getFullYear()}-12-31`);
}

/* ---------- ui state ---------- */
const ui = {
  tab: (() => { const h = location.hash.slice(1); if (h === 'ingredients') return 'menus'; if (['plan', 'menus', 'shop', 'fridge', 'me'].includes(h)) return h; try { return localStorage.getItem('calicat:tab') || 'plan'; } catch { return 'plan'; } })(),
  view: 'week',
  cursor: new Date(),
  ingQ: '', ingCat: 'all', ingStatus: 'all', ingPage: 1,
  menuQ: '', menuType: 'all', menuView: location.hash === '#ingredients' ? 'ings' : 'recipes',
  fridgeQ: '', fridgeCat: 'all', fridgeOnly: false, trayOpen: false,
  shopRange: 'week', shopFrom: todayKey(), shopTo: keyOf(addDays(new Date(), 6)),
};

/* ---------- toast ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), Math.max(2000, msg.length * 70));
}

/* ---------- modals ---------- */
const modals = [];
const closeBtn = `<button class="icon-btn close-btn" data-act="close" aria-label="ปิด">${ic('x')}</button>`;
function openModal(html, { cls = '', onClick, refresh, onClose } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  const m = { ov, sheet: ov.firstElementChild, refresh, onClose };
  modals.push(m);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeModal(m); });
  if (onClick) m.sheet.addEventListener('click', onClick);
  requestAnimationFrame(() => ov.classList.add('show'));
  return m;
}
function closeModal(m = modals[modals.length - 1]) {
  if (!m) return;
  if (combo.el && m.sheet.contains(combo.el)) comboClose();
  const i = modals.indexOf(m); if (i < 0) return;
  modals.splice(i, 1);
  m.ov.classList.remove('show');
  setTimeout(() => m.ov.remove(), 220);
  if (!modals.length) document.body.classList.remove('modal-open');
  m.onClose?.();
}
function confirmBox(msg, ok = 'ตกลง', danger = false) {
  return new Promise((res) => {
    const m = openModal(`<div class="confirm">${catSVG()}<p>${msg}</p>
      <div class="modal-foot"><button class="btn ghost" data-m="no">ยกเลิก</button><button class="btn ${danger ? 'danger' : 'primary'}" data-m="yes">${ok}</button></div></div>`,
      { cls: 'small', onClose: () => res(false), onClick: (e) => { const b = e.target.closest('[data-m]'); if (!b) return; res(b.dataset.m === 'yes'); closeModal(m); } });
  });
}
function refreshAll() { renderMain(false); renderHeader(); modals.forEach((m) => m.refresh?.()); }

/* =========================================================
   PAGES
   ========================================================= */
const AV_BG = { pink: '#F4CBC9', sky: '#8ACAEE', frost: '#E6F1FA', green: 'rgba(105, 148, 7, .22)', cream: '#FFF6EF' };
function avatarHTML(cls = '') {
  const s = state.settings;
  return `<span class="av ${cls}" style="--av:${AV_BG[s.avatarBg] || AV_BG.pink}">${s.avatar ? `<img src="${esc(s.avatar)}" alt="">` : catSVG()}</span>`;
}
function renderHeader() {
  $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === ui.tab && !!b.closest('.nav, .bottom-nav')));
  const g = $('#goal-chip'); if (g) g.innerHTML = `${avatarHTML('xs')}<b>${fmt(state.settings.goal)}</b> <small>kcal/วัน</small>`;
}
function renderMain(animate = true) {
  const main = $('#main');
  const y = window.scrollY;
  if (combo.el && $('#main').contains(combo.el)) comboClose();
  main.innerHTML = PAGES[ui.tab]();
  if (animate) { main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter'); window.scrollTo(0, 0); }
  else window.scrollTo(0, y);
}
function render() { renderHeader(); renderMain(true); }

/* ---------- PLAN ---------- */
function greet() {
  const h = new Date().getHours();
  const g = h < 11 ? 'อรุณสวัสดิ์' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  return state.settings.name ? `${g} ${esc(state.settings.name)}` : g;
}
function heroHTML() {
  const t = new Date(), k = keyOf(t), kc = dayKcal(k), goal = state.settings.goal, items = allItems(k), left = goal - kc;
  const ml = state.water?.[k] || 0, wg = state.settings.waterGoal || 2000, ek = eatenKcal(k);
  return `<section class="hero">
    <div class="hero-card grain">
      <p class="eyebrow">วัน${TH_DOW[t.getDay()]} · ${t.getDate()} ${TH_MON[t.getMonth()]} ${be(t.getFullYear())}</p>
      <h1>${greet()}<em>วันนี้กินอะไรดีนะ?</em></h1>
      <div class="hero-kcal">
        <div class="hk-ring">${ring(ek, goal, 88, 9)}<span>${goal ? Math.round((ek / goal) * 100) : 0}%</span></div>
        <div class="hk-text"><p class="hk-label">กินไปแล้ววันนี้</p><p class="hk-num"><b>${fmt(ek)}</b><small> / ${fmt(goal)} kcal</small></p>
          ${items.length ? `<span class="plan-badge ${status(kc)}">แพลนไว้ <b>${fmt(kc)}</b> / ${fmt(goal)}</span>` : `<span class="plan-badge none">ยังไม่ได้แพลน</span>`}</div>
      </div>
      ${items.length ? `<ul class="hero-meals">${items.slice(0, 5).map(({ r, s, slot, eaten }) => `<li class="${eaten ? 'eaten' : ''}">
        <span class="hm-slot">${SLOTS[slot].short}</span>${r.quick && !r.img ? `<span class="ph xs q-ph">${ic('cart')}</span>` : photo(r, 80, 'xs')}<span class="hm-nm">${esc(r.name)}${eaten ? ` ${ic('check')}` : ''}</span><span class="hm-k">${fmt(perServing(r) * num(s, 1))}</span></li>`).join('')}
        ${items.length > 5 ? `<li class="more">และอีก ${items.length - 5} เมนู</li>` : ''}</ul>` : ''}
      <div class="hero-actions">
        <button class="btn primary" data-act="open-day" data-date="${k}">${ic('edit')} แพลนวันนี้</button>
        <button class="btn ghost" data-act="quick-log" data-date="${k}" data-slot="${['breakfast', 'lunch', 'snack', 'dinner', 'dinner'][Math.min(4, Math.floor(Math.max(0, t.getHours() - 6) / 4))]}">${ic('cart')} บันทึกกินนอกบ้าน</button>
      </div>
    </div>
    <div class="hero-visual water grain">
      <span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span>
      <div class="w-top"><p class="eyebrow">ดื่มน้ำวันนี้</p><p class="w-num"><b id="w-ml">${fmt(ml)}</b><small> / ${fmt(wg)} ml</small></p><p class="w-note" id="w-note">${waterNote(ml, wg)}</p>
        <div class="w-cups" id="w-cups">${cupsHTML(ml, wg)}</div></div>
      <div class="w-stage" id="w-stage">${bottleSVG(ml / wg)}</div>
      <div class="w-actions">${[150, 250, 500].map((v) => `<button data-act="water" data-v="${v}">+${v}<small>ml</small></button>`).join('')}<button class="undo" data-act="water" data-v="-250" aria-label="ลบ 250 ml">${ic('minus')}</button></div>
    </div>
  </section>`;
}
function waterNote(ml, goal) {
  if (ml >= goal) return 'ครบเป้าแล้ว เก่งมาก!';
  const cups = Math.ceil((goal - ml) / 250);
  return ml ? `อีก ${cups} แก้วก็ครบแล้ว` : 'เริ่มจิบน้ำแก้วแรกกันเลย';
}
const BOTTLE_TOP = 94, BOTTLE_H = 202;
function cupsHTML(ml, goal) {
  const n = Math.max(1, Math.round(goal / 250)), on = Math.min(n, Math.floor(ml / 250));
  return Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('');
}
/* ขวดน้ำน่ารัก ๆ: ฝาโกโก้ ตัวขวดใส น้ำสีฟ้า ฉลากลายทาง */
function bottleSVG(p) {
  p = Math.max(0, Math.min(1, p || 0));
  let wave = `M-80 ${BOTTLE_TOP}`; for (let i = 0; i < 10; i++) wave += i % 2 ? ' q16 6 32 0' : ' q16 -6 32 0';
  const body = 'M58 72h44v8c0 10 30 17 30 45v138c0 22-16 34-36 34H64c-20 0-36-12-36-34V125c0-28 30-35 30-45z';
  const stripes = Array.from({ length: 9 }, (_, i) => `<rect x="${30 + i * 12}" y="182" width="6" height="40" fill="var(--sky)" opacity=".55"/>`).join('');
  return `<svg class="bottle" viewBox="0 0 160 320" aria-hidden="true">
    <defs>
      <clipPath id="bclip"><path d="${body}"/></clipPath>
      <linearGradient id="bglass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="#F4F9FD" stop-opacity=".8"/><stop offset="1" stop-color="#E6F1FA" stop-opacity=".95"/></linearGradient>
      <linearGradient id="bwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9D8F3"/><stop offset="1" stop-color="#8ACAEE"/></linearGradient>
      <linearGradient id="bcap" x1="0" x2="1"><stop offset="0" stop-color="#6A3626"/><stop offset=".45" stop-color="#4F2317"/><stop offset="1" stop-color="#3D1A10"/></linearGradient>
    </defs>
    <ellipse cx="80" cy="306" rx="54" ry="8" fill="var(--cocoa)" opacity=".12"/>
    <path d="${body}" fill="url(#bglass)"/>
    <g clip-path="url(#bclip)">
      <g class="water" style="transform:translateY(${((1 - p) * BOTTLE_H).toFixed(1)}px)">
        <path class="wave back" d="${wave} V340 H-80 Z" fill="#8ACAEE" opacity=".45"/>
        <path class="wave" d="${wave} V340 H-80 Z" fill="url(#bwater)"/>
        <g class="fizz" fill="#fff" opacity=".75"><circle cx="54" cy="${BOTTLE_TOP + 150}" r="3"/><circle cx="96" cy="${BOTTLE_TOP + 120}" r="2.2"/><circle cx="76" cy="${BOTTLE_TOP + 175}" r="2.6"/><circle cx="110" cy="${BOTTLE_TOP + 165}" r="1.8"/></g>
      </g>
      <g class="label"><rect x="20" y="180" width="120" height="44" fill="#FFF8EE"/>${stripes}<rect x="20" y="178" width="120" height="4" fill="var(--cocoa)"/><rect x="20" y="222" width="120" height="4" fill="var(--cocoa)"/></g>
    </g>
    <g class="badge" transform="translate(80 202)"><circle r="19" fill="#fff" stroke="var(--cocoa)" stroke-width="3"/>
      <path transform="translate(-12.5 -12.5) scale(.21)" d="${CAT_HEAD}" fill="#fff" stroke="var(--cocoa)" stroke-width="9" stroke-linejoin="round"/>
      <circle cx="-4" cy="0.5" r="1.6" fill="var(--cocoa)"/><circle cx="4.5" cy="0.5" r="1.6" fill="var(--cocoa)"/></g>
    <path d="${body}" fill="none" stroke="var(--cocoa)" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M40 132v36" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/><circle cx="40" cy="242" r="3.5" fill="#fff" opacity=".85"/>
    <path d="M122 140v22" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    <rect x="55" y="60" width="50" height="14" rx="4" fill="var(--cocoa)" opacity=".88"/>
    <rect x="50" y="20" width="60" height="44" rx="12" fill="url(#bcap)"/>
    ${[60, 69, 78, 87, 96].map((x) => `<path d="M${x + 2} 28v28" stroke="#fff" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>`).join('')}
    <path d="M58 26h30" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}
function updateWater() {
  const k = todayKey(), ml = state.water[k] || 0, wg = state.settings.waterGoal || 2000, p = Math.min(ml / wg, 1);
  const g = $('.bottle .water'); if (!g) return;
  g.style.transform = `translateY(${((1 - p) * BOTTLE_H).toFixed(1)}px)`;
  $('#w-ml').textContent = fmt(ml); $('#w-note').textContent = waterNote(ml, wg); $('#w-cups').innerHTML = cupsHTML(ml, wg);
  const st = $('#w-stage'); st.classList.remove('slosh'); void st.offsetWidth; st.classList.add('slosh');
}
function rangeTitle() {
  const c = ui.cursor;
  if (ui.view === 'week') {
    const ks = weekKeys(c), a = parseKey(ks[0]), b = parseKey(ks[6]);
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} ${TH_MON_S[b.getMonth()]} ${be(b.getFullYear())}`
      : `${a.getDate()} ${TH_MON_S[a.getMonth()]} – ${b.getDate()} ${TH_MON_S[b.getMonth()]} ${be(b.getFullYear())}`;
  }
  if (ui.view === 'month') return `${TH_MON[c.getMonth()]} ${be(c.getFullYear())}`;
  return `ปี ${be(c.getFullYear())}`;
}
function pagePlan() {
  return heroHTML() + `
  <section class="plan-bar">
    <div class="seg">${[['week', 'สัปดาห์'], ['month', 'เดือน'], ['year', 'ปี']].map(([v, l]) => `<button class="${ui.view === v ? 'on' : ''}" data-act="view" data-view="${v}">${l}</button>`).join('')}</div>
    <div class="range-nav">
      <button class="icon-btn" data-act="nav" data-dir="-1" aria-label="ก่อนหน้า">${ic('left')}</button>
      <h2 class="range-title">${rangeTitle()}</h2>
      <button class="icon-btn" data-act="nav" data-dir="1" aria-label="ถัดไป">${ic('right')}</button>
      <button class="btn ghost sm" data-act="nav-today">วันนี้</button>
    </div>
    <div class="plan-tools">
      <button class="btn soft sm" data-act="fill-random">${ic('dice')} สุ่มเติมช่องว่าง</button>
      ${ui.view === 'week' ? `<button class="btn ghost sm" data-act="copy-prev">${ic('copy')} ใช้แพลนสัปดาห์ก่อน</button>` : ''}
      <button class="btn ghost sm danger-text" data-act="clear-range">${ic('trash')} ล้าง</button>
    </div>
  </section>
  ${ui.view === 'week' ? weekView() : ui.view === 'month' ? monthView() : yearView()}`;
}
function legend() {
  return `<div class="legend"><span><i class="lv-low"></i>ต่ำกว่าเป้า</span><span><i class="lv-ok"></i>พอดี</span><span><i class="lv-over"></i>เกินเป้า</span></div>`;
}
function weekView() {
  const keys = weekKeys(ui.cursor), kc = keys.map(dayKcal), goal = state.settings.goal, tk = todayKey();
  const planned = kc.filter((x) => x > 0), total = kc.reduce((a, b) => a + b, 0);
  const avg = planned.length ? total / planned.length : 0;
  const max = Math.max(goal * 1.3, ...kc);
  const okDays = kc.filter((x) => status(x) === 'ok').length;
  return `
  <section class="week-summary">
    <div class="card stat-card">
      <p class="eyebrow">เฉลี่ยต่อวัน</p>
      <p class="big">${fmt(avg)}<small>kcal</small></p>
      <div class="mini-stats">
        <div><b>${fmt(total)}</b><span>kcal ทั้งสัปดาห์</span></div>
        <div><b>${planned.length}<small>/7</small></b><span>วันที่แพลนแล้ว</span></div>
        <div><b>${okDays}</b><span>วันที่พอดีเป้า</span></div>
      </div>
      ${legend()}
    </div>
    <div class="card chart-card">
      <div class="chart-head"><p class="eyebrow">แคลอรี่รายวัน</p><span class="muted small">เส้นประ = เป้าหมาย ${fmt(goal)} kcal</span></div>
      <div class="bars">
        <span class="goal-line" style="bottom:${(goal / max) * 100}%"></span>
        ${keys.map((k, i) => { const d = parseKey(k); return `<button class="bar-col ${k === tk ? 'today' : ''}" data-act="jump" data-date="${k}" aria-label="${dayLabel(k)}">
          <span class="bar ${status(kc[i])}" style="height:${Math.max((kc[i] / max) * 100, kc[i] ? 4 : 0)}%">${kc[i] ? `<em>${fmt(kc[i])}</em>` : ''}</span>
          <span class="bar-lbl">${TH_DOW_S[d.getDay()]}<small>${d.getDate()}</small></span></button>`; }).join('')}
      </div>
    </div>
  </section>
  <nav class="day-strip">${keys.map((k, i) => { const d = parseKey(k); return `<button class="${k === tk ? 'today' : ''}" data-act="jump" data-date="${k}"><small>${TH_DOW_S[d.getDay()]}</small><b>${d.getDate()}</b><i class="dot lv-${status(kc[i])}"></i></button>`; }).join('')}</nav>
  <section class="week-grid">${keys.map((k) => dayCard(k)).join('')}</section>`;
}
function dayCard(k, { modal = false } = {}) {
  const d = parseKey(k), day = state.plan[k], slots = daySlots(k), kc = dayKcal(k), goal = state.settings.goal, st = status(kc);
  const isToday = k === todayKey();
  const missing = SLOT_ORDER.filter((s) => !slots.includes(s));
  return `<article class="day ${isToday ? 'is-today' : ''} ${modal ? 'in-modal' : ''}" ${modal ? '' : `id="day-${k}"`}>
    <header class="day-head">
      <span class="dnum">${d.getDate()}</span>
      <span class="dtxt"><b>${TH_DOW[d.getDay()]}</b><small>${TH_MON_S[d.getMonth()]} ${be(d.getFullYear())}${isToday ? ' · <em>วันนี้</em>' : ''}</small></span>
      <span class="kcal-pill ${st}">${fmt(kc)}<small> / ${fmt(goal)}</small></span>
    </header>
    <div class="meter ${st}"><i style="width:${Math.min(kc / goal, 1) * 100}%"></i></div>
    <div class="slots">${slots.map((s) => slotBlock(k, s, day)).join('')}</div>
    ${missing.length ? `<div class="add-slots">${missing.map((s) => `<button class="ghost-chip" data-act="add-slot" data-date="${k}" data-slot="${s}">${ic('plus')} ${SLOTS[s].short}</button>`).join('')}</div>` : ''}
  </article>`;
}
function slotBlock(k, s, day) {
  const items = day?.m?.[s] || [], kc = items.reduce((a, it) => a + itemKcal(it), 0);
  return `<div class="slot slot-${s}">
    <div class="slot-head"><span class="slot-tag">${SLOTS[s].label}</span>${kc ? `<span class="slot-k">${fmt(kc)} kcal</span>` : ''}
      <button class="x-btn" data-act="remove-slot" data-date="${k}" data-slot="${s}" aria-label="เอา${SLOTS[s].label}ออก" title="เอามื้อนี้ออก">${ic('x')}</button></div>
    ${items.map((it, i) => { const r = itemRec(it); if (!r) return ''; return `<div class="item ${it.eaten ? 'eaten' : ''} ${r.quick ? 'quick' : ''} ${lastAdded === `${k}|${s}|${i}` ? 'pop' : ''}" role="button" tabindex="0" data-act="item" data-date="${k}" data-slot="${s}" data-i="${i}">
      ${r.quick && !r.img ? `<span class="ph sm q-ph">${ic('cart')}</span>` : photo(r, 90, 'sm')}<span class="nm">${esc(r.name)}${num(it.s, 1) !== 1 ? ` <em>×${fmtQ(it.s)}</em>` : ''}${r.quick ? `<span class="src-tag">${SOURCES[r.src] || 'ซื้อมา'}</span>` : flagBadge(r, 'sm')}</span><span class="k">${fmt(itemKcal(it))}</span>
      <button class="eat-btn" data-act="eat" data-date="${k}" data-slot="${s}" data-i="${i}" aria-label="${it.eaten ? 'ยกเลิกกินแล้ว' : 'กินแล้ว'}" title="${it.eaten ? 'กินแล้ว' : 'กดเมื่อกินแล้ว'}">${ic('check')}</button></div>`; }).join('')}
    <div class="slot-adds"><button class="add-item" data-act="pick" data-date="${k}" data-slot="${s}">${ic('plus')} เพิ่มเมนู</button><button class="add-item log" data-act="quick-log" data-date="${k}" data-slot="${s}">${ic('cart')} กินนอก/ซื้อมา</button></div>
  </div>`;
}
function dowHeader() {
  const ws = state.settings.weekStart;
  return Array.from({ length: 7 }, (_, i) => `<span>${TH_DOW_S[(ws + i) % 7]}</span>`).join('');
}
function monthView() {
  const y = ui.cursor.getFullYear(), m = ui.cursor.getMonth(), last = new Date(y, m + 1, 0), tk = todayKey();
  const cells = [];
  for (let d = startOfWeek(new Date(y, m, 1)); d <= last || cells.length % 7; d = addDays(d, 1)) cells.push(d);
  const mk = rangeKeys(keyOf(new Date(y, m, 1)), keyOf(last)).map(dayKcal).filter((x) => x > 0);
  const avg = mk.length ? mk.reduce((a, b) => a + b, 0) / mk.length : 0;
  return `
  <section class="month-stats">
    <div class="pill-stat"><b>${mk.length}</b> / ${last.getDate()} วันที่แพลนแล้ว</div>
    <div class="pill-stat"><b>${fmt(avg)}</b> kcal เฉลี่ยต่อวัน</div>
    ${legend()}
  </section>
  <section class="card month-card">
    <div class="mgrid mhead">${dowHeader()}</div>
    <div class="mgrid">${cells.map((d) => {
      const k = keyOf(d), items = allItems(k), kc = dayKcal(k), out = d.getMonth() !== m;
      return `<button class="mcell lv-${status(kc)} ${out ? 'out' : ''} ${k === tk ? 'today' : ''}" data-act="open-day" data-date="${k}">
        <span class="mnum">${d.getDate()}</span>
        <span class="mavs">${items.slice(0, 3).map((x) => photo(x.r, 60, 'av')).join('')}${items.length > 3 ? `<small>+${items.length - 3}</small>` : ''}</span>
        <span class="mk">${kc ? fmt(kc) : ''}</span></button>`;
    }).join('')}</div>
  </section>`;
}
function yearView() {
  const y = ui.cursor.getFullYear(), ws = state.settings.weekStart, tm = new Date();
  let yearPlanned = 0;
  const cards = Array.from({ length: 12 }, (_, m) => {
    const last = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() - ws + 7) % 7;
    const kcs = Array.from({ length: last }, (_, i) => dayKcal(keyOf(new Date(y, m, i + 1))));
    const planned = kcs.filter((x) => x > 0); yearPlanned += planned.length;
    const avg = planned.length ? planned.reduce((a, b) => a + b, 0) / planned.length : 0;
    const cur = tm.getFullYear() === y && tm.getMonth() === m;
    return `<button class="ycard ${cur ? 'cur' : ''}" data-act="goto-month" data-m="${m}">
      <div class="yhead"><b>${TH_MON[m]}</b><span>${planned.length ? `${planned.length} วัน` : '—'}</span></div>
      <div class="ygrid">${'<i class="blank"></i>'.repeat(lead)}${kcs.map((kc) => `<i class="lv-${status(kc)}"></i>`).join('')}</div>
      <div class="yfoot">${avg ? `เฉลี่ย ${fmt(avg)} kcal/วัน` : 'ยังไม่ได้แพลน'}</div></button>`;
  }).join('');
  return `<section class="month-stats"><div class="pill-stat"><b>${yearPlanned}</b> วันที่แพลนแล้วในปีนี้</div>${legend()}</section>
    <section class="year-grid">${cards}</section>`;
}

/* ---------- MENUS ---------- */
function recipeMatches(r, q) {
  if (!q) return true;
  q = q.trim().toLowerCase();
  return r.name.toLowerCase().includes(q) || r.ing.some((x) => ING[x.id]?.name.toLowerCase().includes(q));
}
function pageMenus() {
  const types = [['all', 'ทั้งหมด'], ...Object.entries(TYPES)];
  const tabs = `<div class="seg page-tabs">${[['recipes', `เมนู <small>${state.recipes.length}</small>`], ['ings', `วัตถุดิบ <small>${Object.keys(ING).length}</small>`]].map(([v, l]) => `<button class="${ui.menuView === v ? 'on' : ''}" data-act="menu-view" data-v="${v}">${l}</button>`).join('')}</div>`;
  if (ui.menuView === 'ings') return `
  <div class="page-head">
    <div><p class="eyebrow">สมุดเมนู</p><h1>วัตถุดิบ<em>ทั้งหมด</em>${peek()}</h1></div>
    <button class="btn primary" data-act="ing-edit">${ic('plus')} เพิ่มวัตถุดิบ</button>
  </div>
  ${tabs}
  ${ingredientsView()}`;
  return `
  <div class="page-head">
    <div><p class="eyebrow">สมุดเมนู</p><h1>เมนู<em>ของฉัน</em>${peek()}</h1></div>
    <button class="btn primary" data-act="new-recipe">${ic('plus')} สร้างเมนูใหม่</button>
  </div>
  ${tabs}
  <div class="toolbar">
    <label class="search">${ic('search')}<input id="menu-q" type="search" placeholder="ค้นหาเมนู หรือวัตถุดิบ เช่น ไก่ ไข่ กุ้ง" value="${esc(ui.menuQ)}" autocomplete="off"></label>
    <div class="chips scroll">${types.map(([v, l]) => `<button class="chip ${ui.menuType === v ? 'on' : ''}" data-act="menu-type" data-v="${v}">${l}</button>`).join('')}</div>
  </div>
  <section class="menu-grid" id="menu-grid">${menuGrid()}</section>`;
}
function menuGrid() {
  const list = state.recipes.filter((r) => (ui.menuType === 'all' || r.type === ui.menuType) && recipeMatches(r, ui.menuQ));
  if (!state.recipes.length) return emptyState('สมุดเมนูยังว่างอยู่<br>เริ่มสร้างเมนูแรกของคุณได้เลย', `<div class="empty-acts"><button class="btn primary" data-act="new-recipe">${ic('plus')} สร้างเมนูแรก</button><button class="btn ghost" data-act="restore-samples" data-what="recipes">ใช้เมนูตัวอย่าง ${SEED_RECIPES.length} เมนู</button></div>`);
  if (!list.length) return emptyState('ไม่เจอเมนูนี้เลย', `<button class="btn primary" data-act="new-recipe" data-name="${esc(ui.menuQ)}">${ic('plus')} สร้างเมนู “${esc(ui.menuQ || 'ใหม่')}”</button>`);
  return list.map((r) => recipeCard(r)).join('');
}
function recipeCard(r) {
  const s = recipeSrc(r, 460);
  return `<button class="rcard" data-act="recipe" data-rid="${r.id}">${peek()}
    <div class="rc-photo ${s ? '' : 'no-photo'}">
      ${s ? `<img src="${esc(s)}" alt="" loading="lazy" decoding="async">` : `<img class="ph-3d" src="${fl('Shallow pan of food')}" alt="">`}
      <span class="rc-type">${TYPES[r.type] || ''}</span>${flagBadge(r, 'on-photo')}
      <div class="rc-title"><h3>${esc(r.name)}</h3><p>${r.ing.length} วัตถุดิบ${num(r.servings, 1) > 1 ? ` · ${r.servings} ที่` : ''}</p></div>
    </div>
    <span class="rc-kcal"><b>${fmt(perServing(r))}</b><small>kcal</small></span>
  </button>`;
}
function emptyState(text, action = '') {
  return `<div class="empty"><div class="empty-card">${catSVG()}<p>${text}</p>${action}</div></div>`;
}

/* ---------- SHOPPING ---------- */
function shopRangeKeys() {
  const t = new Date();
  switch (ui.shopRange) {
    case 'week': return weekKeys(t);
    case 'next': return weekKeys(addDays(t, 7));
    case 'month': return rangeKeys(keyOf(new Date(t.getFullYear(), t.getMonth(), 1)), keyOf(new Date(t.getFullYear(), t.getMonth() + 1, 0)));
    default: return ui.shopFrom <= ui.shopTo ? rangeKeys(ui.shopFrom, ui.shopTo) : [];
  }
}
function buildShopping(keys) {
  const agg = new Map(), menus = new Set(), skipped = new Map(), dl = new Set(state.profile.dislikes || []); let dishes = 0, kcal = 0;
  for (const k of keys) for (const { r, s } of allItems(k)) {
    dishes++; if (!r.quick) menus.add(r.id); kcal += perServing(r) * num(s, 1);
    const scale = num(s, 1) / Math.max(1, num(r.servings, 1));
    for (const x of r.ing) {
      const I = ING[x.id]; if (!I) continue;
      if (dl.has(x.id)) { skipped.set(x.id, (skipped.get(x.id) || new Set()).add(r.name)); continue; }
      let id = x.id, f = 1;
      if (I.shopAs && ING[I.shopAs[0]]) [id, f] = I.shopAs;
      const e = agg.get(id) || { id, g: 0, from: new Set() };
      e.g += toGrams(x.id, x.q, x.u) * scale * f; e.from.add(r.name);
      agg.set(id, e);
    }
  }
  return { items: [...agg.values()], dishes, menus: menus.size, kcal, skipped };
}
function fmtShopQty(id, g) {
  const I = ING[id];
  if (I.buy && I.units?.[I.buy]) return `${Math.max(1, Math.ceil(g / I.units[I.buy] - 0.05))} ${I.buy}`;
  if (g < 3) return 'นิดหน่อย';
  if (I.liquid) return g >= 1000 ? `${fmtQ(Math.round(g / 100) / 10)} ลิตร` : `${Math.ceil(g / 5) * 5} ml`;
  return g >= 1000 ? `${fmtQ(Math.round(g / 100) / 10)} kg` : `${Math.ceil(g / 5) * 5} g`;
}
function shopGroups(items) {
  const groups = {};
  for (const e of items) { const c = ING[e.id].cat in ING_CATS ? ING[e.id].cat : 'other'; (groups[c] ||= []).push(e); }
  return Object.keys(ING_CATS).filter((c) => groups[c]).map((c) => [c, groups[c].sort((a, b) => ING[a.id].name.localeCompare(ING[b.id].name, 'th'))]);
}
function pageShop() {
  const keys = shopRangeKeys(), data = buildShopping(keys), groups = shopGroups(data.items);
  const ranges = [['week', 'สัปดาห์นี้'], ['next', 'สัปดาห์หน้า'], ['month', 'เดือนนี้'], ['custom', 'กำหนดเอง']];
  const label = keys.length ? `${dayLabel(keys[0])} – ${dayLabel(keys[keys.length - 1])}` : '';
  const left = data.items.filter((e) => !state.shopChecked[e.id]).length;
  const pct = data.items.length ? Math.round(((data.items.length - left) / data.items.length) * 100) : 0;
  return `
  <div class="page-head">
    <div><p class="eyebrow">รายการซื้อของ</p><h1>ต้องซื้อ<em>อะไรบ้าง?</em>${peek()}</h1></div>
    <div class="head-actions">
      <button class="btn ghost sm" data-act="shop-copy" ${data.items.length ? '' : 'disabled'}>${ic('copy')} คัดลอก</button>
      <button class="btn ghost sm" data-act="shop-print" ${data.items.length ? '' : 'disabled'}>${ic('print')} พิมพ์</button>
    </div>
  </div>
  <div class="toolbar">
    <div class="seg">${ranges.map(([v, l]) => `<button class="${ui.shopRange === v ? 'on' : ''}" data-act="shop-range" data-v="${v}">${l}</button>`).join('')}</div>
    ${ui.shopRange === 'custom' ? `<div class="date-range"><input type="date" id="shop-from" value="${ui.shopFrom}"><span>ถึง</span><input type="date" id="shop-to" value="${ui.shopTo}"></div>` : `<span class="muted">${label}</span>`}
  </div>
  ${data.items.length ? `
  <section class="shop-summary">
    <div class="sum-card s1"><b>${data.dishes}</b><span>จานที่แพลนไว้</span></div>
    <div class="sum-card s2"><b>${data.menus}</b><span>เมนูไม่ซ้ำ</span></div>
    <div class="sum-card s3"><b>${left}<small> / ${data.items.length}</small></b><span>ยังไม่ได้ซื้อ</span><i class="progress"><i style="width:${pct}%"></i></i></div>
    <div class="sum-card s4"><b>${fmt(data.kcal)}</b><span>kcal รวมช่วงนี้</span></div>
  </section>
  <p class="shop-note">ปริมาณคำนวณจากสูตร × จำนวนที่ในแพลน · ข้าวสวยแปลงเป็นข้าวสารให้แล้ว
    ${Object.keys(state.shopChecked).length ? ` · <button class="link" data-act="shop-reset">ล้างเครื่องหมายถูก</button>` : ''}</p>
  ${data.skipped.size ? `<div class="skip-note"><span class="sk-ic">${ic('x')}</span><span class="sk-txt">ไม่ต้องซื้อ <small>เพราะคุณไม่ชอบทาน</small></span><span class="sk-list">${[...data.skipped.keys()].map((id) => `<b>${ingImg(id)}${esc(ING[id].name)}</b>`).join('')}</span></div>` : ''}
  <section class="shop-cols print-area">
    <h2 class="print-only">Calicat · รายการซื้อของ ${label}</h2>
    ${groups.map(([c, list]) => `<section class="card shop-group ${c === 'pantry' ? 'pantry' : ''}">
      <h3>${catImg(c, 'gi')}<span>${c === 'pantry' ? 'เครื่องปรุง <small>เช็คที่บ้านก่อนนะ</small>' : ING_CATS[c].label}</span><em>${list.length}</em></h3>
      <ul>${list.map((e) => `<li class="sitem ${state.shopChecked[e.id] ? 'done' : ''}" data-act="shop-check" data-id="${e.id}" role="checkbox" aria-checked="${!!state.shopChecked[e.id]}" tabindex="0">
        <span class="cb">${ic('check')}</span>${ingImg(e.id)}
        <div class="si-main"><b>${esc(ING[e.id].name)}</b><small>${[...e.from].slice(0, 3).map(esc).join(', ')}${e.from.size > 3 ? ` +${e.from.size - 3}` : ''}</small></div>
        <span class="qty">${fmtShopQty(e.id, e.g)}</span></li>`).join('')}</ul>
    </section>`).join('')}
  </section>` : emptyState('ช่วงนี้ยังไม่มีเมนูในแพลนเลย<br>แพลนก่อน แล้วรายการซื้อของจะมาเอง', `<button class="btn primary" data-act="tab" data-tab="plan">${ic('plan')} ไปหน้าแพลน</button>`)}`;
}
function shopRangeLabel(keys) {
  const a1 = parseKey(keys[0]), b1 = parseKey(keys[keys.length - 1]);
  return a1.getMonth() === b1.getMonth() ? `${a1.getDate()}–${b1.getDate()} ${TH_MON_S[b1.getMonth()]} ${be(b1.getFullYear())}` : `${a1.getDate()} ${TH_MON_S[a1.getMonth()]} – ${b1.getDate()} ${TH_MON_S[b1.getMonth()]} ${be(b1.getFullYear())}`;
}
function shopText() {
  const keys = shopRangeKeys(), data = buildShopping(keys), groups = shopGroups(data.items);
  const todo = data.items.filter((e) => !state.shopChecked[e.id]).length;
  const L = [`🛒 รายการซื้อของ · ${shopRangeLabel(keys)}`, `${data.dishes} จาน · ต้องซื้อ ${todo} รายการ`];
  for (const [c, list] of groups) {
    const left = list.filter((e) => !state.shopChecked[e.id]); if (!left.length) continue;
    L.push('', c === 'pantry' ? `▸ ${ING_CATS[c].label} (เช็คที่บ้านก่อน)` : `▸ ${ING_CATS[c].label}`);
    for (const e of left) L.push(`   • ${ING[e.id].name}  ${fmtShopQty(e.id, e.g)}`);
  }
  const done = data.items.filter((e) => state.shopChecked[e.id]);
  if (done.length) L.push('', `✓ ซื้อแล้ว: ${done.map((e) => ING[e.id].name).join(', ')}`);
  if (data.skipped.size) L.push('', `✗ ไม่ต้องซื้อ (ไม่ชอบทาน): ${[...data.skipped.keys()].map((id) => ING[id].name).join(', ')}`);
  L.push('', '— Calicat');
  return L.join('\n');
}
/* หน้าพิมพ์ A4 แยกต่างหาก */
function printShopping() {
  const keys = shopRangeKeys(), data = buildShopping(keys), groups = shopGroups(data.items);
  if (!data.items.length) return;
  const name = state.settings.name;
  const row = (e) => `<li class="${state.shopChecked[e.id] ? 'done' : ''}"><span class="box"></span><span class="n">${esc(ING[e.id].name)}</span><span class="dots"></span><span class="q">${fmtShopQty(e.id, e.g)}</span></li>`;
  const main = groups.filter(([c]) => c !== 'pantry'), pantry = groups.find(([c]) => c === 'pantry');
  const root = document.getElementById('print-root') || Object.assign(document.createElement('div'), { id: 'print-root' });
  root.innerHTML = `<div class="pr-page">
    <header class="pr-head">
      <div class="pr-brand"><svg viewBox="0 0 120 112" fill="none" stroke="#4F2317" stroke-width="7" stroke-linejoin="round"><path d="${CAT_HEAD}" fill="#F4CBC9"/></svg><div><b>Cali<span>cat</span></b><small>รายการซื้อของ${name ? ` ของ ${esc(name)}` : ''}</small></div></div>
      <div class="pr-range"><b>${shopRangeLabel(keys)}</b><small>${data.dishes} จาน · ${data.items.length} รายการ · พิมพ์ ${parseKey(todayKey()).getDate()} ${TH_MON_S[new Date().getMonth()]}</small></div>
    </header>
    <div class="pr-cols">${main.map(([c, list]) => `<section class="pr-sec"><h3>${ING_CATS[c].label}<em>${list.length}</em></h3><ul>${list.map(row).join('')}</ul></section>`).join('')}</div>
    ${pantry ? `<section class="pr-sec pantry"><h3>${ING_CATS.pantry.label} <small>เช็คที่บ้านก่อน</small><em>${pantry[1].length}</em></h3><ul class="grid">${pantry[1].map(row).join('')}</ul></section>` : ''}
    ${data.skipped.size ? `<p class="pr-skip">ไม่ต้องซื้อ (ไม่ชอบทาน): ${[...data.skipped.keys()].map((id) => esc(ING[id].name)).join(', ')}</p>` : ''}
    <section class="pr-notes"><h3>โน้ตเพิ่มเติม</h3><div class="lines"><i></i><i></i><i></i></div></section>
    <footer class="pr-foot">Calicat · แพลนอาหาร & นับแคลอรี่</footer>
  </div>`;
  document.body.appendChild(root);
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}

/* ---------- FRIDGE (ingredients → menus) ---------- */
function fridgeMatches() {
  const have = new Set(state.fridge);
  if (!have.size) return [];
  return state.recipes.map((r) => {
    const main = [...new Set(r.ing.map((x) => x.id))].filter((id) => ING[id] && ING[id].cat !== 'pantry');
    const got = main.filter((id) => have.has(id) || (ING[id].shopAs && have.has(ING[id].shopAs[0])));
    const miss = main.filter((id) => !got.includes(id));
    return { r, got, miss, pct: main.length ? Math.round((got.length / main.length) * 100) : 0 };
  }).filter((x) => x.got.length && !recipeFlags(x.r).allergy.length).sort((a, b) => b.pct - a.pct || a.miss.length - b.miss.length);
}
function fridgeTiles() {
  const q = ui.fridgeQ.trim().toLowerCase();
  const list = Object.values(ING).filter((i) => isActive(i) && i.cat !== 'pantry' && !/ข้าวสาร/.test(i.name) && (!ui.fridgeOnly || state.fridge.includes(i.id))
    && (ui.fridgeCat === 'all' || i.cat === ui.fridgeCat) && (!q || i.name.toLowerCase().includes(q)));
  if (!list.length) return `<div class="tile-empty"><p>${ui.fridgeOnly ? 'ยังไม่ได้เลือกวัตถุดิบในหมวดนี้' : 'ไม่เจอวัตถุดิบนี้'}</p><button class="btn ghost sm" data-act="goto-ings">${ic('plus')} เพิ่มวัตถุดิบใหม่</button></div>`;
  return list.map((i) => `<button class="tile ${state.fridge.includes(i.id) ? 'on' : ''}" data-act="fridge-toggle" data-id="${i.id}">
    ${state.fridge.includes(i.id) ? `<span class="tick">${ic('check')}</span>` : ''}${ingImg(i.id, 'ti')}<span>${esc(i.name)}</span></button>`).join('');
}
function pageFridge() {
  const sel = state.fridge.filter((id) => ING[id]);
  const cats = [['all', 'ทั้งหมด'], ...Object.keys(ING_CATS).filter((c) => c !== 'pantry' && Object.values(ING).some((i) => i.cat === c && isActive(i))).map((c) => [c, ING_CATS[c].label])];
  const res = fridgeMatches(), full = res.filter((x) => x.pct === 100).length;
  return `
  <div class="page-head">
    <div><p class="eyebrow">มีอะไรในตู้เย็น · หรืออยากซื้ออะไร</p><h1>มีของแบบนี้<em>ทำอะไรได้บ้าง</em>${peek()}</h1></div>
  </div>
  <section class="fridge-layout">
    <div class="card fridge-pick">
      <div class="tray">
        <div class="tray-head"><b>วัตถุดิบที่เลือก <span class="count">${sel.length}</span></b>${sel.length ? `<button class="link" data-act="fridge-clear">ล้างทั้งหมด</button>` : ''}</div>
        ${sel.length ? `<div class="tray-cats">${Object.keys(ING_CATS).map((c) => { const n = sel.filter((id) => ING[id].cat === c).length; return n ? `<span class="tc">${catImg(c, 'ci')}${ING_CATS[c].label}<b>${n}</b></span>` : ''; }).join('')}</div>` : ''}
        <div class="tray-items ${ui.trayOpen ? 'open' : ''}">${sel.length ? (ui.trayOpen ? sel : sel.slice(0, 10)).map((id) => `<button class="tray-chip" data-act="fridge-toggle" data-id="${id}">${ingImg(id)}${esc(ING[id].name)}${ic('x')}</button>`).join('') + (sel.length > 10 ? `<button class="tray-more" data-act="tray-toggle">${ui.trayOpen ? 'ย่อ' : `+${sel.length - 10} ดูทั้งหมด`}</button>` : '') : '<span class="muted small">แตะวัตถุดิบด้านล่างเพื่อเลือก</span>'}</div>
      </div>
      <label class="search">${ic('search')}<input id="fridge-q" type="search" placeholder="ค้นหาวัตถุดิบ" value="${esc(ui.fridgeQ)}" autocomplete="off"></label>
      <div class="chips scroll cat-tabs">${cats.map(([v, l]) => { const n = v === 'all' ? 0 : sel.filter((id) => ING[id].cat === v).length; return `<button class="chip ${ui.fridgeCat === v ? 'on' : ''}" data-act="fridge-cat" data-v="${v}">${v !== 'all' ? catImg(v, 'ci') : ''}${l}${n ? `<span class="cnt">${n}</span>` : ''}</button>`; }).join('')}</div>
      <div class="tile-tools"><label class="switch"><input type="checkbox" data-fonly ${ui.fridgeOnly ? 'checked' : ''}><span></span> แสดงเฉพาะที่เลือก</label>
        <span class="grow"></span><button class="link" data-act="fridge-cat-all">${ic('check')} เลือกทั้งหมวดนี้</button></div>
      <div class="tile-grid" id="tile-grid">${fridgeTiles()}</div>
    </div>
    <div class="fridge-results">
      <div class="res-head"><h2>${res.length ? `ทำได้ ${res.length} เมนู` : 'เมนูที่ทำได้'}</h2>${full ? `<span class="badge-ok">${ic('check')} ครบทุกอย่าง ${full} เมนู</span>` : ''}</div>
      ${res.length ? `<div class="match-grid">${res.map(({ r, got, miss, pct }) => `<article class="mcard">
        <div class="mc-head">${photo(r, 160, 'md')}
          <div class="mc-title"><h3>${esc(r.name)} ${flagBadge(r, 'sm')}</h3><p>${fmt(perServing(r))} kcal · ${TYPES[r.type] || ''}</p></div>
          <div class="pct ${pct === 100 ? 'full' : ''}" style="--p:${pct}"><span>${pct}%</span></div></div>
        <div class="mc-list"><span class="lbl">มีแล้ว</span>${got.map((id) => `<span class="ing-tag have">${ingImg(id)}${esc(ING[id].name)}</span>`).join('')}</div>
        ${miss.length ? `<div class="mc-list"><span class="lbl">ต้องซื้อ</span>${miss.map((id) => `<span class="ing-tag miss">${ingImg(id)}${esc(ING[id].name)}</span>`).join('')}</div>` : ''}
        <div class="mc-actions"><button class="btn ghost sm" data-act="recipe" data-rid="${r.id}">ดูสูตร</button><button class="btn primary sm" data-act="addplan" data-rid="${r.id}">${ic('plus')} ใส่ในแพลน</button></div>
      </article>`).join('')}</div>` : emptyState(sel.length ? 'ยังไม่มีเมนูที่ใช้วัตถุดิบพวกนี้<br>ลองสร้างเมนูใหม่ดูไหม?' : 'เลือกวัตถุดิบที่มี<br>แล้วแมวจะช่วยคิดเมนูให้', sel.length ? `<button class="btn primary" data-act="new-recipe">${ic('plus')} สร้างเมนูใหม่</button>` : '')}
    </div>
  </section>`;
}

/* ---------- ME / SETTINGS ---------- */
function tdee(p) {
  const bmr = 10 * num(p.weight) + 6.25 * num(p.height) - 5 * num(p.age) + (p.sex === 'm' ? 5 : -161);
  const t = bmr * num(p.activity, 1.2);
  return { bmr: Math.round(bmr), tdee: Math.round(t), target: Math.max(1200, Math.round((t + num(p.aim)) / 50) * 50) };
}
function tdeeOut() {
  const t = tdee(state.profile), cur = state.settings.goal;
  return `<div class="tdee-res">
    <div><span>BMR</span><b>${fmt(t.bmr)}</b><small>พลังงานตอนพัก</small></div>
    <div><span>TDEE</span><b>${fmt(t.tdee)}</b><small>ใช้จริงทั้งวัน</small></div>
    <div class="hl"><span>แนะนำ</span><b>${fmt(t.target)}</b><small>kcal / วัน ตามเป้า</small></div>
  </div>
  <p class="tdee-note">${ic('flame')}<span>เป้าหมายตอนนี้ <b>${fmt(cur)} kcal</b> — ค่าแนะนำเป็นแค่ตัวช่วย ปรับเองได้ทุกค่าที่การ์ด “เป้าหมายประจำวัน”</span></p>
  <button class="btn primary block use-tdee" data-act="use-tdee" data-v="${t.target}" ${cur === t.target ? 'disabled' : ''}>${ic('check')} ${cur === t.target ? 'ใช้ค่านี้เป็นเป้าหมายอยู่แล้ว' : `ใช้ ${fmt(t.target)} kcal เป็นเป้าหมาย`}</button>`;
}
function bmiInfo(p) {
  const h = num(p.height) / 100, b = h ? num(p.weight) / (h * h) : 0;
  const label = b < 18.5 ? 'น้ำหนักน้อย' : b < 23 ? 'สมส่วน' : b < 25 ? 'น้ำหนักเกิน' : 'อ้วน';
  return { bmi: b ? b.toFixed(1) : '—', label };
}
const ACTIVITY = [[1.2, 'นั่งทำงาน', 'แทบไม่ได้ออกกำลังกาย'], [1.375, 'ขยับเบา ๆ', 'ออกกำลังกาย 1–3 วัน/สัปดาห์'], [1.55, 'ปานกลาง', 'ออกกำลังกาย 3–5 วัน/สัปดาห์'], [1.725, 'หนัก', 'ออกกำลังกาย 6–7 วัน/สัปดาห์'], [1.9, 'นักกีฬา', 'ซ้อมทุกวัน / ใช้แรงมาก']];
const AIMS = [[-500, 'ลดน้ำหนัก', '−500'], [-300, 'ลดสบาย ๆ', '−300'], [0, 'รักษาน้ำหนัก', '±0'], [300, 'เพิ่มกล้าม', '+300']];
function prefBox(k, title, desc, quick) {
  const sel = (state.profile[k] || []).filter((id) => ING[id]);
  return `<div class="pref-box ${k}">
    <div class="pb-head"><h3>${title}</h3><span class="pb-count">${sel.length}</span></div>
    <p class="muted small">${desc}</p>
    <div class="pb-chips">${sel.length ? sel.map((id) => `<button class="pchip" data-act="pref-del" data-k="${k}" data-id="${id}">${ingImg(id)}${esc(ING[id].name)}${ic('x')}</button>`).join('') : '<span class="muted small">ยังไม่ได้เลือก</span>'}</div>
    <div class="combo" data-combo="${k}">
      <label class="combo-box">${ic('search')}<input data-combo-in="${k}" placeholder="พิมพ์เพื่อค้นหา เช่น กุ้ง ผักชี" autocomplete="off" enterkeyhint="search" role="combobox" aria-expanded="false" aria-autocomplete="list"><span class="combo-caret">${ic('right')}</span></label>
    </div>
    <div class="pb-quick">${quick.map(([l, ids]) => [l, ids.filter((x) => ING[x])]).filter(([, ids]) => ids.length).map(([l, ids]) => { const all = ids.every((x) => sel.includes(x)); return `<button class="qchip ${all ? 'on' : ''}" ${all ? 'disabled' : ''} data-act="pref-add" data-k="${k}" data-ids="${ids.join(',')}">${all ? ic('check') : ic('plus')}${l}</button>`; }).join('')}</div>
  </div>`;
}
function pageMe() {
  const s = state.settings, p = state.profile, bm = bmiInfo(p);
  const pill = (k, v, label, extra = '') => `<button class="pill ${String(p[k]) === String(v) ? 'on' : ''}" data-act="prof-set" data-k="${k}" data-v="${v}">${label}${extra}</button>`;
  const unitIn = (k, label, unit, min, max, mode) => `<label class="field"><span>${label}</span><div class="inp-unit"><input type="number" data-prof="${k}" value="${p[k]}" min="${min}" max="${max}" inputmode="${mode}"><em>${unit}</em></div></label>`;
  const planned = Object.keys(state.plan).filter((k) => allItems(k).length).length;
  return `
  <div class="page-head"><div><p class="eyebrow">ตั้งค่า</p><h1>โปรไฟล์<em>ส่วนตัว</em></h1></div></div>
  <div class="me-layout">
    <aside class="profile-card card">
      <div class="pc-body">
        <div class="av-wrap">${avatarHTML('xl')}<label class="av-cam" title="เปลี่ยนรูปโปรไฟล์">${ic('image')}<input type="file" id="avatar-file" accept="image/*" hidden></label></div>
        <label class="name-edit"><input id="set-name" value="${esc(s.name)}" placeholder="ตั้งชื่อเล่น" maxlength="20" size="${Math.max(6, (s.name || 'ตั้งชื่อเล่น').length + 1)}" aria-label="ชื่อเล่น">${ic('edit')}</label>
        <div class="av-tools">${s.avatar ? `<button class="link" data-act="av-rm">เอารูปออก</button>` : Object.entries(AV_BG).map(([k, c]) => `<button class="swatch ${s.avatarBg === k ? 'on' : ''}" style="--c:${c}" data-act="av-bg" data-v="${k}" aria-label="สีพื้น ${k}"></button>`).join('')}</div>
        <div class="pc-stats">
          <div><b>${fmt(s.goal)}</b><span>kcal/วัน</span></div>
          <div><b>${fmt(s.waterGoal || 2000)}</b><span>ml/วัน</span></div>
          <div><b id="bmi-v">${bm.bmi}</b><span>BMI · <i id="bmi-l">${bm.label}</i></span></div>
        </div>
        <p class="pc-meta">แพลนไว้แล้ว ${planned} วัน · ${state.recipes.length} เมนู</p>
      </div>
      <div class="pc-data">
        <button class="data-row" data-act="export"><span class="dr-ic">${ic('download')}</span><span><b>สำรองข้อมูล</b><small>ดาวน์โหลดไฟล์ .json</small></span></button>
        <label class="data-row"><span class="dr-ic">${ic('upload')}</span><span><b>นำเข้าข้อมูล</b><small>กู้คืนจากไฟล์สำรอง</small></span><input type="file" id="import-file" accept="application/json,.json" hidden></label>
        <button class="data-row danger" data-act="reset-all"><span class="dr-ic">${ic('trash')}</span><span><b>เริ่มใหม่ทั้งหมด</b><small>ลบแพลน เมนู และการตั้งค่า</small></span></button>
      </div>
    </aside>

    <div class="me-main">
      <section class="card pad">
        <h2 class="card-title">เป้าหมายประจำวัน</h2>
        <div class="goal-duo">
          <div class="goal-tile kcal">
            <span class="gt-label">แคลอรี่</span>
            <div class="goal-input"><button class="icon-btn" data-act="goal-step" data-v="-50" aria-label="ลด">${ic('minus')}</button><input type="number" id="set-goal" min="800" max="6000" step="50" value="${s.goal}" inputmode="numeric" aria-label="เป้าหมายแคลอรี่"><button class="icon-btn" data-act="goal-step" data-v="50" aria-label="เพิ่ม">${ic('plus')}</button></div>
            <small>kcal / วัน</small>
          </div>
          <div class="goal-tile water">
            <span class="gt-label">ดื่มน้ำ</span>
            <div class="goal-input"><button class="icon-btn" data-act="water-step" data-v="-250" aria-label="ลด">${ic('minus')}</button><input type="number" id="set-water" min="500" max="6000" step="250" value="${s.waterGoal || 2000}" inputmode="numeric" aria-label="เป้าหมายดื่มน้ำ"><button class="icon-btn" data-act="water-step" data-v="250" aria-label="เพิ่ม">${ic('plus')}</button></div>
            <small>ml / วัน · ${Math.round((s.waterGoal || 2000) / 250)} แก้ว</small>
          </div>
        </div>
        <div class="goal-extra">
          <div><h3 class="sub-title">มื้อเริ่มต้นของแต่ละวัน</h3>
            <div class="chips wrap">${SLOT_ORDER.map((x) => `<button class="chip ${s.slots.includes(x) ? 'on' : ''}" data-act="def-slot" data-slot="${x}">${s.slots.includes(x) ? ic('check') : ''}${SLOTS[x].label}</button>`).join('')}</div></div>
          <div><h3 class="sub-title">สัปดาห์เริ่มวัน</h3>
            <div class="seg">${[[1, 'จันทร์'], [0, 'อาทิตย์']].map(([v, l]) => `<button class="${s.weekStart === v ? 'on' : ''}" data-act="set-ws" data-v="${v}">${l}</button>`).join('')}</div></div>
        </div>
      </section>

      <section class="card pad calc-card">
        <h2 class="card-title">คำนวณแคลอรี่ที่เหมาะกับฉัน</h2>
        <div class="calc-grid">
          <div class="calc-form">
            <div class="pill-row">${pill('sex', 'f', 'หญิง')}${pill('sex', 'm', 'ชาย')}</div>
            <div class="form-grid three">
              ${unitIn('age', 'อายุ', 'ปี', 10, 100, 'numeric')}
              ${unitIn('weight', 'น้ำหนัก', 'kg', 20, 300, 'decimal')}
              ${unitIn('height', 'ส่วนสูง', 'cm', 100, 250, 'numeric')}
            </div>
            <h3 class="sub-title">ออกกำลังกายบ่อยแค่ไหน</h3>
            <div class="act-list">${ACTIVITY.map(([v, t, d]) => `<button class="act-opt ${String(p.activity) === String(v) ? 'on' : ''}" data-act="prof-set" data-k="activity" data-v="${v}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
            <h3 class="sub-title">เป้าหมาย</h3>
            <div class="pill-row wrap">${AIMS.map(([v, t, n]) => pill('aim', v, t, ` <small>${n}</small>`)).join('')}</div>
          </div>
          <div class="calc-result" id="tdee-out">${tdeeOut()}</div>
        </div>
      </section>

      <section class="card pad prefs-card">
        <h2 class="card-title">อาหารที่แพ้ & ไม่ชอบทาน</h2>
        <div class="pref-grid">
          ${prefBox('allergies', 'แพ้อาหาร', 'เมนูที่มีของพวกนี้จะไม่ถูกแนะนำและไม่ถูกสุ่มลงแพลน ถ้าเลือกเองจะถามก่อนทุกครั้ง', [['อาหารทะเล', Object.values(ING).filter((i) => i.cat === 'seafood').map((i) => i.id)], ['ถั่วลิสง', ['peanut', 'peanut_butter']], ['นมวัว', ['milk', 'cheese', 'butter', 'greek_yogurt']], ['ไข่', ['egg', 'egg_tofu', 'egg_noodle']], ['แป้งสาลี', ['flour', 'bread_whole', 'bread_white', 'spaghetti', 'egg_noodle']], ['ถั่วเหลือง', ['firm_tofu', 'soy', 'dark_soy']]])}
          ${prefBox('dislikes', 'ไม่ชอบทาน', 'ยังกินเมนูนั้นได้ตามปกติ แค่มีป้ายบอกว่ามีส่วนผสมนี้ ตอนทำจะได้ไม่ต้องใส่', [['ผักชี', ['coriander']], ['ต้นหอม', ['spring_onion']], ['ขึ้นฉ่าย', ['celery']], ['พริก', ['chili']], ['หอมใหญ่', ['onion']], ['ขิง', ['ginger']], ['เนื้อวัว', ['beef']], ['มะเขือเปราะ', ['thai_eggplant']]])}
        </div>
      </section>
    </div>
  </div>`;
}
/* หน้าวัตถุดิบ (อยู่ในแท็บเมนู): ค้นหา กรอง แบ่งหน้า แก้ไข เปิด/ปิด ลบ */
const ING_PAGE = 12;
function ingFiltered() {
  const q = ui.ingQ.trim().toLowerCase(), st = ui.ingStatus;
  return Object.values(ING).filter((i) => (!q || i.name.toLowerCase().includes(q))
    && (ui.ingCat === 'all' || i.cat === ui.ingCat)
    && (st === 'all' || (st === 'active' && isActive(i)) || (st === 'off' && !isActive(i)) || (st === 'mine' && (i.custom || i.edited))))
    .sort((a, b) => Object.keys(ING_CATS).indexOf(a.cat) - Object.keys(ING_CATS).indexOf(b.cat) || a.name.localeCompare(b.name, 'th'));
}
function ingStats() {
  const all = Object.values(ING);
  return { all: all.length, active: all.filter(isActive).length, off: all.filter((i) => !isActive(i)).length, mine: all.filter((i) => i.custom || i.edited).length };
}
function pagerHTML(page, pages) {
  if (pages <= 1) return '';
  const nums = []; for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return `<nav class="pager"><button class="icon-btn" data-act="ing-page" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="หน้าก่อน">${ic('left')}</button>
    ${nums.map((p) => p === '…' ? '<span class="dots">…</span>' : `<button class="pg ${p === page ? 'on' : ''}" data-act="ing-page" data-p="${p}">${p}</button>`).join('')}
    <button class="icon-btn" data-act="ing-page" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="หน้าถัดไป">${ic('right')}</button></nav>`;
}
function ingTableHTML() {
  const list = ingFiltered(), pages = Math.max(1, Math.ceil(list.length / ING_PAGE));
  ui.ingPage = Math.min(Math.max(1, ui.ingPage), pages);
  const rows = list.slice((ui.ingPage - 1) * ING_PAGE, ui.ingPage * ING_PAGE);
  const al = new Set(state.profile.allergies || []), dl = new Set(state.profile.dislikes || []);
  if (!Object.keys(ING).length) return `<div class="tile-empty"><p>ยังไม่มีวัตถุดิบเลย เริ่มเพิ่มของคุณเองได้เลย</p><div class="empty-acts"><button class="btn primary sm" data-act="ing-edit">${ic('plus')} เพิ่มวัตถุดิบแรก</button><button class="btn ghost sm" data-act="restore-samples" data-what="ings">ใช้วัตถุดิบตั้งต้น ${Object.keys(BASE_ING).length} อย่าง</button></div></div>`;
  if (!rows.length) return `<p class="muted center pad">ไม่เจอวัตถุดิบที่ตรงกับตัวกรอง</p>`;
  return `<div class="ing-rows-list">${rows.map((i) => `<div class="ing-item ${isActive(i) ? '' : 'off'}">
      <span class="ii-wrap">${ingImg(i.id, 'ii lg')}</span>
      <div class="ii-main"><b>${esc(i.name)}</b>
        <div class="ii-tags"><span>${ING_CATS[i.cat]?.label || ''}</span>${i.custom ? '<span class="tg mine">เพิ่มเอง</span>' : ''}${i.edited ? '<span class="tg edited">แก้ไขแล้ว</span>' : ''}${al.has(i.id) ? '<span class="tg allergy">แพ้</span>' : ''}${dl.has(i.id) ? '<span class="tg dislike">ไม่ชอบ</span>' : ''}</div>
        <small class="ii-units">${Object.entries(i.units || {}).map(([u, g]) => `1 ${u} ≈ ${fmtQ(g)} g`).join(' · ') || 'ไม่มีหน่วยนับพิเศษ'}</small></div>
      <div class="ii-kcal"><b>${fmt(i.kcal)}</b><small>kcal/100g</small></div>
      <label class="switch" title="${isActive(i) ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}"><input type="checkbox" data-ingtoggle="${i.id}" ${isActive(i) ? 'checked' : ''}><span></span></label>
      <div class="ii-acts"><button class="icon-btn" data-act="ing-edit" data-id="${i.id}" aria-label="แก้ไข ${esc(i.name)}">${ic('edit')}</button>
        ${i.custom ? `<button class="icon-btn danger-text" data-act="del-ing" data-id="${i.id}" aria-label="ลบ ${esc(i.name)}">${ic('trash')}</button>` : ''}</div>
    </div>`).join('')}</div>
    <div class="ing-foot"><span class="muted small">แสดง ${(ui.ingPage - 1) * ING_PAGE + 1}–${(ui.ingPage - 1) * ING_PAGE + rows.length} จาก ${list.length} รายการ</span>${pagerHTML(ui.ingPage, pages)}</div>`;
}
function ingredientsView() {
  const st = ingStats();
  const cats = [['all', 'ทุกหมวด'], ...Object.entries(ING_CATS).map(([k, v]) => [k, v.label])];
  return `<section class="ing-stats">
      <button class="ist ${ui.ingStatus === 'all' ? 'on' : ''}" data-act="ing-status" data-v="all"><b>${st.all}</b><span>ทั้งหมด</span></button>
      <button class="ist ${ui.ingStatus === 'active' ? 'on' : ''}" data-act="ing-status" data-v="active"><b>${st.active}</b><span>ใช้งานอยู่</span></button>
      <button class="ist ${ui.ingStatus === 'off' ? 'on' : ''}" data-act="ing-status" data-v="off"><b>${st.off}</b><span>ปิดใช้งาน</span></button>
    </section>
    <section class="card pad ing-manager">
      <div class="toolbar">
        <label class="search">${ic('search')}<input id="ing-q" type="search" placeholder="ค้นหาวัตถุดิบ" value="${esc(ui.ingQ)}" autocomplete="off"></label>
        <div class="chips scroll">${cats.map(([v, l]) => `<button class="chip ${ui.ingCat === v ? 'on' : ''}" data-act="ing-cat" data-v="${v}">${v !== 'all' ? catImg(v, 'ci') : ''}${l}</button>`).join('')}</div>
      </div>
      <div id="ing-table">${ingTableHTML()}</div>
      <p class="muted small">* แคลอรี่เป็นค่าโดยประมาณ · ปิดใช้งานแล้ววัตถุดิบจะไม่ขึ้นในรายการให้เลือก แต่เมนูเดิมยังคำนวณได้ตามปกติ</p>
    </section>`;
}

const PAGES = { plan: pagePlan, menus: pageMenus, shop: pageShop, fridge: pageFridge, me: pageMe };

/* =========================================================
   MODALS: day, picker, item, recipe, editor, add-to-plan
   ========================================================= */
function openDayModal(k) {
  const m = openModal('', { cls: 'day-sheet', refresh: () => draw() });
  function draw() {
    m.sheet.innerHTML = `<div class="modal-head"><div><p class="eyebrow">แพลนรายวัน</p><h3>${dayLabel(k)} ${be(parseKey(k).getFullYear())}</h3></div>${closeBtn}</div>${dayCard(k, { modal: true })}`;
  }
  draw();
}

function openPicker(k, slot) {
  const ctx = { q: '', f: 'suggest', added: [] };
  const filters = [['suggest', `เหมาะกับมื้อ${SLOTS[slot].short}`], ['all', 'ทั้งหมด'], ...Object.entries(TYPES)];
  const m = openModal(`
    <div class="modal-head"><div><p class="eyebrow">${SLOTS[slot].label} · ${dayLabel(k)}</p><h3>เลือกเมนู</h3></div>${closeBtn}</div>
    <label class="search">${ic('search')}<input id="pk-q" type="search" placeholder="พิมพ์ชื่อเมนู เช่น กะเพรา สลัด" autocomplete="off"></label>
    <div class="chips scroll" id="pk-f"></div>
    <div class="pk-added" id="pk-added"></div>
    <div class="pick-list" id="pk-list"></div>
    <div class="modal-foot"><button class="btn primary block" data-act="close">เสร็จแล้ว</button></div>`, {
    cls: 'picker',
    onClick: (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'f') { ctx.f = b.dataset.v; draw(); }
      if (b.dataset.m === 'add') { const r = rec(b.dataset.rid); allergyOk(r).then((ok) => { if (!ok) return; addToPlan(k, slot, r.id, 1); ctx.added.push(r.id); draw(); toast(`เพิ่ม ${r.name} แล้ว`); }); }
      if (b.dataset.m === 'create') openEditor(null, { name: ctx.q.trim(), slot, onSave: (r) => { addToPlan(k, slot, r.id, 1); ctx.added.push(r.id); draw(); } });
    },
  });
  const q = $('#pk-q', m.sheet);
  q.addEventListener('input', () => { ctx.q = q.value; draw(); });
  function draw() {
    $('#pk-f', m.sheet).innerHTML = filters.map(([v, l]) => `<button class="chip ${ctx.f === v ? 'on' : ''}" data-m="f" data-v="${v}">${l}</button>`).join('');
    $('#pk-added', m.sheet).innerHTML = ctx.added.length ? `<span class="muted">เพิ่มแล้ว</span> ${ctx.added.map((id) => `<span class="ing-tag have">${photo(rec(id), 40, 'xxs')}${esc(rec(id)?.name)}</span>`).join('')}` : '';
    const qq = ctx.q.trim();
    let list = state.recipes.filter((r) => recipeMatches(r, qq));
    if (!qq) list = list.filter((r) => ctx.f === 'all' || (ctx.f === 'suggest' ? (r.slots || []).includes(slot) && !isAvoided(r) : r.type === ctx.f));
    const exact = list.some((r) => r.name.toLowerCase() === qq.toLowerCase());
    $('#pk-list', m.sheet).innerHTML =
      (qq && !exact ? `<button class="pick-row create" data-m="create"><span class="ph md plus-ph">${ic('plus')}</span><span class="nm">สร้างเมนูใหม่ “${esc(qq)}”<small>ใส่วัตถุดิบ แล้วระบบคำนวณแคลอรี่ให้</small></span></button>` : '') +
      (list.length ? list.map((r) => `<button class="pick-row" data-m="add" data-rid="${r.id}">${photo(r, 120, 'md')}
        <span class="nm"><span>${esc(r.name)} ${flagBadge(r, 'sm')}</span><small>${TYPES[r.type] || ''} · ${r.ing.length} วัตถุดิบ</small></span><span class="k">${fmt(perServing(r))}<small>kcal</small></span><span class="plus">${ic('plus')}</span></button>`).join('')
        : `<p class="muted center pad">ไม่เจอเมนูที่ตรงกัน</p>`);
  }
  draw();
  if (matchMedia('(pointer:fine)').matches) setTimeout(() => q.focus(), 60);
}

function openItemModal(k, slot, idx) {
  const m = openModal('', {
    cls: 'small item-sheet', refresh: () => draw(),
    onClick: (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const d = state.plan[k], it = d?.m[slot]?.[idx]; if (!it) return;
      const a = b.dataset.m;
      if (a === 'dec') it.s = Math.max(0.5, num(it.s, 1) - 0.5);
      if (a === 'inc') it.s = Math.min(20, num(it.s, 1) + 0.5);
      if (a === 'move') {
        const to = b.dataset.slot; d.m[slot].splice(idx, 1);
        if (!d.slots.includes(to)) d.slots.push(to);
        (d.m[to] ||= []).push(it); closeModal(m); save(); refreshAll(); toast(`ย้ายไป${SLOTS[to].label}แล้ว`); return;
      }
      if (a === 'del') { d.m[slot].splice(idx, 1); closeModal(m); save(); refreshAll(); toast('ลบออกจากแพลนแล้ว'); return; }
      if (a === 'view') { openRecipe(it.rid); return; }
      if (a === 'edit-q') { openQuickLog(k, slot, idx); return; }
      if (a === 'eat') it.eaten = !it.eaten;
      save(); refreshAll();
    },
  });
  function draw() {
    const it = state.plan[k]?.m[slot]?.[idx]; if (!it) return;
    const r = itemRec(it); if (!r) return;
    m.sheet.innerHTML = `<div class="item-head">${r.quick && !r.img ? `<span class="ph lg q-ph">${ic('cart')}</span>` : photo(r, 240, 'lg')}<div class="ih-text"><p class="eyebrow">${SLOTS[slot].label} · ${dayLabel(k)}${r.quick ? ` · ${SOURCES[r.src] || ''}` : ''}</p><h3>${esc(r.name)}</h3></div>${closeBtn}</div>
      <button class="eat-toggle ${it.eaten ? 'on' : ''}" data-m="eat"><span class="et-box">${ic('check')}</span><span><b>${it.eaten ? 'กินแล้ว' : 'ยังไม่ได้กิน'}</b><small>${it.eaten ? 'แตะเพื่อยกเลิก' : 'แตะเมื่อกินมื้อนี้แล้ว'}</small></span></button>
      ${r.note ? `<p class="note small">${esc(r.note)}</p>` : ''}
      <div class="item-kcal"><b>${fmt(itemKcal(it))}</b> kcal <span class="muted">(${fmt(perServing(r))} kcal × ${fmtQ(it.s)} ที่)</span></div>
      <div class="field"><span class="lbl">จำนวนที่</span><div class="stepper"><button class="icon-btn" data-m="dec" aria-label="ลด">${ic('minus')}</button><b>${fmtQ(it.s)}</b><button class="icon-btn" data-m="inc" aria-label="เพิ่ม">${ic('plus')}</button></div></div>
      <div class="field"><span class="lbl">ย้ายไปมื้อ</span><div class="chips wrap">${SLOT_ORDER.filter((s) => s !== slot).map((s) => `<button class="chip" data-m="move" data-slot="${s}">${SLOTS[s].short}</button>`).join('')}</div></div>
      <div class="modal-foot"><button class="btn ghost danger-text" data-m="del">${ic('trash')} ลบ</button><span class="grow"></span>${r.quick ? `<button class="btn ghost" data-m="edit-q">${ic('edit')} แก้ไข</button>` : `<button class="btn ghost" data-m="view">ดูสูตร</button>`}<button class="btn primary" data-act="close">เสร็จ</button></div>`;
  }
  draw();
}

const stepDone = {};
function openRecipe(rid) {
  const m = openModal('', {
    cls: 'recipe-sheet', refresh: () => draw(),
    onClick: (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const r = rec(rid); if (!r) return;
      if (b.dataset.m === 'edit') openEditor(rid);
      if (b.dataset.m === 'plan') openAddToPlan(rid);
      if (b.dataset.m === 'dup') {
        const c = { ...clone(r), id: uid('r'), name: r.name + ' (สำเนา)' };
        state.recipes.push(c); save(); refreshAll(); closeModal(m); openEditor(c.id); toast('ทำสำเนาแล้ว');
      }
    },
  });
  function draw() {
    const r = rec(rid); if (!r) { closeModal(m); return; }
    const total = recipeTotal(r), sv = Math.max(1, num(r.servings, 1)), s = recipeSrc(r, 720);
    m.sheet.innerHTML = `
      <div class="recipe-hero ${s ? '' : 'no-photo'}">${s ? `<img src="${esc(s)}" alt="">` : `<img class="ph-3d" src="${fl('Shallow pan of food')}" alt="">`}${closeBtn}
        <div class="rh-text"><p>${TYPES[r.type] || ''} · ${(r.slots || []).map((x) => SLOTS[x].short).join(' / ')}</p><h3>${esc(r.name)}</h3></div></div>
      <div class="recipe-body">
        <div class="recipe-stats">
          <div><b>${fmt(perServing(r))}</b><span>kcal / ที่</span></div>
          <div><b>${sv}</b><span>ที่ (เสิร์ฟ)</span></div>
          <div><b>${r.time ? r.time : '—'}</b><span>นาที</span></div>
        </div>
        ${(() => { const f = recipeFlags(r); return (f.allergy.length ? `<div class="warn-box allergy"><b>มีของที่คุณแพ้</b> ${f.allergy.map((i) => esc(ING[i]?.name)).join(', ')}</div>` : '') + (f.dislike.length ? `<div class="warn-box dislike"><b>มีของที่คุณไม่ชอบ ตอนทำไม่ต้องใส่ก็ได้</b> ${f.dislike.map((i) => esc(ING[i]?.name)).join(', ')}</div>` : ''); })()}
        ${r.kcalOverride != null && r.kcalOverride !== '' ? `<p class="muted small">* กำหนดแคลอรี่เอง (คำนวณจากวัตถุดิบได้ ${fmt(total / sv)} kcal)</p>` : ''}
        <h4>วัตถุดิบ ${sv > 1 ? `<small class="muted">ทั้งสูตร ${sv} ที่</small>` : ''}</h4>
        <ul class="ing-list">${r.ing.map((x) => { const I = ING[x.id]; const k = I ? (I.kcal * toGrams(x.id, x.q, x.u)) / 100 : 0;
          const fl2 = (state.profile.allergies || []).includes(x.id) ? 'w-allergy' : (state.profile.dislikes || []).includes(x.id) ? 'w-dislike' : '';
          return `<li class="${fl2}">${ingImg(x.id)}<span>${esc(I?.name || x.id)}</span><span class="q">${fmtQ(x.q)} ${esc(x.u)}</span><span class="k">${fmt(k)} kcal</span></li>`; }).join('') || '<li class="muted">ยังไม่มีวัตถุดิบ</li>'}
          <li class="total"><span></span><span>รวมทั้งสูตร</span><span></span><span class="k">${fmt(total)} kcal</span></li></ul>
        <h4>วิธีทำ ${r.steps?.length ? `<small class="muted">${r.steps.length} ขั้นตอน${r.time ? ` · ประมาณ ${r.time} นาที` : ''}</small>` : ''}</h4>
        ${r.steps?.length ? `<ol class="steps">${r.steps.map((s, i) => `<li data-act="step-done" data-rid="${r.id}" data-i="${i}" class="${stepDone[r.id]?.has(i) ? 'done' : ''}"><span class="sn">${i + 1}</span><p>${esc(s)}</p></li>`).join('')}</ol><p class="muted small steps-hint">แตะที่ขั้นตอนเพื่อขีดว่าทำเสร็จแล้ว</p>`
          : `<div class="steps-empty"><p class="muted small">ยังไม่มีวิธีทำสำหรับเมนูนี้</p><button class="btn ghost sm" data-m="edit">${ic('edit')} เขียนวิธีทำ</button></div>`}
        ${r.note ? `<h4>เคล็ดลับ / โน้ต</h4><p class="note">${esc(r.note).replace(/\n/g, '<br>')}</p>` : ''}
      </div>
      <div class="modal-foot pad-x"><button class="btn ghost" data-m="dup">${ic('copy')} ทำสำเนา</button><span class="grow"></span><button class="btn ghost" data-m="edit">${ic('edit')} แก้ไข</button><button class="btn primary" data-m="plan">${ic('plus')} ใส่ในแพลน</button></div>`;
  }
  draw();
}

function openAddToPlan(rid) {
  const r = rec(rid); const ctx = { date: todayKey(), slot: (r.slots || [])[0] || 'lunch', s: 1 };
  const m = openModal('', {
    cls: 'small',
    onClick: (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'slot') ctx.slot = b.dataset.v;
      if (b.dataset.m === 'dec') ctx.s = Math.max(0.5, ctx.s - 0.5);
      if (b.dataset.m === 'inc') ctx.s = Math.min(20, ctx.s + 0.5);
      if (b.dataset.m === 'go') {
        if (!ctx.date) return toast('เลือกวันก่อนนะ');
        allergyOk(r).then((ok) => { if (!ok) return; addToPlan(ctx.date, ctx.slot, rid, ctx.s); closeModal(m);
          toast(`ใส่ ${r.name} ใน${SLOTS[ctx.slot].label} ${dayLabel(ctx.date)} แล้ว`); }); return;
      }
      draw();
    },
  });
  function draw() {
    m.sheet.innerHTML = `<div class="item-head">${photo(r, 240, 'lg')}<div class="ih-text"><p class="eyebrow">ใส่ในแพลน</p><h3>${esc(r.name)}</h3></div>${closeBtn}</div>
      <label class="field"><span>วันที่</span><input type="date" id="ap-date" value="${ctx.date}"></label>
      <div class="field"><span class="lbl">มื้อ</span><div class="chips wrap">${SLOT_ORDER.map((s) => `<button class="chip ${ctx.slot === s ? 'on' : ''}" data-m="slot" data-v="${s}">${SLOTS[s].short}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">จำนวนที่</span><div class="stepper"><button class="icon-btn" data-m="dec" aria-label="ลด">${ic('minus')}</button><b>${fmtQ(ctx.s)}</b><button class="icon-btn" data-m="inc" aria-label="เพิ่ม">${ic('plus')}</button></div></div>
      <div class="modal-foot"><span class="muted">${fmt(perServing(r) * ctx.s)} kcal</span><span class="grow"></span><button class="btn primary" data-m="go">${ic('check')} ใส่ในแพลน</button></div>`;
    $('#ap-date', m.sheet).addEventListener('change', (e) => { ctx.date = e.target.value; });
  }
  draw();
}

function openIngEditor(id) {
  const src = id ? ING[id] : null;
  const d = src ? { name: src.name, cat: src.cat, kcal: src.kcal, units: Object.entries(src.units || {}).map(([u, g]) => ({ u, g })), buy: src.buy || '', active: isActive(src), liquid: !!src.liquid, icon: src.icon || '' }
    : { name: '', cat: 'veg', kcal: '', units: [], buy: '', active: true, liquid: false, icon: '' };
  const pick = { q: '', open: false };
  const used = id ? usedIn(id) : [];
  const m = openModal('', {
    cls: 'ing-sheet',
    onClick: async (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const a2 = b.dataset.m; sync();
      if (a2 === 'u-add') { d.units.push({ u: '', g: '' }); draw(); $$('.u-name', m.sheet).pop()?.focus(); }
      if (a2 === 'u-del') { d.units.splice(+b.dataset.i, 1); draw(); }
      if (a2 === 'reset') { if (await confirmBox('คืนค่าวัตถุดิบนี้เป็นค่าเริ่มต้น?', 'คืนค่า')) { delete state.ingMeta[id]; buildIng(); save(); closeModal(m); refreshAll(); toast('คืนค่าเริ่มต้นแล้ว'); } }
      if (a2 === 'delete') { closeModal(m); ACTIONS['del-ing']({ id }); }
      if (a2 === 'save') doSave();
      if (a2 === 'icon') { d.icon = b.dataset.v; drawIcons(); }
      if (a2 === 'icon-auto') { d.icon = ''; drawIcons(); }
      if (a2 === 'icon-more') { pick.open = !pick.open; drawIcons(); }
    },
  });
  const autoIcon = () => (id && !src.custom && ING_ICON[id]) || suggestIcons(d.name, 1)[0] || ING_CATS[d.cat]?.icon || 'Shopping cart';
  const curIcon = () => iconSrc(d.icon || autoIcon());
  function drawIcons() {
    const S = m.sheet, box = $('#ie-icons', S); if (!box) return;
    const sugg = [...new Set([...suggestIcons(d.name, 10), ...(id && ING_ICON[id] ? [ING_ICON[id]] : []), ING_CATS[d.cat]?.icon].filter(Boolean))].slice(0, 10);
    const q = pick.q.trim().toLowerCase();
    const lib = q ? ICON_LIB.filter(([n, kw]) => kw.includes(q) || n.toLowerCase().includes(q)).map((x) => x[0]) : ICON_LIB.map((x) => x[0]);
    const btn = (n) => `<button class="ico ${d.icon === n ? 'on' : ''}" data-m="icon" data-v="${esc(n)}" title="${esc(n)}"><img src="${fl(n)}" alt="" loading="lazy"></button>`;
    $('.ie-cur img', S).src = curIcon();
    $('.ie-title img', S).src = curIcon();
    $('#ie-sugg', S).innerHTML = `<span class="ico-label">แนะนำ</span><button class="ico auto ${!d.icon ? 'on' : ''}" data-m="icon-auto" title="ให้ระบบเลือกจากชื่อ">อัตโนมัติ</button>${sugg.map(btn).join('')}
        ${d.icon && d.icon.startsWith('data:') ? `<button class="ico on" data-m="icon" data-v="${esc(d.icon)}"><img src="${esc(d.icon)}" alt=""></button>` : ''}`;
    $('#ie-more', S).classList.toggle('on', pick.open);
    $('#ie-more span', S).textContent = pick.open ? 'ซ่อนคลังรูป' : `คลังรูป ${ICON_LIB.length} แบบ`;
    box.hidden = !pick.open;
    if (!pick.open) { box.innerHTML = ''; return; }
    if (!$('#ie-iq', S)) box.innerHTML = `<div class="lib-search">${ic('search')}<input id="ie-iq" type="search" value="${esc(pick.q)}" placeholder="ค้นหารูป เช่น ขนม หมู เห็ด" autocomplete="off"></div><div class="ico-grid" id="ie-grid"></div>`;
    $('#ie-grid', S).innerHTML = lib.length ? lib.map(btn).join('') : '<p class="muted small grid-empty">ไม่เจอรูปที่ตรง ลองคำอื่น หรืออัปโหลดรูปเอง</p>';
    const iq = $('#ie-iq', S);
    if (iq && !iq.dataset.wired) { iq.dataset.wired = 1; iq.addEventListener('input', () => { pick.q = iq.value; drawIcons(); }); }
  }
  function sync() {
    const S = m.sheet; if (!$('#ie-name', S)) return;
    d.name = $('#ie-name', S).value; d.cat = $('#ie-cat', S).value; d.kcal = $('#ie-kcal', S).value;
    d.buy = $('#ie-buy', S).value; d.active = $('#ie-active', S).checked; d.liquid = $('#ie-liquid', S).checked;
    $$('.u-row', S).forEach((row, i) => { d.units[i] = { u: $('.u-name', row).value, g: $('.u-g', row).value }; });
  }
  function draw() {
    m.sheet.innerHTML = `<div class="modal-head"><div class="ie-title">${id ? ingImg(id, 'ii lg') : `<img class="ii lg" src="${fl(ING_CATS[d.cat]?.icon || 'Shopping cart')}" alt="">`}<div><p class="eyebrow">${id ? (src.custom ? 'วัตถุดิบที่เพิ่มเอง' : 'วัตถุดิบในระบบ') : 'วัตถุดิบใหม่'}</p><h3>${id ? esc(src.name) : 'เพิ่มวัตถุดิบ'}</h3></div></div>${closeBtn}</div>
      ${used.length ? `<p class="used-in">${ic('menu')} ใช้อยู่ใน ${used.length} เมนู: ${used.slice(0, 4).map((r) => esc(r.name)).join(', ')}${used.length > 4 ? ` และอีก ${used.length - 4}` : ''}</p>` : ''}
      <div class="form-grid">
        <label class="field span2"><span>ชื่อวัตถุดิบ</span><input id="ie-name" value="${esc(d.name)}" placeholder="เช่น ขนมครก สันคอหมูสไลด์" maxlength="40"></label>
        <div class="field span2"><span class="lbl">รูปวัตถุดิบ</span>
          <div class="ie-picker">
            <div class="ie-top">
              <span class="ie-cur"><img src="" alt=""></span>
              <div class="ie-side">
                <div class="ico-row" id="ie-sugg"></div>
                <div class="ie-btns"><button class="btn ghost sm" id="ie-more" data-m="icon-more">${ic('image')}<span></span></button>
                  <label class="btn ghost sm">${ic('upload')} อัปโหลดรูปเอง<input type="file" id="ie-file" accept="image/*" hidden></label></div>
              </div>
            </div>
            <div class="ie-lib" id="ie-icons" hidden></div>
          </div></div>
        <label class="field"><span>หมวด</span><select id="ie-cat">${Object.entries(ING_CATS).map(([k, v]) => `<option value="${k}" ${d.cat === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label class="field"><span>แคลอรี่</span><div class="inp-unit"><input id="ie-kcal" type="number" min="0" step="any" value="${d.kcal}" placeholder="35" inputmode="decimal"><em>kcal/100g</em></div></label>
      </div>
      <div class="field"><span class="lbl">หน่วยนับ <small class="muted">(เช่น 1 ฟอง = 50 กรัม)</small></span>
        <div class="u-list">${d.units.map((u, i) => `<div class="u-row"><span class="muted">1</span><input class="u-name" value="${esc(u.u)}" placeholder="หน่วย เช่น ฟอง"><span class="muted">=</span><div class="inp-unit"><input class="u-g" type="number" min="0" step="any" value="${u.g}" placeholder="50" inputmode="decimal"><em>กรัม</em></div><button class="x-btn" data-m="u-del" data-i="${i}" aria-label="ลบหน่วย">${ic('x')}</button></div>`).join('')}</div>
        <button class="btn ghost sm" data-m="u-add">${ic('plus')} เพิ่มหน่วยนับ</button></div>
      <label class="field"><span>หน่วยที่ใช้ตอนซื้อของ</span><select id="ie-buy"><option value="">ใช้กรัม / มล.</option>${d.units.filter((u) => u.u.trim()).map((u) => `<option ${d.buy === u.u ? 'selected' : ''}>${esc(u.u)}</option>`).join('')}</select></label>
      <div class="toggle-rows">
        <label class="switch"><input type="checkbox" id="ie-active" ${d.active ? 'checked' : ''}><span></span> ใช้งานอยู่ <small class="muted">ปิดแล้วจะไม่ขึ้นในรายการให้เลือก</small></label>
        <label class="switch"><input type="checkbox" id="ie-liquid" ${d.liquid ? 'checked' : ''}><span></span> เป็นของเหลว <small class="muted">แสดงเป็น ml ในรายการซื้อของ</small></label>
      </div>
      <div class="modal-foot">${src?.custom ? `<button class="btn ghost danger-text" data-m="delete">${ic('trash')} ลบ</button>` : ''}${src?.edited ? `<button class="btn ghost" data-m="reset">คืนค่าเริ่มต้น</button>` : ''}<span class="grow"></span><button class="btn ghost" data-act="close">ยกเลิก</button><button class="btn primary" data-m="save">${ic('check')} บันทึก</button></div>`;
    $('#ie-cat', m.sheet).addEventListener('change', () => { sync(); drawIcons(); });
    $('#ie-name', m.sheet).addEventListener('input', () => { d.name = $('#ie-name', m.sheet).value; drawIcons(); });
    $('#ie-file', m.sheet).addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; resizeImage(f, 160).then((u) => { d.icon = u; drawIcons(); }).catch(() => toast('เปิดรูปนี้ไม่ได้')); e.target.value = ''; });
    drawIcons();
  }
  function doSave() {
    const name = d.name.trim();
    if (!name) return toast('ใส่ชื่อวัตถุดิบก่อนนะ');
    const dup = findIng(name); if (dup && dup.id !== id) return toast('มีวัตถุดิบชื่อนี้แล้ว');
    if (d.kcal === '' || num(d.kcal, -1) < 0) return toast('ใส่แคลอรี่ต่อ 100 กรัมด้วยนะ');
    const units = {}; for (const u of d.units) if (u.u.trim() && num(u.g) > 0) units[u.u.trim()] = num(u.g);
    const rec2 = { name, cat: d.cat, kcal: num(d.kcal), units, buy: units[d.buy] ? d.buy : '', liquid: d.liquid, active: d.active, icon: d.icon };
    if (!id) state.customIngs.push({ id: uid('ci'), ...rec2 });
    else if (src.custom) Object.assign(state.customIngs.find((c) => c.id === id), rec2);
    else {
      const base = BASE_ING[id], o = {};
      for (const k of ['name', 'cat', 'kcal', 'buy', 'liquid', 'icon']) if ((base[k] ?? (k === 'liquid' ? false : '')) !== rec2[k]) o[k] = rec2[k];
      if (JSON.stringify(base.units || {}) !== JSON.stringify(units)) o.units = units;
      if (!rec2.active) o.active = false;
      if (Object.keys(o).length) state.ingMeta[id] = o; else delete state.ingMeta[id];
    }
    buildIng(); save(); closeModal(m); refreshAll(); toast(id ? 'บันทึกแล้ว' : `เพิ่ม ${name} แล้ว`);
  }
  draw();
  if (!id && matchMedia('(pointer:fine)').matches) setTimeout(() => $('#ie-name', m.sheet)?.focus(), 60);
}
function setIngActive(id, on) {
  const I = ING[id]; if (!I) return;
  if (I.custom) { const c = state.customIngs.find((x) => x.id === id); if (on) delete c.active; else c.active = false; }
  else { const o = { ...(state.ingMeta[id] || {}) }; if (on) delete o.active; else o.active = false; if (Object.keys(o).length) state.ingMeta[id] = o; else delete state.ingMeta[id]; }
  buildIng(); save();
}

/* บันทึกกินนอกบ้าน / ซื้อมา */
const QUICK_PRESETS = [['ข้าวมันไก่', 600], ['ข้าวขาหมู', 690], ['ก๋วยเตี๋ยวน้ำ', 350], ['ข้าวผัดกะเพรา + ไข่ดาว', 630], ['ส้มตำไทย', 120], ['ผัดไทย', 550], ['ข้าวไข่เจียว', 450], ['โจ๊ก', 250], ['แซนด์วิช', 350], ['สลัดไก่', 300], ['ชานมไข่มุก', 350], ['กาแฟเย็น', 230]];
function openQuickLog(k, slot, idx = null) {
  const cur = idx != null ? state.plan[k]?.m[slot]?.[idx] : null;
  const recent = []; const seen = new Set();
  for (const dk of Object.keys(state.plan).sort().reverse()) for (const s in state.plan[dk].m) for (const it of state.plan[dk].m[s]) if (it.qn && !seen.has(it.qn)) { seen.add(it.qn); recent.push([it.qn, it.qk]); }
  const d = { name: cur?.qn || '', kcal: cur?.qk ?? '', src: cur?.src || 'buy', slot, eaten: cur ? !!cur.eaten : k <= todayKey(), note: cur?.note || '', s: cur?.s || 1 };
  const m = openModal('', {
    cls: 'small quick-sheet',
    onClick: (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return; sync();
      const a2 = b.dataset.m;
      if (a2 === 'src') d.src = b.dataset.v;
      if (a2 === 'slot') d.slot = b.dataset.v;
      if (a2 === 'preset') { d.name = b.dataset.n; d.kcal = +b.dataset.k; }
      if (a2 === 'kstep') d.kcal = Math.max(0, num(d.kcal) + +b.dataset.v);
      if (a2 === 'eaten') d.eaten = !d.eaten;
      if (a2 === 'save') return doSave();
      if (a2 === 'del') { state.plan[k].m[slot].splice(idx, 1); save(); closeModal(m); closeAllModals(); refreshAll(); toast('ลบแล้ว'); return; }
      draw();
    },
  });
  function sync() { const S = m.sheet; if (!$('#ql-name', S)) return; d.name = $('#ql-name', S).value; d.kcal = $('#ql-kcal', S).value; d.note = $('#ql-note', S).value; }
  function draw() {
    const presets = [...recent.slice(0, 6), ...QUICK_PRESETS.filter(([n]) => !seen.has(n))].slice(0, 12);
    m.sheet.innerHTML = `<div class="modal-head"><div><p class="eyebrow">${dayLabel(k)}</p><h3>${cur ? 'แก้ไขบันทึก' : 'บันทึกกินนอกบ้าน'}</h3></div>${closeBtn}</div>
      <div class="field"><span class="lbl">ได้มาจาก</span><div class="seg wide">${Object.entries(SOURCES).filter(([v]) => v !== 'home').map(([v, l]) => `<button class="${d.src === v ? 'on' : ''}" data-m="src" data-v="${v}">${l}</button>`).join('')}</div></div>
      <label class="field"><span>กินอะไร</span><input id="ql-name" value="${esc(d.name)}" placeholder="เช่น ข้าวมันไก่ร้านประจำ" maxlength="60" autocomplete="off"></label>
      <div class="ql-presets">${presets.map(([n, kc]) => `<button class="qchip" data-m="preset" data-n="${esc(n)}" data-k="${kc}">${esc(n)} <small>${fmt(kc)}</small></button>`).join('')}</div>
      <div class="field"><span class="lbl">แคลอรี่โดยประมาณ</span>
        <div class="kcal-step"><button class="icon-btn" data-m="kstep" data-v="-50" aria-label="ลด">${ic('minus')}</button><div class="inp-unit"><input id="ql-kcal" type="number" min="0" step="10" value="${d.kcal}" placeholder="0" inputmode="numeric"><em>kcal</em></div><button class="icon-btn" data-m="kstep" data-v="50" aria-label="เพิ่ม">${ic('plus')}</button></div>
        <p class="muted small">ไม่แน่ใจ? กดเลือกเมนูใกล้เคียงด้านบนเพื่อใช้ค่าประมาณ</p></div>
      <div class="field"><span class="lbl">มื้อ</span><div class="chips wrap">${SLOT_ORDER.map((s) => `<button class="chip ${d.slot === s ? 'on' : ''}" data-m="slot" data-v="${s}">${SLOTS[s].short}</button>`).join('')}</div></div>
      <label class="field"><span>โน้ต (ถ้ามี)</span><input id="ql-note" value="${esc(d.note)}" placeholder="เช่น ร้านป้าแดง หน้าออฟฟิศ" maxlength="80"></label>
      <button class="eat-toggle ${d.eaten ? 'on' : ''}" data-m="eaten"><span class="et-box">${ic('check')}</span><span><b>${d.eaten ? 'กินแล้ว' : 'ยังไม่ได้กิน'}</b><small>ใช้นับแคลอรี่ที่กินจริง</small></span></button>
      <div class="modal-foot">${cur ? `<button class="btn ghost danger-text" data-m="del">${ic('trash')} ลบ</button>` : ''}<span class="grow"></span><button class="btn ghost" data-act="close">ยกเลิก</button><button class="btn primary" data-m="save">${ic('check')} บันทึก</button></div>`;
  }
  function doSave() {
    const name = d.name.trim(); if (!name) { toast('ใส่ชื่ออาหารก่อนนะ'); $('#ql-name', m.sheet).focus(); return; }
    const entry = { qn: name, qk: Math.round(num(d.kcal)), src: d.src, s: d.s, eaten: d.eaten, note: d.note.trim() };
    const day = getDay(k, true);
    if (cur) day.m[slot].splice(idx, 1);
    if (!day.slots.includes(d.slot)) day.slots.push(d.slot);
    (day.m[d.slot] ||= []).push(entry);
    lastAdded = `${k}|${d.slot}|${day.m[d.slot].length - 1}`;
    save(); closeModal(m); if (cur) closeAllModals(); refreshAll(); setTimeout(() => { lastAdded = ''; }, 600);
    toast(cur ? 'บันทึกแล้ว' : `บันทึก ${name} แล้ว`);
  }
  draw();
  if (!cur && matchMedia('(pointer:fine)').matches) setTimeout(() => $('#ql-name', m.sheet)?.focus(), 60);
}

/* ครอปรูปโปรไฟล์: ลากเพื่อเลื่อน เลื่อนแถบ/ล้อเมาส์/สองนิ้วเพื่อซูม */
function openCropper(file) {
  const url = URL.createObjectURL(file), img = new Image();
  img.onerror = () => { URL.revokeObjectURL(url); toast('เปิดรูปนี้ไม่ได้'); };
  img.onload = () => {
    let V = 280, base = V / Math.min(img.width, img.height);
    const st = { z: 1, x: 0, y: 0 };
    const m = openModal(`<div class="modal-head"><div><p class="eyebrow">รูปโปรไฟล์</p><h3>ปรับรูปให้พอดี</h3></div>${closeBtn}</div>
      <div class="crop-stage"><div class="crop-view" id="cv"><img src="${url}" alt="" draggable="false"></div></div>
      <p class="muted small center">ลากรูปเพื่อเลื่อนตำแหน่ง · ใช้แถบด้านล่างเพื่อซูม</p>
      <div class="crop-zoom">${ic('minus')}<input type="range" id="cz" min="1" max="4" step="0.01" value="1" aria-label="ซูม">${ic('plus')}</div>
      <div class="modal-foot"><button class="btn ghost" data-m="reset">รีเซ็ต</button><span class="grow"></span><button class="btn ghost" data-act="close">ยกเลิก</button><button class="btn primary" data-m="ok">${ic('check')} ใช้รูปนี้</button></div>`, {
      cls: 'small crop-sheet', onClose: () => URL.revokeObjectURL(url),
      onClick: (e) => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        if (b.dataset.m === 'reset') { st.z = 1; st.x = 0; st.y = 0; $('#cz', m.sheet).value = 1; draw(); }
        if (b.dataset.m === 'ok') {
          const c = document.createElement('canvas'); c.width = c.height = 400;
          const k = 400 / V, s = base * st.z * k, w = img.width * s, h = img.height * s;
          c.getContext('2d').drawImage(img, 200 - w / 2 + st.x * k, 200 - h / 2 + st.y * k, w, h);
          state.settings.avatar = c.toDataURL('image/jpeg', 0.85);
          if (save()) { closeModal(m); renderHeader(); renderMain(false); toast('เปลี่ยนรูปโปรไฟล์แล้ว'); }
        }
      },
    });
    const cv = $('#cv', m.sheet), im = $('img', cv), zr = $('#cz', m.sheet);
    V = cv.offsetWidth || 280; base = V / Math.min(img.width, img.height);
    function clamp() {
      const w = img.width * base * st.z, h = img.height * base * st.z, mx = (w - V) / 2, my = (h - V) / 2;
      st.x = Math.max(-mx, Math.min(mx, st.x)); st.y = Math.max(-my, Math.min(my, st.y));
    }
    function draw() {
      clamp();
      im.style.width = `${img.width * base * st.z}px`; im.style.height = `${img.height * base * st.z}px`;
      im.style.transform = `translate(calc(-50% + ${st.x}px), calc(-50% + ${st.y}px))`;
    }
    const pts = new Map(); let last = null, pinch = null;
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; if (pts.size === 2) { const [a1, b1] = [...pts.values()]; pinch = { d: Math.hypot(a1[0] - b1[0], a1[1] - b1[1]), z: st.z }; } });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const [a1, b1] = [...pts.values()]; st.z = Math.max(1, Math.min(4, pinch.z * Math.hypot(a1[0] - b1[0], a1[1] - b1[1]) / pinch.d)); zr.value = st.z; }
      else if (last) { st.x += e.clientX - last[0]; st.y += e.clientY - last[1]; last = [e.clientX, e.clientY]; }
      draw();
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = null; last = pts.size ? [...pts.values()][0] : null; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); st.z = Math.max(1, Math.min(4, st.z * (e.deltaY < 0 ? 1.08 : 0.93))); zr.value = st.z; draw(); }, { passive: false });
    zr.addEventListener('input', () => { st.z = +zr.value; draw(); });
    draw();
  };
  img.src = url;
}

/* เริ่มใหม่: แบบมีตัวอย่าง หรือเริ่มจาก 0 */
function openResetModal() {
  const ctx = { mode: 'blank', keep: true, typed: '' };
  const m = openModal('', {
    cls: 'small reset-sheet',
    onClick: (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'mode') ctx.mode = b.dataset.v;
      if (b.dataset.m === 'keep') ctx.keep = !ctx.keep;
      if (b.dataset.m === 'go') return doReset();
      draw();
    },
  });
  function draw() {
    m.sheet.innerHTML = `<div class="modal-head"><div><p class="eyebrow">ล้างข้อมูล</p><h3>เริ่มใหม่ทั้งหมด</h3></div>${closeBtn}</div>
      <div class="reset-opts">
        <button class="reset-opt ${ctx.mode === 'blank' ? 'on' : ''}" data-m="mode" data-v="blank"><span class="ro-dot"></span><span><b>เริ่มจาก 0</b><small>ไม่มีเมนู ไม่มีวัตถุดิบ ไม่มีแพลน สร้างเองทั้งหมด</small></span></button>
        <button class="reset-opt ${ctx.mode === 'sample' ? 'on' : ''}" data-m="mode" data-v="sample"><span class="ro-dot"></span><span><b>เริ่มใหม่แบบมีตัวอย่าง</b><small>เมนูตัวอย่าง ${SEED_RECIPES.length} เมนู วัตถุดิบ ${Object.keys(BASE_ING).length} อย่าง และแพลนตัวอย่าง 1 สัปดาห์</small></span></button>
      </div>
      <button class="eat-toggle ${ctx.keep ? 'on' : ''}" data-m="keep"><span class="et-box">${ic('check')}</span><span><b>เก็บโปรไฟล์ไว้</b><small>ชื่อ รูปโปรไฟล์ เป้าหมาย อาหารที่แพ้/ไม่ชอบ และการตั้งค่า</small></span></button>
      <div class="warn-box allergy"><b>ลบแล้วกู้คืนไม่ได้</b> แนะนำให้กด “สำรองข้อมูล” เก็บไว้ก่อน</div>
      <div class="modal-foot"><button class="btn ghost" data-act="export">${ic('download')} สำรองก่อน</button><span class="grow"></span><button class="btn ghost" data-act="close">ยกเลิก</button><button class="btn danger" data-m="go">${ic('trash')} ล้างข้อมูล</button></div>`;
  }
  function doReset() {
    const old = state, fresh = defaultState();
    if (ctx.keep) { fresh.settings = { ...old.settings }; fresh.profile = { ...old.profile }; }
    if (ctx.mode === 'blank') {
      fresh.settings.noBase = true; fresh.recipes = []; fresh.fridge = [];
      fresh.profile.allergies = []; fresh.profile.dislikes = []; // วัตถุดิบถูกล้าง เลยล้างรายการแพ้/ไม่ชอบด้วย
    } else {
      fresh.settings.noBase = false; state = fresh; seedDemo(fresh);
      if (ctx.keep) { fresh.profile.allergies = old.profile.allergies || []; fresh.profile.dislikes = old.profile.dislikes || []; }
    }
    state = fresh; buildIng(); save(); closeModal(m); render();
    toast(ctx.mode === 'blank' ? 'เริ่มจาก 0 แล้ว เพิ่มเมนูแรกได้เลย' : 'เริ่มใหม่แบบมีตัวอย่างแล้ว');
  }
  draw();
}

/* ย่อรูปที่อัปโหลดให้เล็กลงก่อนเก็บ */
function resizeImage(file, max = 720) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}

function openEditor(rid, opts = {}) {
  const src = rid ? rec(rid) : null;
  const d = src ? clone(src) : { id: null, name: opts.name || '', img: '', type: 'main', slots: opts.slot ? [opts.slot] : ['lunch', 'dinner'], servings: 1, ing: [], note: '', kcalOverride: null, steps: [], time: null };
  if (!Array.isArray(d.steps)) d.steps = [];
  const blank = () => ({ id: null, name: '', q: '', u: 'g', nk: '', cat: 'other' });
  const rows = d.ing.map((x) => ({ id: x.id, name: ING[x.id]?.name || x.id, q: x.q, u: x.u, nk: '', cat: 'other' }));
  if (!rows.length) rows.push(blank(), blank());
  let manual = d.kcalOverride != null && d.kcalOverride !== '';

  const m = openModal(`
    <div class="modal-head"><div><p class="eyebrow">${src ? 'แก้ไขเมนู' : 'เมนูใหม่'}</p><h3>${src ? esc(src.name) : 'สร้างเมนูของฉัน'}</h3></div>${closeBtn}</div>
    <div class="ed-photo">
      <div class="ed-ph" id="ed-ph"></div>
      <div class="ed-ph-side">
        <label class="field"><span>ชื่อเมนู</span><input id="ed-name" value="${esc(d.name)}" placeholder="เช่น ข้าวมันไก่" maxlength="60"></label>
        <div class="ed-ph-actions">
          <label class="btn ghost sm">${ic('upload')} อัปโหลดรูป<input type="file" id="ed-file" accept="image/*" hidden></label>
          <button class="btn ghost sm" data-m="gallery">${ic('image')} คลังรูป</button>
          <button class="btn ghost sm" data-m="url">${ic('link')} ลิงก์รูป</button>
        </div>
      </div>
    </div>
    <div class="ed-url" id="ed-url" hidden><input id="ed-url-in" type="url" placeholder="วางลิงก์รูป https://..."><button class="btn primary sm" data-m="url-ok">ใช้รูปนี้</button></div>
    <div class="gallery" id="ed-gallery" hidden>${PHOTO_GALLERY.map((g) => `<button data-m="pick-img" data-v="${g}"><img src="${imgSrc(g, 120)}" alt="" loading="lazy"></button>`).join('')}</div>
    <div class="form-grid">
      <label class="field"><span>ประเภท</span><select id="ed-type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${d.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>สูตรนี้ได้กี่ที่</span><input id="ed-serv" type="number" min="1" max="50" value="${d.servings}" inputmode="numeric"></label>
    </div>
    <div class="field"><span class="lbl">เหมาะกับมื้อ</span><div class="chips wrap" id="ed-slots"></div></div>
    <div class="ed-ing">
      <div class="ed-ing-head"><span class="lbl">วัตถุดิบ (ทั้งสูตร)</span><span class="muted small">พิมพ์ชื่อ หรือเลือกจากรายการ</span></div>
      <div class="ing-rows" id="ed-rows"></div>
      <button class="btn ghost sm" data-m="row-add">${ic('plus')} เพิ่มวัตถุดิบ</button>
    </div>
    <div class="kcal-box" id="ed-kcal"></div>
    <div class="field"><div class="ed-steps-head"><span class="lbl">วิธีทำ</span><label class="time-in"><input id="ed-time" type="number" min="0" max="600" value="${d.time ?? ''}" placeholder="—" inputmode="numeric"> นาที</label></div>
      <ol class="ed-steps" id="ed-steps"></ol>
      <button class="btn ghost sm" data-m="step-add">${ic('plus')} เพิ่มขั้นตอน</button></div>
    <label class="field"><span>เคล็ดลับ / โน้ต</span><textarea id="ed-note" rows="2" placeholder="เคล็ดลับ หรือร้านที่ชอบ">${esc(d.note)}</textarea></label>
    <div class="modal-foot">${src ? `<button class="btn ghost danger-text" data-m="delete">${ic('trash')} ลบเมนู</button>` : ''}<span class="grow"></span><button class="btn ghost" data-act="close">ยกเลิก</button><button class="btn primary" data-m="save">${ic('check')} บันทึก</button></div>`, {
    cls: 'wide editor',
    onClick: async (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const a = b.dataset.m;
      if (a === 'gallery') { const g = $('#ed-gallery', S); g.hidden = !g.hidden; $('#ed-url', S).hidden = true; }
      if (a === 'url') { const g = $('#ed-url', S); g.hidden = !g.hidden; $('#ed-gallery', S).hidden = true; if (!g.hidden) $('#ed-url-in', S).focus(); }
      if (a === 'url-ok') { const v = $('#ed-url-in', S).value.trim(); if (!/^https?:\/\//.test(v)) return toast('ลิงก์ต้องขึ้นต้นด้วย http'); d.img = v; $('#ed-url', S).hidden = true; drawPhoto(); }
      if (a === 'pick-img') { d.img = b.dataset.v; $('#ed-gallery', S).hidden = true; drawPhoto(); }
      if (a === 'rm-img') { d.img = ''; drawPhoto(); }
      if (a === 'slot') { const s = b.dataset.v; d.slots = d.slots.includes(s) ? d.slots.filter((x) => x !== s) : [...d.slots, s]; drawSlots(); }
      if (a === 'step-add') { d.steps.push(''); drawSteps(); $$('.ed-steps textarea', S).pop()?.focus(); }
      if (a === 'step-del') { d.steps.splice(+b.dataset.i, 1); drawSteps(); }
      if (a === 'step-up' || a === 'step-down') { const i = +b.dataset.i, j = a === 'step-up' ? i - 1 : i + 1; if (j >= 0 && j < d.steps.length) { [d.steps[i], d.steps[j]] = [d.steps[j], d.steps[i]]; drawSteps(); } }
      if (a === 'row-add') { rows.push(blank()); drawRows(); $$('.ir-name', S).pop()?.focus(); }
      if (a === 'row-del') { rows.splice(+b.dataset.i, 1); drawRows(); }
      if (a === 'manual') { manual = !manual; drawKcal(); }
      if (a === 'save') doSave();
      if (a === 'delete') {
        if (await confirmBox(`ลบเมนู “${esc(src.name)}” ?<br><small>เมนูนี้จะถูกเอาออกจากแพลนทุกวันด้วย</small>`, 'ลบเลย', true)) {
          state.recipes = state.recipes.filter((r) => r.id !== src.id);
          for (const k in state.plan) for (const s in state.plan[k].m) state.plan[k].m[s] = state.plan[k].m[s].filter((it) => it.rid !== src.id);
          save(); closeModal(m); refreshAll(); toast('ลบเมนูแล้ว');
        }
      }
    },
  });
  const S = m.sheet;
  const rowKcal = (r) => {
    if (r.id && ING[r.id]) return (ING[r.id].kcal * toGrams(r.id, r.q, r.u)) / 100;
    return (num(r.nk) * num(r.q) * (GENERIC_UNITS[r.u] ?? 1)) / 100;
  };
  function drawPhoto() {
    const s = imgSrc(d.img, 300);
    $('#ed-ph', S).innerHTML = s
      ? `<img src="${esc(s)}" alt=""><button class="x-btn on-photo" data-m="rm-img" aria-label="เอารูปออก">${ic('x')}</button>`
      : `<div class="ed-ph-empty"><img src="${fl('Shallow pan of food')}" alt=""><span>ยังไม่มีรูป</span></div>`;
  }
  function drawSteps() {
    $('#ed-steps', S).innerHTML = d.steps.length ? d.steps.map((s, i) => `<li><span class="sn">${i + 1}</span><textarea rows="1" data-step="${i}" placeholder="เช่น ผัดกระเทียมให้หอม">${esc(s)}</textarea>
      <span class="st-acts"><button class="x-btn" data-m="step-up" data-i="${i}" ${i ? '' : 'disabled'} aria-label="เลื่อนขึ้น">${ic('left')}</button><button class="x-btn" data-m="step-down" data-i="${i}" ${i < d.steps.length - 1 ? '' : 'disabled'} aria-label="เลื่อนลง">${ic('right')}</button><button class="x-btn" data-m="step-del" data-i="${i}" aria-label="ลบขั้นตอน">${ic('x')}</button></span></li>`).join('')
      : '<p class="muted small">ยังไม่มีขั้นตอน กด “เพิ่มขั้นตอน” เพื่อเริ่มเขียน</p>';
    $$('.ed-steps textarea', S).forEach(fit);
  }
  const fit = (t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; };
  function drawSlots() {
    $('#ed-slots', S).innerHTML = SLOT_ORDER.map((s) => `<button class="chip ${d.slots.includes(s) ? 'on' : ''}" data-m="slot" data-v="${s}">${SLOTS[s].short}</button>`).join('');
  }
  function drawRows() {
    $('#ed-rows', S).innerHTML = rows.map((r, i) => {
      const units = Object.keys(r.id ? unitsOf(r.id) : GENERIC_UNITS);
      const isNew = r.name.trim() && !r.id;
      return `<div class="ing-row ${isNew ? 'is-new' : ''}" data-i="${i}">
        <span class="ir-ic">${r.id ? ingImg(r.id) : ''}</span>
        <input class="ir-name" data-combo-in="ing" autocomplete="off" enterkeyhint="search" value="${esc(r.name)}" placeholder="วัตถุดิบ เช่น อกไก่" aria-label="ชื่อวัตถุดิบ">
        <input class="ir-q" type="number" step="any" min="0" value="${r.q}" placeholder="0" inputmode="decimal" aria-label="ปริมาณ">
        <select class="ir-u" aria-label="หน่วย">${units.map((u) => `<option ${u === r.u ? 'selected' : ''}>${u}</option>`).join('')}</select>
        <span class="ir-k">${fmt(rowKcal(r))}<small> kcal</small></span>
        <button class="x-btn" data-m="row-del" data-i="${i}" aria-label="ลบแถว">${ic('x')}</button>
        ${isNew ? `<div class="ir-new"><span>วัตถุดิบใหม่ — ใส่แคลอรี่ต่อ 100 g ด้วยนะ</span>
          <input class="ir-nk" type="number" min="0" step="any" value="${r.nk}" placeholder="kcal/100g" inputmode="decimal">
          <select class="ir-cat">${Object.entries(ING_CATS).map(([k, v]) => `<option value="${k}" ${r.cat === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>` : ''}
      </div>`;
    }).join('');
    drawKcal();
  }
  function drawKcal() {
    const total = rows.reduce((a, r) => a + rowKcal(r), 0), sv = Math.max(1, num($('#ed-serv', S).value, 1));
    $('#ed-kcal', S).innerHTML = `<div class="kb-main"><div><span>รวมทั้งสูตร</span><b>${fmt(total)}</b> kcal</div><div class="hl"><span>ต่อ 1 ที่</span><b>${fmt(manual ? num(d.kcalOverride) : total / sv)}</b> kcal</div></div>
      <label class="switch"><input type="checkbox" data-m="manual" ${manual ? 'checked' : ''}><span></span> กำหนดแคลอรี่ต่อที่เอง</label>
      ${manual ? `<input id="ed-override" type="number" min="0" value="${d.kcalOverride ?? Math.round(total / sv)}" inputmode="numeric" placeholder="kcal ต่อที่">` : ''}`;
    if (manual && (d.kcalOverride == null || d.kcalOverride === '')) d.kcalOverride = Math.round(total / sv);
  }
  function drawKcalLight() {
    const total = rows.reduce((a, r) => a + rowKcal(r), 0), sv = Math.max(1, num($('#ed-serv', S).value, 1));
    const bs = $$('.kb-main b', S); if (bs.length === 2) { bs[0].textContent = fmt(total); if (!manual) bs[1].textContent = fmt(total / sv); }
  }
  S.addEventListener('input', (e) => {
    const t = e.target, row = t.closest('.ing-row');
    if (t.dataset.step != null) { d.steps[+t.dataset.step] = t.value; fit(t); return; }
    if (t.id === 'ed-override') { d.kcalOverride = t.value; $('.kb-main .hl b', S).textContent = fmt(num(t.value)); return; }
    if (t.id === 'ed-serv') { drawKcal(); return; }
    if (!row) return;
    const r = rows[+row.dataset.i];
    if (t.classList.contains('ir-name')) r.name = t.value;
    if (t.classList.contains('ir-q')) r.q = t.value;
    if (t.classList.contains('ir-nk')) r.nk = t.value;
    $('.ir-k', row).innerHTML = `${fmt(rowKcal(r))}<small> kcal</small>`;
    drawKcalLight();
  });
  S.addEventListener('change', async (e) => {
    const t = e.target, row = t.closest('.ing-row');
    if (t.id === 'ed-file' && t.files[0]) {
      try { d.img = await resizeImage(t.files[0]); drawPhoto(); } catch { toast('เปิดรูปนี้ไม่ได้'); }
      t.value = ''; return;
    }
    if (!row) return;
    const r = rows[+row.dataset.i];
    if (t.classList.contains('ir-name')) {
      const f = findIng(t.value);
      r.name = t.value; r.id = f ? f.id : null;
      const us = r.id ? unitsOf(r.id) : GENERIC_UNITS;
      if (!(r.u in us)) r.u = 'g';
      if (f && r.u === 'g' && f.buy && !r.q) r.u = f.buy;
      drawRows();
      const nr = $(`.ing-row[data-i="${row.dataset.i}"]`, S);
      (nr && $(f ? '.ir-q' : '.ir-nk', nr))?.focus();
    }
    if (t.classList.contains('ir-u')) { r.u = t.value; $('.ir-k', row).innerHTML = `${fmt(rowKcal(r))}<small> kcal</small>`; drawKcalLight(); }
    if (t.classList.contains('ir-cat')) r.cat = t.value;
  });
  function doSave() {
    const name = $('#ed-name', S).value.trim();
    if (!name) { toast('ตั้งชื่อเมนูก่อนนะ'); $('#ed-name', S).focus(); return; }
    const ing = [];
    for (const r of rows) {
      if (!r.name.trim()) continue;
      let id = r.id || findIng(r.name)?.id;
      if (!id) {
        const c = { id: uid('ci'), name: r.name.trim(), cat: r.cat || 'other', kcal: num(r.nk), units: {} };
        state.customIngs.push(c); buildIng(); id = c.id;
      }
      ing.push({ id, q: num(r.q), u: r.u || 'g' });
    }
    const out = {
      ...d, id: d.id || uid('r'), name,
      type: $('#ed-type', S).value,
      servings: Math.max(1, Math.round(num($('#ed-serv', S).value, 1))),
      slots: d.slots.length ? SLOT_ORDER.filter((s) => d.slots.includes(s)) : ['lunch', 'dinner'],
      note: $('#ed-note', S).value.trim(),
      steps: d.steps.map((x) => x.trim()).filter(Boolean),
      time: $('#ed-time', S).value === '' ? null : Math.max(0, Math.round(num($('#ed-time', S).value))),
      kcalOverride: manual ? num(d.kcalOverride) : null,
      ing,
    };
    const i = state.recipes.findIndex((r) => r.id === out.id);
    const prev = i >= 0 ? state.recipes[i] : null;
    if (i >= 0) state.recipes[i] = out; else state.recipes.unshift(out);
    if (!save()) { if (prev) state.recipes[i] = prev; else state.recipes.shift(); return; }
    closeModal(m); refreshAll();
    toast(src ? 'บันทึกแล้ว' : `สร้างเมนู ${out.name} แล้ว`);
    opts.onSave?.(out);
  }
  drawPhoto(); drawSlots(); drawRows(); drawSteps();
  if (!d.name && matchMedia('(pointer:fine)').matches) setTimeout(() => $('#ed-name', S).focus(), 60);
}

/* =========================================================
   ACTIONS
   ========================================================= */
function pickRandom(slot, avoid) {
  let pool = state.recipes.filter((r) => (r.slots || []).includes(slot) && r.type !== 'base' && !isAvoided(r));
  if (pool.length > 1 && avoid) pool = pool.filter((r) => r.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}
const ACTIONS = {
  tab: ({ tab }) => { ui.tab = tab; try { localStorage.setItem('calicat:tab', tab); } catch {} history.replaceState(null, '', '#' + tab); closeAllModals(); render(); },
  close: (_, el) => { const ov = el.closest('.overlay'); closeModal(modals.find((m) => m.ov === ov)); },
  view: ({ view }) => { ui.view = view; renderMain(false); },
  nav: ({ dir }) => {
    const c = ui.cursor, n = +dir;
    ui.cursor = ui.view === 'week' ? addDays(c, 7 * n) : ui.view === 'month' ? new Date(c.getFullYear(), c.getMonth() + n, 1) : new Date(c.getFullYear() + n, 0, 1);
    renderMain(false);
  },
  'nav-today': () => { ui.cursor = new Date(); renderMain(false); if (ui.view === 'week') setTimeout(() => ACTIONS.jump({ date: todayKey() }), 30); },
  jump: ({ date }) => { const el = $(`#day-${date}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 900); } },
  'goto-month': ({ m }) => { ui.cursor = new Date(ui.cursor.getFullYear(), +m, 1); ui.view = 'month'; renderMain(false); },
  'open-day': ({ date }) => openDayModal(date),
  'quick-log': ({ date, slot }) => openQuickLog(date, slot),
  eat: ({ date, slot, i }, el, e) => { e.stopPropagation(); const it = state.plan[date]?.m[slot]?.[+i]; if (!it) return; it.eaten = !it.eaten; save(); refreshAll(); if (it.eaten) toast('บันทึกว่ากินแล้ว'); },
  pick: ({ date, slot }) => openPicker(date, slot),
  item: ({ date, slot, i }) => openItemModal(date, slot, +i),
  'add-slot': ({ date, slot }) => { const d = getDay(date, true); if (!d.slots.includes(slot)) d.slots.push(slot); save(); refreshAll(); },
  'remove-slot': async ({ date, slot }) => {
    const d = getDay(date, true);
    if (d.m[slot]?.length && !(await confirmBox(`เอา${SLOTS[slot].label}ออกจากวันนี้?<br><small>เมนูในมื้อนี้จะถูกลบด้วย</small>`, 'เอาออก', true))) return;
    d.slots = daySlots(date).filter((s) => s !== slot); delete d.m[slot]; save(); refreshAll();
  },
  'fill-random': async () => {
    const keys = viewKeys();
    const what = ui.view === 'week' ? 'สัปดาห์นี้' : ui.view === 'month' ? 'เดือนนี้' : `ทั้งปี (${keys.length} วัน)`;
    // ยังไม่มีเมนูให้สุ่มเลย
    if (!state.recipes.some((r) => r.type !== 'base' && !isAvoided(r))) {
      const m = openModal(`<div class="confirm">${catSVG()}<p>ยังไม่มีเมนูให้สุ่ม<br><small>${state.recipes.length ? 'เมนูที่มีอยู่เป็นข้าว/แป้ง หรือมีของที่คุณแพ้ทั้งหมด' : 'สมุดเมนูยังว่างอยู่'} — สร้างเมนูก่อน แล้วค่อยกดสุ่มอีกครั้งนะ</small></p>
        <div class="modal-foot"><button class="btn ghost" data-act="close">ปิด</button>${!state.recipes.length ? `<button class="btn ghost" data-m="samples">ใช้เมนูตัวอย่าง</button>` : ''}<button class="btn primary" data-m="new">${ic('plus')} สร้างเมนู</button></div></div>`,
        { cls: 'small', onClick: (e) => { const b = e.target.closest('[data-m]'); if (!b) return; closeModal(m); if (b.dataset.m === 'new') openEditor(null); else ACTIONS['restore-samples']({ what: 'recipes' }); } });
      return;
    }
    const empty = []; for (const k of keys) for (const s of daySlots(k)) if (!state.plan[k]?.m?.[s]?.length) empty.push([k, s]);
    if (!empty.length) return toast(`ทุกมื้อของ${what}มีเมนูแล้ว`);
    if (!(await confirmBox(`สุ่มเมนูใส่มื้อที่ยังว่าง ${empty.length} มื้อของ${what}?<br><small>มื้อที่มีเมนูอยู่แล้วจะไม่ถูกแตะ</small>`, 'สุ่มเลย'))) return;
    let n = 0; const last = {}, noMenu = new Set();
    for (const k of keys) for (const s of daySlots(k)) {
      const cur = state.plan[k]?.m?.[s];
      if (cur?.length) { last[s] = cur[0].rid; continue; }
      const r = pickRandom(s, last[s]); if (!r) { noMenu.add(s); continue; }
      const d = getDay(k, true);
      d.m[s] = [{ rid: r.id, s: 1 }];
      if (r.type === 'side' && rec('r_rice')) d.m[s].push({ rid: 'r_rice', s: 1 });
      last[s] = r.id; n++;
    }
    save(); refreshAll();
    const miss = [...noMenu].map((s) => SLOTS[s].label).join(', ');
    if (!n) toast(`ยังไม่มีเมนูที่ตั้งว่าเหมาะกับ${miss} — แก้ไขเมนูแล้วเลือก “เหมาะกับมื้อ” ก่อนนะ`);
    else if (noMenu.size) toast(`เติมให้ ${n} มื้อ · ${miss} ยังไม่มีเมนูที่เหมาะ`);
    else toast(`เติมให้แล้ว ${n} มื้อ`);
  },
  'copy-prev': async () => {
    const keys = weekKeys(ui.cursor), prev = weekKeys(addDays(ui.cursor, -7));
    if (!prev.some((k) => state.plan[k])) return toast('สัปดาห์ก่อนยังไม่มีแพลนเลย');
    if (!(await confirmBox('คัดลอกแพลนสัปดาห์ก่อนมาใช้?<br><small>แพลนสัปดาห์นี้จะถูกแทนที่</small>', 'คัดลอก'))) return;
    keys.forEach((k, i) => { if (state.plan[prev[i]]) state.plan[k] = clone(state.plan[prev[i]]); else delete state.plan[k]; });
    save(); refreshAll(); toast('คัดลอกแล้ว');
  },
  'clear-range': async () => {
    const what = ui.view === 'week' ? 'สัปดาห์นี้' : ui.view === 'month' ? 'เดือนนี้' : 'ทั้งปีนี้';
    if (!(await confirmBox(`ล้างแพลน${what}ทั้งหมด?`, 'ล้างเลย', true))) return;
    viewKeys().forEach((k) => delete state.plan[k]); save(); refreshAll(); toast('ล้างแล้ว');
  },
  water: ({ v }) => {
    const k = todayKey(), wg = state.settings.waterGoal || 2000, before = state.water[k] || 0;
    state.water[k] = Math.max(0, before + +v); if (!state.water[k]) delete state.water[k];
    save(); updateWater();
    if (before < wg && (state.water[k] || 0) >= wg) toast('ดื่มน้ำครบเป้าแล้ว เก่งมาก!');
  },
  'step-done': ({ rid, i }, el) => { const s = (stepDone[rid] ||= new Set()); s.has(+i) ? s.delete(+i) : s.add(+i); el.classList.toggle('done'); },
  recipe: ({ rid }) => openRecipe(rid),
  'new-recipe': ({ name }) => openEditor(null, { name: name || '' }),
  addplan: ({ rid }) => openAddToPlan(rid),
  'menu-type': ({ v }) => { ui.menuType = v; $$('[data-act="menu-type"]').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); $('#menu-grid').innerHTML = menuGrid(); },
  'shop-range': ({ v }) => { ui.shopRange = v; renderMain(false); },
  'shop-check': ({ id }) => { if (state.shopChecked[id]) delete state.shopChecked[id]; else state.shopChecked[id] = 1; save(); renderMain(false); },
  'shop-reset': () => { state.shopChecked = {}; save(); renderMain(false); },
  'shop-copy': async () => {
    const t = shopText();
    try { await navigator.clipboard.writeText(t); }
    catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('คัดลอกรายการแล้ว');
  },
  'shop-print': () => printShopping(),
  'fridge-toggle': ({ id }) => { state.fridge = state.fridge.includes(id) ? state.fridge.filter((x) => x !== id) : [...state.fridge, id]; save(); renderMain(false); },
  'fridge-cat': ({ v }) => { ui.fridgeCat = v; renderMain(false); },
  'goto-ings': () => { ui.menuView = 'ings'; ACTIONS.tab({ tab: 'menus' }); },
  'tray-toggle': () => { ui.trayOpen = !ui.trayOpen; renderMain(false); },
  'fridge-cat-all': () => {
    const q = ui.fridgeQ.trim().toLowerCase();
    const ids = Object.values(ING).filter((i) => isActive(i) && i.cat !== 'pantry' && !/ข้าวสาร/.test(i.name) && (ui.fridgeCat === 'all' || i.cat === ui.fridgeCat) && (!q || i.name.toLowerCase().includes(q))).map((i) => i.id);
    state.fridge = [...new Set([...state.fridge, ...ids])]; save(); renderMain(false); toast(`เลือกเพิ่ม ${ids.length} อย่าง`);
  },
  'fridge-clear': () => { state.fridge = []; save(); renderMain(false); },
  'use-tdee': ({ v }) => { state.settings.goal = +v; save(); refreshAll(); toast(`ตั้งเป้าหมาย ${fmt(+v)} kcal แล้ว`); },
  'menu-view': ({ v }) => { ui.menuView = v; renderMain(false); },
  'prof-set': ({ k, v }) => { state.profile[k] = k === 'sex' ? v : num(v); save(); renderMain(false); },
  'set-ws': ({ v }) => { state.settings.weekStart = +v; save(); renderMain(false); toast('บันทึกแล้ว'); },
  'water-step': ({ v }) => { state.settings.waterGoal = Math.min(6000, Math.max(500, (state.settings.waterGoal || 2000) + +v)); save(); renderMain(false); },
  'goal-step': ({ v }) => { state.settings.goal = Math.min(6000, Math.max(800, state.settings.goal + +v)); save(); renderHeader(); renderMain(false); },
  'def-slot': ({ slot }) => {
    const s = state.settings.slots;
    if (s.includes(slot)) { if (s.length === 1) return toast('ต้องมีอย่างน้อย 1 มื้อนะ'); state.settings.slots = s.filter((x) => x !== slot); }
    else state.settings.slots = SLOT_ORDER.filter((x) => x === slot || s.includes(x));
    save(); renderMain(false);
  },
  'ing-edit': ({ id }) => openIngEditor(id || null),
  'ing-status': ({ v }) => { ui.ingStatus = v; ui.ingPage = 1; renderMain(false); },
  'ing-cat': ({ v }) => { ui.ingCat = v; ui.ingPage = 1; renderMain(false); },
  'ing-page': ({ p }) => { ui.ingPage = +p; $('#ing-table').innerHTML = ingTableHTML(); $('.ing-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'pref-add': ({ k, ids }) => { const set = new Set(state.profile[k] || []); ids.split(',').forEach((x) => ING[x] && set.add(x)); state.profile[k] = [...set]; save(); renderMain(false); },
  'pref-del': ({ k, id }) => { state.profile[k] = (state.profile[k] || []).filter((x) => x !== id); save(); renderMain(false); },
  'av-bg': ({ v }) => { state.settings.avatarBg = v; save(); renderHeader(); renderMain(false); },
  'av-rm': () => { state.settings.avatar = ''; save(); renderHeader(); renderMain(false); toast('เอารูปโปรไฟล์ออกแล้ว'); },
  'add-ing': () => {
    const name = $('#ni-name').value.trim(), kcal = $('#ni-kcal').value;
    if (!name) return toast('ใส่ชื่อวัตถุดิบก่อนนะ');
    if (findIng(name)) return toast('มีวัตถุดิบชื่อนี้แล้ว');
    if (kcal === '') return toast('ใส่แคลอรี่ต่อ 100 g ด้วยนะ');
    const unit = $('#ni-unit').value.trim(), grams = num($('#ni-grams').value);
    const c = { id: uid('ci'), name, cat: $('#ni-cat').value, kcal: num(kcal), units: unit && grams ? { [unit]: grams } : {} };
    if (unit && grams) c.buy = unit;
    state.customIngs.push(c); buildIng(); save(); renderMain(false); toast(`เพิ่ม ${name} แล้ว`);
  },
  'del-ing': async ({ id }) => {
    const used = state.recipes.filter((r) => r.ing.some((x) => x.id === id));
    if (!(await confirmBox(used.length ? `วัตถุดิบนี้ใช้อยู่ใน ${used.length} เมนู<br><small>${used.map((r) => esc(r.name)).join(', ')}</small><br>ลบแล้วเมนูพวกนั้นจะไม่มีวัตถุดิบนี้` : 'ลบวัตถุดิบนี้?', 'ลบ', true))) return;
    state.customIngs = state.customIngs.filter((c) => c.id !== id);
    state.recipes.forEach((r) => { r.ing = r.ing.filter((x) => x.id !== id); });
    state.fridge = state.fridge.filter((x) => x !== id);
    for (const k of ['allergies', 'dislikes']) state.profile[k] = (state.profile[k] || []).filter((x) => x !== id);
    buildIng(); save(); refreshAll(); toast('ลบวัตถุดิบแล้ว');
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `calicat-backup-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('ดาวน์โหลดไฟล์สำรองแล้ว');
  },
  'reset-all': () => openResetModal(),
  'restore-samples': async ({ what }) => {
    const withRecipes = what === 'recipes';
    const msg = withRecipes ? `เพิ่มเมนูตัวอย่าง ${SEED_RECIPES.length} เมนู?<br><small>วัตถุดิบตั้งต้นจะถูกเปิดใช้ด้วย เพราะเมนูตัวอย่างใช้วัตถุดิบเหล่านี้</small>` : `เปิดใช้วัตถุดิบตั้งต้น ${Object.keys(BASE_ING).length} อย่าง?<br><small>วัตถุดิบที่คุณเพิ่มเองยังอยู่ครบ</small>`;
    if (!(await confirmBox(msg, 'เพิ่มเลย'))) return;
    state.settings.noBase = false;
    if (withRecipes) { const have = new Set(state.recipes.map((r) => r.id)); state.recipes.push(...seedRecipes().filter((r) => !have.has(r.id))); }
    buildIng(); save(); refreshAll(); toast(withRecipes ? 'เพิ่มเมนูตัวอย่างแล้ว' : 'เปิดใช้วัตถุดิบตั้งต้นแล้ว');
  },
};
function closeAllModals() { while (modals.length) closeModal(); }

/* ---------- event wiring ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modals.length) { closeModal(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act], [role="checkbox"][data-act]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'menu-q') { ui.menuQ = t.value; $('#menu-grid').innerHTML = menuGrid(); }
  if (t.id === 'fridge-q') { ui.fridgeQ = t.value; $('#tile-grid').innerHTML = fridgeTiles(); }
  if (t.id === 'ing-q') { ui.ingQ = t.value; ui.ingPage = 1; $('#ing-table').innerHTML = ingTableHTML(); }
  if (t.dataset.prof) { state.profile[t.dataset.prof] = num(t.value); save(); $('#tdee-out').innerHTML = tdeeOut(); const b = bmiInfo(state.profile); $('#bmi-v').textContent = b.bmi; $('#bmi-l').textContent = b.label; }
  if (t.id === 'set-name') { state.settings.name = t.value.trim(); t.size = Math.max(6, t.value.length + 1); save(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'set-goal') { state.settings.goal = Math.min(6000, Math.max(800, Math.round(num(t.value, 1800)))); t.value = state.settings.goal; save(); renderHeader(); renderMain(false); toast('บันทึกเป้าหมายแล้ว'); }
  if ('fonly' in t.dataset) { ui.fridgeOnly = t.checked; $('#tile-grid').innerHTML = fridgeTiles(); }
  if (t.dataset.ingtoggle) { setIngActive(t.dataset.ingtoggle, t.checked); renderMain(false); toast(t.checked ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว'); }
  if (t.id === 'avatar-file' && t.files[0]) { openCropper(t.files[0]); t.value = ''; }
  if (t.id === 'set-water') { state.settings.waterGoal = Math.min(6000, Math.max(500, Math.round(num(t.value, 2000)))); t.value = state.settings.waterGoal; save(); renderMain(false); toast('บันทึกเป้าหมายดื่มน้ำแล้ว'); }
  if (t.id === 'set-ws') { state.settings.weekStart = +t.value; save(); toast('บันทึกแล้ว'); }
  if (t.id === 'shop-from') { ui.shopFrom = t.value; renderMain(false); }
  if (t.id === 'shop-to') { ui.shopTo = t.value; renderMain(false); }
  if (t.id === 'import-file' && t.files[0]) {
    const fr = new FileReader();
    fr.onload = async () => {
      try {
        const s = JSON.parse(fr.result);
        if (!s || !Array.isArray(s.recipes) || typeof s.plan !== 'object') throw new Error('bad');
        if (!(await confirmBox('นำเข้าข้อมูลจากไฟล์นี้?<br><small>ข้อมูลปัจจุบันจะถูกแทนที่</small>', 'นำเข้า'))) return;
        localStorage.setItem(STORE_KEY, JSON.stringify(s)); state = load(); buildIng(); render(); toast('นำเข้าข้อมูลแล้ว');
      } catch { toast('ไฟล์ไม่ถูกต้อง'); }
    };
    fr.readAsText(t.files[0]); t.value = '';
  }
});

/* ---------- ช่องค้นหาวัตถุดิบแบบ select2 ----------
   ใช้ร่วมกัน: อาหารที่แพ้/ไม่ชอบ (data-combo-in="allergies|dislikes") และชื่อวัตถุดิบในหน้าสร้างเมนู (data-combo-in="ing")
   รายการลอยแบบ fixed ใต้ช่อง และหลบแป้นพิมพ์มือถือด้วย visualViewport */
const COMBO_H = 260;
const combo = { el: null, mode: null, list: [], hi: 0, q: '' };
const comboPop = (() => { const p = document.createElement('div'); p.className = 'combo-float'; p.setAttribute('role', 'listbox'); p.hidden = true; document.body.appendChild(p); return p; })();
const isPhone = () => matchMedia('(max-width: 760px)').matches;
function comboItems() {
  const q = combo.q.trim().toLowerCase();
  const taken = combo.mode === 'ing' ? new Set() : new Set([...(state.profile.allergies || []), ...(state.profile.dislikes || [])]);
  const all = Object.values(ING).filter((i) => isActive(i) && !taken.has(i.id) && !/ข้าวสาร/.test(i.name));
  const order = (x, y) => Object.keys(ING_CATS).indexOf(x.cat) - Object.keys(ING_CATS).indexOf(y.cat) || x.name.localeCompare(y.name, 'th');
  const hit = q ? all.filter((i) => i.name.toLowerCase().includes(q)).sort((x, y) => x.name.toLowerCase().indexOf(q) - y.name.toLowerCase().indexOf(q) || x.name.localeCompare(y.name, 'th')) : all.sort(order);
  const out = hit.map((i) => ({ id: i.id, name: i.name, cat: i.cat }));
  if (combo.mode === 'ing' && q && !all.some((i) => i.name.toLowerCase() === q)) out.push({ create: true, name: combo.q.trim() });
  return out;
}
function hl(name, q) {
  q = q.trim(); const i = q ? name.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return esc(name);
  return esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length));
}
function comboDraw() {
  if (!combo.el || !document.body.contains(combo.el)) return comboClose();
  combo.list = comboItems();
  combo.hi = Math.min(combo.hi, Math.max(0, combo.list.length - 1));
  let lastCat = null;
  const head = `<div class="combo-hint">${combo.q.trim() ? `เจอ ${combo.list.filter((x) => !x.create).length} รายการ` : `พิมพ์เพื่อค้นหา · ${combo.list.length} รายการ`}</div>`;
  comboPop.innerHTML = head + (combo.list.length ? combo.list.map((i, n) => {
    if (i.create) return `<button type="button" class="combo-opt create ${n === combo.hi ? 'hi' : ''}" data-combo-pick="__new" data-n="${n}"><span class="ii-plus">${ic('plus')}</span><span>ใช้ชื่อ “${esc(i.name)}” <small>(วัตถุดิบใหม่)</small></span></button>`;
    const h = !combo.q.trim() && i.cat !== lastCat ? `<p class="combo-cat">${ING_CATS[i.cat]?.label || ''}</p>` : ''; lastCat = i.cat;
    return `${h}<button type="button" class="combo-opt ${n === combo.hi ? 'hi' : ''}" role="option" data-combo-pick="${i.id}" data-n="${n}">${ingImg(i.id)}<span>${hl(i.name, combo.q)}</span><small>${ING_CATS[i.cat]?.label || ''}</small></button>`;
  }).join('') : `<div class="combo-none"><p>ไม่เจอ “${esc(combo.q)}”</p><button type="button" class="btn ghost sm" data-act="goto-ings">${ic('plus')} เพิ่มวัตถุดิบใหม่</button></div>`);
  comboPop.dataset.mode = combo.mode;
  comboPop.hidden = false;
  combo.el.closest('.combo')?.classList.add('open');
  combo.el.setAttribute('aria-expanded', 'true');
  comboPlace();
  const hiEl = $('.combo-opt.hi', comboPop);
  if (hiEl) { const top = hiEl.offsetTop - 40, bot = hiEl.offsetTop + hiEl.offsetHeight + 6; if (top < comboPop.scrollTop) comboPop.scrollTop = Math.max(0, top); else if (bot > comboPop.scrollTop + comboPop.clientHeight) comboPop.scrollTop = bot - comboPop.clientHeight; }
}
function comboPlace() {
  if (comboPop.hidden || !combo.el) return;
  const vv = window.visualViewport, vh = vv ? vv.height : innerHeight, vTop = vv ? vv.offsetTop : 0;
  const nav = $('.bottom-nav'), navH = nav && getComputedStyle(nav).display !== 'none' && vh > innerHeight * 0.8 ? nav.offsetHeight : 0;
  const r = (combo.el.closest('.combo-box') || combo.el).getBoundingClientRect();
  const below = vTop + vh - navH - r.bottom - 12;
  comboPop.style.left = `${Math.round(r.left)}px`;
  comboPop.style.width = `${Math.round(Math.max(r.width, 240))}px`;
  comboPop.style.top = `${Math.round(r.bottom + 6)}px`;
  comboPop.style.maxHeight = `${Math.max(120, Math.min(COMBO_H, below))}px`;
}
function comboOpen(el) {
  combo.el = el; combo.mode = el.dataset.comboIn; combo.hi = 0;
  combo.q = findIng(el.value) ? '' : el.value; // ช่องที่เลือกไว้แล้ว เปิดมาให้เห็นรายการทั้งหมด
  if (isPhone()) {
    // เลื่อนช่องขึ้นไปไว้ด้านบนจอ รายการจะได้ไม่โดนแป้นพิมพ์บัง
    if (!el.closest('.sheet')) document.body.classList.add('combo-room'); // ให้เลื่อนช่องล่างสุดขึ้นไปด้านบนได้
    setTimeout(() => { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); setTimeout(comboDraw, 350); }, 60);
  }
  comboDraw();
}
function comboClose() {
  document.body.classList.remove('combo-room');
  comboPop.hidden = true; comboPop.innerHTML = '';
  $$('.combo.open').forEach((b) => b.classList.remove('open'));
  combo.el?.setAttribute('aria-expanded', 'false');
  combo.el = null; combo.mode = null;
}
function comboPick(id) {
  const el = combo.el, mode = combo.mode; if (!el) return;
  if (mode === 'ing') {
    el.value = id === '__new' ? combo.q.trim() : ING[id]?.name || '';
    comboClose();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (!ING[id]) return;
  comboClose(); ACTIONS['pref-add']({ k: mode, ids: id }); toast(`เพิ่ม ${ING[id].name} แล้ว`);
}
document.addEventListener('focusin', (e) => { if (e.target.dataset?.comboIn) comboOpen(e.target); else if (combo.el && !comboPop.contains(e.target)) comboClose(); });
document.addEventListener('input', (e) => { const t = e.target; if (!t.dataset?.comboIn) return; if (t !== combo.el) { combo.el = t; combo.mode = t.dataset.comboIn; } combo.q = t.value; combo.hi = 0; comboDraw(); });
document.addEventListener('click', (e) => { const t = e.target.closest?.('[data-combo-in]'); if (t && t !== combo.el) comboOpen(t); });
document.addEventListener('keydown', (e) => {
  if (e.target !== combo.el || comboPop.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); combo.hi = Math.min(combo.list.length - 1, combo.hi + 1); comboDraw(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); combo.hi = Math.max(0, combo.hi - 1); comboDraw(); }
  else if (e.key === 'Enter') { e.preventDefault(); const it = combo.list[combo.hi]; if (it) comboPick(it.create ? '__new' : it.id); }
  else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); comboClose(); }
  else if (e.key === 'Tab') comboClose();
}, true);
document.addEventListener('mousedown', (e) => {
  const opt = e.target.closest('[data-combo-pick]'); if (opt) { e.preventDefault(); comboPick(opt.dataset.comboPick); return; }
  if (comboPop.contains(e.target)) { e.preventDefault(); return; }
  if (e.target !== combo.el && !e.target.closest('.combo')) comboClose();
});
document.addEventListener('mouseover', (e) => { const o = e.target.closest('.combo-opt'); if (o && comboPop.contains(o) && +o.dataset.n !== combo.hi) { $$('.combo-opt.hi', comboPop).forEach((x) => x.classList.remove('hi')); o.classList.add('hi'); combo.hi = +o.dataset.n; } });
addEventListener('scroll', () => comboPlace(), true);
addEventListener('resize', () => comboPlace());
window.visualViewport?.addEventListener('resize', () => comboPlace());
window.visualViewport?.addEventListener('scroll', () => comboPlace());

/* ---------- boot ---------- */
buildIng();
render();
