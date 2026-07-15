let swRegistration = null;
let swWorker = null;

export async function initNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log('Bildirim desteği yok');
    return false;
  }

  const base = import.meta.env.BASE_URL || '/';

  try {
    swRegistration = await navigator.serviceWorker.register(base + 'sw.js');
    swWorker = swRegistration.installing || swRegistration.waiting || swRegistration.active;

    if (swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    });

    console.log('Service Worker kaydedildi');
    return true;
  } catch (error) {
    console.error('Service Worker kayıt hatası:', error);
    return false;
  }
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

function postToWorker(message) {
  if (swWorker) {
    swWorker.postMessage(message);
  } else if (swRegistration && swRegistration.active) {
    swRegistration.active.postMessage(message);
  }
}

// Gelecekteki grup zamanı için bildirim kurar (SW, TimestampTrigger ile yönetir).
export function scheduleGroupReminder({ groupId, label, time, icon, dateKey, meds }) {
  if (!swRegistration || Notification.permission !== 'granted') return false;

  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);

  postToWorker({
    type: 'SCHEDULE_GROUP_NOTIFICATION',
    tag: `grp-${dateKey}-${groupId}`,
    groupId, label, time, icon, dateKey,
    delay: target.getTime() - Date.now(),
    medList: (meds || []).join(', '),
  });
  return true;
}

// Zamanı gelmiş/geçmiş grup için anlık bildirim gösterir (SW tekrarı engeller).
export function showGroupNotification({ groupId, label, time, icon, dateKey, meds }) {
  if (!swRegistration || Notification.permission !== 'granted') return false;

  postToWorker({
    type: 'SHOW_GROUP_NOTIFICATION',
    tag: `grp-${dateKey}-${groupId}`,
    groupId, label, time, icon, dateKey,
    medList: (meds || []).join(', '),
  });
  return true;
}
