/**
 * API Client for OrderZap Backend
 * Handles all HTTP requests to the Express backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.token = null;
  }

  /**
   * Set JWT token for authenticated requests
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Get stored token
   */
  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  /**
   * Clear token
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ============ ORDER ENDPOINTS ============

  /**
   * Create a new order
   */
  async createOrder(orderData) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  /**
   * Get all orders (with optional filters)
   */
  async getOrders(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/orders?${params}`);
  }

  /**
   * Get single order by ID
   */
  async getOrder(orderId) {
    return this.request(`/api/orders/${orderId}`);
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status) {
    return this.request(`/api/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Delete order (soft delete)
   */
  async deleteOrder(orderId) {
    return this.request(`/api/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  // ============ HEALTH CHECK ============

  /**
   * Check backend health
   */
  async healthCheck() {
    return this.request('/health');
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export class for testing
export default ApiClient;
