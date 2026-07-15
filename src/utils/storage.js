const PREFIX = '';

export const KEYS = {
  MEDS: 'meds',
  GROUPS: 'time_groups',
  DAILY_LOG: 'daily_log',
  BP: 'bp_records',
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export const DEFAULT_GROUPS = [
  { id: 'morning', label: 'Sabah', time: '08:00', icon: '🌅' },
  { id: 'noon', label: 'Öğle', time: '13:00', icon: '☀️' },
  { id: 'evening', label: 'Akşam', time: '20:00', icon: '🌙' },
];
