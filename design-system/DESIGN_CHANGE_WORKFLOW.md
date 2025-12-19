# Design Change Implementation Workflow

> **Purpose:** This document explains the most effective way to implement design changes so they properly propagate throughout PromptAtrium.  
> **Last Updated:** December 2024  
> **Status:** Best Practices Guide

---

## Quick Start: 3 Ways to Make Design Changes

Depending on the type of change you want to make, use the appropriate method:

### 1. **Token Changes** (Colors, Spacing, Shadows)
For changes to core design values that affect multiple components.

### 2. **Component Changes** (Button styles, Card layouts)
For changes to specific component designs that need to propagate across the app.

### 3. **New Feature Design** (Add new section, new component type)
For completely new design patterns or features.

---

## Method 1: Token Changes (Most Common)

Use this when changing colors, spacing, or other foundational design values.

### Step 1: Identify What's Changing
Ask: "Is this a global value that multiple components use?"

**Examples:**
- "Make primary blue lighter" → Token change
- "Add more card padding" → Token change
- "Change all text colors to be warmer" → Token change

### Step 2: Update the Token in Code

**Location:** `client/src/index.css` (for core colors and shadows)

```css
:root {
  --primary: hsl(221, 83%, 53%);  /* CHANGE THIS */
}

.dark {
  --primary: hsl(221, 83%, 53%);  /* CHANGE THIS TOO */
}
```

**Or:** `design-system/design-tokens.css` (for extended tokens like glass-morphism)

```css
.glass-primary {
  background: rgba(255, 255, 255, 0.05);  /* CHANGE THIS */
  backdrop-filter: blur(10px);
}
```

### Step 3: Update Documentation

1. **DESIGN_TOKENS.md** - Update the token table with new values

```markdown
| Token | CSS Variable | HSL Value | HEX | Usage |
|-------|--------------|-----------|-----|-------|
| **Primary** | `--primary` | `hsl(220, 80%, 55%)` | `#2878F5` | NEW VALUE |
```

2. **BRAND_GUIDELINES.md** - If it's a major visual change, add context about why it changed

### Step 4: Verify Propagation

The change automatically propagates because:
- All components use the CSS variable (e.g., `bg-primary`, `border-border`)
- Tailwind generates classes from these variables
- No component-specific updates needed

**Test areas:**
- Buttons (primary, secondary, destructive)
- Cards (borders, backgrounds)
- Text (foreground colors)
- Charts (if applicable)

### Example: Making Primary Color Lighter

**Change:**
```css
/* BEFORE */
--primary: hsl(221, 83%, 53%);

/* AFTER */
--primary: hsl(221, 83%, 60%);  /* Lighter by 7% */
```

**What updates automatically:**
- ✅ All buttons with `bg-primary`
- ✅ All links with `text-primary`
- ✅ All focus rings with `ring-primary`
- ✅ Charts using `--chart-1` (if tied to primary)

**No manual updates needed** because every component references the CSS variable.

---

## Method 2: Component Changes

Use this when changing a specific component's design (Button, Card, Badge, etc.).

### Step 1: Identify Which Components Are Changing

Ask: "Is this change only for one component or multiple?"

**Examples:**
- "Make buttons rounder" → Single component change
- "Add shadows to all cards" → Single component change
- "Increase padding on all form inputs" → Could be token or component

### Step 2: Update Component Code

**Location:** Component files in `client/src/components/ui/`

Example: Making buttons rounder

```tsx
// client/src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium", /* CHANGE rounded-lg */
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
    },
  }
);
```

### Step 3: Is It Reusable? → Add to Design Tokens

If the change applies to multiple components, add it as a token:

```css
/* design-system/design-tokens.css */
.rounded-component {
  @apply rounded-xl;  /* Larger radius for all interactive elements */
}
```

Then update all components to use the class:
```tsx
<button className="rounded-component">Click me</button>
```

### Step 4: Update Documentation

Add the change to **COMPONENT_PATTERNS.md**:

```markdown
## Button
- **Border Radius:** Now `rounded-xl` (12px) for softer appearance
- **Visual Impact:** Makes buttons more modern and less harsh
```

### Step 5: Test All Variants

For component changes, test:
- All component variants (default, secondary, destructive, etc.)
- All sizes (sm, md, lg)
- Hover/active states
- Mobile responsiveness

---

## Method 3: New Feature Design

Use this when adding a completely new design element or feature.

### Step 1: Create in Figma

Design the new component/feature in your Figma file using the existing design tokens.

### Step 2: Extract Design Values

Document the values you used:
- Colors (from the token library)
- Spacing (from spacing scale: 4px, 8px, 12px, etc.)
- Shadows (from shadow tokens)
- Border radius (from radius tokens)

### Step 3: Add New Component/Pattern

**Location:** `client/src/components/ui/` or relevant feature folder

Create the component using token-based classes:

```tsx
export function NewFeatureComponent() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-md">
      <h2 className="text-lg font-semibold text-foreground">New Feature</h2>
      <p className="text-sm text-muted-foreground">Description</p>
    </div>
  );
}
```

### Step 4: Document the Pattern

Add to **COMPONENT_PATTERNS.md**:

```markdown
## New Feature Component
- **Purpose:** Brief description
- **Colors Used:** `border-border`, `bg-card`, `text-foreground`
- **Spacing:** 24px (6 units)
- **Shadow:** `shadow-md`
- **Responsive:** Mobile: 16px padding, Desktop: 24px padding
- **Code Example:** [link to file]
```

### Step 5: Add to Design Tokens (If Reusable)

If the new feature has a reusable pattern, add it to **design-tokens.css**:

```css
.feature-card {
  @apply rounded-lg border border-border bg-card p-6 shadow-md;
}
```

---

## Prompting Guidelines for AI Agents

When you want to implement a design change, use one of these prompts:

### For Token Changes:
```
"Change [token name] from [current value] to [new value] for [reason].
Update DESIGN_TOKENS.md and verify all components using this token update correctly.
Test: [component list]"
```

**Example:**
```
"Change --primary from hsl(221, 83%, 53%) to hsl(221, 83%, 60%) to make the primary 
blue lighter for better contrast. Update DESIGN_TOKENS.md. Test: All buttons, links, 
focus rings, and chart colors that use the primary token."
```

### For Component Changes:
```
"Update the [component] component to [specific change].
Only update this component. Update COMPONENT_PATTERNS.md.
Test: [specific scenarios]"
```

**Example:**
```
"Update the Button component to use rounded-xl (12px radius) instead of rounded-lg.
Only update this component file. Update COMPONENT_PATTERNS.md to reflect the new 
radius. Test: All button variants, hover states, and mobile display."
```

### For New Features:
```
"Add a new [feature name] component with [description].
Use design tokens from [which tokens].
Add to COMPONENT_PATTERNS.md.
Document in [relevant section]."
```

**Example:**
```
"Add a new AlertCard component with title, description, and close button.
Use: bg-card, border-border, text-foreground, and shadow-md tokens.
Add to COMPONENT_PATTERNS.md under 'Alerts' section.
Make it responsive for mobile and desktop."
```

---

## How Changes Propagate Through the App

### Token Changes → Automatic Propagation ✅

```
Token Updated in index.css
    ↓
