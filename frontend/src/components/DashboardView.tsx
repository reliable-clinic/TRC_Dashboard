import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, DollarSign, TrendingUp, AlertTriangle, Clock, ArrowRight,
  PlusCircle, RefreshCw
} from 'lucide-react';
import { 
  ComposedChart, Bar, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardStats {
  total_patients: number;
  today_appointments: number;
  today_sales: number;
  monthly_sales: number;
  monthly_expenses: number;
  monthly_profit: number;
  pending_payments: number;
  low_stock_items: number;
}

interface ChartData {
  monthly_revenue: { month: string; revenue: number }[];
  service_revenue: { name: string; value: number }[];
  gender_breakdown: { name: string; value: number }[];
  payment_status: { name: string; value: number }[];
}

interface Appointment {
  AppointmentID: number;
  PatientID: number;
  AppointmentDate: string;
  Doctor: string;
  Status: string;
  PatientName: string;
  TreatmentType: string;
}

interface LowStockItem {
  ItemID: number;
  ItemName: string;
  ClosingStock: number;
  MinStock: number;
}

interface DashboardViewProps {
  setActiveTab: (tab: any) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const COLORS = ['#d4af37', '#a87c1e', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#a0a0b0'];
const PAY_COLORS = ['#10b981', '#ef4444'];

export default function DashboardView({ setActiveTab, refreshKey, triggerRefresh }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [dailyReport, setDailyReport] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Quick Action Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  
  // Forms states
  const [patientForm, setPatientForm] = useState({
    PatientName: '', FatherName: '', Gender: 'Male', Age: '', Mobile: '', Address: '', TreatmentType: 'Consultation', Notes: ''
  });
  const [appForm, setAppForm] = useState({ PatientID: '', AppointmentDate: '', Doctor: 'Dr. Ahsan', Status: 'Scheduled' });
  const [saleForm, setSaleForm] = useState({ PatientID: '', ServiceName: 'PRP Therapy', Qty: '1', UnitPrice: '' });
  const [purForm, setPurForm] = useState({ SupplierName: '', ItemName: 'PRP Kit', Qty: '1', UnitCost: '' });
  const [expForm, setExpForm] = useState({ ExpenseType: 'Rent', Amount: '', Remarks: '' });
  const [followForm, setFollowForm] = useState({ PatientID: '', FollowUpDate: '', Remarks: '' });

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Stats
      const statsRes = await fetch('http://localhost:5000/api/dashboard/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      // Fetch Charts
      const chartsRes = await fetch('http://localhost:5000/api/dashboard/charts');
      if (chartsRes.ok) setCharts(await chartsRes.json());

      // Fetch Today Appointments
      const today = new Date().toISOString().split('T')[0];
      const appRes = await fetch(`http://localhost:5000/api/appointments?date=${today}`);
      if (appRes.ok) setAppointments(await appRes.json());

      // Fetch Low Stock
      const invRes = await fetch('http://localhost:5000/api/inventory');
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventoryList(invData);
        setLowStock(invData.filter((item: any) => item.ClosingStock < item.MinStock));
      }

      // Fetch Daily Report for summary widget
      const dailyRes = await fetch('http://localhost:5000/api/reports/daily');
      if (dailyRes.ok) setDailyReport(await dailyRes.json());

      // Fetch Patients list for form dropdowns
      const patRes = await fetch('http://localhost:5000/api/patients');
      if (patRes.ok) setPatientsList(await patRes.json());

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (modalName: string) => {
    setActiveModal(modalName);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  // Submit Handlers
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientForm, Age: parseInt(patientForm.Age) || 0 })
      });
      if (res.ok) {
        handleCloseModal();
        triggerRefresh();
        // Reset form
        setPatientForm({
          PatientName: '', FatherName: '', Gender: 'Male', Age: '', Mobile: '', Address: '', TreatmentType: 'Consultation', Notes: ''
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(appForm.PatientID),
          AppointmentDate: appForm.AppointmentDate,
          Doctor: appForm.Doctor,
          Status: appForm.Status
        })
      });
      if (res.ok) {
        handleCloseModal();
        triggerRefresh();
        setAppForm({ PatientID: '', AppointmentDate: '', Doctor: 'Dr. Ahsan', Status: 'Scheduled' });
      }
    } catch (e) { console.error(e); }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(saleForm.PatientID),
          ServiceName: saleForm.ServiceName,
          Qty: parseInt(saleForm.Qty),
          UnitPrice: parseFloat(saleForm.UnitPrice),
          SaleDate: new Date().toISOString()
        })
      });
      if (res.ok) {
        handleCloseModal();
        triggerRefresh();
        setSaleForm({ PatientID: '', ServiceName: 'PRP Therapy', Qty: '1', UnitPrice: '' });
      }
    } catch (e) { console.error(e); }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SupplierName: purForm.SupplierName,
          ItemName: purForm.ItemName,
          Qty: parseInt(purForm.Qty),
          UnitCost: parseFloat(purForm.UnitCost),
          PurchaseDate: new Date().toISOString()
        })
      });
      if (res.ok) {
        handleCloseModal();
        triggerRefresh();
        setPurForm({ SupplierName: '', ItemName: 'PRP Kit', Qty: '1', UnitCost: '' });
      }
    } catch (e) { console.error(e); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ExpenseType: expForm.ExpenseType,
          Amount: parseFloat(expForm.Amount),
          Remarks: expForm.Remarks,
          ExpenseDate: new Date().toISOString()
        })
      });
      if (res.ok) {
        handleCloseModal();
        triggerRefresh();
        setExpForm({ ExpenseType: 'Rent', Amount: '', Remarks: '' });
      }
    } catch (e) { console.error(e); }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PatientID: parseInt(followForm.PatientID),
          FollowUpDate: followForm.FollowUpDate,
          Remarks: followForm.Remarks
        })
      });
      if (res.ok) {
        handleCloseModal();
        triggerRefresh();
        setFollowForm({ PatientID: '', FollowUpDate: '', Remarks: '' });
      }
    } catch (e) { console.error(e); }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val).replace('PKR', 'Rs.');
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '10px' }}>
        <RefreshCw size={24} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading Clinic Dashboard Data...</span>
      </div>
    );
  }

  // Fallback defaults if APIs failed
  const s = stats || {
    total_patients: 0, today_appointments: 0, today_sales: 0,
    monthly_sales: 0, monthly_expenses: 0, monthly_profit: 0,
    pending_payments: 0, low_stock_items: 0
  };

  // Pre-calculate today's collection summary
  const todayStr = new Date().toISOString().split('T')[0];
  const todayColl = dailyReport.find(r => r.date.split('T')[0] === todayStr) || { sales_amount: 0, expenses: 0, net_collection: 0 };

  return (
    <div style={styles.container}>
      
      {/* TOP ROW STATS CARDS */}
      <section style={styles.statsGrid}>
        
        <div className="card" style={styles.statCard} onClick={() => setActiveTab('patients')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Total Patients</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Users size={20} color="#3b82f6" />
            </div>
          </div>
          <div style={styles.statNumber}>{s.total_patients}</div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

        <div className="card" style={styles.statCard} onClick={() => setActiveTab('appointments')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Today Appointments</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Calendar size={20} color="#8b5cf6" />
            </div>
          </div>
          <div style={styles.statNumber}>{s.today_appointments}</div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

        <div className="card" style={styles.statCard} onClick={() => setActiveTab('billing')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Total Revenue</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <DollarSign size={20} color="#10b981" />
            </div>
          </div>
          <div style={styles.statNumber}>{formatPrice(s.monthly_sales)}</div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

        <div className="card" style={styles.statCard} onClick={() => setActiveTab('expenses')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Total Expenses</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(239, 110, 110, 0.1)' }}>
              <DollarSign size={20} color="#ef4444" />
            </div>
          </div>
          <div style={styles.statNumber}>{formatPrice(s.monthly_expenses)}</div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

        <div className="card" style={styles.statCard} onClick={() => setActiveTab('reports')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Net Profit</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <TrendingUp size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ ...styles.statNumber, color: s.monthly_profit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatPrice(s.monthly_profit)}
          </div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

        <div className="card" style={styles.statCard} onClick={() => setActiveTab('hairtransplant')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Pending Payments</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Clock size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={styles.statNumber}>{formatPrice(s.pending_payments)}</div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

        <div className="card" style={styles.statCard} onClick={() => setActiveTab('inventory')}>
          <div style={styles.cardHeader}>
            <span style={styles.statTitle}>Low Stock Items</span>
            <div style={{ ...styles.iconBg, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
              <AlertTriangle size={20} color="#ef4444" />
            </div>
          </div>
          <div style={styles.statNumber}>{s.low_stock_items}</div>
          <span style={styles.viewLink}>View Details <ArrowRight size={12} /></span>
        </div>

      </section>

      {/* MID CHART ROW */}
      {/* GLOBAL SVG GRADIENT DEFINITIONS FOR 3D STYLING */}
      <svg width="0" height="0" style={{ position: 'absolute', zIndex: -1 }}>
        <defs>
          {/* Monthly Revenue Gradients */}
          <linearGradient id="monthlyRevenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#856404" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="monthlyAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#d4af37" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="monthlyLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffea9f" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#a87c1e" />
          </linearGradient>

          {/* Pie Chart Gradients */}
          <linearGradient id="pieGradGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffea9f" />
            <stop offset="100%" stopColor="#a87c1e" />
          </linearGradient>
          <linearGradient id="pieGradBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="pieGradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="pieGradPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <linearGradient id="pieGradPink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          <linearGradient id="pieGradOrange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Payment Gradients */}
          <linearGradient id="payGradPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
          <linearGradient id="payGradPending" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>

          {/* Gender Gradients */}
          <linearGradient id="genderGradMale" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="genderGradFemale" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#831843" />
          </linearGradient>
          <linearGradient id="genderGradOther" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>
        </defs>
      </svg>

      {/* MID CHART ROW */}
      <section style={styles.chartsGrid}>
        
        {/* Monthly Revenue Composed Trend Chart */}
        <div className="card" style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Monthly Revenue Trend & Bar Overview</h3>
          <div style={styles.chartWrapper}>
            {charts && (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={charts.monthly_revenue}>
                  <XAxis dataKey="month" stroke="#a0a0b0" fontSize={11} tickLine={false} />
                  <YAxis stroke="#a0a0b0" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0c0c0e', borderColor: '#d4af37', borderRadius: '8px', color: '#ffffff' }}
                    formatter={(val) => [formatPrice(val as number), "Revenue"]}
                  />
                  {/* Glowing Area Fill */}
                  <Area type="monotone" dataKey="revenue" fill="url(#monthlyAreaGrad)" stroke="url(#monthlyLineGrad)" strokeWidth={3} dot={{ stroke: '#d4af37', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0, fill: '#ffffff' }} />
                  {/* Cylindrical 3D Bar Overlay */}
                  <Bar dataKey="revenue" fill="url(#monthlyRevenueGrad)" radius={[5, 5, 0, 0]} barSize={20} opacity={0.4} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Service Wise Revenue Pie Chart */}
        <div className="card" style={{ ...styles.chartCard, position: 'relative' }}>
          <h3 style={styles.chartTitle}>Service Wise Revenue</h3>
          <div style={styles.chartWrapper}>
            {charts && (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.service_revenue}
                      cx="50%"
                      cy="42%"
                      innerRadius={62}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts.service_revenue.map((entry, index) => {
                        const pieGradients = ['url(#pieGradGold)', 'url(#pieGradBlue)', 'url(#pieGradGreen)', 'url(#pieGradPurple)', 'url(#pieGradPink)', 'url(#pieGradOrange)'];
                        return <Cell key={`cell-${index}`} fill={pieGradients[index % pieGradients.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(val) => formatPrice(val as number)} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={40} 
                      iconSize={8} 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', color: '#a0a0b0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text for the donut hole */}
                <div style={{
                  position: 'absolute',
                  top: '42%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '0.6rem', color: '#a0a0b0', textTransform: 'uppercase', display: 'block', letterSpacing: '0.5px' }}>Sales</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d4af37' }}>
                    {formatPrice(s.monthly_sales).replace('Rs. ', 'Rs.')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mini Pie Charts */}
        <div style={styles.miniChartsContainer}>
          
          <div className="card" style={{ ...styles.miniChartCard, position: 'relative' }}>
            <h4 style={styles.miniChartTitle}>Payment Status</h4>
            <div style={styles.miniChartWrapper}>
              {charts && (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.payment_status} cx="35%" cy="50%" innerRadius={35} outerRadius={46} paddingAngle={2} dataKey="value">
                        {charts.payment_status.map((entry, index) => {
                          const fillUrl = entry.name === 'Paid' ? 'url(#payGradPaid)' : 'url(#payGradPending)';
                          return <Cell key={`cell-${index}`} fill={fillUrl} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(val) => formatPrice(val as number)} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '35%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                      {(() => {
                        const paidVal = charts.payment_status.find(p => p.name === 'Paid')?.value || 0;
                        const pendVal = charts.payment_status.find(p => p.name === 'Pending')?.value || 0;
                        const totalPay = paidVal + pendVal;
                        return totalPay > 0 ? Math.round((paidVal / totalPay) * 100) + '%' : '0%';
                      })()}
                    </span>
                  </div>
                </>
              )}
              <div style={styles.pieLegend}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}><div style={{ width: '8px', height: '8px', background: 'linear-gradient(to bottom, #34d399, #065f46)', borderRadius: '50%' }}/> Paid</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}><div style={{ width: '8px', height: '8px', background: 'linear-gradient(to bottom, #f87171, #991b1b)', borderRadius: '50%' }}/> Pending</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ ...styles.miniChartCard, position: 'relative' }}>
            <h4 style={styles.miniChartTitle}>Patient Gender</h4>
            <div style={styles.miniChartWrapper}>
              {charts && (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.gender_breakdown} cx="35%" cy="50%" innerRadius={35} outerRadius={46} paddingAngle={2} dataKey="value">
                        {charts.gender_breakdown.map((entry, index) => {
                          const fillMap: Record<string, string> = {
                            'Male': 'url(#genderGradMale)',
                            'Female': 'url(#genderGradFemale)',
                            'Other': 'url(#genderGradOther)'
                          };
                          return <Cell key={`cell-${index}`} fill={fillMap[entry.name] || 'url(#genderGradOther)'} />;
                        })}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Centered Donut indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '35%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d4af37' }}>
                      {s.total_patients}
                    </span>
                  </div>
                </>
              )}
              <div style={styles.pieLegend}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}><div style={{ width: '8px', height: '8px', background: 'linear-gradient(to bottom, #60a5fa, #1e3a8a)', borderRadius: '50%' }}/> Male</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px' }}><div style={{ width: '8px', height: '8px', background: 'linear-gradient(to bottom, #f472b6, #831843)', borderRadius: '50%' }}/> Female</div>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* LOWER TABLES GRID */}
      <section style={styles.lowerGrid}>
        
        {/* Today Appointments */}
        <div className="card" style={styles.tableCard}>
          <div style={styles.tableHeaderSection}>
            <h3 style={styles.cardSectionTitle}>Today Appointments</h3>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setActiveTab('appointments')}>
              Manage
            </button>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Service</th>
                  <th>Doctor</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No appointments scheduled for today.</td>
                  </tr>
                ) : (
                  appointments.map(app => (
                    <tr key={app.AppointmentID}>
                      <td>{new Date(app.AppointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>TRC-{String(app.PatientID).padStart(5, '0')}</td>
                      <td>{app.PatientName}</td>
                      <td>{app.TreatmentType}</td>
                      <td>{app.Doctor}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Middle split: Alerts and Collection summary */}
        <div style={styles.splitLower}>
          
          {/* Low Stock Alerts */}
          <div className="card" style={{ flexGrow: 1, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ ...styles.cardSectionTitle, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={18} /> Low Stock Alerts
            </h3>
            <div className="table-container" style={{ border: 'none', background: 'none' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Current Stock</th>
                    <th>Min Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '15px' }}>All inventory items are fully stocked.</td>
                    </tr>
                  ) : (
                    lowStock.map(item => (
                      <tr key={item.ItemID}>
                        <td>{item.ItemName}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{item.ClosingStock}</td>
                        <td>{item.MinStock}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Collection Summary */}
          <div className="card" style={{ flexGrow: 1, borderColor: '#d4af37' }}>
            <h3 style={{ ...styles.cardSectionTitle, color: '#d4af37', marginBottom: '12px' }}>Daily Collection Summary</h3>
            <div style={styles.collectionSummary}>
              <div style={styles.summaryRow}>
                <span>Today's Sales</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{formatPrice(todayColl.sales_amount)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Today's Expenses</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>{formatPrice(todayColl.expenses)}</span>
              </div>
              <div style={styles.totalCollectionRow}>
                <span>TOTAL COLLECTION (NET)</span>
                <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{formatPrice(todayColl.net_collection)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Quick Actions Panel */}
        <div className="card" style={styles.actionsCard}>
          <h3 style={{ ...styles.cardSectionTitle, marginBottom: '16px' }}>Quick Actions</h3>
          <div style={styles.actionsGrid}>
            <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => handleOpenModal('patient')}>
              <PlusCircle size={14} color="#d4af37" /> + New Patient
            </button>
            <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => handleOpenModal('sale')}>
              <PlusCircle size={14} color="#10b981" /> + New Invoice
            </button>
            <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => handleOpenModal('appointment')}>
              <PlusCircle size={14} color="#8b5cf6" /> + New Appointment
            </button>
            <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => handleOpenModal('purchase')}>
              <PlusCircle size={14} color="#3b82f6" /> + Purchase Entry
            </button>
            <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => handleOpenModal('expense')}>
              <PlusCircle size={14} color="#ef4444" /> + Expense Entry
            </button>
            <button className="btn btn-secondary" style={styles.actionBtn} onClick={() => handleOpenModal('followup')}>
              <PlusCircle size={14} color="#f59e0b" /> + Follow Up
            </button>
          </div>
        </div>

      </section>

      {/* QUICK ACTIONS MODALS */}
      {activeModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Create {activeModal.toUpperCase()}
            </h3>

            {/* NEW PATIENT FORM */}
            {activeModal === 'patient' && (
              <form onSubmit={handleAddPatient}>
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
                    <label className="form-label">Treatment Type</label>
                    <select className="form-select" value={patientForm.TreatmentType} onChange={e => setPatientForm({...patientForm, TreatmentType: e.target.value})}>
                      <option value="Consultation">Consultation</option>
                      <option value="Hair Transplant">Hair Transplant</option>
                      <option value="PRP Therapy">PRP Therapy</option>
                      <option value="Skin Treatment">Skin Treatment</option>
                      <option value="Laser Treatment">Laser Treatment</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label">Address</label>
                  <textarea className="form-textarea" rows={2} value={patientForm.Address} onChange={e => setPatientForm({...patientForm, Address: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Notes</label>
                  <textarea className="form-textarea" rows={2} value={patientForm.Notes} onChange={e => setPatientForm({...patientForm, Notes: e.target.value})} />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Patient</button>
                </div>
              </form>
            )}

            {/* NEW APPOINTMENT FORM */}
            {activeModal === 'appointment' && (
              <form onSubmit={handleAddAppointment}>
                <div className="form-group">
                  <label className="form-label">Patient</label>
                  <select className="form-select" required value={appForm.PatientID} onChange={e => setAppForm({...appForm, PatientID: e.target.value})}>
                    <option value="">Select Patient...</option>
                    {patientsList.map(p => (
                      <option key={p.PatientID} value={p.PatientID}>
                        TRC-{String(p.PatientID).padStart(5, '0')} - {p.PatientName} ({p.Mobile})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" required value={appForm.AppointmentDate} onChange={e => setAppForm({...appForm, AppointmentDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Doctor</label>
                    <select className="form-select" value={appForm.Doctor} onChange={e => setAppForm({...appForm, Doctor: e.target.value})}>
                      <option value="Dr. Ahsan">Dr. Ahsan</option>
                      <option value="Dr. Sara">Dr. Sara</option>
                    </select>
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Schedule</button>
                </div>
              </form>
            )}

            {/* NEW INVOICE / SALE FORM */}
            {activeModal === 'sale' && (
              <form onSubmit={handleAddSale}>
                <div className="form-group">
                  <label className="form-label">Patient</label>
                  <select className="form-select" required value={saleForm.PatientID} onChange={e => setSaleForm({...saleForm, PatientID: e.target.value})}>
                    <option value="">Select Patient...</option>
                    {patientsList.map(p => (
                      <option key={p.PatientID} value={p.PatientID}>
                        TRC-{String(p.PatientID).padStart(5, '0')} - {p.PatientName}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">Service / Treatment</label>
                    <select className="form-select" value={saleForm.ServiceName} onChange={e => setSaleForm({...saleForm, ServiceName: e.target.value})}>
                      <option value="PRP Therapy">PRP Therapy</option>
                      <option value="Hair Transplant">Hair Transplant</option>
                      <option value="Skin Treatment">Skin Treatment</option>
                      <option value="Laser Treatment">Laser Treatment</option>
                      <option value="Consultation">Consultation</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qty</label>
                    <input className="form-input" type="number" required min={1} value={saleForm.Qty} onChange={e => setSaleForm({...saleForm, Qty: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Price (Rs.)</label>
                    <input className="form-input" type="number" required min={0} value={saleForm.UnitPrice} onChange={e => setSaleForm({...saleForm, UnitPrice: e.target.value})} />
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Invoice</button>
                </div>
              </form>
            )}

            {/* NEW PURCHASE FORM */}
            {activeModal === 'purchase' && (
              <form onSubmit={handleAddPurchase}>
                <div className="form-group">
                  <label className="form-label">Supplier Name</label>
                  <input className="form-input" type="text" required value={purForm.SupplierName} onChange={e => setPurForm({...purForm, SupplierName: e.target.value})} />
                </div>
                <div style={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">Item Name</label>
                    <select className="form-select" value={purForm.ItemName} onChange={e => setPurForm({...purForm, ItemName: e.target.value})}>
                      {inventoryList.map(item => (
                        <option key={item.ItemID} value={item.ItemName}>{item.ItemName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qty</label>
                    <input className="form-input" type="number" required min={1} value={purForm.Qty} onChange={e => setPurForm({...purForm, Qty: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Cost (Rs.)</label>
                    <input className="form-input" type="number" required min={0} value={purForm.UnitCost} onChange={e => setPurForm({...purForm, UnitCost: e.target.value})} />
                  </div>
                </div>
                <div style={styles.modalActions}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Purchase</button>
                </div>
              </form>
            )}

            {/* NEW EXPENSE FORM */}
            {activeModal === 'expense' && (
              <form onSubmit={handleAddExpense}>
                <div style={styles.formGrid}>
                  <div className="form-group">
                    <label className="form-label">Expense Type</label>
                    <select className="form-select" value={expForm.ExpenseType} onChange={e => setExpForm({...expForm, ExpenseType: e.target.value})}>
                      <option value="Rent">Clinic Rent</option>
                      <option value="Electricity Bill">Electricity Bill</option>
                      <option value="Salaries">Staff Salaries</option>
                      <option value="Refreshments">Refreshments / Tea</option>
                      <option value="Marketing">Marketing / Ads</option>
                      <option value="Other">Other Miscellaneous</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (Rs.)</label>
                    <input className="form-input" type="number" required min={0} value={expForm.Amount} onChange={e => setExpForm({...expForm, Amount: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-textarea" rows={2} value={expForm.Remarks} onChange={e => setExpForm({...expForm, Remarks: e.target.value})} />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Expense</button>
                </div>
              </form>
            )}

            {/* NEW FOLLOW UP FORM */}
            {activeModal === 'followup' && (
              <form onSubmit={handleAddFollowUp}>
                <div className="form-group">
                  <label className="form-label">Patient</label>
                  <select className="form-select" required value={followForm.PatientID} onChange={e => setFollowForm({...followForm, PatientID: e.target.value})}>
                    <option value="">Select Patient...</option>
                    {patientsList.map(p => (
                      <option key={p.PatientID} value={p.PatientID}>
                        TRC-{String(p.PatientID).padStart(5, '0')} - {p.PatientName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Follow Up Date</label>
                  <input className="form-input" type="date" required value={followForm.FollowUpDate} onChange={e => setFollowForm({...followForm, FollowUpDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Remarks / Checkup Plan</label>
                  <textarea className="form-textarea" rows={2} required value={followForm.Remarks} onChange={e => setFollowForm({...followForm, Remarks: e.target.value})} />
                </div>
                <div style={styles.modalActions}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Schedule Followup</button>
                </div>
              </form>
            )}

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
    gap: '30px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
  },
  statCard: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '130px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#a0a0b0',
    letterSpacing: '0.5px',
  },
  iconBg: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '10px 0',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  viewLink: {
    fontSize: '0.7rem',
    color: '#d4af37',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 600,
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr 1fr',
    gap: '20px',
  },
  chartCard: {
    minHeight: '320px',
    display: 'flex',
    flexDirection: 'column',
  },
  chartTitle: {
    fontSize: '0.95rem',
    color: '#d4af37',
    marginBottom: '16px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  chartWrapper: {
    flexGrow: 1,
    width: '100%',
    height: '240px',
  },
  miniChartsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  miniChartCard: {
    flexGrow: 1,
    minHeight: '150px',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
  },
  miniChartTitle: {
    fontSize: '0.8rem',
    color: '#a0a0b0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    fontWeight: 600,
  },
  miniChartWrapper: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: '90px',
  },
  pieLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginLeft: '10px',
  },
  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1.5fr 1fr',
    gap: '20px',
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '280px',
  },
  tableHeaderSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardSectionTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#ffffff',
  },
  splitLower: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  collectionSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '10px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#a0a0b0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '8px',
  },
  totalCollectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '10px',
    marginTop: '5px',
    borderTop: '1px dashed var(--color-gold)',
  },
  actionsCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  actionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flexGrow: 1,
    justifyContent: 'center',
  },
  actionBtn: {
    justifyContent: 'flex-start',
    padding: '12px 16px',
    fontSize: '0.8rem',
    width: '100%',
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
