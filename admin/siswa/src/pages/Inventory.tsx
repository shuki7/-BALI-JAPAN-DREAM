import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  getInventory, 
  addInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem 
} from '../lib/firestore';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';
import type { InventoryItem, InventoryCategory } from '../lib/types';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 13,
  color: '#333',
  boxSizing: 'border-box' as const,
};

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, color, background: bg }}>
      {children}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 500, maxWidth: '95vw', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Inventory() {
  const { language } = useLanguage();
  const t = translations[language];
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<InventoryCategory | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<InventoryItem | null>(null);
  const [showStockModal, setShowStockModal] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'textbook',
    stock: 0,
    unit: 'pcs',
    minimumStock: 5,
  });

  const [editItem, setEditItem] = useState<Partial<InventoryItem>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventory,
  });

  const addMutation = useMutation({
    mutationFn: addInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowAddModal(false);
      setNewItem({ name: '', category: 'textbook', stock: 0, unit: 'pcs', minimumStock: 5 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) => updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowStockModal(null);
      setShowEditModal(null);
      setStockAdjustment(0);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(i => i.category === activeCategory);

  if (isLoading) return <div style={{ color: '#888' }}>{t.loading}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{t.inventory_management}</h2>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ padding: '10px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          + {t.add_item}
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { id: 'all', label: t.all_categories },
          { id: 'textbook', label: t.textbook },
          { id: 'uniform', label: t.uniform },
          { id: 'other', label: t.other },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              background: activeCategory === cat.id ? '#CC0000' : '#fff',
              color: activeCategory === cat.id ? '#fff' : '#666',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>{t.item_name}</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>{t.category}</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>{t.stock_count}</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>{t.last_updated}</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 12, color: '#666', textTransform: 'uppercase' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item: InventoryItem) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  {item.location && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {item.location}</div>}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <Badge 
                    color={item.category === 'textbook' ? '#1e40af' : item.category === 'uniform' ? '#92400e' : '#6b7280'} 
                    bg={item.category === 'textbook' ? '#dbeafe' : item.category === 'uniform' ? '#fef3c7' : '#f3f4f6'}
                  >
                    {t[item.category]}
                  </Badge>
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.stock <= item.minimumStock ? '#CC0000' : '#1A1A1A' }}>
                    {item.stock} <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{item.unit}</span>
                  </div>
                  {item.stock <= item.minimumStock && (
                    <div style={{ fontSize: 10, color: '#CC0000', fontWeight: 700, marginTop: 4 }}>⚠️ {t.stock_warning}</div>
                  )}
                </td>
                <td style={{ padding: '16px 20px', fontSize: 12, color: '#666' }}>
                  {format(item.updatedAt, 'yyyy/MM/dd HH:mm')}
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setEditItem(item); setShowEditModal(item); }}
                      style={{ padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                    >
                      {t.edit}
                    </button>
                    <button
                      onClick={() => setShowStockModal(item)}
                      style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {t.update_stock}
                    </button>
                    <button
                      onClick={() => { if(confirm(t.confirm_delete)) deleteMutation.mutate(item.id); }}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {t.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#aaa' }}>
            {t.item_not_found}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <Modal title={t.add_item} onClose={() => setShowAddModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{t.item_name}</label>
              <input 
                value={newItem.name} 
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} 
                style={inputStyle} 
                placeholder="Genki Vol 1, Seragam Putih L, dsb."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{t.category}</label>
              <select 
                value={newItem.category} 
                onChange={e => setNewItem(p => ({ ...p, category: e.target.value as any }))} 
                style={inputStyle}
              >
                <option value="textbook">{t.textbook}</option>
                <option value="uniform">{t.uniform}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{t.stock_count}</label>
                <input 
                  type="number" 
                  value={newItem.stock} 
                  onChange={e => setNewItem(p => ({ ...p, stock: Number(e.target.value) }))} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{t.unit}</label>
                <input 
                  value={newItem.unit} 
                  onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} 
                  style={inputStyle} 
                  placeholder="pcs, set, book"
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{t.min_stock} (⚠️)</label>
              <input 
                type="number" 
                value={newItem.minimumStock} 
                onChange={e => setNewItem(p => ({ ...p, minimumStock: Number(e.target.value) }))} 
                style={inputStyle} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
              <button 
                onClick={() => addMutation.mutate(newItem)} 
                style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && (
        <Modal title={`${t.update_stock}: ${showStockModal.name}`} onClose={() => setShowStockModal(null)}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>{t.current_stock}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#1A1A1A' }}>{showStockModal.stock} {showStockModal.unit}</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
            <button 
              onClick={() => setStockAdjustment(p => p - 1)}
              style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid #ddd', background: '#fff', fontSize: 24, cursor: 'pointer' }}
            >
              -
            </button>
            <input 
              type="number" 
              value={stockAdjustment} 
              onChange={e => setStockAdjustment(Number(e.target.value))}
              style={{ ...inputStyle, width: 80, textAlign: 'center', fontSize: 20, fontWeight: 700 }}
            />
            <button 
              onClick={() => setStockAdjustment(p => p + 1)}
              style={{ width: 44, height: 44, borderRadius: 22, border: '1px solid #ddd', background: '#fff', fontSize: 24, cursor: 'pointer' }}
            >
              +
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowStockModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button 
              onClick={() => updateMutation.mutate({ 
                id: showStockModal.id, 
                data: { stock: showStockModal.stock + stockAdjustment } 
              })} 
              style={{ padding: '8px 24px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.update_stock}
            </button>
          </div>
        </Modal>
      )}
      {showEditModal && (
        <Modal title={language === 'ja' ? '在庫情報を編集' : 'Edit Info Stok'} onClose={() => setShowEditModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.item_name}</label>
              <input value={editItem.name} onChange={e => setEditItem(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>カテゴリー</label>
              <select value={editItem.category} onChange={e => setEditItem(p => ({ ...p, category: e.target.value as any }))} style={inputStyle}>
                <option value="textbook">{t.textbook}</option>
                <option value="uniform">{t.uniform}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.unit}</label>
              <input value={editItem.unit} onChange={e => setEditItem(p => ({ ...p, unit: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>{t.min_stock}</label>
              <input type="number" value={editItem.minimumStock} onChange={e => setEditItem(p => ({ ...p, minimumStock: Number(e.target.value) }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={() => setShowEditModal(null)} style={{ padding: '8px 20px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>{t.cancel}</button>
            <button 
              onClick={() => updateMutation.mutate({ id: showEditModal.id, data: editItem })}
              style={{ padding: '8px 20px', background: '#CC0000', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
            >
              {t.save}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
