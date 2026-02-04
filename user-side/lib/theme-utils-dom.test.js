/**
 * DOM-based tests for Theme Utility Functions
 * Tests the applyTheme function which requires a DOM environment
 * Run with: node lib/theme-utils-dom.test.js
 */

// Create a mock document object for testing
const mockStyles = {};
global.document = {
  documentElement: {
    style: {
      setProperty: (key, value) => {
        mockStyles[key] = value;
      },
      getPropertyValue: (key) => {
        return mockStyles[key] || '';
      }
    }
  }
};

// Now import the theme utilities (after mock DOM is set up)
import { applyTheme, mapColorsToTheme } from './theme-utils.js';

// Simple test runner
let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  ${error.message}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

// Run tests
console.log('\n=== Testing applyTheme Function ===\n');

test('applyTheme sets CSS custom properties on document root', () => {
  const themeColors = {
    bg: '#ffffff',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    text: '#1a1a1a'
  };
  
  applyTheme(themeColors);
  
  const root = document.documentElement;
  assertEquals(root.style.getPropertyValue('--bg'), '#ffffff', 'Should set --bg');
  assertEquals(root.style.getPropertyValue('--primary'), '#3b82f6', 'Should set --primary');
  assertEquals(root.style.getPropertyValue('--secondary'), '#8b5cf6', 'Should set --secondary');
  assertEquals(root.style.getPropertyValue('--accent'), '#ec4899', 'Should set --accent');
  assertEquals(root.style.getPropertyValue('--text'), '#1a1a1a', 'Should set --text');
});

test('applyTheme updates existing CSS custom properties', () => {
  const firstTheme = {
    bg: '#000000',
    primary: '#ff0000',
    secondary: '#00ff00',
    accent: '#0000ff',
    text: '#ffffff'
  };
  
  applyTheme(firstTheme);
  
  const secondTheme = {
    bg: '#ffffff',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    text: '#1a1a1a'
  };
  
  applyTheme(secondTheme);
  
  const root = document.documentElement;
  assertEquals(root.style.getPropertyValue('--bg'), '#ffffff', 'Should update --bg');
  assertEquals(root.style.getPropertyValue('--primary'), '#3b82f6', 'Should update --primary');
});

test('applyTheme works with mapColorsToTheme output', () => {
  const extractedColors = {
    dominant: '#ff5733',
    muted: '#33ff57',
    darkVibrant: '#3357ff',
    lightVibrant: '#ff33f5'
  };
  
  const theme = mapColorsToTheme(extractedColors);
  applyTheme(theme);
  
  const root = document.documentElement;
  assertEquals(root.style.getPropertyValue('--bg'), '#ff5733', 'Should set bg from dominant');
  assertEquals(root.style.getPropertyValue('--primary'), '#3357ff', 'Should set primary from darkVibrant');
  assertEquals(root.style.getPropertyValue('--secondary'), '#ff33f5', 'Should set secondary from lightVibrant');
  assertEquals(root.style.getPropertyValue('--accent'), '#33ff57', 'Should set accent from muted');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}\n`);

process.exit(testsFailed > 0 ? 1 : 0);
