import React from 'react';

function formatDate(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const DailySchedule = ({ schedule, meds, groups, onToggleMed, onAllTaken }) => {
  const medById = (id) => meds.find((m) => m.id === id);
  const groupList = groups.filter((g) => schedule.groups[g.id]);

  return (
    <section>
      <div style={{ marginBottom: '20px' }}>
        <h2>Bugünün Planı</h2>
        <p style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
          {formatDate(schedule.date)}
        </p>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {groupList.map((g) => {
          const grp = schedule.groups[g.id];
          const allTaken = grp.meds.length > 0 && grp.meds.every((m) => m.taken);

          return (
            <div key={g.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.6rem' }}>{g.icon}</span>
                  <div>
                    <h3 style={{ fontSize: '1.15rem' }}>{g.label}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{g.time}</p>
                  </div>
                </div>
                {grp.meds.length > 0 && (
                  <button
                    onClick={() => onAllTaken(g.id)}
                    disabled={allTaken}
                    style={{
                      background: allTaken ? 'var(--glass)' : 'var(--primary)',
                      color: allTaken ? 'var(--text-muted)' : 'white',
                      padding: '6px 12px', borderRadius: '50px', fontSize: '0.8rem',
                      opacity: allTaken ? 0.6 : 1,
                    }}
                  >
                    {allTaken ? '✓ Tamam' : 'Tümü Alındı'}
                  </button>
                )}
              </div>

              {grp.meds.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                  Bu dilimde ilaç yok.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {grp.meds.map((m) => {
                    const med = medById(m.medId);
                    if (!med) return null;
                    return (
                      <label
                        key={m.medId}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '12px', borderRadius: '16px',
                          background: 'rgba(255,255,255,0.04)',
                          textDecoration: m.taken ? 'line-through' : 'none',
                          opacity: m.taken ? 0.5 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={m.taken}
                          onChange={() => onToggleMed(g.id, m.medId)}
                          style={{ width: '22px', height: '22px', margin: 0 }}
                        />
                        <div>
                          <h4 style={{ fontSize: '1.05rem' }}>{med.name}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{med.dosage}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DailySchedule;
