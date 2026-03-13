// Simple script to seed admin users
// Run this in your browser console on the admin page to create test admin users

// This would typically be done through a proper seeding process
// For demo purposes, you can manually create admin users in your Convex dashboard

console.log(`
To create admin users for testing:

1. Go to your Convex dashboard
2. Navigate to the 'adminUsers' table
3. Add these test records:

Admin 1 (Super Admin):
{
  "email": "admin@orderzap.com",
  "passwordHash": "demo_hash_123",
  "name": "Super Admin",
  "role": "super_admin",
  "permissions": {
    "view": true,
    "edit": true,
    "delete": true,
    "refund": true,
    "manageAdmins": true
  },
  "active": true,
  "createdAt": ${Date.now()}
}

Admin 2 (Regular Admin):
{
  "email": "manager@orderzap.com",
  "passwordHash": "demo_hash_456",
  "name": "Admin Manager",
  "role": "admin",
  "permissions": {
    "view": true,
    "edit": true,
    "delete": false,
    "refund": true,
    "manageAdmins": false
  },
  "active": true,
  "createdAt": ${Date.now()}
}

Admin 3 (Support):
{
  "email": "support@orderzap.com",
  "passwordHash": "demo_hash_789",
  "name": "Support Agent",
  "role": "support",
  "permissions": {
    "view": true,
    "edit": false,
    "delete": false,
    "refund": false,
    "manageAdmins": false
  },
  "active": true,
  "createdAt": ${Date.now()}
}

Then you can login with any of these emails (password validation is bypassed for demo).
`);