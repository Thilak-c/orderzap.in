"use client";
import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cart";
import { useTable } from "@/lib/table";
import { useCachedQuery, CACHE_KEYS, CACHE_DURATIONS } from "@/lib/useCache";
import { isQRSessionValid } from "@/lib/qrAuth";
import {
  ChevronRight, Plus, Minus, ArrowLeft, Armchair,
  UtensilsCrossed, Search, X, Phone, Lock, GlassWater
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { AnimatedBottomSheet, AnimatedToast, AnimatedPopup, AnimatedOverlay } from "@/components/AnimatedPopup";

// Format 24h time to 12h format
const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return minutes === 0 ? `${hour12} ${period}` : `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function MenuPage() {
  const { tableId, restaurantId } = useParams();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionKey = searchParams.get('key');
  const { setTable } = useTable();

  // Get restaurant data
  const restaurant = useQuery(api.restaurants.getByShortId,
    restaurantId ? { id: restaurantId } : "skip"
  );
  const restaurantDbId = restaurant?._id;
  const brandName = restaurant?.name || "Restaurant";
  const brandLogo = restaurant?.logo_url;
  const brandingLoading = restaurant === undefined;

  // Get theme colors - create gradient from light to dark
  const themeColors = restaurant?.themeColors;
  const baseColor = themeColors?.lightVibrant || '#ff2530'; // Lightest - for background
  const sidebarColor = themeColors?.darkVibrant || '#b01820'; // Darkest - for sidebar
  const headerColor = themeColors?.darkVibrant || '#b01820'; // Darkest - for header
  const buttonColor = themeColors?.darkVibrant || '#b01820'; // Darkest - for buttons
  const cartBarColor = themeColors?.darkVibrant || '#b01820'; // Darkest - for cart bar
  const [activeCategory, setActiveCategory] = useState("All");
  const [dismissedReservation, setDismissedReservation] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [unavailablePopup, setUnavailablePopup] = useState(null);
  const [showAddedGif, setShowAddedGif] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [prevCartCount, setPrevCartCount] = useState(0);
  const [countAnimating, setCountAnimating] = useState(false);
  const [countDirection, setCountDirection] = useState('up'); // 'up' or 'down'
  const cartContext = useCart();

  // Initialize cart for this table
  useEffect(() => {
    if (tableId) {
      cartContext.initializeCart(tableId);
    }
  }, [tableId, cartContext]);

  // Get table-specific cart data
  const cart = cartContext.getCart(tableId);
  const cartCount = cartContext.getCartCount(tableId);
  const cartTotal = cartContext.getCartTotal(tableId);
  const { hideCartBar, setHideCartBar } = cartContext;

  // Pagination state
  const [displayCount, setDisplayCount] = useState(6);

  // Reservation verification states
  const [verifyStep, setVerifyStep] = useState('ask'); // 'ask' | 'phone' | 'verified' | 'denied'
  const [phoneInput, setPhoneInput] = useState('');
  const [verifyError, setVerifyError] = useState('');

  // Welcome & water popup states
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [showWaterPopup, setShowWaterPopup] = useState(false);

  const table = useQuery(api.tables.getByNumber,
    restaurantDbId ? {
      number: parseInt(tableId),
      restaurantId: restaurantDbId
    } : "skip"
  );

  // Use cached query for menu items with restaurant and zone filtering
  const { data: menuItems, isLoading: menuLoading } = useCachedQuery(
    api.menuItems.listForZone,
    table !== undefined && restaurantId ? {
      restaurantId: restaurantId, // Use short ID directly
      zoneId: table?.zoneId
    } : "skip",
    table?.zoneId && restaurantId ? `${CACHE_KEYS.MENU_ITEMS}_${restaurantId}_${table.zoneId}` : null,
    {
      cacheDuration: CACHE_DURATIONS.LONG, // 1 hour cache for menu items
      preloadImageKey: 'image',
    }
  );

  const reservation = useQuery(api.reservations.getCurrentForTable,
    restaurantDbId ? {
      tableNumber: parseInt(tableId),
      restaurantId: restaurantDbId
    } : "skip"
  );

  // Get categories from database - use short restaurantId directly
  const dbCategories = useQuery(api.categories.list,
    restaurantId ? { restaurantId: restaurantId } : "skip"
  );

  const createNotification = useMutation(api.staffNotifications.create);
  const createStaffCall = useMutation(api.staffCalls.create);
  const markArrived = useMutation(api.reservations.markArrived);

  // Set table context for call staff button
  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);
    
    // Ensure cart bar is visible
    setHideCartBar(false);

    // Set QR session for cart page validation
    if (tableId && restaurantId) {
      const qrSession = {
        tableId: String(tableId),
        restaurantId: restaurantId,
        timestamp: Date.now()
      };
      sessionStorage.setItem('qr_scan_session', JSON.stringify(qrSession));
    }

    // Check QR session with key validation
    // if (!sessionKey || !isQRSessionValid(tableId, sessionKey)) {
    //   // No valid QR session - redirect to home
    //   router.replace('/');
    //   return;
    // }

    setCheckingSession(false);

    const verified = sessionStorage.getItem(`table-${tableId}-verified`);
    if (verified) {
      setVerifyStep('verified');
      setDismissedReservation(true);
    }
    setIsHydrated(true);
  }, [tableId, sessionKey, router]); // Removed setHideCartBar from dependencies

  // Show water popup for all customers after 10 seconds (if not already shown this session)
  useEffect(() => {
    const waterShown = sessionStorage.getItem(`table-${tableId}-water-shown`);
    if (!waterShown && isHydrated) {
      const timer = setTimeout(() => {
        setShowWaterPopup(true);
        sessionStorage.setItem(`table-${tableId}-water-shown`, 'true');
      }, 10000);
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

  // Prefetch cart page when cart has items
  useEffect(() => {
    if (cartCount > 0) {
      router.prefetch(`/r/${params.restaurantId}/m/${tableId}/c/${tableId}`);
    }
  }, [cartCount, tableId, router, params.restaurantId]);

  // Preload cart bar video
  useEffect(() => {
    const video = document.createElement('video');
    video.src = '/assets/videos/added-animation.mp4';
    video.preload = 'auto';
    video.onloadeddata = () => {
      setVideoLoaded(true);
    };
    video.onerror = () => {
      // If video fails to load, still show the page
      setVideoLoaded(true);
    };
    video.load();
  }, []);

  // Animate cart count changes
  useEffect(() => {
    if (cartCount !== prevCartCount && prevCartCount !== 0) {
      // Determine direction: up if increasing, down if decreasing
      setCountDirection(cartCount > prevCartCount ? 'up' : 'down');
      setCountAnimating(true);
      setTimeout(() => {
        setCountAnimating(false);
        setPrevCartCount(cartCount);
      }, 300);
    } else {
      setPrevCartCount(cartCount);
    }
  }, [cartCount, prevCartCount]);

  // Parallax effect state
  const [scrollY, setScrollY] = useState(0);

  // Infinite scroll - load more items when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        setDisplayCount(prev => prev + 6);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset display count when category or search changes
  useEffect(() => {
    setDisplayCount(6);
  }, [activeCategory, searchQuery]);

  // Don't show popups until hydrated (sessionStorage checked)
  if (!isHydrated || checkingSession || menuLoading || !videoLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader-4">Table {tableId}</div>
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
            <img src="/assets/logos/orderzap-logo.png" alt="OrderZap" className="h-9 w-9 rounded-full object-contain" />
            <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">OrderZap</span>
          </div>
          <span className="text-[--text-dim] text-xs flex items-center gap-2">
            <Armchair size={14} /> 
            <span className="tracking-wider">TABLE {tableId}</span>
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-24">
          <div 
            className="px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-10 opacity-0 animate-bounce-in bg-amber-500/10 text-amber-400 border border-amber-500/20"
            style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse-soft" />
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
            className="btn-primary w-full py-4 rounded-xl text-sm font-medium opacity-0 animate-slide-up"
            style={{animationDelay: '0.9s', animationFillMode: 'forwards'}}
          >
            Browse Menu Anyway
          </button>
          <Link 
            href="/demo/book"
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

        // After 2 seconds, hide welcome and show water popup after 10 seconds
        setTimeout(() => {
          setShowWelcome(false);
          setTimeout(() => {
            setShowWaterPopup(true);
          }, 10000);
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
        <div className="p-5 flex items-center justify-between opacity-0 animate-slide-down" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3">
            <img src="/assets/logos/orderzap-logo.png" alt="OrderZap" className="h-9 w-9 rounded-full object-contain" />
            <span className="text-[--text-dim] text-xs tracking-[0.15em] uppercase">OrderZap</span>
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
            className={`px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-8 opacity-0 animate-bounce-in ${reservation.isCurrent
              ? 'bg-[--primary]/10 text-[--primary] border border-[--primary]/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse-soft" />
            {reservation.isCurrent ? 'Reserved Table' : 'Upcoming Reservation'}
          </div>

          {/* Step 1: Ask if they are the person */}
          {verifyStep === 'ask' && (
            <>
              <div className="text-center mb-8 opacity-0 animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                <p className="text-[--text-dim] text-[10px] uppercase tracking-[0.3em] mb-3">Are you</p>
                <p className="text-4xl font-luxury font-semibold text-[--text-primary]">{reservation.customerName}?</p>
                {reservation.partySize && (
                  <p className="text-[--text-muted] text-sm mt-2">{reservation.partySize} guests • {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</p>
                )}
              </div>

              <div className="divider-glow w-24 mb-8 opacity-0 animate-expand" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }} />

              <div className="w-full max-w-xs space-y-3 opacity-0 animate-slide-up" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
                <button
                  onClick={() => setVerifyStep('phone')}
                  className="btn-primary w-full py-4 rounded-xl text-sm font-semibold"
                >
                  Yes, that's me
                </button>
                <button
                  onClick={() => setVerifyStep('denied')}
                  className="btn-secondary w-full py-4 rounded-xl text-sm font-semibold"
                >
                  No, I'm someone else
                </button>
              </div>
            </>
          )}

          {/* Step 2: Phone verification */}
          {verifyStep === 'phone' && (
            <>
              <div className="text-center mb-8 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                <div className="w-16 h-16 rounded-full bg-[--primary]/10 border border-[--primary]/20 flex items-center justify-center mx-auto mb-4">
                  <Phone size={24} className="text-[--primary]" />
                </div>
                <p className="text-[--text-primary] text-lg font-luxury mb-2">Verify your phone</p>
                <p className="text-[--text-muted] text-sm">Enter the phone number used for booking</p>
              </div>

              <div className="w-full max-w-xs space-y-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                <div>
                  <div className="flex items-center bg-[--card] border border-[--border] rounded-xl overflow-hidden">
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
                    <p className="text-red-400 text-xs text-center mt-2">{verifyError}</p>
                  )}
                </div>
                <button
                  onClick={handleVerifyPhone}
                  disabled={!phoneInput}
                  className="btn-primary w-full py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
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
              <div className="text-center mb-8 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Lock size={24} className="text-red-400" />
                </div>
                <p className="text-[--text-primary] text-lg font-luxury mb-2">Table Reserved</p>
                <p className="text-[--text-muted] text-sm">This table is booked by {reservation.customerName}</p>
                <p className="text-[--text-dim] text-xs mt-1">{formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</p>
              </div>

              <div className="w-full max-w-xs space-y-3 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                <Link href="/demo/book" className="btn-primary w-full py-4 rounded-xl text-sm font-semibold block text-center">
                  Book Your Own Table
                </Link>
                <Link href="/" className="btn-secondary w-full py-4 rounded-xl text-sm font-semibold block text-center">
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
        <div className="loader" />
      </div>
    );
  }

  if (!menuItems || menuLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loader-4">Table {tableId}</div>

          {/* <p className="text-[--text-muted] text-sm">Loading menu...</p> */}
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

  // Build dynamic categories from database
  const categories = [
    { id: "All", icon: "◉", iconType: "default" },
    ...(dbCategories?.map(cat => {
      // Determine icon source
      let iconSrc = null;
      let iconType = "default";

      if (cat.iconUrl || cat.iconFileUrl) {
        // Custom uploaded icon
        iconSrc = cat.iconUrl || cat.iconFileUrl;
        iconType = "custom";
      } else if (cat.icon) {
        // Default icon from assets
        iconSrc = `/assets/icons/categories/v2/${cat.icon.toLowerCase()}-active.png`;
        iconType = "image";
      }

      return {
        id: cat.name,
        icon: cat.icon || "◈",
        iconSrc: iconSrc,
        iconType: iconType
      };
    }) || [])
  ];

  // For "All" category, show all items (no need to reorder)
  // Items are already filtered above

  // Limit displayed items for performance
  const displayedItems = filteredItems.slice(0, displayCount);
  const hasMore = filteredItems.length > displayCount;

  const getItemQuantity = (menuItemId) => cart.find((i) => i.menuItemId === menuItemId)?.quantity || 0;

  const triggerAddedGif = () => {
    setShowAddedGif(true);
    // Vibrate if supported
    navigator.vibrate(50);

    // Show GIF for 1.5 seconds to let it play fully
    setTimeout(() => setShowAddedGif(false), 1500);
  };

  const handleAddToCart = (item) => {
    cartContext.addToCart(tableId, {
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      image: item.imageUrl || item.image // Use imageUrl (API route) with fallback
    });
    triggerAddedGif();
  };

  const handleUpdateQuantity = (menuItemId, newQty) => {
    const oldQty = getItemQuantity(menuItemId);
    cartContext.updateQuantity(tableId, menuItemId, newQty);
    // Only show gif when increasing quantity
    if (newQty > oldQty) {
      triggerAddedGif();
    }
  };

  // Group items by category for "All" view
  const groupedItems = activeCategory === "All"
    ? categories.slice(1).map(cat => ({
      ...cat,
      items: displayedItems.filter(item => item.category === cat.id)
    })).filter(cat => cat.items.length > 0)
    : null;

  return (
    <div className="min-h-screen pb-20" style={{ 
      backgroundColor: baseColor,
      '--theme-bg': baseColor,
      '--theme-header': headerColor,
      '--theme-button': buttonColor
    }}>
      {/* Header - Full width */}
      <header className="sticky top-0 z-30">
        {/* Top row */}
        <div className="pr-2 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: headerColor }}>
          <div className="flex-1 px-2 min-w-0 flex items-center gap-3">
            {brandLogo ? (
              <img src={brandLogo} className="h-12 w-12 rounded-full object-cover" alt={brandName} />
            ) : (
              <img src="/assets/logos/orderzap-logo.png" className="h-8 w-18" alt="" />
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="text-white font-bold text-base truncate">{brandName}</h1>
              <p className="text-white/80 text-xs">Table {tableId}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                // Focus search input after animation
                setTimeout(() => {
                  document.getElementById('menu-search-input')?.focus();
                }, 100);
              }
            }}
            className="w-12 h-12 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
          >
            {showSearch ? (
              <X size={24} className="text-white" />
            ) : (
              <Search size={24} className="text-white" />
            )}
          </button>
        </div>

        {/* Search bar - Enhanced design */}
        <div
          className={`px-4 overflow-hidden transition-all duration-300 ${showSearch
              ? 'max-h-32 opacity-100 pb-3 pt-2'
              : 'max-h-0 opacity-0'
            }`}
          style={{ backgroundColor: headerColor }}
        >
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input
              id="menu-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for dishes, drinks, hookah..."
              className="w-full bg-white rounded-2xl pl-12 pr-12 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  document.getElementById('menu-search-input')?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 active:scale-95 transition-all"
              >
                <X size={14} className="text-gray-600" />
              </button>
            )}
          </div>

          {/* Search suggestions/quick filters */}
          {searchQuery && (
            <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
              <span>Searching in:</span>
              <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                {activeCategory === "All" ? "All Categories" : activeCategory}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Left Sidebar - Quick Access */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-16 border-r border-white/10 z-20 overflow-y-auto scrollbar-hide transition-transform duration-300 ${showSearch ? '-translate-x-full' : 'translate-x-0'
          }`}
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex flex-col gap-1.5 p-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;

            // Count cart items in this category
            const cartItemsInCategory = cat.id === "All"
              ? cartCount
              : cart.filter(cartItem => {
                const menuItem = menuItems?.find(m => m._id === cartItem.menuItemId);
                return menuItem?.category === cat.id;
              }).reduce((sum, item) => sum + item.quantity, 0);

            return (
              <button
                key={cat.id}
                onClick={() => {
                  navigator.vibrate(50);
                  setActiveCategory(cat.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="relative flex flex-col items-center justify-center rounded-lg transition-all active:scale-95 bg-transparent py-2"
              >
                {/* Display icon based on type */}
                {cat.iconType === "image" || cat.iconType === "custom" ? (
                  <img
                    src={cat.iconSrc}
                    alt={cat.id}
                    className="w-12 h-12 object-contain mb-1"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center text-xl mb-1">
                    {cat.icon}
                  </div>
                )}

                {/* Category name */}
                <span className="text-white text-[9px] font-medium text-center leading-tight px-1">
                  {cat.id}
                </span>

                {/* Cart count badge */}
                {cartItemsInCategory > 0 && (
                  <div
                    style={{ Color: buttonColor }} className="absolute top-1 right-1 w-5 h-5 rounded-full   text-[9px] font-bold flex items-center justify-center">
                    <OdometerNumber value={cartItemsInCategory} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Menu Content - with left padding for sidebar */}
      <div className={`transition-all duration-300 py-3 ${showSearch ? 'pl-2 pr-2' : 'pl-16'}`}>
        {searchQuery && (
          <div className="mb-4 px-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[--text-primary] text-sm font-medium">
                {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[--primary] text-xs font-medium hover:underline"
              >
                Clear search
              </button>
            </div>
            <p className="text-[--text-muted] text-xs">
              Searching for "<span className="text-[--text-primary] font-medium">{searchQuery}</span>"
            </p>
          </div>
        )}

        {/* Grouped view for "All" */}
        {groupedItems ? (
          <div className="space-y-8">
            {groupedItems.map((group, groupIndex) => (
              <div
                key={group.id}
                className="opacity-0 animate-slide-up"
                style={{ animationDelay: `${groupIndex * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className="w-full h-px bg-[--border] my-3 opacity-40"></div>


                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[--text-primary] font-luxury text-sm flex items-center gap-1.5">
                    <span className=" ml-2 text-[--primary] text-xs">{group.icon}</span>
                    {group.id}

                  </h2>
                  <span className="text-[--text-dim] mr-2 text-[9px]">{group.items.length}</span>
                </div>
                <div className="w-full h-px bg-[--border] my-3 opacity-40"></div>


                <div className="grid grid-cols-1 gap-2 menu-card-grid">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={item._id}
                      className="opacity-0 animate-slide-in-right"
                      style={{ animationDelay: `${itemIndex * 0.05}s`, animationFillMode: 'forwards' }}
                    >
                      <MenuItem
                        item={item}
                        qty={getItemQuantity(item._id)}
                        onAdd={() => handleAddToCart(item)}
                        onUpdate={(newQty) => handleUpdateQuantity(item._id, newQty)}
                        onUnavailable={() => setUnavailablePopup(item)}
                        buttonColor={buttonColor}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single category view */
          <div className="grid grid-cols-1 gap-2 menu-card-grid">
            {displayedItems.map((item, itemIndex) => (
              <div
                key={item._id}
                className="opacity-0 animate-slide-in-right"
                style={{ animationDelay: `${itemIndex * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <MenuItem
                  item={item}
                  qty={getItemQuantity(item._id)}
                  onAdd={() => handleAddToCart(item)}
                  onUpdate={(newQty) => handleUpdateQuantity(item._id, newQty)}
                  onUnavailable={() => setUnavailablePopup(item)}
                  buttonColor={buttonColor}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load more indicator */}
        {hasMore && (
          <div className="text-center py-4">
            <div className="loader mx-auto"></div>
          </div>
        )}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <img
              src="/assets/icons/no-results.png"
              alt="No results"
              className="w-32 h-32 mx-auto mb-4 object-contain"
            />
            <p className="text-[--text-muted] text-sm mb-2">No items found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[--primary] text-sm font-medium hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cart Bar - Redesigned with gradient and better styling */}
      {cartCount > 0 && !hideCartBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up">
          <div className="px-4 py-3 text-white" style={{ backgroundColor: cartBarColor }}>
            <button
              onClick={() => router.push(`/r/${params.restaurantId}/m/${tableId}/c/${tableId}`)}
              className="flex items-center justify-between w-full active:scale-[0.98] transition-transform"
            >
              {/* Left */}
              <div className="relative flex items-center gap-3">
                {/* Video overlay that appears when item is added */}
                {showAddedGif && (
                  <div className="absolute left-0 z-10 animate-scale-bounce">
                    <img
                     src="/assets/gifs/added.gif"
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  </div>
                )}

                <div  style={{ Color: buttonColor }} className={`leading-none transition-transform duration-400 ${showAddedGif ? 'translate-x-14' : 'translate-x-0'}`}>
                  <div className="flex items-baseline gap-1">
                    <OdometerNumber value={cartCount} className=" text-base font-bold" />
                    <span className="text- text-base font-bold ml-1">
                      {cartCount === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>
                  <p className=" text-xs">
                    View Cart
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-0.5">
                  <span className=" text-lg font-bold font-['Montserrat']">₹</span>
                  <OdometerNumber value={cartTotal.toFixed(0)} className=" text-lg font-bold font-['Montserrat']" />/-
                </div>
                <ChevronRight size={20} className="text-" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Unavailable Item Popup */}
      <AnimatedPopup
        show={!!unavailablePopup}
        onClose={() => setUnavailablePopup(null)}
        className="absolute inset-0 flex items-center justify-center p-4"
      >
        <div className="card rounded-2xl p-6 max-w-[300px] w-full text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

          {/* Location GIF */}


          {/* Content */}
          <div className="relative">
            <h3 className="text-[--text-primary] font-luxury text-lg mb-1">
              Oops! Zone Restricted
            </h3>
            <p className="text-[--primary] font-semibold text-base mb-4">{unavailablePopup?.name}</p>

            {/* Current zone badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-  border border-red-500/10 mb-3">
              <div className="w-1.5 h-1.5 -full bg-red-400 animate-pulse" />
              <span className="text-red-100 text-[11px] font-medium">
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
                      className="px-2.5 py-1 rounded- border border-emerald-500/10 text-emerald-300 text-[11px] font-medium"
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
              className="w-full py-3 rounded-xl text-sm font-semibold bg-[--card] border border-[--border] text-[--text-primary] hover:bg-[--bg-elevated] active:scale-[0.98] transition-all"
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
          <p className="text-[--text-muted] text-sm">Enjoy your time at OrderZap</p>
        </div>
      </AnimatedOverlay>

      {/* Water Popup - slides up from bottom */}
      <AnimatedBottomSheet show={showWaterPopup} onClose={() => setShowWaterPopup(false)}>
        <div className="text-center">
          <img src="/assets/gifs/water-loading.gif" alt="Loading" className="w-[70]  flex justify-center mx-auto rounded-lg" />
          <h3 className="text-[--text-primary] font-luxury text-lg mb-2">Want some water?</h3>
          <p className="text-[--text-muted] text-sm mb-5">We'll bring it right over</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowWaterPopup(false)}
              className="flex-1 btn-secondary py-3 rounded-xl text-sm font-medium"
            >
              No thanks
            </button>
            <button
              onClick={async () => {
                if (restaurantDbId) {
                  await createStaffCall({
                    restaurantId: restaurantDbId,
                    tableId: String(tableId),
                    tableNumber: parseInt(tableId),
                    zoneName: table?.zone?.name,
                    reason: 'Asking for water',
                  });
                }
                setShowWaterPopup(false);
              }}
              className="flex-1 btn-primary py-3 rounded-xl text-sm font-medium"
            >
              Yes please
            </button>
          </div>
        </div>
      </AnimatedBottomSheet>
    </div>
  );
}

// Odometer Number Component
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

// Menu Item Component - Memoized to prevent unnecessary re-renders
const MenuItem = memo(function MenuItem({ item, qty, onAdd, onUpdate, onUnavailable, buttonColor }) {
  const isRestricted = !item.isAvailableInZone;
  const imageRef = useRef(null);
  const buttonRef = useRef(null);
  const [parallaxY, setParallaxY] = useState(0);
  const [buttonParallaxY, setButtonParallaxY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const parallax = scrollProgress * 20 - 10; // Range from -10 to 10
        setParallaxY(parallax);
      }

      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const parallax = scrollProgress * 15 - 7.5; // Range from -7.5 to 7.5 (slightly less than image)
        setButtonParallaxY(parallax);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerRestrictedFeedback = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
    onUnavailable?.();
  }, [onUnavailable]);

  const handleAdd = useCallback(() => {
    if (isRestricted) {
      triggerRestrictedFeedback();
      return;
    }
    // Vibrate on successful add
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onAdd();
  }, [isRestricted, onAdd, triggerRestrictedFeedback]);

  const handleIncrement = useCallback(() => {
    onUpdate(qty + 1);
  }, [qty, onUpdate]);

  const handleDecrement = useCallback(() => {
    if (qty <= 1) {
      onUpdate(0); // explicit remove
    } else {
      onUpdate(qty - 1);
    }
  }, [qty, onUpdate]);

  return (
    <div
      onClick={handleAdd}
      className={`menu-card-item overflow-hidden flex h-36 shadow-md hover:shadow-xl transition-all duration-300 ${isRestricted ? "opacity-70" : ""
        }`}
    >
      {/* IMAGE - Left side, fixed width */}
      <div
        ref={imageRef}
        onClick={handleAdd}
        className="relative w-24 h-24 flex-shrink-0 cursor-pointer overflow-hidden group"
        role="button"
        aria-disabled={isRestricted}
      >
        <div
          style={{
            transform: `translateY(${parallaxY}px)`,
            transition: 'transform 0.1s ease-out',
            width: '100%',
            height: '100%'
          }}
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform group-active:scale-95"
          />
        </div>

        {/* Restricted Overlay */}
        {isRestricted && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-[10px] text-white font-medium gap-1">
            <Lock size={16} />
            <span>Unavailable</span>
          </div>
        )}

        {/* Quantity Badge */}

      </div>

      {/* INFO - Right side, takes remaining space */}
      <div className="flex-1 p-2 flex flex-col justify-between min-w-0 g-gradient-to-br ">
        <div className="flex-1 min-h-0">
          <h3 className="text-xs font-bold text-gray-900 line-clamp-2 mb-0.5 leading-tight">
            {item.name}
          </h3>

          <p className="text-[9px] text-gray-600 line-clamp-1 leading-snug">
            {item.description}
          </p>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-bold text-gray-900 font-['Montserrat']">₹{item.price.toFixed(0)}/-</span>

          {/* ACTIONS */}
          {isRestricted ? (
            <span className="text-[8px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded-full">Unavailable</span>
          ) : qty > 0 ? (
            <div
              className="flex items-center  shadow-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDecrement}
                className="w-6 h-6 flex items-center justify-center active:scale-90 text-white transition-all"
                style={{ backgroundColor: buttonColor }}
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>

              <div
                style={{ backgroundColor: buttonColor }}
                className="min-w-[28px] h-6 flex items-center justify-center"
              >
                <OdometerNumber
                  value={qty}
                  className="text-sm font-bold text-gray-200"
                />
              </div>

              <button
                onClick={handleIncrement}
                className="w-6 h-6 flex items-center justify-center active:scale-90 text-white transition-all"
                style={{ backgroundColor: buttonColor }}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

          ) : (
            <button
              ref={buttonRef}
              onClick={handleAdd}
              className="w-[74px] py-1  text-white text-[10px] font-bold active:scale-95 transition-all shadow-sm"
              style={{
                backgroundColor: buttonColor,
                transform: `translateY(${buttonParallaxY}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              Add +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.item._id === nextProps.item._id &&
    prevProps.qty === nextProps.qty &&
    prevProps.item.isAvailableInZone === nextProps.item.isAvailableInZone
  );
});