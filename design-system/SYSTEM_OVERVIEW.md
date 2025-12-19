# PromptAtrium System Overview

> **Purpose:** Complete system-level architecture for understanding how all features interact  
> **Audience:** Developers, architects, designers planning redesigns  
> **Created:** December 2024  
> **Last Updated:** December 2024

---

## Executive Summary

PromptAtrium is a comprehensive AI prompt management platform with five major subsystems:

1. **Prompt Database** - Store, organize, and share AI prompts
2. **Prompt Generator** - Create prompts using templates and AI enhancement
3. **Wordsmith Codex** - Browse and assemble prompt building blocks
4. **Marketplace** - Buy/sell prompts with Stripe Connect payments
5. **Communities** - Organize users and share content within groups

All features share a common foundation:
- **Authentication** via Replit Auth (OIDC)
- **Database** via PostgreSQL with Drizzle ORM
- **Object Storage** via Google Cloud Storage
- **AI Services** via OpenAI GPT-4o / Google Gemini

---

## A. C4 System Context Diagram (Level 1)

This diagram shows PromptAtrium as a black box and its relationships with external actors and systems.

```mermaid
C4Context
    title PromptAtrium - System Context

    Person(user, "End User", "Creates, browses, and purchases AI prompts")
    Person(admin, "Admin", "Manages users, communities, and system settings")
    Person(seller, "Seller", "Lists prompts for sale in marketplace")

    System(promptatrium, "PromptAtrium", "AI prompt management platform with library, generator, marketplace, and communities")

    System_Ext(replitAuth, "Replit Auth", "OIDC authentication provider")
    System_Ext(stripe, "Stripe", "Payment processing and Connect payouts")
    System_Ext(openai, "OpenAI", "GPT-4o for prompt enhancement and refinement")
    System_Ext(gemini, "Google Gemini", "Alternative LLM provider")
    System_Ext(gcs, "Google Cloud Storage", "Object storage for images and files")
    System_Ext(postgres, "PostgreSQL (Neon)", "Primary database")

    Rel(user, promptatrium, "Uses", "HTTPS")
    Rel(admin, promptatrium, "Manages", "HTTPS")
    Rel(seller, promptatrium, "Sells prompts", "HTTPS")
    
    Rel(promptatrium, replitAuth, "Authenticates users", "OIDC")
    Rel(promptatrium, stripe, "Processes payments", "API + Webhooks")
    Rel(promptatrium, openai, "Enhances prompts", "API")
    Rel(promptatrium, gemini, "Alternative LLM", "API")
    Rel(promptatrium, gcs, "Stores files", "API")
    Rel(promptatrium, postgres, "Persists data", "TCP")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

## B. C4 Container Diagram (Level 2)

This diagram shows the major containers (deployable units) within PromptAtrium.

```mermaid
C4Container
    title PromptAtrium - Container Architecture

    Person(user, "User", "End user of the platform")

    Container_Boundary(frontend_boundary, "Client Layer") {
        Container(spa, "React SPA", "React, TypeScript, TanStack Query", "Single-page application with client-side routing")
    }

    Container_Boundary(backend_boundary, "Server Layer") {
        Container(api, "Express API", "Node.js, Express, TypeScript", "RESTful API handling all business logic")
        Container(auth, "Auth Module", "Passport, OIDC", "Session management and authentication")
        Container(webhooks, "Webhook Handlers", "Express routes", "Stripe webhook processing")
    }

    Container_Boundary(storage_boundary, "Data Layer") {
        ContainerDb(db, "PostgreSQL", "Neon-backed", "Primary relational database")
        Container(objectStore, "Object Storage", "Google Cloud Storage", "Images and file assets")
    }

    Container_Boundary(external_boundary, "External Services") {
        System_Ext(replitAuth, "Replit Auth", "OIDC Provider")
        System_Ext(openai, "OpenAI API", "LLM Enhancement")
        System_Ext(stripe, "Stripe", "Payments")
    }

    Rel(user, spa, "Uses", "HTTPS")
    Rel(spa, api, "API calls", "JSON/REST")
    Rel(api, auth, "Validates sessions")
    Rel(api, db, "Queries", "Drizzle ORM")
    Rel(api, objectStore, "Uploads/downloads", "GCS API")
    Rel(auth, replitAuth, "Verifies tokens", "OIDC")
    Rel(api, openai, "Enhancement requests", "API")
    Rel(api, stripe, "Payment intents", "API")
    Rel(stripe, webhooks, "Payment events", "Webhooks")
    Rel(webhooks, db, "Updates orders", "SQL")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

