/**
 * Example: How to Create Orders via Backend API
 * 
 * This component shows how to integrate the backend API
 * into your existing cart/order flow.
 * 
 * Copy this pattern into your cart pages:
 * - user-side/app/demo/cart/[tableId]/page.js
 * - user-side/app/r/[restaurantId]/m/[tableId]/c/[cartId]/page.js
 */

'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api as convexApi } from '../convex/_generated/api';
import { api as backendApi } from '@/lib/api';
import { createOrderViaBackend, checkBackendHealth } from '@/lib/orderService';

export default function ExampleOrderCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [backendStatus, setBackendStatus] = useState('unknown');

  // Read orders from Convex (real-time)
  const orders = useQuery(convexApi.orders.list);

  // Check backend health on mount
  useState(() => {
    checkBackendHealth().then(isHealthy => {
      setBackendStatus(isHealthy ? 'connected' : 'disconnected');
    });
  }, []);

  /**
   * Example: Create order via backend
   */
  const handleCreateOrder = async () => {
    setIsCreating(true);
    setResult(null);

    try {
      // 1. Set JWT token (do this once after login)
      // For testing, generate token with: node generate-test-token.js
      const testToken = 'YOUR_JWT_TOKEN_HERE';
      backendApi.setToken(testToken);

      // 2. Prepare order data (from your cart)
      const orderData = {
        customerName: 'John Doe',
        customerPhone: '+919876543210',
        customerEmail: 'john@example.com',
        tableId: '5',
        items: [
          {
            menuItemId: '550e8400-e29b-41d4-a716-446655440023', // Replace with real menu item ID
            quantity: 2,
            price: 299.00,
            name: 'Burger',
            image: '/images/burger.jpg',
            notes: 'Extra cheese',
          },
          {
            menuItemId: '550e8400-e29b-41d4-a716-446655440024',
            quantity: 1,
            price: 499.00,
            name: 'Pizza',
            image: '/images/pizza.jpg',
          },
        ],
        paymentMethod: 'pay-counter', // or 'pay-now', 'upi', etc.
        notes: 'Please deliver to table 5',
        tipAmount: 50,
        discountAmount: 0,
        depositUsed: 0,
      };

      // 3. Create order via backend
      const result = await createOrderViaBackend(
        orderData,
        '550e8400-e29b-41d4-a716-446655440000', // restaurantId
        '550e8400-e29b-41d4-a716-446655440001'  // userId
      );

      // 4. Handle result
      if (result.success) {
        setResult({
          type: 'success',
          message: 'Order created successfully!',
          order: result.order,
        });

        // Order will automatically appear in Convex
        // and trigger real-time update in the UI
        console.log('Order created:', result.order);
        console.log('Convex ID:', result.convexId);

        // Clear cart, redirect, etc.
        // clearCart();
        // router.push(`/order/${result.order.id}`);
      } else {
        setResult({
          type: 'error',
          message: result.error || 'Failed to create order',
        });
      }
    } catch (error) {
      console.error('Order creation error:', error);
      setResult({
        type: 'error',
        message: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Order Creation Example</h1>

      {/* Backend Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Backend Status</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="capitalize">{backendStatus}</span>
        </div>
      </div>

      {/* Create Order Button */}
      <button
        onClick={handleCreateOrder}
        disabled={isCreating || backendStatus !== 'connected'}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
      >
        {isCreating ? 'Creating Order...' : 'Create Test Order'}
      </button>

      {/* Result */}
      {result && (
        <div
          className={`mt-4 p-4 rounded ${
            result.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          <p className="font-semibold">{result.message}</p>
          {result.order && (
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(result.order, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Orders List (Real-time from Convex) */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          Orders (Real-time from Convex)
        </h2>
        {orders === undefined ? (
          <p className="text-gray-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-gray-500">No orders yet. Create one above!</p>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order._id} className="p-4 bg-white border rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      Order #{order.orderNumber || order._id.slice(-6)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Table: {order.tableId}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="capitalize">{order.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{order.total}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order._creationTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">📝 How to Use This</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Generate JWT token: <code>node generate-test-token.js</code></li>
          <li>Replace <code>YOUR_JWT_TOKEN_HERE</code> in the code above</li>
          <li>Click "Create Test Order"</li>
          <li>Order will be created in backend → PostgreSQL → Convex</li>
          <li>Order will appear in the list below (real-time)</li>
        </ol>
      </div>
    </div>
  );
}
