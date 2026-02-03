"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HelpCircle, Bell, ClipboardList, X, Check, GlassWater } from "lucide-react";
import { isRestaurantOpen } from "@/components/ClosedPopup";
import { AnimatedBottomSheet, AnimatedToast } from "@/components/AnimatedPopup";
import { useCart } from "@/lib/cart";
import { useTable } from "@/lib/table";

export default function FloatingQuickMenu() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const restaurantId = params?.restaurantId;
  const { cartCount, setHideCartBar } = useCart();
  const { tableInfo } = useTable();
  const tableId = tableInfo?.tableId;
  const tableNumber = tableInfo?.tableNumber;
  const zoneName = tableInfo?.zoneName;

  const [isOpen, setIsOpen] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWaterOnWay, setShowWaterOnWay] = useState(false);
  const [showNoTableToast, setShowNoTableToast] = useState(false);
  const [reason, setReason] = useState("");
  const createCall = useMutation(api.staffCalls.create);

  const restaurant = useQuery(api.restaurants.getByShortId, restaurantId ? { id: restaurantId } : "skip");
  const restaurantDbId = restaurant?._id;

  const waterAcknowledged = useQuery(
    api.staffCalls.getWaterAcknowledged,
    tableNumber ? { tableNumber: parseInt(tableNumber) } : "skip"
  );

  useEffect(() => {
    if (waterAcknowledged?.acknowledgedAt) {
      const lastSeenTime = sessionStorage.getItem(`waterAck-${waterAcknowledged._id}`);
      const ackTime = String(waterAcknowledged.acknowledgedAt);
      if (lastSeenTime !== ackTime) {
        setShowWaterOnWay(true);
        setHideCartBar?.(true);
        sessionStorage.setItem(`waterAck-${waterAcknowledged._id}`, ackTime);
        setTimeout(() => {
          setShowWaterOnWay(false);
          setHideCartBar?.(false);
        }, 4000);
      }
    }
  }, [waterAcknowledged, setHideCartBar]);

  const reasons = ["Need assistance", "Request bill"];

  const handleCall = async (selectedReason) => {
    if (!tableNumber || !restaurantDbId) {
      setShowNoTableToast(true);
      setTimeout(() => setShowNoTableToast(false), 2000);
      return;
    }
    await createCall({
      restaurantId: restaurantDbId,
      tableId: tableId || String(tableNumber),
      tableNumber: parseInt(tableNumber),
      zoneName: zoneName || undefined,
      reason: selectedReason || reason || "Assistance needed",
    });
    setShowCallModal(false);
    setIsOpen(false);
    setReason("");
    if (selectedReason === "Asking for water") {
      setShowWaterOnWay(true);
      setHideCartBar?.(true);
      setTimeout(() => {
        setShowWaterOnWay(false);
        setHideCartBar?.(false);
      }, 4000);
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const goToMyOrders = () => {
    if (!restaurantId) return;
    router.push(`/r/${restaurantId}/my-orders`);
    setIsOpen(false);
  };

  const hasTable = Boolean(tableNumber);
  const isAdminPage = pathname?.includes("/admin");
  const open = isRestaurantOpen();

  if (!restaurantId || isAdminPage || !open) return null;

  return (
    <>
      <div
        className={`fixed right-3 z-[35] transition-all duration-300 ${
          cartCount > 0 ? "bottom-24" : "bottom-4"
        }`}
      >
        {isOpen && (
          <div
            className="absolute bottom-11 right-0 mb-1 animate-scale-in"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="card rounded-xl p-1.5 min-w-[150px] shadow-xl border border-[--border]">
              <button
                onClick={goToMyOrders}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-all text-[11px]"
              >
                <ClipboardList size={14} className="text-[--primary]" />
                Order Status
              </button>
              <button
                onClick={() => {
                  if (hasTable) handleCall("Asking for water");
                  else {
                    setShowNoTableToast(true);
                    setTimeout(() => setShowNoTableToast(false), 2000);
                  }
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-all text-[11px]"
              >
                <GlassWater size={14} className="text-blue-400" />
                Water
              </button>
              <button
                onClick={() => {
                  if (hasTable) setShowCallModal(true);
                  else {
                    setShowNoTableToast(true);
                    setTimeout(() => setShowNoTableToast(false), 2000);
                  }
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-all text-[11px]"
              >
                <Bell size={14} className="text-[--primary]" />
                Call Staff
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Quick menu: order status, water, call staff"
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${
            isOpen
              ? "bg-[--primary] text-[--bg]"
              : "bg-[--card] border border-[--border] text-[--text-muted] hover:border-[--primary]/30 hover:text-[--primary]"
          }`}
        >
          {isOpen ? <X size={16} /> : <HelpCircle size={18} />}
        </button>
      </div>

      <AnimatedToast show={showSuccess} onClose={() => setShowSuccess(false)}>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-lg text-[11px]">
          <Check size={12} />
          Staff notified
        </div>
      </AnimatedToast>

      <AnimatedToast show={showNoTableToast} onClose={() => setShowNoTableToast(false)}>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 px-3 py-2 rounded-lg text-[11px]">
          Open menu first to set your table
        </div>
      </AnimatedToast>

      <AnimatedBottomSheet show={showCallModal} onClose={() => setShowCallModal(false)} maxHeight="auto">
        <div className="max-w-xs mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[--text-primary] font-medium text-sm">Call Staff</h3>
              {tableNumber && <p className="text-[--text-dim] text-[10px]">Table {tableNumber}</p>}
            </div>
            <button
              onClick={() => setShowCallModal(false)}
              className="w-7 h-7 rounded-md bg-[--bg-elevated] flex items-center justify-center"
            >
              <X size={12} className="text-[--text-muted]" />
            </button>
          </div>
          <div className="space-y-1.5 mb-3">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => handleCall(r)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-[--bg-elevated] border border-[--border] text-[--text-secondary] text-[11px] hover:border-[--primary]/30 hover:text-[--text-primary] transition-all active:scale-[0.98]"
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
              className="w-full rounded-lg px-3 py-2.5 text-[11px] pr-14 bg-[--bg-elevated] border border-[--border]"
            />
            {reason && (
              <button
                onClick={() => handleCall(reason)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary px-2.5 py-1 rounded-md text-[10px]"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </AnimatedBottomSheet>

      <AnimatedToast show={showWaterOnWay} onClose={() => setShowWaterOnWay(false)} bottomClass="bottom-4">
        <div className="card rounded-xl p-3 flex items-center gap-3 shadow-lg max-w-sm mx-auto">
          <img src="/assets/gifs/water-loading.gif" alt="Loading" className="w-10 h-10 rounded-lg" />
          <div className="flex-1">
            <p className="text-[--text-primary] font-medium text-sm">Water on the way!</p>
            <p className="text-[--text-dim] text-[10px]">Staff is bringing it to you</p>
          </div>
        </div>
      </AnimatedToast>
    </>
  );
}
