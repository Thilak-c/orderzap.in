// Test if restaurant kt5c exists
const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient("https://energized-oriole-464.convex.cloud");

async function testRestaurant() {
  try {
    console.log("Looking for restaurant 'kt5c'...");
    
    const restaurant = await client.query("restaurants:getByShortId", { id: "kt5c" });
    
    if (restaurant) {
      console.log("✅ Restaurant found:");
      console.log(restaurant);
    } else {
      console.log("❌ Restaurant 'kt5c' not found!");
      console.log("\nLet's see all restaurants:");
      const all = await client.query("restaurants:getAll", {});
      console.log("Available restaurants:", all.map(r => ({ id: r.id, name: r.name })));
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testRestaurant();
