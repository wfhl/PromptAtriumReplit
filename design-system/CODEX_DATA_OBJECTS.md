# PromptAtrium Wordsmith Codex Data Objects Reference

> **Purpose:** Quick-reference guide for Codex-specific data objects  
> **Usage:** Keep open while redesigning Codex to maintain consistency  
> **Created:** December 2024

---

## Quick Reference Table

| Object | Table | Purpose | Key Fields | API Endpoint |
|--------|-------|---------|-----------|--------------|
| **CodexCategory** | `codex_categories` | Browse structure | name, icon, color, parentCategoryId | `/api/wordsmith-categories` |
| **CodexTerm** | `codex_terms` | Individual terms | term, description, examples, isOfficial | `/api/wordsmith-terms` |
| **CodexUserList** | `codex_user_lists` | User collections | name, userId, isPublic | `/api/codex-assembled-strings` |
| **CodexUserTerm** | `codex_user_terms` | Terms in lists | termId, customTerm, orderIndex | (via CodexUserList) |
| **CodexContribution** | `codex_contributions` | User submissions | term, categoryId, status | `/api/codex-contributions` |
| **CodexTermImage** | `codex_term_images` | Visual examples | termId, imageUrl, isApproved | (future feature) |

---

## CodexCategory (Browse Structure)

### Purpose
Organize terms into browsable categories with visual identity.

### TypeScript Type Definition

```typescript
type CodexCategory = {
  // Identity
  id: string;                       // UUID
  name: string;                     // "Lighting", "Style", "Mood"
  
  // Display
  description?: string;             // What this category is
  icon?: string;                    // Icon name: "palette", "camera", "sun"
  color?: string;                   // Color class: "blue", "green", "purple"
  
  // Organization
  orderIndex: number;               // Display order (0, 1, 2...)
  parentCategoryId?: string;        // For sub-categories
  
  // Status
  isActive: boolean;                // Can browse this?
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};
```

### Example

```json
{
  "id": "cat-lighting",
  "name": "Lighting",
  "description": "Lighting conditions and styles",
  "icon": "sun",
  "color": "yellow",
  "orderIndex": 1,
  "parentCategoryId": null,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Operations

```typescript
// Get all categories
GET /api/wordsmith-categories

