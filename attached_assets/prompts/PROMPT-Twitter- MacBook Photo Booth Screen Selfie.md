---
category: Prompt
type: Twitter
status: Inbox
tags: [clip/prompt, identity-lock, screen-reflection, macbook, photo-booth, realism, natural-lighting, digital-interface, gemini-nano-banana-pro]
---
# 🤖 MacBook Photo Booth Screen Selfie
**Author:** Zaylee (@zayleeai) | **Model:** Gemini Nano Banana Pro | **Type:** JSON Workflow

### 🧞 Extracted Prompt
```json
{
  "image_settings": {
    "aspect_ratio": "3:4",
    "resolution": {
      "width": 1152,
      "height": 1536
    }
  },
  "prompt": {
    "identity_lock": {
      "reference": "input_photo",
      "preserve": [
        "face",
        "facial proportions",
        "eye shape",
        "nose",
        "lips",
        "skin tone",
        "skin texture",
        "hairline",
        "overall identity"
      ],
      "rules": [
        "no face swap",
        "no beautify",
        "no smoothing",
        "no reshaping",
        "no AI look"
      ]
    },
    "scene": {
      "camera_angle": "high-angle downward shot, POV",
      "composition": "MacBook screen fills most of the frame, thin strip of physical keyboard visible at the bottom",
      "screen_surface": [
        "visible RGB pixel grid",
        "subtle moire effect",
        "micro dust on glass",
        "faint fingerprints",
        "soft ambient reflections"
      ]
    },
    "digital_interface": {
      "os": "macOS dark mode",
      "background_app": {
        "name": "Spotify",
        "view": "Liked Songs",
        "visible_tracks": [
          "Blank Space \u2013 Taylor Swift",
          "Shake It Off \u2013 Taylor Swift",
          "Cruel Summer \u2013 Taylor Swift",
          "Love Story \u2013 Taylor Swift"
        ]
      },
      "foreground_app": {
        "name": "Photo Booth",
        "state": "live preview window",
        "position": "floating, center-right"
      }
    },
    "photo_booth_content": {
      "environment": {
        "room": "dim bedroom",
        "background": "off-white wall, rumpled bedding",
        "lighting": "low-light, nocturnal, cool screen glow mixed with warm skin tones"
      },
      "subject": {
        "pose": "lying down, relaxed, candid",
        "expression": "natural, slightly relaxed",
        "outfit": "light-colored tank top",
        "prop": {
          "item": "iPhone 15 Pro",
          "hand": "right hand"
        }
      }
    },
    "realism_rules": [
      "this is a photo of a screen, not a screenshot",
      "raw smartphone photo look",
      "natural noise",
      "imperfect glass",
      "no studio lighting",
      "no HD polish"
    ]
  },
  "negative_prompt": [
    "screenshot",
    "flat UI",
    "perfect screen",
    "clean glass",
    "studio lighting",
    "beauty filter",
    "cartoon",
    "3d render",
    "painting",
    "watermark",
    "blurred face"
  ]
}
```

---
### 🖼️ Example Images
![[MacBookPhotoBoothScreenSelfie_1.jpg]]
![[MacBookPhotoBoothScreenSelfie_2.jpg]]


---
### 📺 Media
<iframe border=0 frameborder=0 height=250 width=550 src="https://platform.twitter.com/embed/Tweet.html?id=2001943686897189281"></iframe>

source: https://x.com/zayleeai/status/2001943686897189281?s=20

---

