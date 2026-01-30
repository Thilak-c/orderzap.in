"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function MenuPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;

  // Mock menu items for demonstration
  const menuItems = [
    {
      id: "1",
      name: "Butter Chicken",
      description: "Creamy tomato-based curry with tender chicken",
      category: "Main Course",
      price: 350,
      available: true,
    },
    {
      id: "2",
      name: "Paneer Tikka",
      description: "Grilled cottage cheese with spices",
      category: "Appetizer",
      price: 250,
      available: true,
    },
    {
      id: "3",
      name: "Biryani",
      description: "Fragrant rice with spices and meat",
      category: "Main Course",
      price: 400,
      available: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
          <h1 className="text-3xl font-bold mb-6">Menu</h1>

          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              📝 Note: This is showing mock data. To enable real-time menu from
              Convex, add menuItems queries to the backend.
            </p>
          </div>

          <div className="grid gap-4">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.category && (
                      <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{item.price}</p>
                    {item.available === false && (
                      <span className="text-xs text-red-600">Unavailable</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t">
            <Link
              href={`/cart/${restaurantId}`}
              className="block w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
            >
              Go to Cart & Orders →
            </Link>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded text-sm">
            <p className="font-semibold mb-1">🔄 Real-time Updates</p>
            <p className="text-gray-600">
              When menuItems queries are added to the backend, this page will
              update in real-time via Convex WebSocket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
