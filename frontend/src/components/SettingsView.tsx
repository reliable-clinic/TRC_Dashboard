import React, { useState } from 'react';
import { Database, AlertTriangle, RefreshCw, Phone, MapPin, Sparkles } from 'lucide-react';

interface SettingsViewProps {
  dbConnected: boolean;
  triggerRefresh: () => void;
}

export default function SettingsView({ dbConnected, triggerRefresh }: SettingsViewProps) {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  const [apiUrlInput, setApiUrlInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trc_api_base_url') || 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  });
  const [saveStatus, setSaveStatus] = useState('');

  const handleSaveApiUrl = () => {
    localStorage.setItem('trc_api_base_url', apiUrlInput);
    setSaveStatus('API Endpoint saved successfully! Reloading...');
    setTimeout(() => {
      setSaveStatus('');
      window.location.reload();
    }, 1200);
  };

  const handleResetDb = async () => {
    if (!confirm("WARNING: This will drop all tables and delete all patient files, clinic billing, and follow-ups. Then it will load fresh mock database records. Proceed?")) return;
    
    setResetting(true);
    setResetMessage('');
    try {
      const res = await fetch('http://localhost:5000/api/settings/reset', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setResetMessage(data.message);
        triggerRefresh();
      } else {
        setResetMessage('Failed to reset database.');
      }
    } catch (e) {
      console.error(e);
      setResetMessage('Network error occurred.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={styles.container}>
      
      {/* DB STATUS AND PATH */}
      <section className="card" style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>
          <Database size={18} color="#d4af37" style={{ marginRight: '8px' }} /> Database Configuration
        </h3>
        
        <div style={styles.infoRow}>
          <span>Engine Status:</span>
          <span style={{ fontWeight: 700, color: dbConnected ? '#10b981' : '#ef4444' }}>
            {dbConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        <div style={styles.infoRow}>
          <span>Database Path:</span>
          <code style={styles.code}>C:\Users\HP\Desktop\TRC_Dashboard\TRC_Database.accdb</code>
        </div>
        
        <div style={styles.infoRow}>
          <span>Driver:</span>
          <span style={{ color: '#ffffff' }}>Microsoft Access Driver (*.mdb, *.accdb)</span>
        </div>
      </section>

      {/* API SERVER CONNECTION SETTING */}
      <section className="card" style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>
          <RefreshCw size={18} color="#d4af37" style={{ marginRight: '8px' }} /> API Connection Settings
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#a0a0b0', lineHeight: 1.4 }}>
          Specify the API base URL. If you are accessing this dashboard online (e.g. GitHub Pages) and want to query the local database on your clinic computer, enter its local IP address or your public ngrok HTTPS address here.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
          <input
            style={{
              backgroundColor: '#0c0c0e',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: '6px',
              flexGrow: 1,
              outline: 'none',
              fontSize: '0.85rem'
            }}
            type="text"
            placeholder="e.g. http://localhost:5000"
            value={apiUrlInput}
            onChange={e => setApiUrlInput(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSaveApiUrl}>
            Save Endpoint
          </button>
        </div>
        {saveStatus && (
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{saveStatus}</span>
        )}
      </section>

      {/* CLINIC DATA PREVIEW */}
      <section className="card" style={styles.sectionCard}>
        <h3 style={styles.sectionTitle}>
          <Sparkles size={18} color="#d4af37" style={{ marginRight: '8px' }} /> Clinic Information
        </h3>

        <div style={styles.infoRow}>
          <span>Clinic Name:</span>
          <span style={{ fontWeight: 600, color: '#ffffff' }}>The Reliable Aesthetic Clinic (TRC)</span>
        </div>

        <div style={styles.infoRow}>
          <span>Primary Services:</span>
          <span style={{ color: '#ffffff' }}>Hair Transplant (FUE), Platelet-Rich Plasma (PRP) Therapy, Skin Treatment, Laser Whitening</span>
        </div>

        <div style={styles.infoRow}>
          <span>WhatsApp Contacts:</span>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} color="#25D366" /> 0346-3486925</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} color="#25D366" /> 0342-3220825</span>
          </div>
        </div>

        <div style={styles.infoRow}>
          <span>Address Details:</span>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', maxWidth: '500px', lineHeight: 1.4 }}>
            <MapPin size={14} color="#666" style={{ marginTop: '2px' }} />
            <span>Office No. 103, 1st Floor, 27th & 34th Street Corner, Touheed Commercial, DHA Phase V, Karachi</span>
          </div>
        </div>
      </section>

      {/* SYSTEM RESET & REINJECT */}
      <section className="card" style={{ ...styles.sectionCard, borderColor: '#ef4444' }}>
        <h3 style={{ ...styles.sectionTitle, color: '#ef4444' }}>
          <AlertTriangle size={18} style={{ marginRight: '8px' }} /> System Recovery & Reset
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: '#a0a0b0', marginBottom: '16px', lineHeight: 1.5 }}>
          If you want to clear all existing files or re-run the clinic dashboard demonstrating mock data (includes Ali Raza, Usman Khan records), you can click below. This will drop all MS Access tables and re-create them with default records.
        </p>

        <button 
          className="btn btn-danger" 
          disabled={resetting} 
          onClick={handleResetDb}
          style={{ width: 'fit-content' }}
        >
          {resetting ? (
            <>
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite', marginRight: '6px' }} />
              Resetting Database...
            </>
          ) : (
            'Reset & Re-load Mock Data'
          )}
        </button>

        {resetMessage && (
          <p style={{ marginTop: '14px', fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>
            {resetMessage}
          </p>
        )}
      </section>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  sectionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '1rem',
    color: '#d4af37',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '10px',
    display: 'flex',
    alignItems: 'center',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#a0a0b0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
    paddingBottom: '8px',
    alignItems: 'center',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#d4af37',
    fontSize: '0.8rem',
  },
};
