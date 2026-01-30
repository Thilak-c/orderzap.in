/* eslint-disable */
/**
 * Generated API types for Convex
 * This references the backend's Convex deployment
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  orders: {
    upsertOrder: FunctionReference<
      "mutation",
      "public",
      {
        postgresId: string;
        restaurantId: string;
        tableId?: string;
        orderNumber: string;
        customerName?: string;
        customerPhone?: string;
        customerSessionId?: string;
        status: string;
        subtotal: number;
        taxAmount: number;
        tipAmount: number;
        discountAmount: number;
        depositUsed: number;
        totalAmount: number;
        paymentMethod?: string;
        paymentStatus: string;
        paymentTransactionId?: string;
        notes?: string;
        specialInstructions?: string;
        estimatedReadyTime?: number;
        completedAt?: number;
        cancelledAt?: number;
        cancellationReason?: string;
        createdAt: number;
        updatedAt: number;
        deletedAt?: number;
      },
      any
    >;
    getOrder: FunctionReference<
      "query",
      "public",
      { postgresId: string },
      any
    >;
    listOrders: FunctionReference<
      "query",
      "public",
      { restaurantId: string; status?: string; limit?: number },
      any
    >;
    deleteOrder: FunctionReference<
      "mutation",
      "public",
      { postgresId: string },
      any
    >;
  };
  orderItems: {
    upsertOrderItem: FunctionReference<"mutation", "public", any, any>;
    listOrderItems: FunctionReference<"query", "public", any, any>;
    deleteOrderItem: FunctionReference<"mutation", "public", any, any>;
  };
}>;

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
