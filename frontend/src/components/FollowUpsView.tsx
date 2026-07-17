import React, { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface FollowUp {
  FollowUpID: number;
  PatientID: number;
  FollowUpDate: string;
  Remarks: string;
  PatientName: string;
  Mobile: string;
}

interface FollowUpsViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function FollowUpsView({ refreshKey, triggerRefresh }: FollowUpsViewProps) {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'pending'>('pending');
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({ PatientID: '', FollowUpDate: '', Remarks: '' });

  useEffect(() => {
    fetchFollowups();
  }, [filter, refreshKey]);

  useEffect(() => {
    if (showAddModal) {
      fetchPatients();
    }
  }, [showAddModal]);

  const fetchFollowups = async () => {
    try {
      const url = filter === 'pending'
        ? 'http://localhost:5000/api/followups?pending=true'
        : 'http://localhost:5000/api/followups';
      const res = await syncManager.execute(url);
      if (res.ok && res.data) {
        let data: FollowUp[] = res.data;
        if (filter === 'today') {
          const todayStr = new Date().toISOString().split('T')[0];
          data = data.filter(f => f.FollowUpDate.split('T')[0] === todayStr);
        }
        setFollowups(data);
      }
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
      const res = await syncManager.execute('http://localhost:5000/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(form.PatientID),
          FollowUpDate: form.FollowUpDate,
          Remarks: form.Remarks
        })
      });

      if (res.ok) {
        // Optimistically insert to local state instantly
        const pat = patients.find(p => p.PatientID === parseInt(form.PatientID));
        const tempId = Math.floor(Math.random() * 100000);
        const newFollow: FollowUp = {
          FollowUpID: tempId,
          PatientID: parseInt(form.PatientID),
          FollowUpDate: form.FollowUpDate,
          Remarks: form.Remarks,
          PatientName: pat ? pat.PatientName : 'Patient Record',
          Mobile: pat ? pat.Mobile : ''
        };

        setFollowups(prev => [newFollow, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({ PatientID: '', FollowUpDate: '', Remarks: '' });
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusText = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);

    if (target.getTime() === today.getTime()) return { text: 'Today', color: '#f59e0b' };
    if (target.getTime() < today.getTime()) return { text: 'Overdue', color: '#ef4444' };
    return { text: 'Scheduled', color: '#10b981' };
  };

  return (
    <div style={styles.container}>
      
      {/* FILTER BAR AND ADD BUTTON */}
      <div style={styles.topBar}>
        <div style={styles.filterGroup}>
          <button 
            className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`} 
            style={styles.filterBtn} 
            onClick={() => setFilter('pending')}
          >
            Pending Follow Ups
          </button>
          <button 
            className={`btn ${filter === 'today' ? 'btn-primary' : 'btn-secondary'}`} 
            style={styles.filterBtn} 
            onClick={() => setFilter('today')}
          >
            Today's List
          </button>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
            style={styles.filterBtn} 
            onClick={() => setFilter('all')}
          >
            All Logs
          </button>
        </div>

        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Log Follow Up
        </button>
      </div>

      {/* FOLLOW-UPS GRID */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Follow Up ID</th>
              <th>Follow Up Date</th>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Contact Number</th>
              <th>Remarks / Checkup Plan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {followups.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>No follow-up records found.</td>
              </tr>
            ) : (
              followups.map(f => {
                const status = getStatusText(f.FollowUpDate);
                return (
                  <tr key={f.FollowUpID}>
                    <td>FU-{String(f.FollowUpID).padStart(5, '0')}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} color="#d4af37" /> {formatDate(f.FollowUpDate)}
                      </div>
                    </td>
                    <td>TRC-{String(f.PatientID).padStart(5, '0')}</td>
                    <td style={{ fontWeight: 600 }}>{f.PatientName}</td>
                    <td>{f.Mobile || 'N/A'}</td>
                    <td>{f.Remarks}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: `${status.color}15`, color: status.color, border: `1px solid ${status.color}30` }}>
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SCHEDULE FOLLOWUP MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Record Scheduled Follow-up
            </h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Patient</label>
                <select className="form-select" required value={form.PatientID} onChange={e => setForm({...form, PatientID: e.target.value})}>
                  <option value="">Select Patient...</option>
                  {patients.map(p => (
                    <option key={p.PatientID} value={p.PatientID}>
                      TRC-{String(p.PatientID).padStart(5, '0')} - {p.PatientName} ({p.Mobile})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input className="form-input" type="date" required value={form.FollowUpDate} onChange={e => setForm({...form, FollowUpDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Remarks / Instructions</label>
                <textarea className="form-textarea" rows={3} required placeholder="Remarks (e.g. check hair density progress, face glow check, suture removal...)" value={form.Remarks} onChange={e => setForm({...form, Remarks: e.target.value})} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Schedule</button>
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
  filterGroup: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#0c0c0e',
    padding: '4px',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '8px',
  },
  filterBtn: {
    padding: '8px 16px',
    fontSize: '0.8rem',
    borderRadius: '6px',
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
