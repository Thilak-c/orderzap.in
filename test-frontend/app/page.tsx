import Link from "next/link";

export default function HomePage() {
  const testRestaurantId = "550e8400-e29b-41d4-a716-446655440000";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          OrderZap Test
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Option A Architecture Demo
        </p>

        <div className="space-y-4">
          <Link
            href={`/restaurant/${testRestaurantId}`}
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
          >
            1. Restaurant →
          </Link>

          <Link
            href={`/menu/${testRestaurantId}`}
            className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
          >
            2. Menu →
          </Link>

          <Link
            href={`/cart/${testRestaurantId}`}
            className="block w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition"
          >
            3. Cart & Orders →
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold text-sm text-gray-700 mb-2">
            Architecture:
          </h2>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✅ Writes: Frontend → Backend API → PostgreSQL</li>
            <li>✅ Reads: Frontend → Convex (Real-time)</li>
            <li>✅ Backend syncs PostgreSQL → Convex</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
