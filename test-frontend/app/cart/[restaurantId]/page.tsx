"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { createOrder, generateTestToken } from "@/lib/api";

export default function CartPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;

  const [token, setToken] = useState<string>("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  // Real-time orders from Convex (reads)
  // Using direct function reference instead of api object
  const orders = useQuery("orders:listOrders" as any, {
    restaurantId,
    limit: 10,
  });

  // Generate token on mount
  useEffect(() => {
    generateTestToken().then(setToken).catch(console.error);
  }, []);

  const handleCreateTestOrder = async () => {
    if (!token) {
      alert("Token not ready yet, please wait...");
      return;
    }

    setIsCreatingOrder(true);
    setOrderResult(null);

    try {
      const result = await createOrder(
        {
          restaurantId,
          tableId: "table-1",
          customerName: "Test Customer",
          customerPhone: "+919876543210",
          items: [
            {
              name: "Test Item",
              price: 299,
              quantity: 2,
              specialInstructions: "Extra spicy",
            },
          ],
          notes: "Test order from frontend",
        },
        token
      );

      setOrderResult(result);
    } catch (error: any) {
      setOrderResult({ error: error.message });
    } finally {
      setIsCreatingOrder(false);
    }
  };

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
          <h1 className="text-3xl font-bold mb-6">Cart & Orders</h1>

          {/* Create Order Section */}
          <div className="mb-8 p-6 bg-purple-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Create Test Order</h2>
            <p className="text-sm text-gray-600 mb-4">
              This will write to Backend API → PostgreSQL → Convex sync
            </p>

            <button
              onClick={handleCreateTestOrder}
              disabled={isCreatingOrder || !token}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {isCreatingOrder
                ? "Creating Order..."
                : !token
                ? "Loading..."
                : "Create Test Order"}
            </button>

            {orderResult && (
              <div
                className={`mt-4 p-4 rounded ${
                  orderResult.error
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                <p className="font-semibold mb-2">
                  {orderResult.error ? "❌ Error" : "✅ Order Created"}
                </p>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(orderResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Real-time Orders List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Recent Orders (Real-time from Convex)
            </h2>

            {orders === undefined ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No orders yet.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Create a test order above to see it appear here in real-time!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div
                    key={order._id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">
                          {order.customerName || "Guest"}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : order.status === "preparing"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold ml-2">
                          ₹{order.totalAmount}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Payment:</span>
                        <span className="ml-2">{order.paymentStatus}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        Note: {order.notes}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded text-sm">
            <p className="font-semibold mb-1">🔄 Real-time Updates</p>
            <p className="text-gray-600">
              Orders update in real-time via Convex WebSocket. When you create
              an order, it writes to PostgreSQL via the backend API, then syncs
              to Convex, and appears here instantly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
