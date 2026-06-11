export interface Guide {
  id: number;
  title: string;
  content: string;
  category: string;
  order: number;
}

export const SYNTAX_GUIDES: Guide[] = [
  {
    id: 1,
    title: "Weight Control - Emphasizing Elements",
    content: `**Weight control allows you to emphasize or de-emphasize specific elements in your prompt.**

### Basic Syntax
- \`(element:1.5)\` - Increases emphasis by 50%
- \`(element:0.5)\` - Decreases emphasis by 50%
- \`(element:1.2)\` - Slight increase by 20%
- \`[element]\` - Alternative de-emphasis syntax

### Examples
\`\`\`
(beautiful eyes:1.3), detailed portrait
(dark background:0.7), bright subject
((very important:1.5)) - Double parentheses also work
\`\`\`

### Best Practices
- Keep weights between 0.5 and 1.5 for best results
- Use sparingly - too many weights can confuse the model
- Higher weights don't always mean better results
- Test different weight values to find the sweet spot

*Source: Stable Diffusion Documentation*`,
    category: "syntax",
    order: 1
  },
  {
    id: 2,
    title: "Mixing Concepts - Blending Elements",
    content: `**Create unique images by blending multiple concepts together using special syntax.**

### AND Syntax
- \`concept1 AND concept2\` - Equal blend of two concepts
- \`concept1:0.7 AND concept2:0.3\` - Weighted blend

### Examples
\`\`\`
cat AND robot - Creates a robotic cat
forest:0.6 AND ocean:0.4 - Forest with ocean elements
warrior AND angel AND demon - Three-way concept mix
\`\`\`

### Advanced Mixing
\`\`\`
[cat|dog|bird] - Alternates between concepts
[cat:dog:0.5] - Transitions from cat to dog at step 0.5
{2$$cat|dog} - 2 cats and 1 dog composition
\`\`\`

### Tips
- Balance is key - equal weights often work best initially
- Some concepts blend better than others
- Use with style mixing for unique results
- Experiment with transition timing

*Source: ComfyUI and A1111 Documentation*`,
    category: "syntax",
    order: 2
  },
  {
    id: 3,
    title: "Attention Brackets - Fine Control",
    content: `**Use brackets and parentheses for precise attention control in your prompts.**

### Bracket Types
- \`(text)\` - Increases attention by 1.1x
- \`((text))\` - Increases attention by 1.21x (1.1 * 1.1)
- \`[text]\` - Decreases attention by 0.9x
- \`[[text]]\` - Decreases attention by 0.81x

### Nesting Examples
\`\`\`
(masterpiece, (best quality:1.2))
[background, [crowd:0.8]]
((extremely detailed eyes:1.3))
\`\`\`

### Advanced Usage
\`\`\`
\\(literal parentheses\\) - Escape with backslash
{alternate|syntax|options} - Some UIs use curly braces
<lora:name:0.8> - LoRA syntax uses angle brackets
\`\`\`

### Platform Differences
- **Automatic1111**: Full bracket support
- **ComfyUI**: May require specific nodes
- **InvokeAI**: Different syntax variations
- **Midjourney**: Limited bracket support

*Source: Various UI Documentation*`,
    category: "syntax",
    order: 3
  },
  {
    id: 4,
    title: "Step Control - Prompt Scheduling",
    content: `**Control when elements appear or disappear during the generation process.**

### Basic Scheduling
- \`[prompt:0.5]\` - Starts at 50% of steps
- \`[prompt::0.5]\` - Stops at 50% of steps
- \`[from:to:0.5]\` - Switches from one to another

### Examples
\`\`\`
[forest:0.3] - Forest appears after 30% completion
[crowded::0.7] - Crowd disappears at 70%
[day:night:0.5] - Transitions from day to night
[cat:dog:0.3] - Cat for 30%, then dog
\`\`\`

### Advanced Scheduling
\`\`\`
[prompt:10] - Starts at step 10 (absolute)
[prompt::25] - Stops at step 25 (absolute)
[[prompt]::0.5] - Combines with de-emphasis
\`\`\`

### Use Cases
- Add details progressively
- Remove unwanted elements mid-generation
- Create transformations or morphing effects
- Fine-tune composition development

*Source: Stable Diffusion WebUI Documentation*`,
    category: "syntax",
    order: 4
  },
  {
    id: 5,
    title: "Quality Tags - Enhancement Keywords",
    content: `**Essential quality tags that significantly improve image generation results.**

### Universal Quality Tags
\`\`\`
masterpiece, best quality, high resolution,
extremely detailed, professional, award winning,
trending on artstation, 8k uhd, ultra detailed
\`\`\`

### Style-Specific Quality
**Photography:**
\`\`\`
RAW photo, high quality photo, detailed photo,
professional photograph, DSLR quality, sharp focus
\`\`\`

**Digital Art:**
\`\`\`
digital painting, concept art, illustration,
highly detailed digital art, professional artwork
\`\`\`

**Anime/Manga:**
\`\`\`
official art, original, extremely detailed wallpaper,
anime key visual, anime coloring, anime screencap
\`\`\`

### Platform Preferences
- **Midjourney**: "highly detailed, 4k, 8k, intricate"
- **DALL-E**: "high quality, detailed, professional"
- **Stable Diffusion**: "masterpiece, best quality"

### Negative Quality Tags
\`\`\`
low quality, worst quality, jpeg artifacts,
blurry, pixelated, amateur, poorly drawn
\`\`\`

*Source: Community Best Practices*`,
    category: "syntax",
    order: 5
  },
  {
    id: 6,
    title: "Negative Prompts - What to Avoid",
    content: `**Negative prompts tell the AI what NOT to include in your image.**

### Basic Negative Prompts
\`\`\`
ugly, deformed, noisy, blurry, distorted,
grainy, low quality, worst quality, jpeg artifacts
\`\`\`

### Anatomy Fixes
\`\`\`
extra fingers, fewer fingers, extra limbs,
malformed hands, fused fingers, long neck,
bad anatomy, bad proportions, mutated hands
\`\`\`

### Style Control
\`\`\`
cartoon, 3d, illustration, anime, painted,
photoshop, video game, cgi, render, fake
\`\`\`

### Advanced Negatives
**For Realism:**
\`\`\`
illustration, painting, drawing, art, sketch,
anime, cartoon, graphic, text, watermark
\`\`\`

**For Art:**
\`\`\`
photo, realistic, realism, 35mm film, dslr,
cropped, frame, text, signature, watermark
\`\`\`

### Model-Specific
- **Realistic models**: Focus on anatomy and artifact prevention
- **Anime models**: Prevent realistic features
- **Artistic models**: Avoid photographic elements

*Source: Model Documentation and Community Guides*`,
    category: "syntax",
    order: 6
  },
  {
    id: 7,
    title: "SDXL Special Syntax",
    content: `**SDXL models have unique features and syntax requirements.**

### SDXL Resolution
- Recommended: 1024x1024 base resolution
- Aspect ratios: 1:1, 9:16, 16:9, 2:3, 3:2
- Higher resolutions possible with proper settings

### SDXL Prompt Structure
\`\`\`
Main prompt: Subject, composition, style
Secondary prompt: Overall style, mood, quality

Example:
Prompt: woman in red dress, garden, sunset
Style prompt: cinematic, professional photography
\`\`\`

### SDXL Refiner
\`\`\`
Base model: 0-80% of steps
Refiner model: 80-100% of steps
Switch at: 0.8 strength typically
\`\`\`

### SDXL Specific Tags
\`\`\`
score_9, score_8_up, score_7_up, // Quality scores
source_anime, source_cartoon, // Source material
rating_safe, rating_questionable, // Content rating
\`\`\`

### Tips for SDXL
- Use natural language more than tags
- Describe scenes rather than listing elements
- Quality tags less necessary than SD 1.5
- Negative prompts can be simpler

*Source: SDXL Documentation and Papers*`,
    category: "syntax",
    order: 7
  },
  {
    id: 8,
    title: "Model Trigger Words",
    content: `**Many models and LoRAs require specific trigger words to activate their training.**

### Understanding Triggers
- Required words that activate model features
- Usually found in model documentation
- Case-sensitive in some models
- Position in prompt can matter

### Common Trigger Examples
\`\`\`
// Style LoRAs
"in the style of [artist]"
"artwork by [name]"
"[style] style"

// Character LoRAs
"[character name]"
"[outfit description]"
"[characteristic features]"

// Concept LoRAs
"[object name]"
"[specific pose]"
"[action word]"
\`\`\`

### Finding Triggers
1. Check model card on Civitai/HuggingFace
2. Look for "trigger words" or "activation tokens"
3. Review example prompts
4. Test with and without suspected triggers

### Multiple LoRA Usage
\`\`\`
<lora:style1:0.7> style1_trigger,
<lora:character1:0.8> char1_trigger,
<lora:pose1:0.5> pose1_trigger
\`\`\`

### Best Practices
- Place triggers early in prompt
- Don't over-weight trigger words
- Some LoRAs work without triggers (but better with)
- Test different trigger positions

*Source: Model Training Documentation*`,
    category: "syntax",
    order: 8
  },
  {
    id: 9,
    title: "Wildcards - Dynamic Prompt Variations",
    content: `**Wildcards enable random selection from predefined lists, creating diverse variations from a single prompt template.**

### What Are Wildcards?
Wildcards are placeholder tokens that get replaced with random selections from predefined word lists during generation. They allow you to create thousands of variations from a single prompt template.

### Basic Wildcard Syntax
\`\`\`
__wildcard__ - Single random selection
{option1|option2|option3} - Inline choices
{2$$option1|option2} - Weighted selection
{1-3$$option1|option2} - Random quantity selection
\`\`\`

### Common Wildcard Categories

**Character Wildcards:**
\`\`\`
__hair-color__ → blonde, brunette, red, black, silver
__eye-color__ → blue, green, brown, hazel, amber
__clothing__ → dress, suit, armor, casual wear
__profession__ → doctor, artist, warrior, scientist
__emotion__ → happy, sad, angry, contemplative
\`\`\`

**Environment Wildcards:**
\`\`\`
__location__ → forest, city, beach, mountain, space
__weather__ → sunny, rainy, snowy, foggy, stormy
__time-of-day__ → dawn, morning, noon, evening, night
__season__ → spring, summer, autumn, winter
\`\`\`

**Style Wildcards:**
\`\`\`
__art-style__ → realistic, anime, watercolor, oil painting
__color-scheme__ → vibrant, monochrome, pastel, dark
__lighting__ → soft, dramatic, natural, neon
__camera-angle__ → close-up, wide shot, aerial, low angle
\`\`\`

### Advanced Wildcard Usage

**Nested Wildcards:**
\`\`\`
__character__ wearing __outfit__ in __location__
// Expands to multiple combinations like:
// "warrior wearing armor in forest"
// "scientist wearing lab coat in laboratory"
\`\`\`

**Conditional Wildcards:**
\`\`\`
{__fantasy__|__scifi__|__modern__} setting
// Each wildcard contains theme-appropriate elements
\`\`\`

**Combinatorial Wildcards:**
\`\`\`
{2$$__adjective__} __subject__ with __feature__
// Creates combinations like:
// "beautiful, mysterious woman with glowing eyes"
// "ancient, powerful wizard with magical staff"
\`\`\`

### Creating Custom Wildcard Files

**File Structure:**
\`\`\`
wildcards/
├── colors.txt
├── emotions.txt
├── locations.txt
└── characters/
    ├── fantasy.txt
    ├── scifi.txt
    └── modern.txt
\`\`\`

**Example colors.txt:**
\`\`\`
crimson
azure
emerald
golden
silver
obsidian
pearl
\`\`\`

### Dynamic Prompt Templates

**Portrait Template:**
\`\`\`
__age__ __gender__ with __hair-length__ __hair-color__ hair 
and __eye-color__ eyes, wearing __outfit__, 
__emotion__ expression, __lighting__ lighting, 
__art-style__ style
\`\`\`

**Landscape Template:**
\`\`\`
__adjective__ __landscape-type__ during __time-of-day__, 
__weather__ weather, __season__ season, 
__color-mood__ color palette, __art-style__ style
\`\`\`

**Action Scene Template:**
\`\`\`
__character-type__ __action-verb__ through __environment__, 
__particle-effects__, dynamic pose, __camera-angle__, 
__lighting-type__ lighting, __art-style__
\`\`\`

### Wildcard Modifiers

**Syntax Variations:**
\`\`\`
__wildcard!__ - Force uppercase
__wildcard~__ - Force lowercase
__wildcard^__ - Capitalize first letter
__{wildcard}__ - Optional inclusion
__wildcard*3__ - Repeat 3 times with different values
\`\`\`

**Probability Control:**
\`\`\`
{70%::__rare-feature__|__common-feature__}
// 70% chance of rare feature, 30% common

{__option__::0.8} - Include with 80% probability
\`\`\`

### Platform-Specific Support

**Automatic1111:**
- Native wildcard support with Dynamic Prompts extension
- Supports nested and combinatorial wildcards
- Custom wildcard directories

**ComfyUI:**
- Wildcard nodes available
- Text randomization nodes
- Custom wildcard paths

**InvokeAI:**
- Built-in wildcard support
- Dynamic prompt templates
- Wildcard manager UI

**Forge:**
- Full wildcard compatibility
- Enhanced wildcard syntax
- Batch wildcard processing

### Best Practices

1. **Organize wildcards** by category and theme
2. **Test combinations** to ensure coherent results
3. **Balance variety** with consistency
4. **Use weights** for rare vs common options
5. **Create theme-specific** wildcard sets
6. **Document your wildcards** for team sharing
7. **Avoid conflicts** between incompatible options

### Common Wildcard Libraries

**Popular Collections:**
- AUTOMATIC1111 Wildcards
- Booru tag wildcards
- Artist name collections
- Style movement lists
- Color palette sets
- Emotion/expression lists

### Troubleshooting Wildcards

**Common Issues:**
- Missing wildcard files → Check file paths
- No variation → Verify wildcard syntax
- Incompatible combinations → Review wildcard contents
- Performance issues → Limit nested wildcards

### Example Workflow

1. Create base prompt template with wildcards
2. Define wildcard files with options
3. Test generations for variety
4. Refine wildcard lists based on results
5. Save successful templates for reuse

*Source: Dynamic Prompts Extension Documentation & Community Guides*`,
    category: "syntax",
    order: 9
  }
];

