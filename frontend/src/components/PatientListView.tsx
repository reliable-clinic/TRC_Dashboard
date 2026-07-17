import React, { useState, useEffect } from 'react';
import { 
  Search, Eye, Edit2, Trash2, Calendar, DollarSign, Syringe, Sparkles, Plus, Clock, X
} from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface Patient {
  PatientID: number;
  RegDate: string;
  PatientName: string;
  FatherName: string;
  Gender: string;
  Age: number;
  Mobile: string;
  Address: string;
  TreatmentType: string;
  Notes: string;
  FollowUpDate: string;
}

interface PatientListViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function PatientListView({ refreshKey, triggerRefresh }: PatientListViewProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [patientForm, setPatientForm] = useState({
    PatientName: '', FatherName: '', Gender: 'Male', Age: '', Mobile: '', Address: '', TreatmentType: 'Consultation', Notes: '', FollowUpDate: ''
  });

  useEffect(() => {
    fetchPatients();
  }, [searchTerm, refreshKey]);

  const fetchPatients = async () => {
    try {
      const url = searchTerm 
        ? `http://localhost:5000/api/patients?search=${encodeURIComponent(searchTerm)}`
        : 'http://localhost:5000/api/patients';
      
      const res = await syncManager.execute(url);
      if (res.ok && res.data) {
        setPatients(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientDetails = async (patientId: number) => {
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/patients/${patientId}`);
      if (res.ok && res.data) {
        setSelectedPatient(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...patientForm,
        Age: parseInt(patientForm.Age) || 0
      };
      
      const res = await syncManager.execute('http://localhost:5000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Optimistically add to local state instantly
        const tempId = res.data?.PatientID || (10000 + Math.floor(Math.random() * 90000));
        const newPatient: Patient = {
          PatientID: tempId,
          RegDate: new Date().toISOString(),
          PatientName: patientForm.PatientName,
          FatherName: patientForm.FatherName,
          Gender: patientForm.Gender,
          Age: parseInt(patientForm.Age) || 0,
          Mobile: patientForm.Mobile,
          Address: patientForm.Address,
          TreatmentType: patientForm.TreatmentType,
          Notes: patientForm.Notes,
          FollowUpDate: patientForm.FollowUpDate || new Date(Date.now() + 14 * 86400000).toISOString()
        };

        setPatients(prev => [newPatient, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        
        // Reset form
        setPatientForm({
          PatientName: '', FatherName: '', Gender: 'Male', Age: '', Mobile: '', Address: '', TreatmentType: 'Consultation', Notes: '', FollowUpDate: ''
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/patients/${editPatient.PatientID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPatient)
      });
      if (res.ok) {
        // Update state array instantly
        setPatients(prev => prev.map(p => p.PatientID === editPatient.PatientID ? editPatient : p));
        setEditPatient(null);
        if (selectedPatient && selectedPatient.patient.PatientID === editPatient.PatientID) {
          fetchPatientDetails(editPatient.PatientID);
        }
        triggerRefresh();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (patientId: number) => {
    if (!confirm("Are you sure you want to delete this patient record? This will delete all associated appointments, bills, follow-ups, and treatments.")) return;
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/patients/${patientId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Remove from local state instantly
        setPatients(prev => prev.filter(p => p.PatientID !== patientId));
        setSelectedPatient(null);
        triggerRefresh();
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={styles.container}>
      {/* SEARCH AND ADD BAR */}
      <div style={styles.topBar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#a0a0b0" style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search patients by name or mobile number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add New Patient
        </button>
      </div>

      <div style={styles.layout}>
        {/* PATIENTS TABLE LIST */}
        <div className="card" style={{ flexGrow: 1, minWidth: '400px', padding: '0px', overflow: 'hidden' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Primary Treatment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No patients found.</td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.PatientID} style={{ cursor: 'pointer' }} onClick={() => fetchPatientDetails(p.PatientID)}>
                    <td>TRC-{String(p.PatientID).padStart(5, '0')}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{p.PatientName}</td>
                    <td>{p.Mobile}</td>
                    <td>{p.Gender}</td>
                    <td>{p.Age}</td>
                    <td>{p.TreatmentType}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={styles.actionBtn} onClick={() => fetchPatientDetails(p.PatientID)} title="View Details">
                          <Eye size={14} color="#d4af37" />
                        </button>
                        <button style={styles.actionBtn} onClick={() => setEditPatient(p)} title="Edit Patient">
                          <Edit2 size={14} color="#3b82f6" />
                        </button>
                        <button style={styles.actionBtn} onClick={() => handleDelete(p.PatientID)} title="Delete Patient">
                          <Trash2 size={14} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PATIENT DETAILS PANEL */}
        {selectedPatient && (
          <div className="card animate-fade-in" style={styles.detailsCard}>
            <div style={styles.detailsHeader}>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: '#d4af37' }}>{selectedPatient.patient.PatientName}</h3>
                <span style={{ fontSize: '0.75rem', color: '#a0a0b0' }}>
                  ID: TRC-{String(selectedPatient.patient.PatientID).padStart(5, '0')} | Registered: {formatDate(selectedPatient.patient.RegDate)}
                </span>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedPatient(null)}><X size={18} /></button>
            </div>

            <div style={styles.detailsGrid}>
              <div>
                <span style={styles.label}>Father's Name</span>
                <span style={styles.value}>{selectedPatient.patient.FatherName}</span>
              </div>
              <div>
                <span style={styles.label}>Gender / Age</span>
                <span style={styles.value}>{selectedPatient.patient.Gender} / {selectedPatient.patient.Age} yrs</span>
              </div>
              <div>
                <span style={styles.label}>Mobile Number</span>
                <span style={styles.value}>{selectedPatient.patient.Mobile}</span>
              </div>
              <div>
                <span style={styles.label}>Primary Treatment</span>
                <span style={styles.value}>{selectedPatient.patient.TreatmentType}</span>
              </div>
            </div>

            <div style={{ margin: '14px 0' }}>
              <span style={styles.label}>Address</span>
              <span style={styles.valueText}>{selectedPatient.patient.Address || 'No address details provided.'}</span>
            </div>

            <div style={{ margin: '14px 0' }}>
              <span style={styles.label}>Clinical Notes</span>
              <span style={styles.valueText}>{selectedPatient.patient.Notes || 'No notes written yet.'}</span>
            </div>

            {/* Sub-sections tabs */}
            <div style={styles.tabsSection}>
              
              {/* Appointments list */}
              <div style={styles.subSection}>
                <h4 style={styles.subSectionTitle}><Calendar size={14} /> Appointments ({selectedPatient.appointments.length})</h4>
                {selectedPatient.appointments.length === 0 ? <p style={styles.emptyText}>No appointments.</p> : (
                  <ul style={styles.detailsList}>
                    {selectedPatient.appointments.map((a: any) => (
                      <li key={a.AppointmentID} style={styles.detailsListItem}>
                        <span>{formatDate(a.AppointmentDate)} ({new Date(a.AppointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 600, 
                          color: a.Status === 'Completed' ? '#10b981' : a.Status === 'Cancelled' ? '#ef4444' : '#f59e0b'
                        }}>{a.Status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Billing list */}
              <div style={styles.subSection}>
                <h4 style={styles.subSectionTitle}><DollarSign size={14} /> Billing Records ({selectedPatient.sales.length})</h4>
                {selectedPatient.sales.length === 0 ? <p style={styles.emptyText}>No billing records.</p> : (
                  <ul style={styles.detailsList}>
                    {selectedPatient.sales.map((s: any) => (
                      <li key={s.SaleID} style={styles.detailsListItem}>
                        <span>{s.ServiceName} (x{s.Qty})</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Rs. {s.TotalAmount.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* PRP list */}
              {selectedPatient.prp_records && selectedPatient.prp_records.length > 0 && (
                <div style={styles.subSection}>
                  <h4 style={styles.subSectionTitle}><Syringe size={14} /> PRP Therapy ({selectedPatient.prp_records.length})</h4>
                  <ul style={styles.detailsList}>
                    {selectedPatient.prp_records.map((p: any) => (
                      <li key={p.RecordID} style={styles.detailsListItem}>
                        <span>Session #{p.SessionNumber} ({p.AreaTreated})</span>
                        <span>{formatDate(p.SessionDate)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hair Transplant list */}
              {selectedPatient.hair_transplants && selectedPatient.hair_transplants.length > 0 && (
                <div style={styles.subSection}>
                  <h4 style={styles.subSectionTitle}><Sparkles size={14} /> Hair Transplant ({selectedPatient.hair_transplants.length})</h4>
                  <ul style={styles.detailsList}>
                    {selectedPatient.hair_transplants.map((h: any) => (
                      <li key={h.RecordID} style={styles.detailsListItem}>
                        <span>{h.GraftsCount} Grafts ({h.TreatmentStatus})</span>
                        <span>{formatDate(h.SurgeryDate)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Followups list */}
              <div style={styles.subSection}>
                <h4 style={styles.subSectionTitle}><Clock size={14} /> Scheduled Followups</h4>
                {selectedPatient.followups.length === 0 ? <p style={styles.emptyText}>No followups.</p> : (
                  <ul style={styles.detailsList}>
                    {selectedPatient.followups.map((f: any) => (
                      <li key={f.FollowUpID} style={styles.detailsListItem}>
                        <span>{formatDate(f.FollowUpDate)}</span>
                        <span style={{ fontSize: '0.75rem', color: '#a0a0b0' }}>{f.Remarks}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ADD PATIENT MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Register New Patient
            </h3>
            <form onSubmit={handleAddSubmit}>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Patient Name</label>
                  <input className="form-input" type="text" required value={patientForm.PatientName} onChange={e => setPatientForm({...patientForm, PatientName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Father's Name</label>
                  <input className="form-input" type="text" required value={patientForm.FatherName} onChange={e => setPatientForm({...patientForm, FatherName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={patientForm.Gender} onChange={e => setPatientForm({...patientForm, Gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-input" type="number" required value={patientForm.Age} onChange={e => setPatientForm({...patientForm, Age: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-input" type="text" required value={patientForm.Mobile} onChange={e => setPatientForm({...patientForm, Mobile: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Treatment</label>
                  <select className="form-select" value={patientForm.TreatmentType} onChange={e => setPatientForm({...patientForm, TreatmentType: e.target.value})}>
                    <option value="Consultation">Consultation</option>
                    <option value="Hair Transplant">Hair Transplant</option>
                    <option value="PRP Therapy">PRP Therapy</option>
                    <option value="Skin Treatment">Skin Treatment</option>
                    <option value="Laser Treatment">Laser Treatment</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-textarea" rows={2} value={patientForm.Address} onChange={e => setPatientForm({...patientForm, Address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Notes</label>
                <textarea className="form-textarea" rows={2} value={patientForm.Notes} onChange={e => setPatientForm({...patientForm, Notes: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date (Optional)</label>
                <input className="form-input" type="date" value={patientForm.FollowUpDate} onChange={e => setPatientForm({...patientForm, FollowUpDate: e.target.value})} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {editPatient && (
        <div className="modal-overlay" onClick={() => setEditPatient(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Edit Patient Details
            </h3>
            <form onSubmit={handleEditSubmit}>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Patient Name</label>
                  <input className="form-input" type="text" required value={editPatient.PatientName} onChange={e => setEditPatient({...editPatient, PatientName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Father's Name</label>
                  <input className="form-input" type="text" required value={editPatient.FatherName} onChange={e => setEditPatient({...editPatient, FatherName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={editPatient.Gender} onChange={e => setEditPatient({...editPatient, Gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-input" type="number" required value={editPatient.Age} onChange={e => setEditPatient({...editPatient, Age: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-input" type="text" required value={editPatient.Mobile} onChange={e => setEditPatient({...editPatient, Mobile: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Treatment</label>
                  <select className="form-select" value={editPatient.TreatmentType} onChange={e => setEditPatient({...editPatient, TreatmentType: e.target.value})}>
                    <option value="Consultation">Consultation</option>
                    <option value="Hair Transplant">Hair Transplant</option>
                    <option value="PRP Therapy">PRP Therapy</option>
                    <option value="Skin Treatment">Skin Treatment</option>
                    <option value="Laser Treatment">Laser Treatment</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-textarea" rows={2} value={editPatient.Address} onChange={e => setEditPatient({...editPatient, Address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Notes</label>
                <textarea className="form-textarea" rows={2} value={editPatient.Notes} onChange={e => setEditPatient({...editPatient, Notes: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input className="form-input" type="date" value={editPatient.FollowUpDate ? editPatient.FollowUpDate.split('T')[0] : ''} onChange={e => setEditPatient({...editPatient, FollowUpDate: e.target.value})} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditPatient(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
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
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0c0c0e',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '6px',
    padding: '0 16px',
    flexGrow: 1,
    maxWidth: '500px',
    height: '42px',
  },
  searchIcon: {
    marginRight: '10px',
  },
  searchInput: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
  },
  layout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
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
  detailsCard: {
    width: '380px',
    flexShrink: 0,
    maxHeight: 'calc(100vh - 130px)',
    overflowY: 'auto',
    position: 'sticky',
    top: '90px',
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#a0a0b0',
    cursor: 'pointer',
    padding: '4px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '14px',
    marginBottom: '14px',
  },
  label: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    color: '#606070',
    display: 'block',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginBottom: '3px',
  },
  value: {
    fontSize: '0.85rem',
    color: '#ffffff',
    fontWeight: 600,
  },
  valueText: {
    fontSize: '0.85rem',
    color: '#a0a0b0',
    lineHeight: 1.4,
  },
  tabsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderTop: '1px solid rgba(212, 175, 55, 0.15)',
    paddingTop: '16px',
  },
  subSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.03)',
    borderRadius: '6px',
    padding: '10px 12px',
  },
  subSectionTitle: {
    fontSize: '0.8rem',
    color: '#d4af37',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
    fontWeight: 600,
  },
  emptyText: {
    fontSize: '0.75rem',
    color: '#606070',
    fontStyle: 'italic',
  },
  detailsList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  detailsListItem: {
    fontSize: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    color: '#a0a0b0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
    paddingBottom: '4px',
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
