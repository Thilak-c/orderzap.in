"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export default function RestaurantsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const restaurants = useQuery(api.admin.getRestaurants, {
    status: filterStatus === "all" ? undefined : filterStatus,
    search: searchTerm || undefined,
  });

  const list = restaurants || [];

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Restaurants</h1>
            <p className="text-sm text-neutral-600">
              Simple list of all restaurants from the real database.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/restaurants/new")}
            className="inline-flex items-center gap-2 border border-black px-3 py-1.5 text-sm font-medium rounded-sm hover:bg-black hover:text-white transition-colors"
          >
            <Plus size={16} />
            New restaurant
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by name, email or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-black/20 rounded-sm px-8 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-black/20 rounded-sm px-2 py-2 text-sm outline-none focus:border-black"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {!restaurants && (
          <p className="text-sm text-neutral-600">Loading restaurants…</p>
        )}

        {restaurants && list.length === 0 && (
          <p className="text-sm text-neutral-600">No restaurants found.</p>
        )}

        <div className="grid gap-3">
          {list.map((restaurant) => (
            <button
              key={restaurant._id}
              onClick={() =>
                router.push(`/admin/restaurants/${restaurant._id}`)
              }
              className="w-full text-left border border-black/20 rounded-sm px-4 py-3 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.6)] transition-shadow"
            >
              <div className="flex justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-sm font-semibold">
                      {restaurant.name}
                    </h2>
                    <span className="text-xs text-neutral-600 font-mono">
                      {restaurant.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Mail size={12} />
                    <span>{restaurant.email || "no email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <Phone size={12} />
                    <span>{restaurant.phone || "no phone"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-700">
                    <MapPin size={12} />
                    <span className="truncate">
                      {restaurant.address || "no address"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between text-xs text-neutral-700">
                  <span className="capitalize">
                    {restaurant.status || "unknown"}
                  </span>
                  <span>
                    {restaurant.daysRemaining}{" "}
                    {restaurant.daysRemaining === 1 ? "day" : "days"} left
                  </span>
                  <span>
                    Plan: {restaurant.subscription?.planType || "trial"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}