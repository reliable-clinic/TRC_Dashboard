import React, { useState, useEffect } from 'react';
import { Plus, Syringe, Info } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface PrpRecord {
  RecordID: number;
  PatientID: number;
  SessionDate: string;
  SessionNumber: number;
  TotalSessions: number;
  KitTypeUsed: string;
  AreaTreated: string;
  DoctorName: string;
  CostPerSession: number;
  Remarks: string;
  PatientName: string;
  Mobile: string;
}

interface PrpRecordsViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function PrpRecordsView({ refreshKey, triggerRefresh }: PrpRecordsViewProps) {
  const [records, setRecords] = useState<PrpRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({
    PatientID: '', SessionDate: '', SessionNumber: '1', TotalSessions: '3', KitTypeUsed: 'Regen Lab', AreaTreated: 'Scalp', DoctorName: 'Dr. Sara', CostPerSession: '15000', Remarks: ''
  });

  useEffect(() => {
    fetchRecords();
  }, [refreshKey]);

  useEffect(() => {
    if (showAddModal) {
      fetchPatients();
    }
  }, [showAddModal]);

  const fetchRecords = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/prp');
      if (res.ok && res.data) setRecords(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchPatients = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/patients');
      if (res.ok && res.data) setPatients(res.data);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pDate = form.SessionDate || new Date().toISOString().split('T')[0];
      
      // 1. Save the PRP record
      const res = await syncManager.execute('http://localhost:5000/api/prp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(form.PatientID),
          SessionDate: pDate,
          SessionNumber: parseInt(form.SessionNumber),
          TotalSessions: parseInt(form.TotalSessions),
          KitTypeUsed: form.KitTypeUsed,
          AreaTreated: form.AreaTreated,
          DoctorName: form.DoctorName,
          CostPerSession: parseFloat(form.CostPerSession),
          Remarks: form.Remarks
        })
      });

      if (res.ok) {
        // 2. Also log a sales/billing entry for this transaction automatically
        await syncManager.execute('http://localhost:5000/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PatientID: parseInt(form.PatientID),
            ServiceName: `PRP Therapy - Session ${form.SessionNumber}/${form.TotalSessions}`,
            Qty: 1,
            UnitPrice: parseFloat(form.CostPerSession),
            SaleDate: pDate
          })
        });

        // Optimistically insert to local state instantly
        const pat = patients.find(p => p.PatientID === parseInt(form.PatientID));
        const tempId = Math.floor(Math.random() * 100000);
        const newRecord: PrpRecord = {
          RecordID: tempId,
          PatientID: parseInt(form.PatientID),
          SessionDate: pDate,
          SessionNumber: parseInt(form.SessionNumber),
          TotalSessions: parseInt(form.TotalSessions),
          KitTypeUsed: form.KitTypeUsed,
          AreaTreated: form.AreaTreated,
          DoctorName: form.DoctorName,
          CostPerSession: parseFloat(form.CostPerSession),
          Remarks: form.Remarks,
          PatientName: pat ? pat.PatientName : 'Patient Record',
          Mobile: pat ? pat.Mobile : ''
        };

        setRecords(prev => [newRecord, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({
          PatientID: '', SessionDate: '', SessionNumber: '1', TotalSessions: '3', KitTypeUsed: 'Regen Lab', AreaTreated: 'Scalp', DoctorName: 'Dr. Sara', CostPerSession: '15000', Remarks: ''
        });
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.infoBadge}>
          <Syringe size={16} color="#d4af37" />
          <span>Platelet-Rich Plasma Treatment Logs</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Log PRP Session
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Session</th>
              <th>Centrifuge Kit Used</th>
              <th>Area Treated</th>
              <th>Doctor</th>
              <th>Cost / Session</th>
              <th>Clinical Remarks</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>No PRP session logs found.</td>
              </tr>
            ) : (
              records.map(rec => (
                <tr key={rec.RecordID}>
                  <td>{formatDate(rec.SessionDate)}</td>
                  <td>TRC-{String(rec.PatientID).padStart(5, '0')}</td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{rec.PatientName}</td>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ color: '#d4af37' }}>{rec.SessionNumber}</span> / {rec.TotalSessions}
                  </td>
                  <td>{rec.KitTypeUsed}</td>
                  <td>{rec.AreaTreated}</td>
                  <td>{rec.DoctorName}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Rs. {rec.CostPerSession.toLocaleString()}</td>
                  <td style={{ fontSize: '0.8rem', fontStyle: 'italic', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.Remarks}>
                    {rec.Remarks || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* LOG PRP SESSION MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Log PRP Session Record
            </h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Patient</label>
                <select className="form-select" required value={form.PatientID} onChange={e => setForm({...form, PatientID: e.target.value})}>
                  <option value="">Select Patient...</option>
                  {patients.map(p => (
                    <option key={p.PatientID} value={p.PatientID}>
                      TRC-{String(p.PatientID).padStart(5, '0')} - {p.PatientName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Session Date</label>
                  <input className="form-input" type="date" required value={form.SessionDate} onChange={e => setForm({...form, SessionDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Session Number</label>
                  <input className="form-input" type="number" required min={1} value={form.SessionNumber} onChange={e => setForm({...form, SessionNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Scheduled Sessions</label>
                  <input className="form-input" type="number" required min={1} value={form.TotalSessions} onChange={e => setForm({...form, TotalSessions: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Kit Used</label>
                  <select className="form-select" value={form.KitTypeUsed} onChange={e => setForm({...form, KitTypeUsed: e.target.value})}>
                    <option value="Regen Lab">Regen Lab Kit</option>
                    <option value="MyCells">MyCells Kit</option>
                    <option value="Standard PRP">Standard Centrifuge Kit</option>
                    <option value="Glow PRP">Glow Enhancement Kit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Area Treated</label>
                  <select className="form-select" value={form.AreaTreated} onChange={e => setForm({...form, AreaTreated: e.target.value})}>
                    <option value="Scalp">Scalp (Hair Growth)</option>
                    <option value="Face">Face (Vampire Facial)</option>
                    <option value="Under-Eye">Under-Eye area</option>
                    <option value="Neck">Neck / Decolletage</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor</label>
                  <select className="form-select" value={form.DoctorName} onChange={e => setForm({...form, DoctorName: e.target.value})}>
                    <option value="Dr. Sara">Dr. Sara</option>
                    <option value="Dr. Ahsan">Dr. Ahsan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Session Price (Rs.)</label>
                  <input className="form-input" type="number" required min={0} value={form.CostPerSession} onChange={e => setForm({...form, CostPerSession: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Remarks & Settings</label>
                <textarea className="form-textarea" rows={3} placeholder="Centrifuge speed, notes on swelling, redness, anesthetics used..." value={form.Remarks} onChange={e => setForm({...form, Remarks: e.target.value})} />
              </div>

              <div style={{ ...styles.infoAlert, marginTop: '10px' }}>
                <Info size={14} color="#d4af37" style={{ marginRight: '6px' }} />
                <span>Saving this PRP session will automatically create a billing invoice for the patient.</span>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
  },
  infoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  infoAlert: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.75rem',
    color: '#a0a0b0',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    borderTop: '1px solid rgba(212, 175, 55, 0.1)',
    paddingTop: '16px',
  },
};
