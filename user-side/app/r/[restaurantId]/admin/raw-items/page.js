"use client";
import { useParams } from "next/navigation";
import { useRouteProtection } from "@/lib/useRouteProtection";
import { AlertCircle } from "lucide-react";

export default function RawItemsPage() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  
  // Route protection - only Owner and Manager can access Raw Items
  const { authUser, isAuthorized, isChecking } = useRouteProtection(restaurantId, ['Owner', 'Manager']);
  
  // Show access denied if not authorized
  if (!isChecking && !isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-black mb-3 uppercase">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access Raw Items Management. Only owners and managers can manage inventory.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to Orders page...
          </p>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking permissions...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-black uppercase tracking-wider mb-4">
            Raw Items Management
          </h1>
          <p className="text-lg md:text-xl text-gray-600 uppercase tracking-wide">
            Under Construction
          </p>
        </div>

        {/* Video Container */}
        <div className="bg-[#ecf3f4] border-2 border-black p-4 md:p-8">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <video
              className="absolute top-0 left-0 w-full h-full object-contain border-2 border-gray-300"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/assets/videos/under-work.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Description */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm md:text-base">
            This feature is currently being developed. It will allow you to manage raw ingredients, 
            track inventory, set reorder points, and monitor stock levels.
          </p>
        </div>

        {/* Coming Soon Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
            <h3 className="font-bold text-black uppercase tracking-wide mb-2">Inventory Tracking</h3>
            <p className="text-sm text-gray-600">Monitor stock levels in real-time</p>
          </div>
          <div className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
            <h3 className="font-bold text-black uppercase tracking-wide mb-2">Supplier Management</h3>
            <p className="text-sm text-gray-600">Manage your suppliers and orders</p>
          </div>
          <div className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
            <h3 className="font-bold text-black uppercase tracking-wide mb-2">Cost Analysis</h3>
            <p className="text-sm text-gray-600">Track ingredient costs and margins</p>
          </div>
          <div className="bg-white border-2 border-gray-300 p-4 hover:border-black transition-all">
            <h3 className="font-bold text-black uppercase tracking-wide mb-2">Waste Tracking</h3>
            <p className="text-sm text-gray-600">Monitor and reduce food waste</p>
          </div>
        </div>
      </div>
    </div>
  );
}
