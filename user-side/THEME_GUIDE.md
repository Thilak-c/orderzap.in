# OrderZap Theme Customization Guide

## Overview
OrderZap now supports dynamic theme customization! You can change colors, shapes, and button styles from the admin panel without touching any code.

## Accessing Theme Settings
1. Log in to the admin panel
2. Navigate to **Theme** in the sidebar
3. Customize colors, shapes, and styles
4. Click **Save Theme** to apply changes

## Theme Options

### Colors
- **Primary Color**: Main brand color (buttons, links, accents)
- **Background Color**: Page background
- **Text Color**: Main text color
- **Border Color**: Border and divider colors

### Shapes
- **Square**: No rounded corners (0px radius)
- **Rounded**: Slightly rounded corners (8px radius)
- **Pill**: Fully rounded corners (999px radius)

### Button Styles
- **Solid**: Filled background with primary color
- **Outline**: Transparent background with colored border
- **Ghost**: Minimal style with no border

## Using Dynamic Components

### Option 1: Use Dynamic Components (Recommended)
```jsx
import { DynamicButton, DynamicCard } from '@/components/DynamicButton';

// Dynamic button that adapts to theme
<DynamicButton variant="primary" onClick={handleClick}>
  Click Me
</DynamicButton>

// Dynamic card that adapts to theme
<DynamicCard>
  <h3>Card Title</h3>
  <p>Card content</p>
</DynamicCard>
```

### Option 2: Use Theme Hook
```jsx
import { useTheme, getShapeClass } from '@/lib/useTheme';

function MyComponent() {
  const theme = useTheme();
  const buttonShape = getShapeClass(theme.buttonShape);
  
  return (
    <button 
      className={`btn-primary ${buttonShape}`}
      style={{ backgroundColor: theme.primaryColor }}
    >
      Custom Button
    </button>
  );
}
```

### Option 3: Use CSS Classes
Add `dynamic-btn` or `dynamic-card` classes to automatically apply theme:

```jsx
<button className="btn-primary dynamic-btn">
  Auto-themed Button
</button>

<div className="card dynamic-card">
  Auto-themed Card
</div>
```

## CSS Variables
The theme system uses CSS variables that update automatically:

```css
--primary: Primary color
--bg: Background color
--text-primary: Text color
--border: Border color
```

Use them in your custom styles:
```jsx
<div style={{ color: 'var(--primary)' }}>
  Themed Text
</div>
```

## Data Attributes
The theme system sets data attributes on the root element:

- `data-button-shape`: square | rounded | pill
- `data-card-shape`: square | rounded | pill
- `data-button-style`: solid | outline | ghost

You can use these in CSS:
```css
[data-button-shape="rounded"] .my-button {
  border-radius: 8px;
}
```

## Examples

### Example 1: Dynamic Menu Item Card
```jsx
import { DynamicCard } from '@/components/DynamicButton';

<DynamicCard className="hover:shadow-lg transition-shadow">
  <img src={item.image} alt={item.name} />
  <h3>{item.name}</h3>
  <p>{item.price}</p>
</DynamicCard>
```

### Example 2: Dynamic Action Button
```jsx
import { DynamicButton } from '@/components/DynamicButton';

<DynamicButton 
  variant="primary" 
  onClick={handleOrder}
  className="w-full"
>
  Place Order
</DynamicButton>
```

### Example 3: Using Theme Colors
```jsx
import { useTheme } from '@/lib/useTheme';

function StatusBadge({ status }) {
  const theme = useTheme();
  
  return (
    <span 
      style={{ 
        backgroundColor: `${theme.primaryColor}20`,
        color: theme.primaryColor,
        borderColor: `${theme.primaryColor}40`
      }}
      className="px-3 py-1 border rounded-lg"
    >
      {status}
    </span>
  );
}
```

## Best Practices

1. **Use Dynamic Components**: Prefer `DynamicButton` and `DynamicCard` for automatic theme adaptation
2. **Use CSS Variables**: Use `var(--primary)` instead of hardcoded colors
3. **Add Dynamic Classes**: Add `dynamic-btn` or `dynamic-card` to existing components
4. **Test All Themes**: Test your UI with different color combinations and shapes
5. **Maintain Contrast**: Ensure text is readable on all background colors

## Admin Panel Theme
The admin panel maintains its original dark theme and is not affected by customer-facing theme changes.

## Troubleshooting

**Theme not applying?**
- Make sure you clicked "Save Theme" in the admin panel
- Check if the component uses CSS variables or dynamic classes
- Clear browser cache and reload

**Colors look wrong?**
- Verify color contrast for accessibility
- Check if custom styles are overriding theme variables
- Use browser DevTools to inspect CSS variables

**Shapes not changing?**
- Ensure components have `dynamic-btn` or `dynamic-card` classes
- Check if inline styles are overriding border-radius
- Verify data attributes are set on root element

## Support
For issues or questions, check the component code or contact the development team.