export const ANATOMY_GUIDES: Guide[] = [
  {
    id: 10,
    title: "Subject Definition",
    content: `**The subject is the primary focus of your image - what the viewer's eye is drawn to first.**

### Core Subject Elements
- **Who/What**: Person, animal, object, or abstract concept
- **Quantity**: Single subject, multiple subjects, groups
- **Positioning**: Centered, rule of thirds, dynamic placement

### Subject Description Hierarchy
1. **Basic Identity**: "woman", "cat", "mountain"
2. **Key Characteristics**: "young woman", "black cat", "snow-capped mountain"
3. **Distinctive Features**: "young woman with long red hair", "black cat with green eyes"
4. **Pose/Action**: "young woman with long red hair walking", "black cat stretching"

### Examples by Category
**Characters:**
\`\`\`
"elderly wizard with long white beard holding a glowing staff"
"cyberpunk hacker with neon tattoos typing on holographic keyboard"
"medieval knight in ornate armor kneeling"
\`\`\`

**Objects:**
\`\`\`
"ancient leather-bound book with golden clasps"
"futuristic hovering vehicle with blue energy trails"
"ornate Victorian pocket watch showing midnight"
\`\`\`

**Creatures:**
\`\`\`
"majestic phoenix with burning feathers ascending"
"mechanical dragon with steam vents and brass plating"
"ethereal forest spirit made of leaves and light"
\`\`\`

### Tips for Strong Subjects
- Start with the most important element
- Be specific but not overly complex
- Consider the subject's relationship to the scene
- Add distinctive features that make it memorable

*Source: Professional Artist Guidelines*`,
    category: "anatomy",
    order: 1
  },
  {
    id: 11,
    title: "Style & Medium",
    content: `**Define the artistic style and medium to control the overall aesthetic of your image.**

### Popular Art Styles
**Traditional Art:**
\`\`\`
oil painting, watercolor, pencil sketch, charcoal drawing,
pastel art, ink illustration, acrylic painting
\`\`\`

**Digital Art:**
\`\`\`
digital painting, 3D render, vector art, pixel art,
concept art, matte painting, digital illustration
\`\`\`

**Photography:**
\`\`\`
photograph, DSLR photo, film photography, polaroid,
35mm film, medium format, macro photography
\`\`\`

### Artistic Movements
\`\`\`
impressionism, art nouveau, baroque, minimalism,
surrealism, pop art, abstract expressionism
\`\`\`

### Style Combinations
**Mixed Media Examples:**
\`\`\`
"watercolor and ink illustration"
"digital painting with oil painting texture"
"photograph with double exposure effect"
\`\`\`

### Artist References
**Classic Artists:**
\`\`\`
"in the style of Van Gogh"
"Monet-inspired impressionism"
"reminiscent of Rembrandt lighting"
\`\`\`

**Modern Artists:**
\`\`\`
"trending on ArtStation"
"by Greg Rutkowski"
"Simon Stålenhag aesthetic"
\`\`\`

### Platform-Specific Styles
- **Midjourney**: Responds well to artistic movements
- **Stable Diffusion**: Benefits from specific medium descriptions
- **DALL-E**: Prefers clear style + subject combinations

*Source: Art History and Digital Art Communities*`,
    category: "anatomy",
    order: 2
  },
  {
    id: 12,
    title: "Environment & Setting",
    content: `**The environment provides context and atmosphere for your subject.**

### Location Types
**Natural Settings:**
\`\`\`
forest, mountain range, beach, desert, meadow,
underwater, cave, volcano, glacier, rainforest
\`\`\`

**Urban Settings:**
\`\`\`
city street, rooftop, alleyway, subway station,
skyscraper interior, abandoned building, mall
\`\`\`

**Fantasy Settings:**
\`\`\`
floating islands, crystal cave, enchanted forest,
dragon's lair, wizard tower, ethereal realm
\`\`\`

### Environmental Details
**Weather & Atmosphere:**
\`\`\`
foggy morning, stormy night, golden hour sunset,
misty atmosphere, clear sunny day, overcast
\`\`\`

**Time of Day:**
\`\`\`
dawn, morning, noon, afternoon, dusk, twilight,
night, midnight, blue hour, magic hour
\`\`\`

### Depth & Layers
**Foreground Elements:**
\`\`\`
"flowers in the foreground"
"rocks and grass in front"
"blurred foreground elements"
\`\`\`

**Background Elements:**
\`\`\`
"mountains in the distance"
"city skyline background"
"blurred background (bokeh)"
\`\`\`

### Environmental Mood
\`\`\`
serene, chaotic, mysterious, peaceful, ominous,
whimsical, dystopian, utopian, apocalyptic
\`\`\`

### Integration Tips
- Match environment to subject mood
- Use environment to tell a story
- Consider how lighting affects the setting
- Add environmental effects for atmosphere

*Source: Environmental Design Principles*`,
    category: "anatomy",
    order: 3
  },
  {
    id: 13,
    title: "Lighting Techniques",
    content: `**Lighting dramatically affects mood, depth, and visual impact of your image.**

### Basic Lighting Types
**Natural Lighting:**
\`\`\`
sunlight, moonlight, starlight, firelight,
candlelight, bioluminescence, lightning
\`\`\`

**Artificial Lighting:**
\`\`\`
studio lighting, neon lights, street lamps,
LED lights, fluorescent, incandescent
\`\`\`

### Lighting Directions
\`\`\`
front lighting - Even, minimal shadows
side lighting - Dramatic, emphasizes texture
back lighting - Silhouettes, rim lighting
top lighting - Dramatic shadows
bottom lighting - Eerie, unusual effect
\`\`\`

### Advanced Lighting Techniques
**Cinematic Lighting:**
\`\`\`
"Rembrandt lighting" - Triangle of light on cheek
"rim lighting" - Light outline around subject
"volumetric lighting" - Visible light rays
"split lighting" - Half face in shadow
"butterfly lighting" - Shadow under nose
\`\`\`

**Mood Lighting:**
\`\`\`
"golden hour lighting" - Warm, soft
"blue hour lighting" - Cool, ethereal
"dramatic chiaroscuro" - High contrast
"soft diffused lighting" - Gentle, even
"harsh directional light" - Strong shadows
\`\`\`

### Color Temperature
\`\`\`
warm lighting (3000K) - Cozy, inviting
neutral lighting (5000K) - Natural, balanced
cool lighting (7000K) - Clinical, modern
\`\`\`

### Special Effects
\`\`\`
lens flare, god rays, caustics, subsurface scattering,
ambient occlusion, global illumination, HDR lighting
\`\`\`

### Tips for Better Lighting
- Specify time of day for natural consistency
- Combine multiple light sources for depth
- Use lighting to guide viewer's eye
- Match lighting to emotional tone

*Source: Photography and Cinematography Guides*`,
    category: "anatomy",
    order: 4
  },
  {
    id: 14,
    title: "Camera & Composition",
    content: `**Camera angles and composition rules create visual interest and guide the viewer's eye.**

### Camera Angles
**Vertical Angles:**
\`\`\`
eye level - Neutral, relatable
low angle - Makes subject appear powerful
high angle - Makes subject appear vulnerable
bird's eye view - Overview, detached
worm's eye view - Dramatic, imposing
\`\`\`

**Shot Types:**
\`\`\`
extreme close-up - Intense detail
close-up - Face/object detail
medium shot - Waist up
full shot - Entire subject
wide shot - Subject in environment
extreme wide shot - Emphasis on location
\`\`\`

### Composition Rules
**Classic Techniques:**
\`\`\`
rule of thirds - Subject at intersection points
golden ratio - Natural, pleasing proportions
leading lines - Guide eye to subject
symmetry - Balance and harmony
frame within frame - Depth and focus
\`\`\`

### Depth of Field
\`\`\`
shallow depth of field - Blurred background
deep depth of field - Everything in focus
bokeh - Aesthetic blur quality
tilt-shift - Miniature effect
\`\`\`

### Camera Settings (Photography)
\`\`\`
85mm lens - Portrait, compressed background
35mm lens - Environmental portrait
24mm lens - Wide angle, landscape
macro lens - Extreme close-up detail
fisheye lens - Ultra-wide, distorted
\`\`\`

### Dynamic Composition
\`\`\`
dutch angle - Tilted, unsettling
over-the-shoulder - Perspective, connection
point of view (POV) - First person perspective
isometric view - Technical, game-like
\`\`\`

### Tips for Composition
- Choose angle based on emotional impact
- Use composition to tell a story
- Consider negative space
- Balance elements across the frame

*Source: Cinematography and Photography Fundamentals*`,
    category: "anatomy",
    order: 5
  },
  {
    id: 15,
    title: "Color & Mood",
    content: `**Color palettes define the emotional tone and visual cohesion of your image.**

### Color Schemes
**Monochromatic:**
\`\`\`
"monochrome blue tones"
"sepia toned"
"black and white with red accent"
\`\`\`

**Complementary:**
\`\`\`
"orange and blue color scheme"
"purple and yellow contrast"
"red and green palette"
\`\`\`

**Analogous:**
\`\`\`
"warm sunset colors"
"cool ocean blues and greens"
"autumn reds and oranges"
\`\`\`

### Emotional Color Associations
**Warm Colors:**
\`\`\`
red - Passion, energy, danger
orange - Enthusiasm, creativity, warmth
yellow - Happiness, optimism, caution
\`\`\`

**Cool Colors:**
\`\`\`
blue - Calm, trust, sadness
green - Nature, growth, harmony
purple - Luxury, mystery, spirituality
\`\`\`

### Color Grading Styles
**Cinematic Looks:**
\`\`\`
"teal and orange grade" - Blockbuster movies
"desaturated colors" - Gritty realism
"high contrast vivid" - Comic book style
"pastel color palette" - Soft, dreamy
"neon cyberpunk colors" - Futuristic
\`\`\`

### Saturation & Contrast
\`\`\`
vibrant colors - Energy, excitement
muted colors - Subtle, sophisticated
high contrast - Drama, impact
low contrast - Soft, ethereal
\`\`\`

### Special Color Effects
\`\`\`
color splash - B&W with color accent
duotone - Two color treatment
split toning - Different colors in highlights/shadows
cross processing - Altered color curves
\`\`\`

### Tips for Color Use
- Choose colors that support the mood
- Limit palette for cohesion (3-5 main colors)
- Use contrast to draw attention
- Consider cultural color meanings

*Source: Color Theory and Film Grading*`,
    category: "anatomy",
    order: 6
  },
  {
    id: 16,
    title: "Details & Textures",
    content: `**Fine details and textures add realism and visual interest to your images.**

### Surface Textures
**Natural Textures:**
\`\`\`
rough bark, smooth stone, grainy sand,
wet surface, frost crystals, moss covered
\`\`\`

**Material Properties:**
\`\`\`
metallic, glossy, matte, translucent,
iridescent, reflective, weathered, polished
\`\`\`

### Fabric & Clothing
\`\`\`
silk - Smooth, shiny, flowing
denim - Rough, sturdy, casual
leather - Textured, aged, tough
lace - Delicate, intricate, transparent
velvet - Soft, luxurious, light-absorbing
\`\`\`

### Skin & Hair Details
**Skin:**
\`\`\`
"porcelain skin", "weathered skin",
"freckles", "glowing skin", "tattoos"
\`\`\`

**Hair:**
\`\`\`
"flowing hair", "braided", "messy",
"wet hair", "windswept", "perfectly styled"
\`\`\`

### Environmental Details
\`\`\`
rain drops, dust particles, fog wisps,
falling leaves, snow flakes, light rays
\`\`\`

### Architectural Details
\`\`\`
ornate carvings, weathered brick, glass reflections,
rust stains, peeling paint, intricate patterns
\`\`\`

### Level of Detail Keywords
\`\`\`
intricate details, fine details, hyperdetailed,
highly detailed, ultra detailed, simple, minimalist
\`\`\`

### Tips for Details
- Balance detail level with style
- Focus details on important areas
- Use textures to convey age/condition
- Don't over-detail everything

*Source: 3D Texturing and Digital Art Tutorials*`,
    category: "anatomy",
    order: 7
  },
  {
    id: 17,
    title: "Action & Movement",
    content: `**Dynamic poses and motion effects bring life and energy to static images.**

### Types of Movement
**Character Actions:**
\`\`\`
running, jumping, dancing, fighting,
flying, falling, swimming, climbing
\`\`\`

**Subtle Movements:**
\`\`\`
hair blowing in wind, clothes billowing,
turning head, reaching out, gesturing
\`\`\`

### Motion Effects
**Speed Effects:**
\`\`\`
motion blur - Sense of speed
speed lines - Manga-style movement
afterimage - Multiple positions
time-lapse - Multiple exposures
\`\`\`

**Dynamic Elements:**
\`\`\`
explosion, splash, shatter, swirl,
particles, debris, energy trails
\`\`\`

### Pose Dynamics
**Action Poses:**
\`\`\`
"mid-jump", "in mid-air",
"dynamic action pose", "combat stance",
"leaning forward", "twisted torso"
\`\`\`

**Emotional Poses:**
\`\`\`
"arms raised in victory"
"hunched in defeat"
"protective stance"
"relaxed posture"
\`\`\`

### Environmental Motion
\`\`\`
flowing water, rustling leaves, billowing smoke,
swirling mist, floating particles, ripples
\`\`\`

### Freezing Motion
\`\`\`
"frozen in time", "caught mid-action",
"suspended in air", "perfect timing shot"
\`\`\`

### Tips for Movement
- Use motion to convey emotion
- Consider physics and weight
- Balance static and dynamic elements
- Direct eye flow with movement

*Source: Animation Principles and Action Photography*`,
    category: "anatomy",
    order: 8
  },
  {
    id: 18,
    title: "Special Effects",
    content: `**Special effects add magic, technology, or surreal elements to enhance your image.**

### Magical Effects
\`\`\`
glowing aura, magical particles, energy field,
spell casting, ethereal glow, mystic symbols,
floating runes, enchanted sparkles
\`\`\`

### Sci-Fi Effects
\`\`\`
hologram, laser beams, force field, plasma,
electricity arcs, data streams, neon circuits,
technological interface, augmented reality overlay
\`\`\`

### Natural Phenomena
\`\`\`
aurora borealis, bioluminescence, rainbow,
lens flare, sun rays, lightning strike,
fire and flames, ice crystals
\`\`\`

### Atmospheric Effects
\`\`\`
fog and mist, smoke, steam, dust clouds,
particle effects, volumetric lighting,
depth haze, atmospheric perspective
\`\`\`

### Post-Processing Effects
\`\`\`
chromatic aberration, vignette, grain,
double exposure, glitch effect, light leaks,
bloom, HDR tone mapping
\`\`\`

### Surreal Effects
\`\`\`
floating objects, gravity defying, melting,
fragmentation, dispersion, kaleidoscope,
mirror world, dimensional rift
\`\`\`

### Water & Liquid Effects
\`\`\`
splashing water, rain drops, underwater caustics,
ripples, waterfalls, bubbles, wet surfaces
\`\`\`

### Tips for Special Effects
- Don't overuse - less is often more
- Match effects to overall style
- Consider light source for effects
- Integrate effects naturally

*Source: VFX and Digital Effects Guidelines*`,
    category: "anatomy",
    order: 9
  }
];

