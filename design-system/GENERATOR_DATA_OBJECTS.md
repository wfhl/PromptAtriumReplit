# PromptAtrium Generator Data Objects Reference

> **Purpose:** Quick-reference guide for generator-specific data objects  
> **Usage:** Keep open while redesigning the generator to maintain consistency  
> **Created:** December 2024

---

## Quick Reference Table

| Object | Table | Purpose | Key Fields | API Endpoint |
|--------|-------|---------|-----------|--------------|
| **PromptTemplate** | `prompt_templates` | Generator templates | name, template, masterPrompt | `/api/prompt-templates` |
| **CharacterPreset** | `character_presets` | Character definitions | name, description, role | `/api/character-presets` |
| **PromptHistory** | `prompt_history` | Generation memory | promptText, templateUsed, isSaved | `/api/prompt-history` |
| **IntendedGenerator** | `intended_generators` | Target AI models | name, description | `/api/intended-generators` |
| **RecommendedModel** | `recommended_models` | Recommended LLM models | name, description | `/api/recommended-models` |
| **UserPromptMemory** | `user_prompt_memory` | Learned preferences | preferredStyles, avoidedTerms | `/api/prompt-refinement/memory` |
| **RefinementConv** | `prompt_refinement_conversations` | Chat sessions | currentPrompt, isActive | `/api/prompt-refinement/conversations` |
| **RefinementMsg** | `prompt_refinement_messages` | Chat messages | role, content | `/api/prompt-refinement/conversations/{id}` |

---

## PromptTemplate (Generator Template)

### Purpose
Provides reusable structure for prompt generation with placeholders and AI instructions.

### TypeScript Type Definition

```typescript
type PromptTemplate = {
  // Identity
  id: string;
  name: string;                    // Display name
  description?: string;            // What does it do
  
  // Core content
  template: string;                // "A {character} {subject} in {style} lighting"
  masterPrompt: string;            // System prompt for LLM enhancement
  
  // Configuration
  templateType?: string;           // "image", "text", "description"
  llmProvider: string;             // "openai" (default)
  llmModel: string;                // "gpt-4o" (default)
  
  // LLM options
  useHappyTalk: boolean;           // Add friendly tone
  compressPrompt: boolean;         // Reduce length
  compressionLevel: number;        // 1-3 scale
  
  // Ownership
  userId?: string;                 // Creator (for custom)
  isGlobal: boolean;               // Available to all
  isDefault: boolean;              // Featured/recommended
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};
```

### Example

```json
{
  "id": "tmpl-cinematic-portrait",
  "name": "Cinematic Portrait",
  "description": "Create professional cinematic portraits with character and subject",
  "template": "A cinematic {style} portrait of {character} as a {subject}, {tone} lighting, dramatic composition, professional photography, detailed, {additionalDetails}",
  "masterPrompt": "You are an expert AI prompt engineer specializing in cinematic photography. Transform this into a highly detailed, optimized prompt for image generation. Include:\n- Specific camera angles and lenses\n- Lighting setup (key light, fill light, rim light)\n- Color grading preferences\n- Artistic style references\nKeep the prompt detailed but concise.",
  "templateType": "image",
  "llmProvider": "openai",
  "llmModel": "gpt-4o",
  "useHappyTalk": false,
  "compressPrompt": true,
  "compressionLevel": 2,
  "isGlobal": true,
  "isDefault": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-12-01T00:00:00Z"
}
```

### Placeholder Contract

Templates MUST support these placeholders:

| Placeholder | Replaced By | Example |
|------------|-------------|---------|
| `{character}` | CharacterPreset.name | "Cyberpunk Samurai" |
| `{subject}` | User input | "warrior in neon city" |
| `{tone}` | Selected tone | "dramatic", "soft", "moody" |
| `{style}` | Selected style | "cinematic", "painterly", "photorealistic" |
| `{additionalDetails}` | User-entered details | "8k resolution, ultra detailed" |

### Operations

```typescript
// Fetch templates
GET /api/prompt-templates?isGlobal=true&limit=50

// Get template details (with masterPrompt)
GET /api/prompt-templates/:id

// Create custom template
POST /api/prompt-templates
{
  name: "My Custom Template",
  template: "A {character} doing {subject}...",
  masterPrompt: "Enhance this prompt...",
  isGlobal: false  // User template
}

// Update template
PATCH /api/prompt-templates/:id
{
  name: "Updated Name",
  template: "New template string..."
}
```

### Important Behavior

- **Placeholder replacement is case-sensitive**
- **masterPrompt must be suitable for LLM system role**
- **Compression level affects final output length (1-3)**
- **Global templates are cached at app startup**

