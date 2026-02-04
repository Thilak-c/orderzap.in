# Signup Page - Automatic Theme Generation

## Overview
The signup page now automatically generates a custom color theme when you upload your restaurant logo during registration. This provides an instant, branded experience from the moment you create your restaurant.

## How It Works

### 1. Upload Your Logo
When you upload your restaurant logo during signup:
- The logo is uploaded to Convex storage
- Colors are automatically extracted from the logo
- A custom theme is generated instantly
- The theme is saved with your restaurant

### 2. Automatic Color Extraction
The system extracts 4 key colors from your logo:
- **Dominant** - Main background color
- **Dark Vibrant** - Primary accent color
- **Light Vibrant** - Secondary accent color
- **Muted** - Tertiary accent color

### 3. Instant Preview
As soon as colors are extracted:
- You see a color palette preview
- The theme is applied to the signup page
- Colors are saved to your restaurant profile
- Theme persists when you access your restaurant

## User Experience

### Visual Feedback

**During Upload:**
```
┌─────────────────┐
│   [Logo Image]  │
│                 │
│  Extracting     │
│  colors...      │
│     [spinner]   │
└─────────────────┘
```

**After Extraction:**
```
┌─────────────────────────┐
│   [Logo Image]          │
└─────────────────────────┘

┌─────────────────────────┐
│ 🎨 Theme Generated!     │
│                         │
│ [■] [■] [■] [■]        │
│                         │
│ Your custom theme will  │
│ be applied              │
└─────────────────────────┘
```

### Color Swatches
Four color swatches are displayed showing:
1. Background color
2. Primary color
3. Secondary color
4. Accent color

## Technical Details

### Files Modified
1. **`app/signup/new/page.jsx`**
   - Added color extraction on logo upload
   - Added theme preview UI
   - Saves theme colors to restaurant

2. **`convex/restaurants.ts`**
   - Updated `create` mutation to accept `themeColors`
   - Stores theme with restaurant data

### API Integration
- Uses `/api/extract-colors` endpoint
- Processes image in background
- Non-blocking (signup continues if extraction fails)
- Graceful error handling

### Data Flow
```
User uploads logo
    ↓
Upload to Convex storage
    ↓
Send to color extraction API
    ↓
Extract 4 colors
    ↓
Apply theme preview
    ↓
Save colors with restaurant
    ↓
Theme loads automatically on restaurant pages
```

## Features

### ✅ Automatic
- No extra steps required
- Happens during normal signup flow
- Seamless integration

### ✅ Instant Preview
- See your theme immediately
- Visual confirmation with color swatches
- Applied to signup page in real-time

### ✅ Persistent
- Theme saved to database
- Loads automatically on restaurant pages
- Consistent branding across app

### ✅ Non-Blocking
- Signup continues if extraction fails
- Optional feature (works without logo)
- Graceful error handling

### ✅ Accessible
- Text colors auto-calculated
- WCAG AA compliant
- Readable on all backgrounds

## User Benefits

### For Restaurant Owners
1. **Instant Branding** - Your colors applied immediately
2. **No Configuration** - Automatic theme generation
3. **Professional Look** - Branded from day one
4. **Time Saving** - No manual color selection needed

### For Customers
1. **Consistent Experience** - Brand colors throughout
2. **Professional Appearance** - Polished, branded interface
3. **Better Recognition** - Familiar brand colors

## Error Handling

### If Logo Upload Fails
- User can continue without logo
- Default theme is used
- Can upload logo later in settings

### If Color Extraction Fails
- Logo is still saved
- Default theme is used
- Can regenerate theme later in admin panel

### If Theme Save Fails
- Restaurant is still created
- Theme applied locally
- Can be saved later

## Testing

### Test Scenarios

1. **Upload logo with vibrant colors**
   - Should extract distinct colors
   - Theme should be visually appealing
   - Colors should be readable

2. **Upload logo with muted colors**
   - Should extract appropriate colors
   - Text should remain readable
   - Theme should be subtle

3. **Upload logo with single color**
   - Should extract variations
   - Should generate usable palette
   - Should maintain contrast

4. **Upload without logo**
   - Should use default theme
   - Should allow signup to continue
   - Should work normally

### Manual Testing Steps

1. Go to signup page: `/signup/new`
2. Fill in restaurant name and phone
3. Click logo upload area
4. Select a logo image
5. Wait for "Extracting colors..." message
6. Verify color swatches appear
7. Verify "Theme Generated!" message
8. Complete signup
9. Navigate to restaurant page
10. Verify theme is applied

## Customization

### Change Theme Later
Users can always change their theme later by:
1. Going to Admin → Theme page
2. Uploading a new logo
3. Generating a new theme

### Manual Theme Adjustment
Future enhancement: Allow manual color editing in theme page

## Best Practices

### Logo Selection
- Use your primary brand logo
- High contrast works best
- 3-5 colors ideal
- Square format recommended

### Image Quality
- Minimum 512x512px
- PNG or JPG format
- Under 2MB file size
- Clear, crisp image

### Color Considerations
- Logos with distinct colors work best
- Avoid too many similar colors
- High contrast produces better results
- Brand colors should be prominent

## Troubleshooting

### Colors Don't Look Right
- Try a different logo image
- Use logo with clearer colors
- Ensure logo has good contrast
- Can regenerate in theme page

### Theme Not Saving
- Check internet connection
- Verify Convex is running
- Check browser console for errors
- Try again from theme page

### Theme Not Loading
- Refresh the page
- Clear browser cache
- Check restaurant data in database
- Regenerate theme if needed

## Future Enhancements

### Planned Features
1. **Theme Preview** - See before saving
2. **Color Editing** - Manual adjustments
3. **Multiple Themes** - Save variations
4. **Theme Templates** - Pre-made options
5. **Dark Mode** - Auto-generate dark variant

---

**Enjoy your instant branded experience! 🎨✨**
