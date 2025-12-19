# PromptAtrium - Comprehensive Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [API Reference](#api-reference)
5. [Deployment Guide](#deployment-guide)
6. [User Guide](#user-guide)
7. [Admin Guide](#admin-guide)
8. [Developer Guide](#developer-guide)
9. [Security & Compliance](#security--compliance)
10. [Troubleshooting](#troubleshooting)

---

## Overview

PromptAtrium is a comprehensive AI prompt management platform that enables users to create, organize, share, and enhance prompts for various AI image generation models. The platform features a rich set of tools for prompt generation, community collaboration, and advanced metadata management.

### Key Capabilities
- **Multi-Model Support**: Optimized prompts for Stable Diffusion, Midjourney, FLUX, DALL-E, and custom pipelines
- **Community Platform**: Share prompts publicly, follow creators, build collections
- **Advanced Tools**: Quick Prompt Generator, Metadata Analyzer, Image Vision Analysis
- **Enterprise Features**: Role-based access control, community management, admin dashboard
- **AI Integration**: LLM-powered enhancement, image analysis, metadata generation

---

## Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query v5 (React Query)
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **Build Tool**: Vite

#### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon-backed on Replit)
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth with Google OAuth2
- **Storage**: Google Cloud Storage (via Replit Object Storage)
- **Session Management**: Express-session with PostgreSQL store

#### External Services
- **AI/LLM Providers**: 
  - OpenAI (GPT-4, GPT-4 Vision)
  - Google Gemini
  - Anthropic Claude
  - Custom Vision Server (Florence-2)
- **Cloud Services**:
  - Google Drive API (export functionality)
  - Google Sheets API (data import)
- **Analytics**: Custom activity tracking

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐
│                 │         │                  │
│   React App     │◄────────┤   Express API    │
│   (Vite Dev)    │         │   (Port 5000)    │
│                 │         │                  │
└─────────────────┘         └────────┬─────────┘
                                      │
                    ┌─────────────────┴──────────────┐
                    │                                │
            ┌───────▼────────┐            ┌─────────▼────────┐
            │                │            │                  │
            │  PostgreSQL    │            │  Object Storage  │
            │   (Drizzle)    │            │     (GCS)        │
            │                │            │                  │
            └────────────────┘            └──────────────────┘
```

---

## Features

### Core Features

#### 1. Prompt Management
- **CRUD Operations**: Create, read, update, delete prompts
- **Rich Metadata**: Categories, tags, models, styles, templates
- **Version Control**: Branch prompts, track history
- **Visibility Control**: Public/private/NSFW flags
- **Batch Operations**: Import/export, bulk updates

#### 2. Community Platform
- **User Profiles**: Customizable profiles with social links
- **Following System**: Follow creators, activity feeds
- **Collections**: Organize prompts into themed collections
- **Engagement**: Like, favorite, rate prompts
- **Discovery**: Featured prompts, trending, search

#### 3. Prompt Generation Tools

##### Quick Prompt Generator
- **Templates**: Photography, Artistic, Cinematic, Fashion, etc.
- **Character Presets**: Saved character configurations
- **Scene Building**: Locations, lighting, composition
- **Random Generation**: AI-powered scenario suggestions
- **Enhancement**: LLM integration for prompt improvement

##### Elite Prompt Generator
- **Advanced Settings**: Detailed control over all parameters
- **Rule Templates**: Predefined style rules
- **Compression**: Optimize prompts for token limits
- **Happy Talk Mode**: Positive prompt enhancement

#### 4. Analysis Tools

##### Metadata Analyzer
- **EXIF Extraction**: Camera settings, location data
- **AI Detection**: Identify generation source (Midjourney, SD, etc.)
- **Parameter Extraction**: Model, steps, CFG scale, seed
- **Batch Processing**: Analyze multiple images

##### Image Vision Analysis
- **Scene Description**: Detailed content analysis
- **Style Detection**: Artistic style identification
- **Color Analysis**: Palette extraction
- **Composition**: Rule of thirds, golden ratio
- **Caption Generation**: Platform-optimized social captions

#### 5. Administrative Features

##### User Management
- **Role Assignment**: User, Community Admin, Super Admin, Developer
- **Activity Monitoring**: User statistics, engagement metrics
- **Access Control**: Fine-grained permissions

##### Community Management
- **Community Creation**: Named groups with descriptions
- **Invite System**: Generate and manage invite codes
- **Member Management**: Add/remove members, assign admins
- **Moderation**: Content flagging, NSFW controls

---

## API Reference

### Authentication

All authenticated endpoints require a valid session cookie from Replit Auth.

#### Get Current User
```http
GET /api/auth/user
```
Returns the authenticated user's profile information.

#### Logout
```http
POST /api/logout
```
Ends the current session.

### Prompts

#### List Prompts
```http
GET /api/prompts
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
  - filter: "all" | "public" | "private" | "featured"
  - category: string
  - search: string
```

#### Get Prompt
```http
GET /api/prompts/:id
```

#### Create Prompt
```http
POST /api/prompts
Body: {
  name: string
  description: string
  promptContent: string
  category?: string
  tags?: string[]
  isPublic?: boolean
  isNsfw?: boolean
  metadata?: object
}
```

#### Update Prompt
```http
PUT /api/prompts/:id
Body: Partial prompt object
```

#### Delete Prompt
```http
DELETE /api/prompts/:id
```

#### Like/Unlike Prompt
```http
POST /api/prompts/:id/like
DELETE /api/prompts/:id/like
```

### Collections

#### List Collections
```http
GET /api/collections
Query Parameters:
  - userId?: string
  - communityId?: string
  - type?: "user" | "community" | "global"
```

#### Create Collection
```http
POST /api/collections
Body: {
  name: string
  description?: string
  isPublic?: boolean
  promptIds?: string[]
}
```

#### Add/Remove Prompts
```http
POST /api/collections/:id/prompts
Body: { promptIds: string[] }

DELETE /api/collections/:id/prompts
Body: { promptIds: string[] }
```

### AI Enhancement

#### Enhance Prompt
```http
POST /api/enhance-prompt
Body: {
  prompt: string
  provider?: string
  model?: string
  options?: {
    useHappyTalk?: boolean
    compressPrompt?: boolean
    compressionLevel?: string
  }
}
```

#### Analyze Image
```http
POST /api/ai/analyze-image
Body: FormData with image file
```

#### Generate Metadata
```http
POST /api/generate-prompt-metadata
Body: {
  prompt: string
  characterPreset?: string
  templateName?: string
}
```

### Admin Endpoints

#### User Management
```http
GET /api/admin/users
PUT /api/admin/users/:id/role
DELETE /api/admin/users/:id
```

#### Community Management
```http
GET /api/admin/communities
POST /api/admin/communities
PUT /api/admin/communities/:id
DELETE /api/admin/communities/:id
```

#### Statistics
```http
GET /api/admin/stats
Returns platform-wide statistics
```

---

## Deployment Guide

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Google Cloud Storage bucket (or Replit Object Storage)
- SSL certificate (for production)

### Environment Variables

Required variables:
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
REPLIT_DB_URL=...
REPL_ID=...
ISSUER_URL=https://replit.com/oidc
SESSION_SECRET=<random-32-char-string>
REPLIT_DOMAINS=your-domain.replit.app

# Object Storage
PUBLIC_OBJECT_SEARCH_PATHS=/bucket-name/public
PRIVATE_OBJECT_DIR=/bucket-name/.private

# AI Services (Optional)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CUSTOM_VISION_URL=https://...

# Google Services (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Deployment Steps

#### 1. Database Setup
```bash
# Run migrations
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

#### 2. Build Application
```bash
# Install dependencies
npm install

# Build for production
npm run build

# The build outputs to dist/ directory
```

#### 3. Start Production Server
```bash
# Set NODE_ENV
export NODE_ENV=production

# Start server
npm start
```

#### 4. Configure Reverse Proxy (Nginx example)
```nginx
server {
    listen 443 ssl http2;
    server_name promptatrium.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
    }
}
```

### Health Checks

Monitor these endpoints:
- `/api/health` - Basic health check
- `/api/ready` - Readiness probe (checks DB connection)

### Backup Strategy

#### Database Backups
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20240101.sql
```

#### Object Storage Backups
- Configure GCS lifecycle policies
- Enable versioning on buckets
- Set up cross-region replication

---

## User Guide

### Getting Started

#### 1. Account Creation
- Click "Sign in with Replit" on the landing page
- Authorize the application
- Complete the introduction modal
- Choose a unique username

#### 2. Profile Setup
- Navigate to Settings → Profile
- Add bio, website, social links
- Configure privacy settings
- Upload profile picture

### Creating Prompts

#### Quick Prompt Generator
1. Go to Tools → Quick Prompter
2. Select a template (Photography, Artistic, etc.)
3. Choose or create a character preset
4. Add scene details and modifiers
5. Click "Generate" for the final prompt
6. Save to library with auto-generated metadata

#### Manual Creation
1. Click "New Prompt" in Library
2. Enter prompt content
3. Add metadata:
   - Name and description
   - Categories and tags
   - Target model/generator
   - Example images
4. Set visibility (public/private)
5. Save prompt

### Organizing Content

#### Collections
- Create collections to group related prompts
- Add prompts via drag-and-drop or selection
- Share collections publicly or keep private
- Collaborate on community collections

#### Tags and Categories
- Use consistent tagging for easy filtering
- Browse by category in Community view
- Create custom categories (admin only)

### Community Features

#### Following Creators
- Click "Follow" on user profiles
- View followed users' activity in feed
- Get notifications for new content

#### Engagement
- Like prompts to show appreciation
- Favorite prompts for quick access
- Rate prompts (1-5 stars)
- Branch prompts to create variations

### Advanced Tools

#### Metadata Analyzer
1. Upload image(s) to analyze
2. View extracted metadata:
   - EXIF data
   - AI generation parameters
   - Detected prompt
3. Save extracted prompts to library

#### Image Vision Analysis
1. Upload an image
2. Select analysis type:
   - Scene description
   - Style analysis
   - Caption generation
3. Choose tone for captions
4. Copy or save results

---

## Admin Guide

### Admin Roles

#### Super Admin
- Full system access
- User management
- Platform configuration
- Community creation
- Statistics access

#### Community Admin
- Manage assigned communities
- Moderate content
- Manage members
- Create invites

#### Developer
- Super admin privileges
- Debug access
- API testing tools

### User Management

#### Role Assignment
1. Go to Admin → Users
2. Find user by search or browse
3. Click "Edit Role"
4. Select new role
5. Confirm change

#### User Moderation
- View user activity statistics
- Review flagged content
- Suspend accounts if needed
- Delete inappropriate content

### Community Management

#### Creating Communities
1. Admin → Communities → New
2. Enter community details:
   - Name and slug
   - Description
   - Cover image
3. Set initial admins
4. Generate invite codes

#### Invite Management
- Create single or multi-use codes
- Set expiration dates
- Track invite usage
- Revoke codes if needed

### Content Moderation

#### NSFW Content
- Review NSFW-flagged prompts
- Verify appropriate tagging
- Remove violating content
- Warn or ban repeat offenders

#### Abuse Reports
- Monitor report queue
- Investigate complaints
- Take appropriate action
- Document decisions

### Platform Monitoring

#### Statistics Dashboard
- User growth metrics
- Content creation rates
- Engagement statistics
- Storage usage
- API usage

#### Performance Monitoring
- Response times
- Error rates
- Database performance
- Storage capacity

---

## Developer Guide

### Local Development Setup

#### Prerequisites
```bash
# Install Node.js 18+
nvm install 18
nvm use 18

# Install PostgreSQL
brew install postgresql@14  # macOS
apt-get install postgresql-14  # Linux
```

#### Environment Setup
1. Clone repository
2. Copy `.env.example` to `.env`
3. Configure local database
4. Set up local object storage or use dev mode

#### Development Server
```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Start dev server
npm run dev

# Access at http://localhost:5000
```

### Project Structure
```
promptatrium/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Route components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   └── App.tsx      # Main app component
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── integrations/    # External service integrations
│   ├── storage.ts       # Database interface
│   └── index.ts         # Server entry point
├── shared/              # Shared types/schemas
│   └── schema.ts        # Drizzle schema
├── components/          # Feature packages
│   ├── QUICKPROMPT/     # Quick Prompt Generator
│   ├── PROMPTGENERATOR/ # Elite Generator
│   └── METADATAANALYZER/# Metadata tools
└── scripts/             # Build/deployment scripts
```

### Database Schema

Key tables:
- `users` - User accounts and profiles
- `prompts` - Prompt content and metadata
- `collections` - Prompt groupings
- `communities` - User communities
- `promptHistory` - Generation history
- `activities` - User activity feed

### Adding Features

#### Creating a New API Endpoint
```typescript
// server/routes/myFeature.ts
import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';

const router = Router();

router.get('/api/my-feature', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any).claims.sub;
    const data = await storage.getMyData(userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

export default router;
```

#### Adding to Storage Interface
```typescript
// server/storage.ts
export interface IStorage {
  // ... existing methods
  getMyData(userId: string): Promise<MyData>;
  createMyData(data: InsertMyData): Promise<MyData>;
}
```

#### Creating React Component
```tsx
// client/src/components/MyFeature.tsx
import { useQuery } from '@tanstack/react-query';

export function MyFeature() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/my-feature'],
  });

  if (isLoading) return <div>Loading...</div>;
  
  return <div>{/* Render your feature */}</div>;
}
```

### Testing

#### Unit Tests
```bash
npm test
```

#### E2E Tests
```bash
npm run test:e2e
```

#### Manual Testing Checklist
- [ ] Authentication flow
- [ ] CRUD operations
- [ ] File uploads
- [ ] Permission checks
- [ ] Error handling
- [ ] Mobile responsive
- [ ] Cross-browser

### Contributing

#### Code Style
- TypeScript with strict mode
- ESLint + Prettier formatting
- Conventional commits
- PR reviews required

#### Pull Request Process
1. Fork repository
2. Create feature branch
3. Make changes with tests
4. Update documentation
5. Submit PR with description
6. Address review feedback
7. Merge after approval

---

## Security & Compliance

### Security Measures

#### Authentication
- OAuth 2.0 with PKCE
- Secure session cookies
- CSRF protection
- Rate limiting

#### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- API key management
- Token rotation

#### Data Protection
- Encryption at rest (database)
- Encryption in transit (TLS)
- Secure file storage
- Input validation
- SQL injection prevention

### GDPR Compliance

#### User Rights
- **Access**: Export personal data
- **Rectification**: Edit profile/content
- **Erasure**: Delete account option
- **Portability**: JSON/CSV export
- **Objection**: Privacy settings

#### Data Processing
- Explicit consent for data use
- Purpose limitation
- Data minimization
- Retention policies
- Breach notification

### Content Policies

#### Prohibited Content
- Illegal material
- Hate speech
- Harassment
- Spam
- Copyright infringement

#### NSFW Guidelines
- Proper tagging required
- Age verification
- Opt-in viewing
- Separate storage

### Security Checklist

#### Pre-Production
- [ ] Security audit completed
- [ ] Penetration testing done
- [ ] OWASP Top 10 addressed
- [ ] Dependencies updated
- [ ] Secrets rotated
- [ ] Rate limiting configured
- [ ] WAF/DDoS protection
- [ ] Backup/recovery tested

#### Ongoing
- [ ] Security patches applied
- [ ] Access logs reviewed
- [ ] Suspicious activity monitored
- [ ] Incident response plan
- [ ] Security training current

---

## Troubleshooting

### Common Issues

#### Authentication Problems

**Issue**: "Unauthorized" error after login
```
Solution:
1. Clear browser cookies
2. Check session expiry
3. Verify REPLIT_DOMAINS env var
4. Ensure HTTPS in production
```

**Issue**: OAuth redirect mismatch
```
Solution:
1. Verify redirect URI in Google Console
2. Check REDIRECT_URI env var
3. Ensure proper domain configuration
```

#### Database Errors

**Issue**: "Connection refused" to PostgreSQL
```
Solution:
1. Check DATABASE_URL format
2. Verify PostgreSQL is running
3. Check firewall/security groups
4. Test with psql client
```

**Issue**: Migration failures
```
Solution:
1. Never change ID column types
2. Use npm run db:push --force
3. Backup before migrations
4. Check for constraint violations
```

#### Storage Issues

**Issue**: Images not uploading
```
Solution:
1. Check PUBLIC_OBJECT_SEARCH_PATHS
2. Verify bucket permissions
3. Check file size limits
4. Review CORS configuration
```

**Issue**: 404 on image URLs
```
Solution:
1. Verify object path format
2. Check ACL permissions
3. Ensure bucket is public
4. Review CDN configuration
```

#### Performance Problems

**Issue**: Slow page loads
```
Solution:
1. Check database indexes
2. Enable query caching
3. Optimize image sizes
4. Review N+1 queries
5. Add CDN for assets
```

**Issue**: High memory usage
```
Solution:
1. Check for memory leaks
2. Limit concurrent connections
3. Optimize query results
4. Implement pagination
5. Review file handling
```

### Debug Tools

#### Server Logs
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# Database query logs
tail -f logs/query.log
```

#### Database Queries
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Active connections
SELECT * FROM pg_stat_activity;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
```

#### API Testing
```bash
# Test authentication
curl -X GET https://api.example.com/api/auth/user \
  -H "Cookie: session=..."

# Test prompt creation
curl -X POST https://api.example.com/api/prompts \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"name":"Test","promptContent":"..."}'
```

### Support Channels

- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Community support and discussions
- **Email**: support@promptatrium.com
- **Documentation**: This guide and inline docs

---

## Appendix

### Glossary

- **Prompt**: Text instruction for AI image generation
- **Collection**: Group of related prompts
- **Community**: User group with shared interests
- **Template**: Predefined prompt structure
- **Preset**: Saved configuration (character, style, etc.)
- **Fork**: Copy of a prompt for modification
- **NSFW**: Not Safe For Work content
- **LLM**: Large Language Model (GPT, Claude, etc.)
- **Vision Model**: AI for image analysis
- **Metadata**: Descriptive data about prompts/images

### Version History

- **v1.0.0** - Initial release
- **v1.1.0** - Added Quick Prompt Generator
- **v1.2.0** - Community features
- **v1.3.0** - AI enhancement integration
- **v1.4.0** - Admin dashboard
- **v1.5.0** - Current version

### License

Copyright (c) 2024 PromptAtrium

All rights reserved. This software and associated documentation files (the "Software") are proprietary and confidential.

---

*Last updated: October 2025*