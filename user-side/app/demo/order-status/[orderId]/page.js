"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";
import {
  RefreshCw, StickyNote, Star, AlertCircle
} from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";
import Image from "next/image";

const statusSteps = [
  { key: "pending", label: "Received", icon: "/assets/icons/order-status/received.png", cls: "status-pending" },
  { key: "preparing", label: "Preparing", icon: "/assets/icons/order-status/preparing.png", cls: "status-preparing" },
  { key: "ready", label: "Ready", icon: "/assets/icons/order-status/ready.png", cls: "status-ready" },
  { key: "completed", label: "Completed", icon: "/assets/icons/order-status/completed.png", cls: "status-completed" },
];

const paymentLabels = {
  "pay-now": { label: "Paid Online", icon: "/assets/icons/order-status/cash.png" },
  "pay-counter": { label: "Pay at Counter", icon: "/assets/icons/order-status/cash.png" },
  "pay-table": { label: "Pay at Table", icon: "/assets/icons/order-status/cash.png" },
};

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const order = useQuery(api.orders.getById, { id: orderId });
  const cartContext = useCart();
  
  // Mutations for staff interaction
  const createStaffCall = useMutation(api.staffCalls.create);
  const createNotification = useMutation(api.staffNotifications.create);
  
  // State management
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasShownReadyConfetti, setHasShownReadyConfetti] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const previousStatus = useRef(null);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  // Confetti when order is ready
  useEffect(() => {
    if (order && order.status === 'ready' && previousStatus.current !== 'ready' && !hasShownReadyConfetti) {
      setShowConfetti(true);
      setHasShownReadyConfetti(true);
      createConfetti();
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
      setTimeout(() => setShowConfetti(false), 3000);
    }
    if (order) {
      previousStatus.current = order.status;
    }
  }, [order?.status, hasShownReadyConfetti]);

  // Pull to refresh handlers
  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (pullStartY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY.current;
      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80) {
      handleRefresh();
    }
    pullStartY.current = 0;
    setPullDistance(0);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleReorder = () => {
    if (!order) return;
    
    // Add all items to cart
    order.items.forEach(item => {
      cartContext.addToCart(order.tableId, {
        menuItemId: item.menuItemId || item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      });
    });
    
    // Vibrate feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Redirect to cart
    router.push(`/cart/${order.tableId}`);
  };

  const handleCallStaff = async () => {
    if (!order) return;
    
    try {
      // Create staff call
      await createStaffCall({
        tableId: order.tableId,
        tableNumber: parseInt(order.tableId),
        reason: "Customer needs assistance with order",
      });
      
      // Vibrate feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
      
      // Show success message
      alert("✓ Staff has been notified and will be with you shortly!");
    } catch (error) {
      console.error("Failed to call staff:", error);
      alert("Failed to notify staff. Please try again.");
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !order) return;
    
    try {
      // Create notification for kitchen/staff about the message
      await createNotification({
        type: "customer_message",
        message: `Table ${order.tableId} - Order #${order.orderNumber || order._id.slice(-4)}: "${chatMessage}"`,
      });
      
      // Vibrate feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      setChatMessage("");
      setShowChat(false);
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[--card] border border-emerald-500/30 rounded-xl px-4 py-3 shadow-lg animate-slide-up';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-emerald-400">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <p class="text-sm text-[--text-primary] font-medium">Message sent to kitchen!</p>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleRatingSubmit = () => {
    if (rating === 0) return;
    // This would save rating to database
    alert(`Thank you for rating ${rating} stars!`);
    setShowRating(false);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Loading state with skeleton
  if (order === undefined) {
    return (
      <div className="min-h-screen bg-[--bg]">
        <header className="glass sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-[--card] border border-[--border] animate-pulse" />
              <div className="text-center">
                <div className="h-5 w-32 bg-[--card] rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-[--card] rounded animate-pulse mx-auto" />
              </div>
              <div className="w-11" />
            </div>
          </div>
        </header>
        
        <div className="max-w-lg mx-auto px-5 py-8">
          {/* Hero skeleton */}
          <div className="text-center mb-10">
            <div className="w-32 h-32 mx-auto mb-5 rounded-2xl bg-[--card] animate-pulse" />
            <div className="h-8 w-48 bg-[--card] rounded animate-pulse mx-auto mb-3" />
            <div className="h-6 w-32 bg-[--card] rounded-full animate-pulse mx-auto" />
          </div>
          
          {/* Timeline skeleton */}
          <div className="card rounded-2xl p-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-4 mb-6 last:mb-0">
                <div className="w-10 h-10 rounded-xl bg-[--bg-elevated] animate-pulse" />
                <div className="flex-1 pt-2">
                  <div className="h-4 w-24 bg-[--bg-elevated] rounded animate-pulse mb-2" />
                  <div className="h-3 w-16 bg-[--bg-elevated] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[--bg]">
        <div className="text-center animate-scale-in max-w-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <h1 className="font-luxury text-xl font-semibold text-[--text-primary] mb-3">
            Order Not Found
          </h1>
          <p className="text-[--text-muted] text-sm mb-6">
            We couldn't find this order. It may have been cancelled or the link is incorrect.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 btn-secondary py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Retry
            </button>
            <Link
              href="/demo/my-orders"
              className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold text-center"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status);
  const isCompleted = order.status === "completed";
  const currentStatus = statusSteps[currentStepIndex];
  
  // Calculate progress percentage
  const progressPercentage = ((currentStepIndex + 1) / statusSteps.length) * 100;
  
  // Status timestamps (mock - you'd get these from order history)
  const statusTimestamps = {
    pending: order._creationTime,
    preparing: order._creationTime + (5 * 60 * 1000), // +5 mins
    ready: order._creationTime + (20 * 60 * 1000), // +20 mins
    completed: order._creationTime + (25 * 60 * 1000), // +25 mins
  };

  return (
    <div 
      className="min-h-screen pb-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center pt-4 z-50 transition-opacity"
          style={{ opacity: Math.min(pullDistance / 80, 1) }}
        >
          <div className="bg-[--card] border border-[--border] rounded-full px-4 py-2 flex items-center gap-2">
            <RefreshCw 
              size={16} 
              className={`text-[--primary] ${pullDistance > 80 ? 'animate-spin' : ''}`}
            />
            <span className="text-xs text-[--text-muted]">
              {pullDistance > 80 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50" id="confetti-container" />
      )}
      {/* Header */}
      <header className="glass sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-luxury text-lg font-semibold text-[--text-primary]">Order Status</h1>
              <p className="text-xs text-[--text-muted]">#{order.orderNumber || order._id.slice(-4)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-8">
        {/* Current Status Hero */}
        <div className="text-center mb-10 animate-scale-in">
          {/* Progress ring around video */}
          <div className="relative inline-block mb-5">
            {/* SVG Progress Ring */}
            <svg className="absolute z-[999] inset-0 w-48 h-48 -rotate-90" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}>
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="var(--border)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="var(--primary)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPercentage / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            
            {order.status === "pending" ? (
              <video
                src="/assets/videos/cooking.mp4"
                autoPlay
                loop
                muted
                preload="metadata"
                poster="/assets/images/cooking-poster.jpg"
                onContextMenu={(e) => e.preventDefault()}
                playsInline
                className="w-32 h-32 mx-auto relative z-10"
              >
                Your browser does not support the video tag.
              </video>
            ) : order.status === "preparing" ? (
              <video
                src="/assets/videos/prepare-food.mp4"
                autoPlay
                loop
                muted
                preload="metadata"
                poster="/assets/images/prepare-food-poster.jpg"
                onContextMenu={(e) => e.preventDefault()}
                playsInline
                className="w-32 h-32 mx-auto relative z-10"
              >
                Your browser does not support the video tag.
              </video>
            ) : order.status === "ready" ? (
              <video
                src="/assets/videos/pickup-order.mp4"
                autoPlay
                loop
                muted
                preload="metadata"
                poster="/assets/images/pickup-order-poster.jpg"
                onContextMenu={(e) => e.preventDefault()}
                playsInline
                className="w-32 h-32 mx-auto relative z-10"
              >
                Your browser does not support the video tag.
              </video>
            ) : order.status === "completed" ? (
              <video
                src="/assets/videos/food-delivered.mp4"
                autoPlay     
                loop
                muted
                preload="metadata"
                poster="/assets/images/food-delivered-poster.jpg"
                onContextMenu={(e) => e.preventDefault()}
                playsInline
                className="w-32 h-32 mx-auto relative z-10"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className={`w-32 h-32 mx-auto rounded-2xl flex items-center justify-center ${currentStatus.cls} animate-glow relative z-10`}>
                <currentStatus.icon size={40} />
              </div>
            )}
          </div>
          
          <h2 className="font-luxury text-2xl font-semibold text-[--text-primary] mb-2">
            {currentStatus.label}
          </h2>
          <div className="text-xs text-[--text-muted] mb-3 flex items-baseline justify-center gap-1">
            <OdometerNumber value={Math.round(progressPercentage).toString()} />
            <span>% Complete</span>
          </div>
          {order.paymentMethod && paymentLabels[order.paymentMethod] && (
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-[--card] border border-[--border] text-[--text-muted] text-xs">
              <Image
                src={paymentLabels[order.paymentMethod].icon}
                alt="Payment"
                width={14}
                height={14}
              />
              {paymentLabels[order.paymentMethod].label}
            </div>
          )}
        </div>

        {/* Progress Steps - Clean Timeline */}
        <div className="card rounded-2xl p-6 mb-6 animate-slide-up">
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
                        className="absolute inset-0 rounded-xl border border-[--primary] opacity-0"
                        style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                      />
                    )}

                    <div
                      className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive
                          ? 'bg-[--primary]/10 border border-[--primary]/30'
                          : 'bg-[--card] border border-[--border]'
                        }`}
                    >
                      <Image
                        src={step.icon}
                        alt={step.label}
                        width={20}
                        height={20}
                        className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}
                      />
                    </div>
                  </div>

                  {/* Step content */}
                  <div className={`flex-1 pt-2 ${isLast ? "pb-0" : "pb-8"}`}>
                    <p className={`text-sm font-medium transition-colors ${isActive ? "text-[--text-primary]" : "text-[--text-dim]"
                      }`}>
                        
                      {step.label}
                    </p>

                    {/* Show timestamp if step is completed or current */}
                    {isActive && statusTimestamps[step.key] && (
                      <div className="text-[10px] text-[--text-dim] mt-1">
                        {new Date(statusTimestamps[step.key]).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                    )}

                    {isCurrent && !isCompleted && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[--primary] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[--primary]" />
                        </span>
                        <div className="loader-r">In Progress</div>
                      </div>
                    )}

                    {isPast && (
                      <div className="text-xs text-emerald-400 mt-0.5">✓ Done</div>
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
        <div className="card rounded-xl p-6 mb-6 animate-slide-up delay-100" style={{ animationFillMode: 'forwards' }}>
          <h3 className="text-[10px] tracking-[0.2em] text-[--text-muted] uppercase mb-5">
            Bill Summary
          </h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[--bg-elevated] border border-[--border] rounded-lg flex items-center justify-center overflow-hidden">
                    <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm text-[--text-primary]">{item.name}</p>
                    <div className="text-xs text-[--text-dim] flex items-baseline gap-1">
                      <span>×</span>
                      <OdometerNumber value={item.quantity.toString()} />
                    </div>
                  </div>
                </div>
                <span className="text-sm text-[--text-muted] flex items-baseline gap-0.5">
                  <span>₹</span>
                  <OdometerNumber value={(item.price * item.quantity).toFixed(0)} />
                </span>
              </div>
            ))}
          </div>

          <div className="divider-glow my-5" />

          {/* Subtotal */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[--text-muted]">Subtotal</span>
            <span className="text-sm font-medium text-[--text-primary] flex items-baseline gap-0.5">
              <span>₹</span>
              <OdometerNumber value={(order.total + (order.depositUsed || 0)).toFixed(0)} />
              <span>/-</span>
            </span>
          </div>

          {/* Credit Applied */}
          {order.depositUsed > 0 && (
            <div className="flex justify-between items-center mb-2 text-emerald-400">
              <div>
                <span className="text-sm">Credit Applied</span>
                {order.customerPhone && (
                  <p className="text-[10px] text-emerald-400/60">{order.customerPhone}</p>
                )}
              </div>
              <span className="text-sm flex items-baseline gap-0.5">
                <span>-₹</span>
                <OdometerNumber value={order.depositUsed.toFixed(0)} />
              <span>/-</span>
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-[--border]">
            <span className="text-sm font-bold text-[--text-primary]">Total Paid</span>
            <span className="text-xl font-luxury font-semibold text-gradient flex items-baseline gap-0.5">
              <span>₹</span>
              <OdometerNumber value={order.total.toFixed(0)} />
              <span>/-</span>
            </span>
          </div>

          {order.notes && (
            <div className="mt-5 p-4 bg-[--primary]/5 border border-[--primary]/20 rounded-xl">
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
        <div className="space-y-3 animate-fade-in delay-200" style={{ animationFillMode: 'forwards' }}>
          {/* Quick Actions Row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[--card] border border-[--border] text-[--text-muted] hover:border-[--primary] hover:text-[--primary] transition-all"
            >
              <Image
                src="/assets/icons/order-status/message.png"
                alt="Message"
                width={18}
                height={18}
              />
              <span className="text-sm font-medium">Message</span>
            </button>
            
            {!isCompleted && (
              <button
                onClick={handleCallStaff}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[--card] border border-[--border] text-[--text-muted] hover:border-amber-500 hover:text-amber-400 transition-all"
              >
                <Image
                  src="/assets/icons/order-status/call.png"
                  alt="Call"
                  width={18}
                  height={18}
                />
                <span className="text-sm font-medium">Call Staff</span>
              </button>
            )}
            
            {isCompleted && (
              <button
                onClick={() => setShowRating(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[--card] border border-[--border] text-[--text-muted] hover:border-amber-500 hover:text-amber-400 transition-all"
              >
                <Star size={18} />
                <span className="text-sm font-medium">Rate</span>
              </button>
            )}
          </div>
          
          {/* Reorder Button */}
          <button
            onClick={handleReorder}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[--primary]/10 border border-[--primary]/30 text-[--primary] hover:bg-[--primary]/20 transition-all font-medium"
          >
            <Image
              src="/assets/icons/order-status/again.png"
              alt="Reorder"
              width={18}
              height={18}
            />
            Order Again
          </button>
          
          <Link
            href="/demo/my-orders"
            className="block text-center btn-secondary py-4 rounded-xl text-sm font-medium"
          >
            ← All Orders
          </Link>
        </div>

        {/* Live update notice */}
        {!isCompleted && (
          <div className="mt-6 p-4 bg-[--primary]/5 border border-[--primary]/20 rounded-xl text-center animate-fade-in delay-300" style={{ animationFillMode: 'forwards' }}>
            <p className="text-xs text-[--primary] flex items-center justify-center gap-2">
              <RefreshCw size={14} className={'animate-spin'} />
              Live updates enabled • Sit back and relax
            </p>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={() => setShowChat(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-lg bg-[--card] rounded-t-3xl p-6 border-t border-[--border] animate-slide-up"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[--border] rounded-full mx-auto mb-5" />
            
            <h3 className="text-[--text-primary] font-semibold text-lg mb-2">Message Kitchen</h3>
            <p className="text-[--text-dim] text-xs mb-4">Send a quick message about your order</p>
            
            <textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="E.g., Can you make it less spicy?"
              className="w-full rounded-xl p-4 text-sm resize-none bg-[--bg] border border-[--border] focus:border-[--primary] outline-none transition-all duration-300 mb-4"
              rows={4}
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowChat(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[--bg-elevated] text-[--text-muted] hover:bg-[--border] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={() => setShowRating(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-lg bg-[--card] rounded-t-3xl p-6 border-t border-[--border] animate-slide-up"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[--border] rounded-full mx-auto mb-5" />
            
            <h3 className="text-[--text-primary] font-semibold text-lg mb-2 text-center">Rate Your Experience</h3>
            <p className="text-[--text-dim] text-xs mb-6 text-center">How was your order?</p>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setRating(star);
                    if (navigator.vibrate) navigator.vibrate(30);
                  }}
                  className="transition-all active:scale-95"
                >
                  <Star
                    size={40}
                    className={`transition-all ${
                      star <= rating 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-[--border] hover:text-amber-400/50'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Tell us more (optional)"
              className="w-full rounded-xl p-4 text-sm resize-none bg-[--bg] border border-[--border] focus:border-[--primary] outline-none transition-all duration-300 mb-4"
              rows={3}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRating(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[--bg-elevated] text-[--text-muted] hover:bg-[--border] transition-all"
              >
                Skip
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={rating === 0}
                className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Confetti function
const createConfetti = () => {
  const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
  const confettiCount = 100;
  const container = document.getElementById('confetti-container');
  if (!container) return;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'absolute';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = '-20px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    confetti.style.opacity = '1';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(confetti);
    
    const fallDuration = 2000 + Math.random() * 2000;
    const horizontalMovement = (Math.random() - 0.5) * 200;
    
    confetti.animate([
      { 
        transform: `translateY(0) translateX(0) rotate(0deg)`,
        opacity: 1
      },
      { 
        transform: `translateY(${window.innerHeight}px) translateX(${horizontalMovement}px) rotate(${Math.random() * 720}deg)`,
        opacity: 0
      }
    ], {
      duration: fallDuration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).onfinish = () => confetti.remove();
  }
};

// OdometerNumber component
function OdometerNumber({ value, className = "" }) {
  const digits = value.toString().split('');
  
  return (
    <div className={`inline-flex ${className}`}>
      {digits.map((digit, idx) => (
        <div key={idx} className="relative h-5 w-3 overflow-hidden">
          <div 
            className="flex flex-col transition-transform duration-300 ease-out"
            style={{
              transform: `translateY(-${parseInt(digit) * 20}px)`
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <span key={num} className="h-5 leading-5 text-center block">
                {num}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
