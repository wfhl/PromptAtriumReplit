# PromptAtrium Component Patterns

> **Last Updated:** December 2024  
> **Version:** 1.0.0  
> **Status:** Reference Documentation (No Code Changes)

This document provides reference documentation for existing component patterns used in PromptAtrium. It is designed to help developers understand and consistently use the established UI patterns.

---

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Button Patterns](#button-patterns)
3. [Card Patterns](#card-patterns)
4. [Badge Patterns](#badge-patterns)
5. [Form Patterns](#form-patterns)
6. [Toast Patterns](#toast-patterns)
7. [Navigation Patterns](#navigation-patterns)
8. [Glass-morphism Patterns](#glass-morphism-patterns)
9. [Common Combinations](#common-combinations)

---

## Component Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI Components** | shadcn/ui | Pre-built accessible components |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Variants** | class-variance-authority (cva) | Type-safe component variants |
| **Utilities** | cn() from @/lib/utils | Class name merging |
| **Icons** | lucide-react | Consistent iconography |

### File Locations

```
client/src/components/
├── ui/                    # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   ├── form.tsx
│   └── ...
├── [feature]/             # Feature-specific components
└── ...
```

---

## Button Patterns

### Import

```tsx
import { Button } from "@/components/ui/button"
```

### Variants

| Variant | Usage | Example |
|---------|-------|---------|
| **default** | Primary actions | Save, Submit, Create |
| **secondary** | Secondary actions | Cancel, Back |
| **destructive** | Dangerous actions | Delete, Remove |
| **outline** | Tertiary actions | Edit, View |
| **ghost** | Subtle actions | Close, Dismiss |
| **link** | Navigation actions | Learn more |

### Sizes

| Size | Height | Use Case |
|------|--------|----------|
| **default** | 28px (h-7) | Standard buttons |
| **sm** | 24px (h-6) | Compact UI, tables |
| **xs** | 28px (h-7) | Extra small text |
| **lg** | 44px (h-11) | Hero CTAs, prominent actions |
| **icon** | 40px (h-10 w-10) | Icon-only buttons |

### Usage Examples

```tsx
// Primary action
<Button>Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// With icon
<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add New
</Button>

// Icon only
<Button variant="ghost" size="icon">
  <Settings className="h-4 w-4" />
</Button>

// Loading state
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Saving...
</Button>
```

### Custom Gradient Buttons

For gradient backgrounds, use Tailwind classes with the button:

```tsx
// Library gradient button
<Button className="bg-gradient-to-r from-[#028EC6] via-[#6851C8] to-[#028EC6] hover:opacity-90">
  Library Action
</Button>

// Marketplace gradient button
<Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:opacity-90">
  Marketplace Action
</Button>
```

---

## Card Patterns

### Import

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
```

### Structure

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Main content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Styling

The default Card uses:
- Background: `bg-gray-900/10`
- Border: `border-gray-800`
- Border radius: `rounded-lg`
- Shadow: `shadow-sm`

### Usage Examples

```tsx
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Prompt Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Your prompt content here...</p>
  </CardContent>
</Card>

// Card with actions
<Card>
  <CardHeader>
    <CardTitle>Collection</CardTitle>
    <CardDescription>12 prompts</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">View</Button>
    <Button>Edit</Button>
  </CardFooter>
</Card>

// Interactive card (with hover)
<Card className="cursor-pointer transition-colors hover:bg-accent">
  {/* Content */}
</Card>
```

---

## Badge Patterns

### Import

```tsx
import { Badge } from "@/components/ui/badge"
```

### Variants

| Variant | Usage | Example |
|---------|-------|---------|
| **default** | Primary labels | Pro, New |
| **secondary** | Neutral labels | Draft, Pending |
| **destructive** | Warning labels | Expired, Error |
| **outline** | Subtle labels | Category tags |

### Usage Examples

```tsx
// Status badge
<Badge>Active</Badge>

// Category badge
<Badge variant="outline">Photography</Badge>

// Warning badge
<Badge variant="destructive">Expired</Badge>

// With count
<Badge variant="secondary">
  <Star className="mr-1 h-3 w-3" />
  4.8
</Badge>
```

---

## Form Patterns

### Imports

```tsx
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
```

### Form Structure

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    name: "",
    description: "",
  },
})

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter name..." {...field} />
            </FormControl>
            <FormDescription>
              This will be displayed publicly.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit">Submit</Button>
    </form>
  </Form>
)
```

### Input Styling

Inputs use these default styles:
- Background: `var(--input)`
- Border: `border-input`
- Border radius: `rounded-md`
- Focus: Ring with `ring-ring`

---

## Toast Patterns

### Import

```tsx
import { useToast } from "@/hooks/use-toast"
```

### Usage

```tsx
const { toast } = useToast()

// Success toast
toast({
  title: "Success",
  description: "Your changes have been saved.",
})

// Error toast
toast({
  title: "Error",
  description: "Something went wrong.",
  variant: "destructive",
})

// With action
toast({
  title: "Prompt saved",
  description: "Your prompt has been saved to your library.",
  action: (
    <Button variant="outline" size="sm">
      View
    </Button>
  ),
})
```

### Variants

| Variant | Styling (Tailwind Classes) |
|---------|---------------------------|
| **default** | `border-purple-500/30 bg-purple-500/85 text-white backdrop-blur-md shadow-purple-500/20` |
| **destructive** | `border-destructive bg-destructive text-destructive-foreground` |

### Styling Details

Default toasts use glass-morphism via Tailwind classes:
- Background: `bg-purple-500/85` (purple with 85% opacity)
- Backdrop blur: `backdrop-blur-md`
- Border: `border-purple-500/30` (purple with 30% opacity)
- Shadow: `shadow-purple-500/20` (purple shadow)

---

## Navigation Patterns

### Gradient Text (Active State)

For navigation items with gradient text:

```tsx
// Library section (cyan-purple)
<span className="bg-gradient-to-r from-[#028EC6] via-[#9175FF] to-[#028EC6] bg-clip-text text-transparent">
  Library
</span>

// Community section (yellow-orange)
<span className="bg-gradient-to-r from-[#FFC800] via-[#FF7300] to-[#FFC802] bg-clip-text text-transparent">
  Community
</span>

// Tools section (purple-blue)
<span className="bg-gradient-to-r from-[#8466D6] via-[#128FC4] to-[#8466D6] bg-clip-text text-transparent">
  Tools
</span>

// Marketplace section (green-blue)
<span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
  Marketplace
</span>
```

---

## Glass-morphism Patterns

> **Note:** Some glass patterns are already implemented in existing components (e.g., Toast). The patterns below show how to apply similar effects to custom components.

### Already Implemented

| Component | Location | Glass Effect |
|-----------|----------|--------------|
| **Toast** | `ui/toast.tsx` | `bg-purple-500/85 backdrop-blur-md border-purple-500/30` |
| **Mobile Nav** | `index.css` | Gradient overlay with backdrop-filter |
| **Dropdowns** | `index.css` | Gradient glass overlay |

### Optional Patterns for Custom Components

#### Primary Glass (Blue)

```tsx
<div className="bg-primary/90 backdrop-blur-md border border-primary/30 shadow-lg">
  {/* Content */}
</div>
```

#### Purple Glass

```tsx
<div className="bg-purple-500/85 backdrop-blur-md border border-purple-500/30 shadow-lg shadow-purple-500/20">
  {/* Content */}
</div>
```

#### Overlay Glass (Multi-color Gradient)

```tsx
<div className="bg-gradient-to-br from-[rgba(2,142,198,0.3)] via-[rgba(104,81,200,0.3)] to-[rgba(255,200,2,0.3)] backdrop-blur-md border border-violet-500/30">
  {/* Content */}
</div>
```

### Usage Guidelines

1. **Use Tailwind classes** - Prefer `backdrop-blur-md` over raw CSS
2. **Tailwind handles prefixes** - No need for manual `-webkit-backdrop-filter`
3. Use `backdrop-blur-md` (12px) for standard effects
4. Use `backdrop-blur-xl` (24px) for stronger effects
5. Add subtle borders with `/30` opacity
6. Include shadow for depth

---

## Common Combinations

### Prompt Card

```tsx
<Card className="group cursor-pointer transition-all hover:border-primary/50">
  <CardHeader className="pb-2">
    <div className="flex items-start justify-between">
      <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
      <Badge variant="outline">{category}</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground line-clamp-3">
      {description}
    </p>
  </CardContent>
  <CardFooter className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Heart className="h-4 w-4" />
      {likes}
    </div>
    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
      View
    </Button>
  </CardFooter>
</Card>
```

### Action Bar

```tsx
<div className="flex items-center justify-between p-4 border-t">
  <div className="flex gap-2">
    <Button variant="outline" size="sm">
      Cancel
    </Button>
  </div>
  <div className="flex gap-2">
    <Button variant="secondary" size="sm">
      Save Draft
    </Button>
    <Button size="sm">
      Publish
    </Button>
  </div>
</div>
```

### Search with Filters

```tsx
<div className="flex items-center gap-2">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input placeholder="Search prompts..." className="pl-10" />
  </div>
  <Select>
    <SelectTrigger className="w-[150px]">
      <SelectValue placeholder="Category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Categories</SelectItem>
      <SelectItem value="photography">Photography</SelectItem>
      <SelectItem value="art">Art</SelectItem>
    </SelectContent>
  </Select>
  <Button variant="outline" size="icon">
    <Filter className="h-4 w-4" />
  </Button>
</div>
```

---

## Best Practices

### Do's

1. **Use existing components** - Prefer shadcn/ui components over custom implementations
2. **Extend with className** - Add custom styles via the `className` prop
3. **Use design tokens** - Reference CSS variables from `index.css`
4. **Maintain consistency** - Follow established variant patterns
5. **Add accessibility** - Include proper ARIA labels and keyboard navigation

### Don'ts

1. **Don't modify ui/ components** - Extend via className or create wrappers
2. **Don't use inline styles** - Use Tailwind classes or CSS variables
3. **Don't create duplicate components** - Check if a shadcn component exists first
4. **Don't hardcode colors** - Use design token variables
5. **Don't skip loading states** - Show feedback during async operations

---

## Related Documents

- [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) - All design token definitions
- [BRAND_GUIDELINES.md](../BRAND_GUIDELINES.md) - Visual design specifications
- [design-tokens.css](./design-tokens.css) - Extended CSS variables
