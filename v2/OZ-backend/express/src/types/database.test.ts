/**
 * Unit Tests for TypeScript Type Definitions
 * ────────────────────────────────────────────
 * Tests type compatibility with database schemas
 * Tests optional vs required field enforcement
 * Tests union type constraints
 * 
 * Requirements: 5.1-5.10
 */

import { describe, it, expect } from 'vitest';
import type {
  Restaurant,
  Zone,
  Category,
  MenuItem,
  Table,
  AlertSettings,
  Settings,
  Staff,
  Payroll,
  Inventory,
  Wastage,
  Deduction,
  Customer,
  Reservation,
  Review,
  Subscription,
  Payment,
  AdminUser,
  ActivityLog,
  ConvexOrder,
  ConvexStaffCall,
  ConvexZoneRequest,
  ConvexNotification,
  ConvexStaffNotification,
  ConvexAttendance,
  DatabaseResponse,
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
} from './database';

describe('PostgreSQL Type Definitions', () => {
  describe('Restaurant Interface', () => {
    it('should accept valid restaurant object with required fields', () => {
      const restaurant: Restaurant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        short_id: 'bts',
        name: 'Behind The Scenes',
        active: true,
        created_at: Date.now(),
      };
      expect(restaurant.id).toBeDefined();
      expect(restaurant.short_id).toBe('bts');
      expect(restaurant.active).toBe(true);
    });

    it('should accept optional fields', () => {
      const restaurant: Restaurant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        short_id: 'bts',
        name: 'Behind The Scenes',
        active: true,
        created_at: Date.now(),
        logo: 'https://example.com/logo.png',
        email: 'contact@bts.com',
        status: 'active',
      };
      expect(restaurant.logo).toBeDefined();
      expect(restaurant.email).toBeDefined();
    });

    it('should enforce status union type', () => {
      const validStatuses: Array<Restaurant['status']> = ['trial', 'active', 'expired', 'blocked', undefined];
      validStatuses.forEach(status => {
        const restaurant: Restaurant = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          short_id: 'bts',
          name: 'Test',
          active: true,
          created_at: Date.now(),
          status,
        };
        expect(['trial', 'active', 'expired', 'blocked', undefined]).toContain(restaurant.status);
      });
    });

    it('should accept nested location object', () => {
      const restaurant: Restaurant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        short_id: 'bts',
        name: 'Test',
        active: true,
        created_at: Date.now(),
        location: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      };
      expect(restaurant.location?.latitude).toBe(12.9716);
    });
  });

  describe('Zone Interface', () => {
    it('should accept valid zone with required fields', () => {
      const zone: Zone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'VIP Section',
        description: 'Premium dining area',
      };
      expect(zone.name).toBe('VIP Section');
    });

    it('should accept optional restaurant_id', () => {
      const zone: Zone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        restaurant_id: 'bts',
        name: 'VIP Section',
        description: 'Premium dining area',
      };
      expect(zone.restaurant_id).toBe('bts');
    });
  });

  describe('MenuItem Interface', () => {
    it('should accept valid menu item with numeric price', () => {
      const menuItem: MenuItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Butter Chicken',
        price: 299.99,
        category: 'Main Course',
        description: 'Delicious butter chicken',
        available: true,
      };
      expect(menuItem.price).toBe(299.99);
      expect(typeof menuItem.price).toBe('number');
    });

    it('should accept optional theme_colors object', () => {
      const menuItem: MenuItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Butter Chicken',
        price: 299.99,
        category: 'Main Course',
        description: 'Delicious butter chicken',
        available: true,
        theme_colors: {
          primary: '#FF5733',
          secondary: '#C70039',
          accent: '#900C3F',
        },
      };
      expect(menuItem.theme_colors?.primary).toBe('#FF5733');
    });
  });

  describe('Staff Interface', () => {
    it('should accept valid staff with required fields', () => {
      const staff: Staff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        role: 'Waiter',
        assigned_tables: [1, 2, 3],
        active: true,
      };
      expect(staff.assigned_tables).toEqual([1, 2, 3]);
      expect(Array.isArray(staff.assigned_tables)).toBe(true);
    });

    it('should accept optional location object', () => {
      const staff: Staff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        role: 'Waiter',
        assigned_tables: [],
        active: true,
        current_location: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };
      expect(staff.current_location?.latitude).toBe(12.9716);
    });

    it('should accept numeric salary fields', () => {
      const staff: Staff = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        role: 'Waiter',
        assigned_tables: [],
        active: true,
        salary: 25000.50,
        hourly_rate: 150.75,
      };
      expect(typeof staff.salary).toBe('number');
      expect(typeof staff.hourly_rate).toBe('number');
    });
  });

  describe('Payroll Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<Payroll['status']> = ['pending', 'paid', 'cancelled'];
      validStatuses.forEach(status => {
        const payroll: Payroll = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          restaurant_id: '123e4567-e89b-12d3-a456-426614174001',
          staff_id: '123e4567-e89b-12d3-a456-426614174002',
          month: '2024-01',
          base_salary: 25000,
          total_amount: 25000,
          days_worked: 26,
          total_days: 30,
          status,
          created_at: Date.now(),
        };
        expect(['pending', 'paid', 'cancelled']).toContain(payroll.status);
      });
    });

    it('should accept numeric fields for amounts', () => {
      const payroll: Payroll = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        restaurant_id: '123e4567-e89b-12d3-a456-426614174001',
        staff_id: '123e4567-e89b-12d3-a456-426614174002',
        month: '2024-01',
        base_salary: 25000.50,
        bonus: 2000.25,
        deductions: 500.75,
        total_amount: 26500.00,
        days_worked: 26,
        total_days: 30,
        status: 'paid',
        created_at: Date.now(),
      };
      expect(typeof payroll.base_salary).toBe('number');
      expect(typeof payroll.bonus).toBe('number');
      expect(typeof payroll.deductions).toBe('number');
    });
  });

  describe('Reservation Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<Reservation['status']> = ['confirmed', 'cancelled', 'completed'];
      validStatuses.forEach(status => {
        const reservation: Reservation = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          table_id: '123e4567-e89b-12d3-a456-426614174001',
          table_number: 5,
          customer_name: 'Jane Doe',
          date: '2024-01-15',
          start_time: '19:00',
          end_time: '21:00',
          party_size: 4,
          status,
        };
        expect(['confirmed', 'cancelled', 'completed']).toContain(reservation.status);
      });
    });
  });

  describe('Review Interface', () => {
    it('should enforce issue_with union type', () => {
      const validIssues: Array<Review['issue_with']> = ['restaurant', 'app', undefined];
      validIssues.forEach(issue_with => {
        const review: Review = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          restaurant_id: 'bts',
          table_id: 'table-1',
          table_number: 5,
          enjoyed: true,
          issue_with,
          created_at: Date.now(),
        };
        expect(['restaurant', 'app', undefined]).toContain(review.issue_with);
      });
    });
  });

  describe('Subscription Interface', () => {
    it('should enforce plan_type union type', () => {
      const validPlanTypes: Array<Subscription['plan_type']> = ['monthly', 'custom', 'trial_extension'];
      validPlanTypes.forEach(plan_type => {
        const subscription: Subscription = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          restaurant_id: 'bts',
          plan_type,
          days: 30,
          price_per_day: 100,
          total_price: 3000,
          start_date: Date.now(),
          end_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
          payment_status: 'completed',
          status: 'active',
          created_at: Date.now(),
          created_by: 'admin',
        };
        expect(['monthly', 'custom', 'trial_extension']).toContain(subscription.plan_type);
      });
    });

    it('should enforce payment_status union type', () => {
      const validStatuses: Array<Subscription['payment_status']> = ['pending', 'completed', 'failed', 'refunded'];
      validStatuses.forEach(payment_status => {
        const subscription: Subscription = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          restaurant_id: 'bts',
          plan_type: 'monthly',
          days: 30,
          price_per_day: 100,
          total_price: 3000,
          start_date: Date.now(),
          end_date: Date.now() + 30 * 24 * 60 * 60 * 1000,
          payment_status,
          status: 'active',
          created_at: Date.now(),
          created_by: 'admin',
        };
        expect(['pending', 'completed', 'failed', 'refunded']).toContain(subscription.payment_status);
      });
    });
  });

  describe('Payment Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<Payment['status']> = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      validStatuses.forEach(status => {
        const payment: Payment = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          restaurant_id: 'bts',
          amount: 3000,
          currency: 'INR',
          status,
          created_at: Date.now(),
        };
        expect(['pending', 'processing', 'completed', 'failed', 'refunded']).toContain(payment.status);
      });
    });

    it('should accept gateway_response as JSONB object', () => {
      const payment: Payment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        restaurant_id: 'bts',
        amount: 3000,
        currency: 'INR',
        status: 'completed',
        created_at: Date.now(),
        gateway_response: {
          razorpay_payment_id: 'pay_123',
          razorpay_order_id: 'order_456',
          razorpay_signature: 'sig_789',
        },
      };
      expect(payment.gateway_response).toBeDefined();
      expect(typeof payment.gateway_response).toBe('object');
    });
  });

  describe('AdminUser Interface', () => {
    it('should enforce role union type', () => {
      const validRoles: Array<AdminUser['role']> = ['super_admin', 'admin', 'support'];
      validRoles.forEach(role => {
        const adminUser: AdminUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@example.com',
          password_hash: 'hashed_password',
          name: 'Admin User',
          role,
          permissions: {
            view: true,
            edit: true,
          },
          active: true,
          created_at: Date.now(),
        };
        expect(['super_admin', 'admin', 'support']).toContain(adminUser.role);
      });
    });

    it('should accept permissions object', () => {
      const adminUser: AdminUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        name: 'Admin User',
        role: 'super_admin',
        permissions: {
          view: true,
          edit: true,
          delete: true,
          refund: true,
          manageAdmins: true,
        },
        active: true,
        created_at: Date.now(),
      };
      expect(adminUser.permissions.view).toBe(true);
      expect(adminUser.permissions.manageAdmins).toBe(true);
    });
  });
});

