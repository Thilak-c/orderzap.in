"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";
import { useTable } from "@/lib/table";
import { 
  CheckCircle, ChefHat, Truck, Clock, Plus, 
  ChevronRight, Package, X, ArrowRight 
} from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";
import { AnimatedPopup } from "@/components/AnimatedPopup";
import { HandPlatter } from "lucide-react";

const statusConfig = {
  pending: { label: "Received", cls: "status-pending", icon: Clock },
  preparing: { label: "Preparing", cls: "status-preparing", icon: ChefHat },
  ready: { label: "Ready", cls: "status-ready", icon: Truck },
  completed: { label: "Done", cls: "status-completed", icon: CheckCircle },
};

export default function MyOrdersPage() {
  const router = useRouter();
  const { sessionId } = useSession();
  const { setTable } = useTable();
  const [showPopup, setShowPopup] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  
  // Check localStorage for stored phone on mount
  useEffect(() => {
    const storedPhone = localStorage.getItem('customerPhone');
    if (storedPhone) {
      setSearchPhone(storedPhone);
    }
  }, []);
  
  // Query orders by session or by phone
  const ordersBySession = useQuery(api.orders.getBySession, sessionId ? { sessionId } : "skip");
  const ordersByPhone = useQuery(api.orders.getByPhone, searchPhone ? { phone: searchPhone } : "skip");
  
  // Combine orders (prefer phone-based if available)
  const orders = searchPhone && ordersByPhone?.length > 0 ? ordersByPhone : ordersBySession;
  const lastTableId = orders && orders.length > 0 ? orders[0].tableId : null;

  // Get table info for context
  const table = useQuery(api.tables.getByNumber, lastTableId ? { number: parseInt(lastTableId) } : "skip");

  // Set table context for call staff button
  useEffect(() => {
    if (lastTableId) {
      setTable({
        tableId: String(lastTableId),
        tableNumber: parseInt(lastTableId),
        zoneName: table?.zone?.name || null,
      });
    }
  }, [lastTableId, table?.zone?.name]);

  const handleSameTable = () => { 
    if (lastTableId) router.push(`/m/${lastTableId}`); 
    setShowPopup(false); 
  };
  
  const handleNewTable = () => { 
    const num = parseInt(newTableNumber); 
    if (newTableNumber && !isNaN(num) && num > 0) { 
      router.push(`/m/${num}`); 
      setShowPopup(false); 
    } 
  };

  const handleViewOrders = () => {
    if (phoneNumber.length !== 10) {
      setPhoneError("Enter 10 digit number");
      return;
    }
    // Store phone in localStorage for credit lookup
    const fullPhone = `+91${phoneNumber}`;
    localStorage.setItem('customerPhone', fullPhone);
    setSearchPhone(fullPhone);
    setPhoneError("");
  };

  // Loading state
  if (ordersBySession === undefined && ordersByPhone === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  // Check if user searched by phone but no orders found
  const searchedButNoOrders = searchPhone && ordersByPhone !== undefined && ordersByPhone?.length === 0;

  // Empty state - ask for phone number or show no orders message
  if ((!orders || orders.length === 0) && !searchedButNoOrders) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center animate-scale-in w-full max-w-sm">
          <div className="w-24 h-24 border border-[--border] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HandPlatter size={36} className="text-[--primary]" />
          </div>
          <h1 className="font-luxury text-2xl font-semibold text-[--text-primary] mb-3">
            Wanna see your orders?
          </h1>
          <p className="text-[--text-muted] text-sm mb-6">
            Enter your phone number to view your orders
          </p>
          <div className="flex items-center bg-[--card] border border-[--border] rounded-xl overflow-hidden mb-4">
            <span className="px-4 py-3 text-[--text-muted] text-sm border-r border-[--border]">+91</span>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
              placeholder="10 digit number"
              maxLength={10}
              className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
            />
          </div>
          {phoneError && <p className="text-red-400 text-xs mb-4">{phoneError}</p>}
          <button 
            onClick={handleViewOrders}
            className="w-full btn-primary px-8 py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            View Orders
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // No orders found for this phone number
  if (searchedButNoOrders) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center animate-scale-in w-full max-w-sm">
          <div className="w-24 h-24 border border-[--border] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HandPlatter size={36} className="text-[--text-muted]" />
          </div>
          <h1 className="font-luxury text-2xl font-semibold text-[--text-primary] mb-3">
            No orders found
          </h1>
          <p className="text-[--text-muted] text-sm mb-6">
            There are no orders with this phone number
          </p>
          <p className="text-[--text-dim] text-xs mb-6">{searchPhone}</p>
          <button 
            onClick={() => { setSearchPhone(''); setPhoneNumber(''); localStorage.removeItem('customerPhone'); }}
            className="w-full btn-secondary px-8 py-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            Try another number
          </button>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "completed");
  const pastOrders = orders.filter(o => o.status === "completed");

  return (
    <div className="min-h-screen pb-8">
      {/* New Order Popup */}
      <AnimatedPopup 
        show={showPopup} 
        onClose={() => setShowPopup(false)}
        className="absolute inset-0 flex items-center justify-center p-6"
      >
        <div className="card rounded-2xl p-6 w-full max-w-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-luxury text-xl font-semibold text-[--text-primary]">New Order</h2>
            <button 
              onClick={() => setShowPopup(false)} 
              className="w-10 h-10 rounded-xl bg-[--bg-elevated] border border-[--border] flex items-center justify-center hover:border-[--border-light] transition-colors"
            >
              <X size={18} className="text-[--text-muted]" />
            </button>
          </div>
          
          <div className="divider-glow mb-6" />
          
          {lastTableId && (
            <button 
              onClick={handleSameTable} 
              className="w-full p-5 rounded-xl border border-[--border] bg-[--card] hover:border-[--primary]/30 transition-all mb-4 text-left group"
            >
              <p className="text-[--text-primary] font-medium mb-1">Same Table</p>
              <p className="text-[--text-muted] text-sm">Continue ordering at Table {lastTableId}</p>
            </button>
          )}
          
          <div className="p-5 rounded-xl border border-[--border] bg-[--card]">
            <p className="text-[--text-primary] font-medium mb-4">Different Table</p>
            <input 
              type="number" 
              value={newTableNumber} 
              onChange={(e) => setNewTableNumber(e.target.value)} 
              placeholder="Enter table number" 
              className="w-full text-center text-xl font-luxury font-semibold rounded-xl py-4 px-4 mb-3 !bg-[--bg-elevated]" 
              min="1" 
            />
            <button 
              onClick={handleNewTable} 
              disabled={!newTableNumber} 
              className={`w-full rounded-xl py-4 text-sm flex items-center justify-center gap-2 font-semibold ${
                newTableNumber 
                  ? "btn-primary" 
                  : "bg-[--border] text-[--text-dim] cursor-not-allowed"
              }`}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </AnimatedPopup>

      {/* Header */}
      <header className="glass sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <h1 className="font-luxury text-xl font-semibold text-[--text-primary]">My Orders</h1>
            <button 
              onClick={() => setShowPopup(true)} 
              className="text-sm text-[--primary] hover:text-[--primary-light] transition-colors font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              New Order
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="mb-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[--primary] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[--primary]" />
              </span>
              <h2 className="text-[10px] tracking-[0.2em] text-[--text-muted] uppercase">Active Orders</h2>
            </div>
            
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;
                return (
                  <Link 
                    key={order._id} 
                    href={`/order-status/${order._id}`} 
                    className="block card card-glow rounded-xl overflow-hidden group"
                  >
                    {/* Progress bar */}
                    <div className="h-1 bg-gradient-to-r from-[--primary] to-[--primary-light]" />
                    
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-[--text-primary]">
                            Order #{order.orderNumber || order._id.slice(-4)}
                          </p>
                          <p className="text-xs text-[--text-muted] mt-0.5">Table {order.tableId}</p>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.cls}`}>
                          <StatusIcon size={14} />
                          <span className="text-xs font-medium">{status.label}</span>
                        </div>
                      </div>
                      
                      {/* Item previews */}
                      <div className="flex items-center gap-2 mb-4">
                        {order.items.slice(0, 4).map((item, i) => (
                          <div 
                            key={i} 
                            className="w-10 h-10 bg-[--bg-elevated] border border-[--border] rounded-lg flex items-center justify-center overflow-hidden"
                          >
                            <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className="w-10 h-10 bg-[--bg-elevated] border border-[--border] rounded-lg flex items-center justify-center text-xs text-[--text-muted]">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[--text-dim]">
                          {new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="price-tag">₹{order.total.toFixed(0)}</span>
                          <ChevronRight size={16} className="text-[--text-dim] group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-[10px] tracking-[0.2em] text-[--text-muted] uppercase mb-4">Order History</h2>
            <div className="space-y-3">
              {pastOrders.map((order) => (
                <div key={order._id} className="card rounded-xl p-4 opacity-70">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-[--text-muted] text-sm">
                        #{order.orderNumber || order._id.slice(-4)}
                      </p>
                      <p className="text-xs text-[--text-dim]">
                        {new Date(order._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[--success]">
                      <CheckCircle size={14} />
                      <span className="text-xs font-medium">Completed</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {order.items.slice(0, 3).map((item, i) => (
                        <MenuItemImage key={i} storageId={item.image} alt={item.name} className="w-6 h-6 rounded object-cover" />
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-[--text-dim] ml-1">+{order.items.length - 3}</span>
                      )}
                    </div>
                    <span className="font-medium text-[--text-muted]">₹{order.total.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Order CTA */}
        {activeOrders.length === 0 && (
          <div className="mt-8 animate-scale-in">
            <button 
              onClick={() => setShowPopup(true)} 
              className="flex items-center justify-center gap-2 btn-primary py-4 rounded-xl font-semibold text-sm w-full"
            >
              <Plus size={18} />
              Place New Order
            </button>
          </div>
        )}
      </div>

      {/* AI Chat Assistant */}
   
    </div>
  );
}
