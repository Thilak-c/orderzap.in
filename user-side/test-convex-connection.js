// Quick test to check if Convex is working
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://energized-oriole-464.convex.cloud");

async function testConnection() {
  try {
    console.log("Testing Convex connection...");
    console.log("URL:", process.env.NEXT_PUBLIC_CONVEX_URL || "https://energized-oriole-464.convex.cloud");
    
    // Try to query restaurants
    const restaurants = await client.query("restaurants:getAll", {});
    console.log("✅ Convex is working!");
    console.log("Restaurants found:", restaurants?.length || 0);
    if (restaurants && restaurants.length > 0) {
      console.log("First restaurant:", restaurants[0]);
    }
  } catch (error) {
    console.error("❌ Convex connection failed:");
    console.error(error.message);
    console.error(error);
  }
}

testConnection();