describe('Convex Type Definitions', () => {
  describe('ConvexOrder Interface', () => {
    it('should accept valid order with Convex fields', () => {
      const order: ConvexOrder = {
        _id: 'j97h8k9l0m1n2o3p',
        _creationTime: Date.now(),
        orderNumber: 'ORD-001',
        status: 'pending',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
      };
      expect(order._id).toBeDefined();
      expect(order._creationTime).toBeDefined();
    });

    it('should enforce status union type', () => {
      const validStatuses: Array<ConvexOrder['status']> = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
      validStatuses.forEach(status => {
        const order: ConvexOrder = {
          _id: 'j97h8k9l0m1n2o3p',
          _creationTime: Date.now(),
          orderNumber: 'ORD-001',
          status,
          paymentMethod: 'cash',
          paymentStatus: 'pending',
        };
        expect(['pending', 'preparing', 'ready', 'completed', 'cancelled']).toContain(order.status);
      });
    });

    it('should accept items array with nested objects', () => {
      const order: ConvexOrder = {
        _id: 'j97h8k9l0m1n2o3p',
        _creationTime: Date.now(),
        orderNumber: 'ORD-001',
        status: 'pending',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        items: [
          {
            menuItemId: 'item-1',
            name: 'Butter Chicken',
            price: 299.99,
            quantity: 2,
          },
        ],
      };
      expect(Array.isArray(order.items)).toBe(true);
      expect(order.items?.[0].name).toBe('Butter Chicken');
    });

    it('should accept PostgreSQL sync fields', () => {
      const order: ConvexOrder = {
        _id: 'j97h8k9l0m1n2o3p',
        _creationTime: Date.now(),
        orderNumber: 'ORD-001',
        status: 'pending',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        postgresId: '123e4567-e89b-12d3-a456-426614174000',
        lastSyncedAt: Date.now(),
        syncPending: false,
      };
      expect(order.postgresId).toBeDefined();
      expect(typeof order.syncPending).toBe('boolean');
    });
  });

  describe('ConvexStaffCall Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<ConvexStaffCall['status']> = ['pending', 'acknowledged', 'resolved'];
      validStatuses.forEach(status => {
        const staffCall: ConvexStaffCall = {
          _id: 'j97h8k9l0m1n2o3p',
          _creationTime: Date.now(),
          tableId: 'table-1',
          tableNumber: 5,
          status,
          createdAt: Date.now(),
        };
        expect(['pending', 'acknowledged', 'resolved']).toContain(staffCall.status);
      });
    });
  });

  describe('ConvexZoneRequest Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<ConvexZoneRequest['status']> = ['pending', 'approved', 'denied'];
      validStatuses.forEach(status => {
        const zoneRequest: ConvexZoneRequest = {
          _id: 'j97h8k9l0m1n2o3p',
          _creationTime: Date.now(),
          tableId: 'table-1',
          tableNumber: 5,
          requestedZone: 'VIP',
          status,
          createdAt: Date.now(),
        };
        expect(['pending', 'approved', 'denied']).toContain(zoneRequest.status);
      });
    });
  });

  describe('ConvexNotification Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<ConvexNotification['status']> = ['pending', 'sent', 'failed'];
      validStatuses.forEach(status => {
        const notification: ConvexNotification = {
          _id: 'j97h8k9l0m1n2o3p',
          _creationTime: Date.now(),
          restaurantId: 'bts',
          type: 'trial_expiring',
          title: 'Trial Expiring',
          message: 'Your trial is expiring soon',
          status,
          read: false,
          channels: ['in_app', 'email'],
          createdAt: Date.now(),
        };
        expect(['pending', 'sent', 'failed']).toContain(notification.status);
      });
    });

    it('should accept channels array', () => {
      const notification: ConvexNotification = {
        _id: 'j97h8k9l0m1n2o3p',
        _creationTime: Date.now(),
        restaurantId: 'bts',
        type: 'trial_expiring',
        title: 'Trial Expiring',
        message: 'Your trial is expiring soon',
        status: 'pending',
        read: false,
        channels: ['in_app', 'email', 'sms', 'whatsapp'],
        createdAt: Date.now(),
      };
      expect(Array.isArray(notification.channels)).toBe(true);
      expect(notification.channels).toContain('email');
    });
  });

  describe('ConvexAttendance Interface', () => {
    it('should enforce status union type', () => {
      const validStatuses: Array<ConvexAttendance['status']> = ['present', 'absent', 'half-day', 'leave'];
      validStatuses.forEach(status => {
        const attendance: ConvexAttendance = {
          _id: 'j97h8k9l0m1n2o3p',
          _creationTime: Date.now(),
          restaurantId: 'bts',
          staffId: 'staff-1',
          date: '2024-01-15',
          status,
        };
        expect(['present', 'absent', 'half-day', 'leave']).toContain(attendance.status);
      });
    });

    it('should accept location objects', () => {
      const attendance: ConvexAttendance = {
        _id: 'j97h8k9l0m1n2o3p',
        _creationTime: Date.now(),
        restaurantId: 'bts',
        staffId: 'staff-1',
        date: '2024-01-15',
        status: 'present',
        checkInLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10,
        },
        checkOutLocation: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10,
        },
      };
      expect(attendance.checkInLocation?.latitude).toBe(12.9716);
      expect(attendance.checkOutLocation?.longitude).toBe(77.5946);
    });
  });
});

