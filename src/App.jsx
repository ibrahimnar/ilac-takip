import React, { useState, useEffect, useRef, useCallback } from 'react';
import { load, save, KEYS } from './utils/storage';
import { migrateMeds, getGroups, buildDailySchedule } from './utils/schedule';
import { initNotifications, requestPermission, scheduleGroupReminder, showGroupNotification } from './utils/notifications';
import DailySchedule from './components/DailySchedule';
import NotificationBanner from './components/NotificationBanner';
import AssignmentView from './components/AssignmentView';
import './index.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('today');

  const [groups, setGroups] = useState(() => getGroups());
  const [meds, setMeds] = useState(() => migrateMeds());
  const [bpRecords, setBpRecords] = useState(() => {
    const saved = load(KEYS.BP, []);
    return (saved || []).map((r) => {
      if (!r.timestamp) return r;
      if (String(r.timestamp).includes('T')) return r;
      const d = new Date(r.timestamp);
      if (isNaN(d.getTime())) return r;
      return { ...r, timestamp: d.toISOString().slice(0, 16) };
    });
  });
  const [dailySchedule, setDailySchedule] = useState(() => buildDailySchedule(meds, groups));

  const [showMedForm, setShowMedForm] = useState(false);
  const [showBpForm, setShowBpForm] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState('loading');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [bpFrom, setBpFrom] = useState('');
  const [bpTo, setBpTo] = useState('');
  const [editingBpId, setEditingBpId] = useState(null);

  // Gruplar veya ilaçlar değişince günlük şablonu yeniden üret (taken/ack korunur)
  useEffect(() => {
    setDailySchedule(buildDailySchedule(meds, groups));
  }, [meds, groups]);

  // Persistence
  useEffect(() => { save(KEYS.MEDS, meds); }, [meds]);
  useEffect(() => { save(KEYS.GROUPS, groups); }, [groups]);
  useEffect(() => { save(KEYS.BP, bpRecords); }, [bpRecords]);

  const persistSchedule = (next) => {
    setDailySchedule(next);
    const log = load(KEYS.DAILY_LOG, {});
    log[next.date] = next;
    save(KEYS.DAILY_LOG, log);
  };

  // Bildirim iznini kontrol et ve iste
  useEffect(() => {
    async function setup() {
      const initialized = await initNotifications();
      if (initialized) {
        setNotificationStatus(await requestPermission());
      } else {
        setNotificationStatus('unsupported');
      }
    }
    setup();
  }, []);

  // Güncel state'e erişim için ref (tick kapatmalarında bayat veri önler)
  const stateRef = useRef({ meds, groups, dailySchedule });
  useEffect(() => {
    stateRef.current = { meds, groups, dailySchedule };
  });

  // Grup bildirimlerini kur + vakti gelenleri tetikle
  const evaluateAlerts = useCallback(() => {
    const { meds, groups, dailySchedule } = stateRef.current;
    const now = new Date();
    const due = [];

    for (const g of groups) {
      const grp = dailySchedule.groups[g.id];
      if (!grp) continue;
      const [h, m] = g.time.split(':').map(Number);
      const gt = new Date(now);
      gt.setHours(h, m, 0, 0);

      const medNames = grp.meds
        .map((x) => meds.find((mm) => mm.id === x.medId)?.name)
        .filter(Boolean);

      if (now >= gt && !grp.notificationAck) {
        due.push(g.id);
        showGroupNotification({ groupId: g.id, label: g.label, time: g.time, icon: g.icon, dateKey: dailySchedule.date, meds: medNames });
      } else if (now < gt && !grp.notificationAck) {
        scheduleGroupReminder({ groupId: g.id, label: g.label, time: g.time, icon: g.icon, dateKey: dailySchedule.date, meds: medNames });
      }
    }
    setActiveAlerts(due);
  }, []);

  useEffect(() => {
    if (notificationStatus !== 'granted') return;
    evaluateAlerts();
    const id = setInterval(evaluateAlerts, 30000);
    return () => clearInterval(id);
  }, [notificationStatus, evaluateAlerts]);

  // Bildirim zamanı seviyesinde onay (Faz D: iki seviyeli kapanış)
  const ackGroup = useCallback((groupId) => {
    setDailySchedule((prev) => {
      const grp = prev.groups[groupId];
      if (!grp) return prev;
      const next = {
        ...prev,
        groups: {
          ...prev.groups,
          [groupId]: { ...grp, notificationAck: true },
        },
      };
      const log = load(KEYS.DAILY_LOG, {});
      log[next.date] = next;
      save(KEYS.DAILY_LOG, log);
      return next;
    });
    setActiveAlerts((a) => a.filter((id) => id !== groupId));
  }, []);

  // Service Worker'dan gelen onay mesajı (bildirim aksiyonu "Alındı")
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event) => {
      if (event.data?.type === 'ACK_GROUP') {
        ackGroup(event.data.groupId);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [ackGroup]);

  const handleEnableNotifications = async () => {
    const permission = await requestPermission();
    setNotificationStatus(permission);
    if (permission === 'granted') evaluateAlerts();
  };

  // İlaç işlemleri
  const addMed = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newMed = {
      id: crypto.randomUUID(),
      name: formData.get('name'),
      dosage: formData.get('dosage'),
      groupIds: [],
    };
    setMeds([...meds, newMed]);
    setShowMedForm(false);
  };

  // Bir ilacı bir zaman dilimine ata/çıkar (Uygulama Planı)
  const toggleAssignment = (medId, groupId) => {
    setMeds(meds.map((m) => {
      if (m.id !== medId) return m;
      const has = m.groupIds?.includes(groupId);
      return {
        ...m,
        groupIds: has
          ? m.groupIds.filter((id) => id !== groupId)
          : [...(m.groupIds || []), groupId],
      };
    }));
  };

  const deleteMed = (id) => {
    setMeds(meds.filter((m) => m.id !== id));
    // Günlük şablondan da çıkar
    const next = { ...dailySchedule, groups: {} };
    for (const [gid, grp] of Object.entries(dailySchedule.groups)) {
      next.groups[gid] = { ...grp, meds: grp.meds.filter((x) => x.medId !== id) };
    }
    persistSchedule(next);
  };

  // Zaman grubu işlemleri
  const addOrUpdateGroup = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const label = formData.get('label').trim();
    const time = formData.get('time');
    if (!label || !time) return;

    if (editingGroup) {
      setGroups(groups.map((g) =>
        g.id === editingGroup.id ? { ...g, label, time } : g));
      setEditingGroup(null);
    } else {
      const newGroup = {
        id: crypto.randomUUID(),
        label,
        time,
        icon: '⏰',
      };
      setGroups([...groups, newGroup]);
    }
    e.target.reset();
  };

  const deleteGroup = (id) => {
    setGroups(groups.filter((g) => g.id !== id));
    // İlaçlardan bu grubu çıkar
    setMeds(meds.map((m) =>
      m.groupIds?.includes(id)
        ? { ...m, groupIds: m.groupIds.filter((g) => g !== id) }
        : m));
  };

  const startEditGroup = (g) => {
    setEditingGroup(g);
    setShowGroups(true);
  };

  // Tansiyon işlemleri
  const addBp = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const ts = formData.get('timestamp') || new Date().toISOString();
    const newBp = {
      id: crypto.randomUUID(),
      systolic: formData.get('systolic'),
      diastolic: formData.get('diastolic'),
      pulse: formData.get('pulse'),
      timestamp: ts,
    };
    setBpRecords([newBp, ...bpRecords]);
    setShowBpForm(false);
  };

  const deleteBp = (id) => {
    setBpRecords(bpRecords.filter((r) => r.id !== id));
  };

  // Günlük şablonda ilaç bazlı onay (Faz B)
  const toggleMedTaken = (groupId, medId) => {
    const grp = dailySchedule.groups[groupId];
    if (!grp) return;
    const next = {
      ...dailySchedule,
      groups: {
        ...dailySchedule.groups,
        [groupId]: {
          ...grp,
          meds: grp.meds.map((m) =>
            m.medId === medId ? { ...m, taken: !m.taken } : m),
        },
      },
    };
    persistSchedule(next);
  };

  const allTakenInGroup = (groupId) => {
    const grp = dailySchedule.groups[groupId];
    if (!grp || grp.meds.length === 0) return;
    const next = {
      ...dailySchedule,
      groups: {
        ...dailySchedule.groups,
        [groupId]: { ...grp, meds: grp.meds.map((m) => ({ ...m, taken: true })) },
      },
    };
    persistSchedule(next);
  };

  const groupLabel = (id) => groups.find((g) => g.id === id)?.label || id;

  const updateBpTimestamp = (id, newTs) => {
    setBpRecords((prev) => prev.map((r) => (r.id === id ? { ...r, timestamp: newTs } : r)));
  };

  const filteredBpRecords = bpRecords.filter((r) => {
    if (!r.timestamp) return true;
    const day = String(r.timestamp).slice(0, 10);
    if (bpFrom && day < bpFrom) return false;
    if (bpTo && day > bpTo) return false;
    return true;
  });

  const buildBpShareTable = () => {
    const rows = filteredBpRecords.map((r) => `${r.timestamp}\t${r.systolic}/${r.diastolic} mmHg\t${r.pulse} bpm`);
    return ['Tarih\tSistolik/Diastolik\tNabız', ...rows].join('\n');
  };

  const shareBp = (channel) => {
    const text = encodeURIComponent(buildBpShareTable());
    if (channel === 'mail') {
      window.open(`mailto:?subject=Tansiyon%20%C3%96l%C3%87%C3%BCmleri&body=${text}`);
    } else {
      window.open(`https://wa.me/?text=${text}`);
    }
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '32px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Sağlık Takibi</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleEnableNotifications}
              disabled={notificationStatus === 'loading'}
              title={notificationStatus === 'denied' ? 'Bildirimler engellendi' : 'Bildirim izni'}
              style={{
                background: notificationStatus === 'granted' ? 'var(--success)' : 'var(--glass)',
                border: '1px solid var(--glass-border)',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: notificationStatus === 'loading' ? 0.6 : 1,
              }}
            >
              {notificationStatus === 'granted' ? '🔔' : notificationStatus === 'denied' ? '🔕' : '🔔 İzin'}
            </button>
            <button
              onClick={() => setShowGroups(true)}
              style={{
                background: 'var(--glass)',
                border: '1px solid var(--glass-border)',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              ⚙️ Gruplar
            </button>
          </div>
        </div>
      </header>

      <main style={{ paddingBottom: '100px' }}>
        {activeTab === 'today' ? (
          <DailySchedule
            schedule={dailySchedule}
            meds={meds}
            groups={groups}
            onToggleMed={toggleMedTaken}
            onAllTaken={allTakenInGroup}
          />
        ) : activeTab === 'meds' ? (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>İlaçlarım</h2>
              <button
                className="btn-primary"
                style={{ padding: '8px 16px', borderRadius: '50px' }}
                onClick={() => setShowMedForm(!showMedForm)}
              >
                {showMedForm ? 'Kapat' : '+ Ekle'}
              </button>
            </div>

            {showMedForm && (
              <form className="glass-card" style={{ marginBottom: '24px' }} onSubmit={addMed}>
                <input name="name" placeholder="İlaç Adı (örn: Parol)" required />
                <input name="dosage" placeholder="Dozaj (örn: 500mg)" required />
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Kaydet</button>
              </form>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
              {meds.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', opacity: 0.7 }}>
                  Henüz ilaç eklenmemiş.
                </div>
              ) : (
                meds.map((med) => (
                  <div key={med.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '1.1rem' }}>{med.name}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{med.dosage}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(med.groupIds || []).map((gid) => (
                          <span
                            key={gid}
                            style={{
                              fontSize: '0.75rem', padding: '3px 10px', borderRadius: '50px',
                              background: 'rgba(79,70,229,0.2)', color: 'var(--primary)',
                            }}
                          >
                            {groupLabel(gid)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMed(med.id)}
                      style={{ background: 'transparent', color: 'var(--error)', padding: '4px' }}
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : activeTab === 'plan' ? (
          <AssignmentView meds={meds} groups={groups} onToggle={toggleAssignment} />
        ) : (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Tansiyon Takibi</h2>
              <button
                className="btn-primary"
                style={{ padding: '8px 16px', borderRadius: '50px' }}
                onClick={() => setShowBpForm(!showBpForm)}
              >
                {showBpForm ? 'Kapat' : '+ Yeni Ölçüm'}
              </button>
            </div>

            {showBpForm && (
              <form className="glass-card" style={{ marginBottom: '24px' }} onSubmit={addBp}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input name="systolic" type="number" placeholder="Büyük (Sys)" required />
                  <input name="diastolic" type="number" placeholder="Küçük (Dia)" required />
                </div>
                <input name="pulse" type="number" placeholder="Nabız (Pulse)" required />
                <input name="timestamp" type="datetime-local" defaultValue={new Date().toISOString().slice(0,16)} style={{ marginBottom: 0 }} />
                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>Kaydet</button>
              </form>
            )}

            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                <input type="date" value={bpFrom} onChange={(e) => setBpFrom(e.target.value)} style={{ marginBottom: 0 }} />
                <span style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="date" value={bpTo} onChange={(e) => setBpTo(e.target.value)} style={{ marginBottom: 0 }} />
                <button onClick={() => { setBpFrom(''); setBpTo(''); }} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '8px 12px' }}>Temizle</button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={() => shareBp('mail')} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '8px 12px', borderRadius: '12px', fontSize: '0.8rem' }}>📧 Mail</button>
                  <button onClick={() => shareBp('whatsapp')} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', padding: '8px 12px', borderRadius: '12px', fontSize: '0.8rem' }}>💬 WhatsApp</button>
                </div>
              </div>

              {filteredBpRecords.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', opacity: 0.7 }}>
                  {bpRecords.length === 0 ? 'Henüz kayıt bulunmuyor.' : 'Seçilen aralıkta kayıt yok.'}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {filteredBpRecords.map((record) => {
                    const isEditing = editingBpId === record.id;
                    return (
                      <div key={record.id} className="glass-card">
                        {isEditing ? (
                          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); updateBpTimestamp(record.id, fd.get('timestamp')); setEditingBpId(null); }} style={{ display: 'grid', gap: '8px' }}>
                            <input name="timestamp" type="datetime-local" defaultValue={String(record.timestamp).slice(0,16)} required />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="submit" className="btn-primary" style={{ flex: 1 }}>Kaydet</button>
                              <button type="button" onClick={() => setEditingBpId(null)} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', flex: 1 }}>İptal</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.timestamp}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{record.systolic}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{record.diastolic}</span>
                                  <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>mmHg</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => setEditingBpId(record.id)} style={{ background: 'transparent', color: 'var(--primary)', padding: '4px' }}>✏️</button>
                                <button onClick={() => deleteBp(record.id)} style={{ background: 'transparent', color: 'var(--error)', padding: '4px' }}>🗑️</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--secondary)' }}>❤️</span>
                              <span>{record.pulse} <small>bpm</small></span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {showGroups && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px',
          }}
          onClick={() => { setShowGroups(false); setEditingGroup(null); }}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '460px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Zaman Dilimleri</h3>
              <button onClick={() => { setShowGroups(false); setEditingGroup(null); }} style={{ background: 'transparent', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <form onSubmit={addOrUpdateGroup} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input name="label" placeholder="Etiket (örn: Sabah)" defaultValue={editingGroup?.label || ''} style={{ marginBottom: 0 }} required />
                <input name="time" type="time" defaultValue={editingGroup?.time || '08:00'} style={{ marginBottom: 0, width: '120px' }} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                {editingGroup ? 'Güncelle' : 'Ekle'}
              </button>
            </form>

            <div style={{ display: 'grid', gap: '10px' }}>
              {groups.map((g) => (
                <div key={g.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{g.icon}</span>
                    <div>
                      <h4>{g.label}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{g.time}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEditGroup(g)} style={{ background: 'transparent', color: 'var(--primary)' }}>✏️</button>
                    <button onClick={() => deleteGroup(g.id)} style={{ background: 'transparent', color: 'var(--error)' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <NotificationBanner
        alerts={activeAlerts}
        schedule={dailySchedule}
        groups={groups}
        meds={meds}
        onToggleMed={toggleMedTaken}
        onAckGroup={ackGroup}
      />

      <nav className="nav-bar">
        <div
          className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📅</span>
          <span>Bugün</span>
        </div>
        <div
          className={`nav-item ${activeTab === 'meds' ? 'active' : ''}`}
          onClick={() => setActiveTab('meds')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>💊</span>
          <span>İlaçlar</span>
        </div>
        <div
          className={`nav-item ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🗓️</span>
          <span>Plan</span>
        </div>
        <div
          className={`nav-item ${activeTab === 'bp' ? 'active' : ''}`}
          onClick={() => setActiveTab('bp')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>❤️</span>
          <span>Tansiyon</span>
        </div>
      </nav>
    </div>
  );
};

export default App;