---

## C. Feature Module Architecture

This diagram shows how the five major feature modules are organized within the application.

```mermaid
C4Component
    title PromptAtrium - Feature Modules

    Container_Boundary(features, "Feature Modules") {
        Component(promptDb, "Prompt Database", "React + API", "CRUD for prompts, likes, favorites, collections")
        Component(generator, "Prompt Generator", "React + API + LLM", "Template-based generation with AI enhancement")
        Component(codex, "Wordsmith Codex", "React + API", "Term browsing, assembly, presets")
        Component(marketplace, "Marketplace", "React + API + Stripe", "Listings, orders, payouts")
        Component(communities, "Communities", "React + API", "Groups, memberships, sharing")
    }

    Container_Boundary(shared, "Shared Services") {
        Component(auth, "Authentication", "Passport OIDC", "User sessions and roles")
        Component(storage, "Storage Interface", "IStorage", "Database abstraction")
        Component(notifications, "Notifications", "API + DB", "User notifications")
        Component(activities, "Activity Feed", "API + DB", "User actions tracking")
        Component(credits, "Credits System", "API + DB", "Gamification and rewards")
    }

    Container_Boundary(data, "Shared Data") {
        ComponentDb(users, "users", "Table", "Central user accounts")
        ComponentDb(prompts, "prompts", "Table", "Shared by DB, Generator, Marketplace")
        ComponentDb(notifs, "notifications", "Table", "Cross-feature notifications")
    }

    Rel(promptDb, storage, "Uses")
    Rel(generator, storage, "Uses")
    Rel(codex, storage, "Uses")
    Rel(marketplace, storage, "Uses")
    Rel(communities, storage, "Uses")

    Rel(promptDb, prompts, "CRUD")
    Rel(generator, prompts, "Creates")
    Rel(marketplace, prompts, "Lists")

    Rel(promptDb, auth, "Requires")
    Rel(generator, auth, "Requires")
    Rel(marketplace, auth, "Requires")
    Rel(communities, auth, "Requires")

    Rel(promptDb, notifications, "Triggers")
    Rel(marketplace, notifications, "Triggers")
    Rel(communities, notifications, "Triggers")

    Rel(promptDb, activities, "Logs")
    Rel(generator, activities, "Logs")
    Rel(marketplace, activities, "Logs")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

---

## D. Cross-Feature Data Flow

This diagram shows how data flows between features in common user scenarios.

```mermaid
flowchart TB
    subgraph User["👤 User Actions"]
        A[Browse Codex Terms]
        B[Generate Prompt]
        C[Save to Library]
        D[List on Marketplace]
        E[Share to Community]
    end

    subgraph Codex["🔤 Wordsmith Codex"]
        C1[codex_categories]
        C2[codex_terms]
        C3[prompt_components]
        C4[aesthetics]
        C5[codex_assembled_strings]
    end

    subgraph Generator["⚡ Prompt Generator"]
        G1[prompt_templates]
        G2[character_presets]
        G3[prompt_history]
        G4[user_prompt_memory]
        G5["OpenAI/Gemini API"]
    end

    subgraph Library["📚 Prompt Database"]
        L1[prompts]
        L2[collections]
        L3[prompt_likes]
        L4[prompt_favorites]
    end

    subgraph Market["💰 Marketplace"]
        M1[marketplace_listings]
        M2[marketplace_orders]
        M3[transaction_ledger]
        M4[seller_profiles]
    end

    subgraph Community["👥 Communities"]
        CM1[communities]
        CM2[user_communities]
        CM3[prompt_community_sharing]
    end

    subgraph Shared["🔗 Shared Services"]
        S1[users]
        S2[notifications]
        S3[activities]
        S4[user_credits]
    end

    A --> C1 & C2 & C3 & C4
    C1 & C2 --> C5
    C5 -->|"Send to Prompter"| G1

    B --> G1 & G2
    G1 --> G5
    G5 --> G3
    G3 -->|"Save to Library"| L1

    C --> L1
    L1 --> L2 & L3 & L4

    D --> L1
    L1 -->|"Create Listing"| M1
    M1 --> M2
    M2 --> M3

    E --> L1
    L1 -->|"Share"| CM3
    CM3 --> CM1

    L1 --> S3
    M2 --> S2
    CM3 --> S2

    S1 -.->|"Owns"| L1 & M1 & CM1
