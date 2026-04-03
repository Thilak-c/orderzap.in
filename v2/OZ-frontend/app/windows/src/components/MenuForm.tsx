import { useState, useEffect } from 'react';
import { MenuItem } from './MenuManager';
import './MenuForm.css';

interface MenuFormProps {
  item: MenuItem | null;
  onSave: (data: Omit<MenuItem, '_id' | 'pg_id'>) => void;
  onCancel: () => void;
}

function MenuForm({ item, onSave, onCancel }: MenuFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    photo_url: '',
    in_stock: true,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        price: item.price.toString(),
        category: item.category,
        description: item.description || '',
        photo_url: item.photo_url || '',
        in_stock: item.in_stock,
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price || !formData.category.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price');
      return;
    }

    onSave({
      name: formData.name.trim(),
      price,
      category: formData.category.trim(),
      description: formData.description.trim() || undefined,
      photo_url: formData.photo_url.trim() || undefined,
      in_stock: formData.in_stock,
    });
  };

  return (
    <div className="menu-form-container">
      <h2>{item ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
      <form className="menu-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Margherita Pizza"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Pizza, Drinks"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description of the item"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="photo_url">Photo URL</label>
          <input
            type="url"
            id="photo_url"
            value={formData.photo_url}
            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.in_stock}
              onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
            />
            <span>In Stock</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {item ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MenuForm;
