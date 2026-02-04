// /**
//  * Cron Jobs for OrderZap
//  * Handles scheduled tasks like retry failed syncs
//  */

// import { cronJobs } from "convex/server";
// import { internal } from "./_generated/api";

// const crons = cronJobs();

// // Retry failed PostgreSQL syncs every 5 minutes
// crons.interval(
//   "retry-failed-syncs",
//   { minutes: 5 },
//   internal.syncToPostgres.retryFailedSyncs
// );

// export default crons;
