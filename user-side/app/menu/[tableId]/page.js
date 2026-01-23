"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cart";
import { useTable } from "@/lib/table";
import { useBranding } from "@/lib/useBranding";
import { useCachedQuery, CACHE_KEYS, CACHE_DURATIONS } from "@/lib/useCache";
import { 
  ShoppingBag, Plus, Minus, ArrowLeft, Armchair, 
  UtensilsCrossed, Search, X, Phone, Lock, GlassWater
} from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";
import { AnimatedBottomSheet, AnimatedToast, AnimatedPopup, AnimatedOverlay } from "@/components/AnimatedPopup";

// Format 24h time to 12h format
const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return minutes === 0 ? `${hour12} ${period}` : `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const categories = [
  { id: "All", icon: "◉" },
  { id: "Starters", icon: "◈" },
  { id: "Mains", icon: "◆" },
  { id: "Sides", icon: "◇" },
  { id: "Drinks", icon: "○" },
  { id: "Desserts", icon: "●" },
  { id: "Hookah", icon: "◎" },
];

export default function MenuPage() {
  const { tableId } = useParams();
  const router = useRouter();
  const { setTable } = useTable();
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();
  const [activeCategory, setActiveCategory] = useState("All");
  const [dismissedReservation, setDismissedReservation] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [unavailablePopup, setUnavailablePopup] = useState(null);
  const [showAddedGif, setShowAddedGif] = useState(false);
  const { cart, addToCart, updateQuantity, cartCount, cartTotal, hideCartBar } = useCart();
  
  // Reservation verification states
  const [verifyStep, setVerifyStep] = useState('ask'); // 'ask' | 'phone' | 'verified' | 'denied'
  const [phoneInput, setPhoneInput] = useState('');
  const [verifyError, setVerifyError] = useState('');
  
  // Welcome & water popup states
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [showWaterPopup, setShowWaterPopup] = useState(false);

  const table = useQuery(api.tables.getByNumber, { number: parseInt(tableId) });
  
  // Use cached query for menu items with image preloading
  const { data: menuItems, isLoading: menuLoading } = useCachedQuery(
    api.menuItems.listForZone,
    table !== undefined ? { zoneId: table?.zoneId } : "skip",
    table?.zoneId ? `${CACHE_KEYS.MENU_ITEMS}_${table.zoneId}` : null,
    {
      cacheDuration: CACHE_DURATIONS.MEDIUM,
      preloadImageKey: 'image',
    }
  );
  
  const reservation = useQuery(api.reservations.getCurrentForTable, { tableNumber: parseInt(tableId) });
  const createNotification = useMutation(api.staffNotifications.create);
  const createStaffCall = useMutation(api.staffCalls.create);
  const markArrived = useMutation(api.reservations.markArrived);

  // Set table context for call staff button
  useEffect(() => {
    const verified = sessionStorage.getItem(`table-${tableId}-verified`);
    if (verified) {
      setVerifyStep('verified');
      setDismissedReservation(true);
    }
    setIsHydrated(true);
  }, [tableId]);

  // Show water popup for all customers after 5 seconds (if not already shown this session)
  useEffect(() => {
    const waterShown = sessionStorage.getItem(`table-${tableId}-water-shown`);
    if (!waterShown && isHydrated) {
      const timer = setTimeout(() => {
        setShowWaterPopup(true);
        sessionStorage.setItem(`table-${tableId}-water-shown`, 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tableId, isHydrated]);

  // Set table context
  useEffect(() => {
    if (tableId) {
      setTable({
        tableId: String(tableId),
        tableNumber: parseInt(tableId),
        zoneName: table?.zone?.name || null,
      });
    }
  }, [tableId, table?.zone?.name]);

  // Don't show popups until hydrated (sessionStorage checked)
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  // Full screen closed alert (before reservation check) - COMMENTED OUT FOR NOW
  /*
  if (!isRestaurantOpen() && !dismissedClosed) {
    const handleDismissClosed = () => {
      setDismissedClosed(true);
      sessionStorage.setItem('closed-popup-dismissed', 'true');
    };
    
    const now = new Date();
    const hour = now.getHours();
    const OPEN_HOUR = 12;
    let hoursUntilOpen = hour < OPEN_HOUR ? OPEN_HOUR - hour : (24 - hour) + OPEN_HOUR;

    return (
      <div className="min-h-screen flex flex-col">
        <div className="p-5 flex items-center justify-between opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BTS DISC" className="h-9 w-9 rounded-none object-contain" />
            <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">BTS DISC</span>
          </div>
          <span className="text-[--text-dim] text-xs flex items-center gap-2">
            <Armchair size={14} /> 
            <span className="tracking-wider">TABLE {tableId}</span>
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
          <div 
            className="px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-bounce-in bg-black/5 text-black border border-black/10"
            style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-none bg-current mr-2 animate-pulse-soft" />
            Currently Closed
          </div>
          <div className="text-center mb-10">
            <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-4 opacity-0 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
              Business Hours
            </p>
            <div className="flex items-center gap-5">
              <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-left" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
                12 PM
              </span>
              <span className="text-[--text-dim] text-2xl opacity-0 animate-scale-in" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
                →
              </span>
              <span className="text-5xl font-luxury font-semibold text-[--text-primary] opacity-0 animate-slide-in-right" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
                11 PM
              </span>
            </div>
          </div>
          <div className="divider-glow w-24 mb-10 opacity-0 animate-expand" style={{animationDelay: '0.7s', animationFillMode: 'forwards'}} />
          <div className="text-center opacity-0 animate-slide-up" style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}>
            <p className="text-[--text-primary] text-xl font-luxury">Opens in ~{hoursUntilOpen}h</p>
            <p className="text-[--text-muted] text-sm mt-1">Open daily</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <button 
            onClick={handleDismissClosed}
            className="btn-primary w-full py-4 rounded-none text-sm font-medium opacity-0 animate-slide-up"
            style={{animationDelay: '0.9s', animationFillMode: 'forwards'}}
          >
            Browse Menu Anyway
          </button>
          <Link 
            href="/book"
            className="block w-full py-3 text-center text-[--text-muted] text-sm hover:text-[--text-primary] transition-colors opacity-0 animate-slide-up"
            style={{animationDelay: '1s', animationFillMode: 'forwards'}}
          >
            Book for Future
          </Link>
        </div>
      </div>
    );
  }
  */

  // Full screen reservation alert with verification - for current AND upcoming reservations
  // Skip if customer already arrived (verified from any device)
  if (reservation && !dismissedReservation && !reservation.arrived) {
    // Handle phone verification
    const handleVerifyPhone = async () => {
      const cleanPhone = phoneInput.replace(/\D/g, ''); // User enters 10 digits
      const reservationPhone = reservation.customerPhone?.replace(/\D/g, '') || ''; // DB has 91XXXXXXXXXX
      
      // Compare: user enters 10 digits, DB has 12 digits (91 + 10)
      // So check if reservation phone ends with user input
      if (reservationPhone.endsWith(cleanPhone) && cleanPhone.length === 10) {
        // Phone matches - allow access
        setVerifyStep('verified');
        setDismissedReservation(true);
        sessionStorage.setItem(`table-${tableId}-verified`, 'true');
        
        // Show welcome screen
        setWelcomeName(reservation.customerName);
        setShowWelcome(true);
        
        // After 2 seconds, hide welcome and show water popup after a delay
        setTimeout(() => {
          setShowWelcome(false);
          // Show water popup after 5 more seconds
          setTimeout(() => {
            setShowWaterPopup(true);
          }, 5000);
        }, 2000);
        
        // Mark reservation as arrived in database
        await markArrived({ id: reservation._id });
        
        // Notify staff that customer has arrived
        await createNotification({
          type: 'customer_arrived',
          message: `${reservation.customerName} arrived at Table ${tableId}`,
        });
        
        // Store customer info
        localStorage.setItem('customerPhone', reservation.customerPhone);
        localStorage.setItem('customerName', reservation.customerName);
      } else {
        setVerifyError('Phone number doesn\'t match the reservation');
      }
    };

    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-5 flex items-center justify-between opacity-0 animate-slide-down" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="BTS DISC" className="h-9 w-9 rounded-none object-contain" />
            <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">BTS DISC</span>
          </div>
          <span className="text-[--text-dim] text-xs flex items-center gap-2">
            <Armchair size={14} /> 
            <span className="tracking-wider">TABLE {tableId}</span>
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
          {/* Status Badge */}
          <div 
            className={`px-4 py-1.5 rounded-none text-[10px] font-semibold uppercase tracking-[0.2em] mb-8 opacity-0 animate-bounce-in ${
              reservation.isCurrent 
                ? 'bg-[--primary]/10 text-[--primary] border border-[--primary]/20' 
                : 'bg-black/5 text-black border border-black/10'
            }`} 
            style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-none bg-current mr-2 animate-pulse-soft" />
            {reservation.isCurrent ? 'Reserved Table' : 'Upcoming Reservation'}
          </div>

          {/* Step 1: Ask if they are the person */}
          {verifyStep === 'ask' && (
            <>
              <div className="text-center mb-8 opacity-0 animate-slide-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-3">Are you</p>
                <p className="text-4xl font-luxury font-semibold text-[--text-primary]">{reservation.customerName}?</p>
                {reservation.partySize && (
                  <p className="text-[--text-muted] text-sm mt-2">{reservation.partySize} guests • {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</p>
                )}
              </div>

              <div className="divider-glow w-24 mb-8 opacity-0 animate-expand" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}} />

              <div className="w-full max-w-xs space-y-3 opacity-0 animate-slide-up" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
                <button 
                  onClick={() => setVerifyStep('phone')}
                  className="btn-primary w-full py-4 rounded-none text-sm font-semibold"
                >
                  Yes, that's me
                </button>
                <button 
                  onClick={() => setVerifyStep('denied')}
                  className="btn-secondary w-full py-4 rounded-none text-sm font-semibold"
                >
                  No, I'm someone else
                </button>
              </div>
            </>
          )}

          {/* Step 2: Phone verification */}
          {verifyStep === 'phone' && (
            <>
              <div className="text-center mb-8 opacity-0 animate-slide-up" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
                <div className="w-16 h-16 rounded-none bg-[--primary]/10 border border-[--primary]/20 flex items-center justify-center mx-auto mb-4">
                  <Phone size={24} className="text-[--primary]" />
                </div>
                <p className="text-[--text-primary] text-lg font-luxury mb-2">Verify your phone</p>
                <p className="text-[--text-muted] text-sm">Enter the phone number used for booking</p>
              </div>

              <div className="w-full max-w-xs space-y-4 opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                <div>
                  <div className="flex items-center bg-[--card] border border-[--border] rounded-none overflow-hidden">
                    <span className="px-3 py-4 text-[--text-muted] text-lg border-r border-[--border]">+91</span>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10)); setVerifyError(''); }}
                      placeholder="10 digit number"
                      maxLength={10}
                      className="flex-1 bg-transparent px-4 py-4 text-center text-lg tracking-wider outline-none"
                      autoFocus
                    />
                  </div>
                  {verifyError && (
                    <p className="text-black text-xs text-center mt-2">{verifyError}</p>
                  )}
                </div>
                <button 
                  onClick={handleVerifyPhone}
                  disabled={!phoneInput}
                  className="btn-primary w-full py-4 rounded-none text-sm font-semibold disabled:opacity-50"
                >
                  Verify & Continue
                </button>
                <button 
                  onClick={() => setVerifyStep('ask')}
                  className="w-full py-3 text-[--text-muted] text-sm"
                >
                  Go back
                </button>
              </div>
            </>
          )}

          {/* Step 3: Access denied */}
          {verifyStep === 'denied' && (
            <>
              <div className="text-center mb-8 opacity-0 animate-slide-up" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
                <div className="w-16 h-16 rounded-none bg-black/5 border border-black/10 flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} className="text-black" />
                </div>
                <p className="text-[--text-primary] text-lg font-luxury mb-2">Table Reserved</p>
                <p className="text-[--text-muted] text-sm">This table is booked by {reservation.customerName}</p>
                <p className="text-[--text-dim] text-xs mt-1">{formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</p>
              </div>

              <div className="w-full max-w-xs space-y-3 opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                <Link href="/book" className="btn-primary w-full py-4 rounded-none text-sm font-semibold block text-center">
                  Book Your Own Table
                </Link>
                <Link href="/" className="btn-secondary w-full py-4 rounded-none text-sm font-semibold block text-center">
                  Go Home
                </Link>
                <button 
                  onClick={() => setVerifyStep('ask')}
                  className="w-full py-3 text-[--text-muted] text-sm"
                >
                  Wait, I am {reservation.customerName}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  // Show loading while branding loads
  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="w-12 h-12 border-2 border-[--border] border-t-[--primary] rounded-none animate-spin" />
      </div>
    );
  }

  if (!menuItems || menuLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loader mx-auto mb-4"></div>
          <p className="text-[--text-muted] text-sm">Loading menu...</p>
        </div>
      </div>
    );
  }

  // Filter items
  let filteredItems = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter((item) => item.category === activeCategory);
  
  if (searchQuery) {
    filteredItems = filteredItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const getItemQuantity = (menuItemId) => cart.find((i) => i.menuItemId === menuItemId)?.quantity || 0;
  
  const triggerAddedGif = () => {
    setShowAddedGif(true);
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setTimeout(() => setShowAddedGif(false), 1500);
  };
  
  const handleAddToCart = (item) => {
    addToCart({ 
      menuItemId: item._id, 
      name: item.name, 
      price: item.price, 
      image: item.image 
    });
    triggerAddedGif();
  };
  
  const handleUpdateQuantity = (menuItemId, newQty) => {
    const oldQty = getItemQuantity(menuItemId);
    updateQuantity(menuItemId, newQty);
    // Only show gif when increasing quantity
    if (newQty > oldQty) {
      triggerAddedGif();
    }
  };

  // Group items by category for "All" view
  const groupedItems = activeCategory === "All" 
    ? categories.slice(1).map(cat => ({
        ...cat,
        items: filteredItems.filter(item => item.category === cat.id)
      })).filter(cat => cat.items.length > 0)
    : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 glass">
        <div className="max-w-lg mx-auto">
          {/* Top row */}
          <div className="px-3 py-2 flex items-center justify-between">
            <button 
              onClick={() => router.back()} 
              className="w-8 h-8 flex items-center justify-center rounded-none bg-[--card] border border-[--border] active:scale-95"
            >
              <ArrowLeft size={14} className="text-[--text-muted]" />
            </button>
            
            <div className="text-center flex-1 px-2">
              <p className="text-[--text-primary] font-semibold text-xs">Table {tableId}</p>
              {table?.zone && (
                <p className="text-[8px] text-[--primary] uppercase tracking-wider">
                  {table.zone.name}
                </p>
              )}
            </div>
            
            <button 
              onClick={() => setShowSearch(!showSearch)} 
              className={`w-8 h-8 flex items-center justify-center rounded-none transition-all active:scale-95 ${
                showSearch 
                  ? 'bg-[--primary] text-[--bg]' 
                  : 'bg-[--card] border border-[--border] text-[--text-muted]'
              }`}
            >
              {showSearch ? <X size={14} /> : <Search size={14} />}
            </button>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="px-3 pb-2 animate-slide-down" style={{animationFillMode: 'forwards'}}>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[--text-dim]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu..."
                  autoFocus
                  className="w-full !bg-[--card] rounded-none pl-8 pr-3 py-2 text-[11px] placeholder:text-[--text-dim]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--text-dim]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Categories */}
          <div className="px-3 pb-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5">
              {categories.map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(cat.id)} 
                  className={`px-2.5 py-1.5 rounded-none text-[10px] font-medium whitespace-nowrap transition-all active:scale-95 ${
                    activeCategory === cat.id 
                      ? "pill-active" 
                      : "bg-[--card] border border-[--border] text-[--text-muted]"
                  }`}
                >
                  {cat.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <div className="max-w-lg mx-auto px-2 py-3">
        {searchQuery && (
          <p className="text-[--text-dim] text-[9px] mb-3 px-1">
            {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {/* Grouped view for "All" */}
        {groupedItems ? (
          <div className="space-y-8">
            {groupedItems.map((group, groupIndex) => (
              <div 
                key={group.id} 
                className="opacity-0 animate-slide-up" 
                style={{animationDelay: `${groupIndex * 0.1}s`, animationFillMode: 'forwards'}}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[--text-primary] font-luxury text-sm flex items-center gap-1.5">
                    <span className="text-[--primary] text-xs">{group.icon}</span>
                    {group.id}
                  </h2>
                  <span className="text-[--text-dim] text-[9px]">{group.items.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 menu-card-grid">
                  {group.items.map((item) => (
                    <MenuItem 
                      key={item._id} 
                      item={item} 
                      qty={getItemQuantity(item._id)}
                      onAdd={() => handleAddToCart(item)}
                      onUpdate={(newQty) => handleUpdateQuantity(item._id, newQty)}
                      onUnavailable={() => setUnavailablePopup(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single category view */
          <div className="grid grid-cols-2 gap-2 stagger-children menu-card-grid">
            {filteredItems.map((item) => (
              <MenuItem 
                key={item._id} 
                item={item} 
                qty={getItemQuantity(item._id)}
                onAdd={() => handleAddToCart(item)}
                onUpdate={(newQty) => handleUpdateQuantity(item._id, newQty)}
                onUnavailable={() => setUnavailablePopup(item)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-14 h-14 rounded-none bg-[--card] border border-[--border] flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed size={24} className="text-[--text-dim]" />
            </div>
            <p className="text-[--text-muted] text-xs mb-2">No items found</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="text-[--primary] text-xs"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {cartCount > 0 && !hideCartBar && (
      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-5">
  <div className="max-w-lg mx-auto">
    <Link
      href={`/cart/${tableId}`}
      className="
        relative overflow-hidden
        flex items-center justify-between
        rounded-none px-4 py-3
        border border-white/10
        bg-white/5 backdrop-blur-xl
        shadow-[0_10px_30px_rgba(0,0,0,0.35)]
        active:scale-[0.985]
        transition-all duration-200
        group
      "
    >
      {/* Glow gradient */}
      <div
        className="
          absolute inset-0 opacity-0 group-hover:opacity-100
          transition-opacity duration-300
          bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_55%)]
        "
      />

      {/* Animated shine */}
      <div
        className="
          absolute -left-10 top-0 h-full w-24
          bg-white/10 blur-xl rotate-12
          translate-x-[-120%]
          group-hover:translate-x-[450%]
          transition-transform duration-700
        "
      />

      {/* Left */}
      <div className="relative flex items-center gap-3">
        <div
          className="
            w-10 h-10 rounded-none
            bg-[--primary]/15 border border-[--primary]/25
            flex items-center justify-center
            shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]
            overflow-hidden
          "
        >
          {showAddedGif ? (
            <img src="/added.gif" alt="Added" className="" />
          ) : (
            <span className="text-[--primary] font-semibold text-sm">
              {cartCount}
            </span>
          )}
        </div>

        <div className="leading-tight">
          <p className="text-[--text-primary] text-xs font-semibold tracking-wide">
            View Cart
          </p>
          <p className="text-[--text-dim] text-[10px]">
            {cartCount} item{cartCount !== 1 ? "s" : ""} added
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="relative flex items-center gap-2">
        <span className="text-[--text-primary] font-semibold text-base">
          ₹{cartTotal.toFixed(0)}
        </span>

       
      </div>

    </Link>
  </div>
</div>

      )}

      {/* Unavailable Item Popup */}
      <AnimatedPopup 
        show={!!unavailablePopup} 
        onClose={() => setUnavailablePopup(null)}
        className="absolute inset-0 flex items-center justify-center p-4"
      >
        <div className="card rounded-none p-6 max-w-[300px] w-full text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-black pointer-events-none" />
          
          {/* Location GIF */}
          <div className="relative w-20 h-20 mx-auto mb-3">
            <img src="/location.gif" alt="Location" className="w-full h-full object-contain" />
          </div>
          
          {/* Content */}
          <div className="relative">
            <h3 className="text-[--text-primary] font-luxury text-lg mb-1">
              Oops! Zone Restricted
            </h3>
            <p className="text-[--primary] font-semibold text-base mb-4">{unavailablePopup?.name}</p>
            
            {/* Current zone badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-  border border-black/10 mb-3">
              <div className="w-1.5 h-1.5 -full bg-red-400 animate-pulse" />
              <span className="text-black text-[11px] font-medium">
                Not available at {table?.zone?.name || 'your table'}
              </span>
            </div>
            
            {/* Allowed zones */}
            {unavailablePopup?.allowedZoneNames && unavailablePopup.allowedZoneNames.length > 0 ? (
              <div className="mt-3 mb-5">
                <p className="text-[--text-dim] text-[10px] uppercase tracking-wider mb-2">Available in</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {unavailablePopup.allowedZoneNames.map((zone, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded- border border-black/10 text-black text-[11px] font-medium"
                    >
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[--text-dim] text-[11px] mb-5 mt-2">
                This item is zone-restricted
              </p>
            )}
            
            <button 
              onClick={() => setUnavailablePopup(null)}
              className="w-full py-3 rounded-none text-sm font-semibold bg-[--card] border border-[--border] text-[--text-primary] hover:bg-[--bg-elevated] active:scale-[0.98] transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      </AnimatedPopup>

      {/* Welcome Overlay */}
      <AnimatedOverlay show={showWelcome} className="flex items-center justify-center bg-[--bg]">
        <div className="text-center">
          <p className="text-[--text-dim] text-xs uppercase tracking-[0.3em] mb-4">Welcome</p>
          <h1 className="text-4xl font-luxury font-semibold text-[--text-primary] mb-2">{welcomeName}</h1>
          <p className="text-[--text-muted] text-sm">Enjoy your time at BTS DISC</p>
        </div>
      </AnimatedOverlay>

      {/* Water Popup - slides up from bottom */}
      <AnimatedBottomSheet show={showWaterPopup} onClose={() => setShowWaterPopup(false)}>
        <div className="text-center">
          <img src="/water-loading.gif" alt="Loading" className="w-[70]  flex justify-center mx-auto rounded-none" />
          <h3 className="text-[--text-primary] font-luxury text-lg mb-2">Want some water?</h3>
          <p className="text-[--text-muted] text-sm mb-5">We'll bring it right over</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowWaterPopup(false)}
              className="flex-1 btn-secondary py-3 rounded-none text-sm font-medium"
            >
              No thanks
            </button>
            <button 
              onClick={async () => {
                await createStaffCall({
                  tableId: String(tableId),
                  tableNumber: parseInt(tableId),
                  zoneName: table?.zone?.name,
                  reason: 'Asking for water',
                });
                setShowWaterPopup(false);
              }}
              className="flex-1 btn-primary py-3 rounded-none text-sm font-medium"
            >
              Yes please
            </button>
          </div>
        </div>
      </AnimatedBottomSheet>
    </div>
  );
}

// Menu Item Component
function MenuItem({ item, qty, onAdd, onUpdate, onUnavailable }) {
  const isRestricted = !item.isAvailableInZone;
  
  const handleClick = () => {
    if (isRestricted) {
      // Vibrate "na na na" pattern when unavailable
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]); // na-na-na pattern
      }
      onUnavailable();
      return;
    }
    if (qty === 0) {
      onAdd();
    } else {
      onUpdate(qty + 1);
    }
  };
  
  return (
    <div 
      onClick={handleClick}
      className={`card rounded-none overflow-hidden cursor-pointer group menu-card-item ${
        isRestricted ? 'opacity-60' : ''
      }`}
    >
      {/* Image - smaller aspect ratio */}
      <div className="menu-image aspect-[5/4] flex items-center justify-center relative overflow-hidden">
        <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
        {qty > 0 && (
          <div className="absolute top-1.5 right-1.5 qty-badge w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-[--bg] animate-scale-in">
            {qty}
          </div>
        )}
      </div>
      
      {/* Info - compact */}
      <div className="p-2">
        <h3 className="font-medium text-[--text-primary] text-[11px] mb-0.5 line-clamp-1 group-hover:text-[--primary] transition-colors">
          {item.name}
        </h3>
        <p className="text-[8px] text-[--text-dim] line-clamp-1 mb-1.5">
          {item.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="price-tag text-xs">₹{item.price.toFixed(0)}</span>
          
          {isRestricted ? (
            <span className="text-[8px] text-black/80">Not here</span>
          ) : qty > 0 ? (
            <div 
              className="flex items-center bg-[--bg-elevated] rounded border border-[--border] qty-controls" 
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => onUpdate(qty - 1)} 
                className="w-5 h-5 flex items-center justify-center text-[--text-muted] active:scale-90"
              >
                <Minus size={10} />
              </button>
              <span className="w-3 text-center text-[10px] font-semibold text-[--text-primary]">
                {qty}
              </span>
              <button 
                onClick={() => onUpdate(qty + 1)} 
                className="w-5 h-5 flex items-center justify-center text-[--primary] active:scale-90"
              >
                <Plus size={10} />
              </button>
            </div>
          ) : (
            <span className="text-[8px] text-[--text-dim]">+ Add</span>
          )}
        </div>
      </div>
    </div>
  );
}
