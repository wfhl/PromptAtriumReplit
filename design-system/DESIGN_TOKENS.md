# PromptAtrium Design Tokens

> **Last Updated:** December 2024  
> **Version:** 1.0.0  
> **Status:** Single Source of Truth

This document defines all design tokens used in PromptAtrium. Design tokens are the atomic values that make up the visual design system - colors, spacing, typography, shadows, and more.

## Token Architecture

The design system uses a two-file structure:

| File | Location | Contains |
|------|----------|----------|
| **index.css** | `client/src/index.css` | Core color tokens, shadow tokens, semantic colors (`:root` and `.dark`) |
| **design-tokens.css** | `design-system/design-tokens.css` | Extended tokens (spacing, radius, animation, glass-morphism, gradients) + utility classes |

**Why two files?** Core colors are tightly integrated with Tailwind CSS and shadcn/ui in index.css. Extended tokens and utilities are in a separate file for cleaner organization and optional import.

---

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document)
2. [Color Tokens](#color-tokens)
3. [Typography Tokens](#typography-tokens)
4. [Spacing Tokens](#spacing-tokens)
5. [Border Radius Tokens](#border-radius-tokens)
6. [Shadow Tokens](#shadow-tokens)
7. [Animation Tokens](#animation-tokens)
8. [Glass-morphism Tokens](#glass-morphism-tokens)
9. [Gradient Tokens](#gradient-tokens)
10. [Component Tokens](#component-tokens)

---

## How to Use This Document

### For Developers

Use CSS custom properties (variables) defined in `design-tokens.css`:

```css
/* Using color tokens */
.my-element {
  background-color: var(--primary);
  color: var(--primary-foreground);
}

/* Using shadow tokens */
.card {
  box-shadow: var(--shadow-md);
}

/* Using spacing tokens */
.container {
  padding: var(--spacing-4);
  gap: var(--spacing-2);
}
```

### For Designers

Reference the HEX/HSL values in this document when creating designs in Figma or other tools. Keep designs in sync with these token definitions.

---

## Color Tokens

### Semantic Colors

These colors have specific meanings and should be used consistently throughout the application.

| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Background** | `--background` | `hsl(220, 15%, 8%)` | `#111318` | App background |
| **Foreground** | `--foreground` | `hsl(220, 15%, 95%)` | `#F0F1F4` | Primary text |
| **Primary** | `--primary` | `hsl(221, 83%, 53%)` | `#2563EB` | Buttons, links, accents |
| **Primary Foreground** | `--primary-foreground` | `hsl(0, 0%, 98%)` | `#FAFAFA` | Text on primary |
| **Secondary** | `--secondary` | `hsl(220, 14%, 16%)` | `#242830` | Secondary backgrounds |
| **Secondary Foreground** | `--secondary-foreground` | `hsl(220, 15%, 75%)` | `#B4BAC4` | Secondary text |
| **Muted** | `--muted` | `hsl(220, 14%, 14%)` | `#1F232A` | Subtle backgrounds |
| **Muted Foreground** | `--muted-foreground` | `hsl(220, 14%, 60%)` | `#8E95A2` | Placeholder text |
| **Accent** | `--accent` | `hsl(220, 14%, 16%)` | `#242830` | Hover states |
| **Accent Foreground** | `--accent-foreground` | `hsl(220, 15%, 75%)` | `#B4BAC4` | Accent text |

### Surface Colors

| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Card** | `--card` | `hsl(220, 15%, 12%)` | `#1A1D24` | Cards, elevated surfaces |
| **Card Foreground** | `--card-foreground` | `hsl(220, 15%, 95%)` | `#F0F1F4` | Card text |
| **Popover** | `--popover` | `hsl(220, 15%, 12%)` | `#1A1D24` | Dropdowns, tooltips |
| **Popover Foreground** | `--popover-foreground` | `hsl(220, 15%, 95%)` | `#F0F1F4` | Popover text |

### State Colors

| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Destructive** | `--destructive` | `hsl(0, 84%, 60%)` | `#F04444` | Errors, delete actions |
| **Destructive Foreground** | `--destructive-foreground` | `hsl(0, 0%, 98%)` | `#FAFAFA` | Text on destructive |
| **Success** | `--success` | `hsl(142, 71%, 45%)` | `#22C55E` | Success states |
| **Success Foreground** | `--success-foreground` | `hsl(0, 0%, 98%)` | `#FAFAFA` | Text on success |
| **Warning** | `--warning` | `hsl(38, 92%, 50%)` | `#F59E0B` | Warning states |
| **Warning Foreground** | `--warning-foreground` | `hsl(0, 0%, 8%)` | `#141414` | Text on warning |

### Border & Input Colors

| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Border** | `--border` | `hsl(220, 13%, 20%)` | `#2D323B` | Borders, dividers |
| **Input** | `--input` | `hsl(220, 13%, 20%)` | `#2D323B` | Input backgrounds |
| **Ring** | `--ring` | `hsl(221, 83%, 53%)` | `#2563EB` | Focus rings |

### Chart/Data Visualization Colors

| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Chart 1** | `--chart-1` | `hsl(221, 83%, 53%)` | `#2563EB` | Primary chart color |
| **Chart 2** | `--chart-2` | `hsl(159, 100%, 36%)` | `#00B877` | Teal |
| **Chart 3** | `--chart-3` | `hsl(42, 93%, 56%)` | `#F7B32B` | Amber |
| **Chart 4** | `--chart-4` | `hsl(147, 79%, 42%)` | `#20C05B` | Green |
| **Chart 5** | `--chart-5` | `hsl(341, 75%, 51%)` | `#E21C4F` | Rose |

### Sidebar Colors

| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Sidebar** | `--sidebar` | `hsl(220, 15%, 12%)` | `#1A1D24` | Sidebar background |
| **Sidebar Foreground** | `--sidebar-foreground` | `hsl(220, 15%, 95%)` | `#F0F1F4` | Sidebar text |
| **Sidebar Primary** | `--sidebar-primary` | `hsl(221, 83%, 53%)` | `#2563EB` | Sidebar active |
| **Sidebar Accent** | `--sidebar-accent` | `hsl(220, 14%, 16%)` | `#242830` | Sidebar hover |
| **Sidebar Border** | `--sidebar-border` | `hsl(220, 13%, 20%)` | `#2D323B` | Sidebar borders |

---

## Typography Tokens

### Font Families

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| **Sans** | `--font-sans` | `Inter, system-ui, sans-serif` | Primary UI text |
| **Serif** | `--font-serif` | `Georgia, serif` | Editorial, quotes |
| **Mono** | `--font-mono` | `Menlo, monospace` | Code, prompts |

### Font Sizes

| Token | Size (px) | Size (rem) | Line Height | Weight | Usage |
|-------|-----------|------------|-------------|--------|-------|
| **xs** | 12px | 0.75rem | 1.5 | 400 | Captions, badges |
| **sm** | 14px | 0.875rem | 1.5 | 400 | Secondary text, buttons |
| **base** | 16px | 1rem | 1.5 | 400 | Body text |
| **lg** | 18px | 1.125rem | 1.5 | 500 | Subheadings |
| **xl** | 20px | 1.25rem | 1.4 | 600 | Section headers |
| **2xl** | 24px | 1.5rem | 1.3 | 600 | Page titles |
| **3xl** | 30px | 1.875rem | 1.3 | 700 | Hero text |
| **4xl** | 36px | 2.25rem | 1.2 | 700 | Large heroes |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| **normal** | 400 | Body text |
| **medium** | 500 | Emphasized text, labels |
| **semibold** | 600 | Headings, buttons |
| **bold** | 700 | Strong emphasis, titles |

---

## Spacing Tokens

Based on a 4px (0.25rem) base unit.

| Token | CSS Variable | Value (px) | Value (rem) | Usage |
|-------|--------------|------------|-------------|-------|
| **0** | `--spacing-0` | 0px | 0rem | None |
| **0.5** | `--spacing-0-5` | 2px | 0.125rem | Micro spacing |
| **1** | `--spacing-1` | 4px | 0.25rem | Tight spacing |
| **1.5** | `--spacing-1-5` | 6px | 0.375rem | Small spacing |
| **2** | `--spacing-2` | 8px | 0.5rem | Default gaps |
| **2.5** | `--spacing-2-5` | 10px | 0.625rem | Medium-small |
| **3** | `--spacing-3` | 12px | 0.75rem | Form padding |
| **4** | `--spacing-4` | 16px | 1rem | Card padding |
| **5** | `--spacing-5` | 20px | 1.25rem | Section gaps |
| **6** | `--spacing-6` | 24px | 1.5rem | Large padding |
| **8** | `--spacing-8` | 32px | 2rem | Section spacing |
| **10** | `--spacing-10` | 40px | 2.5rem | Large gaps |
| **12** | `--spacing-12` | 48px | 3rem | Page sections |
| **16** | `--spacing-16` | 64px | 4rem | Major sections |

### Component Spacing Reference

| Component | Padding | Gap |
|-----------|---------|-----|
| **Buttons (default)** | 4px 8px | - |
| **Buttons (sm)** | 0 8px | - |
| **Buttons (lg)** | 0 24px | - |
| **Cards** | 16px - 24px | - |
| **Modals** | 24px | - |
| **Form fields** | 8px 12px | 8px vertical |
| **Grid gaps** | - | 16px - 24px |

---

## Border Radius Tokens

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| **none** | - | 0px | Sharp corners |
| **sm** | `--radius-sm` | 4px | Small elements |
| **default** | `--radius` | 8px (0.5rem) | Standard elements |
| **md** | `--radius-md` | 6px | Medium elements |
| **lg** | `--radius-lg` | 8px | Cards, modals |
| **xl** | `--radius-xl` | 12px | Large cards |
| **2xl** | `--radius-2xl` | 16px | Hero elements |
| **full** | `--radius-full` | 9999px | Pills, avatars |

---

## Shadow Tokens

### Standard Shadows

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| **xs** | `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Minimal lift |
| **sm** | `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | Subtle lift |
| **default** | `--shadow` | `0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)` | Cards |
| **md** | `--shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)` | Dropdowns |
| **lg** | `--shadow-lg` | `0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)` | Modals |
| **xl** | `--shadow-xl` | `0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04)` | Popovers |
| **2xl** | `--shadow-2xl` | `0 25px 50px rgba(0, 0, 0, 0.25)` | Large overlays |

### Colored Shadows

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| **Primary** | `--shadow-primary` | `0 10px 15px rgba(37, 99, 235, 0.25)` | Primary buttons |
| **Purple** | `--shadow-purple` | `0 10px 15px rgba(168, 85, 247, 0.2)` | Toasts, accents |

---

## Animation Tokens

### Timing Functions

| Token | Value | Usage |
|-------|-------|-------|
| **ease-out** | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| **ease-in** | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit animations |
| **ease-in-out** | `cubic-bezier(0.87, 0, 0.13, 1)` | Continuous |

### Duration

| Token | Value | Usage |
|-------|-------|-------|
| **fast** | 150ms | Hover states |
| **normal** | 200ms | Standard transitions |
| **slow** | 300ms | Page transitions |
| **slower** | 500ms | Hero animations |

### CSS Variables

```css
--transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
--transition-normal: 200ms cubic-bezier(0.87, 0, 0.13, 1);
--transition-slow: 300ms cubic-bezier(0.87, 0, 0.13, 1);
```

---

## Glass-morphism Tokens

### Base Values

| Token | CSS Variable | Value | Usage |
|-------|--------------|-------|-------|
| **Blur** | `--glass-blur` | 12px | Standard blur |
| **Blur SM** | `--glass-blur-sm` | 10px | Lighter blur |
| **Blur LG** | `--glass-blur-lg` | 20px | Heavy blur |

### Primary Glass Effect

| Property | CSS Variable | Value |
|----------|--------------|-------|
| **Background** | `--glass-primary-bg` | `rgba(37, 99, 235, 0.9)` |
| **Border** | `--glass-primary-border` | `rgba(37, 99, 235, 0.3)` |
| **Shadow** | `--glass-primary-shadow` | `rgba(37, 99, 235, 0.25)` |

### Purple Glass Effect (Toasts)

| Property | CSS Variable | Value |
|----------|--------------|-------|
| **Background** | `--glass-purple-bg` | `rgba(168, 85, 247, 0.85)` |
| **Border** | `--glass-purple-border` | `rgba(168, 85, 247, 0.3)` |
| **Shadow** | `--glass-purple-shadow` | `rgba(168, 85, 247, 0.2)` |

### Usage Example

```css
.glass-element {
  background: var(--glass-primary-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-primary-border);
  box-shadow: 0 10px 15px var(--glass-primary-shadow);
}
```

---

## Gradient Tokens

### Navigation Gradients (Text)

Used with `background-clip: text` for gradient text effects.

| Section | CSS Class | Gradient | Colors |
|---------|-----------|----------|--------|
| **Library** | `.nav-gradient-library` | `linear-gradient(135deg, #028EC6, #9175FF, #9175FF, #028EC6)` | Cyan → Purple |
| **Community** | `.nav-gradient-community` | `linear-gradient(135deg, #FFC800, #FF7300, #FF7300, #FFC802)` | Yellow → Orange |
| **Tools** | `.nav-gradient-tools` | `linear-gradient(135deg, #8466D6, #128FC4, #128FC4, #8466D6)` | Purple → Blue |
| **Marketplace** | `.nav-gradient-marketplace` | `linear-gradient(135deg, #10B981, #3B82F6)` | Green → Blue |

### Button Gradients (Background)

Used for gradient button backgrounds with backdrop blur.

| Section | CSS Class | Gradient | Hover Effect |
|---------|-----------|----------|--------------|
| **Library** | `.button-gradient-library` | `linear-gradient(135deg, #028EC6, #6851C8, #6851C8, #028EC6)` | translateY(-1px) |
| **Community** | `.button-gradient-community` | `linear-gradient(135deg, rgba(255,200,0,0.8), rgba(255,115,0,0.8), rgba(255,200,2,0.8))` | translateY(-1px) |
| **Tools** | `.button-gradient-tools` | `linear-gradient(135deg, #8466D6, #128FC4, #8466D6)` | translateY(-1px) |
| **Marketplace** | `.button-gradient-marketplace` | `linear-gradient(135deg, #10B981, #3B82F6, #10B981)` | translateY(-1px) |

### UI Element Gradients

| Element | Gradient | Usage |
|---------|----------|-------|
| **Toast/Dropdown** | `linear-gradient(135deg, rgba(2,142,198,0.3), rgba(104,81,200,0.3), rgba(255,200,2,0.3))` | Glass overlays |
| **Mobile Nav** | `linear-gradient(135deg, rgba(2,142,198,0.3), rgba(59,40,103,0.5))` | Mobile menus |

### Background Gradient

The main app background uses a layered gradient:

```css
background: 
  linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.4)),
  radial-gradient(
    ellipse at 30% 20%, 
    rgba(56, 189, 248, 0.2) 0%,
    rgba(139, 92, 246, 0.15) 40%,
    rgba(236, 72, 153, 0.125) 70%,
    rgba(10, 10, 10, 0.4) 100%
  ),
  linear-gradient(to bottom, var(--background-layer), var(--background-layer));
```

---

## Component Tokens

### Buttons

| Variant | Background | Text | Border | Hover |
|---------|------------|------|--------|-------|
| **Primary** | `--primary` | `--primary-foreground` | none | Darken 10% |
| **Secondary** | `--secondary` | `--secondary-foreground` | `--border` | Lighten 5% |
| **Destructive** | `--destructive` | `--destructive-foreground` | none | Darken 10% |
| **Outline** | transparent | `--foreground` | `--border` | `--secondary` bg |
| **Ghost** | transparent | `--foreground` | none | `--secondary` bg |

### Button Sizes

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| **xs** | 28px | 0 8px | 12px |
| **sm** | 24px | 0 8px | 14px |
| **default** | 28px | 4px 8px | 14px |
| **lg** | 44px | 0 24px | 14px |
| **icon** | 40px | 0 (square) | - |

### Cards

| Property | Value |
|----------|-------|
| **Background** | `--card` |
| **Border** | 1px solid `--border` |
| **Radius** | `--radius-lg` (8px) |
| **Padding** | 16px - 24px |
| **Shadow** | `--shadow-sm` or none |

### Form Inputs

| Property | Value |
|----------|-------|
| **Background** | `--input` |
| **Border** | 1px solid `--border` |
| **Radius** | `--radius-md` (6px) |
| **Padding** | 8px 12px |
| **Text** | `--foreground` |
| **Placeholder** | `--muted-foreground` |
| **Focus Ring** | 2px solid `--ring` |

### Badges

| Variant | Background | Text |
|---------|------------|------|
| **Default** | `--primary` | `--primary-foreground` |
| **Secondary** | `--secondary` | `--secondary-foreground` |
| **Destructive** | `--destructive` | `--destructive-foreground` |
| **Outline** | transparent + border | `--foreground` |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial design tokens documentation |

---

## Related Documents

- [BRAND_GUIDELINES.md](../BRAND_GUIDELINES.md) - Visual design specifications
- [DESIGN_SYSTEM_SUGGESTIONS.md](../DESIGN_SYSTEM_SUGGESTIONS.md) - Implementation roadmap
- [design-tokens.css](./design-tokens.css) - CSS variable definitions
