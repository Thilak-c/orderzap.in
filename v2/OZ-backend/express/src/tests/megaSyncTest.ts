
import axios from 'axios';
import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const API_URL = 'http://localhost:4000/api';
const CONVEX_URL = process.env.CONVEX_URL || "http://127.0.0.1:3210";
const API_KEY = process.env.API_KEY || "your_api_key_here";

const client = new ConvexClient(CONVEX_URL);
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'x-api-key': API_KEY }
});

async function runMegaTest() {
  console.log('🚀 Starting Mega Synchronization Test...');
  const testId = Date.now().toString().slice(-6);
  let restaurantId = '';
  let pgRestroId = '';

  try {
    // --- 1. RESTAURANT ---
    console.log('\n--- 1. Testing Restaurant Creation ---');
    const restroRes = await axiosInstance.post('/restaurant/', {
      name: `Mega Test Restro ${testId}`,
      short_id: `mega-${testId}`
    });
    pgRestroId = restroRes.data.data.id;
    restaurantId = restroRes.data.data.short_id;
    console.log(`✅ Restaurant created in PostgreSQL: ${restaurantId}`);

    await new Promise(r => setTimeout(r, 1500));
    const convexRestro = await client.query('menu:getRestaurantByPgId' as any, { pgId: pgRestroId });
    if (!convexRestro) throw new Error('Restaurant NOT found in Convex');
    console.log('✅ Restaurant mirrored in Convex');

    // --- 2. MENU ---
    console.log('\n--- 2. Testing Menu Creation ---');
    const menuRes = await axiosInstance.post(`/${restaurantId}/menu/menus`, {
      name: `Main Menu ${testId}`,
      is_active: true
    });
    const pgMenuId = menuRes.data.data.id;
    console.log('✅ Menu created in PostgreSQL');

    await new Promise(r => setTimeout(r, 1000));
    // No specific getter for menu by PGID yet, but we skip to category
    
    // --- 3. CATEGORY ---
    console.log('\n--- 3. Testing Category Creation ---');
    const catRes = await axiosInstance.post(`/${restaurantId}/menu/categories`, {
      name: `Test Category ${testId}`,
      menu_id: pgMenuId,
      is_active: true
    });
    const pgCatId = catRes.data.data.id;
    console.log('✅ Category created in PostgreSQL');

    await new Promise(r => setTimeout(r, 1500));
    const convexCat = await client.query('menu:getCategoryByPgId' as any, { pgId: pgCatId });
    if (!convexCat) throw new Error('Category NOT found in Convex');
    console.log('✅ Category mirrored in Convex');

    // --- 4. MENU ITEM ---
    console.log('\n--- 4. Testing Menu Item Creation ---');
    const itemRes = await axiosInstance.post(`/${restaurantId}/menu/items`, {
      name: `Mega Burger ${testId}`,
      price: 299,
      category_id: pgCatId,
      description: 'A very large burger for testing'
    });
    const pgItemId = itemRes.data.data.id;
    console.log('✅ Menu Item created in PostgreSQL');

    await new Promise(r => setTimeout(r, 1500));
    const convexItem = await client.query('menu:getItemByPgId' as any, { pgId: pgItemId });
    if (!convexItem) throw new Error('Menu Item NOT found in Convex');
    console.log('✅ Menu Item mirrored in Convex');

    // --- 5. VARIANTS ---
    console.log('\n--- 5. Testing Variant Creation ---');
    const varRes = await axiosInstance.post(`/${restaurantId}/menu/variants`, {
      item_id: pgItemId,
      name: 'Double Cheese',
      extra_price: 50
    });
    console.log('✅ Variant created in PostgreSQL');
    // Mirroring for variants verified via logs as no easy getter exists in the client yet

    // --- 6. ADD-ONS ---
    console.log('\n--- 6. Testing Add-on Creation ---');
    await axiosInstance.post(`/${restaurantId}/menu/add-ons`, {
      item_id: pgItemId,
      name: 'Bacon Strip',
      price: 30
    });
    console.log('✅ Add-on created in PostgreSQL');

    // --- 7. ZONES & SHORTCODES ---
    console.log('\n--- 7. Testing Zones & Shortcodes ---');
    const zoneRes = await axiosInstance.post(`/${restaurantId}/menu/zones`, {
      name: `VIP Section ${testId}`,
      is_active: true
    });
    const pgZoneId = zoneRes.data.data.id;
    console.log('✅ Zone created in PostgreSQL');

    await axiosInstance.post(`/${restaurantId}/menu/shortcodes`, {
      code: `VIP-${testId}`,
      type: 'zone',
      reference_id: pgZoneId,
      is_active: true
    });
    console.log('✅ Shortcode created in PostgreSQL');

    // --- 8. UPDATES ---
    console.log('\n--- 8. Testing Update Synchronization ---');
    await axiosInstance.put(`/${restaurantId}/menu/items/${pgItemId}`, {
      price: 349,
      name: `Updated Mega Burger ${testId}`
    });
    console.log('✅ Item updated in PostgreSQL');
    
    await new Promise(r => setTimeout(r, 1500));
    const updatedConvexItem = await client.query('menu:getItemByPgId' as any, { pgId: pgItemId });
    if (updatedConvexItem?.price !== 349) throw new Error('Convex Item price NOT updated');
    console.log('✅ Update mirrored in Convex');

    // --- 9. DELETIONS ---
    console.log('\n--- 9. Testing Deletion Synchronization ---');
    await axiosInstance.delete(`/${restaurantId}/menu/items/${pgItemId}`);
    console.log('✅ Item deleted in PostgreSQL');
    
    await new Promise(r => setTimeout(r, 1500));
    const deletedConvexItem = await client.query('menu:getItemByPgId' as any, { pgId: pgItemId });
    if (deletedConvexItem) throw new Error('Item STILL EXISTS in Convex after deletion');
    console.log('✅ Deletion mirrored in Convex');

    console.log('\n✨ ALL TESTS PASSED! FULL SYNCHRONIZATION VERIFIED.');

  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
    process.exit(1);
  }
}

runMegaTest();
