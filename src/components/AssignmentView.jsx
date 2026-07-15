import React from 'react';

const AssignmentView = ({ meds, groups, onToggle }) => {
  const th = {
    padding: '12px 10px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)',
    borderBottom: '1px solid var(--glass-border)',
  };
  const td = {
    padding: '12px 10px', textAlign: 'center', borderBottom: '1px solid var(--glass-border)',
  };

  return (
    <section>
      <div style={{ marginBottom: '20px' }}>
        <h2>Uygulama Planı</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          İlaçları zaman dilimlerine atayın. Aynı ilaç birden fazla dilimde yer alabilir.
        </p>
      </div>

      {meds.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', opacity: 0.7 }}>
          Önce "İlaçlar" sekmesinden ilaç ekleyin.
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '320px' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>İlaç</th>
                {groups.map((g) => (
                  <th key={g.id} style={th}>
                    <div style={{ fontSize: '1.1rem' }}>{g.icon}</div>
                    <div style={{ color: 'var(--text)', fontWeight: 600 }}>{g.label}</div>
                    <div style={{ fontSize: '0.75rem' }}>{g.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meds.map((med) => (
                <tr key={med.id}>
                  <td style={{ ...td, textAlign: 'left' }}>
                    <h4 style={{ fontSize: '1rem' }}>{med.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{med.dosage}</p>
                  </td>
                  {groups.map((g) => (
                    <td key={g.id} style={td}>
                      <input
                        type="checkbox"
                        checked={med.groupIds?.includes(g.id) || false}
                        onChange={() => onToggle(med.id, g.id)}
                        style={{ width: '20px', height: '20px', margin: 0 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AssignmentView;
