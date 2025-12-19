# Prompt Atrium Brand Design Guidelines

> Last Updated: December 2024  
> Version: 1.0

This document defines the visual design system for Prompt Atrium. Use these specifications when designing in Figma or implementing new features to maintain consistency across the application.

---

## Table of Contents

1. [Brand Overview](#brand-overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Border Radius](#border-radius)
6. [Shadows & Elevation](#shadows--elevation)
7. [Glass-morphism Effects](#glass-morphism-effects)
8. [Gradients](#gradients)
9. [Component Patterns](#component-patterns)
10. [Animation & Motion](#animation--motion)
11. [Iconography](#iconography)
12. [Responsive Breakpoints](#responsive-breakpoints)

---

## Brand Overview

**Prompt Atrium** is a sophisticated AI prompt management platform with a modern, dark-first design aesthetic. The visual language emphasizes:

- **Dark Mode First**: Designed primarily for dark environments
- **Glass-morphism**: Translucent surfaces with backdrop blur
- **Vibrant Accents**: Blue primary color against dark backgrounds
- **Subtle Depth**: Layered surfaces with gentle gradients
- **Clean Typography**: Inter font family for optimal readability

---

## Color Palette

### Primary Colors

| Name | HSL | HEX | RGB | Usage |
|------|-----|-----|-----|-------|
| **Primary** | `hsl(221, 83%, 53%)` | `#2563EB` | `rgb(37, 99, 235)` | Buttons, links, focus states, accents |
| **Primary Foreground** | `hsl(0, 0%, 98%)` | `#FAFAFA` | `rgb(250, 250, 250)` | Text on primary backgrounds |

### Background & Surface Colors

| Name | HSL | HEX | RGB | Usage |
|------|-----|-----|-----|-------|
| **Background** | `hsl(220, 15%, 8%)` | `#111318` | `rgb(17, 19, 24)` | App background |
| **Card** | `hsl(220, 15%, 12%)` | `#1A1D24` | `rgb(26, 29, 36)` | Cards, modals, elevated surfaces |
| **Secondary** | `hsl(220, 14%, 16%)` | `#242830` | `rgb(36, 40, 48)` | Secondary backgrounds, hover states |
| **Muted** | `hsl(220, 14%, 14%)` | `#1F232A` | `rgb(31, 35, 42)` | Subtle backgrounds, disabled states |
| **Border** | `hsl(220, 13%, 20%)` | `#2D323B` | `rgb(45, 50, 59)` | Borders, dividers |
| **Input** | `hsl(220, 13%, 20%)` | `#2D323B` | `rgb(45, 50, 59)` | Input field backgrounds |

### Text Colors

| Name | HSL | HEX | RGB | Usage |
|------|-----|-----|-----|-------|
| **Foreground** | `hsl(220, 15%, 95%)` | `#F0F1F4` | `rgb(240, 241, 244)` | Primary text |
| **Secondary Foreground** | `hsl(220, 15%, 75%)` | `#B4BAC4` | `rgb(180, 186, 196)` | Secondary text |
| **Muted Foreground (dark)** | `hsl(220, 14%, 60%)` | `#8E95A2` | `rgb(142, 149, 162)` | Placeholder, helper text (dark mode) |
| **Muted Foreground (light)** | `hsl(219, 9%, 42%)` | `#626A76` | `rgb(98, 106, 118)` | Placeholder, helper text (light mode) |

### Semantic Colors

| Name | HSL | HEX | RGB | Usage |
|------|-----|-----|-----|-------|
| **Destructive** | `hsl(0, 84%, 60%)` | `#F04444` | `rgb(240, 68, 68)` | Errors, delete actions |
| **Destructive Foreground** | `hsl(0, 0%, 98%)` | `#FAFAFA` | `rgb(250, 250, 250)` | Text on destructive backgrounds |

> **Note**: Success and warning colors are not currently defined as CSS variables. When needed, use:
> - **Success**: `#22C55E` (green-500) or Chart 4
> - **Warning**: `#F59E0B` (amber-500) or Chart 3

### Chart/Data Visualization Colors

| Name | HSL | HEX | RGB |
|------|-----|-----|-----|
| **Chart 1** | `hsl(221, 83%, 53%)` | `#2563EB` | Blue (same as Primary) |
| **Chart 2** | `hsl(159, 100%, 36%)` | `#00B877` | Teal |
| **Chart 3** | `hsl(42, 93%, 56%)` | `#F7B32B` | Amber |
| **Chart 4** | `hsl(147, 79%, 42%)` | `#20C05B` | Green |
| **Chart 5** | `hsl(341, 75%, 51%)` | `#E21C4F` | Rose |

### Toast/Notification Colors

| Type | Background | Border | Shadow |
|------|------------|--------|--------|
| **Default** | `rgba(168, 85, 247, 0.85)` / `#A855F7` at 85% | `rgba(168, 85, 247, 0.3)` | `rgba(168, 85, 247, 0.2)` |
| **Destructive** | `var(--destructive)` | `var(--destructive)` | - |

---

## Typography

### Font Families

| Family | Stack | Usage |
|--------|-------|-------|
| **Sans** | `Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif` | Primary UI text |
| **Serif** | `Georgia, Cambria, serif` | Editorial, quotes |
| **Mono** | `Menlo, Monaco, Consolas, monospace` | Code, prompts |

### Type Scale

| Name | Size (px) | Size (rem) | Line Height | Weight | Usage |
|------|-----------|------------|-------------|--------|-------|
| **xs** | 12px | 0.75rem | 1.5 | 400 | Captions, badges |
| **sm** | 14px | 0.875rem | 1.5 | 400 | Secondary text, buttons |
| **base** | 16px | 1rem | 1.5 | 400 | Body text |
| **lg** | 18px | 1.125rem | 1.5 | 500 | Subheadings |
| **xl** | 20px | 1.25rem | 1.4 | 600 | Section headers |
| **2xl** | 24px | 1.5rem | 1.3 | 600 | Page titles |
| **3xl** | 30px | 1.875rem | 1.3 | 700 | Hero text |
| **4xl** | 36px | 2.25rem | 1.2 | 700 | Large heroes |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| **Normal** | 400 | Body text |
| **Medium** | 500 | Emphasized text, labels |
| **Semibold** | 600 | Headings, buttons |
| **Bold** | 700 | Strong emphasis, titles |

---

## Spacing System

Based on a 4px (0.25rem) base unit.

| Token | Value (px) | Value (rem) | CSS Variable |
|-------|------------|-------------|--------------|
| **0** | 0px | 0rem | - |
| **0.5** | 2px | 0.125rem | - |
| **1** | 4px | 0.25rem | `--spacing` |
| **1.5** | 6px | 0.375rem | - |
| **2** | 8px | 0.5rem | - |
| **2.5** | 10px | 0.625rem | - |
| **3** | 12px | 0.75rem | - |
| **3.5** | 14px | 0.875rem | - |
| **4** | 16px | 1rem | - |
| **5** | 20px | 1.25rem | - |
| **6** | 24px | 1.5rem | - |
| **8** | 32px | 2rem | - |
| **10** | 40px | 2.5rem | - |
| **12** | 48px | 3rem | - |
| **16** | 64px | 4rem | - |
| **20** | 80px | 5rem | - |

### Component Spacing Guidelines

| Context | Padding | Gap |
|---------|---------|-----|
| **Buttons (default)** | 4px 8px (py-1 px-2) | - |
| **Buttons (sm)** | 0 8px (px-2) | - |
| **Buttons (lg)** | 0 24px (px-6) | - |
| **Cards** | 16px - 24px | - |
| **Modals** | 24px | - |
| **Form fields** | 8px 12px | 8px vertical |
| **Grid gaps** | - | 16px - 24px |
| **Section spacing** | - | 32px - 48px |

---

## Border Radius

| Token | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| **none** | 0px | - | Sharp corners |
| **sm** | 4px | `calc(var(--radius) - 4px)` | Small elements |
| **DEFAULT** | 6px | `calc(var(--radius) - 2px)` | Buttons, inputs |
| **md** | 6px | `calc(var(--radius) - 2px)` | Standard elements |
| **lg** | 8px | `var(--radius)` | Cards, modals |
| **xl** | 12px | - | Large cards, floating bars |
| **2xl** | 16px | - | Hero elements |
| **full** | 9999px | - | Pills, avatars |

---

## Shadows & Elevation

### Shadow Scale

| Level | CSS Value | Usage |
|-------|-----------|-------|
| **none** | `none` | Flat elements |
| **sm** | `0 1px 2px rgba(0, 0, 0, 0.05)` | Subtle lift |
| **DEFAULT** | `0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)` | Cards |
| **md** | `0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)` | Dropdowns |
| **lg** | `0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)` | Modals, floating bars |
| **xl** | `0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04)` | Popovers |
| **2xl** | `0 25px 50px rgba(0, 0, 0, 0.25)` | Large overlays |

### Colored Shadows

For accent elements (buttons, floating bars), use colored shadows:

```css
/* Primary colored shadow */
box-shadow: 0 10px 15px rgba(37, 99, 235, 0.25);   /* shadow-primary/25 */

/* Purple accent shadow (toasts) */
box-shadow: 0 10px 15px rgba(168, 85, 247, 0.2);   /* shadow-purple-500/20 */
```

---

## Glass-morphism Effects

Glass-morphism is used for floating UI elements like toasts, action bars, and overlays.

### Standard Glass Effect

```css
.glass-effect {
  background: rgba(37, 99, 235, 0.9);       /* bg-primary/90 */
  backdrop-filter: blur(12px);              /* backdrop-blur-md */
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(37, 99, 235, 0.3); /* border-primary/30 */
  box-shadow: 0 10px 15px rgba(37, 99, 235, 0.25);
}
```

### Toast Glass Effect

```css
.toast-glass {
  background: rgba(168, 85, 247, 0.85);     /* bg-purple-500/85 */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(168, 85, 247, 0.3);
  box-shadow: 0 10px 15px rgba(168, 85, 247, 0.2);
  color: white;
}
```

### Semi-transparent Buttons (on glass surfaces)

```css
.glass-button {
  background: rgba(255, 255, 255, 0.15);   /* bg-white/15 */
  color: white;
  border-radius: 8px;
  transition: background-color 150ms;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.25);   /* hover:bg-white/25 */
}
```

---

## Gradients

### Background Gradient

The app uses a layered gradient background:

```css
background: 
  /* Dark overlay */
  linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
  /* Radial gradient - the "glow" effect */
  radial-gradient(
    ellipse at 30% 20%, 
    rgba(56, 189, 248, 0.2) 0%,    /* Cyan */
    rgba(139, 92, 246, 0.15) 40%,  /* Violet */
    rgba(236, 72, 153, 0.125) 70%, /* Pink */
    rgba(10, 10, 10, 0.4) 100%
  ),
  /* Base layer */
  linear-gradient(to bottom, #000000, #000000);
```

### Navigation Gradients

Used for active navigation states:

| Section | Gradient |
|---------|----------|
| **Library** | `linear-gradient(135deg, #028EC6 0%, #9175FF 30%, #9175FF 70%, #028EC6 100%)` |
| **Community** | `linear-gradient(135deg, #FFC800 0%, #FF7300 30%, #FF7300 70%, #FFC802 100%)` |
| **Tools** | `linear-gradient(135deg, #8466D6 0%, #128FC4 30%, #128FC4 70%, #8466D6 100%)` |

Apply with `-webkit-background-clip: text` and `-webkit-text-fill-color: transparent`.

---

## Component Patterns

### Buttons

#### Primary Button
```
Background: #3B82F6 (Primary)
Text: #FAFAFA (Primary Foreground)
Padding: 8px 16px
Border Radius: 6px
Font Weight: 500
Hover: Darken 10%
```

#### Secondary Button
```
Background: #252A31 (Secondary)
Text: #B3BAC3 (Secondary Foreground)
Padding: 8px 16px
Border Radius: 6px
Hover: Lighten 5%
```

#### Outline Button
```
Background: Transparent
Border: 1px solid #2E333A (Border)
Text: #F0F2F4 (Foreground)
Padding: 8px 16px
Border Radius: 6px
Hover: Background #252A31
```

#### Ghost Button
```
Background: Transparent
Text: #F0F2F4 (Foreground)
Padding: 8px 16px
Border Radius: 6px
Hover: Background #252A31
```

#### Destructive Button
```
Background: #EF4444 (Destructive)
Text: #FAFAFA
Padding: 8px 16px
Border Radius: 6px
```

#### Button Sizes
| Size | Height | Padding | Font Size | Notes |
|------|--------|---------|-----------|-------|
| **xs** | 28px (h-7) | 8px horizontal (px-2) | 12px | Extra small variant |
| **sm** | 24px (h-6) | 8px horizontal (px-2) | 14px | Compact, negative margin (-my-2) |
| **default** | 28px (h-7) | 8px horizontal, 4px vertical (px-2 py-1) | 14px | Standard button |
| **lg** | 44px (h-11) | 24px horizontal (px-6) | 14px | Large prominent buttons |
| **icon** | 40px (h-10 w-10) | 0 (square) | - | Icon-only buttons |

### Cards

```
Background: #1B1E23 (Card)
Border: 1px solid #2E333A (Border)
Border Radius: 8px (lg)
Padding: 16px - 24px
Shadow: sm or none
```

### Form Inputs

```
Background: #2E333A (Input)
Border: 1px solid #2E333A (Border)
Border Radius: 6px (md)
Padding: 8px 12px
Text: #F0F2F4 (Foreground)
Placeholder: #8B939E (Muted Foreground)
Focus Ring: 2px solid #3B82F6 (Ring/Primary)
```

### Badges/Pills

```
Background: #252A31 (Secondary)
Text: #B3BAC3 (Secondary Foreground)
Padding: 4px 10px
Border Radius: 9999px (Full)
Font Size: 12px
Font Weight: 500
```

#### Badge Variants
| Variant | Background | Text |
|---------|------------|------|
| **default** | `#3B82F6` | `#FAFAFA` |
| **secondary** | `#252A31` | `#B3BAC3` |
| **destructive** | `#EF4444` | `#FAFAFA` |
| **outline** | Transparent + border | `#F0F2F4` |

### Mobile Floating Action Bar

```
Position: Fixed, bottom 80px, left/right 16px
Background: rgba(37, 99, 235, 0.9) with backdrop-blur
Border: 1px solid rgba(37, 99, 235, 0.3)
Border Radius: 12px (xl)
Shadow: 0 10px 15px rgba(37, 99, 235, 0.25)
Padding: 12px 16px
Animation: slide-in-from-bottom, 300ms
```

#### Action Bar Buttons
```
Size: 36px x 36px
Background: rgba(255, 255, 255, 0.15)
Hover: rgba(255, 255, 255, 0.25)
Border Radius: 8px
Icon Size: 16px
Color: White
```

### Toasts

```
Background: rgba(168, 85, 247, 0.85)
Border: 1px solid rgba(168, 85, 247, 0.3)
Backdrop Filter: blur(12px)
Shadow: 0 10px 15px rgba(168, 85, 247, 0.2)
Border Radius: 6px
Padding: 8px 12px
Text: White
Animation: slide-in-from-bottom (mobile), slide-in-from-right (desktop)
```

### Dropdown Menus

```
Background: #1B1E23 (Popover)
Border: 1px solid #2E333A (Border)
Border Radius: 6px (md)
Shadow: md
Min Width: 160px - 200px
```

#### Dropdown Item
```
Padding: 8px 12px
Hover Background: #252A31 (Accent)
Focus Background: #252A31 (Accent)
Destructive Text: #EF4444
```

---

## Animation & Motion

### Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| **ease-out** | `cubic-bezier(0.16, 1, 0.3, 1)` | Enter animations |
| **ease-in** | `cubic-bezier(0.7, 0, 0.84, 0)` | Exit animations |
| **ease-in-out** | `cubic-bezier(0.87, 0, 0.13, 1)` | Continuous |

### Duration Scale

| Name | Duration | Usage |
|------|----------|-------|
| **fast** | 150ms | Hover states, micro-interactions |
| **normal** | 200ms | Standard transitions |
| **slow** | 300ms | Page transitions, complex animations |
| **slower** | 500ms | Hero animations |

### Common Animations

| Animation | Properties |
|-----------|------------|
| **Fade In** | opacity: 0 → 1, 200ms |
| **Slide Up** | translateY: 16px → 0, opacity: 0 → 1, 300ms |
| **Slide Down** | translateY: -16px → 0, opacity: 0 → 1, 300ms |
| **Scale In** | scale: 0.95 → 1, opacity: 0 → 1, 200ms |
| **Accordion** | height: 0 → auto, 200ms ease-out |

---

## Iconography

### Icon Library

**Primary**: Lucide React icons

### Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| **xs** | 12px | Inline text, badges |
| **sm** | 14px | Small buttons |
| **default** | 16px | Standard UI |
| **md** | 20px | Emphasized icons |
| **lg** | 24px | Large buttons, headers |
| **xl** | 32px | Hero elements |

### Icon Colors

Icons inherit text color. Use:
- `currentColor` for inline icons
- `text-muted-foreground` for de-emphasized
- `text-primary` for accented icons

---

## Responsive Breakpoints

| Name | Min Width | Tailwind Prefix |
|------|-----------|-----------------|
| **sm** | 640px | `sm:` |
| **md** | 768px | `md:` |
| **lg** | 1024px | `lg:` |
| **xl** | 1280px | `xl:` |
| **2xl** | 1536px | `2xl:` |

### Mobile-First Approach

Design for mobile first, then enhance for larger screens:

```css
/* Mobile (default) */
.element { padding: 16px; }

/* Tablet and up */
@media (min-width: 768px) {
  .element { padding: 24px; }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .element { padding: 32px; }
}
```

---

## Figma Import Checklist

When setting up in Figma:

1. **Create Color Styles**
   - All semantic colors (primary, secondary, etc.)
   - All chart colors
   - Glass-morphism colors with opacity

2. **Create Text Styles**
   - Full type scale (xs through 4xl)
   - Each weight variant

3. **Create Effect Styles**
   - Shadow scale (sm through 2xl)
   - Colored shadows
   - Blur effects

4. **Create Component Library**
   - Buttons (all variants and sizes)
   - Form inputs
   - Cards
   - Badges
   - Toasts
   - Dropdown menus
   - Floating action bar

5. **Set Up Auto Layout**
   - Use spacing tokens consistently
   - Create reusable padding presets

---

## CSS Custom Properties Reference

```css
:root {
  /* Colors */
  --background: hsl(220, 15%, 8%);
  --foreground: hsl(220, 15%, 95%);
  --card: hsl(220, 15%, 12%);
  --card-foreground: hsl(220, 15%, 95%);
  --popover: hsl(220, 15%, 12%);
  --popover-foreground: hsl(220, 15%, 95%);
  --primary: hsl(221, 83%, 53%);
  --primary-foreground: hsl(0, 0%, 98%);
  --secondary: hsl(220, 14%, 16%);
  --secondary-foreground: hsl(220, 15%, 75%);
  --muted: hsl(220, 14%, 14%);
  --muted-foreground: hsl(220, 14%, 60%);
  --accent: hsl(220, 14%, 16%);
  --accent-foreground: hsl(220, 15%, 75%);
  --destructive: hsl(0, 84%, 60%);
  --destructive-foreground: hsl(0, 0%, 98%);
  --border: hsl(220, 13%, 20%);
  --input: hsl(220, 13%, 20%);
  --ring: hsl(221, 83%, 53%);
  
  /* Typography */
  --font-sans: Inter, system-ui, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: Menlo, monospace;
  
  /* Radius */
  --radius: 0.5rem;
  
  /* Spacing */
  --spacing: 0.25rem;
}
```

---

*This document should be kept in sync with the application codebase. Update when making significant design changes.*
