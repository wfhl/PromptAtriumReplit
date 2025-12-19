# PromptAtrium - AI Prompt Management Platform

## Overview
A comprehensive platform for managing, sharing, and generating AI prompts. Features include a prompt library, community sharing, collections management, advanced prompt generation tools, and a complete marketplace payment infrastructure.

## Recent Updates (December 01, 2025)

### AI-Powered Prompt Refinement Chat Interface
- **Chat-Style Prompt Refinement**: Added conversational AI interface for iteratively improving generated prompts in the Quick Prompt tool
- **Per-User Memory System**: Implemented persistent preference learning that remembers user's preferred styles, themes, modifiers, and avoided terms across sessions
- **Database Schema**: New tables for `prompt_refinement_conversations`, `prompt_refinement_messages`, and `user_prompt_memory`
- **Conversation History**: Users can view and resume previous refinement conversations
- **Preference Learning**: AI automatically extracts and learns preferences from conversations with Zod validation and size limits
- **Secure Implementation**: Fixed authentication to use Replit Auth (`claims.sub`), added ownership verification on all endpoints, validated AI-generated preference data
- **Integration**: "Refine with AI" button appears after generating a prompt, allowing authenticated users to chat with AI for improvements
- **OpenAI Integration**: Uses Replit AI Integrations with GPT-5 for intelligent prompt refinement (no API key required, charges billed to credits)

## Recent Updates (November 09, 2025)

### Marketplace Payment Infrastructure Implementation
- **Transaction Ledger System**: Implemented comprehensive database schema with `transaction_ledger`, `payout_batches`, and `platform_settings` tables for tracking all financial movements (purchases, commissions, refunds, payouts)
- **Automated Stripe Connect Integration**: Built PaymentService class handling order completion, commission calculation, and automated transfers to connected seller accounts
- **Webhook Event Processing**: Created robust webhook handlers for real-time payment events (payment_intent.succeeded, transfer.created/failed, payout.paid/failed, charge.refunded)
- **Commission Management UI**: Added admin interface (`CommissionSettings.tsx`) for configuring platform commission rates, payout schedules, processing fees, with fee calculator for transparency
- **Transaction Reporting Dashboards**: Built comprehensive dashboards for admins (`TransactionDashboard.tsx`) and sellers (`SellerTransactionDashboard.tsx`) with metrics, history, and export capabilities
- **CSV/JSON Export**: Added export endpoints for transaction data in both CSV and JSON formats for admins and sellers
- **Payout Scheduling Service**: Implemented `PayoutScheduler` service with configurable frequencies (daily/weekly/biweekly/monthly), minimum thresholds, and automatic batch processing
- **Security Enhancements**: Added `isSuperAdmin` middleware for admin-only endpoints, proper transaction integrity management, and idempotent webhook handling
- **Critical Bug Fixes**: 
  - Fixed ledger corruption in webhook handlers by restricting updates to specific transaction types
  - Resolved duplicate refund issue by properly handling Stripe webhook notifications without creating new refunds
  - Fixed import errors preventing webhook handler from loading

## Recent Updates (October 31, 2025)

### Mobile UI Improvements
- **Fixed Mobile Member Management**: Added dropdown menu for role changes and member removal on mobile devices
- **Date Display Fix**: Resolved "Invalid Date" issue in member management modal with proper fallback handling
- **Community Tab Bar Optimization**: Tab bar now only shows when user is a member of at least one private community, reducing UI clutter

### Member Prompt Publishing Enhancement
- **Added Prompt Creation for Regular Members**: Regular members can now create and publish prompts to private communities they belong to
- **Community Page Enhancement**: Added "Add Prompt" button to the Community page's prompts tab, visible to all authenticated users
- **Equal Access**: Both SuperAdmins and regular members now have equal access to publish prompts to communities they belong to
- **Private Community Support**: Members can navigate to and publish prompts in private communities they are members of

### Community Sharing System Fixes
- **Fixed Infinite Loop in Dropdown**: Removed conflicting event handlers (onSelect with preventDefault) in community dropdown checkboxes
- **Fixed Community Tab Visibility**: Community tabs now always show for logged-in users for consistency
- **Fixed Community Display Issue**: Updated CommunityVisibilitySelector to properly fetch and display user's communities
- **Database Fix**: Created prompt_community_sharing table for multi-community prompt sharing
- **API Integration**: Connected visibility updates to properly update both prompt visibility and community sharing

## Recent Updates (October 26, 2025)

### My Activity Tab - Prompt Links Fix
- **Fixed Prompt Name Links**: Made prompt names in the My Activity tab clickable and linked to their respective prompt detail pages at `/prompt/{id}`
- **Consistent Navigation**: Aligned prompt link behavior with user and collection links for consistent user experience
- **Visual Feedback**: Added hover effects to prompt links (underline on hover) for better interactivity

## Recent Updates (October 26, 2025)

### Sub-Community System Implementation
- **Hierarchical Community Structure**: Implemented parent-child relationships for communities with materialized path pattern
- **Sub-Community Admin Roles**: Added new role type with delegated administration capabilities
- **Advanced Permission System**: Created comprehensive RBAC middleware for sub-community access control
- **Invitation System**: Sub-community specific invites with role assignment and usage tracking
- **Content Isolation**: Prompts can be shared with three visibility levels (public, members_only, admins_only)
- **Frontend Management**: Complete UI for browsing, managing, and administering sub-communities
- **Admin Dashboard**: Dedicated dashboard for sub-community administrators with member management
- **Data Migration**: Safe migration system for existing communities to adopt hierarchy structure
- **Test Coverage**: 100% test pass rate on permission and access control scenarios
- **User Documentation**: Comprehensive guide at /docs/sub-communities explaining features for both members and administrators