---

## CharacterPreset (Generator Characters)

### Purpose
Predefined characters that populate the {character} placeholder.

### TypeScript Type Definition

```typescript
type CharacterPreset = {
  // Identity
  id: string;
  name: string;                    // Display name (replaces {character})
  
  // Details
  gender?: string;                 // "male", "female", "neutral"
  role?: string;                   // "warrior", "noble", "artist"
  description: string;             // Full character description
  
  // Metadata
  isFavorite: boolean;             // User favorited?
  
  // Ownership
  userId?: string;                 // Creator (for custom)
  isGlobal: boolean;               // Available to all
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};
```

### Example

```json
{
  "id": "char-cyberpunk-samurai",
  "name": "Cyberpunk Samurai",
  "gender": "male",
  "role": "warrior",
  "description": "A futuristic samurai warrior with neon-glowing katana, cybernetic enhancements visible on arms and neck, traditional Japanese clothing mixed with tech armor, intense determined expression, dark atmosphere with neon blue and purple lighting, photorealistic",
  "isFavorite": false,
  "isGlobal": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-12-01T00:00:00Z"
}
```

### Usage in Generation

When a character is selected:
1. **Direct replacement:** Template {character} → `Character.name`
2. **Context addition:** LLM system prompt includes `Character.description`
3. **Result:** Full character context in enhanced prompt

### Operations

```typescript
// List all characters
GET /api/character-presets?isGlobal=true

// Get character details
GET /api/character-presets/:id

// Create custom character
POST /api/character-presets
{
  name: "My Character",
  gender: "female",
  role: "artist",
  description: "Detailed description...",
  isGlobal: false
}

// Update character
PATCH /api/character-presets/:id
{
  description: "Updated description..."
}

// Toggle favorite
PATCH /api/character-presets/:id/favorite
```

---

## PromptHistory (Generation Memory)

### Purpose
Track every prompt generated (saved to library or not) for user's workflow and recovery.

### TypeScript Type Definition

```typescript
type PromptHistory = {
  // Identity
  id: string;
  userId: string;                  // Which user generated
  
  // Content
  promptText: string;              // The actual prompt
  
  // Context
  templateUsed?: string;           // Which template
  settings?: {
    tone?: string;
    style?: string;
    llmProvider?: string;
    llmModel?: string;
    useHappyTalk?: boolean;
    compressPrompt?: boolean;
    compressionLevel?: string;
  };
  metadata?: {
    character?: string;
    subject?: string;
    additionalDetails?: string;
  };
  
  // Status
  isSaved: boolean;                // In library?
  
  // Timestamps
  createdAt: Date;
};
```

### Example

```json
{
  "id": "hist-001",
  "userId": "user-123",
  "promptText": "A cinematic portrait of cyberpunk samurai as a warrior in neon city, dramatic lighting, cinematic composition, professional photography, detailed, 8k resolution, ultra detailed",
  "templateUsed": "Cinematic Portrait",
  "settings": {
    "tone": "dramatic",
    "style": "cinematic",
    "llmProvider": "openai",
    "llmModel": "gpt-4o",
    "useHappyTalk": false,
    "compressPrompt": true,
    "compressionLevel": "medium"
  },
  "metadata": {
    "character": "Cyberpunk Samurai",
    "subject": "warrior in neon city",
    "additionalDetails": "8k resolution, ultra detailed"
  },
  "isSaved": true,
  "createdAt": "2024-12-19T10:30:00Z"
}
```

### Operations

```typescript
// Get user's prompt history
GET /api/prompt-history?limit=20&offset=0

// Save generation to history
POST /api/prompt-history
{
  promptText: "A cinematic portrait...",
  templateUsed: "Cinematic Portrait",
  settings: {...},
  metadata: {...},
  isSaved: false  // Not yet in library
}

// Mark as saved (after library save)
PATCH /api/prompt-history/:id
{
  isSaved: true
}

// Delete history entry
DELETE /api/prompt-history/:id

// Clear all history
DELETE /api/prompt-history
```

### Lifecycle

```
1. User generates prompt → Create with isSaved: false
2. User clicks save → POST /api/prompts
3. Prompt saved to library → Update history isSaved: true
4. User revisits history → Can regenerate from stored metadata
5. User clears history → Hard delete from database
```

---

## IntendedGenerator (Target Models)

### Purpose
List of AI image generators the prompt can be optimized for.

### Type Definition