// Get specific category
GET /api/wordsmith-category/:id
```

---

## CodexTerm (Individual Term)

### Purpose
Individual prompt building blocks within a category.

### TypeScript Type Definition

```typescript
type CodexTerm = {
  // Identity
  id: string;                       // UUID
  categoryId: string;               // Which category
  
  // Content
  term: string;                     // **The actual term** "Dramatic Lighting"
  description?: string;             // Detailed explanation
  examples?: string;                // Usage examples
  
  // Relationships
  relatedTerms?: string[];          // Related term IDs
  metadata?: object;                // Additional data
  
  // Authorship
  createdBy?: string;               // User ID who created
  isOfficial: boolean;              // Official vs user-contributed
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};
```

### Example

```json
{
  "id": "term-dramatic-light",
  "categoryId": "cat-lighting",
  "term": "Dramatic Lighting",
  "description": "Strong, directional lighting with high contrast and deep shadows for cinematic effect",
  "examples": "Used in film noir, studio photography, theatrical lighting",
  "relatedTerms": ["term-harsh-light", "term-key-light", "term-rim-light"],
  "metadata": {
    "intensity": "high",
    "contrast": "high",
    "mood": "theatrical"
  },
  "isOfficial": true,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Operations

```typescript
// Get terms in category
GET /api/wordsmith-terms?categoryId=cat-lighting&limit=50

// Search terms
GET /api/wordsmith-terms?search=dramatic&limit=20

// Get specific term
GET /api/wordsmith-term/:id
```

---

## CodexUserList (Assembled Collection)

### Purpose
User-created collections of terms (presets or wildcards).

### TypeScript Type Definition

```typescript
type CodexUserList = {
  // Identity
  id: string;                       // UUID
  userId: string;                   // Owner
  
  // Content
  name: string;                     // Display name
  description?: string;             // What this list is for
  
  // Organization
  categoryId?: string;              // Associated category
  
  // Status
  isPublic: boolean;                // Can others see/use?
  downloadCount: number;            // Times downloaded/used
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};
```

### Example

```json
{
  "id": "list-001",
  "userId": "user-123",
  "name": "Cyberpunk Portrait Essentials",
  "description": "Core terms for generating cyberpunk character portraits",
  "categoryId": "cat-aesthetic",
  "isPublic": true,
  "downloadCount": 34,
  "createdAt": "2024-12-19T10:30:00Z"
}
```

### Operations

```typescript
// Get user's lists
GET /api/codex-assembled-strings?userId={userId}

// Get list details (with terms)
GET /api/codex-assembled-strings/:id

// Create list
POST /api/codex-assembled-strings
{
  "name": "My Terms",
  "type": "preset" | "wildcard",
  "description": "...",
  "content": "term1, term2, term3"
}

// Update list
PATCH /api/codex-assembled-strings/:id
{
  "name": "Updated Name",
  "content": "updated, terms"
}

// Delete list
DELETE /api/codex-assembled-strings/:id
```

---

## CodexUserTerm (Terms in List)

### Purpose
Individual term entries within a user list (many-to-many relationship).

### TypeScript Type Definition

```typescript
type CodexUserTerm = {
  // Identity
  id: string;                       // UUID
  userListId: string;               // Which list
  
  // Reference
  termId?: string;                  // Official term (can be null)
  
  // Custom option
  customTerm?: string;              // User's custom term
  customDescription?: string;       // User's custom description
  
  // Display
  orderIndex: number;               // Order in list
  
  // Timestamps
  createdAt: Date;
};
```

### Example

```json
[
  {
    "id": "userterm-001",
    "userListId": "list-001",
    "termId": "term-dramatic-light",
    "customTerm": null,
    "orderIndex": 0,
    "createdAt": "2024-12-19T10:30:00Z"
  },
  {
    "id": "userterm-002",
    "userListId": "list-001",
    "termId": null,
    "customTerm": "My custom vibe",
    "customDescription": "Special effect I invented",
    "orderIndex": 1,
    "createdAt": "2024-12-19T10:31:00Z"
  }
]
```

### Structure

- **Official terms:** Reference `codex_terms` via `termId`
- **Custom terms:** User-defined, stored in `customTerm` field
- **Mixed lists:** Can contain both official and custom terms

---

## CodexContribution (User Submissions)

### Purpose
Track user-contributed terms pending approval.

### TypeScript Type Definition

```typescript
type CodexContribution = {
  // Identity
  id: string;                       // UUID
  
  // Content
  term: string;                     // Proposed term
  categoryId: string;               // Which category
  description?: string;             // Description
  examples?: string;                // Usage examples
  
  // Status
  status: "pending" | "approved" | "rejected";
  
  // Users
  submittedBy: string;              // Contributor ID
  reviewedBy?: string;              // Reviewer ID
  
  // Review
  reviewNotes?: string;             // Why approved/rejected
  approvedTermId?: string;          // If approved, link to created term
  
  // Timestamps
  createdAt: Date;
  reviewedAt?: Date;
};
```

### Example

```json
{
  "id": "contrib-001",
  "term": "Volumetric Fog",
  "categoryId": "cat-environment",
  "description": "Atmospheric fog with visible light rays",
  "examples": "Used in fantasy scenes and moody landscapes",
  "status": "pending",
  "submittedBy": "user-456",
  "createdAt": "2024-12-19T09:00:00Z"
}
```

### Workflow

```
1. User submits term → status: "pending"
2. Admin reviews → adds reviewNotes
3. Admin approves → status: "approved" + create CodexTerm
4. Or rejects → status: "rejected" + explanation
```

---

## CodexTermImage (Visual Examples)

### Purpose
Store example images for terms (future feature).

### TypeScript Type Definition

```typescript
type CodexTermImage = {
  // Identity
  id: string;                       // UUID
  termId: string;                   // Which term
  
  // Content
  imageUrl: string;                 // Image URL (cloud storage)
  caption?: string;                 // Image description
  
  // Status
  isApproved: boolean;              // Moderated?
  
  // Attribution
  uploadedBy?: string;              // User who uploaded
  
  // Timestamps
  createdAt: Date;
};
```

---

## Data Structures: Assembled String

### Format in Database

**CodexAssembledString table:**

```typescript
{
  id: string;
  userId: string;
  name: string;
  type: "preset" | "wildcard";
  content: string;                  // "term1, term2, term3"
  metadata: {
    termsUsed: string[];            // ["term1", "term2", "term3"]
    categoryUsed?: string;
    generatedAt?: timestamp;
  };
  isPublic: boolean;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### Frontend Handling

**Client-side assembly (no database call):**

```typescript
// User clicks terms → added to array
const [assembledString, setAssembledString] = useState<string[]>([]);

// Assembled as comma-separated string when saving
const contentString = assembledString.join(", ");

// On save
POST /api/codex-assembled-strings {
  name: "My Preset",
  type: "preset",
  content: contentString,  // "term1, term2, term3"
  metadata: {
    termsUsed: assembledString
  }
}
```

---

## API Response Structures

### Get Categories Response

```json
[
  {
    "id": "cat-lighting",
    "name": "Lighting",
    "icon": "sun",
    "color": "yellow",
    "orderIndex": 0,
    "isActive": true
  },
  {
    "id": "cat-mood",
    "name": "Mood",
    "icon": "palette",
    "color": "purple",
    "orderIndex": 1,
    "isActive": true
  }
]
```

### Get Terms Response

```json
[
  {
    "id": "term-001",
    "term": "Dramatic Lighting",
    "categoryId": "cat-lighting",
    "description": "Strong directional lighting...",
    "isOfficial": true
  },
  {
    "id": "term-002",
    "term": "Soft Lighting",
    "categoryId": "cat-lighting",
    "description": "Diffused gentle lighting...",
    "isOfficial": true
  }
]
```

### Search Results Response

```json
{
  "components": [
    { "id": "term-001", "value": "Dramatic", "category": "Lighting" },
    { "id": "term-003", "value": "Dramatic Effect", "category": "Style" }
  ],
  "aesthetics": [
    { "id": "aes-001", "name": "Dramatic Noir", "category": "Aesthetic" }
  ]
}
```

---

## Cache Strategy

```typescript
// Browse (cached)
['/api/wordsmith-categories']       // All categories
['/api/wordsmith-category', catId]  // Single category
['/api/wordsmith-terms', { categoryId }]  // Category terms

// Search (NOT cached - fresh results)
['/api/wordsmith-terms', { search }]  // Search results

// User data (cached, but invalidated on change)
['/api/codex-assembled-strings']    // User's lists
['/api/codex-assembled-strings', id]  // Single list

// Contributions (rarely cached)
['/api/codex-contributions']        // User's submissions
```

**Invalidation triggers:**

```typescript
// After creating list
queryClient.invalidateQueries({
  queryKey: ['/api/codex-assembled-strings']
});

// After deleting list
queryClient.invalidateQueries({
  queryKey: ['/api/codex-assembled-strings']
});

// After submitting contribution
queryClient.invalidateQueries({
  queryKey: ['/api/codex-contributions']
});
```

---

## Validation Rules

### Term Selection

```typescript
✅ ALLOWED:
  - Empty selection (but can't save)
  - Duplicate terms
  - Custom terms mixed with official
  - Any order

⚠️ CONSTRAINTS:
  - Max 100 terms per list
  - Term length: 1-200 characters
  - NSFW filtering if user enabled
```

### List Naming

```typescript
✅ REQUIRED:
  - name: 3-100 characters
  - type: "preset" | "wildcard"

⚠️ OPTIONAL:
  - description: 0-500 characters
  - categoryId: valid category or null
```

### Contribution Submission

```typescript
✅ REQUIRED:
  - term: non-empty string
  - categoryId: valid category
  - submittedBy: authenticated user

⚠️ CONSTRAINTS:
  - Duplicate terms awaiting review (prevent duplicates)
  - Description recommended (min 20 chars)
```

---

## Client-Side Patterns

### Loading Categories

```typescript
const { data: categories } = useQuery({
  queryKey: ['/api/wordsmith-categories'],
  queryFn: () => apiRequest('/api/wordsmith-categories')
});
```

### Search Terms

```typescript
const handleSearch = (query: string) => {
  // Search is real-time, not cached
  apiRequest(`/api/wordsmith-terms?search=${query}`)
    .then(results => setSearchResults(results));
};
```

### Assembly (Client-side state)

```typescript
const [assembledString, setAssembledString] = useState<string[]>([]);

const addTerm = (term: string) => {
  setAssembledString([...assembledString, term]);
};

const removeTerm = (index: number) => {
  setAssembledString(
    assembledString.filter((_, i) => i !== index)
  );
};

const randomize = () => {
  const shuffled = [...assembledString].sort(() => Math.random() - 0.5);
  setAssembledString(shuffled);
};
```

### Save Preset

```typescript
const saveMutation = useMutation({
  mutationFn: (data) => apiRequest('/api/codex-assembled-strings', 'POST', data),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['/api/codex-assembled-strings']
    });
    showSuccessToast('Preset saved!');
  }
});

