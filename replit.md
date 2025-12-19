# PromptAtrium - AI Prompt Management Platform

## Overview
PromptAtrium is a comprehensive platform designed for managing, sharing, and generating AI prompts. Its purpose is to empower users with tools for organizing, collaborating on, and enhancing AI prompts. Key capabilities include a robust prompt library, community sharing features, collections management, advanced prompt generation tools, and a complete marketplace payment infrastructure. The platform aims to be the go-to solution for AI prompt engineers, creators, and enthusiasts, fostering a vibrant community and enabling monetization opportunities through its marketplace.

## User Preferences
- Dark mode preferred for UI
- Emphasis on visual design with card-based layouts
- Toast notifications for user feedback
- Mobile-responsive design

## System Architecture

### UI/UX Decisions
The application employs a dark-first design with deep blue-gray backgrounds, accented with glass-morphism effects for interactive elements like toasts, dropdowns, and navigation. Gradient accents are used for section branding (Library, Community, Tools, Marketplace). The UI emphasizes card-based layouts and provides toast notifications for user feedback. The design is mobile-responsive. A comprehensive design system, including design tokens, component patterns, and CSS architecture, is documented and integrated.

### Technical Implementations
- **Frontend**: Built with React, TypeScript, Wouter for routing, TanStack Query v5 for state management, and Shadcn/ui + Tailwind CSS for UI components. Authentication is handled via Replit Auth with OIDC.
- **Backend**: Utilizes Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Storage**: Google Cloud Storage for image assets.
- **Authentication**: Passport with OIDC strategy for the backend.
- **AI Integration**: Uses Replit AI Integrations with GPT-5 for intelligent prompt refinement and metadata generation.
- **Payment Processing**: Automated Stripe Connect integration for marketplace transactions, commission calculation, and payouts, supported by a transaction ledger system and robust webhook handlers.

### Feature Specifications
- **Prompt Management**: Features include creation, editing, organization with rich metadata (categories, tags, models), version history, and public/private visibility.
- **Community Features**: Supports public prompt sharing, like/favorite systems, user profiles, activity feeds, and a hierarchical sub-community structure with delegated administration and RBAC.
- **Collections**: Allows users to organize prompts into public, private, and collaborative collections.
- **Tools**: Includes an Aspect Ratio Calculator, Metadata Analyzer, and an advanced Quick Prompt Generator with template-based generation, character presets, random scenario generation, prompt enhancement, social media caption generation, and AI-powered metadata auto-filling.
- **Prompt Refinement**: An AI-powered chat interface allows for iterative improvement of generated prompts, with per-user memory for learning preferences and persistent conversation history.
- **Admin Features**: User management, community management, system statistics, and developer tools.

### System Design Choices
- **Database Schema**: Structured with tables for users, prompts, collections, activities, communities, prompt sharing, transaction ledger, payout batches, and system settings. New tables for `prompt_refinement_conversations`, `prompt_refinement_messages`, and `user_prompt_memory` support AI features.
- **API Structure**: RESTful endpoints under `/api` with authentication for user-specific operations, public endpoints for community content, and rate limiting.
- **Security**: Employs input validation with Zod, SQL injection prevention (Drizzle ORM), XSS protection, CORS configuration, and rate limiting. `isSuperAdmin` middleware secures admin-only endpoints.
- **Development Guidelines**: Adheres to TypeScript for type safety, functional components with hooks, async/await, and comprehensive error handling. Testing includes end-to-end (Playwright), component, and API endpoint testing.

## Design System

The application includes a comprehensive design system located in `design-system/`:

### Documentation Files
- `README.md` - Overview and quick start guide
- `DESIGN_TOKENS.md` - Complete token definitions (colors, spacing, shadows)
- `COMPONENT_PATTERNS.md` - Component usage examples and patterns
- `CSS_ARCHITECTURE.md` - CSS file structure and organization guide
- `DESIGN_CHANGE_WORKFLOW.md` - Step-by-step guide for implementing design changes and prompting workflows
- `FIGMA_DESIGN_TOKENS.json` - Figma-ready token export (copy-paste into Figma Tokens plugin)
- `PROMPT_DATABASE_ARCHITECTURE.md` - Complete frontend-backend-database flow with Mermaid.js sequence diagrams
- `DATA_OBJECT_REFERENCE.md` - Quick-reference guide for all prompt-related data objects
- `PROMPT_GENERATOR_ARCHITECTURE.md` - **NEW** Prompt generator flow with sequence diagram (templates, characters, AI enhancement)
- `GENERATOR_DATA_OBJECTS.md` - **NEW** Quick reference for generator-specific data objects
- `design-tokens.css` - Extended CSS custom properties

### Key Design Principles
- **Dark-first design** with deep blue-gray backgrounds
- **Glass-morphism effects** for toasts, dropdowns, and navigation
- **Gradient accents** for section branding (Library, Community, Tools, Marketplace)
- **Consistent tokens** using CSS custom properties

### Core Token Categories
- Semantic colors (`--primary`, `--secondary`, `--destructive`, `--success`, `--warning`)
- Surface colors (`--card`, `--popover`, `--sidebar`)
- Shadow scale (`--shadow-xs` through `--shadow-2xl`)
- Typography (`--font-sans`, `--font-serif`, `--font-mono`)

### Design Change Workflow
For implementing design changes effectively:
1. **Token Changes** - Update CSS variables in `index.css` → automatically propagates to all components
2. **Component Changes** - Update specific components in `client/src/components/ui/`
3. **New Features** - Use token-based classes from existing design tokens

See `BRAND_GUIDELINES.md` for detailed visual specifications and `DESIGN_CHANGE_WORKFLOW.md` for implementation guidance.

## External Dependencies
- **Replit Auth**: For user authentication.
- **Replit AI Integrations (GPT-5)**: For AI-powered prompt refinement and metadata generation.
- **PostgreSQL**: Primary database.
- **Google Cloud Storage**: For storing image assets.
- **Stripe Connect**: For marketplace payment processing, including automated transfers and webhook handling.
