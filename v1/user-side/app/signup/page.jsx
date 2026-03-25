"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Store, Mail, Phone, MapPin, User, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default function RestaurantSignup() {
  const router = useRouter();
  const createRestaurant = useMutation(api.restaurants.create);

  const [step, setStep] = useState(0); // 0: Welcome, 1: Basic Info, 2: Contact, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    brandName: "",
    description: "",
    address: "",
    phone: "",
    email: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateStep1 = () => {
    if (!formData.id || formData.id.length > 4) {
      setError("Restaurant ID must be 1-4 characters");
      return false;
    }
    if (!/^[a-z0-9]+$/.test(formData.id)) {
      setError("Restaurant ID can only contain lowercase letters and numbers");
      return false;
    }
    if (!formData.name) {
      setError("Restaurant name is required");
      return false;
    }
    if (!formData.brandName) {
      setError("Brand name is required");
      return false;
    }
    return true;
  };



  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 0) {
      setStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setLoading(true);
    setError("");

    try {
      const restaurantId = await createRestaurant(formData);
      setStep(3);

      // Redirect to restaurant page after 3 seconds
      setTimeout(() => {
        router.push(`/r/${formData.id}`);
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to create restaurant. ID might already exist.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center p- relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/assets/bg/signup-bg.png"
          alt=""
          className="w-full h-full object-cover opacity-100"
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Welcome Screen */}
        {step === 0 && (
          <div className=" animate-fade-in">
            {/* Logo/Icon */}


            {/* Features */}

            <p className="text-sm text-center mt-[160%] text-gray-900 font-light max-w-sm mx-auto leading-relaxed">
              Run your restaurant digitally in <span className="font-bold text-gray-900">2 minutes</span>
            </p>
            {/* Big CTA Button */}
            <Link href="/signup/new" className="text-[--primary-hover] font-semibold hover:underline transition-colors">
              <button
                className="flex justify-center relative w-full max-w-xs mx-auto py-5 px-8 bg-white/60 rounded-2xl font-bold text-lg  hover:shadow-white/20 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden opacity-0 animate-slide-up"
                style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}
              >
                <div className="absolute inset-0  opacity-0 group-hover:opacity-20 transition-opacity" />

                <div className="relative flex items-center justify-center gap-3">

                  Get Started


                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </Link>
            {/* Secondary CTA - Login */}
            <div className="mt-4 text-center opacity-0 animate-fade-in" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/" className="text-[--primary-hover] font-semibold hover:underline transition-colors">
                  Login
                </Link>
              </p>
            </div>


          </div>
        )}

        {/* Form Steps - Only show after welcome */}
        {step > 0 && (
          <>

            {/* Form Card */}
            <div className="bg-red-100 rounded-2xl p-6 shadow-2xl border border-gray-200">
              {step === 1 && (
                <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Basic Information
                  </h2>

                  {/* Restaurant ID */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Restaurant ID <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="id"
                        value={formData.id}
                        onChange={handleChange}
                        placeholder="bts"
                        maxLength={4}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 lowercase backdrop-blur-sm"
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60">
                        {formData.id.length}/4
                      </div>
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Short unique ID (1-4 chars, lowercase only)
                    </p>
                    {formData.id && (
                      <p className="text-xs text-white font-medium mt-1">
                        Your URL: orderzap.in/r/{formData.id}
                      </p>
                    )}
                  </div>

                  {/* Restaurant Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-white mb-2">
                      Restaurant Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Store size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="BTS Disc Cafe & Restro"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Brand Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="brandName"
                        value={formData.brandName}
                        onChange={handleChange}
                        placeholder="BTS DISC"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Display name shown to customers
                    </p>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Premium dining experience..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all active:scale-95 shadow-lg"
                  >
                    Continue
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleSubmit}>
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Branding & Contact
                    </h2>
                  </div>

                  {/* Brand Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        name="brandName"
                        value={formData.brandName}
                        onChange={handleChange}
                        placeholder="BTS DISC"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Display name shown to customers
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 1234567890"
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Restaurant Logo
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-red-400 transition-colors cursor-pointer bg-gray-50">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="logo-upload"
                      />
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <Store size={24} className="text-red-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            Click to upload logo
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creating Restaurant...
                      </>
                    ) : (
                      'Create Restaurant'
                    )}
                  </button>
                </form>
              )}

              {step === 3 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border-2 border-green-500 mb-4 animate-bounce-in">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome to OrderZap!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your restaurant has been created successfully
                  </p>
                  <div className="p-4 bg-purple-50 rounded-xl mb-6 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Your restaurant URL</p>
                    <p className="text-purple-600 font-mono font-semibold">
                      orderzap.in/r/{formData.id}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Redirecting to your dashboard...
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {step < 3 && step > 0 && (
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/" className="text-purple-600 hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
          display: inline-block;
          transform-origin: 70% 70%;
        }
      `}</style>
    </div>
  );
}