```

---

## E. Key Cross-Feature Scenarios

### Scenario 1: Prompt Creation Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant Codex as Wordsmith Codex
    participant Generator as Prompt Generator
    participant Library as Prompt Database
    participant Market as Marketplace

    Note over User,Market: COMPLETE PROMPT CREATION FLOW
    
    User->>Codex: Browse & assemble terms
    Codex-->>User: "Dramatic Lighting, Neon Colors..."
    
    User->>Generator: Send terms to Quick Prompter
    Generator->>Generator: Apply template
    Generator->>Generator: AI enhancement
    Generator-->>User: Enhanced prompt
    
    User->>Library: Save to library
    Library->>Library: Create prompt record
    Library-->>User: Prompt saved
    
    User->>Market: List for sale
    Market->>Market: Create listing
    Market->>Market: Set price
    Market-->>User: Listed on marketplace
```

### Scenario 2: Marketplace Purchase Flow

```mermaid
sequenceDiagram
    participant Buyer
    participant Market as Marketplace
    participant Stripe as Stripe API
    participant Webhook as Webhook Handler
    participant Seller
    participant Ledger as Transaction Ledger

    Note over Buyer,Ledger: PURCHASE & PAYOUT FLOW
    
    Buyer->>Market: Click "Buy"
    Market->>Stripe: Create PaymentIntent
    Stripe-->>Market: clientSecret
    Market-->>Buyer: Show Stripe checkout
    
    Buyer->>Stripe: Submit payment
    Stripe->>Webhook: payment_intent.succeeded
    Webhook->>Market: Create order (status: completed)
    Webhook->>Ledger: Record transaction
    Webhook->>Ledger: Calculate commission (15%)
    Webhook->>Ledger: Record seller credit
    
    Market-->>Buyer: Download prompt
    
    Note over Seller: Weekly payout batch
    Ledger->>Stripe: Create Transfer to Connected Account
    Stripe-->>Seller: Funds deposited
```

### Scenario 3: Community Sharing Flow

```mermaid
sequenceDiagram
    participant User
    participant Library as Prompt Database
    participant Share as Sharing System
    participant Community as Community
    participant Member as Community Member
    participant Notif as Notifications

    Note over User,Notif: COMMUNITY SHARING FLOW
    
    User->>Library: Select prompt
    User->>Share: Click "Share to Community"
    Share->>Share: Show community picker
    User->>Share: Select "Cyberpunk Artists"
    
    Share->>Community: Verify membership
    Community-->>Share: ✓ User is member
    
    Share->>Share: Create prompt_community_sharing record
    Share->>Notif: Notify community members
    
    Notif-->>Member: "User shared 'Neon Portrait' in Cyberpunk Artists"
    
    Member->>Community: View community prompts
    Community->>Library: Fetch shared prompts
    Library-->>Member: Display shared prompt
```

---

## F. Shared Data Contracts

### Tables Used by Multiple Features

| Table | Prompt DB | Generator | Codex | Marketplace | Communities |
|-------|:---------:|:---------:|:-----:|:-----------:|:-----------:|
| `users` | ✅ Owner | ✅ Owner | ✅ Owner | ✅ Buyer/Seller | ✅ Member |
| `prompts` | ✅ CRUD | ✅ Creates | ❌ | ✅ Lists | ✅ Shares |
| `collections` | ✅ Groups | ❌ | ❌ | ❌ | ✅ Shares |
| `activities` | ✅ Logs | ✅ Logs | ❌ | ✅ Logs | ✅ Logs |
| `notifications` | ✅ Receives | ❌ | ❌ | ✅ Receives | ✅ Receives |
| `user_credits` | ❌ | ❌ | ❌ | ✅ Earns | ❌ |

### Data Ownership Rules

| Entity | Owner | Can Modify | Can View |
|--------|-------|------------|----------|
| `prompt` | `userId` | Owner only | Owner + Public viewers + Community members |
| `collection` | `userId` | Owner + Collaborators | Owner + Public viewers |
| `listing` | `sellerId` | Seller only | Everyone |
| `order` | `buyerId` | System only | Buyer + Seller |
| `community` | `createdBy` | Admins | Public or Members |

---

## G. Cross-Cutting Concerns

### Authentication Flow

```mermaid
flowchart LR
    subgraph Client
        A[React App]
    end

    subgraph Server
        B[Express API]
        C[Passport Middleware]
        D[Session Store]
    end

    subgraph External
        E[Replit Auth OIDC]
    end

    A -->|"1. Login redirect"| E
    E -->|"2. Auth code"| A
    A -->|"3. Code to server"| B
    B -->|"4. Exchange for tokens"| E
    E -->|"5. ID token + claims"| B
    B -->|"6. Create session"| D
    D -->|"7. Session cookie"| A
    A -->|"8. Authenticated requests"| C
    C -->|"9. Validate session"| D
```

