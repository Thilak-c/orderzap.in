# Theme Page - Quick Start Guide

## Overview
A beautiful, dedicated theme customization page has been created where you can upload your logo and instantly generate a custom color theme for your restaurant.

## Access the Theme Page

### For Restaurant-Specific Admin
Navigate to: `/r/[restaurantId]/admin/theme`

Example:
- `http://localhost:3001/r/your-restaurant-id/admin/theme`

### For Demo Admin
Navigate to: `/demo/admin/theme`

Example:
- `http://localhost:3001/demo/admin/theme`

## Features

### 🎨 Beautiful UI
- Modern gradient background
- Clean, professional design
- Responsive layout (works on mobile and desktop)
- Smooth animations and transitions

### 📤 Easy Upload
- Drag and drop or click to upload
- Supports JPEG, PNG, WebP, and GIF
- Maximum file size: 10MB
- Live image preview

### 🎯 Instant Results
- Colors extracted in seconds
- Theme applied immediately
- No page refresh needed
- Smooth color transitions

### 🎨 Color Palette Display
Shows all 5 extracted colors:
1. **Background** - Main background color
2. **Primary** - Primary accent color
3. **Secondary** - Secondary accent color
4. **Accent** - Tertiary accent color
5. **Text** - Auto-calculated for readability

### 👁️ Live Preview
- See how your theme looks in real-time
- Sample UI components with new colors
- Accessibility compliance indicator

### ♿ Accessibility
- Automatic text contrast calculation
- WCAG AA compliant (4.5:1 minimum contrast)
- Ensures readability on all backgrounds

### 🔄 Reset Option
- One-click reset to default theme
- Clears uploaded image
- Restores original colors

## How to Use

### Step 1: Navigate to Theme Page
Go to the admin panel and click on "Theme" in the navigation menu.

### Step 2: Upload Your Logo
1. Click the upload area or drag and drop your logo
2. Wait for color extraction (usually 1-3 seconds)
3. See the theme applied instantly!

### Step 3: Review Colors
Check the color palette section to see all extracted colors with their hex codes.

### Step 4: Preview
Look at the live preview to see how your theme looks on actual UI components.

### Step 5: Save (Automatic)
For restaurant-specific pages, the theme is automatically saved to the database. For demo pages, the theme persists during your session.

## Tips for Best Results

### Logo Selection
- Use your primary brand logo
- Square images work best (512x512px or larger)
- High contrast logos produce better color palettes
- Avoid logos with too many colors (3-5 colors is ideal)

### Image Quality
- Use high-resolution images
- PNG format recommended for logos with transparency
- JPEG works great for photos
- Keep file size under 10MB

### Color Extraction
The system extracts:
- **Dominant**: Most prominent color in the image
- **Dark Vibrant**: Rich, saturated dark color
- **Light Vibrant**: Bright, saturated light color
- **Muted**: Soft, desaturated color

### Testing
After uploading:
1. Check text readability
2. Navigate to other pages to see theme applied
3. Test on mobile devices
4. Verify all UI elements look good

## Troubleshooting

### Upload Fails
- **Error: "Invalid image format"**
  - Solution: Use JPEG, PNG, WebP, or GIF only
  
- **Error: "File size exceeds 10MB"**
  - Solution: Compress your image or use a smaller version

- **Error: "Failed to extract colors"**
  - Solution: Try a different image or check your internet connection

### Theme Not Applying
- Refresh the page
- Clear browser cache
- Check browser console for errors

### Colors Look Wrong
- Try a different image with clearer colors
- Use a logo with higher contrast
- Reset and try again

## Technical Details

### Files Created
1. `/app/r/[restaurantId]/admin/theme/page.js` - Restaurant-specific theme page
2. `/app/demo/admin/theme/page.js` - Demo theme page

### API Endpoint
- **URL**: `/api/extract-colors`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Response**: JSON with 4 color hex codes

### Theme Persistence
- Restaurant pages: Saved to Convex database
- Demo pages: Session-only (resets on refresh)
- Theme persists across navigation within session

### Browser Support
- Chrome/Edge (Chromium) ✅
- Firefox ✅
- Safari ✅
- Mobile browsers ✅

## Next Steps

### Add Navigation Link
To make the theme page easily accessible, add a link in your admin navigation:

```jsx
<Link href="/r/[restaurantId]/admin/theme">
  <Palette size={20} />
  Theme
</Link>
```

### Customize Further
You can modify the theme page to:
- Add more color options
- Include theme presets
- Add color picker for manual adjustment
- Export/import theme configurations

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify the development server is running
3. Ensure all dependencies are installed
4. Review the test checklist in `THEME_SYSTEM_TEST_CHECKLIST.md`

---

**Enjoy your new theme customization page! 🎨✨**