export const NANO_BANANA_GUIDES: Guide[] = [
  {
    id: 19,
    title: "How to Use Nano Banana AI with Gemini 2.5",
    content: `**Getting started with Nano Banana AI tool is simple, but the key to stunning results lies in your input images and Nano Banana model prompts. Follow these steps to turn ordinary photos into creative, professional-quality visuals.**

## 1. Go to the Nano Banana AI Tool

Visit the official platform, [Google AI Studio](https://aistudio.google.com), or other tools to access Nano Banana AI. The interface is simple, so you can start creating right away.

**Look for the Nano Banana Model (Gemini 2.5 Flash Image)** in the model selection area and select it to begin working with this powerful AI image generation tool.

### Key Features
- **Input Your Prompts**: Describe what you want to create or edit
- **Upload Your Images**: Add reference images or photos to transform

## 2. Upload the Image You Want to Edit

Upload a clear photo or sketch as your base. **High-quality inputs always produce better results.**

The clearer and higher quality your input image, the better the AI can understand and transform it according to your prompts.

## 3. Input Nano Banana Prompts

Type in detailed AI photo prompts for Gemini Nano Banana describing the edits, styles, or transformations you want. You can copy and paste one of the provided trending Nano Banana image prompts for the first try.

**Example Prompt:**
\`\`\`
Create an image of a smiling young woman wearing a flowing red dress, 
gently cradling a golden retriever puppy in her arms, standing on a 
grassy park path with sunlight filtering through the trees. 
Photorealistic style, with natural shadows and vivid colors.
\`\`\`

## 4. Preview the Result

Generate and check the output instantly. If needed, **adjust your AI photo prompt and refine it until it's perfect**. Then, you can download this Nano Banana AI-generated image and enjoy the fun.

### Bonus
✨ **Fotor** also provides access to the Nano Banana AI photo editor, allowing you to experiment with the same powerful prompts while enjoying its built-in photo editing tools. It's a convenient way to explore creative image generation and editing all in one platform.

*Source: Google AI Studio Documentation*`,
    category: "nano-banana",
    order: 1
  },
  {
    id: 20,
    title: "Practical Nano Banana Prompt Tips",
    content: `**Master the art of Nano Banana prompting with these essential tips for creating stunning AI-generated images.**

## 1️⃣ Craft Detailed Prompts

Begin your Nano Banana model photo prompts with action verbs like **"Create,"** **"Generate,"** or **"Draw."** Clearly describe the subject, action, setting, and desired style. For example:

**Example:**
\`\`\`
"Create an image of a smiling young woman wearing a flowing red dress, 
gently cradling a golden retriever puppy in her arms, standing on a 
grassy park path with sunlight filtering through the trees. 
Photorealistic style, with natural shadows and vivid colors."
\`\`\`

If you don't know how to start, you can try to copy and paste Gemini AI photo prompts from above.

## 2️⃣ Iterative Refinement

Use a conversational approach to refine your image over multiple interactions. Start with a broad Gemini AI photo prompt and progressively add details to achieve the desired outcome.

### Refinement Process
- Start with basic description
- Add specific details in follow-up prompts
- Adjust elements that need improvement
- Fine-tune until satisfied

## 3️⃣ Specify Artistic Styles

Incorporate Nano Banana prompt style example such as **"watercolor painting,"** **"cyberpunk,"** or **"anime"** to guide the aesthetic of the generated image. This helps in aligning the output with your creative vision.

### Popular Style Examples
\`\`\`
- Watercolor painting
- Cyberpunk aesthetic
- Anime style
- Oil painting
- Digital art
- Photorealistic
- Minimalist
- Vintage photography
\`\`\`

## 4️⃣ Leverage Contextual Information

Provide context about the scene, time of day, or emotional tone to enhance the relevance and coherence of the Gemini AI-generated image.

### Contextual Elements to Include
- **Time of Day**: Dawn, sunset, midnight, golden hour
- **Weather**: Sunny, rainy, foggy, stormy
- **Mood**: Peaceful, dramatic, mysterious, joyful
- **Season**: Spring blooms, autumn leaves, winter snow

## 5️⃣ Experiment with Variations

Don't hesitate to modify your Gemini prompts by changing elements like color schemes, lighting conditions, or perspectives to explore different creative possibilities.

### Variation Ideas
- Change color palettes
- Adjust lighting angles
- Try different camera perspectives
- Modify composition elements
- Experiment with different times of day

## 6️⃣ Maintain Consistent Lighting

When replacing objects, adjusting poses, or fusing images, match lighting and perspective to keep results realistic.

### Lighting Tips
- Match light direction across all elements
- Maintain consistent shadow angles
- Keep color temperature uniform
- Consider ambient vs. direct lighting
- Preserve light intensity relationships

## Conclusion

Explored the latest and most popular ways to use the Nano Banana AI image editor model, from multi-image fusion and style blending to pose control, facial expression edits, and creative 3D figure generation. We provided detailed Nano Banana AI photo and practical tips to help users achieve high-quality, customized outputs effortlessly. You can check the [Nano Banana vs Flux Kontext](https://www.fotor.com/blog/nano-banana-vs-flux-kontext/) to see that Nano Banana AI stands out with faster generation speeds, more versatile style adaptation, and superior handling of complex edits, making it a go-to choice for both creative experimentation and professional-grade image generation. By applying the techniques shared here, users can unlock the full potential of AI-driven visual creativity.

*Source: Nano Banana AI Best Practices & Community Guides*`,
    category: "nano-banana",
    order: 2
  }
];

