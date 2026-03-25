import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Calculate distance between two coordinates using Haversine formula
// Returns distance in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Create new staff member
export const createStaff = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    role: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    password: v.string(), // Should be hashed on client
    assignedTables: v.array(v.number()),
    salary: v.optional(v.number()),
    salaryType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffId = await ctx.db.insert("staff", {
      restaurantId: args.restaurantId,
      name: args.name,
      role: args.role,
      phone: args.phone,
      email: args.email,
      password: args.password,
      assignedTables: args.assignedTables,
      active: true,
      isOnline: false,
      ordersServedToday: 0,
      totalOrdersServed: 0,
      salary: args.salary,
      salaryType: args.salaryType || "monthly",
      joiningDate: Date.now(),
    });

    return staffId;
  },
});

// Staff login
export const staffLogin = mutation({
  args: {
    phone: v.string(),
    password: v.string(),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        accuracy: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Find staff by phone
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!staff) {
      throw new Error("Staff not found");
    }

    // Verify password (in production, use proper hashing)
    if (staff.password !== args.password) {
      throw new Error("Invalid password");
    }

    if (!staff.active) {
      throw new Error("Account is inactive");
    }

    // Update online status
    await ctx.db.patch(staff._id, {
      isOnline: true,
      lastSeen: Date.now(),
    });

    // Create attendance record for today
    const today = new Date().toISOString().split("T")[0];
    const existingAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", staff._id).eq("date", today)
      )
      .first();

    if (!existingAttendance && staff.restaurantId) {
      await ctx.db.insert("attendance", {
        restaurantId: staff.restaurantId,
        staffId: staff._id,
        date: today,
        checkIn: Date.now(),
        checkInLocation: args.location,
        status: "present",
      });
    }

    return {
      success: true,
      staff: {
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        restaurantId: staff.restaurantId,
      },
    };
  },
});

// Staff logout
export const staffLogout = mutation({
  args: {
    staffId: v.id("staff"),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        accuracy: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff not found");

    // Update online status
    await ctx.db.patch(args.staffId, {
      isOnline: false,
      lastSeen: Date.now(),
    });

    // Update attendance checkout
    const today = new Date().toISOString().split("T")[0];
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", today)
      )
      .first();

    if (attendance && !attendance.checkOut) {
      const checkOut = Date.now();
      const workHours = attendance.checkIn
        ? (checkOut - attendance.checkIn) / (1000 * 60 * 60)
        : 0;

      await ctx.db.patch(attendance._id, {
        checkOut,
        checkOutLocation: args.location,
        workHours,
      });
    }

    return { success: true };
  },
});

// Get staff profile
export const getStaffProfile = query({
  args: { staffId: v.id("staff") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.staffId);
  },
});

// Update staff profile
export const updateStaffProfile = mutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { staffId, ...updates } = args;
    await ctx.db.patch(staffId, updates);
    return { success: true };
  },
});

// List all staff for restaurant
export const listStaff = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Get attendance for staff
export const getAttendance = query({
  args: {
    staffId: v.id("staff"),
    month: v.optional(v.string()), // YYYY-MM
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("attendance")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId));

    const records = await query.collect();

    if (args.month) {
      return records.filter((r) => r.date.startsWith(args.month));
    }

    return records;
  },
});

// Manual check-in (for corrections)
export const manualCheckIn = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    staffId: v.id("staff"),
    date: v.string(),
    checkIn: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        checkIn: args.checkIn,
        notes: args.notes,
      });
    } else {
      await ctx.db.insert("attendance", {
        restaurantId: args.restaurantId,
        staffId: args.staffId,
        date: args.date,
        checkIn: args.checkIn,
        status: "present",
        notes: args.notes,
      });
    }

    return { success: true };
  },
});

// Create payroll
export const createPayroll = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    staffId: v.id("staff"),
    month: v.string(),
    baseSalary: v.number(),
    bonus: v.optional(v.number()),
    deductions: v.optional(v.number()),
    daysWorked: v.number(),
    totalDays: v.number(),
  },
  handler: async (ctx, args) => {
    const totalAmount =
      args.baseSalary + (args.bonus || 0) - (args.deductions || 0);

    const payrollId = await ctx.db.insert("payroll", {
      restaurantId: args.restaurantId,
      staffId: args.staffId,
      month: args.month,
      baseSalary: args.baseSalary,
      bonus: args.bonus,
      deductions: args.deductions,
      totalAmount,
      daysWorked: args.daysWorked,
      totalDays: args.totalDays,
      status: "pending",
      createdAt: Date.now(),
    });

    return payrollId;
  },
});

// Mark payroll as paid
export const markPayrollPaid = mutation({
  args: {
    payrollId: v.id("payroll"),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.payrollId, {
      status: "paid",
      paidOn: Date.now(),
      paymentMethod: args.paymentMethod,
      notes: args.notes,
    });

    return { success: true };
  },
});

// Get payroll records
export const getPayroll = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
    staffId: v.optional(v.id("staff")),
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.staffId) {
      const records = await ctx.db
        .query("payroll")
        .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
        .collect();

      if (args.month) {
        return records.filter((r) => r.month === args.month);
      }
      return records;
    }

    if (args.restaurantId) {
      return await ctx.db
        .query("payroll")
        .withIndex("by_restaurant", (q) =>
          q.eq("restaurantId", args.restaurantId)
        )
        .collect();
    }

    return [];
  },
});

