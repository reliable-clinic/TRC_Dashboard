import React, { useState, useEffect } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { syncManager } from '../utils/syncManager';

interface Expense {
  ExpenseID: number;
  ExpenseDate: string;
  ExpenseType: string;
  Amount: number;
  Remarks: string;
}

interface ExpensesViewProps {
  refreshKey: number;
  triggerRefresh: () => void;
}

export default function ExpensesView({ refreshKey, triggerRefresh }: ExpensesViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ ExpenseType: 'Rent', Amount: '', Remarks: '' });

  useEffect(() => {
    fetchExpenses();
  }, [refreshKey]);

  const fetchExpenses = async () => {
    try {
      const res = await syncManager.execute('http://localhost:5000/api/expenses');
      if (res.ok && res.data) setExpenses(res.data);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expDate = new Date().toISOString();
      const amount = parseFloat(form.Amount) || 0.0;
      
      const res = await syncManager.execute('http://localhost:5000/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ExpenseType: form.ExpenseType,
          Amount: amount,
          Remarks: form.Remarks,
          ExpenseDate: expDate
        })
      });

      if (res.ok) {
        // Optimistically insert to local state instantly
        const tempId = Math.floor(Math.random() * 100000);
        const newExp: Expense = {
          ExpenseID: tempId,
          ExpenseDate: expDate,
          ExpenseType: form.ExpenseType,
          Amount: amount,
          Remarks: form.Remarks
        };

        setExpenses(prev => [newExp, ...prev]);
        setShowAddModal(false);
        triggerRefresh();
        setForm({ ExpenseType: 'Rent', Amount: '', Remarks: '' });
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
          <DollarSign size={16} color="#d4af37" />
          <span>Clinic Expenses Logs</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Log Expense
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Expense ID</th>
              <th>Expense Date</th>
              <th>Expense Type</th>
              <th>Amount Spent</th>
              <th>Remarks / Description</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>No expenses logged.</td>
              </tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.ExpenseID}>
                  <td>EXP-{String(exp.ExpenseID).padStart(5, '0')}</td>
                  <td>{formatDate(exp.ExpenseDate)}</td>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{exp.ExpenseType}</td>
                  <td style={{ color: '#ef4444', fontWeight: 600 }}>Rs. {exp.Amount.toLocaleString()}</td>
                  <td style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>{exp.Remarks || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* LOG EXPENSE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid rgba(212, 175, 55, 0.2)', paddingBottom: '12px', marginBottom: '20px', color: '#d4af37' }}>
              Log Clinic Expense
            </h3>
            <form onSubmit={handleCreate}>
              <div style={styles.formGrid}>
                <div className="form-group">
                  <label className="form-label">Expense Category</label>
                  <select className="form-select" value={form.ExpenseType} onChange={e => setForm({...form, ExpenseType: e.target.value})}>
                    <option value="Rent">Clinic Monthly Rent</option>
                    <option value="Electricity Bill">Electricity Bill</option>
                    <option value="Salaries">Staff Salaries</option>
                    <option value="Refreshments">Refreshments / Tea</option>
                    <option value="Marketing">Marketing / Ads</option>
                    <option value="Supplies Purchase">Medical Supplies / Consumables</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (Rs.)</label>
                  <input className="form-input" type="number" required min={0} value={form.Amount} onChange={e => setForm({...form, Amount: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks / Description</label>
                <textarea className="form-textarea" rows={3} placeholder="Provide details (e.g. rent month, check details, receipt numbers...)" value={form.Remarks} onChange={e => setForm({...form, Remarks: e.target.value})} />
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
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
