# Fire Guardian Color System - "The Clean Control"

## 🎨 Primary Palette

### Primary Background
- **Color**: `#F5F7FA` 
- **Usage**: Main background for pages and layouts
- **Tailwind**: `bg-primary-bg`
- **CSS Variable**: `var(--primary-bg)`

### Primary Text  
- **Color**: `#333333`
- **Usage**: Headings, body text, primary UI elements
- **Tailwind**: `text-primary-text`
- **CSS Variable**: `var(--primary-text)`

### Primary Accent (Fire Orange)
- **Color**: `#E65100`
- **Usage**: Call-to-action buttons, primary branding, important links
- **Tailwind**: `bg-fire-600`, `text-fire-600`
- **CSS Variable**: `var(--primary-accent)`
- **Hover**: `#D84315` (`bg-fire-700`)

## 🚨 Status Colors

### Danger/Warning
- **Color**: `#E53935`
- **Usage**: Error states, deletion actions, warnings
- **Tailwind**: `bg-danger`, `text-danger`
- **Light Background**: `#FFEBEE` (`bg-danger-light`)

### Success/Safety
- **Color**: `#388E3C`
- **Usage**: Success states, confirmations, safe operations
- **Tailwind**: `bg-success`, `text-success`
- **Light Background**: `#E8F5E8` (`bg-success-light`)

## 🎭 Supporting Colors

### Fire Theme Variants
- **Fire 50**: `#FFF3E0` - Very light backgrounds
- **Fire 100**: `#FFE0B2` - Light backgrounds
- **Fire 600**: `#E65100` - Primary accent
- **Fire 700**: `#D84315` - Hover states
- **Fire 800**: `#BF360C` - Active states

### Neutral Grays
- **Gray 100**: `#F5F7FA` - Primary background
- **Gray 200**: `#E4E7EB` - Borders, dividers
- **Gray 500**: `#7B8794` - Secondary text
- **Gray 600**: `#616E7C` - Icons, muted text
- **Gray 900**: `#333333` - Primary text

## 📝 Usage Guidelines

### Do's ✅
- Use `#F5F7FA` for main page backgrounds
- Use `#E65100` for primary actions and fire-themed elements
- Use `#333333` for primary text and headings
- Use appropriate status colors for feedback (success/danger)
- Maintain sufficient contrast ratios (4.5:1 minimum)

### Don'ts ❌
- Don't use pure white (`#FFFFFF`) for main backgrounds
- Don't use black (`#000000`) for text - use `#333333` instead
- Don't mix red colors for fire theme - stick to orange variants
- Don't use too many color variants - keep it clean and minimal

## 🔧 Implementation

### Tailwind Classes
```css
/* Backgrounds */
bg-primary-bg     /* #F5F7FA */
bg-card          /* #FFFFFF */
bg-fire-600      /* #E65100 */
bg-success       /* #388E3C */
bg-danger        /* #E53935 */

/* Text Colors */
text-primary-text    /* #333333 */
text-fire-600       /* #E65100 */
text-gray-600       /* #616E7C */

/* Borders */
border-gray-200     /* #E4E7EB */
border-fire-600     /* #E65100 */
```

### CSS Variables
```css
var(--primary-bg)        /* #F5F7FA */
var(--primary-text)      /* #333333 */
var(--primary-accent)    /* #E65100 */
var(--card-bg)          /* #FFFFFF */
var(--danger)           /* #E53935 */
var(--success)          /* #388E3C */
```

## 🎯 Brand Identity

This color palette reinforces the **Fire Guardian** brand by:

1. **Clean & Professional**: Light backgrounds create a modern, approachable feel
2. **Fire Theme**: Orange accent colors directly tie to fire safety themes
3. **High Readability**: Strong contrast ensures accessibility
4. **Trust & Safety**: Balanced use of warm (orange) and cool (green) tones
5. **Industry Standard**: Professional colors suitable for business environments

---

**Note**: This color system is designed for light mode. All colors have been tested for accessibility and provide excellent readability across different devices and lighting conditions.