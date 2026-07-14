import React, { useState, useEffect, useCallback } from 'react';
import { initNotifications, requestPermission, scheduleMedicationReminder, scheduleAllReminders } from './utils/notifications';
import './index.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('meds');
  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem('meds');
    return saved ? JSON.parse(saved) : [];
  });
  const [bpRecords, setBpRecords] = useState(() => {
    const saved = localStorage.getItem('bp_records');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showMedForm, setShowMedForm] = useState(false);
  const [showBpForm, setShowBpForm] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('loading');
  const [reminderStatus, setReminderStatus] = useState('');

  // Bildirim iznini kontrol et ve iste
  useEffect(() => {
    async function setupNotifications() {
      const initialized = await initNotifications();
      if (initialized) {
        const permission = await requestPermission();
        setNotificationStatus(permission);
        
        if (permission === 'granted') {
          scheduleAllReminders(meds);
        }
      } else {
        setNotificationStatus('unsupported');
      }
    }
    setupNotifications();
  }, []);

  // İlaçlar değiştiğinde hatırlatmaları yeniden kur
  useEffect(() => {
    if (notificationStatus === 'granted' && meds.length > 0) {
      scheduleAllReminders(meds);
    }
  }, [meds, notificationStatus]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('meds', JSON.stringify(meds));
  }, [meds]);

  useEffect(() => {
    localStorage.setItem('bp_records', JSON.stringify(bpRecords));
  }, [bpRecords]);

  // Handlers
  const addMed = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newMed = {
      id: crypto.randomUUID(),
      name: formData.get('name'),
      dosage: formData.get('dosage'),
      time: formData.get('time'),
      taken: false,
      date: new Date().toLocaleDateString()
    };
    setMeds([...meds, newMed]);
    setShowMedForm(false);
    
    if (notificationStatus === 'granted') {
      scheduleMedicationReminder(newMed);
      setReminderStatus(`${newMed.name} için hatırlatma kuruldu!`);
      setTimeout(() => setReminderStatus(''), 3000);
    }
  };

  const addBp = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBp = {
      id: crypto.randomUUID(),
      systolic: formData.get('systolic'),
      diastolic: formData.get('diastolic'),
      pulse: formData.get('pulse'),
      timestamp: new Date().toLocaleString()
    };
    setBpRecords([newBp, ...bpRecords]);
    setShowBpForm(false);
  };

  const toggleMed = (id) => {
    setMeds(meds.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const deleteMed = (id) => {
    setMeds(meds.filter(m => m.id !== id));
  };

  const deleteBp = (id) => {
    setBpRecords(bpRecords.filter(r => r.id !== id));
  };

  const handleEnableNotifications = async () => {
    const permission = await requestPermission();
    setNotificationStatus(permission);
    if (permission === 'granted') {
      scheduleAllReminders(meds);
    }
  };

  const getNotificationBadge = () => {
    if (notificationStatus === 'loading') return '⏳';
    if (notificationStatus === 'granted') return '🔔';
    if (notificationStatus === 'denied') return '🔕';
    return '⚠️';
  };

  const getNotificationText = () => {
    if (notificationStatus === 'loading') return 'Kontrol ediliyor...';
    if (notificationStatus === 'granted') return 'Bildirimler açık';
    if (notificationStatus === 'denied') return 'Bildirimler engellendi';
    return 'Bildirim izni gerekli';
  };

  return (
    <div className="container">
      <header style={{ marginBottom: '32px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Sağlık Takibi</h1>
            <p style={{ color: 'var(--text-muted)' }}>Bugün nasılsın?</p>
          </div>
          <button
            onClick={handleEnableNotifications}
            style={{
              background: notificationStatus === 'granted' ? 'var(--success)' : 'var(--warning)',
              padding: '8px 12px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {getNotificationBadge()} {getNotificationText()}
          </button>
        </div>
        
        {reminderStatus && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'var(--success)',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '0.9rem'
          }}>
            ✅ {reminderStatus}
          </div>
        )}
      </header>

      <main style={{ paddingBottom: '100px' }}>
        {activeTab === 'meds' ? (
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
                <input name="time" type="time" required />
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Kaydet</button>
              </form>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
              {meds.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', opacity: 0.7 }}>
                  Henüz ilaç eklenmemiş.
                </div>
              ) : (
                meds.map(med => (
                  <div key={med.id} className={`glass-card`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <input 
                        type="checkbox" 
                        checked={med.taken} 
                        onChange={() => toggleMed(med.id)}
                        style={{ width: '20px', height: '20px', margin: 0 }}
                      />
                      <div style={{ textDecoration: med.taken ? 'line-through' : 'none', opacity: med.taken ? 0.5 : 1 }}>
                        <h4 style={{ fontSize: '1.1rem' }}>{med.name}</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {med.dosage} • {med.time}
                          {!med.taken && notificationStatus === 'granted' && (
                            <span style={{ marginLeft: '8px', color: 'var(--success)' }}>🔔</span>
                          )}
                        </p>
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
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Kaydet</button>
              </form>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
              {bpRecords.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', opacity: 0.7 }}>
                  Henüz kayıt bulunmuyor.
                </div>
              ) : (
                bpRecords.map(record => (
                  <div key={record.id} className="glass-card">
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
                      <button 
                        onClick={() => deleteBp(record.id)}
                        style={{ background: 'transparent', color: 'var(--error)', padding: '4px' }}
                      >
                        🗑️
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--secondary)' }}>❤️</span>
                      <span>{record.pulse} <small>bpm</small></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      <nav className="nav-bar">
        <div 
          className={`nav-item ${activeTab === 'meds' ? 'active' : ''}`}
          onClick={() => setActiveTab('meds')}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>💊</span>
          <span>İlaçlar</span>
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
