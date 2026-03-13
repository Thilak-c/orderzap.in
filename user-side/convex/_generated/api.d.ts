/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminStaff from "../adminStaff.js";
import type * as alerts from "../alerts.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as deductions from "../deductions.js";
import type * as files from "../files.js";
import type * as inventory from "../inventory.js";
import type * as menuItems from "../menuItems.js";
import type * as migrations from "../migrations.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as reports from "../reports.js";
import type * as reservations from "../reservations.js";
import type * as restaurantLocation from "../restaurantLocation.js";
import type * as restaurants from "../restaurants.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as staff from "../staff.js";
import type * as staffCalls from "../staffCalls.js";
import type * as staffManagement from "../staffManagement.js";
import type * as staffNotifications from "../staffNotifications.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tables from "../tables.js";
import type * as waiterAssignment from "../waiterAssignment.js";
import type * as wastage from "../wastage.js";
import type * as zoneRequests from "../zoneRequests.js";
import type * as zones from "../zones.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminStaff: typeof adminStaff;
  alerts: typeof alerts;
  categories: typeof categories;
  crons: typeof crons;
  customers: typeof customers;
  deductions: typeof deductions;
  files: typeof files;
  inventory: typeof inventory;
  menuItems: typeof menuItems;
  migrations: typeof migrations;
  orders: typeof orders;
  payments: typeof payments;
  reports: typeof reports;
  reservations: typeof reservations;
  restaurantLocation: typeof restaurantLocation;
  restaurants: typeof restaurants;
  reviews: typeof reviews;
  seed: typeof seed;
  settings: typeof settings;
  staff: typeof staff;
  staffCalls: typeof staffCalls;
  staffManagement: typeof staffManagement;
  staffNotifications: typeof staffNotifications;
  subscriptions: typeof subscriptions;
  tables: typeof tables;
  waiterAssignment: typeof waiterAssignment;
  wastage: typeof wastage;
  zoneRequests: typeof zoneRequests;
  zones: typeof zones;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
