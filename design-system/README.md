# PromptAtrium Design System

A comprehensive design system for the PromptAtrium AI prompt management platform.

## Quick Start

This directory contains design documentation and extended tokens for PromptAtrium. The design system ensures visual consistency across the application.

### Key Files

| File | Purpose |
|------|---------|
| [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) | Complete token definitions (colors, spacing, shadows, etc.) |
| [COMPONENT_PATTERNS.md](./COMPONENT_PATTERNS.md) | Component usage examples and patterns |
| [CSS_ARCHITECTURE.md](./CSS_ARCHITECTURE.md) | CSS file structure and organization guide |
| [design-tokens.css](./design-tokens.css) | Extended CSS custom properties |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Tailwind CSS                         │
│              (Utility-first framework)                  │
├─────────────────────────────────────────────────────────┤
│                  CSS Custom Properties                  │
│    ┌──────────────────┐    ┌──────────────────────┐    │
│    │   index.css      │    │  design-tokens.css   │    │
│    │   (Core tokens)  │    │  (Extended tokens)   │    │
│    └──────────────────┘    └──────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                    shadcn/ui                            │
│              (Component library)                        │
├─────────────────────────────────────────────────────────┤
│                  Custom Styles                          │
│      (Glass effects, gradients, mobile nav)             │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. Dark-First

PromptAtrium uses a dark-first design aesthetic with:
- Deep blue-gray backgrounds
- High-contrast text
- Subtle glass-morphism effects
- Gradient accents

### 2. Consistency

All UI elements use design tokens:
- Colors: `var(--primary)`, `var(--secondary)`, etc.
- Shadows: `var(--shadow-sm)`, `var(--shadow-lg)`, etc.
- Spacing: Based on 4px (0.25rem) scale

### 3. Accessibility

- WCAG 2.1 AA contrast ratios
- Focus visible indicators
- Reduced motion support

## Using the Design System

### For Developers

```tsx
// Use shadcn/ui components with design tokens
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Components automatically use design tokens
<Button variant="primary">Action</Button>
<Card>Content</Card>

// Custom styling with tokens
<div style={{ backgroundColor: 'var(--card)' }}>
  Custom element using tokens
</div>

// Tailwind classes that reference tokens
<div className="bg-primary text-primary-foreground">
  Using Tailwind with tokens
</div>
```

### For Designers

Reference [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) for:
- Exact color values (HSL and HEX)
- Typography specifications
- Spacing scale
- Component specifications

## Color Palette

### Primary Colors

| Token | Value | Usage |
|-------|-------|-------|
| Background | `hsl(220, 15%, 8%)` | App background |
| Primary | `hsl(221, 83%, 53%)` | Actions, links |
| Secondary | `hsl(220, 14%, 16%)` | Secondary UI |

### Section Colors

| Section | Gradient Colors |
|---------|-----------------|
| Library | Cyan → Purple |
| Community | Yellow → Orange |
| Tools | Purple → Blue |
| Marketplace | Green → Blue |

## Component Library

All components are built with shadcn/ui. See [COMPONENT_PATTERNS.md](./COMPONENT_PATTERNS.md) for:
- Button variants and sizes
- Card patterns
- Form inputs
- Toast notifications
- Navigation patterns

## Related Files

- `client/src/index.css` - Core CSS with tokens
- `BRAND_GUIDELINES.md` - Brand and visual specifications
- `client/src/components/ui/` - shadcn/ui components

## Contributing

When adding new styles:

1. **Check existing tokens** before creating new values
2. **Use Tailwind utilities** before writing custom CSS
3. **Document additions** in the appropriate markdown file
4. **Test on mobile** and desktop

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial design system documentation |
