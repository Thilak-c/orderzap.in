"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function RestaurantPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
          <h1 className="text-3xl font-bold mb-4">Restaurant Info</h1>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Restaurant ID</p>
              <p className="font-mono text-sm break-all">{restaurantId}</p>
            </div>

            <div className="p-4 bg-blue-50 rounded">
              <h2 className="font-semibold mb-2">Test Restaurant</h2>
              <p className="text-sm text-gray-600">
                This is a test restaurant for demonstrating the Option A
                architecture.
              </p>
            </div>

            <div className="mt-6">
              <Link
                href={`/menu/${restaurantId}`}
                className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
              >
                View Menu →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
