import React from 'react';

const NotificationBanner = ({ alerts, schedule, groups, meds, onToggleMed, onAckGroup }) => {
  if (!alerts || alerts.length === 0) return null;

  const medById = (id) => meds.find((m) => m.id === id);

  return (
    <div
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: '70px',
        zIndex: 90,
        padding: '0 16px',
        display: 'grid',
        gap: '12px',
        maxWidth: '500px',
        margin: '0 auto',
        pointerEvents: 'none',
      }}
    >
      {alerts.map((groupId) => {
        const g = groups.find((x) => x.id === groupId);
        const grp = schedule.groups[groupId];
        if (!g || !grp) return null;

        const allTaken = grp.meds.length > 0 && grp.meds.every((m) => m.taken);

        return (
          <div
            key={groupId}
            className="glass-card"
            style={{
              pointerEvents: 'auto',
              borderColor: 'var(--warning)',
              boxShadow: '0 8px 32px 0 rgba(245,158,11,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>{g.icon}</span>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>{g.label} — İlaç Zamanı</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{g.time}</p>
              </div>
            </div>

            {grp.meds.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Bu dilimde ilaç yok.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                {grp.meds.map((m) => {
                  const med = medById(m.medId);
                  if (!med) return null;
                  return (
                    <label
                      key={m.medId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        textDecoration: m.taken ? 'line-through' : 'none',
                        opacity: m.taken ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={m.taken}
                        onChange={() => onToggleMed(groupId, m.medId)}
                        style={{ width: '20px', height: '20px', margin: 0 }}
                      />
                      <div>
                        <h4 style={{ fontSize: '1rem' }}>{med.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{med.dosage}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <button
              className="btn-primary"
              disabled={!allTaken}
              onClick={() => onAckGroup(groupId)}
              style={{
                width: '100%',
                background: allTaken ? 'var(--success)' : 'var(--glass)',
                color: allTaken ? 'white' : 'var(--text-muted)',
                opacity: allTaken ? 1 : 0.7,
              }}
            >
              {allTaken ? '✓ Bildirimi Kapat' : 'Önce ilaçları işaretleyin'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationBanner;
