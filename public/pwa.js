// Установка как приложение и включение уведомлений.
window.PWA = (() => {
  let X, deferred = null;
  const T = {
    ru: { h: 'Уведомления', on: 'Включить', later: 'Не сейчас', text: 'Напомним, если серия вот-вот сгорит, придёт сообщение или друг позовёт в баттл.', done: 'Уведомления включены', denied: 'Уведомления запрещены в настройках браузера',
      install: 'Установить приложение', iosH: 'Приложение на iPhone', ios: 'Нажмите «Поделиться» ⬆︎ внизу Safari → «На экран „Домой“». После этого можно включить уведомления.' },
    kk: { h: 'Хабарландырулар', on: 'Қосу', later: 'Кейін', text: 'Серия жанып кетуге жақын болса, хабарлама келсе немесе досыңыз баттлға шақырса, ескертеміз.', done: 'Хабарландырулар қосылды', denied: 'Хабарландыруларға браузер баптауларында тыйым салынған',
      install: 'Қосымшаны орнату', iosH: 'iPhone-дағы қосымша', ios: 'Safari төменгі жағындағы «Бөлісу» ⬆︎ → «Басты экранға» түймесін басыңыз. Содан кейін хабарландыруларды қосуға болады.' }
  };
  const t = () => T[X?.lang?.()] || T.ru;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))); };
  const dismissed = () => { try { return Date.now() - (+localStorage.getItem('ba_push_later') || 0) < 7 * 864e5; } catch { return false; } };

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.querySelectorAll('[data-pwa-install]').forEach(b => { b.hidden = false; }); });
  navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.type === 'open' && X) { const u = new URL(e.data.url); X.go(u.pathname + u.search); } });

  async function enable() {
    if (!supported()) return false;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { X.toast(t().denied); return false; }
    const reg = await navigator.serviceWorker.ready;
    const { key } = await (await fetch('/api/push/key')).json();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    await X.api('/api/push/sub', { method: 'POST', body: { sub: sub.toJSON() } });
    X.toast(t().done);
    return true;
  }
  // Уже разрешено — тихо обновляем подписку (после смены аккаунта или переустановки).
  async function refresh() {
    if (!supported() || Notification.permission !== 'granted' || !X?.me()) return;
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await X.api('/api/push/sub', { method: 'POST', body: { sub: sub.toJSON() } }); else await enable(); } catch {}
  }
  // Плашка на главной: включить уведомления (или как установить на iPhone).
  function banner(box) {
    if (!box || !X?.me() || dismissed()) return;
    const iosNeedsInstall = ios && !standalone();
    if (!iosNeedsInstall && (!supported() || Notification.permission !== 'default')) return;
    box.innerHTML = `<div class="wrap"><div class="pwa-card"><i>${iosNeedsInstall ? '📲' : '🔔'}</i><div><b>${iosNeedsInstall ? t().iosH : t().h}</b><p>${iosNeedsInstall ? t().ios : t().text}</p></div>
      <div class="pwa-card__btns">${iosNeedsInstall ? '' : `<button class="btn btn--sm" data-on>${t().on}</button>`}<button class="linkbtn" data-later>${t().later}</button></div></div></div>`;
    box.hidden = false;
    box.querySelector('[data-later]').onclick = () => { try { localStorage.setItem('ba_push_later', Date.now()); } catch {} box.hidden = true; };
    const on = box.querySelector('[data-on]');
    if (on) on.onclick = async () => { on.disabled = true; try { if (await enable()) box.hidden = true; } catch { X.toast(X.L().err.server); } on.disabled = false; };
  }
  async function install() { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; document.querySelectorAll('[data-pwa-install]').forEach(b => { b.hidden = true; }); }

  return { init: ctx => { X = ctx; refresh(); }, banner, enable, install, canInstall: () => !!deferred, t: () => t() };
})();
