# Image-Based Theming System - Manual Test Checklist

## Test Environment Setup

- [ ] Development server is running (`npm run dev`)
- [ ] Browser console is open (F12)
- [ ] Network tab is visible for monitoring API calls

## 1. Basic Functionality Tests

### Color Extraction API
- [ ] Navigate to a restaurant page (e.g., `/demo/admin/settings`)
- [ ] Open browser console and test API directly:
```javascript
const formData = new FormData();
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.onchange = async (e) => {
  formData.append('image', e.target.files[0]);
  const response = await fetch('/api/extract-colors', {
    method: 'POST',
    body: formData
  });
  console.log(await response.json());
};
input.click();
```
- [ ] Verify response contains 4 colors: dominant, muted, darkVibrant, lightVibrant
- [ ] Verify all colors are in hex format (#RRGGBB)

### Theme Application
- [ ] Upload an image with bright colors (e.g., logo with red/blue)
- [ ] Verify background color changes immediately
- [ ] Verify text color adjusts for readability
- [ ] Check that transitions are smooth (0.3s ease)
- [ ] Verify no flash of unstyled content

## 2. Image Type Tests

Test with various image types to ensure broad compatibility:

### Photo Images
- [ ] Upload a food photo (e.g., `/public/assets/images/cooking-poster.jpg`)
- [ ] Verify colors are extracted correctly
- [ ] Check theme looks visually appealing

### Logo Images
- [ ] Upload a logo (e.g., `/public/assets/logos/orderzap-logo.png`)
- [ ] Verify vibrant colors are extracted
- [ ] Check contrast is maintained

### Illustration Images
- [ ] Upload an illustration/icon
- [ ] Verify colors are extracted
- [ ] Check theme application

### Different Formats
- [ ] Test JPEG image
- [ ] Test PNG image
- [ ] Test WebP image (if available)
- [ ] Test GIF image (if available)

## 3. Text Readability Tests

### Light Backgrounds
- [ ] Upload image with predominantly light colors (white, cream, light blue)
- [ ] Verify text color is dark (#000000 or similar)
- [ ] Check contrast ratio is ≥ 4.5:1 (use browser DevTools Accessibility)
- [ ] Read sample text to ensure it's comfortable

### Dark Backgrounds
- [ ] Upload image with predominantly dark colors (black, navy, dark red)
- [ ] Verify text color is light (#ffffff or similar)
- [ ] Check contrast ratio is ≥ 4.5:1
- [ ] Read sample text to ensure it's comfortable

### Mid-tone Backgrounds
- [ ] Upload image with mid-tone colors (gray, muted colors)
- [ ] Verify appropriate text color is chosen
- [ ] Check readability

## 4. Error Handling Tests

### Invalid File Type
- [ ] Try to upload a text file (.txt)
- [ ] Verify error message: "Invalid image format..."
- [ ] Verify HTTP status 415 in Network tab

### Missing File
- [ ] Submit form without selecting a file
- [ ] Verify error message: "No image file provided"
- [ ] Verify HTTP status 400 in Network tab

### Large File
- [ ] Try to upload a file > 10MB (if available)
- [ ] Verify error message: "File size exceeds 10MB limit"
- [ ] Verify HTTP status 400 in Network tab

### Corrupted File
- [ ] Try to upload a corrupted/invalid image file
- [ ] Verify graceful error handling
- [ ] Verify error message is displayed to user

## 5. State Management Tests

### Loading State
- [ ] Upload an image
- [ ] Verify loading indicator appears immediately
- [ ] Verify loading indicator disappears after extraction
- [ ] Check that upload button is disabled during loading

### Error State
- [ ] Trigger an error (invalid file)
- [ ] Verify error message is displayed
- [ ] Verify error message is user-friendly
- [ ] Upload a valid file after error
- [ ] Verify error message clears

### Success State
- [ ] Upload a valid image
- [ ] Verify color preview appears
- [ ] Verify 4 color swatches are shown
- [ ] Verify swatch labels are correct (Background, Primary, Secondary, Accent)

## 6. Navigation Persistence Tests

### Client-Side Navigation
- [ ] Upload an image and apply theme
- [ ] Navigate to another page using Next.js Link
- [ ] Verify theme persists on new page
- [ ] Navigate back
- [ ] Verify theme still applied

### Browser Back/Forward
- [ ] Apply a theme
- [ ] Navigate to another page
- [ ] Use browser back button
- [ ] Verify theme is maintained
- [ ] Use browser forward button
- [ ] Verify theme is maintained

### Page Refresh
- [ ] Apply a theme
- [ ] Refresh the page (F5)
- [ ] Note: Theme will reset (expected behavior - no localStorage persistence yet)

## 7. Restaurant Context Integration

### Restaurant-Specific Themes
- [ ] Navigate to restaurant 1
- [ ] Upload and apply theme A
- [ ] Navigate to restaurant 2
- [ ] Upload and apply theme B
- [ ] Navigate back to restaurant 1
- [ ] Verify theme A is loaded (if saved to database)

### Default Theme Fallback
- [ ] Navigate to a restaurant without a custom theme
- [ ] Verify default theme is applied
- [ ] Check CSS variables have default values

## 8. Performance Tests

### Upload Speed
- [ ] Upload a small image (< 100KB)
- [ ] Measure time from upload to theme application
- [ ] Should be < 1 second

### Large Image Processing
- [ ] Upload a large image (5-10MB)
- [ ] Verify processing completes within 3 seconds
- [ ] Check for any UI freezing or lag

### Multiple Uploads
- [ ] Upload 5 different images in succession
- [ ] Verify each upload completes successfully
- [ ] Check for memory leaks (use browser DevTools Memory profiler)

## 9. CSS Transitions Tests

### Smooth Color Changes
- [ ] Upload image with light colors
- [ ] Immediately upload image with dark colors
- [ ] Verify smooth transition (no jarring color jumps)
- [ ] Check transition duration is ~0.3s

### Component Updates
- [ ] Apply a theme
- [ ] Verify all components update simultaneously
- [ ] Check buttons, cards, inputs all reflect new theme
- [ ] Verify no components are missed

## 10. Console Error Check

### No JavaScript Errors
- [ ] Open browser console
- [ ] Perform all above tests
- [ ] Verify no errors in console
- [ ] Verify no warnings (except expected Next.js warnings)

### Network Errors
- [ ] Check Network tab
- [ ] Verify all API calls succeed (200 status)
- [ ] Verify no failed requests
- [ ] Check request/response payloads are correct

## 11. Accessibility Tests

### Keyboard Navigation
- [ ] Tab to file input
- [ ] Press Enter/Space to open file picker
- [ ] Select file using keyboard
- [ ] Verify upload works

### Screen Reader
- [ ] Enable screen reader (if available)
- [ ] Navigate to upload component
- [ ] Verify labels are announced
- [ ] Verify error messages are announced

### Color Contrast
- [ ] Use browser DevTools Accessibility panel
- [ ] Check contrast ratios for all text
- [ ] Verify WCAG AA compliance (4.5:1 minimum)

## 12. Cross-Browser Tests

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Mobile browsers (Chrome Mobile, Safari Mobile)

## 13. Responsive Design Tests

### Mobile Devices
- [ ] Test on mobile viewport (DevTools responsive mode)
- [ ] Verify upload component is usable
- [ ] Check color swatches display correctly
- [ ] Verify theme applies on mobile

### Tablet Devices
- [ ] Test on tablet viewport
- [ ] Verify layout is appropriate
- [ ] Check all functionality works

## Test Results Summary

**Date:** ___________
**Tester:** ___________
**Environment:** ___________

**Total Tests:** ___________
**Passed:** ___________
**Failed:** ___________
**Blocked:** ___________

**Critical Issues Found:**
1. 
2. 
3. 

**Minor Issues Found:**
1. 
2. 
3. 

**Notes:**


**Sign-off:** ___________
