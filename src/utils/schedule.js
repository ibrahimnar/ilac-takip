import { load, save, KEYS, DEFAULT_GROUPS } from './storage';

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getGroups() {
  const groups = load(KEYS.GROUPS, null);
  return groups && groups.length ? groups : DEFAULT_GROUPS;
}

// Eski (tek saatli) ilaçları yeni groupIds modeline taşır.
// `time` ile eşleşen grup varsa ona, yoksa ilk gruba atar.
export function migrateMeds() {
  const meds = load(KEYS.MEDS, []);
  const groups = getGroups();
  let changed = false;

  const migrated = meds.map((m) => {
    if (m.groupIds !== undefined) return m;
    changed = true;
    if (m.time) {
      const match = groups.find((g) => g.time === m.time);
      return { ...m, groupIds: match ? [match.id] : [groups[0].id] };
    }
    return { ...m, groupIds: [] };
  });

  if (changed) save(KEYS.MEDS, migrated);
  return migrated;
}

// Bir tarih için günlük şablonu üretir; mevcut taken/ack durumunu korur.
export function buildDailySchedule(meds, groups, dateKey = todayKey()) {
  const log = load(KEYS.DAILY_LOG, {});
  const existing = log[dateKey] || { date: dateKey, groups: {} };
  const groupsOut = {};

  for (const g of groups) {
    const groupMeds = meds
      .filter((m) => (m.groupIds || []).includes(g.id))
      .map((m) => {
        const prev = existing.groups?.[g.id]?.meds?.find((x) => x.medId === m.id);
        return { medId: m.id, taken: prev ? prev.taken : false };
      });

    const prevGroup = existing.groups?.[g.id] || {};
    groupsOut[g.id] = {
      meds: groupMeds,
      notificationAck: prevGroup.notificationAck || false,
      notifiedAt: prevGroup.notifiedAt || null,
    };
  }

  const schedule = { date: dateKey, groups: groupsOut };
  log[dateKey] = schedule;
  save(KEYS.DAILY_LOG, log);
  return schedule;
}

// Vakti gelmiş/geçmiş ve henüz onaylanmamış grupları döndürür.
export function getDueGroups(schedule, groups = getGroups(), now = new Date()) {
  return groups.map((g) => {
    const grp = schedule.groups[g.id];
    const [h, m] = g.time.split(':').map(Number);
    const groupTime = new Date(now);
    groupTime.setHours(h, m, 0, 0);

    const due = !!grp && now >= groupTime && !grp.notificationAck;
    return { ...g, due, groupState: grp || null };
  });
}