// Usage
saveMutation.mutate({
  name: formData.name,
  type: "preset",
  content: assembledString.join(", "),
  description: formData.description
});
```

---

## Debugging Checklist

- [ ] Categories load without errors
- [ ] Terms display with correct category
- [ ] NSFW filtering respects user preference
- [ ] Search works across components AND aesthetics
- [ ] Assembly state updates on term selection
- [ ] Randomize shuffles correctly
- [ ] Save creates record in database
- [ ] Cache invalidates after save
- [ ] Custom terms can be added to list
- [ ] List deletion works
- [ ] Preset/wildcard distinction preserved

---

## Quick Reference: Full Flow

### 1. Browse & Select

```typescript
// User browses categories → clicks category
// App shows terms from category
// User clicks terms → added to assembledString (client state)
// No API calls during assembly
```

### 2. Manage Assembly

```typescript
// User can:
// - Remove terms (array filter)
// - Randomize (shuffle array)
// - Copy (to clipboard)
// - Send to prompter (navigate with params)
```

### 3. Save as Preset

```typescript
const { assembledString } = state;
const presetsResponse = await apiRequest('/api/codex-assembled-strings', 'POST', {
  name: "My Preset",
  type: "preset",
  content: assembledString.join(", ")
});
// Returns: CodexAssembledString object
```

### 4. Later Use

```typescript
// User can:
// - View saved lists
// - Edit preset name/description
// - Delete preset
// - Load preset back into assembly
// - Share preset (if isPublic: true)
```

---

This reference keeps all Codex data objects organized for efficient redesign work.