describe('Utility Types', () => {
  describe('DatabaseResponse', () => {
    it('should accept success response with data', () => {
      const response: DatabaseResponse<Restaurant> = {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          short_id: 'bts',
          name: 'Behind The Scenes',
          active: true,
          created_at: Date.now(),
        },
      };
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should accept error response', () => {
      const response: DatabaseResponse<Restaurant> = {
        success: false,
        error: 'Restaurant not found',
      };
      expect(response.success).toBe(false);
      expect(response.error).toBe('Restaurant not found');
    });
  });

  describe('PaginatedResponse', () => {
    it('should accept paginated response with metadata', () => {
      const response: PaginatedResponse<Restaurant> = {
        success: true,
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            short_id: 'bts',
            name: 'Behind The Scenes',
            active: true,
            created_at: Date.now(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: false,
        },
      };
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.hasMore).toBe(false);
    });
  });

  describe('PaginationParams', () => {
    it('should accept optional pagination parameters', () => {
      const params1: PaginationParams = {};
      const params2: PaginationParams = { page: 1 };
      const params3: PaginationParams = { limit: 20 };
      const params4: PaginationParams = { page: 1, limit: 20 };
      
      expect(params1).toBeDefined();
      expect(params2.page).toBe(1);
      expect(params3.limit).toBe(20);
      expect(params4.page).toBe(1);
      expect(params4.limit).toBe(20);
    });
  });
});

