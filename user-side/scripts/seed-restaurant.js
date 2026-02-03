// Script to seed a restaurant in the database
// Run this after deploying the schema changes

const restaurantData = {
  id: "bts", // Short ID (under 4 chars)
  name: "BTS Disc Cafe & Restro",
  brandName: "BTS DISC",
  logo: "/assets/logos/favicon_io/android-chrome-192x192.png",
  description: "Premium dining experience in Patna",
  address: "Patna, Bihar",
  phone: "+91 1234567890",
  email: "contact@btsdisc.com",
  active: true,
};

console.log("Restaurant data to seed:");
console.log(JSON.stringify(restaurantData, null, 2));
console.log("\nTo seed this restaurant:");
console.log("1. Go to your Convex dashboard");
console.log("2. Open the 'restaurants' table");
console.log("3. Click 'Add Document'");
console.log("4. Paste the above JSON");
console.log("5. Add 'createdAt' field with current timestamp");
