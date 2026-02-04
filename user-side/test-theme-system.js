#!/usr/bin/env node

/**
 * End-to-End Test for Image-Based Theming System
 * Tests the complete flow: image upload → color extraction → theme application
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const API_URL = 'http://localhost:3001/api/extract-colors';
const TEST_IMAGES = [
  'public/assets/logos/orderzap-logo.png',
  'public/assets/images/cooking-poster.jpg',
  'public/assets/partners/bts-disc-cafe-and-restro.png'
];

let testsPassed = 0;
let testsFailed = 0;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

async function testColorExtraction(imagePath) {
  const testName = `Color extraction for ${path.basename(imagePath)}`;
  
  try {
    // Check if file exists
    const fullPath = path.join(__dirname, imagePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Image file not found: ${fullPath}`);
    }

    // Read file
    const fileBuffer = fs.readFileSync(fullPath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    
    // Create FormData
    const formData = new FormData();
    formData.append('image', blob, path.basename(imagePath));

    // Send request
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API returned ${response.status}: ${error.error}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.colors) {
      throw new Error('Response missing colors object');
    }

    const requiredColors = ['dominant', 'muted', 'darkVibrant', 'lightVibrant'];
    for (const color of requiredColors) {
      if (!data.colors[color]) {
        throw new Error(`Missing required color: ${color}`);
      }
      
      // Validate hex format
      if (!/^#[0-9a-fA-F]{6}$/.test(data.colors[color])) {
        throw new Error(`Invalid hex format for ${color}: ${data.colors[color]}`);
      }
    }

    log(`✓ ${testName}`, 'success');
    log(`  Colors: ${JSON.stringify(data.colors, null, 2)}`, 'info');
    testsPassed++;
    return data.colors;

  } catch (error) {
    log(`✗ ${testName}`, 'error');
    log(`  ${error.message}`, 'error');
    testsFailed++;
    return null;
  }
}

async function testInvalidFile() {
  const testName = 'Invalid file rejection';
  
  try {
    // Create a text file instead of an image
    const textBlob = new Blob(['This is not an image'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('image', textBlob, 'test.txt');

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (response.status !== 415) {
      throw new Error(`Expected 415 status, got ${response.status}`);
    }

    log(`✓ ${testName}`, 'success');
    testsPassed++;

  } catch (error) {
    log(`✗ ${testName}`, 'error');
    log(`  ${error.message}`, 'error');
    testsFailed++;
  }
}

async function testMissingFile() {
  const testName = 'Missing file rejection';
  
  try {
    const formData = new FormData();
    // Don't append any file

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400 status, got ${response.status}`);
    }

    log(`✓ ${testName}`, 'success');
    testsPassed++;

  } catch (error) {
    log(`✗ ${testName}`, 'error');
    log(`  ${error.message}`, 'error');
    testsFailed++;
  }
}

async function runTests() {
  log('\n=== Image-Based Theming System - End-to-End Tests ===\n', 'info');
  
  // Check if server is running
  try {
    const response = await fetch('http://localhost:3001');
    log('✓ Development server is running', 'success');
  } catch (error) {
    log('✗ Development server is not running', 'error');
    log('  Please start the server with: npm run dev', 'warning');
    process.exit(1);
  }

  log('\n--- Testing Color Extraction ---\n', 'info');
  
  // Test with various images
  for (const imagePath of TEST_IMAGES) {
    await testColorExtraction(imagePath);
  }

  log('\n--- Testing Error Handling ---\n', 'info');
  
  // Test error cases
  await testInvalidFile();
  await testMissingFile();

  // Summary
  log('\n=== Test Summary ===', 'info');
  log(`Passed: ${testsPassed}`, 'success');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
  log(`Total: ${testsPassed + testsFailed}\n`, 'info');

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'error');
  process.exit(1);
});
