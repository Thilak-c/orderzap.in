"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/session";
import { useCart } from "@/lib/cart";
import { useTable } from "@/lib/table";
import { useBranding } from "@/lib/useBranding";
import { checkLocationPermission, RESTAURANT_LOCATION } from "@/lib/location";
import { isQRSessionValid } from "@/lib/qrAuth";
import { 
  Trash2, Plus, Minus, CreditCard, Banknote, 
  UserRound, ArrowLeft, 
  ChevronRight, Ticket, MessageSquare, X, Check, MapPin, Navigation,
  Bookmark, Clock, Heart, Edit3
} from "lucide-react";
import MenuItemImage from "@/components/MenuItemImage";

// Tip options
const tipOptions = [
  { id: 'none', label: 'Not This Time', amount: 0 },
  { id: '20', label: '₹20', amount: 20 },
  { id: '40', label: '₹40', amount: 40 },
  { id: '50', label: '₹50', amount: 50 },
  { id: 'custom', label: '+ Custom', amount: 0 },
];

// Customization options (can be expanded per item type)
const customizationOptions = [
  { id: 'spice-mild', label: 'Mild Spice', category: 'spice' },
  { id: 'spice-medium', label: 'Medium Spice', category: 'spice' },
  { id: 'spice-hot', label: 'Extra Spicy', category: 'spice' },
  { id: 'no-onion', label: 'No Onion', category: 'preference' },
  { id: 'no-garlic', label: 'No Garlic', category: 'preference' },
  { id: 'extra-cheese', label: 'Extra Cheese (+₹30)', category: 'addon', price: 30 },
];

// Confetti function
const createConfetti = () => {
  const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
  const confettiCount = 70;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = window.innerWidth / 2 + 'px';
    confetti.style.top = window.innerHeight / 2 + 'px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(confetti);
    
    const angle = (Math.PI * 2 * i) / confettiCount;
    const velocity = 5 + Math.random() * 5;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let velX = Math.cos(angle) * velocity;
    let velY = Math.sin(angle) * velocity - 3;
    
    const animate = () => {
      x += velX;
      y += velY;
      velY += 0.1;
      confetti.style.left = x + 'px';
      confetti.style.top = y + 'px';
      confetti.style.opacity = Math.max(0, 1 - (y - window.innerHeight / 2) / 300);
      
      if (y < window.innerHeight + 100) {
        requestAnimationFrame(animate);
      } else {
        confetti.remove();
      }
    };
    animate();
  }
};

const paymentOptions = [
  { id: "pay-now", label: "Pay Now", icon: CreditCard, desc: "Online payment" },
  { id: "pay-counter", label: "At Counter", icon: Banknote, desc: "Pay when ready" },
  { id: "pay-table", label: "At Table", icon: UserRound, desc: "Staff comes to you" },
];

