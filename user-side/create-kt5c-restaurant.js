// Create kt5c restaurant
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient("https://energized-oriole-464.convex.cloud");

async function createRestaurant() {
  try {
    console.log("Creating restaurant 'kt5c'...");
    
    const result = await client.mutation("restaurants:create", {
      id: "kt5c",
      name: "Test Restaurant",
    });
    
    console.log("✅ Restaurant created successfully!");
    console.log("Restaurant ID:", result);
    
    // Verify it was created
    const restaurant = await client.query("restaurants:getByShortId", { id: "kt5c" });
    console.log("\nRestaurant details:", restaurant);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

createRestaurant();
