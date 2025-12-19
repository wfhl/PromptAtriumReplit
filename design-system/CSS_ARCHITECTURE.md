# PromptAtrium CSS Architecture

> **Last Updated:** December 2024  
> **Version:** 1.0.0  
> **Status:** Reference Documentation (No Code Changes)

This document describes the CSS architecture of PromptAtrium to help developers understand and maintain the styling system.

---

## Overview

The application uses a layered CSS architecture combining Tailwind CSS, CSS custom properties, and component-specific styles.

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Base** | Tailwind CSS | Utility-first CSS framework |
| **Tokens** | CSS Custom Properties | Design tokens (colors, spacing, shadows) |
| **Components** | shadcn/ui | Pre-built accessible components |
| **Custom** | index.css | App-specific overrides and effects |

---

## File Structure

```
client/src/
├── index.css              # Main stylesheet (tokens + custom styles)
├── components/
│   └── ui/                # shadcn/ui components
│       ├── button.tsx     # Uses Tailwind + tokens
│       ├── card.tsx
│       └── ...
└── ...

design-system/
├── DESIGN_TOKENS.md       # Token documentation
├── COMPONENT_PATTERNS.md  # Usage patterns
├── CSS_ARCHITECTURE.md    # This file
├── design-tokens.css      # Extended tokens
└── README.md              # Overview
```

---

## index.css Organization

The main stylesheet (`client/src/index.css`) is organized into sections:

### 1. Tailwind Directives (Lines 1-3)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 2. CSS Custom Properties (Lines 5-111)

- `:root` - Light mode tokens (currently same as dark)
- `.dark` - Dark mode tokens

**Token Categories:**
- Semantic colors (background, foreground, primary, secondary, etc.)
- State colors (destructive, success, warning)
- UI colors (border, input, ring)
- Chart colors (chart-1 through chart-5)
- Sidebar colors
- Typography (font families)
- Shadows (xs through 2xl, plus colored shadows)
- Layout (radius, spacing)

### 3. Tailwind Layers (Lines 113-136)

- `@layer utilities` - Custom utility classes
- `@layer base` - Base styles for body, scrolling behavior

### 4. Navigation Gradients (Lines 151-295)

Classes for gradient text and button effects:
- `.nav-gradient-library` - Cyan-purple text gradient
- `.nav-gradient-community` - Yellow-orange text gradient
- `.nav-gradient-tools` - Purple-blue text gradient
- `.nav-gradient-marketplace` - Green-blue text gradient
- `.button-gradient-*` - Corresponding button variants

### 5. Toast/Dropdown Glass Effects (Lines 297-361)

Glass-morphism styles for:
- Sonner toasts
- shadcn/ui toasts
- Radix dropdown menus

### 6. Mobile Navigation (Lines 363-522)

Extensive mobile-specific styling:
- Mobile navigation dropdown backgrounds
- Hamburger menu styling
- Touch optimization
- Safe area insets

### 7. Scrollbar Customization (Lines 524-640)

Custom scrollbar styles for:
- Webkit browsers (Chrome, Safari, Edge)
- Firefox (`scrollbar-width`, `scrollbar-color`)
- Radix scroll areas

---

## CSS Custom Property Naming

The project follows a consistent naming pattern:

```
--[category]-[variant]
```

### Examples

| Pattern | Example | Usage |
|---------|---------|-------|
| `--color` | `--primary` | Base color |
| `--color-foreground` | `--primary-foreground` | Text on color |
| `--shadow-size` | `--shadow-lg` | Shadow scale |
| `--sidebar-*` | `--sidebar-border` | Sidebar-specific |

---

## Selector Patterns

### Component Targeting

The codebase uses various selector patterns:

| Pattern | Example | Purpose |
|---------|---------|---------|
| **Data attributes** | `[data-sonner-toast]` | Third-party components |
| **Radix patterns** | `[data-radix-popper-content-wrapper]` | Radix UI components |
| **Tailwind escapes** | `.md\:hidden` | Responsive classes |
| **State selectors** | `[data-state="open"]` | Component states |

### Specificity Considerations

Some rules use `!important` to override:
- Third-party component styles (Sonner, Radix)
- Tailwind utility conflicts
- Mobile navigation states

---

## Glass-morphism Implementation

### Standard Pattern

```css
.glass-element {
  background: linear-gradient(...);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(..., 0.3);
  box-shadow: 0 8px 32px rgba(..., 0.2);
}
```

### Used In

- Toast notifications
- Dropdown menus
- Mobile navigation
- Button gradients

---

## Responsive Breakpoints

The app follows Tailwind's default breakpoints:

| Breakpoint | Min Width | Class Prefix |
|------------|-----------|--------------|
| **sm** | 640px | `sm:` |
| **md** | 768px | `md:` |
| **lg** | 1024px | `lg:` |
| **xl** | 1280px | `xl:` |
| **2xl** | 1536px | `2xl:` |

### Mobile-First Patterns

```css
/* Mobile default */
.prompt-beam-container {
  height: 180px;
}

/* Desktop override */
@media (min-width: 768px) {
  .prompt-beam-container {
    height: 400px;
  }
}
```

---

## Future Consolidation Opportunities

> **Note:** These are documentation-only suggestions. No changes have been made to preserve stability.

### Potential Improvements

1. **Navigation gradient consolidation** - Lines 417-469 have repetitive selectors for mobile gradient styling that could use CSS variables or mixins

2. **Scrollbar style simplification** - Lines 524-640 could potentially be consolidated with CSS variable-based theming

3. **Theme token alignment** - `:root` and `.dark` currently have identical values; consider using CSS `@layer` for inheritance

### Why Not Changed

- Risk of breaking existing functionality
- Complex selector specificity dependencies
- Mobile-specific edge cases
- Third-party component overrides

---

## Best Practices

### Adding New Styles

1. **Check existing tokens** - Use CSS variables from `:root` when possible
2. **Use Tailwind first** - Prefer utility classes over custom CSS
3. **Scope carefully** - Use specific selectors to avoid conflicts
4. **Document additions** - Add comments explaining purpose

### Modifying Existing Styles

1. **Test thoroughly** - Check desktop and mobile
2. **Verify specificity** - Some rules require `!important`
3. **Check third-party components** - Radix/Sonner may need data-attribute selectors

---

## Related Documents

- [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) - Token definitions
- [COMPONENT_PATTERNS.md](./COMPONENT_PATTERNS.md) - Component usage
- [BRAND_GUIDELINES.md](../BRAND_GUIDELINES.md) - Visual specifications
