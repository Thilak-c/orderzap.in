/**
 * Cron Jobs for OrderZap
 * Handles scheduled tasks like retry failed syncs, trial expiration, and auto open/close
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for expired trials every hour
crons.interval(
  "check-expired-trials",
  { hours: 1 }, // Run every hour
  internal.restaurants.checkExpiredTrials
);

// Auto update restaurant open/close status based on business hours every 5 minutes
crons.interval(
  "auto-update-open-status",
  { minutes: 5 }, // Run every 5 minutes
  internal.restaurants.autoUpdateOpenStatus
);

// Retry failed PostgreSQL syncs every 5 minutes
// crons.interval(
//   "retry-failed-syncs",
//   { minutes: 5 },
//   internal.syncToPostgres.retryFailedSyncs
// );

export default crons;