> [!info]- 📄 Original Source Content (Captions/OCR)
> AI or real? 👀💻
> 
> • Gemini Nano Banana Pro 🧚
> 
> base prompt: @notiiivy 🤩
> 
> - How it works?
> 
> Input Photo + Prompt
> 
> Prompt:
> 
> {
>   "image_settings": {
>     "aspect_ratio": "3:4",
>     "resolution": {
>       "width": 1152,
>       "height": 1536
>     }
>   },
> 
>   "prompt": {
>     "identity_lock": {
>       "reference": "input_photo",
>       "preserve": [
>         "face",
>         "facial proportions",
>         "eye shape",
>         "nose",
>         "lips",
>         "skin tone",
>         "skin texture",
>         "hairline",
>         "overall identity"
>       ],
>       "rules": [
>         "no face swap",
>         "no beautify",
>         "no smoothing",
>         "no reshaping",
>         "no AI look"
>       ]
>     },
> 
>     "scene": {
>       "camera_angle": "high-angle downward shot, POV",
>       "composition": "MacBook screen fills most of the frame, thin strip of physical keyboard visible at the bottom",
>       "screen_surface": [
>         "visible RGB pixel grid",
>         "subtle moire effect",
>         "micro dust on glass",
>         "faint fingerprints",
>         "soft ambient reflections"
>       ]
>     },
> 
>     "digital_interface": {
>       "os": "macOS dark mode",
>       "background_app": {
>         "name": "Spotify",
>         "view": "Liked Songs",
>         "visible_tracks": [
>           "Blank Space – Taylor Swift",
>           "Shake It Off – Taylor Swift",
>           "Cruel Summer – Taylor Swift",
>           "Love Story – Taylor Swift"
>         ]
>       },
>       "foreground_app": {
>         "name": "Photo Booth",
>         "state": "live preview window",
>         "position": "floating, center-right"
>       }
>     },
> 
>     "photo_booth_content": {
>       "environment": {
>         "room": "dim bedroom",
>         "background": "off-white wall, rumpled bedding",
>         "lighting": "low-light, nocturnal, cool screen glow mixed with warm skin tones"
>       },
>       "subject": {
>         "pose": "lying down, relaxed, candid",
>         "expression": "natural, slightly relaxed",
>         "outfit": "light-colored tank top",
>         "prop": {
>           "item": "iPhone 15 Pro",
>           "hand": "right hand"
>         }
>       }
>     },
> 
>     "realism_rules": [
>       "this is a photo of a screen, not a screenshot",
>       "raw smartphone photo look",
>       "natural noise",
>       "imperfect glass",
>       "no studio lighting",
>       "no HD polish"
>     ]
>   },
> 
>   "negative_prompt": [
>     "screenshot",
>     "flat UI",
>     "perfect screen",
>     "clean glass",
>     "studio lighting",
>     "beauty filter",
>     "cartoon",
>     "3d render",
>     "painting",
>     "watermark",
>     "blurred face"
>   ]
> }

---
### 🧠 Core Insights
- Generating a "photo of a screen" rather than a "screenshot."
- Detailed focus on screen imperfections (pixel grid, moire, dust, fingerprints).
- Identity preservation with strict rules against common AI alterations (face swap, beautify).
- Specific digital interface elements (macOS dark mode, Spotify, Photo Booth).
- Realistic ambient lighting and scene setup (dim bedroom, low-light, screen glow).

### 📝 Core Summary
This elaborate JSON prompt details the creation of a hyper-realistic image of a person taking a selfie, as seen through a MacBook's Photo Booth application. It meticulously specifies the digital interface, screen imperfections, subject's identity, pose, and lighting to achieve a raw, unedited smartphone photo aesthetic on a visible screen surface. The prompt emphasizes avoiding any artificial "AI look" or beautification filters, aiming for authenticity.

### 🔄 Flows & Concepts
- Workflow: Input Photo + Prompt -> Output Image.
- Identity Locking: Preserving specific facial features and overall identity with negative rules against common AI manipulations.
- Photo-of-a-Screen Realism: Directives for creating an image that looks like a photo taken *of* a screen, not a digital screenshot, including specific visual artifacts (pixel grid, dust, reflections).
- Detailed Scene & Digital Interface Specification: Comprehensive description of the environment, operating system, background and foreground applications, and their content.
- Anti-AI Aesthetic: Explicitly avoiding "AI look," "beauty filter," "studio lighting," and "HD polish" to maintain a natural, imperfect photographic feel.

### 🏷️ Tags
identity-lock, screen-reflection, macbook, photo-booth, realism, natural-lighting, digital-interface, gemini-nano-banana-pro

