import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, CalendarRange, Syringe, Sparkles, 
  Receipt, Package, ShoppingCart, DollarSign, Clock, FileBarChart, 
  Settings, Phone, Database, RefreshCw, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import DashboardView from './components/DashboardView';
import PatientListView from './components/PatientListView';
import AppointmentView from './components/AppointmentView';
import PrpRecordsView from './components/PrpRecordsView';
import HairTransplantRecordsView from './components/HairTransplantRecordsView';
import BillingView from './components/BillingView';
import InventoryView from './components/InventoryView';
import PurchasesView from './components/PurchasesView';
import ExpensesView from './components/ExpensesView';
import FollowUpsView from './components/FollowUpsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import { syncManager } from './utils/syncManager';

export type TabType = 
  | 'dashboard' 
  | 'patients' 
  | 'appointments' 
  | 'prp' 
  | 'hairtransplant' 
  | 'billing' 
  | 'inventory' 
  | 'purchases' 
  | 'expenses' 
  | 'followups' 
  | 'reports' 
  | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [globalRefreshKey, setGlobalRefreshKey] = useState<number>(0);
  
  // Offline sync states
  const [queueLength, setQueueLength] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Subscribe to syncManager queue and online changes
  useEffect(() => {
    const handleSyncChange = (len: number, online: boolean) => {
      setQueueLength(len);
      setIsOnline(online);
      setDbConnected(online);
      // Auto refresh list views when a sync finishes (queue length goes to 0)
      if (len === 0 && online) {
        setGlobalRefreshKey(prev => prev + 1);
      }
    };
    syncManager.subscribe(handleSyncChange);
    return () => syncManager.unsubscribe(handleSyncChange);
  }, []);

  const triggerGlobalRefresh = () => {
    setGlobalRefreshKey(prev => prev + 1);
  };

  const handleManualSync = () => {
    syncManager.syncQueue();
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'patients':
        return <PatientListView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'appointments':
        return <AppointmentView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'prp':
        return <PrpRecordsView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'hairtransplant':
        return <HairTransplantRecordsView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'billing':
        return <BillingView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'inventory':
        return <InventoryView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'purchases':
        return <PurchasesView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'expenses':
        return <ExpensesView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'followups':
        return <FollowUpsView refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
      case 'reports':
        return <ReportsView refreshKey={globalRefreshKey} />;
      case 'settings':
        return <SettingsView dbConnected={dbConnected} triggerRefresh={triggerGlobalRefresh} />;
      default:
        return <DashboardView setActiveTab={setActiveTab} refreshKey={globalRefreshKey} triggerRefresh={triggerGlobalRefresh} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: CalendarRange },
    { id: 'prp', label: 'PRP Sessions', icon: Syringe },
    { id: 'hairtransplant', label: 'Hair Transplant', icon: Sparkles },
    { id: 'billing', label: 'Billing / Invoices', icon: Receipt },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'followups', label: 'Follow Ups', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="app-container" style={styles.appContainer}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={styles.sidebar}>
        <div style={styles.logoSection}>
          <div style={styles.brandLogo}>TRC</div>
          <div style={styles.brandTitle}>
            <span style={styles.mainTitle}>THE RELIABLE</span>
            <span style={styles.subTitle}>Aesthetic Clinic</span>
          </div>
        </div>

        <nav style={styles.navMenu}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <Icon size={18} color={isActive ? '#000000' : '#a0a0b0'} />
                <span>{item.label}</span>
                {isActive && <div style={styles.activeIndicator} />}
              </button>
            );
          })}
        </nav>

        <div style={styles.footerBrand}>
          Clinic Management System
          <div style={styles.version}>v3.0.0</div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div style={styles.mainArea}>
        {/* HEADER BAR */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.pageTitle}>
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            
            <div style={styles.badgesGroup}>
              {/* Online/Offline Status */}
              <div style={{
                ...styles.badge,
                backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                borderColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isOnline ? '#10b981' : '#ef4444'
              }}>
                {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
              </div>

              {/* Database connection badge */}
              <div style={styles.dbBadge}>
                <Database size={12} color={dbConnected ? '#10b981' : '#ef4444'} />
                <span style={{ color: dbConnected ? '#10b981' : '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                  MS Access: {dbConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.whatsappBox}>
              <Phone size={14} color="#25D366" />
              <span style={styles.whatsappNumber}>0342-3220825</span>
            </div>
            <div style={styles.whatsappBox}>
              <Phone size={14} color="#25D366" />
              <span style={styles.whatsappNumber}>0346-3486925</span>
            </div>
          </div>
        </header>

        {/* OFFLINE SYNC WARNING BANNER */}
        {queueLength > 0 && (
          <div style={styles.syncBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="#000000" />
              <span style={styles.bannerText}>
                Working Offline: <strong>{queueLength}</strong> pending clinic updates cached in LocalStorage.
              </span>
            </div>
            <button className="btn btn-secondary" style={styles.syncBtn} onClick={handleManualSync}>
              <RefreshCw size={12} style={{ marginRight: '4px' }} /> Sync Queue Now
            </button>
          </div>
        )}

        {/* VIEW CONTAINER */}
        <main style={styles.content}>
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#070708',
    color: '#e0e0e6',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#0c0c0e',
    borderRight: '1px solid rgba(212, 175, 55, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logoSection: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(212, 175, 55, 0.08)',
  },
  brandLogo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#d4af37',
    border: '2px solid #d4af37',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, rgba(0,0,0,0) 80%)',
    boxShadow: '0 0 10px rgba(212, 175, 55, 0.15)',
  },
  brandTitle: {
    display: 'flex',
    flexDirection: 'column',
  },
  mainTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    letterSpacing: '1px',
    color: '#ffffff',
  },
  subTitle: {
    fontSize: '0.65rem',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  navMenu: {
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexGrow: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    color: '#a0a0b0',
    fontSize: '0.85rem',
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    width: '100%',
  },
  navItemActive: {
    backgroundColor: '#d4af37',
    color: '#000000',
    fontWeight: 600,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    height: '50%',
    width: '4px',
    backgroundColor: '#000000',
    borderRadius: '0 4px 4px 0',
  },
  footerBrand: {
    padding: '20px',
    borderTop: '1px solid rgba(212, 175, 55, 0.08)',
    fontSize: '0.7rem',
    color: '#606070',
    textAlign: 'center',
  },
  version: {
    marginTop: '4px',
    fontWeight: 600,
    color: '#d4af37',
  },
  mainArea: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    height: '100vh',
  },
  header: {
    height: '75px',
    backgroundColor: '#0c0c0e',
    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 30px',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 600,
    margin: 0,
  },
  badgesGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: '1px solid',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  dbBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  whatsappBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: 'rgba(37, 211, 102, 0.08)',
    border: '1px solid rgba(37, 211, 102, 0.2)',
    borderRadius: '6px',
  },
  whatsappNumber: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  syncBanner: {
    backgroundColor: '#f59e0b',
    color: '#000000',
    padding: '10px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    animation: 'slideDown 0.3s ease-out',
  },
  bannerText: {
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  syncBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: '#000000',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    padding: '4px 10px',
    fontSize: '0.75rem',
  },
  content: {
    flexGrow: 1,
    padding: '30px',
    overflowY: 'auto',
    backgroundColor: '#070708',
  },
};