### Rate Limiting Configuration

| Endpoint Pattern | Limiter | Requests | Window |
|------------------|---------|----------|--------|
| `/api/auth/*` | `authLimiter` | 10 | 15 min |
| `/api/prompts` (POST) | `promptCreationLimiter` | 20 | 1 hour |
| `/api/prompts` (GET) | `searchLimiter` | 100 | 1 min |
| `/api/enhance-prompt` | `strictApiLimiter` | 10 | 1 min |
| `/api/marketplace/*` | `apiLimiter` | 100 | 15 min |
| `/api/objects/upload` | `imageUploadLimiter` | 20 | 1 hour |

### Role-Based Access Control

| Role | Prompt DB | Generator | Codex | Marketplace | Communities | Admin |
|------|:---------:|:---------:|:-----:|:-----------:|:-----------:|:-----:|
| `user` | ✅ | ✅ | ✅ | ✅ Buyer | ✅ Member | ❌ |
| `seller` | ✅ | ✅ | ✅ | ✅ Full | ✅ Member | ❌ |
| `community_admin` | ✅ | ✅ | ✅ | ✅ | ✅ Admin | ❌ |
| `global_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Limited |
| `super_admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Full |

---

## H. Event & Notification Catalog

### Events That Trigger Notifications

| Event | Source Feature | Notification Type | Recipients |
|-------|----------------|-------------------|------------|
| Prompt liked | Prompt DB | `like` | Prompt owner |
| Prompt favorited | Prompt DB | `favorite` | Prompt owner |
| Prompt branched | Prompt DB | `branch` | Original author |
| New follower | Profile | `follow` | Followed user |
| Order completed | Marketplace | `purchase` | Seller |
| Payout sent | Marketplace | `payout` | Seller |
| Community invite | Communities | `invite` | Invited user |
| Prompt shared | Communities | `share` | Community members |
| Contribution approved | Codex | `contribution_approved` | Contributor |

### Activity Types Logged

| Action Type | Feature | Logged Data |
|-------------|---------|-------------|
| `created_prompt` | Prompt DB | promptId, promptName |
| `liked_prompt` | Prompt DB | promptId |
| `followed_user` | Profile | followedUserId |
| `created_listing` | Marketplace | listingId, price |
| `completed_purchase` | Marketplace | orderId, amount |
| `joined_community` | Communities | communityId |

---

## I. Glossary

| Term | Definition |
|------|------------|
| **Prompt** | AI generation instruction stored in the database |
| **Collection** | User-created folder for organizing prompts |
| **Template** | Reusable prompt structure with placeholders |
| **Character Preset** | Predefined character description for templates |
| **Codex Term** | Individual prompt building block (word/phrase) |
| **Assembled String** | Collection of codex terms saved as preset |
| **Listing** | Prompt offered for sale in marketplace |
| **Order** | Completed marketplace transaction |
| **Ledger Entry** | Financial record of marketplace transaction |
| **Community** | User group for sharing content |
| **Sub-community** | Nested community under a parent |

---

## J. Documentation Traceability

| Feature | Architecture Doc | Data Objects Doc | Diagrams Doc |
|---------|------------------|------------------|--------------|
| Prompt Database | `PROMPT_DATABASE_ARCHITECTURE.md` | `DATA_OBJECT_REFERENCE.md` | `PROMPT_DATABASE_DIAGRAMS.md` |
| Prompt Generator | `PROMPT_GENERATOR_ARCHITECTURE.md` | `GENERATOR_DATA_OBJECTS.md` | `PROMPT_GENERATOR_DIAGRAMS.md` |
| Wordsmith Codex | `WORDSMITH_CODEX_ARCHITECTURE.md` | `CODEX_DATA_OBJECTS.md` | `WORDSMITH_CODEX_DIAGRAMS.md` |
| **System-Wide** | **This document** | — | — |

---

## K. Quick Navigation

**For Redesign Planning:**
- Start here → Understand feature boundaries
- Then → Read individual feature diagrams for details

**For Debugging:**
- Check sequence diagrams in feature-specific docs
- Trace data flow using this overview

**For New Features:**
- Identify which existing features to integrate with
- Follow data ownership and notification patterns

---

This system overview provides the "30,000 foot view" needed to understand how PromptAtrium works as a complete system.
