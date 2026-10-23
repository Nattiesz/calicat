/* Calicat service worker — แคช app shell ให้เปิดได้แม้ออฟไลน์
   เวลาอัปเดตไฟล์: เปลี่ยน ?v=N ใน index.html แล้วเปลี่ยน VERSION ตรงนี้ให้ตรงกัน */
const VERSION = 70;
const SHELL = `calicat-shell-v${VERSION}`;
const FONTS = 'calicat-fonts';
const IMAGES = 'calicat-images';
const IMAGE_LIMIT = 300;

const SHELL_URLS = [
  './',
  `styles.css?v=${VERSION}`,
  `data.js?v=${VERSION}`,
  `app.js?v=${VERSION}`,
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Anuphan:wght@400;500;600;700&family=Fredoka:wght@400..700&family=Mali:wght@400;500;600;700&display=swap';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(SHELL_URLS);
    // ฟอนต์ไม่จำเป็นต่อการติดตั้ง ถ้าโหลดไม่ได้ก็ข้ามไป
    try { await (await caches.open(FONTS)).add(FONT_CSS); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [SHELL, FONTS, IMAGES];
    for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // หน้า HTML: ลองเน็ตก่อน (จะได้เวอร์ชันใหม่) ถ้าออฟไลน์ใช้ตัวที่แคชไว้
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, SHELL, './'));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(cacheFirst(req, SHELL));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com') {
    e.respondWith(staleWhileRevalidate(req, FONTS));
    return;
  }
  if (url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req, FONTS));
    return;
  }
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'images.unsplash.com') {
    e.respondWith(staleWhileRevalidate(req, IMAGES, IMAGE_LIMIT));
  }
});

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(fallbackUrl, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(fallbackUrl)) || (await cache.match(req)) || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') {
      cache.put(req, res.clone()).then(() => limit && trim(cache, limit));
    }
    return res;
  }).catch(() => hit || Response.error());
  return hit || update;
}

// ลบรูปเก่าสุดออกเมื่อเกินจำนวนที่กำหนด กันแคชบวม
async function trim(cache, limit) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i]);
}
