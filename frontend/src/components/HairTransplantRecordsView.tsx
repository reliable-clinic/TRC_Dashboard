import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, DollarSign, Check, X, ShieldAlert } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface HtRecord {
  RecordID: number;
  PatientID: number;
  SurgeryDate: string;
  GraftsCount: number;
  HairLineDesign: string;
  DonorAreaStatus: string;
  TreatmentStatus: string;
  DoctorName: string;
  TotalCost: number;
  AmountPaid: number;
  Remarks: string;
  PatientName: string;
  Mobile: string;
}

interface HairTransplantRecordsViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function HairTransplantRecordsView({ refreshKey, triggerRefresh }: HairTransplantRecordsViewProps) {
  const [records, setRecords] = useState<HtRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({
    PatientID: '', SurgeryDate: '', GraftsCount: '', HairLineDesign: 'Natural Curved', DonorAreaStatus: 'Healthy / Dense', TreatmentStatus: 'Completed', DoctorName: 'Dr. Ahsan', TotalCost: '', AmountPaid: '', Remarks: ''
  });

  // Edit payment inline state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState<string>('');

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
      const res = await syncManager.execute('http://localhost:5000/api/hairtransplant');
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
      const sDate = form.SurgeryDate || new Date().toISOString().split('T')[0];
      