## Recent Updates (October 19, 2025)

### Custom Character Preset Cross-Device Persistence Fix
- **Fixed API Endpoint Mismatch**: Corrected character preset endpoints in frontend components from `/api/character-presets` to `/api/system-data/character-presets`
- **Affected Components**: Updated QuickPromptPlay.tsx, QuickPrompt.tsx, and CompactCharacterSaveDialog.tsx to use correct endpoints
- **Authentication Integration**: Character presets now properly save with userId for authenticated users, enabling cross-device persistence
- **Consistent Data Access**: Users' custom character presets will now appear across all their devices when logged in

## Recent Updates (September 23, 2025)

### Quick Prompt Component Enhancements
- **Image Analysis Improvements**: Fixed image analysis section to collapse/expand properly without clearing data
- **New Template Options**: Added two special template options to the Enhanced Template dropdown:
  - "Image Vision Analysis Only" - Returns only the image vision analysis results
  - "Social Media Post Caption" - Generates social media captions with tone selection
- **Tone Selector**: When "Social Media Post Caption" is selected, a tone dropdown appears with options like Professional, Casual, Funny, Inspirational, etc.
- **Improved UX**: Image analysis now persists when uploading new images, only collapsing the view rather than clearing the data

## Recent Updates (September 19, 2025)

### Quick Prompt Generator Integration
- Added Quick Prompt Generator tool at `/tools/quick-prompter`
- Integrated components from the QUICKPROMPT package
- Features include:
  - Template-based prompt generation (Photography, Artistic, Cinematic, etc.)
  - Character preset selection with custom input
  - Random scenario generation
  - Prompt enhancement with professional details
  - Social media caption generation
  - Copy to clipboard functionality
  - Save to library with auto-populated metadata

### Quick Prompt Save Enhancements
- **Auto-fill AI Metadata**: Save button now automatically triggers AI-powered name generation
- **Template Information Storage**: Template data is saved with prompts in the promptStyle field
- **Seamless Save Flow**: ShareToLibraryModal automatically generates metadata when opened from quick prompt
- **Fixed API Endpoints**: Corrected API endpoints from /api/saved-prompts to /api/prompts
- **Metadata Generation Endpoint**: Added `/api/generate-prompt-metadata` endpoint for AI-powered metadata generation

## Project Structure

### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **UI Components**: Shadcn/ui + Tailwind CSS
- **Authentication**: Replit Auth with OIDC

### Backend (`server/`)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Google Cloud Storage for images
- **Authentication**: Passport with OIDC strategy

### Key Features

#### 1. Prompt Management
- Create, edit, and organize prompts
- Rich metadata (categories, tags, models)
- Version history and branching
- Public/private visibility controls

#### 2. Community Features
- Public prompt sharing
- Like and favorite system
- User profiles with statistics
- Activity feed

#### 3. Collections
- Organize prompts into collections
- Public/private collections
- Collaborative collections

#### 4. Tools
- **Aspect Ratio Calculator**: Calculate and convert aspect ratios
- **Metadata Analyzer**: Analyze image metadata
- **Quick Prompt Generator**: Advanced prompt generation with templates

#### 5. Admin Features
- User management
- Community management
- System statistics
- Developer tools

## User Preferences
- Dark mode preferred for UI
- Emphasis on visual design with card-based layouts
- Toast notifications for user feedback
- Mobile-responsive design

## Design System

The application includes a comprehensive design system located in `design-system/`:

### Documentation Files
- `README.md` - Overview and quick start guide
- `DESIGN_TOKENS.md` - Complete token definitions (colors, spacing, shadows)
- `COMPONENT_PATTERNS.md` - Component usage examples and patterns
- `CSS_ARCHITECTURE.md` - CSS file structure and organization guide
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

See `BRAND_GUIDELINES.md` for detailed visual specifications.

## Technical Decisions

### Database Schema
- Users table with profile information
- Prompts table with rich metadata
- Collections for organization
- Activity tracking for engagement
- Communities for group collaboration

### API Structure
- RESTful endpoints under `/api`
- Authentication required for user-specific operations
- Public endpoints for community content
- Rate limiting and security measures

### File Storage
- Images stored in Google Cloud Storage
- Public/private bucket separation
- Direct serving with access control

## Development Guidelines

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Async/await for asynchronous operations
- Comprehensive error handling

### Testing
- End-to-end testing with Playwright
- Component testing for critical features
- API endpoint testing

### Security
- Input validation with Zod
- SQL injection prevention with Drizzle ORM
- XSS protection
- CORS configuration
- Rate limiting

## Deployment

The application is configured for deployment on Replit with:
- Automatic HTTPS
- Environment variable management
- PostgreSQL database
- Object storage integration
- Custom domain support

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REPL_ID`: Replit instance identifier
- `REPLIT_DB_URL`: Replit database URL
- Object storage credentials (auto-configured)

## Quick Start

1. The application runs on port 5000
2. Access at `https://[your-repl-name].replit.app`
3. Login with Replit Auth
4. Start creating and sharing prompts!

## Recent Changes

- **September 19, 2025**: Integrated Quick Prompt Generator from QUICKPROMPT package
- Added comprehensive prompt generation tools
- Mock data implementation for templates and character presets
- Full test coverage for Quick Prompter functionality

## Known Issues

- Toast notifications occasionally have timing issues in tests (visual confirmation works)
- Some object storage URLs show fallback warnings in development (non-critical)

## Future Enhancements

- Real-time collaboration on prompts
- AI-powered prompt suggestions
- Advanced search and filtering
- Export/import functionality
- API access for developers
- Mobile app companion