export const ALL_GUIDES = [...SYNTAX_GUIDES, ...ANATOMY_GUIDES, ...NANO_BANANA_GUIDES];

export interface Resource {
  id: string;
  title: string;
  description: string;
  url?: string;
  category: string;
  icon?: string;
  isFavorite?: boolean;
  buttonText?: string;
}

export const PROMPT_RESOURCES: Resource[] = [
  // Tutorials & Guides
   {
    id: "sd-prompt-guide",
    title: "Stable Diffusion Prompt Guide",
    description: "Comprehensive guide to prompting in Stable Diffusion with examples and best practices",
    url: "https://stable-diffusion-art.com/prompt-guide/",
    category: "tutorials",
    icon: "book"
  },
  {
    id: "civitai-guide",
    title: "Civitai Prompt Guide",
    description: "Community-driven prompt guide with model-specific tips and techniques",
    url: "https://civitai.com/articles",
    category: "tutorials",
    icon: "book"
  },
  {
    id: "midjourney-docs",
    title: "Midjourney Documentation",
    description: "Official documentation for Midjourney's advanced prompting features and parameters",
    url: "https://docs.midjourney.com",
    category: "tutorials",
    icon: "book",
    isFavorite: true
  },
  
  // Community Resources
  {
    id: "midjourney-showcase",
    title: "Midjourney Community Showcase",
    description: "Explore prompts and creations from the Midjourney community",
    url: "https://www.midjourney.com/showcase",
    category: "community",
    icon: "users",
    isFavorite: true
  },
  {
    id: "prompthero",
    title: "PromptHero",
    description: "Browse millions of AI art images and their prompts from various models",
    url: "https://prompthero.com",
    category: "community",
    icon: "users"
  },
  
  // Tools & Applications
  {
    id: "automatic1111",
    title: "Automatic1111 WebUI",
    description: "Popular Stable Diffusion web interface with advanced features",
    url: "https://github.com/AUTOMATIC1111/stable-diffusion-webui",
    category: "tools",
    icon: "tool"
  },
  {
    id: "comfyui",
    title: "ComfyUI",
    description: "Node-based interface for advanced Stable Diffusion workflows",
    url: "https://github.com/comfyanonymous/ComfyUI",
    category: "tools",
    icon: "tool"
  },
  {
    id: "invokeai",
    title: "InvokeAI",
    description: "Professional creative engine for Stable Diffusion models",
    url: "https://invoke-ai.github.io/InvokeAI/",
    category: "tools",
    icon: "tool"
  },
  
  // Prompt Building Tools
  {
    id: "atrium-generator",
    title: "Atrium Prompt Generator",
    description: "Advanced prompt generator with detailed options and templates",
    category: "builders",
    icon: "wand",
    buttonText: "Open Generator",
    isFavorite: true
  },
  {
    id: "flux-generator",
    title: "FLUX Prompt Generator",
    description: "Specialized prompt generator for FLUX models",
    category: "builders",
    icon: "wand",
    buttonText: "Open Generator"
  },
  {
    id: "promptomania",
    title: "Promptomania Builder",
    description: "Visual prompt builder with extensive style and modifier options",
    url: "https://promptomania.com",
    category: "builders",
    icon: "wand"
  }
];

