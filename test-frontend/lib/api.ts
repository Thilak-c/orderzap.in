// Backend API client for writes (Option A Architecture)
// Frontend writes via Backend API → PostgreSQL → Convex sync

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface CreateOrderRequest {
  restaurantId: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    menuItemId?: string;
    name: string;
    price: number;
    quantity: number;
    specialInstructions?: string;
    customizations?: any[];
  }>;
  notes?: string;
  specialInstructions?: string;
}

interface UpdateOrderRequest {
  status?: string;
  notes?: string;
  specialInstructions?: string;
}

// Generate test token for authentication
export async function generateTestToken() {
  const response = await fetch(`${API_URL}/api/auth/generate-test-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "550e8400-e29b-41d4-a716-446655440001",
      restaurantId: "550e8400-e29b-41d4-a716-446655440000",
      email: "admin@test.com",
      role: "admin",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate test token");
  }

  const data = await response.json();
  return data.token;
}

// Create a new order (writes to PostgreSQL, syncs to Convex)
export async function createOrder(
  orderData: CreateOrderRequest,
  token: string
) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create order");
  }

  return response.json();
}

// Update an order
export async function updateOrder(
  orderId: string,
  updates: UpdateOrderRequest,
  token: string
) {
  const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update order");
  }

  return response.json();
}

// Get orders (for comparison - normally you'd use Convex for reads)
export async function getOrders(restaurantId: string, token: string) {
  const response = await fetch(
    `${API_URL}/api/orders?restaurantId=${restaurantId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch orders");
  }

  return response.json();
}
