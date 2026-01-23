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
  ChevronRight, Package, X, ArrowRight, Phone 
} from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";
import { AnimatedPopup } from "@/components/AnimatedPopup";
import { HandPlatter } from "lucide-react";

const statusConfig = {
  pending: { label: "Received", cls: "status-pending", icon: Clock, color: "#000000" },
  preparing: { label: "Preparing", cls: "status-preparing", icon: ChefHat, color: "#000000" },
  ready: { label: "Ready", cls: "status-ready", icon: Truck, color: "#000000" },
  completed: { label: "Done", cls: "status-completed", icon: CheckCircle, color: "#737373" },
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
    if (lastTableId) router.push(`/menu/${lastTableId}`); 
    setShowPopup(false); 
  };
  
  const handleNewTable = () => { 
    const num = parseInt(newTableNumber); 
    if (newTableNumber && !isNaN(num) && num > 0) { 
      router.push(`/menu/${num}`); 
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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[--bg]">
        <div className="text-center animate-scale-in w-full max-w-sm">
          <div className="w-16 h-16 border-2 border-[--border] rounded-none flex items-center justify-center mx-auto mb-5">
            <Phone size={28} className="text-[--primary]" />
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary] mb-2">
            Track Your Orders
          </h1>
          <p className="text-sm text-[--text-muted] mb-6">
            Enter your phone number to view order history
          </p>
          
          <div className="bg-[--card] border border-[--border] rounded-none p-4 mb-5">
            <div className="flex items-center border-2 border-[--border] rounded-none overflow-hidden focus-within:border-[--primary] transition-colors">
              <span className="px-3 py-3 text-[--text-secondary] font-semibold border-r-2 border-[--border] bg-[--bg-elevated] text-sm">
                +91
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
                placeholder="10 digit number"
                maxLength={10}
                className="flex-1 bg-[--bg] px-3 py-3 text-base outline-none text-[--text-primary] font-medium"
              />
            </div>
            {phoneError && (
              <p className="text-red-600 text-xs mt-2 text-left">{phoneError}</p>
            )}
          </div>
          
          <button 
            onClick={handleViewOrders}
            className="w-full btn-primary px-6 py-3.5 rounded-none text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            View My Orders
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // No orders found for this phone number
  if (searchedButNoOrders) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[--bg]">
        <div className="text-center animate-scale-in w-full max-w-sm">
          <div className="w-16 h-16 border-2 border-[--border] rounded-none flex items-center justify-center mx-auto mb-5 opacity-50">
            <Package size={28} className="text-[--text-muted]" />
          </div>
          <h1 className="text-xl font-bold text-[--text-primary] mb-2">
            No Orders Found
          </h1>
          <p className="text-sm text-[--text-muted] mb-1">
            We couldn't find any orders for
          </p>
          <p className="text-sm text-[--text-secondary] font-semibold mb-6">{searchPhone}</p>
          <button 
            onClick={() => { setSearchPhone(''); setPhoneNumber(''); localStorage.removeItem('customerPhone'); }}
            className="w-full btn-secondary px-6 py-3.5 rounded-none text-sm font-semibold active:scale-95 transition-transform"
          >
            Try Another Number
          </button>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "completed");
  const pastOrders = orders.filter(o => o.status === "completed");

  return (
    <div className="min-h-screen bg-[--bg] pb-20">
      {/* New Order Popup */}
      <AnimatedPopup 
        show={showPopup} 
        onClose={() => setShowPopup(false)}
        className="absolute inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <div className="card rounded-none p-5 w-full max-w-sm animate-scale-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[--text-primary]">New Order</h2>
            <button 
              onClick={() => setShowPopup(false)} 
              className="w-9 h-9 rounded-none bg-[--bg-elevated] border-2 border-[--border] flex items-center justify-center active:scale-95 transition-transform"
            >
              <X size={18} className="text-[--text-muted]" />
            </button>
          </div>
          
          {lastTableId && (
            <>
              <button 
                onClick={handleSameTable} 
                className="w-full p-4 rounded-none border-2 border-[--border] bg-[--card] active:scale-95 transition-all mb-3 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[--text-primary] font-bold mb-0.5">Same Table</p>
                    <p className="text-[--text-muted] text-sm">Continue at Table {lastTableId}</p>
                  </div>
                  <ChevronRight size={20} className="text-[--text-dim]" />
                </div>
              </button>
              
              <div className="flex items-center gap-2 my-4">
                <div className="flex-1 h-px bg-[--border]" />
                <span className="text-xs text-[--text-muted] uppercase">Or</span>
                <div className="flex-1 h-px bg-[--border]" />
              </div>
            </>
          )}
          
          <div className="p-4 rounded-none border-2 border-[--border] bg-[--bg-elevated]">
            <p className="text-[--text-primary] font-bold mb-3">Different Table</p>
            <input 
              type="number" 
              value={newTableNumber} 
              onChange={(e) => setNewTableNumber(e.target.value)} 
              placeholder="Table number" 
              className="w-full text-center text-xl font-bold rounded-none py-3 px-3 mb-3 border-2 border-[--border] focus:border-[--primary] transition-colors" 
              min="1" 
            />
            <button 
              onClick={handleNewTable} 
              disabled={!newTableNumber} 
              className={`w-full rounded-none py-3 text-sm flex items-center justify-center gap-2 font-bold transition-all ${
                newTableNumber 
                  ? "btn-primary active:scale-95" 
                  : "bg-[--border] text-[--text-dim] cursor-not-allowed"
              }`}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </AnimatedPopup>

      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-[--border]">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[--text-primary]">My Orders</h1>
              {lastTableId && (
                <p className="text-xs text-[--text-muted] mt-0.5">Table {lastTableId}</p>
              )}
            </div>
            <button 
              onClick={() => setShowPopup(true)} 
              className="btn-primary px-4 py-2.5 rounded-none font-bold flex items-center gap-1.5 text-sm active:scale-95 transition-transform"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-5">
        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="mb-8 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[--primary] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[--primary]" />
              </div>
              <h2 className="text-[10px] tracking-[0.15em] text-[--text-muted] uppercase font-bold">Active Orders</h2>
            </div>
            
            <div className="space-y-3">
              {activeOrders.map((order) => {
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;
                const progress = {
                  pending: 25,
                  preparing: 50,
                  ready: 75,
                  completed: 100
                }[order.status] || 0;
                
                return (
                  <Link 
                    key={order._id} 
                    href={`/order-status/${order._id}`} 
                    className="block card rounded-none overflow-hidden active:scale-[0.98] transition-transform border border-[--border]"
                  >
                    {/* Progress bar */}
                    <div className="h-1.5 bg-[--bg-elevated] relative overflow-hidden">
                      <div 
                        className="h-full bg-[--primary] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-[--text-primary] mb-0.5 truncate">
                            Order #{order.orderNumber || order._id.slice(-4)}
                          </p>
                          <p className="text-xs text-[--text-muted]">
                            Table {order.tableId} • {new Date(order._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div 
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-none border border-[--border] ml-2 flex-shrink-0"
                          style={{ backgroundColor: `${status.color}10` }}
                        >
                          <StatusIcon size={12} style={{ color: status.color }} />
                          <span className="text-xs font-bold whitespace-nowrap" style={{ color: status.color }}>{status.label}</span>
                        </div>
                      </div>
                      
                      {/* Item previews */}
                      <div className="flex items-center gap-2 mb-3">
                        {order.items.slice(0, 4).map((item, i) => (
                          <div 
                            key={i} 
                            className="w-11 h-11 bg-[--bg-elevated] border border-[--border] rounded-none flex items-center justify-center overflow-hidden flex-shrink-0"
                          >
                            <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className="w-11 h-11 bg-[--bg-elevated] border border-[--border] rounded-none flex items-center justify-center text-xs font-bold text-[--text-muted] flex-shrink-0">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-[--border]">
                        <span className="text-xs text-[--text-muted] font-medium">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[--primary]">₹{order.total.toFixed(0)}</span>
                          <ChevronRight size={16} className="text-[--text-dim]" />
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
            <h2 className="text-[10px] tracking-[0.15em] text-[--text-muted] uppercase font-bold mb-4">Order History</h2>
            <div className="space-y-3">
              {pastOrders.map((order) => (
                <div key={order._id} className="card rounded-none p-4 border border-[--border] opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-[--text-primary] text-sm mb-0.5">
                        #{order.orderNumber || order._id.slice(-4)}
                      </p>
                      <p className="text-xs text-[--text-muted]">
                        {new Date(order._creationTime).toLocaleDateString()} • Table {order.tableId}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[--text-muted]">
                      <CheckCircle size={14} />
                      <span className="text-xs font-semibold">Done</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="w-8 h-8 bg-[--bg-elevated] border border-[--border] rounded-none overflow-hidden flex-shrink-0">
                          <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-xs text-[--text-muted] font-semibold ml-0.5">+{order.items.length - 3}</span>
                      )}
                    </div>
                    <span className="text-base font-bold text-[--text-primary]">₹{order.total.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Order CTA */}
        {activeOrders.length === 0 && pastOrders.length > 0 && (
          <div className="mt-8 animate-scale-in">
            <button 
              onClick={() => setShowPopup(true)} 
              className="flex items-center justify-center gap-2 btn-primary py-3.5 rounded-none font-bold text-sm w-full active:scale-95 transition-transform"
            >
              <Plus size={18} />
              Place New Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