      // 1. Create HT record
      const res = await syncManager.execute('http://localhost:5000/api/hairtransplant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(form.PatientID),
          SurgeryDate: sDate,
          GraftsCount: parseInt(form.GraftsCount),
          HairLineDesign: form.HairLineDesign,
          DonorAreaStatus: form.DonorAreaStatus,
          TreatmentStatus: form.TreatmentStatus,
          DoctorName: form.DoctorName,
          TotalCost: parseFloat(form.TotalCost),
          AmountPaid: parseFloat(form.AmountPaid) || 0.0,
          Remarks: form.Remarks
        })
      });

      if (res.ok) {
        // 2. Also log a sale record in Sales for the billing invoice
        await syncManager.execute('http://localhost:5000/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PatientID: parseInt(form.PatientID),
            ServiceName: `Hair Transplant Surgery (${form.GraftsCount} Grafts)`,
            Qty: 1,
            UnitPrice: parseFloat(form.TotalCost),
            SaleDate: sDate
          })
        });

        // Optimistically insert to local state instantly
        const pat = patients.find(p => p.PatientID === parseInt(form.PatientID));
        const tempId = Math.floor(Math.random() * 100000);
        const newRecord: HtRecord = {
          RecordID: tempId,
          PatientID: parseInt(form.PatientID),
          SurgeryDate: sDate,
          GraftsCount: parseInt(form.GraftsCount) || 0,
          HairLineDesign: form.HairLineDesign,
          DonorAreaStatus: form.DonorAreaStatus,
          TreatmentStatus: form.TreatmentStatus,
          DoctorName: form.DoctorName,
          TotalCost: parseFloat(form.TotalCost),
          AmountPaid: parseFloat(form.AmountPaid) || 0.0,
          Remarks: form.Remarks,
          PatientName: pat ? pat.PatientName : 'Patient Record',
          Mobile: pat ? pat.Mobile : ''
        };

        setRecords(prev => [newRecord, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({
          PatientID: '', SurgeryDate: '', GraftsCount: '', HairLineDesign: 'Natural Curved', DonorAreaStatus: 'Healthy / Dense', TreatmentStatus: 'Completed', DoctorName: 'Dr. Ahsan', TotalCost: '', AmountPaid: '', Remarks: ''
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleStartPaymentEdit = (rec: HtRecord) => {
    setEditingId(rec.RecordID);
    setEditAmountPaid(String(rec.AmountPaid));
  };

  const handleSavePaymentEdit = async (rec: HtRecord) => {
    try {
      const parsedAmount = parseFloat(editAmountPaid) || 0.0;
      const res = await syncManager.execute(`http://localhost:5000/api/hairtransplant/${rec.RecordID}?amount_paid=${encodeURIComponent(editAmountPaid)}`, {
        method: 'PUT'
      });
      if (res.ok) {
        // Mutate local state instantly
        setRecords(prev => prev.map(r => r.RecordID === rec.RecordID ? { ...r, AmountPaid: parsedAmount } : r));
        setEditingId(null);
        triggerRefresh();
      } else {
        alert("Failed to update payment");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div style={styles.infoBadge}>
          <Sparkles size={16} color="#d4af37" />
          <span>Folicular Unit Extraction (FUE) Surgery Logs</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Log HT Surgery
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Surgery Date</th>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Grafts Count</th>
              <th>Hairline Style</th>
              <th>Donor Status</th>
              <th>Total Cost</th>
              <th>Paid Amount</th>
              <th>Pending Balance</th>
              <th>Doctor</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: '30px' }}>No Hair Transplant records found.</td>
              </tr>
            ) : (
              records.map(rec => {
                const pendingBalance = rec.TotalCost - rec.AmountPaid;
                const isEditing = editingId === rec.RecordID;
                return (
                  <tr key={rec.RecordID}>
                    <td>{formatDate(rec.SurgeryDate)}</td>
                    <td>TRC-{String(rec.PatientID).padStart(5, '0')}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{rec.PatientName}</td>
                    <td style={{ fontWeight: 700, color: '#d4af37' }}>{rec.GraftsCount}</td>
                    <td>{rec.HairLineDesign}</td>
                    <td>{rec.DonorAreaStatus}</td>
                    <td style={{ fontWeight: 600 }}>Rs. {rec.TotalCost.toLocaleString()}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>Rs. </span>
                          <input 
                            style={styles.inlineInput} 
                            type="number" 
                            value={editAmountPaid} 
                            onChange={e => setEditAmountPaid(e.target.value)} 
                          />
                        </div>
                      ) : (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          Rs. {rec.AmountPaid.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td style={{ color: pendingBalance > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      Rs. {pendingBalance.toLocaleString()}
                    </td>
                    <td>{rec.DoctorName}</td>
                    <td>
                      <span className={`badge ${rec.TreatmentStatus === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                        {rec.TreatmentStatus}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button style={styles.actionBtn} onClick={() => handleSavePaymentEdit(rec)} title="Save">
                            <Check size={12} color="#10b981" />
                          </button>
                          <button style={styles.actionBtn} onClick={() => setEditingId(null)} title="Cancel">
                            <X size={12} color="#ef4444" />
                          </button>
                        </div>
                      ) : (
                        <button style={styles.actionBtn} onClick={() => handleStartPaymentEdit(rec)} title="Edit Payments">
                          <DollarSign size={12} color="#f59e0b" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* LOG SURGERY MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Log Hair Transplant Surgery Record
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
                  <label className="form-label">Surgery Date</label>
                  <input className="form-input" type="date" required value={form.SurgeryDate} onChange={e => setForm({...form, SurgeryDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Grafts Count</label>
                  <input className="form-input" type="number" required min={0} value={form.GraftsCount} onChange={e => setForm({...form, GraftsCount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hairline Design Style</label>
                  <select className="form-select" value={form.HairLineDesign} onChange={e => setForm({...form, HairLineDesign: e.target.value})}>
                    <option value="Natural Curved">Natural Curved Hairline</option>
                    <option value="Straight Cut">Straight Cut Hairline</option>
                    <option value="Receding Temple Peak">Temple Peaks Reinforced</option>
                    <option value="Crown Densification">Crown/Vertex Coverage</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Donor Area Status</label>
                  <input className="form-input" type="text" required value={form.DonorAreaStatus} onChange={e => setForm({...form, DonorAreaStatus: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor (Surgeon)</label>
                  <select className="form-select" value={form.DoctorName} onChange={e => setForm({...form, DoctorName: e.target.value})}>
                    <option value="Dr. Ahsan">Dr. Ahsan</option>
                    <option value="Dr. Sara">Dr. Sara</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Treatment Status</label>
                  <select className="form-select" value={form.TreatmentStatus} onChange={e => setForm({...form, TreatmentStatus: e.target.value})}>
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Post-Op Check">Post-Op Checkup</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Surgery Price (Rs.)</label>
                  <input className="form-input" type="number" required min={0} value={form.TotalCost} onChange={e => setForm({...form, TotalCost: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Paid initially (Rs.)</label>
                  <input className="form-input" type="number" required min={0} value={form.AmountPaid} onChange={e => setForm({...form, AmountPaid: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Remarks / Details</label>
                <textarea className="form-textarea" rows={3} placeholder="Details on grafts extraction speed, hair follicle quality, postoperative instructions..." value={form.Remarks} onChange={e => setForm({...form, Remarks: e.target.value})} />
              </div>

              <div style={styles.infoAlert}>
                <ShieldAlert size={14} color="#f59e0b" style={{ marginRight: '6px' }} />
                <span>Logging this surgery automatically creates a billing invoice. You can track remaining pending payments on this table.</span>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Record</button>
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
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '0.75rem',
    color: '#a0a0b0',
    marginTop: '10px',
  },
  actionBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInput: {
    backgroundColor: '#0f0f11',
    border: '1px solid var(--color-gold)',
    color: '#ffffff',
    padding: '4px 6px',
    borderRadius: '4px',
    width: '100px',
    outline: 'none',
    fontSize: '0.8rem',
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