```typescript
type IntendedGenerator = {
  id: string;
  name: string;                    // "Midjourney", "DALL-E", "Stable Diffusion"
  description?: string;            // Generator capabilities
  type: "user" | "global";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

### Operations

```typescript
GET /api/intended-generators
POST /api/prompts { intendedGenerators: ["Midjourney", "DALL-E"] }
```

---

## RecommendedModel (LLM Models)

### Purpose
List of AI language models for enhancement.

### Type Definition

```typescript
type RecommendedModel = {
  id: string;
  name: string;                    // "gpt-4o", "Claude 3", "Gemini"
  description?: string;            // Model specs
  type: "user" | "global";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

### Operations

```typescript
GET /api/recommended-models
POST /api/enhance-prompt { llmModel: "gpt-4o" }
```

---

## UserPromptMemory (AI Learning)

### Purpose
AI learns user's preferences from refinement conversations and applies them to future generations.

### TypeScript Type Definition

```typescript
type UserPromptMemory = {
  // Identity
  userId: string;
  
  // Learned preferences
  preferredStyles: string[];       // ["cinematic", "dramatic lighting"]
  preferredThemes: string[];       // ["cyberpunk", "futuristic"]
  preferredModifiers: string[];    // ["ultra detailed", "8k resolution"]
  avoidedTerms: string[];          // ["cartoon", "anime"]
  
  // Custom guidance
  customInstructions?: string;     // "Always use moody lighting"
  
  // Metadata
  lastUpdated: Date;
};
```

### Example

```json
{
  "userId": "user-123",
  "preferredStyles": [
    "cinematic",
    "dramatic lighting",
    "neon colors",
    "dark atmosphere"
  ],
  "preferredThemes": [
    "cyberpunk",
    "futuristic",
    "dystopian",
    "sci-fi"
  ],
  "preferredModifiers": [
    "ultra detailed",
    "8k resolution",
    "cinematic quality",
    "professional photography"
  ],
  "avoidedTerms": [
    "cartoon",
    "anime",
    "simple",
    "low quality"
  ],
  "customInstructions": "Always include moody lighting with neon accents. Prefer dark color palettes. Include cybernetic or technological elements.",
  "lastUpdated": "2024-12-19T14:30:00Z"
}
```

### Operations

```typescript
// Get user's memory
GET /api/prompt-refinement/memory

// Update memory directly
PATCH /api/prompt-refinement/memory
{
  preferredStyles: ["new", "styles"],
  avoidedTerms: ["term1", "term2"]
}

// Memory is also updated automatically after refinement chat
POST /api/prompt-refinement/chat
{
  message: "Make it more detailed with neon colors"
  // Backend will extract preferences and update memory
}

// Clear memory
DELETE /api/prompt-refinement/memory
```

### How It's Used

In refinement chat system prompt:

```
You are an expert prompt engineer.

User's known preferences:
- Styles: cinematic, dramatic lighting
- Themes: cyberpunk, futuristic
- Always use: ultra detailed, 8k resolution
- Never use: cartoon, anime styles

Apply these preferences naturally to refinement suggestions.
```

---

## PromptRefinementConversation (Chat Sessions)

### Purpose
Track AI-powered refinement chat sessions.

### Type Definition

```typescript
type PromptRefinementConversation = {
  // Identity
  id: string;
  userId: string;
  
  // Content context
  currentPrompt: string;           // Prompt being refined
  title?: string;                  // Chat title
  
  // Status
  isActive: boolean;               // Ongoing conversation?
  messageCount: number;            // Messages exchanged
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};
```

### Operations

```typescript
// Start new refinement chat
POST /api/prompt-refinement/chat
{
  message: "Make this more detailed",
  currentPrompt: "A portrait of...",
  // conversationId: undefined for new
}

// Continue existing chat
POST /api/prompt-refinement/chat
{
  message: "Add more neon lighting",
  conversationId: "conv-123",
  currentPrompt: "Updated prompt text"
}

// Get user's conversations
GET /api/prompt-refinement/conversations?activeOnly=true

// Get specific conversation
GET /api/prompt-refinement/conversations/:id
// Returns conversation + all messages

// Delete conversation
DELETE /api/prompt-refinement/conversations/:id
```

---

## PromptRefinementMessage (Chat Messages)

### Purpose
Individual messages in refinement conversation.

### Type Definition

```typescript
type PromptRefinementMessage = {
  // Identity
  id: string;
  conversationId: string;
  
  // Content
  role: "user" | "assistant";
  content: string;
  
  // Timestamps
  createdAt: Date;
};
```

### Flow

```
User: "Make it more detailed"
  ↓ [Stored as PromptRefinementMessage]
  ↓
Assistant: "Here's a more detailed version: [prompt]"
  ↓ [Stored as PromptRefinementMessage]
  ↓
Extract preferences from conversation
  ↓ [Update UserPromptMemory]
```

---

## Data Validation Rules

### Template Validation

```typescript
✅ REQUIRED:
  - name: non-empty string
  - template: string with at least one placeholder
  - masterPrompt: non-empty string

⚠️ MUST CONTAIN:
  - At least one of: {character}, {subject}, {tone}, {style}

❌ NOT ALLOWED:
  - XSS in template (sanitized before storage)
  - HTML tags (unless explicitly marked safe)
```

### Character Validation

```typescript
✅ REQUIRED:
  - name: 3-50 characters, unique per user+global
  - description: 20-1000 characters

⚠️ RECOMMENDED:
  - gender: one of enum values
  - role: descriptive
```

### Generation Validation

```typescript
✅ REQUIRED:
  - promptText: non-empty string
  - templateUsed: valid template name or ID

⚠️ OPTIONAL:
  - metadata: any JSON object
  - settings: specific config options
```

---

## Cache Strategy

```typescript
// Global data (cached at startup)
['/api/prompt-templates', { isGlobal: true }]
['/api/character-presets', { isGlobal: true }]
['/api/intended-generators']
['/api/recommended-models']

// User data (fetched on demand)
['/api/prompt-history']                  // Paginated
['/api/prompt-refinement/conversations']  // List
['/api/prompt-refinement/conversations', conversationId]  // Detail
['/api/prompt-refinement/memory']        // User's memory

// Invalidation after generation
queryClient.invalidateQueries({
  queryKey: ['/api/prompt-history']
});

// Invalidation after library save
queryClient.invalidateQueries({
  queryKey: ['/api/prompts']  // Library updated
});
queryClient.invalidateQueries({
  queryKey: ['/api/prompt-history']  // History marked saved
});

// Invalidation after memory update
queryClient.invalidateQueries({
  queryKey: ['/api/prompt-refinement/memory']
});
```

---

## Debugging Checklist

- [ ] Template has {character} and {subject} placeholders
- [ ] masterPrompt is suitable for LLM system role
- [ ] Character name doesn't contain HTML/XSS
- [ ] Compression level is 1-3 (light/medium/heavy)
- [ ] LLM provider is configured (OpenAI API key available)
- [ ] LLM model name matches provider's available models
- [ ] UserPromptMemory isn't null (check fallback)
- [ ] Conversation messages load before displaying
- [ ] Template placeholders match replacement values exactly
- [ ] isSaved flag updates after library save

---

## Quick Copy-Paste: Full Generator Flow

### Frontend: Load Templates and Characters

```typescript
const { data: templates } = useQuery({
  queryKey: ['/api/prompt-templates', { isGlobal: true }],
  queryFn: () => apiRequest('/api/prompt-templates?isGlobal=true')
});

const { data: characters } = useQuery({
  queryKey: ['/api/character-presets', { isGlobal: true }],
  queryFn: () => apiRequest('/api/character-presets?isGlobal=true')
});
```

### Frontend: Generate from Template

```typescript
const initialPrompt = template.template
  .replace('{character}', selectedCharacter.name)
  .replace('{subject}', formData.subject)
  .replace('{tone}', formData.tone)
  .replace('{style}', formData.style)
  .replace('{additionalDetails}', formData.additionalDetails);
```

### Frontend: Enhance with AI

```typescript
const enhancedResponse = await apiRequest('/api/enhance-prompt', 'POST', {
  prompt: initialPrompt,
  llmProvider: template.llmProvider,
  llmModel: template.llmModel,
  useHappyTalk: template.useHappyTalk,
  compressPrompt: template.compressPrompt,
  compressionLevel: template.compressionLevel,
  templateId: template.id
});

const enhancedPrompt = enhancedResponse.enhancedPrompt;
```

### Frontend: Save to Library

```typescript
const savedPrompt = await apiRequest('/api/prompts', 'POST', {
  name: formData.promptName,
  promptContent: enhancedPrompt,
  description: formData.description,
  isPublic: formData.isPublic,
  tags: formData.tags,
  status: 'published'
});

// Update history
await apiRequest('/api/prompt-history', 'POST', {
  promptText: enhancedPrompt,
  templateUsed: template.name,
  isSaved: true,
  settings: {...},
  metadata: {...}
});

// Invalidate caches
queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
queryClient.invalidateQueries({ queryKey: ['/api/prompt-history'] });
```

---

This reference keeps all generator-related data objects in one accessible place during redesign.