Tailwind Regenerates Classes
    ↓
All Components Using Token Update Instantly
    ↓
No Manual Component Updates Needed
```

**Why it works:**
- Components use Tailwind classes like `bg-primary` (not hardcoded `#2563EB`)
- Tailwind classes reference CSS variables
- CSS variables defined in `index.css`
- Change CSS variable → All classes update → All components update

### Component Changes → Manual Updates ⚠️

```
Component File Updated
    ↓
Only That Component Changes
    ↓
Other Components Not Affected
    ↓
May Need to Update Similar Components
```

**Why you might need manual updates:**
- If multiple components use similar styling
- If you want consistency across similar components
- Consider adding to design tokens instead if it's reusable

---

## Verification Checklist

Before considering a design change complete:

- [ ] **For Token Changes:**
  - [ ] Changed CSS variable in correct file (`index.css` or `design-tokens.css`)
  - [ ] Updated `:root` AND `.dark` sections if applicable
  - [ ] Updated DESIGN_TOKENS.md with new values
  - [ ] Tested in at least 3 different components
  - [ ] No broken layouts or visual regressions
  
- [ ] **For Component Changes:**
  - [ ] Updated component file with new design
  - [ ] Updated COMPONENT_PATTERNS.md with pattern details
  - [ ] Tested all variants (if applicable)
  - [ ] Tested on mobile and desktop
  - [ ] No visual regressions in related components

- [ ] **For New Features:**
  - [ ] Component created with token-based classes
  - [ ] Documented in COMPONENT_PATTERNS.md
  - [ ] Added to design-tokens.css if reusable
  - [ ] Works on mobile and desktop
  - [ ] Uses only existing design tokens (no hardcoded colors)

---

## Common Mistakes to Avoid

❌ **Mistake:** Hardcoding colors in component files
```tsx
/* WRONG */
<div className="bg-[#1A1D24]">Card</div>
```
✅ **Right:** Use design tokens
```tsx
/* CORRECT */
<div className="bg-card">Card</div>
```

---

❌ **Mistake:** Changing one component without checking for consistency
```tsx
/* Updating Button but leaving Badge the same */
/* This breaks design consistency */
```
✅ **Right:** Use tokens so similar components stay consistent
```tsx
/* Both Button and Badge use bg-primary - one token change fixes both */
```

---

❌ **Mistake:** Not updating documentation
```tsx
/* Changed primary color but forgot to update DESIGN_TOKENS.md */
/* Now other designers/developers use wrong color value in Figma */
```
✅ **Right:** Always update documentation
```
1. Change CSS variable
2. Update DESIGN_TOKENS.md
3. Notify team if it's a breaking change
```

---

## File Update Sequence

When making design changes, update files in this order:

1. **index.css** or **design-tokens.css** - The source of truth
2. **DESIGN_TOKENS.md** - Update for documentation
3. **Component files** - Only if not a token change
4. **COMPONENT_PATTERNS.md** - Update if component changed
5. **Test** - Verify the change propagates correctly

---

## Example: Complete Design Change Flow

**Goal:** Change primary button color from blue to purple

### Step 1: Update Token
```css
/* client/src/index.css */
--primary: hsl(280, 85%, 55%);  /* Changed from blue hsl(221, 83%, 53%) */
```

### Step 2: Update Documentation
```markdown
# DESIGN_TOKENS.md
| **Primary** | `--primary` | `hsl(280, 85%, 55%)` | `#9333EA` | Buttons, links, accents |
```

### Step 3: Verify
- ✅ All buttons turn purple automatically
- ✅ All links turn purple automatically
- ✅ Focus rings turn purple automatically
- ✅ No component files needed changes

### Step 4: Test
- ✅ Button component looks correct
- ✅ Link colors updated
- ✅ Form focus states updated
- ✅ Mobile still looks good

### Done! 🎉
No manual component updates needed. The change propagated everywhere because all components use the design token.

---

## Support & Questions

For more details on specific components, see **COMPONENT_PATTERNS.md**.  
For detailed token specifications, see **DESIGN_TOKENS.md**.  
For CSS organization, see **CSS_ARCHITECTURE.md**.
