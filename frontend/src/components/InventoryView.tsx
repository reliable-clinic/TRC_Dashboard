import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, AlertTriangle, CheckCircle } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface InventoryItem {
  ItemID: number;
  ItemName: string;
  OpeningStock: number;
  PurchasedQty: number;
  UsedQty: number;
  ClosingStock: number;
  MinStock: number;
}

interface InventoryViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function InventoryView({ refreshKey, triggerRefresh }: InventoryViewProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [form, setForm] = useState({ ItemName: '', OpeningStock: '0', PurchasedQty: '0', UsedQty: '0', MinStock: '10' });

  useEffect(() => {
    fetchInventory();
  }, [refreshKey]);

  const fetchInventory = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/inventory');
      if (res.ok && res.data) setItems(res.data);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const opStock = parseInt(form.OpeningStock) || 0;
      const purQty = parseInt(form.PurchasedQty) || 0;
      const usdQty = parseInt(form.UsedQty) || 0;
      const minStock = parseInt(form.MinStock) || 10;

      const res = await syncManager.execute('http://localhost:5000/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ItemName: form.ItemName,
          OpeningStock: opStock,
          PurchasedQty: purQty,
          UsedQty: usdQty,
          MinStock: minStock
        })
      });

      if (res.ok) {
        // Optimistically insert to local state instantly
        const tempId = Math.floor(Math.random() * 100000);
        const newItem: InventoryItem = {
          ItemID: tempId,
          ItemName: form.ItemName,
          OpeningStock: opStock,
          PurchasedQty: purQty,
          UsedQty: usdQty,
          ClosingStock: opStock + purQty - usdQty,
          MinStock: minStock
        };

        setItems(prev => [...prev, newItem].sort((a, b) => a.ItemName.localeCompare(b.ItemName)));
        setShowAddModal(false);
        triggerRefresh();
        setForm({ ItemName: '', OpeningStock: '0', PurchasedQty: '0', UsedQty: '0', MinStock: '10' });
      }
    } catch (e) { console.error(e); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/inventory/${editingItem.ItemID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        // Mutate local state instantly
        setItems(prev => prev.map(item => item.ItemID === editingItem.ItemID ? {
          ...editingItem,
          ClosingStock: editingItem.OpeningStock + editingItem.PurchasedQty - editingItem.UsedQty
        } : item));
        setEditingItem(null);
        triggerRefresh();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      const res = await syncManager.execute(`http://localhost:5000/api/inventory/${itemId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Mutate local state instantly
        setItems(prev => prev.filter(item => item.ItemID !== itemId));
        triggerRefresh();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.topBar}>
        <div style={styles.infoBadge}>
          <Package size={16} color="#d4af37" />
          <span>Stock & Inventory Management</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add New Item
        </button>
      </div>

      {/* INVENTORY STOCKS GRID */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Opening Stock</th>
              <th>Purchased Qty</th>
              <th>Used Qty</th>
              <th>Closing Stock</th>
              <th>Min Limit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>No inventory items found.</td>
              </tr>
            ) : (
              items.map(item => {
                const isLow = item.ClosingStock < item.MinStock;
                return (
                  <tr key={item.ItemID}>
                    <td>TRC-ITM-{String(item.ItemID).padStart(4, '0')}</td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{item.ItemName}</td>
                    <td>{item.OpeningStock}</td>
                    <td>{item.PurchasedQty}</td>
                    <td>{item.UsedQty}</td>
                    <td style={{ fontWeight: 700, color: isLow ? '#ef4444' : '#10b981', fontSize: '1rem' }}>
                      {item.ClosingStock}
                    </td>
                    <td>{item.MinStock}</td>
                    <td>
                      {isLow ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                          <AlertTriangle size={12} /> LOW STOCK
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle size={12} /> IN STOCK
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={styles.actionBtn} onClick={() => setEditingItem(item)} title="Edit Stock Limit">
                          <Edit2 size={12} color="#3b82f6" />
                        </button>
                        <button style={styles.actionBtn} onClick={() => handleDelete(item.ItemID)} title="Remove Item">
                          <AlertTriangle size={12} color="#606070" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Add New Inventory Item
            </h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input className="form-input" type="text" required placeholder="e.g. PRP Kit, Anesthesia, Graft Punch" value={form.ItemName} onChange={e => setForm({...form, ItemName: e.target.value})} />
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Opening Stock</label>
                  <input className="form-input" type="number" required min={0} value={form.OpeningStock} onChange={e => setForm({...form, OpeningStock: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchased Qty</label>
                  <input className="form-input" type="number" required min={0} value={form.PurchasedQty} onChange={e => setForm({...form, PurchasedQty: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Used Qty</label>
                  <input className="form-input" type="number" required min={0} value={form.UsedQty} onChange={e => setForm({...form, UsedQty: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Alert Stock</label>
                  <input className="form-input" type="number" required min={1} value={form.MinStock} onChange={e => setForm({...form, MinStock: e.target.value})} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Edit Inventory Stock & Limits
            </h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Item Name</label>
                <input className="form-input" type="text" required value={editingItem.ItemName} onChange={e => setEditingItem({...editingItem, ItemName: e.target.value})} />
              </div>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Opening Stock</label>
                  <input className="form-input" type="number" required min={0} value={editingItem.OpeningStock} onChange={e => setEditingItem({...editingItem, OpeningStock: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchased Qty</label>
                  <input className="form-input" type="number" required min={0} value={editingItem.PurchasedQty} onChange={e => setEditingItem({...editingItem, PurchasedQty: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Used Qty</label>
                  <input className="form-input" type="number" required min={0} value={editingItem.UsedQty} onChange={e => setEditingItem({...editingItem, UsedQty: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Alert Stock</label>
                  <input className="form-input" type="number" required min={1} value={editingItem.MinStock} onChange={e => setEditingItem({...editingItem, MinStock: parseInt(e.target.value) || 10})} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Item</button>
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
