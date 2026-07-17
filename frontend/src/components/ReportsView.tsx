import React, { useState, useEffect } from 'react';
import { FileBarChart, Printer, Calendar, Database, Search, User, Layers } from 'lucide-react';

type ReportType = 'daily' | 'monthly' | 'inventory' | 'history';

export default function ReportsView({ refreshKey }: { refreshKey: number }) {
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  
  // Data states
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientHistory, setPatientHistory] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [activeReport, refreshKey]);

  useEffect(() => {
    if (activeReport === 'history') {
      fetchPatients();
    }
  }, [activeReport]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientHistory(parseInt(selectedPatientId));
    } else {
      setPatientHistory(null);
    }
  }, [selectedPatientId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeReport === 'daily') {
        const res = await fetch('http://localhost:5000/api/reports/daily');
        if (res.ok) setDailyData(await res.json());
      } else if (activeReport === 'monthly') {
        const res = await fetch('http://localhost:5000/api/reports/monthly');
        if (res.ok) setMonthlyData(await res.json());
      } else if (activeReport === 'inventory') {
        const res = await fetch('http://localhost:5000/api/inventory');
        if (res.ok) setInventoryData(await res.json());
      }
    } catch (e) {
      console.error("Error loading report data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/patients');
      if (res.ok) setPatients(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchPatientHistory = async (patientId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/patients/${patientId}`);
      if (res.ok) setPatientHistory(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val).replace('PKR', 'Rs.');
  };

  return (
    <div style={styles.container}>
      
      {/* REPORT TYPE CHOOSER BAR */}
      <div style={styles.topBar}>
        <div style={styles.menuGroup}>
          <button className={`btn ${activeReport === 'daily' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('daily')}>
            Daily Collection
          </button>
          <button className={`btn ${activeReport === 'monthly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('monthly')}>
            Monthly P&L
          </button>
          <button className={`btn ${activeReport === 'inventory' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('inventory')}>
            Inventory Stock
          </button>
          <button className={`btn ${activeReport === 'history' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveReport('history')}>
            Patient History
          </button>
        </div>

        <button className="btn btn-secondary" onClick={handlePrint} style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
          <Printer size={16} /> Print Report
        </button>
      </div>

      {activeReport === 'history' && (
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <label className="form-label" style={{ margin: 0 }}>Select Patient:</label>
          <select className="form-select" style={{ minWidth: '350px' }} value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
            <option value="">Choose Patient...</option>
            {patients.map(p => (
              <option key={p.PatientID} value={p.PatientID}>
                TRC-{String(p.PatientID).padStart(5, '0')} - {p.PatientName} ({p.Mobile})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* REPORT CONTENT VIEW - STYLED CLEAN FOR PRINT PREVIEW */}
      <div className="card printable-area" style={styles.reportPaper}>
        
        {/* REPORT SHEET HEADER */}
        <div style={styles.reportHeader}>
          <div style={styles.headerTitleSection}>
            <div style={styles.logoCircle}>TRC</div>
            <div>
              <h2 style={styles.clinicTitle}>THE RELIABLE AESTHETIC CLINIC (TRC)</h2>
              <p style={styles.clinicSub}>Office No. 103, 1st Floor, Touheed Commercial, DHA Phase V, Karachi | Whatsapp: 0346-3486925</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={styles.reportName}>
              {activeReport === 'daily' && 'Daily Collection Report'}
              {activeReport === 'monthly' && 'Monthly Profit & Loss Report'}
              {activeReport === 'inventory' && 'Inventory Status Report'}
              {activeReport === 'history' && 'Patient Clinical History Report'}
            </h3>
            <span style={styles.reportDate}>Generated: {new Date().toLocaleDateString('en-PK')}</span>
          </div>
        </div>

        <div style={styles.divider} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>Retrieving report data from database...</div>
        ) : (
          <>
            {/* DAILY COLLECTION TABLE */}
            {activeReport === 'daily' && (
              <table style={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Patients Registered</th>
                    <th style={{ textAlign: 'right' }}>Total Sales Collection</th>
                    <th style={{ textAlign: 'right' }}>Total Clinic Expenses</th>
                    <th style={{ textAlign: 'right' }}>Net Collection</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No transactions recorded.</td>
                    </tr>
                  ) : (
                    dailyData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{formatDate(row.date)}</td>
                        <td style={{ textAlign: 'center' }}>{row.patients_count}</td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatPrice(row.sales_amount)}</td>
                        <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatPrice(row.expenses)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: row.net_collection >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatPrice(row.net_collection)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* MONTHLY REPORT TABLE */}
            {activeReport === 'monthly' && (
              <table style={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Billing Month</th>
                    <th style={{ textAlign: 'right' }}>Total Revenue (Sales)</th>
                    <th style={{ textAlign: 'right' }}>Total Expenses / Costs</th>
                    <th style={{ textAlign: 'right' }}>Net Monthly Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>No monthly summary available.</td>
                    </tr>
                  ) : (
                    monthlyData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{row.month}</td>
                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatPrice(row.total_sales)}</td>
                        <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatPrice(row.total_expense)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: row.profit >= 0 ? '#10b981' : '#ef4444', fontSize: '1rem' }}>
                          {formatPrice(row.profit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* INVENTORY REPORT TABLE */}
            {activeReport === 'inventory' && (
              <table style={styles.reportTable}>
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'center' }}>Opening Stock</th>
                    <th style={{ textAlign: 'center' }}>Purchased Stock</th>
                    <th style={{ textAlign: 'center' }}>Used Stock</th>
                    <th style={{ textAlign: 'center' }}>Closing Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No items in inventory.</td>
                    </tr>
                  ) : (
                    inventoryData.map(item => {
                      const isLow = item.ClosingStock < item.MinStock;
                      return (
                        <tr key={item.ItemID}>
                          <td>TRC-ITM-{String(item.ItemID).padStart(4, '0')}</td>
                          <td style={{ fontWeight: 600 }}>{item.ItemName}</td>
                          <td style={{ textAlign: 'center' }}>{item.OpeningStock}</td>
                          <td style={{ textAlign: 'center' }}>{item.PurchasedQty}</td>
                          <td style={{ textAlign: 'center' }}>{item.UsedQty}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: isLow ? '#ef4444' : '#000000' }}>
                            {item.ClosingStock}
                          </td>
                          <td style={{ fontWeight: 600, color: isLow ? '#ef4444' : '#10b981' }}>
                            {isLow ? 'LOW STOCK' : 'IN STOCK'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* PATIENT HISTORY REPORT SHEET */}
            {activeReport === 'history' && (
              <div>
                {!patientHistory ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
                    Please select a patient from the dropdown menu to run their history report.
                  </div>
                ) : (
                  <div>
                    {/* Patient demographics */}
                    <div style={styles.demographicsGrid}>
                      <div>
                        <span style={styles.repLabel}>Patient Name</span>
                        <span style={styles.repVal}>{patientHistory.patient.PatientName}</span>
                        <span style={styles.repSubtext}>Father's Name: {patientHistory.patient.FatherName}</span>
                      </div>
                      <div>
                        <span style={styles.repLabel}>Age / Gender</span>
                        <span style={styles.repVal}>{patientHistory.patient.Age} / {patientHistory.patient.Gender}</span>
                        <span style={styles.repSubtext}>Mobile: {patientHistory.patient.Mobile}</span>
                      </div>
                      <div>
                        <span style={styles.repLabel}>Record ID</span>
                        <span style={styles.repVal}>TRC-{String(patientHistory.patient.PatientID).padStart(5, '0')}</span>
                        <span style={styles.repSubtext}>Reg Date: {formatDate(patientHistory.patient.RegDate)}</span>
                      </div>
                    </div>

                    <div style={{ margin: '15px 0', fontSize: '0.85rem' }}>
                      <strong>Patient Primary Treatment Category: </strong>
                      <span style={{ color: '#d4af37', fontWeight: 600 }}>{patientHistory.patient.TreatmentType}</span>
                    </div>

                    <div style={{ margin: '15px 0', fontSize: '0.85rem', border: '1px solid #ddd', padding: '10px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                      <strong>General Clinical Notes: </strong>
                      <p style={{ color: '#555', marginTop: '4px', fontStyle: 'italic' }}>{patientHistory.patient.Notes || 'No notes saved.'}</p>
                    </div>

                    {/* Timeline sections */}
                    <div style={styles.historyTimeline}>
                      
                      {/* SURGERY LOGS */}
                      {patientHistory.hair_transplants.length > 0 && (
                        <div style={styles.timelineBlock}>
                          <h4 style={styles.timelineTitle}>Hair Transplant Surgery Records</h4>
                          <table style={styles.innerRepTable}>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Grafts</th>
                                <th>Hairline Style</th>
                                <th>Donor Status</th>
                                <th>Doctor</th>
                                <th>Total Cost</th>
                                <th>Paid</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientHistory.hair_transplants.map((ht: any) => (
                                <tr key={ht.RecordID}>
                                  <td>{formatDate(ht.SurgeryDate)}</td>
                                  <td style={{ fontWeight: 700 }}>{ht.GraftsCount}</td>
                                  <td>{ht.HairLineDesign}</td>
                                  <td>{ht.DonorAreaStatus}</td>
                                  <td>{ht.DoctorName}</td>
                                  <td>{formatPrice(ht.TotalCost)}</td>
                                  <td style={{ color: '#10b981', fontWeight: 600 }}>{formatPrice(ht.AmountPaid)}</td>
                                  <td style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>{ht.Remarks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* PRP LOGS */}
                      {patientHistory.prp_records.length > 0 && (
                        <div style={styles.timelineBlock}>
                          <h4 style={styles.timelineTitle}>PRP Session Records</h4>
                          <table style={styles.innerRepTable}>
                            <thead>
                              <tr>
                                <th>Session Date</th>
                                <th>Session No.</th>
                                <th>Centrifuge Kit Used</th>
                                <th>Area Treated</th>
                                <th>Surgeon / Doctor</th>
                                <th>Session Cost</th>
                                <th>Remarks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientHistory.prp_records.map((prp: any) => (
                                <tr key={prp.RecordID}>
                                  <td>{formatDate(prp.SessionDate)}</td>
                                  <td style={{ fontWeight: 700 }}>#{prp.SessionNumber} of {prp.TotalSessions}</td>
                                  <td>{prp.KitTypeUsed}</td>
                                  <td>{prp.AreaTreated}</td>
                                  <td>{prp.DoctorName}</td>
                                  <td>{formatPrice(prp.CostPerSession)}</td>
                                  <td style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>{prp.Remarks}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* APPOINTMENTS */}
                      <div style={styles.timelineBlock}>
                        <h4 style={styles.timelineTitle}>Appointments & Clinic Visits</h4>
                        <ul style={styles.simpleList}>
                          {patientHistory.appointments.length === 0 ? <li>No appointments logged.</li> : (
                            patientHistory.appointments.map((app: any) => (
                              <li key={app.AppointmentID}>
                                <strong>{formatDate(app.AppointmentDate)} ({new Date(app.AppointmentDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})</strong> - Doctor: {app.Doctor} | Status: <span style={{ fontWeight: 600 }}>{app.Status}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>

                      {/* INVOICES */}
                      <div style={styles.timelineBlock}>
                        <h4 style={styles.timelineTitle}>Payments & Invoices Generated</h4>
                        <ul style={styles.simpleList}>
                          {patientHistory.sales.length === 0 ? <li>No payments logged.</li> : (
                            patientHistory.sales.map((sale: any) => (
                              <li key={sale.SaleID} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{formatDate(sale.SaleDate)} - {sale.ServiceName} (x{sale.Qty})</span>
                                <span style={{ fontWeight: 700, color: '#10b981' }}>{formatPrice(sale.TotalAmount)}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* SIGNATURE FOR REPORT SHEET */}
        <div style={styles.reportSignatureSection}>
          <div style={{ borderTop: '1px solid #aaa', width: '200px', textAlign: 'center', padding: '8px 0' }}>
            Clinic Operations Manager
          </div>
          <div style={{ borderTop: '1px solid #aaa', width: '200px', textAlign: 'center', padding: '8px 0' }}>
            Authorized Medical Doctor
          </div>
        </div>

      </div>

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
  menuGroup: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#0c0c0e',
    padding: '4px',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    borderRadius: '8px',
  },
  reportPaper: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
    minHeight: '800px',
    display: 'flex',
    flexDirection: 'column',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoCircle: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: 'bold',
    fontSize: '1.4rem',
    color: '#d4af37',
    border: '2px solid #d4af37',
    borderRadius: '50%',
    width: '45px',
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.15rem',
    color: '#000000',
    margin: 0,
  },
  clinicSub: {
    fontSize: '0.7rem',
    color: '#666',
    marginTop: '2px',
  },
  reportName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.3rem',
    color: '#d4af37',
    margin: 0,
  },
  reportDate: {
    fontSize: '0.75rem',
    color: '#555',
  },
  divider: {
    borderBottom: '1.5px solid #d4af37',
    margin: '20px 0',
  },
  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
    color: '#333',
    marginBottom: '30px',
  },
  reportSignatureSection: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: '60px',
    fontSize: '0.8rem',
    color: '#555',
  },
  demographicsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '12px 16px',
  },
  repLabel: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#6c757d',
    marginBottom: '2px',
  },
  repVal: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#212529',
  },
  repSubtext: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#495057',
  },
  historyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginTop: '20px',
  },
  timelineBlock: {
    border: '1px solid #e9ecef',
    borderRadius: '6px',
    padding: '14px',
  },
  timelineTitle: {
    fontSize: '0.9rem',
    color: '#d4af37',
    fontWeight: 600,
    borderBottom: '1px solid #eee',
    paddingBottom: '6px',
    marginBottom: '10px',
  },
  innerRepTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.78rem',
  },
  simpleList: {
    paddingLeft: '20px',
    fontSize: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: '#444',
  },
};

// Injection of print specific stylesheet updates
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      body { background-color: #ffffff !important; color: #000000 !important; }
      .app-container aside, .app-container header, .app-container .btn, .card:not(.printable-area), select, input, label {
        display: none !important;
      }
      .printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      table th {
        background-color: #f1f1f1 !important;
        color: #000000 !important;
        border-bottom: 2px solid #ccc !important;
      }
      table td {
        border-bottom: 1px solid #ddd !important;
        color: #333333 !important;
      }
    }
  `;
  document.head.appendChild(style);
}
