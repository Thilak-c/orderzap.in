"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HelpCircle, Bell, ClipboardList, X, Check, GlassWater } from "lucide-react";
import { isRestaurantOpen } from "@/components/ClosedPopup";
import { AnimatedBottomSheet, AnimatedToast } from "@/components/AnimatedPopup";
import { useCart } from "@/lib/cart";

export default function CallStaffButton({ tableId, tableNumber, zoneName }) {
  const router = useRouter();
  const { cartCount, setHideCartBar } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWaterOnWay, setShowWaterOnWay] = useState(false);
  const [reason, setReason] = useState("");
  const createCall = useMutation(api.staffCalls.create);
  
  // Listen for water acknowledgment
  const waterAcknowledged = useQuery(
    api.staffCalls.getWaterAcknowledged, 
    tableNumber ? { tableNumber: parseInt(tableNumber) } : "skip"
  );

  // Show "Water on the way" popup when staff acknowledges
  useEffect(() => {
    console.log("waterAcknowledged:", waterAcknowledged);
    if (waterAcknowledged && waterAcknowledged.acknowledgedAt) {
      const lastSeenTime = sessionStorage.getItem(`waterAck-${waterAcknowledged._id}`);
      const ackTime = String(waterAcknowledged.acknowledgedAt);
      console.log("lastSeenTime:", lastSeenTime, "ackTime:", ackTime);
      
      // Only show if we haven't seen this specific acknowledgment time
      if (lastSeenTime !== ackTime) {
        console.log("Showing water popup!");
        setShowWaterOnWay(true);
        setHideCartBar(true);
        sessionStorage.setItem(`waterAck-${waterAcknowledged._id}`, ackTime);
        setTimeout(() => {
          setShowWaterOnWay(false);
          setHideCartBar(false);
        }, 4000);
      }
    }
  }, [waterAcknowledged, setHideCartBar]);

  const reasons = ["Need assistance", "Ready to order", "Request bill"];

  const handleCall = async (selectedReason) => {
    if (!tableNumber) return;
    
    await createCall({
      tableId: tableId || String(tableNumber),
      tableNumber: parseInt(tableNumber),
      zoneName: zoneName || undefined,
      reason: selectedReason || reason || "Assistance needed",
    });
    
    setShowCallModal(false);
    setIsOpen(false);
    setReason("");
    
    // Show "Water on the way" for water requests, otherwise show success
    if (selectedReason === "Asking for water") {
      setShowWaterOnWay(true);
      setHideCartBar(true);
      setTimeout(() => {
        setShowWaterOnWay(false);
        setHideCartBar(false);
      }, 4000);
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  // Don't show if no table or restaurant is closed
  if (!tableNumber || !isRestaurantOpen()) return null;

  return (
    <>
      {/* Help Bubble */}
      <div className={`fixed right-3 z-30 transition-all duration-300 ${cartCount > 0 ? 'bottom-24' : 'bottom-20'}`}>
        {/* Menu Options */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 mb-2 animate-scale-in" style={{animationFillMode: 'forwards'}}>
            <div className="card rounded-none p-1.5 min-w-[140px] shadow-none">
              <button
                onClick={() => { handleCall("Asking for water"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-all text-[11px]"
              >
                <GlassWater size={14} className="text-black" />
                Water
              </button>
              <button
                onClick={() => { router.push('/my-orders'); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-all text-[11px]"
              >
                <ClipboardList size={14} className="text-[--primary]" />
                Order Status
              </button>
              <button
                onClick={() => { setShowCallModal(true); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-all text-[11px]"
              >
                <Bell size={14} className="text-[--primary]" />
                Call Staff
              </button>
            </div>
          </div>
        )}

        {/* Bubble Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-10 h-10 rounded-none flex items-center justify-center shadow-none active:scale-95 transition-all ${
            isOpen 
              ? 'bg-[--primary] text-[--bg]' 
              : 'bg-[--card] border border-[--border] text-[--text-muted] hover:border-[--primary]/30 hover:text-[--primary]'
          }`}
        >
          {isOpen ? <X size={14} /> : <HelpCircle size={15} />}
        </button>
      </div>

      {/* Success Toast */}
      <AnimatedToast show={showSuccess} onClose={() => setShowSuccess(false)}>
        <div className="flex items-center gap-2 bg-black/5 border border-black/10 text-black px-3 py-2 rounded-none text-[11px]">
          <Check size={12} />
          Staff notified
        </div>
      </AnimatedToast>

      {/* Call Staff Modal */}
      <AnimatedBottomSheet show={showCallModal} onClose={() => setShowCallModal(false)} maxHeight="auto">
        <div className="max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[--text-primary] font-medium text-sm">Call Staff</h3>
              <p className="text-[--text-dim] text-[10px]">Table {tableNumber}</p>
            </div>
            <button 
              onClick={() => setShowCallModal(false)}
              className="w-7 h-7 rounded-none bg-[--bg-elevated] flex items-center justify-center"
            >
              <X size={12} className="text-[--text-muted]" />
            </button>
          </div>

          <div className="space-y-1.5 mb-3">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => handleCall(r)}
                className="w-full text-left px-3 py-2.5 rounded-none bg-[--bg-elevated] border border-[--border] text-[--text-secondary] text-[11px] hover:border-[--primary]/30 hover:text-[--text-primary] transition-all active:scale-[0.98]"
              >
                {r}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Or type a message..."
              className="w-full rounded-none px-3 py-2.5 text-[11px] pr-14"
            />
            {reason && (
              <button
                onClick={() => handleCall(reason)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary px-2.5 py-1 rounded-none text-[10px]"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </AnimatedBottomSheet>

      {/* Water On The Way Toast */}
      <AnimatedToast 
        show={showWaterOnWay} 
        onClose={() => setShowWaterOnWay(false)}
        bottomClass={cartCount > 0 ? 'bottom-4' : 'bottom-4'}
      >
        <div className="card rounded-none p-3 flex items-center gap-3 shadow-none max-w-sm mx-auto">
          <img src="/water-loading.gif" alt="Loading" className="w-10 h-10 rounded-none" />
          <div className="flex-1">
            <p className="text-[--text-primary] font-medium text-sm">Water on the way!</p>
            <p className="text-[--text-dim] text-[10px]">Staff is bringing it to you</p>
          </div>
        </div>
      </AnimatedToast>
    </>
  );
}
