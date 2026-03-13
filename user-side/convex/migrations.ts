import { mutation } from "./_generated/server";

// Utility to convert a short-id string into a Convex document id if possible.
async function resolveRestaurantId(ctx, shortId) {
  if (!shortId || typeof shortId !== "string") return null;
  const restaurant = await ctx.db
    .query("restaurants")
    .withIndex("by_shortid", (q) => q.eq("id", shortId))
    .first();
  return restaurant ? restaurant._id : null;
}

// Migration to fix every table that has a string restaurantId
export const fixRestaurantIds = mutation({
  args: {},
  handler: async (ctx) => {
    const tablesToFix = [
      "tables",
      "subscriptions",
      "payments",
      "notifications",
      "reservations",
      "staff",
      "order…" // add others if needed
    ];
    const results = {};
    for (const tbl of tablesToFix) {
      const query = ctx.db.query(tbl);
      const allDocs = await query.collect();
      let fixed = 0;
      for (const doc of allDocs) {
        const rid = doc.restaurantId;
        if (rid && typeof rid === "string") {
          const resolved = await resolveRestaurantId(ctx, rid);
          if (resolved) {
            await ctx.db.patch(doc._id, { restaurantId: resolved });
            fixed++;
          }
        }
      }
      results[tbl] = fixed;
    }
    return results;
  },
});
