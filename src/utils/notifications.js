let swRegistration = null;
let swWorker = null;

export async function initNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log('Bildirim desteği yok');
    return false;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    swWorker = swRegistration.installing || swRegistration.waiting || swRegistration.active;
    
    console.log('Service Worker kaydedildi');
    return true;
  } catch (error) {
    console.error('Service Worker kayıt hatası:', error);
    return false;
  }
}

export async function requestPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export function scheduleMedicationReminder(medication) {
  if (!swRegistration || Notification.permission !== 'granted') {
    return false;
  }

  const now = new Date();
  const [hours, minutes] = medication.time.split(':').map(Number);
  
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);
  
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const delay = reminderTime.getTime() - now.getTime();

  const message = {
    type: 'SCHEDULE_NOTIFICATION',
    medicationId: medication.id,
    medicationName: medication.name,
    dosage: medication.dosage,
    delay: delay
  };

  if (swWorker) {
    swWorker.postMessage(message);
  } else if (swRegistration.active) {
    swRegistration.active.postMessage(message);
  }

  return true;
}

export function scheduleAllReminders(meds) {
  meds.forEach(med => {
    if (!med.taken) {
      scheduleMedicationReminder(med);
    }
  });
}
