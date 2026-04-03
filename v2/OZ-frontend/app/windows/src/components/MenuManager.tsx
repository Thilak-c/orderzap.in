import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex';
import MenuList from './MenuList';
import MenuForm from './MenuForm';
import './MenuManager.css';

export interface MenuItem {
  _id: string;
  pg_id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
  photo_url?: string;
  in_stock: boolean;
}

function MenuManager() {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const menuItems = useQuery(api.menu.getMenu);
  const createItem = useMutation(api.menuActions.createMenuItem);
  const updateItem = useMutation(api.menuActions.updateMenuItem);

  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSave = async (data: Omit<MenuItem, '_id' | 'pg_id'>) => {
    try {
      if (editingItem) {
        await updateItem({
          pg_id: editingItem.pg_id,
          ...data,
        });
      } else {
        await createItem(data);
      }
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to save menu item:', error);
      alert('Failed to save menu item. Please try again.');
    }
  };

  if (menuItems === undefined) {
    return <div className="loading">Loading menu...</div>;
  }

  return (
    <div className="menu-manager">
      {!showForm ? (
        <>
          <div className="menu-header">
            <h2>Menu Items ({menuItems.length})</h2>
            <button className="btn btn-primary" onClick={handleAdd}>
              + Add New Item
            </button>
          </div>
          <MenuList items={menuItems} onEdit={handleEdit} />
        </>
      ) : (
        <MenuForm
          item={editingItem}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default MenuManager;
