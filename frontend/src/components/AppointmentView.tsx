import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Trash2, Plus, Calendar, RefreshCw, MessageCircle } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface Appointment {
  AppointmentID: number;
  PatientID: number;
  AppointmentDate: string;
  Doctor: string;
  Status: string;
  PatientName: string;
  TreatmentType: string;
  Mobile: string;
}

interface AppointmentViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function AppointmentView({ refreshKey, triggerRefresh }: AppointmentViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({ PatientID: '', AppointmentDate: '', Doctor: 'Dr. Ahsan', Status: 'Scheduled' });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [filter, refreshKey]);

  useEffect(() => {
    // Silently sync website bookings on view load
    fetch('http://localhost:5000/api/appointments/sync-website', { method: 'POST' })
      .then(res => {
        if (res.ok) {
          fetchAppointments();
          triggerRefresh();
        }
      })
      .catch(e => console.warn("Background sync failed:", e));
  }, []);

  useEffect(() => {
    if (showAddModal) {
      fetchPatients();
    }
  }, [showAddModal]);

  const fetchAppointments = async () => {
    try {
      let url = 'http://localhost:5000/api/appointments';
      if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url += `?date=${today}`;
      }
      
      const res = await syncManager.execute(url);
      if (res.ok && res.data) {
        let data: Appointment[] = res.data;
        if (filter === 'upcoming') {
          const now = new Date();
          data = data.filter(a => new Date(a.AppointmentDate) >= now && a.Status === 'Scheduled');
        }
        setAppointments(data);
      }
    } catch (e) {
      console.error(e);
    }
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
      const payload = {
        PatientID: parseInt(form.PatientID),
        AppointmentDate: form.AppointmentDate,
        Doctor: form.Doctor,
        Status: form.Status
      };

      const res = await syncManager.execute('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Optimistically add to appointments list instantly
        const selectedPatient = patients.find(p => p.PatientID === parseInt(form.PatientID));
        const tempId = Math.floor(Math.random() * 100000);
        const newApp: Appointment = {
          AppointmentID: tempId,
          PatientID: parseInt(form.PatientID),
          AppointmentDate: form.AppointmentDate,
          Doctor: form.Doctor,
          Status: form.Status,
          PatientName: selectedPatient ? selectedPatient.PatientName : 'Patient Record',
          TreatmentType: selectedPatient ? selectedPatient.TreatmentType : 'Therapy',
          Mobile: selectedPatient ? selectedPatient.Mobile : ''
        };

        setAppointments(prev => [newApp, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({ PatientID: '', AppointmentDate: '', Doctor: 'Dr. Ahsan', Status: 'Scheduled' });
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateStatus = async (appId: number, status: string) => {
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/appointments/${appId}?status=${encodeURIComponent(status)}`, {
        method: 'PUT'
      });
      if (res.ok) {
        // Mutate local state instantly
        setAppointments(prev => prev.map(a => a.AppointmentID === appId ? { ...a, Status: status } : a));
        triggerRefresh();
      }
    } catch (e) { console.error(e); }
  };

  const handleSyncWebsiteBookings = async () => {
    setSyncing(true);
    try {
      const res = await fetch('http://localhost:5000/api/appointments/sync-website', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Website bookings synced successfully!");
        fetchAppointments();
        triggerRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to sync website bookings.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error: Could not connect to local server to sync website bookings.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSendWhatsApp = (app: Appointment) => {
    const phone = app.Mobile;
    if (!phone) {
      alert("No phone number found for this patient.");
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }

    const dateObj = new Date(app.AppointmentDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const message = `Dear ${app.PatientName},\n\nThis is a reminder for your upcoming appointment at The Reliable Aesthetic Clinic:\n📅 Date: ${formattedDate}\n⏰ Time: ${formattedTime}\n👨‍⚕️ Doctor: ${app.Doctor}\n\nPlease confirm your availability.\n\nThank you!\nTRC Clinic`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleDelete = async (appId: number) => {
    if (!confirm("Delete this appointment schedule?")) return;
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/appointments/${appId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Mutate local state instantly
        setAppointments(prev => prev.filter(a => a.AppointmentID !== appId));
        triggerRefresh();
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      
      {/* FILTER BAR AND SCHEDULE BUTTON */}
      <div style={styles.topBar}>
        <div style={styles.filterGroup}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
            style={styles.filterBtn} 
            onClick={() => setFilter('all')}
          >
            All Appointments
          </button>
          <button 
            className={`btn ${filter === 'today' ? 'btn-primary' : 'btn-secondary'}`} 
            style={styles.filterBtn} 
            onClick={() => setFilter('today')}
          >
            Today's List
          </button>
          <button 
            className={`btn ${filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`} 
            style={styles.filterBtn} 
            onClick={() => setFilter('upcoming')}
          >
            Upcoming Scheduled
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleSyncWebsiteBookings} 
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} /> 
            {syncing ? 'Syncing...' : 'Sync Web Bookings'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Schedule Appointment
          </button>
        </div>
      </div>

      {/* APPOINTMENTS GRID */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Patient Name</th>
              <th>Contact</th>
              <th>Doctor</th>
              <th>Treatment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>No appointments scheduled in this filter.</td>
              </tr>
            ) : (
              appointments.map(app => (
                <tr key={app.AppointmentID}>
                  <td>{formatDate(app.AppointmentDate)}</td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} color="#d4af37" /> {formatTime(app.AppointmentDate)}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{app.PatientName}</td>
                  <td>{app.Mobile || 'N/A'}</td>
                  <td>{app.Doctor}</td>
                  <td>
                    <span style={{ color: '#d4af37', fontSize: '0.8rem', fontWeight: 600 }}>
                      {app.TreatmentType}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      app.Status === 'Completed' ? 'badge-success' : app.Status === 'Cancelled' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {app.Status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {app.Status === 'Scheduled' && (
                        <>
                          <button style={styles.actionBtn} onClick={() => handleUpdateStatus(app.AppointmentID, 'Completed')} title="Mark Completed">
                            <Check size={14} color="#10b981" />
                          </button>
                          <button style={styles.actionBtn} onClick={() => handleUpdateStatus(app.AppointmentID, 'Cancelled')} title="Cancel Appointment">
                            <X size={14} color="#ef4444" />
                          </button>
                        </>
                      )}
                      {app.Mobile && (
                        <button style={styles.actionBtn} onClick={() => handleSendWhatsApp(app)} title="Send WhatsApp Reminder">
                          <MessageCircle size={14} color="#25D366" />
                        </button>
                      )}
                      <button style={styles.actionBtn} onClick={() => handleDelete(app.AppointmentID)} title="Delete Record">
                        <Trash2 size={14} color="#606070" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SCHEDULE APPOINTMENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Schedule Appointment
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

              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Date & Time</label>
                  <input className="form-input" type="datetime-local" required value={form.AppointmentDate} onChange={e => setForm({...form, AppointmentDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor</label>
                  <select className="form-select" value={form.Doctor} onChange={e => setForm({...form, Doctor: e.target.value})}>
                    <option value="Dr. Ahsan">Dr. Ahsan</option>
                    <option value="Dr. Sara">Dr. Sara</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.Status} onChange={e => setForm({...form, Status: e.target.value})}>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
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
