"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  CheckCircle, ChefHat, Truck, Clock, ArrowLeft, 
  CreditCard, Banknote, UserRound, RefreshCw, IndianRupee, StickyNote
} from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";

const statusSteps = [
  { key: "pending", label: "Received", icon: Clock, cls: "status-pending" },
  { key: "preparing", label: "Preparing", icon: ChefHat, cls: "status-preparing" },
  { key: "ready", label: "Ready", icon: Truck, cls: "status-ready" },
  { key: "completed", label: "Completed", icon: CheckCircle, cls: "status-completed" },
];

const paymentLabels = {
  "pay-now": { label: "Paid Online", icon: CreditCard },
  "pay-counter": { label: "Pay at Counter", icon: Banknote },
  "pay-table": { label: "Pay at Table", icon: UserRound },
};

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const order = useQuery(api.orders.getById, { id: orderId });

  // Loading state
  if (order === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader" />
      </div>
    );
  }

  // Not found state
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center animate-scale-in">
          <div className="text-6xl mb-5">🔍</div>
          <h1 className="font-luxury text-xl font-semibold text-[--text-primary] mb-3">
            Order Not Found
          </h1>
          <Link href="/" className="text-[--primary] text-sm hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const isCompleted = order.status === "completed";
  const currentStatus = statusSteps[currentStepIndex];
  const PaymentIcon = paymentLabels[order.paymentMethod]?.icon;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/my-orders" 
              className="w-11 h-11 flex items-center justify-center rounded-none bg-[--card] border border-[--border] hover:border-[--border-light] transition-all"
            >
              <ArrowLeft size={18} className="text-[--text-muted]" />
            </Link>
            <div className="text-center">
              <h1 className="font-luxury text-lg font-semibold text-[--text-primary]">Order Status</h1>
              <p className="text-xs text-[--text-muted]">#{order.orderNumber || order._id.slice(-4)}</p>
            </div>
            <div className="w-11" />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Current Status Hero */}
        <div className="text-center mb-10 animate-scale-in">
          {order.status === "pending" ? (
            <img src="/cooking.gif" alt="Cooking" className="w-32 h-32 mx-auto mb-5" />
          ) : order.status === "preparing" ? (
            <img src="/prepare-food.gif" alt="Preparing" className="w-32 h-32 mx-auto mb-5" />
          ) : order.status === "ready" ? (
            <img src="/pickup-order.gif" alt="Ready" className="w-32 h-32 mx-auto mb-5" />
          ) : order.status === "completed" ? (
            <img src="/food-delivered.gif" alt="Completed" className="w-32 h-32 mx-auto mb-5" />
          ) : (
            <div className={`w-24 h-24 mx-auto mb-5 rounded-none flex items-center justify-center ${currentStatus.cls} animate-glow`}>
              <currentStatus.icon size={40} />
            </div>
          )}
          <h2 className="font-luxury text-2xl font-semibold text-[--text-primary] mb-2">
            {currentStatus.label}
          </h2>
          {order.paymentMethod && paymentLabels[order.paymentMethod] && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-none bg-[--card] border border-[--border] text-[--text-muted] text-xs">
              {PaymentIcon && <PaymentIcon size={14} />}
              {paymentLabels[order.paymentMethod].label}
            </div>
          )}
        </div>

        {/* Progress Steps - Clean Timeline */}
        <div className="card rounded-none p-6 mb-6 animate-slide-up">
          <div className="relative">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isLast = index === statusSteps.length - 1;
              const isPast = index < currentStepIndex;
              
              return (
                <div 
                  key={step.key} 
                  className="flex items-start gap-4 relative"
                  style={{
                    opacity: 0,
                    animation: `fadeSlide 0.4s ease-out ${index * 0.1}s forwards`
                  }}
                >
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-5 top-12 w-px h-10">
                      <div className="absolute inset-0 bg-[--border]" />
                      <div 
                        className="absolute top-0 left-0 w-full bg-[--primary] transition-all duration-500"
                        style={{ height: isPast ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                  
                  {/* Step icon */}
                  <div className="relative flex-shrink-0">
                    {isCurrent && !isCompleted && (
                      <div 
                        className="absolute inset-0 rounded-none border border-[--primary] opacity-0"
                        style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                      />
                    )}
                    
                    <div 
                      className={`relative z-10 w-10 h-10 rounded-none flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-[--primary]/10 border border-[--primary]/30' 
                          : 'bg-[--card] border border-[--border]'
                      }`}
                    >
                      <Icon 
                        size={18} 
                        className={`transition-colors ${isActive ? 'text-[--primary]' : 'text-[--text-dim]'}`}
                      />
                    </div>
                  </div>
                  
                  {/* Step content */}
                  <div className={`flex-1 pt-2 ${isLast ? "pb-0" : "pb-8"}`}>
                    <p className={`text-sm font-medium transition-colors ${
                      isActive ? "text-[--text-primary]" : "text-[--text-dim]"
                    }`}>
                      {step.label}
                    </p>
                    
                    {isCurrent && !isCompleted && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-[--primary] opacity-75" />
                          <span className="relative inline-flex rounded-none h-2 w-2 bg-[--primary]" />
                        </span>
                        <span className="text-xs text-[--text-muted]">In Progress</span>
                      </div>
                    )}
                    
                    {isPast && (
                      <p className="text-xs text-[--text-dim] mt-0.5">✓</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <style jsx>{`
            @keyframes fadeSlide {
              from { opacity: 0; transform: translateX(-10px); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes ping {
              75%, 100% { transform: scale(1.3); opacity: 0; }
            }
          `}</style>
        </div>

        {/* Order Summary */}
        <div className="card rounded-none p-6 mb-6 animate-slide-up delay-100" style={{animationFillMode: 'forwards'}}>
          <h3 className="text-[10px] tracking-[0.2em] text-[--text-muted] uppercase mb-5">
            Bill Summary
          </h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[--bg-elevated] border border-[--border] rounded-none flex items-center justify-center overflow-hidden">
                    <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm text-[--text-primary]">{item.name}</p>
                    <p className="text-xs text-[--text-dim]">× {item.quantity}</p>
                  </div>
                </div>
                <span className="text-sm text-[--text-muted]">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
          
          <div className="divider-glow my-5" />
          
          {/* Subtotal */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[--text-muted]">Subtotal</span>
            <span className="text-sm font-medium text-[--text-primary]">
              ₹{(order.total + (order.depositUsed || 0)).toFixed(0)}
            </span>
          </div>
          
          {/* Credit Applied */}
          {order.depositUsed > 0 && (
            <div className="flex justify-between items-center mb-2 text-black">
              <div>
                <span className="text-sm">Credit Applied</span>
                {order.customerPhone && (
                  <p className="text-[10px] text-black/60">{order.customerPhone}</p>
                )}
              </div>
              <span className="text-sm">-₹{order.depositUsed.toFixed(0)}</span>
            </div>
          )}
          
          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-[--border]">
            <span className="text-sm font-bold text-[--text-primary]">Total Paid</span>
            <span className="text-xl font-luxury font-semibold text-gradient">
              ₹{order.total.toFixed(0)}
            </span>
          </div>
          
          {order.notes && (
            <div className="mt-5 p-4 bg-[--primary]/5 border border-[--primary]/20 rounded-none">
              <p className="text-xs text-[--primary] flex items-center gap-1.5">
                <StickyNote size={12} />
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="text-center text-xs text-[--text-dim] mb-6">
          Table {order.tableId} • {new Date(order._creationTime).toLocaleString()}
        </div>

        {/* Actions */}
        <div className="space-y-3 animate-fade-in delay-200" style={{animationFillMode: 'forwards'}}>
          <Link 
            href="/my-orders" 
            className="block text-center btn-secondary py-4 rounded-none text-sm font-medium"
          >
            ← All Orders
          </Link>
          {isCompleted && (
            <Link 
              href="/" 
              className="block text-center btn-primary py-4 rounded-none text-sm font-semibold"
            >
              Order Again
            </Link>
          )}
        </div>

        {/* Live update notice */}
        {!isCompleted && (
          <div className="mt-6 p-4 bg-[--primary]/5 border border-[--primary]/20 rounded-none text-center animate-fade-in delay-300" style={{animationFillMode: 'forwards'}}>
            <p className="text-xs text-[--primary] flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Live updates enabled • Sit back and relax
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