// Get attendance summary for month
export const getAttendanceSummary = query({
  args: {
    staffId: v.id("staff"),
    month: v.string(), // YYYY-MM
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("attendance")
      .withIndex("by_staff", (q) => q.eq("staffId", args.staffId))
      .collect();

    const monthRecords = records.filter((r) => r.date.startsWith(args.month));

    const present = monthRecords.filter((r) => r.status === "present").length;
    const absent = monthRecords.filter((r) => r.status === "absent").length;
    const halfDay = monthRecords.filter((r) => r.status === "half-day").length;
    const leave = monthRecords.filter((r) => r.status === "leave").length;

    const totalHours = monthRecords.reduce(
      (sum, r) => sum + (r.workHours || 0),
      0
    );

    return {
      present,
      absent,
      halfDay,
      leave,
      totalHours: Math.round(totalHours * 10) / 10,
      totalDays: monthRecords.length,
    };
  },
});


// Update staff location
export const updateStaffLocation = mutation({
  args: {
    staffId: v.id("staff"),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      accuracy: v.optional(v.number()),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { staffId, location } = args;

    // Get staff member
    const staff = await ctx.db.get(staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Get restaurant to check location
    const restaurant = await ctx.db.get(staff.restaurantId!);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Calculate if staff is within 100m of restaurant
    let isInRestaurant = false;
    
    if (restaurant.location) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        restaurant.location.latitude,
        restaurant.location.longitude
      );
      
      // Within 100 meters
      isInRestaurant = distance <= 100;
    } else {
      // If restaurant has no location set, assume they're in restaurant
      // (for backward compatibility)
      isInRestaurant = true;
    }

    // Update staff location
    await ctx.db.patch(staffId, {
      currentLocation: location,
      isInRestaurant: isInRestaurant,
      lastSeen: Date.now(),
    });

    return { success: true, isInRestaurant, distance: restaurant.location ? calculateDistance(
      location.latitude,
      location.longitude,
      restaurant.location.latitude,
      restaurant.location.longitude
    ) : null };
  },
});

// Toggle waiter online/offline status
export const toggleWaiterOnlineStatus = mutation({
  args: {
    staffId: v.id("staff"),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      accuracy: v.optional(v.number()),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { staffId, location } = args;

    const staff = await ctx.db.get(staffId);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // Get restaurant to check location
    const restaurant = await ctx.db.get(staff.restaurantId!);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    // Check if staff is in restaurant (within 100m)
    let isInRestaurant = false;
    let distance = null;
    
    if (restaurant.location) {
      distance = calculateDistance(
        location.latitude,
        location.longitude,
        restaurant.location.latitude,
        restaurant.location.longitude
      );
      
      isInRestaurant = distance <= 100;
    } else {
      // If restaurant has no location set, assume they're in restaurant
      isInRestaurant = true;
    }

    // Can't go online if not in restaurant
    if (!isInRestaurant && !staff.isOnline) {
      throw new Error(`You must be within 100m of the restaurant to go online. Current distance: ${Math.round(distance || 0)}m`);
    }

    const newOnlineStatus = !staff.isOnline;

    // Update staff status
    await ctx.db.patch(staffId, {
      isOnline: newOnlineStatus,
      currentLocation: location,
      isInRestaurant: isInRestaurant,
      lastSeen: Date.now(),
    });

    // If going online, mark attendance for today
    if (newOnlineStatus) {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if attendance already exists for today
      const existingAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_staff_date", (q) => 
          q.eq("staffId", staffId).eq("date", today)
        )
        .first();

      if (!existingAttendance) {
        // Create new attendance record
        await ctx.db.insert("attendance", {
          restaurantId: staff.restaurantId!,
          staffId: staffId,
          date: today,
          checkIn: Date.now(),
          checkInLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
          status: "present",
        });
      }
    }

    return { 
      success: true, 
      isOnline: newOnlineStatus,
      isInRestaurant: isInRestaurant,
      distance: distance,
    };
  },
});

// Get waiter's pending orders (assigned but not accepted)
export const getWaiterPendingOrders = query({
  args: {
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { waiterId } = args;

    // Get orders assigned to this waiter that are pending acceptance
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_assigned_waiter", (q) => q.eq("assignedWaiterId", waiterId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "ready"),
          q.eq(q.field("assignmentStatus"), "pending")
        )
      )
      .collect();

    return orders;
  },
});

// Get waiter's active orders (accepted)
export const getWaiterActiveOrders = query({
  args: {
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { waiterId } = args;

    // Get orders assigned to this waiter that are accepted
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_assigned_waiter", (q) => q.eq("assignedWaiterId", waiterId))
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("status"), "ready"),
            q.eq(q.field("status"), "preparing")
          ),
          q.eq(q.field("assignmentStatus"), "accepted")
        )
      )
      .collect();

    return orders;
  },
});

// Accept order assignment
export const acceptOrderAssignment = mutation({
  args: {
    orderId: v.id("orders"),
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { orderId, waiterId } = args;

    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.assignedWaiterId !== waiterId) {
      throw new Error("This order is not assigned to you");
    }

    // Check if timeout has passed
    if (order.assignmentTimeoutAt && Date.now() > order.assignmentTimeoutAt) {
      throw new Error("Assignment timeout has passed");
    }

    // Update order status
    await ctx.db.patch(orderId, {
      assignmentStatus: "accepted",
      assignmentAcceptedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reject order assignment
export const rejectOrderAssignment = mutation({
  args: {
    orderId: v.id("orders"),
    waiterId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const { orderId, waiterId } = args;

    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.assignedWaiterId !== waiterId) {
      throw new Error("This order is not assigned to you");
    }

    // Update order status and clear assignment
    await ctx.db.patch(orderId, {
      assignmentStatus: "rejected",
      assignedWaiterId: undefined,
      assignedAt: undefined,
      assignmentTimeoutAt: undefined,
    });

    // Try to assign to another waiter
    // This will be handled by the auto-assignment system

    return { success: true };
  },
});
