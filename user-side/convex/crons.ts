import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for timed-out order assignments every 30 seconds
crons.interval(
  "check-assignment-timeouts",
  { seconds: 30 },
  internal.waiterAssignment.checkAssignmentTimeouts
);

// Reset daily waiter counts at midnight
crons.daily(
  "reset-daily-counts",
  { hourUTC: 18, minuteUTC: 30 }, // 12:00 AM IST (UTC+5:30)
  internal.waiterAssignment.resetAllDailyCounts
);

export default crons;
