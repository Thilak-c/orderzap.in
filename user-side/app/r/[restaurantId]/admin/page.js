"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function AdminDashboard() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  const restaurant = useQuery(api.restaurants.getByShortId, { id: restaurantId });
  const restaurantDbId = restaurant?._id;
  const stats = useQuery(api.orders.getStats, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const orders = useQuery(api.orders.list, restaurantDbId ? { restaurantId: restaurantDbId } : "skip");
  const updateRestaurant = useMutation(api.restaurants.update);

  const [formData, setFormData] = useState({
    userRole: "", // "owner" or "manager"
    ownerName: "", // Owner's name
    ownerPhone: "",
    managerName: "", // Manager's name (if manager is filling or if owner specifies)
    managerPhone: "",
    hasSocialMedia: null, // true/false - do they have social media?
    selectedPlatforms: [], // ["instagram", "youtube", "googleMaps"]
    instagramLink: "",
    youtubeLink: "",
    googleMapsLink: "",
    address: "",
    mapLink: "",
    businessHours: {
      monday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      tuesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      wednesday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      thursday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      friday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      saturday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
      sunday: { isOpen: true, openTime: "09:00", closeTime: "22:00" },
    },
  });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1: Who are you, 2: Names & Phones, 3: Social Links, 4: Address, 5: Business Hours
  const [socialStep, setSocialStep] = useState(1); // 1: Do you have social media?, 2: Which platforms?, 3: Enter links
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const pendingOrders = stats?.pendingOrders ?? 0;
  const todayRevenue = stats?.todayRevenue ?? 0;
  const totalOrders = orders?.length ?? 0;
  const onboardingStatus = restaurant?.onboardingStatus ?? 0;

  const toggleRestaurantStatus = async () => {
    if (!restaurantDbId || isTogglingStatus) return;
    
    setIsTogglingStatus(true);
    try {
      await updateRestaurant({
        restaurantId: restaurantDbId,
        isOpen: !restaurant?.isOpen,
      });
      
      // Vibrate on toggle
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
    setIsTogglingStatus(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!restaurantDbId) return;

    setSaving(true);
    try {
      const filledByName = formData.userRole === "owner" ? formData.ownerName : formData.managerName;
      
      await updateRestaurant({
        restaurantId: restaurantDbId,
        address: formData.address,
        googleMapsLink: formData.googleMapsLink || undefined,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone ? `+91${formData.ownerPhone}` : undefined,
        managerName: formData.managerName || undefined,
        managerPhone: formData.managerPhone ? `+91${formData.managerPhone}` : undefined,
        instagramLink: formData.instagramLink || undefined,
        youtubeLink: formData.youtubeLink || undefined,
        businessHours: formData.businessHours,
        onboardingFilledBy: formData.userRole, // Store who filled the form
        onboardingFilledByName: filledByName, // Store name of person who filled
        onboardingStatus: 25, // Move to next step
      });
      
      // Trigger confetti and vibration on success
      triggerSuccessAnimation();
    } catch (error) {
      console.error("Failed to save:", error);
    }
    setSaving(false);
  };

  const triggerSuccessAnimation = () => {
    // Vibrate device if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Create confetti
    createConfetti();
  };

  const createConfetti = () => {
    const colors = ['#000000', '#333333', '#666666', '#999999'];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * window.innerWidth + 'px';
      confetti.style.top = '-10px';
      confetti.style.opacity = '1';
      confetti.style.pointerEvents = 'none';
      confetti.style.zIndex = '9999';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      document.body.appendChild(confetti);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 2 + Math.random() * 3;
      let x = parseFloat(confetti.style.left);
      let y = -10;
      let velX = Math.cos(angle) * velocity;
      let velY = Math.sin(angle) * velocity + 5;
      let rotation = 0;
      let rotationSpeed = (Math.random() - 0.5) * 10;

      const animate = () => {
        y += velY;
        x += velX;
        velY += 0.3; // gravity
        rotation += rotationSpeed;
        
        confetti.style.top = y + 'px';
        confetti.style.left = x + 'px';
        confetti.style.transform = `rotate(${rotation}deg)`;
        confetti.style.opacity = Math.max(0, 1 - (y / window.innerHeight));

        if (y < window.innerHeight + 50) {
          requestAnimationFrame(animate);
        } else {
          confetti.remove();
        }
      };
      
      setTimeout(() => animate(), i * 10);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, userRole: role }));
    setStep(2);
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    
    // Validate phone numbers are exactly 10 digits
    if (formData.userRole === "owner") {
      if (formData.ownerPhone.length !== 10) {
        alert("Owner phone number must be exactly 10 digits");
        return;
      }
      if (formData.managerPhone && formData.managerPhone.length !== 10) {
        alert("Manager phone number must be exactly 10 digits");
        return;
      }
    } else {
      if (formData.managerPhone.length !== 10) {
        alert("Manager phone number must be exactly 10 digits");
        return;
      }
      if (formData.ownerPhone.length !== 10) {
        alert("Owner phone number must be exactly 10 digits");
        return;
      }
    }
    
    setStep(3);
  };

  const handleSocialLinksSubmit = (e) => {
    e.preventDefault();
    
    // If they don't have social media, skip to address
    if (formData.hasSocialMedia === false) {
      setStep(4);
      return;
    }
    
    // Validate selected platform links
    if (formData.selectedPlatforms.includes('instagram') && formData.instagramLink && !formData.instagramLink.includes('instagram.com')) {
      alert("Please enter a valid Instagram link (must contain 'instagram.com')");
      return;
    }
    
    if (formData.selectedPlatforms.includes('youtube') && formData.youtubeLink && !formData.youtubeLink.includes('youtube.com') && !formData.youtubeLink.includes('youtu.be')) {
      alert("Please enter a valid YouTube link (must contain 'youtube.com' or 'youtu.be')");
      return;
    }
    
    setStep(4);
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    setStep(5); // Go to business hours
  };

  const togglePlatform = (platform) => {
    setFormData(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter(p => p !== platform)
        : [...prev.selectedPlatforms, platform]
    }));
  };

  // Welcome screen for new restaurants
  if (onboardingStatus === 0) {
    return (
      <div className="min-h-screen bg-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Logo */}
          {restaurant?.logo_url && (
            <div className="flex justify-center mb-8 opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name}
                className="w-32 h-32 object-cover transition-transform hover:scale-105"
              />
            </div>
          )}

          {/* Welcome Message */}
          <div className="text-center mb-12 opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
            <h1 className="text-4xl font-bold text-black mb-4">
              Welcome {restaurant?.name}
            </h1>
            
            <p className="text-xl text-gray-600">
              The admin panel only for {restaurant?.name}
            </p>
          </div>

          {/* Divider */}
          <div className="w-24 h-px bg-gray-300 mx-auto mb-12 opacity-0 animate-expand" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}></div>

          {/* Step 1: Who are you? */}
          {step === 1 && (
            <div className="space-y-6 opacity-0 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
              <h2 className="text-2xl font-bold text-black text-center mb-8">
                Who are you?
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRoleSelect("owner")}
                  className="p-8 border-2 border-gray-300 hover:border-black hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105 active:scale-95"
                >
                  <p className="text-xl font-bold text-black mb-2">Owner</p>
                  <p className="text-sm text-gray-600">I own this restaurant</p>
                </button>

                <button
                  onClick={() => handleRoleSelect("manager")}
                  className="p-8 border-2 border-gray-300 hover:border-black hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105 active:scale-95"
                >
                  <p className="text-xl font-bold text-black mb-2">Manager</p>
                  <p className="text-sm text-gray-600">I manage this restaurant</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Phone Numbers */}
          {step === 2 && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6 opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-600 hover:text-black mb-4 transition-colors"
              >
                ← Back
              </button>

              <h2 className="text-2xl font-bold text-black text-center mb-8">
                Contact Information
              </h2>

              {formData.userRole === "owner" ? (
                <>
                  {/* Owner filling - ask for owner details */}
                  <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                    <label className="block text-sm font-medium text-black mb-2">
                      Your Name (Owner)
                    </label>
                    <input
                      type="text"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setFormData(prev => ({ ...prev, ownerName: value }));
                      }}
                      required
                      placeholder="Enter owner name"
                      className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                    />
                  </div>

                  <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
                    <label className="block text-sm font-medium text-black mb-2">
                      Your Phone Number (Owner)
                    </label>
                    <div className={`flex items-center border ${formData.ownerPhone && formData.ownerPhone.length !== 10 ? 'border-red-500' : 'border-gray-300'} focus-within:border-black transition-all`}>
                      <span className="px-4 py-3 bg-gray-100 text-black font-medium border-r border-gray-300">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        name="ownerPhone"
                        value={formData.ownerPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData(prev => ({ ...prev, ownerPhone: value }));
                        }}
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        className="flex-1 px-4 py-3 text-black focus:outline-none"
                      />
                    </div>
                    {formData.ownerPhone && (
                      <p className={`text-xs mt-2 transition-all ${formData.ownerPhone.length === 10 ? 'text-gray-500' : 'text-red-500'}`}>
                        {formData.ownerPhone.length === 10 
                          ? `Full number: +91 ${formData.ownerPhone}` 
                          : `${formData.ownerPhone.length}/10 digits - Must be exactly 10 digits`
                        }
                      </p>
                    )}
                  </div>

                  {/* Optional: Manager details */}
                  <div className="border-t border-gray-200 pt-6 opacity-0 animate-slide-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                    <p className="text-sm font-medium text-black mb-4">
                      Do you have a manager? (Optional)
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Manager Name
                        </label>
                        <input
                          type="text"
                          name="managerName"
                          value={formData.managerName}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setFormData(prev => ({ ...prev, managerName: value }));
                          }}
                          placeholder="Enter manager name (optional)"
                          className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Manager Phone Number
                        </label>
                        <div className={`flex items-center border ${formData.managerPhone && formData.managerPhone.length !== 10 && formData.managerPhone.length > 0 ? 'border-red-500' : 'border-gray-300'} focus-within:border-black transition-all`}>
                          <span className="px-4 py-3 bg-gray-100 text-black font-medium border-r border-gray-300">
                            +91
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            name="managerPhone"
                            value={formData.managerPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setFormData(prev => ({ ...prev, managerPhone: value }));
                            }}
                            maxLength={10}
                            placeholder="9876543210 (optional)"
                            className="flex-1 px-4 py-3 text-black focus:outline-none"
                          />
                        </div>
                        {formData.managerPhone && formData.managerPhone.length > 0 && (
                          <p className={`text-xs mt-2 transition-all ${formData.managerPhone.length === 10 ? 'text-gray-500' : 'text-red-500'}`}>
                            {formData.managerPhone.length === 10 
                              ? `Full number: +91 ${formData.managerPhone}` 
                              : `${formData.managerPhone.length}/10 digits - Must be exactly 10 digits`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Manager filling - ask for both manager and owner details */}
                  <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                    <label className="block text-sm font-medium text-black mb-2">
                      Your Name (Manager)
                    </label>
                    <input
                      type="text"
                      name="managerName"
                      value={formData.managerName}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setFormData(prev => ({ ...prev, managerName: value }));
                      }}
                      required
                      placeholder="Enter manager name"
                      className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                    />
                  </div>

                  <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
                    <label className="block text-sm font-medium text-black mb-2">
                      Your Phone Number (Manager)
                    </label>
                    <div className={`flex items-center border ${formData.managerPhone && formData.managerPhone.length !== 10 ? 'border-red-500' : 'border-gray-300'} focus-within:border-black transition-all`}>
                      <span className="px-4 py-3 bg-gray-100 text-black font-medium border-r border-gray-300">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        name="managerPhone"
                        value={formData.managerPhone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData(prev => ({ ...prev, managerPhone: value }));
                        }}
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        className="flex-1 px-4 py-3 text-black focus:outline-none"
                      />
                    </div>
                    {formData.managerPhone && (
                      <p className={`text-xs mt-2 transition-all ${formData.managerPhone.length === 10 ? 'text-gray-500' : 'text-red-500'}`}>
                        {formData.managerPhone.length === 10 
                          ? `Full number: +91 ${formData.managerPhone}` 
                          : `${formData.managerPhone.length}/10 digits - Must be exactly 10 digits`
                        }
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-6 opacity-0 animate-slide-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                    <p className="text-sm font-medium text-black mb-4">
                      Owner Details
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          Owner Name
                        </label>
                        <input
                          type="text"
                          name="ownerName"
                          value={formData.ownerName}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setFormData(prev => ({ ...prev, ownerName: value }));
                          }}
                          required
                          placeholder="Enter owner name"
                          className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-black mb-2">
                          Owner Phone Number
                        </label>
                        <div className={`flex items-center border ${formData.ownerPhone && formData.ownerPhone.length !== 10 ? 'border-red-500' : 'border-gray-300'} focus-within:border-black transition-all`}>
                          <span className="px-4 py-3 bg-gray-100 text-black font-medium border-r border-gray-300">
                            +91
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            name="ownerPhone"
                            value={formData.ownerPhone}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setFormData(prev => ({ ...prev, ownerPhone: value }));
                            }}
                            required
                            maxLength={10}
                            placeholder="9876543210"
                            className="flex-1 px-4 py-3 text-black focus:outline-none"
                          />
                        </div>
                        {formData.ownerPhone && (
                          <p className={`text-xs mt-2 transition-all ${formData.ownerPhone.length === 10 ? 'text-gray-500' : 'text-red-500'}`}>
                            {formData.ownerPhone.length === 10 
                              ? `Full number: +91 ${formData.ownerPhone}` 
                              : `${formData.ownerPhone.length}/10 digits - Must be exactly 10 digits`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={
                  formData.userRole === "owner" 
                    ? !formData.ownerName.trim() || formData.ownerPhone.length !== 10 || (formData.managerPhone && formData.managerPhone.length !== 10)
                    : !formData.managerName.trim() || !formData.ownerName.trim() || formData.managerPhone.length !== 10 || formData.ownerPhone.length !== 10
                }
                className="w-full py-4 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed transform active:scale-95 opacity-0 animate-slide-up"
                style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}
              >
                Continue
              </button>
            </form>
          )}

          {/* Step 3: Social Links */}
          {step === 3 && (
            <div className="space-y-6 opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
              <button
                type="button"
                onClick={() => {
                  if (socialStep === 1) {
                    setStep(2);
                  } else {
                    setSocialStep(socialStep - 1);
                  }
                }}
                className="text-sm text-gray-600 hover:text-black mb-4 transition-colors"
              >
                ← Back
              </button>

              {/* Social Step 1: Do you have social media? */}
              {socialStep === 1 && (
                <>
                  <h2 className="text-2xl font-bold text-black text-center mb-8">
                    Do you have social media accounts?
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, hasSocialMedia: true }));
                        setSocialStep(2);
                      }}
                      className="p-8 border-2 border-gray-300 hover:border-black hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105 active:scale-95 opacity-0 animate-slide-up"
                      style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}
                    >
                      <p className="text-xl font-bold text-black mb-2">Yes</p>
                      <p className="text-sm text-gray-600">We have social media</p>
                    </button>

                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, hasSocialMedia: false, selectedPlatforms: [] }));
                        setStep(4);
                      }}
                      className="p-8 border-2 border-gray-300 hover:border-black hover:shadow-lg transition-all duration-300 text-center transform hover:scale-105 active:scale-95 opacity-0 animate-slide-up"
                      style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
                    >
                      <p className="text-xl font-bold text-black mb-2">No</p>
                      <p className="text-sm text-gray-600">Skip this step</p>
                    </button>
                  </div>
                </>
              )}

              {/* Social Step 2: Which platforms? */}
              {socialStep === 2 && (
                <>
                  <h2 className="text-2xl font-bold text-black text-center mb-8">
                    Which platforms do you have?
                  </h2>
                  
                  <p className="text-sm text-gray-600 text-center mb-6 opacity-0 animate-fade-in" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                    Select all that apply
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => togglePlatform('instagram')}
                      className={`w-full p-4 border-2 transition-all duration-300 text-left flex items-center justify-between opacity-0 animate-slide-up ${
                        formData.selectedPlatforms.includes('instagram')
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 hover:border-black'
                      }`}
                      style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}
                    >
                      <span className="font-medium">Instagram</span>
                      {formData.selectedPlatforms.includes('instagram') && <span>✓</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePlatform('youtube')}
                      className={`w-full p-4 border-2 transition-all duration-300 text-left flex items-center justify-between opacity-0 animate-slide-up ${
                        formData.selectedPlatforms.includes('youtube')
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 hover:border-black'
                      }`}
                      style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}
                    >
                      <span className="font-medium">YouTube</span>
                      {formData.selectedPlatforms.includes('youtube') && <span>✓</span>}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (formData.selectedPlatforms.length > 0) {
                        setSocialStep(3);
                      } else {
                        alert("Please select at least one platform");
                      }
                    }}
                    className="w-full py-4 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 transform active:scale-95 opacity-0 animate-slide-up"
                    style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}
                  >
                    Continue
                  </button>
                </>
              )}

              {/* Social Step 3: Enter links */}
              {socialStep === 3 && (
                <form onSubmit={handleSocialLinksSubmit} className="space-y-6">
                  <h2 className="text-2xl font-bold text-black text-center mb-8">
                    Enter Your Links
                  </h2>

                  {formData.selectedPlatforms.includes('instagram') && (
                    <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                      <label className="block text-sm font-medium text-black mb-2">
                        Instagram Link
                      </label>
                      <input
                        type="url"
                        name="instagramLink"
                        value={formData.instagramLink}
                        onChange={handleChange}
                        required
                        placeholder="https://instagram.com/yourrestaurant"
                        className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                      />
                      {formData.instagramLink && !formData.instagramLink.includes('instagram.com') && (
                        <p className="text-xs text-red-500 mt-2 transition-all">
                          Must be a valid Instagram link
                        </p>
                      )}
                    </div>
                  )}

                  {formData.selectedPlatforms.includes('youtube') && (
                    <div className="opacity-0 animate-slide-up" style={{animationDelay: formData.selectedPlatforms.includes('instagram') ? '0.3s' : '0.2s', animationFillMode: 'forwards'}}>
                      <label className="block text-sm font-medium text-black mb-2">
                        YouTube Link
                      </label>
                      <input
                        type="url"
                        name="youtubeLink"
                        value={formData.youtubeLink}
                        onChange={handleChange}
                        required
                        placeholder="https://youtube.com/@yourrestaurant"
                        className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                      />
                      {formData.youtubeLink && !formData.youtubeLink.includes('youtube.com') && !formData.youtubeLink.includes('youtu.be') && (
                        <p className="text-xs text-red-500 mt-2 transition-all">
                          Must be a valid YouTube link
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 transform active:scale-95 opacity-0 animate-slide-up"
                    style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}
                  >
                    Continue
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Step 4: Address */}
          {step === 4 && (
            <form onSubmit={handleAddressSubmit} className="space-y-6 opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-sm text-gray-600 hover:text-black mb-4 transition-colors"
              >
                ← Back
              </button>

              <h2 className="text-2xl font-bold text-black text-center mb-8">
                Restaurant Location
              </h2>

              <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
                <label className="block text-sm font-medium text-black mb-2">
                  Full Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="Enter full address"
                  className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black resize-none transition-all"
                />
              </div>

              <div className="relative opacity-0 animate-fade-in" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
                <label className="block text-sm font-medium text-black mb-2">
                  Google Maps Location Link (Optional)
                </label>
                <input
                  type="url"
                  name="googleMapsLink"
                  value={formData.googleMapsLink}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-4 py-3 border border-gray-300 text-black focus:outline-none focus:border-black transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Paste your Google Maps location link for easy navigation
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 transform active:scale-95 opacity-0 animate-slide-up"
                style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}
              >
                Continue
              </button>
            </form>
          )}

          {/* Step 5: Business Hours */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-6 opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-sm text-gray-600 hover:text-black mb-4 transition-colors"
              >
                ← Back
              </button>

              <h2 className="text-2xl font-bold text-black text-center mb-8">
                Business Hours
              </h2>

              <p className="text-sm text-gray-600 text-center mb-6">
                Set your opening and closing times for each day
              </p>

              <div className="space-y-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, index) => (
                  <div key={day} className="border border-gray-200 p-4 opacity-0 animate-slide-up" style={{animationDelay: `${0.2 + index * 0.05}s`, animationFillMode: 'forwards'}}>
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.businessHours[day].isOpen}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              businessHours: {
                                ...prev.businessHours,
                                [day]: { ...prev.businessHours[day], isOpen: e.target.checked }
                              }
                            }));
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-sm font-bold text-black capitalize">{day}</span>
                      </label>
                    </div>
                    
                    {formData.businessHours[day].isOpen && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Open Time</label>
                          <input
                            type="time"
                            value={formData.businessHours[day].openTime}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                businessHours: {
                                  ...prev.businessHours,
                                  [day]: { ...prev.businessHours[day], openTime: e.target.value }
                                }
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 text-black focus:outline-none focus:border-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Close Time</label>
                          <input
                            type="time"
                            value={formData.businessHours[day].closeTime}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                businessHours: {
                                  ...prev.businessHours,
                                  [day]: { ...prev.businessHours[day], closeTime: e.target.value }
                                }
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 text-black focus:outline-none focus:border-black"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 disabled:bg-gray-400 transform active:scale-95 opacity-0 animate-slide-up"
                style={{animationDelay: '0.8s', animationFillMode: 'forwards'}}
              >
                {saving ? "Saving..." : "Complete Setup"}
              </button>
            </form>
          )}

        </div>
      </div>
    );
  }

  // Regular dashboard for onboarded restaurants
  return (
    <div className="min-h-screen bg-white">
      
      {/* Header */}
      <div className="border-b border-gray-200 opacity-0 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'forwards'}}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {restaurant?.logo_url && (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name}
                  className="w-16 h-16 object-cover rounded-full border-2 border-gray-200"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-black">{restaurant?.name || "Admin"}</h1>
                <p className="text-sm text-gray-500 mt-1">Welcome back</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Toggle Switch */}
              <button
                onClick={toggleRestaurantStatus}
                disabled={isTogglingStatus}
                className="relative inline-flex items-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <span className="text-sm font-medium text-gray-600">
                  {restaurant?.isOpen ? 'Open' : 'Closed'}
                </span>
                <div className={`w-16 h-8 rounded-full transition-all duration-300 ${
                  restaurant?.isOpen ? 'bg-black' : 'bg-gray-300'
                }`}>
                  <div className={`w-6 h-6 bg-white rounded-full mt-1 transition-all duration-300 transform ${
                    restaurant?.isOpen ? 'translate-x-9' : 'translate-x-1'
                  }`} />
                </div>
              </button>
              
              {/* Business Hours Info */}
              {restaurant?.businessHours && (() => {
                const now = new Date();
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const currentDay = days[now.getDay()];
                const daySchedule = restaurant.businessHours[currentDay];
                
                if (daySchedule && daySchedule.isOpen) {
                  return (
                    <div className="text-xs text-gray-500">
                      <div>Today: {daySchedule.openTime} - {daySchedule.closeTime}</div>
                      <div className="text-gray-400">Auto-updates every 5 min</div>
                    </div>
                  );
                } else if (daySchedule && !daySchedule.isOpen) {
                  return (
                    <div className="text-xs text-gray-500">
                      <div>Closed today</div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          <div className="border-2 border-gray-200 p-8 hover:border-black transition-all duration-300 transform hover:scale-105 opacity-0 animate-slide-up" style={{animationDelay: '0.2s', animationFillMode: 'forwards'}}>
            <p className="text-sm font-medium text-gray-500 mb-3">Revenue Today</p>
            <p className="text-5xl font-bold text-black">₹{todayRevenue.toLocaleString()}</p>
          </div>

          <div className="border-2 border-gray-200 p-8 hover:border-black transition-all duration-300 transform hover:scale-105 opacity-0 animate-slide-up" style={{animationDelay: '0.3s', animationFillMode: 'forwards'}}>
            <p className="text-sm font-medium text-gray-500 mb-3">Pending Orders</p>
            <p className="text-5xl font-bold text-black">{pendingOrders}</p>
          </div>

          <div className="border-2 border-gray-200 p-8 hover:border-black transition-all duration-300 transform hover:scale-105 opacity-0 animate-slide-up" style={{animationDelay: '0.4s', animationFillMode: 'forwards'}}>
            <p className="text-sm font-medium text-gray-500 mb-3">Total Orders</p>
            <p className="text-5xl font-bold text-black">{totalOrders}</p>
          </div>

        </div>

        {/* Quick Actions */}
        <div className="mb-12 opacity-0 animate-slide-up" style={{animationDelay: '0.5s', animationFillMode: 'forwards'}}>
          <h2 className="text-2xl font-bold text-black mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <Link 
              href={`/r/${restaurantId}/admin/orders`}
              className="border-2 border-gray-200 p-6 hover:border-black hover:bg-black hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              <p className="font-bold text-lg mb-1 group-hover:text-white">Orders</p>
              <p className="text-sm text-gray-500 group-hover:text-gray-300">Manage orders</p>
            </Link>

            <Link 
              href={`/r/${restaurantId}/admin/menu`}
              className="border-2 border-gray-200 p-6 hover:border-black hover:bg-black hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              <p className="font-bold text-lg mb-1 group-hover:text-white">Menu</p>
              <p className="text-sm text-gray-500 group-hover:text-gray-300">Edit items</p>
            </Link>

            <Link 
              href={`/r/${restaurantId}/admin/tables`}
              className="border-2 border-gray-200 p-6 hover:border-black hover:bg-black hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              <p className="font-bold text-lg mb-1 group-hover:text-white">Tables</p>
              <p className="text-sm text-gray-500 group-hover:text-gray-300">Manage tables</p>
            </Link>

            <Link 
              href={`/r/${restaurantId}/admin/settings`}
              className="border-2 border-gray-200 p-6 hover:border-black hover:bg-black hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              <p className="font-bold text-lg mb-1 group-hover:text-white">Settings</p>
              <p className="text-sm text-gray-500 group-hover:text-gray-300">Configure</p>
            </Link>

          </div>
        </div>

        {/* Recent Orders */}
        {orders && orders.length > 0 && (
          <div className="opacity-0 animate-slide-up" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
            <h2 className="text-2xl font-bold text-black mb-6">Recent Orders</h2>
            <div className="border-2 border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-bold text-black">Order</th>
                    <th className="text-left p-4 text-sm font-bold text-black">Table</th>
                    <th className="text-left p-4 text-sm font-bold text-black">Status</th>
                    <th className="text-right p-4 text-sm font-bold text-black">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order, index) => (
                    <tr key={order._id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-black">#{order.orderNumber || order._id.slice(-4)}</td>
                      <td className="p-4 text-sm text-gray-600">{order.tableId}</td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-3 py-1 border ${
                          order.status === 'completed' ? 'border-black text-black' : 'border-gray-300 text-gray-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-black text-right">₹{order.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!orders || orders.length === 0) && (
          <div className="text-center py-20 opacity-0 animate-fade-in" style={{animationDelay: '0.6s', animationFillMode: 'forwards'}}>
            <div className="w-24 h-24 border-2 border-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl text-gray-300">📋</span>
            </div>
            <h3 className="text-2xl font-bold text-black mb-2">No orders yet</h3>
            <p className="text-gray-600 mb-8">Orders will appear here once customers start ordering</p>
            <Link 
              href={`/r/${restaurantId}/admin/qr-codes`}
              className="inline-block px-8 py-4 bg-black text-white font-medium hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              Generate QR Codes
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
