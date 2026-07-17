import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface Purchase {
  PurchaseID: number;
  PurchaseDate: string;
  SupplierName: string;
  ItemName: string;
  Qty: number;
  UnitCost: number;
  TotalCost: number;
}

interface PurchasesViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function PurchasesView({ refreshKey, triggerRefresh }: PurchasesViewProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [form, setForm] = useState({ SupplierName: '', ItemName: '', Qty: '1', UnitCost: '' });

  useEffect(() => {
    fetchPurchases();
  }, [refreshKey]);

  useEffect(() => {
    if (showAddModal) {
      fetchInventoryItems();
    }
  }, [showAddModal]);

  const fetchPurchases = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/purchases');
      if (res.ok && res.data) setPurchases(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchInventoryItems = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/inventory');
      if (res.ok && res.data) {
        setInventoryItems(res.data);
        if (res.data.length > 0) {
          setForm(prev => ({ ...prev, ItemName: res.data[0].ItemName }));
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const purDate = new Date().toISOString();
      const qty = parseInt(form.Qty);
      const unitCost = parseFloat(form.UnitCost);
      
      const res = await syncManager.execute('http://localhost:5000/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SupplierName: form.SupplierName,
          ItemName: form.ItemName,
          Qty: qty,
          UnitCost: unitCost,
          PurchaseDate: purDate
        })
      });

      if (res.ok) {
        // Optimistically insert to local state instantly
        const tempId = Math.floor(Math.random() * 100000);
        const newPur: Purchase = {
          PurchaseID: tempId,
          PurchaseDate: purDate,
          SupplierName: form.SupplierName,
          ItemName: form.ItemName,
          Qty: qty,
          UnitCost: unitCost,
          TotalCost: qty * unitCost
        };

        setPurchases(prev => [newPur, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({ SupplierName: '', ItemName: inventoryItems[0]?.ItemName || '', Qty: '1', UnitCost: '' });
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
          <ShoppingCart size={16} color="#d4af37" />
          <span>Clinic Supply Purchases Log</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Log New Purchase
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Purchase ID</th>
              <th>Purchase Date</th>
              <th>Supplier Name</th>
              <th>Item Name</th>
              <th>Qty Purchased</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>No purchase transactions logged.</td>
              </tr>
            ) : (
              purchases.map(pur => (
                <tr key={pur.PurchaseID}>
                  <td>PUR-{String(pur.PurchaseID).padStart(5, '0')}</td>
                  <td>{formatDate(pur.PurchaseDate)}</td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{pur.SupplierName}</td>
                  <td style={{ color: '#d4af37', fontWeight: 600 }}>{pur.ItemName}</td>
                  <td>{pur.Qty}</td>
                  <td>Rs. {pur.UnitCost.toLocaleString()}</td>
                  <td style={{ color: '#ef4444', fontWeight: 600 }}>Rs. {pur.TotalCost.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* LOG PURCHASE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Log Supplier Purchase Entry
            </h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Supplier Name</label>
                <input className="form-input" type="text" required placeholder="e.g. Al-Med Distributors" value={form.SupplierName} onChange={e => setForm({...form, SupplierName: e.target.value})} />
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Item Name</label>
                  <select className="form-select" required value={form.ItemName} onChange={e => setForm({...form, ItemName: e.target.value})}>
                    <option value="">Select Item...</option>
                    {inventoryItems.map(item => (
                      <option key={item.ItemID} value={item.ItemName}>{item.ItemName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Qty</label>
                  <input className="form-input" type="number" required min={1} value={form.Qty} onChange={e => setForm({...form, Qty: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Cost (Rs.)</label>
                  <input className="form-input" type="number" required min={0} value={form.UnitCost} onChange={e => setForm({...form, UnitCost: e.target.value})} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Purchase</button>
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
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
    borderTop: '1px solid rgba(212, 175, 55, 0.1)',
    paddingTop: '16px',
  },
};
