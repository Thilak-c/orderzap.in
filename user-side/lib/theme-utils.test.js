/**
 * Tests for Theme Utility Functions
 * Run with: node lib/theme-utils.test.js
 */

import {
  DEFAULT_THEME,
  getLuminance,
  isLightColor,
  getTextColor,
  calculateContrastRatio,
  mapColorsToTheme,
} from './theme-utils.js';

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

function assertObjectEquals(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr}, but got ${actualStr}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || `Expected true, but got ${value}`);
  }
}

function assertGreaterThanOrEqual(actual, expected, message) {
  if (actual < expected) {
    throw new Error(message || `Expected ${actual} to be >= ${expected}`);
  }
}

// Run tests
console.log('\n=== Testing Theme Utility Functions ===\n');

// Test DEFAULT_THEME
test('DEFAULT_THEME has all required properties', () => {
  assertTrue(DEFAULT_THEME.hasOwnProperty('bg'), 'Should have bg property');
  assertTrue(DEFAULT_THEME.hasOwnProperty('primary'), 'Should have primary property');
  assertTrue(DEFAULT_THEME.hasOwnProperty('secondary'), 'Should have secondary property');
  assertTrue(DEFAULT_THEME.hasOwnProperty('accent'), 'Should have accent property');
  assertTrue(DEFAULT_THEME.hasOwnProperty('text'), 'Should have text property');
});

// Test getLuminance
test('getLuminance returns 1 for white', () => {
  const luminance = getLuminance('#ffffff');
  assertEquals(luminance, 1, 'White should have luminance of 1');
});

test('getLuminance returns 0 for black', () => {
  const luminance = getLuminance('#000000');
  assertEquals(luminance, 0, 'Black should have luminance of 0');
});

test('getLuminance handles colors without # prefix', () => {
  const luminance = getLuminance('ffffff');
  assertEquals(luminance, 1, 'Should handle colors without # prefix');
});

// Test isLightColor
test('isLightColor returns true for white', () => {
  assertTrue(isLightColor('#ffffff'), 'White should be light');
});

test('isLightColor returns false for black', () => {
  assertTrue(!isLightColor('#000000'), 'Black should not be light');
});

// Test getTextColor
test('getTextColor returns dark text for white background', () => {
  const textColor = getTextColor('#ffffff');
  const luminance = getLuminance(textColor);
  assertTrue(luminance < 0.5, 'White background should have dark text (low luminance)');
  const ratio = calculateContrastRatio('#ffffff', textColor);
  assertGreaterThanOrEqual(ratio, 4.5, 'Text color should meet WCAG AA standard');
});

test('getTextColor returns light text for black background', () => {
  const textColor = getTextColor('#000000');
  const luminance = getLuminance(textColor);
  assertTrue(luminance > 0.5, 'Black background should have light text (high luminance)');
  const ratio = calculateContrastRatio('#000000', textColor);
  assertGreaterThanOrEqual(ratio, 4.5, 'Text color should meet WCAG AA standard');
});

// Test calculateContrastRatio
test('calculateContrastRatio returns 21 for black and white', () => {
  const ratio = calculateContrastRatio('#000000', '#ffffff');
  assertEquals(ratio, 21, 'Black and white should have contrast ratio of 21');
});

test('calculateContrastRatio returns 1 for same colors', () => {
  const ratio = calculateContrastRatio('#ffffff', '#ffffff');
  assertEquals(ratio, 1, 'Same colors should have contrast ratio of 1');
});

// Test mapColorsToTheme
test('mapColorsToTheme maps colors correctly', () => {
  const extractedColors = {
    dominant: '#ff0000',
    muted: '#00ff00',
    darkVibrant: '#0000ff',
    lightVibrant: '#ffff00'
  };
  
  const theme = mapColorsToTheme(extractedColors);
  
  assertEquals(theme.bg, '#ff0000', 'bg should be dominant color');
  assertEquals(theme.primary, '#0000ff', 'primary should be darkVibrant color');
  assertEquals(theme.secondary, '#ffff00', 'secondary should be lightVibrant color');
  assertEquals(theme.accent, '#00ff00', 'accent should be muted color');
  assertTrue(theme.text, 'text should be calculated');
  // Verify WCAG compliance
  const ratio = calculateContrastRatio(theme.bg, theme.text);
  assertGreaterThanOrEqual(ratio, 4.5, 'Text should meet WCAG AA standard');
});

test('mapColorsToTheme calculates text color based on bg', () => {
  const lightBgColors = {
    dominant: '#ffffff',
    muted: '#cccccc',
    darkVibrant: '#333333',
    lightVibrant: '#eeeeee'
  };
  
  const theme = mapColorsToTheme(lightBgColors);
  const luminance = getLuminance(theme.text);
  assertTrue(luminance < 0.5, 'Light background should have dark text (low luminance)');
  const ratio = calculateContrastRatio(theme.bg, theme.text);
  assertGreaterThanOrEqual(ratio, 4.5, 'Text should meet WCAG AA standard');
});

test('mapColorsToTheme with dark background', () => {
  const darkBgColors = {
    dominant: '#000000',
    muted: '#333333',
    darkVibrant: '#111111',
    lightVibrant: '#666666'
  };
  
  const theme = mapColorsToTheme(darkBgColors);
  const luminance = getLuminance(theme.text);
  assertTrue(luminance > 0.5, 'Dark background should have light text (high luminance)');
  const ratio = calculateContrastRatio(theme.bg, theme.text);
  assertGreaterThanOrEqual(ratio, 4.5, 'Text should meet WCAG AA standard');
});

// Test WCAG contrast compliance
test('getTextColor ensures WCAG AA compliance (4.5:1) for white background', () => {
  const textColor = getTextColor('#ffffff');
  const ratio = calculateContrastRatio('#ffffff', textColor);
  assertGreaterThanOrEqual(ratio, 4.5, 'Contrast ratio should meet WCAG AA standard');
});

test('getTextColor ensures WCAG AA compliance (4.5:1) for black background', () => {
  const textColor = getTextColor('#000000');
  const ratio = calculateContrastRatio('#000000', textColor);
  assertGreaterThanOrEqual(ratio, 4.5, 'Contrast ratio should meet WCAG AA standard');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}\n`);

process.exit(testsFailed > 0 ? 1 : 0);