export default function CartPage() {
  const { tableId } = useParams();
  const router = useRouter();
  const { sessionId } = useSession();
  const { setTable } = useTable();
  const { brandName, brandLogo, isLoading: brandingLoading } = useBranding();
  const { 
    cart, updateQuantity, removeFromCart, cartTotal, clearCart, cartCount,
    updateItemNote, updateCustomizations, saveForLater, savedItems, moveToCart, removeFromSaved
  } = useCart();
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);
  
  // Location verification states
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, checking, verified, denied, too_far
  const [locationError, setLocationError] = useState('');
  const [userDistance, setUserDistance] = useState(null);
  
  // Phone number for order
  const [orderPhone, setOrderPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  
  // Coupon code (phone number) state
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponPhone, setCouponPhone] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Tip state
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [tipError, setTipError] = useState(false); // For tip validation
  const tipSectionRef = useRef(null); // For scrolling to tip section
  
  // Item editing state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemNote, setEditingItemNote] = useState('');
  const [editingCustomizations, setEditingCustomizations] = useState([]);
  
  // Toast notification for save for later
  const [savedToast, setSavedToast] = useState(null); // { name: 'Item Name' }
  const [removingItemId, setRemovingItemId] = useState(null); // For exit animation
  const [isTransitioning, setIsTransitioning] = useState(false); // For smooth layout transition
  const [addingToCartId, setAddingToCartId] = useState(null); // For move to cart animation
  const [isAddingToCart, setIsAddingToCart] = useState(false); // For cart appearing animation
  
  // Order animation states
  const [orderAnimationStage, setOrderAnimationStage] = useState('idle'); // idle, loading, paper, flying, success
  const [paperPosition, setPaperPosition] = useState({ bottom: 100, opacity: 1 });

  const activeOrder = useQuery(api.orders.getActiveBySession, sessionId ? { sessionId } : "skip");
  const createOrder = useMutation(api.orders.create);

  // Get customer deposit balance - from localStorage, coupon input, or order phone
  const storedPhone = typeof window !== 'undefined' ? localStorage.getItem('customerPhone') : null;
  const phoneToCheck = couponApplied ? `+91${couponPhone}` : (orderPhone.length === 10 ? `+91${orderPhone}` : storedPhone);
  const customer = useQuery(api.customers.getByPhone, phoneToCheck ? { phone: phoneToCheck } : "skip");
  const depositBalance = customer?.depositBalance || 0;
  
  // Calculate tip amount
  const tipAmount = selectedTip === 'custom' 
    ? (parseInt(customTipAmount) || 0) 
    : (tipOptions.find(t => t.id === selectedTip)?.amount || 0);
  
  // Calculate customization extras
  const customizationTotal = cart.reduce((sum, item) => {
    const itemCustomizations = item.customizations || [];
    const addonTotal = itemCustomizations.reduce((acc, custId) => {
      const cust = customizationOptions.find(c => c.id === custId);
      return acc + (cust?.price || 0);
    }, 0);
    return sum + (addonTotal * item.quantity);
  }, 0);

  // Estimated time based on cart items
  const estimatedTime = Math.max(15, Math.min(45, 10 + (cartCount * 3)));

  // Load stored phone on mount
  useEffect(() => {
    if (storedPhone) {
      setOrderPhone(storedPhone.replace('+91', ''));
    }
  }, [storedPhone]);

  // Check QR session validity
  useEffect(() => {
    const session = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('qr_scan_session') || 'null') : null;
    
    if (!session || session.tableId !== String(tableId)) {
      // No valid session - redirect to home
      router.replace('/');
    }
  }, [tableId, router]);
  
  // Calculate totals including tip and customizations
  const subtotal = cartTotal + customizationTotal;
  const depositToUse = depositBalance > 0 ? Math.min(depositBalance, subtotal) : 0;
  const finalTotal = subtotal - depositToUse + tipAmount;

  // Check if user already has credit from localStorage
  const hasStoredCredit = storedPhone && depositBalance > 0;

  // Open item edit modal
  const openItemEdit = (item) => {
    setEditingItemId(item.menuItemId);
    setEditingItemNote(item.itemNote || '');
    setEditingCustomizations(item.customizations || []);
  };

  // Save item edits
  const saveItemEdit = () => {
    if (editingItemId) {
      updateItemNote(editingItemId, editingItemNote);
      updateCustomizations(editingItemId, editingCustomizations);
      setEditingItemId(null);
    }
  };

  // Toggle customization
  const toggleCustomization = (custId) => {
    setEditingCustomizations(prev => 
      prev.includes(custId) 
        ? prev.filter(c => c !== custId)
        : [...prev, custId]
    );
  };

  // Handle save for later with animation
  const handleSaveForLater = (item) => {
    const isLastItem = cart.length === 1;
    
    // Start exit animation
    setRemovingItemId(item.menuItemId);
    
    // If last item, start transition state for smooth layout
    if (isLastItem) {
      setIsTransitioning(true);
    }
    
    // After slide-out animation completes, actually save
    setTimeout(() => {
      saveForLater(item.menuItemId);
      setRemovingItemId(null);
      
      // Show toast
      // setSavedToast({ name: item.name });
      
      // Vibrate
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Hide toast after 2.5 seconds
      setTimeout(() => setSavedToast(null), 2500);
      
      // End transition after empty state fully animates in
      if (isLastItem) {
        setTimeout(() => setIsTransitioning(false), 500);
      }
    }, 350);
  };

  // Handle move to cart with animation
  const handleMoveToCart = (item) => {
    const isCartEmpty = cart.length === 0;
    
    // Start exit animation on saved item
    setAddingToCartId(item.menuItemId);
    
    // If cart is empty, trigger the adding animation
    if (isCartEmpty) {
      setIsAddingToCart(true);
    }
    
    // After animation, actually move
    setTimeout(() => {
      moveToCart(item.menuItemId);
      setAddingToCartId(null);
      
      // Vibrate
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // End adding animation
      if (isCartEmpty) {
        setTimeout(() => setIsAddingToCart(false), 500);
      }
    }, 300);
  };

  // Order animation - paper flying to clouds
  const vibrateStage = (stage) => {
    if (!navigator.vibrate) return;
    if (stage === "loading") navigator.vibrate([20, 60, 20]);
    if (stage === "flying") navigator.vibrate([20, 150, 20, 100, 20, 70, 20, 50, 20, 30, 20, 20, 20, 15, 20, 10, 20, 10, 20]);
    if (stage === "success") navigator.vibrate([40, 80, 40, 80, 60]);
  };

  const startOrderAnimation = async () => {
    // Validate phone number
    if (orderPhone.length !== 10) {
      setPhoneError("Enter 10 digit phone number");
      return;
    }
    
    // Validate tip selection
    if (selectedTip === null) {
      setTipError(true);
      tipSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (cart.length === 0 || !paymentMethod || !sessionId) {
      return;
    }
    
    // Verify location first (if not already verified)
    if (locationStatus !== 'verified') {
      const isAtRestaurant = await verifyLocation();
      if (!isAtRestaurant) {
        return;
      }
    }

    const customerPhone = `+91${orderPhone}`;
    localStorage.setItem('customerPhone', customerPhone);
    const phoneForDeposit = depositToUse > 0 ? phoneToCheck : customerPhone;

    // For pay-now, open Razorpay first
    if (paymentMethod === 'pay-now') {
      setIsOrdering(true);
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_yourkeyhere",
        amount: Math.round(finalTotal * 100),
        currency: "INR",
        name: "BTS DISC",
        description: `Order - Table ${tableId}`,
        image: "https://bts-club-one.vercel.app/logo.png",
        handler: async function (response) {
          // Payment successful - now run animation and create order
          runOrderAnimation(phoneForDeposit, `Payment: ${response.razorpay_payment_id}`);
        },
        prefill: {
          contact: phoneToCheck?.replace('+', '') || '',
        },
        theme: {
          color: "#d4af7d",
        },
        modal: {
          ondismiss: function () {
            setIsOrdering(false);
          },
        },
      };
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        alert("Payment failed: " + response.error.description);
        setIsOrdering(false);
      });
      razorpay.open();
      return;
    }

    // For other payment methods, run animation directly
    runOrderAnimation(phoneForDeposit, notes || "");
  };

  // Actual animation + order creation
  const runOrderAnimation = async (phoneForDeposit, orderNotes) => {
    // Stage 1: Loading
    setOrderAnimationStage('loading');
    vibrateStage('loading');
    
    // Create order in background during animation
    let orderCreated = false;
    let orderError = null;
    let orderId = null;
    
    const orderPromise = createOrder({ 
      tableId: tableId.toString(), 
      items: cart.map((item) => ({ 
        menuItemId: item.menuItemId, 
        name: item.name, 
        price: item.price, 
        quantity: item.quantity, 
        image: item.image 
      })), 
      total: finalTotal, 
      paymentMethod, 
      notes: orderNotes, 
      customerSessionId: sessionId,
      customerPhone: phoneForDeposit,
      depositUsed: depositToUse || 0
    }).then((result) => {
      orderCreated = true;
      orderId = result;
      clearCart();
    }).catch((err) => {
      orderError = err;
    });
    
    setTimeout(() => {
      // Stage 2: Transform to paper
      setOrderAnimationStage('paper');
      
      setTimeout(() => {
        // Stage 3: Paper flies up with acceleration
        setOrderAnimationStage('flying');
        vibrateStage('flying');
        
        let currentBottom = 100;
        let velocity = 5; // Start slow
        const acceleration = 0.8; // Speed up over time
        
        const flyInterval = setInterval(() => {
          velocity += acceleration; // Increase speed
          currentBottom += velocity;
          setPaperPosition({ 
            bottom: currentBottom, 
            opacity: currentBottom > 500 ? Math.max(0, 1 - (currentBottom - 500) / 200) : 1 
          });
          
          if (currentBottom > 700) {
            clearInterval(flyInterval);
            
            // Wait for order to complete
            orderPromise.finally(() => {
              if (orderError) {
                alert("Order failed: " + orderError.message);
                setOrderAnimationStage('idle');
                setPaperPosition({ bottom: 100, opacity: 1 });
                setIsOrdering(false);
                return;
              }
              
              // Stage 4: Success - redirect to order status
              vibrateStage('success');
              setTimeout(() => {
                setOrderAnimationStage('success');
                setIsOrdering(false);
                // Redirect to order status page
                router.push(`/order-status/${orderId}`);
              }, 300);
            });
          }
        }, 20);
      }, 600);
    }, 800);
  };

  const handleApplyCoupon = () => {
    if (couponPhone.length !== 10) {
      setCouponError("Enter 10 digit number");
      return;
    }
    setCouponApplied(true);
    setCouponError("");
    setShowCouponInput(false);
  };

  // Trigger confetti when credit is found
  const hasTriggeredConfetti = useRef(false);
  useEffect(() => {
    if (couponApplied && depositBalance > 0 && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      createConfetti();
      // Happy vibration pattern - like a celebration!
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 100, 50, 150]);
      }
    }
  }, [couponApplied, depositBalance]);

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponPhone("");
  };

  // Location verification function
  const verifyLocation = async () => {
    setLocationStatus('checking');
    setLocationError('');
    
    try {
      const result = await checkLocationPermission();
      setUserDistance(result.distance);
      
      if (result.allowed) {
        setLocationStatus('verified');
        return true;
      } else {
        setLocationStatus('too_far');
        setLocationError(`You're ${result.distance}m away. Please be within ${RESTAURANT_LOCATION.radius}m of the restaurant to order.`);
        return false;
      }
    } catch (error) {
      setLocationStatus('denied');
      if (error.code === 1) { // PERMISSION_DENIED
        setLocationError('Please allow location access to place your order. This ensures you are at the restaurant.');
      } else {
        setLocationError(error.message || 'Could not verify your location. Please try again.');
      }
      return false;
    }
  };

  useEffect(() => {
    if (tableId) {
      setTable({ tableId: String(tableId), tableNumber: parseInt(tableId), zoneName: null });
    }
  }, [tableId]);

  // Removed auto-redirect to /my-orders when activeOrder exists

  const handleOrder = async () => {
    console.log("handleOrder called", { cartLength: cart.length, paymentMethod, sessionId });
    
    // Validate phone number
    if (orderPhone.length !== 10) {
      setPhoneError("Enter 10 digit phone number");
      return;
    }
    
    // Validate tip selection
    if (selectedTip === null) {
      setTipError(true);
      // Scroll to tip section
      tipSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (cart.length === 0 || !paymentMethod || !sessionId) {
      console.log("Early return - missing data");
      return;
    }
    
    // Verify location first (if not already verified)
    if (locationStatus !== 'verified') {
      const isAtRestaurant = await verifyLocation();
      if (!isAtRestaurant) {
        return; // Stop if location verification failed
      }
    }
    
    const customerPhone = `+91${orderPhone}`;
    // Store phone in localStorage
    localStorage.setItem('customerPhone', customerPhone);
    
    // Use the phone that has the deposit (could be from coupon or order phone)
    const phoneForDeposit = depositToUse > 0 ? phoneToCheck : customerPhone;
    
    console.log("Order details - depositToUse:", depositToUse, "phoneForDeposit:", phoneForDeposit, "phoneToCheck:", phoneToCheck);
    
    // If pay now, open Razorpay
    if (paymentMethod === 'pay-now') {
      console.log("Payment method is pay-now, opening Razorpay");
      setIsOrdering(true);
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_yourkeyhere",
        amount: Math.round(finalTotal * 100), // Amount in paise
        currency: "INR",
        name: "BTS DISC",
        description: `Order - Table ${tableId}`,
        image: "https://bts-club-one.vercel.app/logo.png",
        handler: async function (response) {
          // Payment successful - create order
          console.log("Razorpay payment success, creating order...", response);
          try {
            const orderId = await createOrder({ 
              tableId: tableId.toString(), 
              items: cart.map((item) => ({ 
                menuItemId: item.menuItemId, 
                name: item.name, 
                price: item.price, 
                quantity: item.quantity, 
                image: item.image 
              })), 
              total: finalTotal, 
              paymentMethod: 'pay-now', 
              notes: notes || `Payment: ${response.razorpay_payment_id}`, 
              customerSessionId: sessionId,
              customerPhone: phoneForDeposit,
              depositUsed: depositToUse || 0
            });
            console.log("Order created:", orderId);
            clearCart();
            // Redirect to order status page
            router.push(`/order-status/${orderId}`);
          } catch (error) {
            console.error("Failed to place order:", error);
            alert("Order failed: " + error.message);
            setIsOrdering(false);
          }
        },
        prefill: {
          contact: phoneToCheck?.replace('+', '') || '',
        },
        theme: {
          color: "#d4af7d",
        },
        modal: {
          ondismiss: function () {
            setIsOrdering(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        alert("Payment failed: " + response.error.description);
        setIsOrdering(false);
      });
      console.log("Opening Razorpay...");
      razorpay.open();
      return;
    }
    
    // For other payment methods, create order directly
    setIsOrdering(true);
    try {
      console.log("Creating order for", paymentMethod);
      const orderId = await createOrder({ 
        tableId: tableId.toString(), 
        items: cart.map((item) => ({ 
          menuItemId: item.menuItemId, 
          name: item.name, 
          price: item.price, 
          quantity: item.quantity, 
          image: item.image 
        })), 
        total: finalTotal, 
        paymentMethod, 
        notes: notes || "", 
        customerSessionId: sessionId,
        customerPhone: phoneForDeposit,
        depositUsed: depositToUse || 0
      });
      console.log("Order created successfully:", orderId);
      clearCart();
      // Redirect to order status page
      router.push(`/order-status/${orderId}`);
    } catch (error) {
      console.error("Failed to place order:", error);
      setIsOrdering(false);
    }
  };

  // Order success overlay - check this FIRST before empty cart
  if (showOrderSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg] overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[--primary]/10 rounded-full blur-3xl animate-pulse-soft" />
        </div>

        {/* Main content */}
        <div className="text-center z-10 px-6">
          {/* Checkmark circle */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-scale-in">
            <Check size={40} className="text-emerald-400" />
          </div>
          
          <h1 className="font-luxury text-2xl font-semibold text-[--text-primary] mb-2 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards', opacity: 0 }}>
            Order Confirmed
          </h1>
          <p className="text-[--text-muted] text-sm mb-1 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards', opacity: 0 }}>
            Your order is being prepared
          </p>
          <p className="text-[--text-dim] text-xs mb-8 animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards', opacity: 0 }}>
            Table {tableId}
          </p>
          
          <Link 
            href="/my-orders" 
            className="btn-primary px-8 py-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 animate-slide-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'forwards', opacity: 0 }}
          >
            View Order Status
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  // Show loading while branding loads
  if (brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg]">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--bg] pb-36">
      {/* Razorpay Script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[--bg]/90 backdrop-blur-xl border-b border-[--border]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/m/${tableId}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[--card] border border-[--border]">
            <ArrowLeft size={18} className="text-[--text-muted]" />
          </Link>
          <div className="text-center">
            <h1 className="font-semibold text-[--text-primary]">Your Cart</h1>
            <p className="text-[10px] text-[--text-dim]">{cartCount} items • Table {tableId}</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Deposit Banner - show if has credit AND cart has items */}
        {cart.length > 0 && depositBalance > 0 && (
          <div className="rounded-2xl p-4 mb-4 animate-slide-down" style={{ animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Ticket size={20} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-emerald-400 font-semibold text-sm">₹{depositBalance} Credit Applied</p>
                <p className="text-emerald-400/60 text-xs">From reservation deposit</p>
              </div>
              {couponApplied && (
                <button onClick={handleRemoveCoupon} className="text-emerald-400/60 hover:text-emerald-400">
                  <X size={18} />
                </button>
              )}
              <Check size={18} className="text-emerald-400" />
            </div>
          </div>
        )}

        {/* Coupon Input - show if no stored credit and no coupon applied with credit AND cart has items */}
        {cart.length > 0 && !hasStoredCredit && !(couponApplied && depositBalance > 0) && (
          <div className="mb-4 animate-slide-down" style={{ animationFillMode: 'forwards' }}>
            {!showCouponInput ? (
              <button 
                onClick={() => setShowCouponInput(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[--border] rounded-xl text-[--text-muted] text-sm hover:border-[--primary] hover:text-[--primary] transition-colors"
              >
                <Ticket size={16} />
                Have a reservation? Enter phone for credit
              </button>
            ) : (
              <div className="bg-[--card] border border-[--border] rounded-xl p-4 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
                <p className="text-xs text-[--text-dim] mb-3">Enter reservation phone number</p>
                <div className="flex gap-2">
                  <div className="flex items-center bg-[--bg-elevated] border border-[--border] rounded-lg overflow-hidden flex-1">
                    <span className="px-3 py-2.5 text-[--text-muted] text-sm border-r border-[--border]">+91</span>
                    <input
                      type="tel"
                      value={couponPhone}
                      onChange={(e) => { setCouponPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setCouponError(''); }}
                      placeholder="10 digit number"
                      maxLength={10}
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                      autoFocus
                    />
                  </div>
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={couponPhone.length !== 10}
                    className="px-4 py-2.5 bg-[--primary] text-[--bg] rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    Apply
                  </button>
                  <button 
                    onClick={() => { setShowCouponInput(false); setCouponPhone(''); setCouponError(''); }}
                    className="px-3 py-2.5 text-[--text-muted]"
                  >
                    <X size={18} />
                  </button>
                </div>
                {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
                {couponApplied && depositBalance === 0 && (
                  <p className="text-amber-400 text-xs mt-2">No credit found for this number</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cart Items or Empty State */}
        <div>
          {cart.length === 0 && !isAddingToCart ? (
            <div 
              className={`bg-[--card] border border-[--border] rounded-2xl text-center mb-4 overflow-hidden ${isTransitioning ? 'animate-expand-height p-0' : 'animate-scale-in p-8'}`} 
              style={{ animationFillMode: 'forwards' }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[--bg-elevated] flex items-center justify-center animate-bounce-in" style={{ animationDelay: isTransitioning ? '0.25s' : '0.1s', animationFillMode: 'forwards', opacity: 0 }}>
                <Plus size={24} className="text-[--text-dim]" />
              </div>
              <p className="text-[--text-muted] text-sm mb-4">Your cart is empty</p>
              <Link 
                href={`/m/${tableId}`} 
                className="inline-flex items-center gap-2 text-[--primary] text-sm font-medium hover:underline"
              >
                Add items from menu
              </Link>
            </div>
          ) : cart.length > 0 ? (
          <div className={`space-y-3 mb-4 ${isAddingToCart ? 'animate-slide-up' : ''}`} style={{ animationFillMode: 'forwards' }}>
            {/* Estimated Time */}
            <div className={`flex items-center gap-2 px-1 mb-2 ${isAddingToCart ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
              <Clock size={14} className="text-[--primary]" />
              <span className="text-xs text-[--text-muted]">Estimated time: <span className="text-[--text-primary] font-medium">{estimatedTime}-{estimatedTime + 10} mins</span></span>
            </div>

            {cart.map((item, index) => (
              <div 
                key={item.menuItemId} 
                className={`bg-[--card] border border-[--border] rounded-2xl p-3 ${
                  removingItemId === item.menuItemId 
                    ? 'animate-slide-out-left' 
                    : 'animate-slide-up'
                }`}
                style={{ animationDelay: removingItemId === item.menuItemId ? '0s' : `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[--bg-elevated]">
                    <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-medium text-[--text-primary] text-sm line-clamp-1">{item.name}</h3>
                      <p className="text-[--primary] font-semibold text-sm mt-0.5">₹{item.price}</p>
                      {/* Show item note if exists */}
                      {item.itemNote && (
                        <p className="text-[--text-dim] text-[10px] mt-1 line-clamp-1">📝 {item.itemNote}</p>
                      )}
                      {/* Show customizations if exists */}
                      {item.customizations?.length > 0 && (
                        <p className="text-[--text-dim] text-[10px] mt-0.5">
                          {item.customizations.map(c => customizationOptions.find(o => o.id === c)?.label).filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    
                    {/* Quantity & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-[--bg-elevated] rounded-lg p-0.5">
                        <button 
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} 
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[--card] active:scale-95 transition-all"
                        >
                          <Minus size={14} className="text-[--text-muted]" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-[--text-primary]">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} 
                          className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[--card] active:scale-95 transition-all"
                        >
                          <Plus size={14} className="text-[--primary]" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Edit/Customize button */}
                        <button 
                          onClick={() => openItemEdit(item)} 
                          className="w-8 h-8 rounded-lg bg-[--bg-elevated] text-[--text-muted] flex items-center justify-center hover:bg-[--primary]/10 hover:text-[--primary] active:scale-95 transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        {/* Save for later */}
                        <button 
                          onClick={() => handleSaveForLater(item)} 
                          className="w-8 h-8 rounded-lg bg-[--bg-elevated] text-[--text-muted] flex items-center justify-center hover:bg-amber-500/10 hover:text-amber-400 active:scale-95 transition-all"
                        >
                          <Bookmark size={14} />
                        </button>
                        {/* Delete */}
                        <button 
                          onClick={() => removeFromCart(item.menuItemId)} 
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right py-0.5">
                    <p className="text-[--text-primary] font-bold text-sm">₹{(item.price * item.quantity).toFixed(0)}</p>
                  </div>
                </div>
              </div>
            ))}
          
            {/* Add More */}
            <Link 
              href={`/m/${tableId}`}
              className="flex items-center justify-center gap-2 py-3 text-[--primary] text-sm font-medium hover:underline"
            >
              <Plus size={16} />
              Add more items
            </Link>
          </div>
        ) : null}
        </div>

        {/* Saved for Later */}
        {savedItems.length > 0 && (
          <div className="mt-4 mb-4">
            <p className="text-[10px] tracking-[0.2em] text-[--text-dim] mb-3 uppercase font-medium flex items-center gap-2">
              <Bookmark size={12} />
              Saved for Later ({savedItems.length})
            </p>
            <div className="space-y-2">
              {savedItems.map((item, index) => (
                <div 
                  key={item.menuItemId} 
                  className={`bg-[--card] border border-[--border] rounded-xl p-3 flex items-center gap-3 ${
                    addingToCartId === item.menuItemId 
                      ? 'animate-slide-out-left' 
                      : 'animate-scale-in'
                  }`}
                  style={{ animationDelay: addingToCartId === item.menuItemId ? '0s' : `${index * 0.05}s`, animationFillMode: 'forwards' }}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[--bg-elevated]">
                    <MenuItemImage storageId={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm text-[--text-primary] line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-[--primary]">₹{item.price}</p>
                  </div>
                  <button 
                    onClick={() => handleMoveToCart(item)}
                    className="px-3 py-1.5 bg-[--primary]/10 text-[--primary] rounded-lg text-xs font-medium hover:bg-[--primary]/20 active:scale-95 transition-all"
                  >
                    Add to Cart
                  </button>
                  <button 
                    onClick={() => removeFromSaved(item.menuItemId)}
                    className="text-[--text-dim] hover:text-red-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div className="mt-4">
          <button 
            onClick={() => setShowNotes(!showNotes)}
            className="w-full flex items-center justify-between p-4 bg-[--card] border border-[--border] rounded-xl transition-all duration-300 hover:border-[--primary]/30"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className={`transition-colors duration-300 ${showNotes ? 'text-[--primary]' : 'text-[--text-muted]'}`} />
              <span className="text-sm text-[--text-muted]">
                {notes ? notes.slice(0, 30) + (notes.length > 30 ? '...' : '') : 'Add special instructions'}
              </span>
            </div>
            <ChevronRight size={18} className={`text-[--text-dim] transition-transform duration-300 ease-out ${showNotes ? 'rotate-90' : ''}`} />
          </button>
          <div className={`grid transition-all duration-300 ease-out ${showNotes ? 'grid-rows-[1fr] mt-2 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Allergies, spice level, special requests..." 
                className="w-full rounded-xl p-4 text-sm resize-none bg-[--card] border border-[--border] focus:border-[--primary] outline-none transition-all duration-300" 
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Phone Number */}
        <div className="mt-6">
          <p className="text-[10px] tracking-[0.2em] text-[--text-dim] mb-3 uppercase font-medium">Your Phone Number</p>
              <div className="flex items-center bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                <span className="px-4 py-3 text-[--text-muted] text-sm border-r border-[--border]">+91</span>
                <input
                  type="tel"
                  value={orderPhone}
                  onChange={(e) => { setOrderPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError(''); }}
                  placeholder="10 digit number"
                  maxLength={10}
                  className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                />
              </div>
              {phoneError && <p className="text-red-400 text-xs mt-2">{phoneError}</p>}
            </div>

        {/* Payment Method */}
        <div className="mt-6">
          <p className="text-[10px] tracking-[0.2em] text-[--text-dim] mb-3 uppercase font-medium">How would you like to pay?</p>
          <div className="grid grid-cols-3 gap-2">
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = paymentMethod === option.id;
              return (
                <button 
                  key={option.id} 
                  onClick={() => setPaymentMethod(option.id)} 
                  className={`flex flex-col items-center p-4 rounded-xl border transition-all active:scale-95 ${
                    isSelected 
                      ? "border-[--primary] bg-[--primary]/10" 
                      : "border-[--border] bg-[--card]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                    isSelected ? "bg-[--primary] text-[--bg]" : "bg-[--bg-elevated] text-[--text-muted]"
                  }`}>
                    <Icon size={18} />
                  </div>
                  <p className={`text-xs font-medium text-center ${isSelected ? "text-[--primary]" : "text-[--text-muted]"}`}>
                    {option.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tip Option */}
        {cart.length > 0 && (
          <div className="mt-6" ref={tipSectionRef}>
            <p className="text-[10px] tracking-[0.2em] text-[--text-dim] mb-3 uppercase font-medium flex items-center gap-2">
              <Heart size={12} />
              Add a tip for the staff
            </p>
            <div className="flex gap-2 justify-center flex-wrap items-center">
              {tipOptions.map((tip, index) => (
                <button
                  key={tip.id}
                  onClick={() => {
                    setSelectedTip(tip.id);
                    setTipError(false);
                    if (tip.id !== 'custom') setCustomTipAmount('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 active:scale-95 ${
                    tip.id === 'custom'
                      ? selectedTip === 'custom'
                        ? 'text-[--primary]'
                        : 'text-[--text-muted] hover:text-[--primary]'
                      : selectedTip === tip.id
                        ? 'bg-[--primary] text-[--bg] scale-105 shadow-lg shadow-[--primary]/25'
                        : 'bg-[--card] border border-[--border] text-[--text-muted] hover:border-[--primary]/50'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {tip.label}
                </button>
              ))}
            </div>
            {tipError && (
              <p className="text-red-400 text-xs mt-2 text-center animate-scale-in">Please select a tip option or choose "+ Custom" with ₹0</p>
            )}
            <div className={`grid transition-all duration-300 ease-out ${selectedTip === 'custom' ? 'grid-rows-[1fr] mt-3 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="flex items-center bg-[--card] border border-[--border] rounded-xl overflow-hidden">
                  <span className="px-4 py-3 text-[--text-muted] text-sm border-r border-[--border]">₹</span>
                  <input
                    type="number"
                    value={customTipAmount}
                    onChange={(e) => setCustomTipAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter amount"
                    className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Edit Modal */}
      {editingItemId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={() => setEditingItemId(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-lg bg-[--card] rounded-t-3xl p-6 border-t border-[--border] animate-slide-up"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[--border] rounded-full mx-auto mb-5" />
            
            <h3 className="text-[--text-primary] font-semibold text-lg mb-4">Customize Item</h3>
            
            {/* Item Note */}
            <div className="mb-4">
              <p className="text-xs text-[--text-dim] mb-2">Special instructions for this item</p>
              <textarea
                value={editingItemNote}
                onChange={(e) => setEditingItemNote(e.target.value)}
                placeholder="No onions, extra spicy, etc..."
                className="w-full rounded-xl p-3 text-sm resize-none bg-[--bg] border border-[--border] focus:border-[--primary] outline-none transition-all duration-300"
                rows={2}
              />
            </div>

            {/* Customizations */}
            <div className="mb-6">
              <p className="text-xs text-[--text-dim] mb-2">Customizations</p>
              <div className="flex flex-wrap gap-2">
                {customizationOptions.map((cust, index) => (
                  <button
                    key={cust.id}
                    onClick={() => toggleCustomization(cust.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 active:scale-95 ${
                      editingCustomizations.includes(cust.id)
                        ? 'bg-[--primary] text-[--bg] scale-105'
                        : 'bg-[--bg] border border-[--border] text-[--text-muted] hover:border-[--primary]/50'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    {cust.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveItemEdit}
              className="w-full btn-primary py-3 rounded-xl text-sm font-semibold"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Bottom Summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-[--bg] border-t border-[--border]">
        <div className="max-w-lg mx-auto px-4 py-3">
          {/* Compact Bill Summary - Clickable */}
          <button 
            onClick={() => setShowBillDetails(!showBillDetails)}
            className="w-full flex items-center justify-between mb-3 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="text-[--text-muted]">{cartCount} items</span>
              {tipAmount > 0 && (
                <span className="text-pink-400 text-xs bg-pink-500/10 px-2 py-0.5 rounded">+₹{tipAmount} tip</span>
              )}
              {depositToUse > 0 && (
                <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded">-₹{depositToUse}</span>
              )}
              <ChevronRight size={14} className={`text-[--text-dim] transition-transform ${showBillDetails ? 'rotate-90' : ''}`} />
            </div>
            <span className="font-bold text-lg text-[--primary]">₹{finalTotal.toFixed(0)}</span>
            </button>

          {/* Expanded Bill Details */}
          <div 
            className={`grid transition-all duration-300 ease-out ${showBillDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <div className="bg-[--card] border border-[--border] rounded-xl p-3 mb-3 text-sm animate-fade-in">
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.menuItemId} className="flex justify-between text-[--text-muted]">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[--border] pt-2 flex justify-between">
                    <span className="text-[--text-muted]">Subtotal</span>
                    <span className="text-[--text-primary] font-medium">₹{cartTotal.toFixed(0)}</span>
                  </div>
                  {customizationTotal > 0 && (
                    <div className="flex justify-between text-[--text-muted]">
                      <span>Customizations</span>
                      <span>₹{customizationTotal.toFixed(0)}</span>
                    </div>
                  )}
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-pink-400">
                      <span>Tip</span>
                      <span>+₹{tipAmount.toFixed(0)}</span>
                    </div>
                  )}
                  {depositToUse > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Credit Applied</span>
                      <span>-₹{depositToUse.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="border-t border-[--border] pt-2 flex justify-between font-bold">
                    <span className="text-[--text-primary]">Total to Pay</span>
                    <span className="text-[--primary] text-base">₹{finalTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Place Order Button */}
          <button 
            onClick={startOrderAnimation} 
            disabled={orderAnimationStage !== 'idle' || !paymentMethod || locationStatus === 'checking' || cart.length === 0} 
            className={`w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              orderAnimationStage !== 'idle' || !paymentMethod || locationStatus === 'checking' || cart.length === 0
                ? "bg-[--border] text-[--text-dim] cursor-not-allowed" 
                : locationStatus === 'denied' || locationStatus === 'too_far'
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "btn-primary"
            }`}
          >
            {orderAnimationStage === 'loading' ? (
              <>
                <div className="w-5 h-5 spinner rounded-full" />
                Preparing...
              </>
            ) : orderAnimationStage === 'paper' ? (
              <>
                <div className="w-5 h-5 spinner rounded-full" />
                Processing...
              </>
            ) : locationStatus === 'checking' ? (
              <>
                <div className="w-5 h-5 spinner rounded-full" />
                Verifying Location...
              </>
            ) : locationStatus === 'denied' ? (
              <>
                <MapPin size={18} />
                Allow Location Access
              </>
            ) : locationStatus === 'too_far' ? (
              <>
                <Navigation size={18} />
                You're too far • {userDistance}m away
              </>
            ) : !paymentMethod ? (
              "Select Payment Method"
            ) : cart.length === 0 ? (
              "Add items to order"
            ) : (
              <>
                Place Order • ₹{finalTotal.toFixed(0)}
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Saved for Later Toast */}
      {savedToast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-[--card] border border-amber-500/30 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Bookmark size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-[--text-primary] font-medium">Saved for later</p>
              <p className="text-xs text-[--text-dim]">{savedToast.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clouds at top - show during flying animation */}
      {(orderAnimationStage === 'flying' || orderAnimationStage === 'success') && (
        <div className="fixed top-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ zIndex: 9998 }}>
          <div className="flex justify-between pt-8 px-4">
            {/* Left clouds - slide in from left */}
            <div className="flex gap-2 animate-slide-in-left" style={{ animationDuration: '0.6s' }}>
              <span className="text-5xl animate-float" style={{ animationDelay: '0s' }}>☁️</span>
              <span className="text-4xl animate-float mt-4" style={{ animationDelay: '0.2s' }}>☁️</span>
            </div>
            {/* Right clouds - slide in from right */}
            <div className="flex gap-2 animate-slide-in-right" style={{ animationDuration: '0.6s' }}>
              <span className="text-4xl animate-float mt-2" style={{ animationDelay: '0.3s' }}>☁️</span>
              <span className="text-5xl animate-float" style={{ animationDelay: '0.1s' }}>☁️</span>
            </div>
          </div>
        </div>
      )}

      {/* Flying paper ball - transformed from button */}
      {(orderAnimationStage === 'loading' || orderAnimationStage === 'paper' || orderAnimationStage === 'flying') && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 pointer-events-none transition-all"
          style={{ 
            bottom: `${paperPosition.bottom}px`,
            opacity: paperPosition.opacity,
            zIndex: 9999,
          }}
        >
          <video 
            key="flying-paper"
            src="/assets/videos/paper-flying.mp4"
            autoPlay 
            muted 
            playsInline 
            className="w-20 h-20 object-contain"
          />
        </div>
      )}
    </div>
  );
}
