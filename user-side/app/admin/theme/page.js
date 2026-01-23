'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Home, UtensilsCrossed, ShoppingCart, ClipboardList, Settings, X, Check } from 'lucide-react';
import MenuItemImage from '@/components/MenuItemImage';

// Page templates
const pageTemplates = [
  { id: 'home', name: 'Home Page', icon: Home },
  { id: 'menu', name: 'Menu Page', icon: UtensilsCrossed },
  { id: 'cart', name: 'Cart Page', icon: ShoppingCart },
  { id: 'status', name: 'Order Status', icon: ClipboardList },
];

export default function ThemePage() {
  const settings = useQuery(api.settings.getAll);
  const updateSetting = useMutation(api.settings.set);
  
  // Load real data
  const menuItems = useQuery(api.menuItems.list);
  const orders = useQuery(api.orders.list);
  
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [saved, setSaved] = useState(false);
  
  // Theme state - load from settings
  const [theme, setTheme] = useState({
    primaryColor: '#000000',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    borderColor: '#e5e5e5',
    buttonBorderRadius: '0px',
    buttonPadding: '12px 24px',
    buttonFontSize: '14px',
    buttonFontWeight: '600',
    buttonBorderWidth: '0px',
    buttonStyle: 'solid',
    cardBorderRadius: '0px',
    cardPadding: '16px',
    cardBorderWidth: '1px',
    cardShadow: 'none',
    headingFontSize: '24px',
    headingFontWeight: '700',
    headingColor: '#000000',
    bodyFontSize: '14px',
    bodyFontWeight: '400',
    bodyColor: '#000000',
    secondaryTextColor: '#666666',
    spacing: '16px',
    imageBorderRadius: '0px',
  });

  // Update theme when settings load
  React.useEffect(() => {
    if (settings) {
      setTheme({
        primaryColor: settings.theme_primaryColor || '#000000',
        backgroundColor: settings.theme_backgroundColor || '#ffffff',
        textColor: settings.theme_textColor || '#000000',
        borderColor: settings.theme_borderColor || '#e5e5e5',
        buttonBorderRadius: settings.theme_buttonBorderRadius || '0px',
        buttonPadding: settings.theme_buttonPadding || '12px 24px',
        buttonFontSize: settings.theme_buttonFontSize || '14px',
        buttonFontWeight: settings.theme_buttonFontWeight || '600',
        buttonBorderWidth: settings.theme_buttonBorderWidth || '0px',
        buttonStyle: settings.theme_buttonStyle || 'solid',
        cardBorderRadius: settings.theme_cardBorderRadius || '0px',
        cardPadding: settings.theme_cardPadding || '16px',
        cardBorderWidth: settings.theme_cardBorderWidth || '1px',
        cardShadow: settings.theme_cardShadow || 'none',
        headingFontSize: settings.theme_headingFontSize || '24px',
        headingFontWeight: settings.theme_headingFontWeight || '700',
        headingColor: settings.theme_headingColor || '#000000',
        bodyFontSize: settings.theme_bodyFontSize || '14px',
        bodyFontWeight: settings.theme_bodyFontWeight || '400',
        bodyColor: settings.theme_bodyColor || '#000000',
        secondaryTextColor: settings.theme_secondaryTextColor || '#666666',
        spacing: settings.theme_spacing || '16px',
        imageBorderRadius: settings.theme_imageBorderRadius || '0px',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    for (const [key, value] of Object.entries(theme)) {
      await updateSetting({ key: `theme_${key}`, value: String(value) });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaultTheme = {
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      borderColor: '#e5e5e5',
      buttonBorderRadius: '0px',
      buttonPadding: '12px 24px',
      buttonFontSize: '14px',
      buttonFontWeight: '600',
      buttonBorderWidth: '0px',
      buttonStyle: 'solid',
      cardBorderRadius: '0px',
      cardPadding: '16px',
      cardBorderWidth: '1px',
      cardShadow: 'none',
      headingFontSize: '24px',
      headingFontWeight: '700',
      headingColor: '#000000',
      bodyFontSize: '14px',
      bodyFontWeight: '400',
      bodyColor: '#000000',
      secondaryTextColor: '#666666',
      spacing: '16px',
      imageBorderRadius: '0px',
    };
    setTheme(defaultTheme);
  };

  const handleElementClick = (elementType) => {
    setSelectedElement(elementType);
  };

  if (!selectedPage) {
    return (
      <div className="min-h-screen bg-[--bg] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[--text-primary] mb-2">Theme Customization</h1>
            <p className="text-[--text-muted] text-sm">
              Select a page to customize its design elements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pageTemplates.map((page) => {
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  onClick={() => setSelectedPage(page.id)}
                  className="bg-[--card] border border-[--border] rounded-xl p-6 hover:border-[--primary] transition-all group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[--primary]/10 rounded-xl flex items-center justify-center group-hover:bg-[--primary]/20 transition-colors">
                      <Icon size={32} className="text-[--primary]" />
                    </div>
                    <h3 className="font-semibold text-[--text-primary]">{page.name}</h3>
                    <p className="text-xs text-[--text-muted]">Click to customize</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--bg] flex">
      {/* Left Panel - Preview */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedPage(null);
              setSelectedElement(null);
            }}
            className="flex items-center gap-2 text-[--text-muted] hover:text-[--text-primary]"
          >
            ← Back to Pages
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-[--border] rounded-lg text-[--text-secondary] hover:border-[--primary] hover:text-[--primary] transition-colors"
            >
              Reset Theme
            </button>
            <button
              onClick={handleSave}
              className="bg-[--primary] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {saved ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="bg-white border-2 border-dashed border-[--border] rounded-xl p-6 max-w-md mx-auto">
          {selectedPage === 'home' && <HomePagePreview theme={theme} onElementClick={handleElementClick} selectedElement={selectedElement} />}
          {selectedPage === 'menu' && <MenuPagePreview theme={theme} onElementClick={handleElementClick} selectedElement={selectedElement} menuItems={menuItems?.slice(0, 4)} />}
          {selectedPage === 'cart' && <CartPagePreview theme={theme} onElementClick={handleElementClick} selectedElement={selectedElement} menuItems={menuItems?.slice(0, 2)} />}
          {selectedPage === 'status' && <StatusPagePreview theme={theme} onElementClick={handleElementClick} selectedElement={selectedElement} orders={orders?.slice(0, 2)} />}
        </div>
      </div>

      {/* Right Panel - Controls */}
      <div className="w-80 bg-[--card] border-l border-[--border] p-6 overflow-auto">
        {selectedElement ? (
          <ElementEditor
            elementType={selectedElement}
            theme={theme}
            setTheme={setTheme}
            onClose={() => setSelectedElement(null)}
          />
        ) : (
          <div className="text-center py-12">
            <Settings size={48} className="text-[--text-dim] mx-auto mb-4" />
            <p className="text-[--text-muted] text-sm">
              Click on any element in the preview to customize it
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Home Page Preview Component
function HomePagePreview({ theme, onElementClick, selectedElement }) {
  return (
    <div style={{ backgroundColor: theme.backgroundColor }} className="space-y-6 p-6">
      <div 
        onClick={() => onElementClick('heading')}
        className={`cursor-pointer hover:ring-2 hover:ring-[--primary] rounded p-2 ${selectedElement === 'heading' ? 'ring-2 ring-[--primary]' : ''}`}
      >
        <h1 style={{ fontSize: theme.headingFontSize, fontWeight: theme.headingFontWeight, color: theme.headingColor }}>
          Welcome back
        </h1>
        <p 
          onClick={(e) => { e.stopPropagation(); onElementClick('text'); }}
          className={`${selectedElement === 'text' ? 'ring-2 ring-purple-500' : ''}`}
          style={{ fontSize: theme.bodyFontSize, fontWeight: theme.bodyFontWeight, color: theme.secondaryTextColor }}
        >
          Scan the QR code on your table to get started
        </p>
      </div>

      <div 
        onClick={() => onElementClick('card')}
        className={`cursor-pointer hover:ring-2 hover:ring-[--primary] ${selectedElement === 'card' ? 'ring-2 ring-[--primary]' : ''}`}
        style={{
          borderRadius: theme.cardBorderRadius,
          padding: theme.cardPadding,
          border: `${theme.cardBorderWidth} solid ${theme.borderColor}`,
          boxShadow: theme.cardShadow
        }}
      >
        <h3 style={{ fontSize: theme.bodyFontSize, fontWeight: '600', color: theme.bodyColor }}>Scan QR Code</h3>
        <p style={{ fontSize: '12px', color: theme.secondaryTextColor }}>Scan the code on your table</p>
      </div>

      <button
        onClick={() => onElementClick('button')}
        className={`w-full cursor-pointer hover:ring-2 hover:ring-blue-500 ${selectedElement === 'button' ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          backgroundColor: theme.buttonStyle === 'solid' ? theme.primaryColor : 'transparent',
          color: theme.buttonStyle === 'solid' ? '#ffffff' : theme.primaryColor,
          border: theme.buttonStyle === 'ghost' ? 'none' : `${theme.buttonBorderWidth || '2px'} solid ${theme.primaryColor}`,
          borderRadius: theme.buttonBorderRadius,
          padding: theme.buttonPadding,
          fontSize: theme.buttonFontSize,
          fontWeight: theme.buttonFontWeight,
        }}
      >
        Primary Button
      </button>
    </div>
  );
}

// Menu Page Preview with Real Data
function MenuPagePreview({ theme, onElementClick, selectedElement, menuItems }) {
  return (
    <div style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }} className="space-y-6 p-6">
      <div 
        onClick={() => onElementClick('heading')}
        className={`cursor-pointer hover:ring-2 hover:ring-[--primary] rounded p-2 ${selectedElement === 'heading' ? 'ring-2 ring-[--primary]' : ''}`}
      >
        <h1 style={{ fontSize: theme.headingFontSize, fontWeight: theme.headingFontWeight }}>
          Menu
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {menuItems && menuItems.length > 0 ? menuItems.map((item) => (
          <div
            key={item._id}
            onClick={() => onElementClick('card')}
            className={`cursor-pointer hover:ring-2 hover:ring-[--primary] ${selectedElement === 'card' ? 'ring-2 ring-[--primary]' : ''}`}
            style={{
              borderRadius: theme.cardBorderRadius,
              padding: theme.cardPadding,
              border: `${theme.cardBorderWidth} solid ${theme.borderColor}`,
              boxShadow: theme.cardShadow
            }}
          >
            <div 
              onClick={(e) => { e.stopPropagation(); onElementClick('image'); }}
              className={`w-full h-32 bg-gray-200 mb-3 overflow-hidden ${selectedElement === 'image' ? 'ring-2 ring-green-500' : ''}`}
              style={{ borderRadius: theme.imageBorderRadius }}
            >
              {item.image && <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />}
            </div>
            <h3 style={{ fontSize: theme.bodyFontSize, fontWeight: '600' }}>{item.name}</h3>
            <p style={{ fontSize: '12px', opacity: 0.7 }} className="line-clamp-1">{item.description}</p>
            <p style={{ fontSize: theme.bodyFontSize, fontWeight: '700', color: theme.primaryColor }}>₹{item.price}</p>
          </div>
        )) : (
          <div className="col-span-2 text-center text-[--text-muted] py-8">
            No menu items found. Add items in Menu section.
          </div>
        )}
      </div>

      <button
        onClick={() => onElementClick('button')}
        className={`w-full cursor-pointer hover:ring-2 hover:ring-blue-500 ${selectedElement === 'button' ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          backgroundColor: theme.buttonStyle === 'solid' ? theme.primaryColor : 'transparent',
          color: theme.buttonStyle === 'solid' ? '#ffffff' : theme.primaryColor,
          border: theme.buttonStyle === 'ghost' ? 'none' : `${theme.buttonBorderWidth || '2px'} solid ${theme.primaryColor}`,
          borderRadius: theme.buttonBorderRadius,
          padding: theme.buttonPadding,
          fontSize: theme.buttonFontSize,
          fontWeight: theme.buttonFontWeight,
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}

// Cart Page Preview with Real Data
function CartPagePreview({ theme, onElementClick, selectedElement, menuItems }) {
  return (
    <div style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }} className="space-y-6 p-6">
      <div 
        onClick={() => onElementClick('heading')}
        className={`cursor-pointer hover:ring-2 hover:ring-[--primary] rounded p-2 ${selectedElement === 'heading' ? 'ring-2 ring-[--primary]' : ''}`}
      >
        <h1 style={{ fontSize: theme.headingFontSize, fontWeight: theme.headingFontWeight }}>
          Your Cart
        </h1>
      </div>

      {menuItems && menuItems.length > 0 ? menuItems.map((item) => (
        <div
          key={item._id}
          onClick={() => onElementClick('card')}
          className={`cursor-pointer hover:ring-2 hover:ring-[--primary] ${selectedElement === 'card' ? 'ring-2 ring-[--primary]' : ''}`}
          style={{
            borderRadius: theme.cardBorderRadius,
            padding: theme.cardPadding,
            border: `${theme.cardBorderWidth} solid ${theme.borderColor}`,
            boxShadow: theme.cardShadow
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 bg-gray-200 overflow-hidden"
              style={{ borderRadius: theme.imageBorderRadius }}
            >
              {item.image && <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <h3 style={{ fontSize: theme.bodyFontSize, fontWeight: '600' }}>{item.name}</h3>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Quantity: 2</p>
            </div>
            <p style={{ fontSize: theme.bodyFontSize, fontWeight: '700', color: theme.primaryColor }}>₹{item.price * 2}</p>
          </div>
        </div>
      )) : (
        <div className="text-center text-[--text-muted] py-8">
          Cart is empty
        </div>
      )}

      <button
        onClick={() => onElementClick('button')}
        className={`w-full cursor-pointer hover:ring-2 hover:ring-blue-500 ${selectedElement === 'button' ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          backgroundColor: theme.buttonStyle === 'solid' ? theme.primaryColor : 'transparent',
          color: theme.buttonStyle === 'solid' ? '#ffffff' : theme.primaryColor,
          border: theme.buttonStyle === 'ghost' ? 'none' : `${theme.buttonBorderWidth || '2px'} solid ${theme.primaryColor}`,
          borderRadius: theme.buttonBorderRadius,
          padding: theme.buttonPadding,
          fontSize: theme.buttonFontSize,
          fontWeight: theme.buttonFontWeight,
        }}
      >
        Checkout
      </button>
    </div>
  );
}

// Status Page Preview with Real Data
function StatusPagePreview({ theme, onElementClick, selectedElement, orders }) {
  const statusMap = {
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed'
  };

  const statusColors = {
    pending: '#fca5a5',
    preparing: '#93c5fd',
    ready: '#86efac',
    completed: '#d4d4d8'
  };

  return (
    <div style={{ backgroundColor: theme.backgroundColor }} className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div 
          onClick={() => onElementClick('heading')}
          className={`cursor-pointer hover:ring-2 hover:ring-[--primary] rounded p-2 ${selectedElement === 'heading' ? 'ring-2 ring-[--primary]' : ''}`}
        >
          <h1 style={{ fontSize: theme.headingFontSize, fontWeight: theme.headingFontWeight, color: theme.headingColor }}>
            Order Status
          </h1>
        </div>
        <button
          onClick={() => onElementClick('button')}
          className={`cursor-pointer hover:ring-2 hover:ring-blue-500 text-sm ${selectedElement === 'button' ? 'ring-2 ring-blue-500' : ''}`}
          style={{
            color: theme.primaryColor,
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          + New Order
        </button>
      </div>

      {orders && orders.length > 0 ? (
        <>
          <div className="text-xs uppercase tracking-wider" style={{ color: theme.secondaryTextColor }}>
            ACTIVE ORDERS
          </div>
          {orders.slice(0, 1).map((order) => (
            <div
              key={order._id}
              onClick={() => onElementClick('card')}
              className={`cursor-pointer hover:ring-2 hover:ring-[--primary] overflow-hidden ${selectedElement === 'card' ? 'ring-2 ring-[--primary]' : ''}`}
              style={{
                borderRadius: theme.cardBorderRadius,
                border: `${theme.cardBorderWidth} solid ${theme.borderColor}`,
                boxShadow: theme.cardShadow
              }}
            >
              {/* Progress bar */}
              <div style={{ height: '4px', backgroundColor: theme.primaryColor, width: '100%' }} />
              
              <div style={{ padding: theme.cardPadding }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 
                    onClick={(e) => { e.stopPropagation(); onElementClick('text'); }}
                    className={`${selectedElement === 'text' ? 'ring-2 ring-purple-500' : ''}`}
                    style={{ fontSize: theme.bodyFontSize, fontWeight: '600', color: theme.bodyColor }}
                  >
                    Order #{order._id.slice(-4)}
                  </h3>
                  <span 
                    style={{ 
                      fontSize: '12px', 
                      padding: '4px 12px', 
                      borderRadius: theme.buttonBorderRadius,
                      backgroundColor: statusColors[order.status] || '#d4d4d8',
                      color: theme.bodyColor
                    }}
                  >
                    {statusMap[order.status] || order.status}
                  </span>
                </div>
                <p 
                  onClick={(e) => { e.stopPropagation(); onElementClick('text'); }}
                  className={`${selectedElement === 'text' ? 'ring-2 ring-purple-500' : ''}`}
                  style={{ fontSize: '12px', color: theme.secondaryTextColor, marginBottom: '12px' }}
                >
                  Table {order.tableId}
                </p>
                
                {/* Item thumbnails */}
                <div className="flex gap-2 mb-3">
                  {order.items?.slice(0, 3).map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); onElementClick('image'); }}
                      className={`w-12 h-12 bg-gray-200 overflow-hidden ${selectedElement === 'image' ? 'ring-2 ring-green-500' : ''}`}
                      style={{ borderRadius: theme.imageBorderRadius }}
                    >
                      {item.image && <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div 
                      className="w-12 h-12 bg-gray-200 flex items-center justify-center"
                      style={{ borderRadius: theme.imageBorderRadius, fontSize: '10px', color: theme.bodyColor }}
                    >
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span 
                    onClick={(e) => { e.stopPropagation(); onElementClick('text'); }}
                    className={`${selectedElement === 'text' ? 'ring-2 ring-purple-500' : ''}`}
                    style={{ fontSize: '12px', color: theme.secondaryTextColor }}
                  >
                    {new Date(order._creationTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: theme.bodyFontSize, fontWeight: '700', color: theme.primaryColor }}>
                    ₹{order.total}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {orders.length > 1 && (
            <>
              <div className="text-xs uppercase tracking-wider" style={{ color: theme.secondaryTextColor }}>
                ORDER HISTORY
              </div>
              {orders.slice(1).map((order) => (
                <div
                  key={order._id}
                  onClick={() => onElementClick('card')}
                  className={`cursor-pointer hover:ring-2 hover:ring-[--primary] ${selectedElement === 'card' ? 'ring-2 ring-[--primary]' : ''}`}
                  style={{
                    borderRadius: theme.cardBorderRadius,
                    padding: theme.cardPadding,
                    border: `${theme.cardBorderWidth} solid ${theme.borderColor}`,
                    boxShadow: theme.cardShadow,
                    opacity: 0.7
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 style={{ fontSize: theme.bodyFontSize, fontWeight: '600', color: theme.bodyColor }}>#{order._id.slice(-4)}</h3>
                      <p style={{ fontSize: '11px', color: theme.secondaryTextColor }}>
                        {new Date(order._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '12px', 
                        padding: '4px 12px', 
                        borderRadius: theme.buttonBorderRadius,
                        backgroundColor: statusColors[order.status] || '#d4d4d8',
                        color: theme.bodyColor
                      }}
                    >
                      {statusMap[order.status] || order.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {order.items?.[0]?.image && (
                      <div 
                        className="w-10 h-10 bg-gray-200 overflow-hidden"
                        style={{ borderRadius: theme.imageBorderRadius }}
                      >
                        <MenuItemImage storageId={order.items[0].image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span style={{ fontSize: theme.bodyFontSize, fontWeight: '700', color: theme.bodyColor }}>
                      ₹{order.total}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-8" style={{ color: theme.secondaryTextColor }}>
          No orders found
        </div>
      )}

      <button
        onClick={() => onElementClick('button')}
        className={`w-full cursor-pointer hover:ring-2 hover:ring-blue-500 ${selectedElement === 'button' ? 'ring-2 ring-blue-500' : ''}`}
        style={{
          backgroundColor: theme.buttonStyle === 'solid' ? theme.primaryColor : 'transparent',
          color: theme.buttonStyle === 'solid' ? '#ffffff' : theme.primaryColor,
          border: theme.buttonStyle === 'ghost' ? 'none' : `${theme.buttonBorderWidth || '2px'} solid ${theme.primaryColor}`,
          borderRadius: theme.buttonBorderRadius,
          padding: theme.buttonPadding,
          fontSize: theme.buttonFontSize,
          fontWeight: theme.buttonFontWeight,
        }}
      >
        View Details
      </button>
    </div>
  );
}

// Element Editor Component
function ElementEditor({ elementType, theme, setTheme, onClose }) {
  const editors = {
    button: <ButtonEditor theme={theme} setTheme={setTheme} />,
    card: <CardEditor theme={theme} setTheme={setTheme} />,
    heading: <HeadingEditor theme={theme} setTheme={setTheme} />,
    image: <ImageEditor theme={theme} setTheme={setTheme} />,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-[--text-primary]">
          Edit {elementType.charAt(0).toUpperCase() + elementType.slice(1)}
        </h2>
        <button onClick={onClose} className="text-[--text-muted] hover:text-[--text-primary]">
          <X size={20} />
        </button>
      </div>
      {editors[elementType] || <p className="text-[--text-muted]">No editor available</p>}
    </div>
  );
}

// Button Editor
function ButtonEditor({ theme, setTheme }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Button Style</label>
        <select
          value={theme.buttonStyle}
          onChange={(e) => setTheme({ ...theme, buttonStyle: e.target.value })}
          className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-[--text-primary]"
        >
          <option value="solid">Solid</option>
          <option value="outline">Outline</option>
          <option value="ghost">Ghost</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Border Radius</label>
        <input
          type="range"
          min="0"
          max="50"
          value={parseInt(theme.buttonBorderRadius)}
          onChange={(e) => setTheme({ ...theme, buttonBorderRadius: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.buttonBorderRadius}</span>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Font Size</label>
        <input
          type="range"
          min="10"
          max="24"
          value={parseInt(theme.buttonFontSize)}
          onChange={(e) => setTheme({ ...theme, buttonFontSize: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.buttonFontSize}</span>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Font Weight</label>
        <select
          value={theme.buttonFontWeight}
          onChange={(e) => setTheme({ ...theme, buttonFontWeight: e.target.value })}
          className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-[--text-primary]"
        >
          <option value="400">Normal</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Primary Color</label>
        <input
          type="color"
          value={theme.primaryColor}
          onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
          className="w-full h-12 rounded-lg border border-[--border] cursor-pointer"
        />
      </div>
    </div>
  );
}

// Card Editor
function CardEditor({ theme, setTheme }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Border Radius</label>
        <input
          type="range"
          min="0"
          max="50"
          value={parseInt(theme.cardBorderRadius)}
          onChange={(e) => setTheme({ ...theme, cardBorderRadius: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.cardBorderRadius}</span>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Padding</label>
        <input
          type="range"
          min="8"
          max="32"
          value={parseInt(theme.cardPadding)}
          onChange={(e) => setTheme({ ...theme, cardPadding: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.cardPadding}</span>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Border Width</label>
        <input
          type="range"
          min="0"
          max="5"
          value={parseInt(theme.cardBorderWidth)}
          onChange={(e) => setTheme({ ...theme, cardBorderWidth: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.cardBorderWidth}</span>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Border Color</label>
        <input
          type="color"
          value={theme.borderColor}
          onChange={(e) => setTheme({ ...theme, borderColor: e.target.value })}
          className="w-full h-12 rounded-lg border border-[--border] cursor-pointer"
        />
      </div>
    </div>
  );
}

// Heading Editor
function HeadingEditor({ theme, setTheme }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Font Size</label>
        <input
          type="range"
          min="16"
          max="48"
          value={parseInt(theme.headingFontSize)}
          onChange={(e) => setTheme({ ...theme, headingFontSize: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.headingFontSize}</span>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Font Weight</label>
        <select
          value={theme.headingFontWeight}
          onChange={(e) => setTheme({ ...theme, headingFontWeight: e.target.value })}
          className="w-full px-3 py-2 bg-[--bg-elevated] border border-[--border] rounded-lg text-[--text-primary]"
        >
          <option value="400">Normal</option>
          <option value="500">Medium</option>
          <option value="600">Semibold</option>
          <option value="700">Bold</option>
          <option value="800">Extra Bold</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Heading Color</label>
        <input
          type="color"
          value={theme.headingColor}
          onChange={(e) => setTheme({ ...theme, headingColor: e.target.value })}
          className="w-full h-12 rounded-lg border border-[--border] cursor-pointer"
        />
      </div>
    </div>
  );
}

// Text Editor (for body text, order IDs, dates, etc.)
function TextEditor({ theme, setTheme }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Body Text Color</label>
        <input
          type="color"
          value={theme.bodyColor}
          onChange={(e) => setTheme({ ...theme, bodyColor: e.target.value })}
          className="w-full h-12 rounded-lg border border-[--border] cursor-pointer"
        />
        <p className="text-xs text-[--text-muted] mt-1">For order IDs, item names, etc.</p>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Secondary Text Color</label>
        <input
          type="color"
          value={theme.secondaryTextColor}
          onChange={(e) => setTheme({ ...theme, secondaryTextColor: e.target.value })}
          className="w-full h-12 rounded-lg border border-[--border] cursor-pointer"
        />
        <p className="text-xs text-[--text-muted] mt-1">For dates, table numbers, descriptions</p>
      </div>

      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Font Size</label>
        <input
          type="range"
          min="10"
          max="20"
          value={parseInt(theme.bodyFontSize)}
          onChange={(e) => setTheme({ ...theme, bodyFontSize: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.bodyFontSize}</span>
      </div>
    </div>
  );
}

// Image Editor
function ImageEditor({ theme, setTheme }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-[--text-secondary] mb-2">Border Radius</label>
        <input
          type="range"
          min="0"
          max="50"
          value={parseInt(theme.imageBorderRadius)}
          onChange={(e) => setTheme({ ...theme, imageBorderRadius: `${e.target.value}px` })}
          className="w-full"
        />
        <span className="text-xs text-[--text-muted]">{theme.imageBorderRadius}</span>
      </div>
    </div>
  );
}
