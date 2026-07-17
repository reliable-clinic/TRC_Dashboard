import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Printer, Phone, MapPin, X } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface Sale {
  SaleID: number;
  SaleDate: string;
  PatientID: number;
  ServiceName: string;
  Qty: number;
  UnitPrice: number;
  TotalAmount: number;
  PatientName: string;
  Mobile: string;
}

interface BillingViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function BillingView({ refreshKey, triggerRefresh }: BillingViewProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({ PatientID: '', ServiceName: 'PRP Therapy', Qty: '1', UnitPrice: '' });

  useEffect(() => {
    fetchSales();
  }, [refreshKey]);

  useEffect(() => {
    if (showAddModal) {
      fetchPatients();
    }
  }, [showAddModal]);

  const fetchSales = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/sales');
      if (res.ok && res.data) setSales(res.data);
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
      const sDate = new Date().toISOString();
      const unitPrice = parseFloat(form.UnitPrice);
      const qty = parseInt(form.Qty);
      
      const res = await syncManager.execute('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(form.PatientID),
          ServiceName: form.ServiceName,
          Qty: qty,
          UnitPrice: unitPrice,
          SaleDate: sDate
        })
      });

      if (res.ok) {
        // Optimistically add to local sales state array
        const pat = patients.find(p => p.PatientID === parseInt(form.PatientID));
        const tempId = Math.floor(Math.random() * 100000);
        const newSale: Sale = {
          SaleID: tempId,
          SaleDate: sDate,
          PatientID: parseInt(form.PatientID),
          ServiceName: form.ServiceName,
          Qty: qty,
          UnitPrice: unitPrice,
          TotalAmount: qty * unitPrice,
          PatientName: pat ? pat.PatientName : 'Patient Record',
          Mobile: pat ? pat.Mobile : ''
        };

        setSales(prev => [newSale, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({ PatientID: '', ServiceName: 'PRP Therapy', Qty: '1', UnitPrice: '' });
      }
    } catch (e) { console.error(e); }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredSales = sales.filter(s => 
    s.PatientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(s.PatientID).includes(searchTerm)
  );

  return (
    <div style={styles.container}>
      
      {/* SEARCH AND GENERATE BILL BAR */}
      <div style={styles.topBar}>
        <div style={styles.searchBox}>
          <Search size={18} color="#a0a0b0" style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            type="text"
            placeholder="Search invoice by Patient ID or Name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Create Billing Entry
        </button>
      </div>

      {/* SALES / INVOICES LIST */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Date</th>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Service / Treatment</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>No billing transactions found.</td>
              </tr>
            ) : (
              filteredSales.map(s => (
                <tr key={s.SaleID}>
                  <td>INV-{String(s.SaleID).padStart(6, '0')}</td>
                  <td>{formatDate(s.SaleDate)}</td>
                  <td>TRC-{String(s.PatientID).padStart(5, '0')}</td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{s.PatientName}</td>
                  <td>{s.ServiceName}</td>
                  <td>{s.Qty}</td>
                  <td>Rs. {s.UnitPrice.toLocaleString()}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>Rs. {s.TotalAmount.toLocaleString()}</td>
                  <td>
                    <button style={styles.actionBtn} onClick={() => setSelectedInvoice(s)} title="View & Print Receipt">
                      <Eye size={14} color="#d4af37" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE BILLING ENTRY MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Create Billing Transaction
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
                  <label className="form-label">Service / Treatment Name</label>
                  <select className="form-select" value={form.ServiceName} onChange={e => setForm({...form, ServiceName: e.target.value})}>
                    <option value="PRP Therapy">PRP Therapy Session</option>
                    <option value="Hair Transplant">Hair Transplant Surgery</option>
                    <option value="Skin Treatment">Skin Laser / Carbon Peel</option>
                    <option value="Laser Treatment">Whitening Laser Treatment</option>
                    <option value="Consultation">Consultation Fee</option>
                    <option value="Medicine / Aftercare Product">Aftercare Products / Medicines</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" required min={1} value={form.Qty} onChange={e => setForm({...form, Qty: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (Rs.)</label>
                  <input className="form-input" type="number" required min={0} value={form.UnitPrice} onChange={e => setForm({...form, UnitPrice: e.target.value})} />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT / INVOICE PREVIEW MODAL */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content" style={styles.receiptModal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedInvoice(null)}><X size={18} /></button>
            
            {/* PRINTABLE AREA CONTAINER */}
            <div className="printable-area" style={styles.printableReceipt}>
              
              {/* Receipt Header */}
              <div style={styles.receiptHeader}>
                <div style={styles.logoAndTitle}>
                  <div style={styles.logoCircle}>TRC</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={styles.clinicTitle}>THE RELIABLE</h2>
                    <span style={styles.clinicSub}>Aesthetic Clinic (TRC)</span>
                  </div>
                </div>
                <div style={styles.contactInfo}>
                  <div style={styles.contactRow}><Phone size={12} color="#666" /> <span>0346-3486925</span></div>
                  <div style={styles.contactRow}><Phone size={12} color="#666" /> <span>0342-3220825</span></div>
                </div>
              </div>

              <div style={styles.addressBar}>
                <MapPin size={12} color="#666" style={{ marginRight: '6px' }} />
                <span>Office No. 103, 1st Floor, 27th & 34th Street Corner, Touheed Commercial, DHA Phase V, Karachi</span>
              </div>

              <div style={styles.divider} />

              {/* Patient and Receipt Info */}
              <div style={styles.receiptInfoGrid}>
                <div>
                  <span style={styles.receiptLabel}>Invoice To:</span>
                  <span style={styles.receiptVal}>{selectedInvoice.PatientName}</span>
                  <span style={styles.receiptSubtext}>Patient ID: TRC-{String(selectedInvoice.PatientID).padStart(5, '0')}</span>
                  <span style={styles.receiptSubtext}>Mobile: {selectedInvoice.Mobile}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={styles.receiptLabel}>Invoice Details:</span>
                  <span style={styles.receiptVal}>Invoice #: INV-{String(selectedInvoice.SaleID).padStart(6, '0')}</span>
                  <span style={styles.receiptSubtext}>Date: {formatDate(selectedInvoice.SaleDate)}</span>
                </div>
              </div>

              {/* Items Table */}
              <table style={styles.receiptTable}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Description / Treatment</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 10px', borderBottom: '1px solid #eee' }}>{selectedInvoice.ServiceName}</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', borderBottom: '1px solid #eee' }}>{selectedInvoice.Qty}</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', borderBottom: '1px solid #eee' }}>Rs. {selectedInvoice.UnitPrice.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', borderBottom: '1px solid #eee', fontWeight: 600 }}>Rs. {selectedInvoice.TotalAmount.toLocaleString()}</td>
                  </tr>
                  <tr style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '15px 10px' }}>Grand Total (Net Collection):</td>
                    <td style={{ textAlign: 'right', padding: '15px 10px', color: '#10b981' }}>Rs. {selectedInvoice.TotalAmount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style={styles.divider} />

              <div style={styles.receiptFooter}>
                <div style={styles.stampArea}>
                  <div style={styles.stampCircle}>TRC STAMP</div>
                  <span>Authorized Signature</span>
                </div>
                <div style={styles.thankyouNote}>
                  <p style={{ fontWeight: 600 }}>Thank you for choosing TRC!</p>
                  <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '4px' }}>For medical queries or appointments, please contact our WhatsApp.</p>
                </div>
              </div>

            </div>

            <div style={styles.printActions}>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Close Preview</button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={16} /> Print Receipt
              </button>
            </div>

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
  receiptModal: {
    maxWidth: '650px',
    padding: '30px',
  },
  closeBtn: {
    position: 'absolute',
    right: '15px',
    top: '15px',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
  },
  printableReceipt: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '24px',
    borderRadius: '6px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  receiptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoAndTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoCircle: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: '#d4af37',
    border: '2px solid #d4af37',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.1rem',
    color: '#000000',
    letterSpacing: '1px',
    margin: 0,
  },
  clinicSub: {
    fontSize: '0.7rem',
    color: '#d4af37',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    color: '#333',
  },
  addressBar: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.7rem',
    color: '#555',
    marginTop: '10px',
  },
  divider: {
    borderBottom: '1px solid #ddd',
    margin: '16px 0',
  },
  receiptInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  receiptLabel: {
    display: 'block',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    color: '#666',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  receiptVal: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#000000',
  },
  receiptSubtext: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#555',
    marginTop: '2px',
  },
  receiptTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
    marginTop: '20px',
  },
  receiptFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: '30px',
  },
  stampArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#555',
  },
  stampCircle: {
    border: '1px dashed #ccc',
    width: '90px',
    height: '45px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '0.65rem',
    fontWeight: 600,
  },
  thankyouNote: {
    textAlign: 'right',
    maxWidth: '300px',
  },
  printActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
};