export const LEARNING_RESOURCES: Resource[] = [
  {
    id: "reddit-sd",
    title: "r/StableDiffusion",
    description: "Active community for Stable Diffusion discussions and tips",
    url: "https://reddit.com/r/stablediffusion",
    category: "learning",
    icon: "message-circle"
  },
  {
    id: "reddit-mj",
    title: "r/Midjourney",
    description: "Midjourney community on Reddit",
    url: "https://reddit.com/r/midjourney",
    category: "learning",
    icon: "message-circle"
  },
  {
    id: "youtube-tutorials",
    title: "YouTube Tutorials",
    description: "Video tutorials for AI art generation",
    url: "https://youtube.com/results?search_query=ai+art+prompting",
    category: "learning",
    icon: "play-circle"
  },
  {
    id: "discord-servers",
    title: "Discord Communities",
    description: "Join AI art Discord servers for real-time help",
    url: "https://discord.com",
    category: "learning",
    icon: "message-square"
  }
];

export const QUICK_TIPS = [
  "Start simple, then add details gradually",
  "Use commas to separate concepts clearly",
  "Quality tags at the beginning often work better",
  "Negative prompts are as important as positive ones",
  "Test small changes to understand their impact",
  "Save prompts that work well for future reference",
  "Different models respond to different prompt styles",
  "Combine multiple techniques for unique results",
  "Learn from community prompts but develop your style",
  "Experiment with weight values between 0.5-1.5"
];