describe('Type Compatibility Tests', () => {
  it('should ensure UUID fields are strings', () => {
    const restaurant: Restaurant = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      short_id: 'bts',
      name: 'Test',
      active: true,
      created_at: Date.now(),
    };
    expect(typeof restaurant.id).toBe('string');
  });

  it('should ensure timestamp fields are numbers', () => {
    const restaurant: Restaurant = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      short_id: 'bts',
      name: 'Test',
      active: true,
      created_at: Date.now(),
    };
    expect(typeof restaurant.created_at).toBe('number');
  });

  it('should ensure boolean fields are booleans', () => {
    const restaurant: Restaurant = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      short_id: 'bts',
      name: 'Test',
      active: true,
      created_at: Date.now(),
    };
    expect(typeof restaurant.active).toBe('boolean');
  });

  it('should ensure numeric fields accept decimal values', () => {
    const menuItem: MenuItem = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Item',
      price: 299.99,
      category: 'Test',
      description: 'Test',
      available: true,
    };
    expect(menuItem.price).toBe(299.99);
    expect(menuItem.price % 1).not.toBe(0); // Has decimal part
  });

  it('should ensure JSONB fields accept complex objects', () => {
    const payment: Payment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      restaurant_id: 'bts',
      amount: 3000,
      currency: 'INR',
      status: 'completed',
      created_at: Date.now(),
      gateway_response: {
        nested: {
          deeply: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
        boolean: true,
      },
    };
    expect(payment.gateway_response).toBeDefined();
    expect(typeof payment.gateway_response).toBe('object');
  });
});
