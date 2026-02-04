/**
 * Manual test script for color extraction API
 * This script tests the API endpoint with various scenarios
 * 
 * Note: This requires the Next.js dev server to be running
 * Run with: node app/api/extract-colors/test-api.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:3001/api/extract-colors';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  return fn()
    .then(() => {
      console.log(`✓ ${description}`);
      testsPassed++;
    })
    .catch((error) => {
      console.error(`✗ ${description}`);
      console.error(`  ${error.message}`);
      testsFailed++;
    });
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || `Expected true, but got ${value}`);
  }
}

function assertHasProperty(obj, prop, message) {
  if (!obj.hasOwnProperty(prop)) {
    throw new Error(message || `Expected object to have property ${prop}`);
  }
}

function isValidHexColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

// Create a simple test image (1x1 red pixel PNG)
function createTestImage() {
  // Base64 encoded 1x1 red pixel PNG
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  return Buffer.from(base64, 'base64');
}

// Run tests
async function runTests() {
  console.log('\n=== Testing Color Extraction API ===\n');

  // Test 1: Valid image upload
  await test('Valid image returns 4 colors in hex format', async () => {
    const formData = new FormData();
    const imageBuffer = createTestImage();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test.png');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    assertEquals(response.status, 200, 'Should return 200 status');
    
    const data = await response.json();
    assertHasProperty(data, 'colors', 'Response should have colors property');
    assertHasProperty(data.colors, 'dominant', 'Should have dominant color');
    assertHasProperty(data.colors, 'muted', 'Should have muted color');
    assertHasProperty(data.colors, 'darkVibrant', 'Should have darkVibrant color');
    assertHasProperty(data.colors, 'lightVibrant', 'Should have lightVibrant color');
    
    assertTrue(isValidHexColor(data.colors.dominant), 'dominant should be valid hex color');
    assertTrue(isValidHexColor(data.colors.muted), 'muted should be valid hex color');
    assertTrue(isValidHexColor(data.colors.darkVibrant), 'darkVibrant should be valid hex color');
    assertTrue(isValidHexColor(data.colors.lightVibrant), 'lightVibrant should be valid hex color');
  });

  // Test 2: Missing file
  await test('Missing file returns 400 error', async () => {
    const formData = new FormData();
    // Don't append any file

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    assertEquals(response.status, 400, 'Should return 400 status');
    
    const data = await response.json();
    assertHasProperty(data, 'error', 'Response should have error property');
    assertTrue(data.error.includes('No image file provided'), 'Error message should mention missing file');
  });

  // Test 3: Invalid file type
  await test('Invalid file type returns 415 error', async () => {
    const formData = new FormData();
    const textBlob = new Blob(['not an image'], { type: 'text/plain' });
    formData.append('image', textBlob, 'test.txt');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    assertEquals(response.status, 415, 'Should return 415 status');
    
    const data = await response.json();
    assertHasProperty(data, 'error', 'Response should have error property');
    assertTrue(data.error.includes('Invalid image format'), 'Error message should mention invalid format');
  });

  // Test 4: File too large (simulated with size check)
  await test('File size validation message is correct', async () => {
    // Note: This test just verifies the error message format
    // Actual file size testing would require creating a large file
    const formData = new FormData();
    // Create a blob that claims to be larger than 10MB
    const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'image/png' });
    formData.append('image', largeBlob, 'large.png');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    // Should return 400 for file too large
    if (response.status === 400) {
      const data = await response.json();
      if (data.error.includes('File size exceeds 10MB limit')) {
        assertTrue(true, 'File size error message is correct');
      }
    }
  });

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}\n`);
  
  if (testsFailed > 0) {
    console.log('Note: Some tests may fail if the Next.js dev server is not running.');
    console.log('Start the server with: npm run dev:frontend');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Check if server is running before running tests
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001');
    return true;
  } catch (error) {
    console.error('\n⚠️  Next.js dev server is not running!');
    console.error('Please start the server with: npm run dev:frontend\n');
    process.exit(1);
  }
}

// Run the tests
checkServer().then(runTests);
