import { useMutation } from 'convex/react';
import { api } from '../convex';
import { MenuItem } from './MenuManager';
import './MenuList.css';

interface MenuListProps {
  items: MenuItem[];
  onEdit: (item: MenuItem) => void;
}

function MenuList({ items, onEdit }: MenuListProps) {
  const toggleStock = useMutation(api.menuActions.toggleStock);

  const handleToggleStock = async (pg_id: number) => {
    try {
      await toggleStock({ pg_id });
    } catch (error) {
      console.error('Failed to toggle stock:', error);
      alert('Failed to update stock status.');
    }
  };

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>No menu items yet. Click "Add New Item" to get started.</p>
      </div>
    );
  }

  return (
    <div className="menu-list">
      {items.map((item) => (
        <div key={item._id} className="menu-card">
          {item.photo_url && (
            <div className="menu-card-image">
              <img src={item.photo_url} alt={item.name} />
            </div>
          )}
          <div className="menu-card-content">
            <div className="menu-card-header">
              <h3>{item.name}</h3>
              <span className="menu-card-price">${item.price.toFixed(2)}</span>
            </div>
            <p className="menu-card-category">{item.category}</p>
            {item.description && (
              <p className="menu-card-description">{item.description}</p>
            )}
            <div className="menu-card-actions">
              <button
                className={`btn btn-stock ${item.in_stock ? 'in-stock' : 'out-of-stock'}`}
                onClick={() => handleToggleStock(item.pg_id)}
              >
                {item.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
              </button>
              <button className="btn btn-secondary" onClick={() => onEdit(item)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MenuList;
