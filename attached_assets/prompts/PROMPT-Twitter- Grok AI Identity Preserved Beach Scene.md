---
category: Prompt
type: Twitter
status: Inbox
tags: [clip/prompt, photorealism, identitypreservation, grokai, beachscene, goldenhour, bikini, wetlook, jsonworkflow]
---
# 🤖 Grok AI Identity Preserved Beach Scene
**Author:** Iris (@xIrissy) | **Model:** Grok AI | **Type:** JSON Workflow

### 🧞 Extracted Prompt
```json
{
  "node_graph_configuration": {
    "version": "4.0.1",
    "workflow_type": "Identity_Preserved_Photorealism"
  },
  "nodes": {
    "NODE_01_INPUT_LOADER": {
      "type": "LoadImage",
      "parameters": {
        "image_source": "reference_file_upload.png",
        "mask_detection": "auto_face_body"
      }
    },
    "NODE_02_IDENTITY_CONTROL": {
      "type": "IP_Adapter_Advanced",
      "inputs": {
        "image": "NODE_01_INPUT_LOADER",
        "model": "face_plus_body_v2.safetensors"
      },
      "settings": {
        "weight": 1.0,
        "noise": 0.0,
        "start_at": 0.0,
        "end_at": 1.0,
        "instruction": "100% match constraint"
      }
    },
    "NODE_03_TEXT_ENCODER_POSITIVE": {
      "type": "CLIP_Text_Encode",
      "segments": [
        {
          "id": "subject_def",
          "text": "A captivating shot of a woman with long dark hair",
          "weight": 1.2,
          "clip_layer": 1
        },
        {
          "id": "action_pose",
          "text": "kneeling on a sandy beach, kneeling posture",
          "weight": 1.1,
          "clip_layer": 1
        },
        {
          "id": "attire_desc",
          "text": "wearing a blue and white wet bikini tank top, wet fabric texture, fitted",
          "weight": 1.1,
          "clip_layer": 2
        },
        {
          "id": "lighting_atmos",
          "text": "The setting sun casts a warm glow, highlighting her features, golden hour",
          "weight": 1.0,
          "clip_layer": 2
        },
        {
          "id": "environment_detail",
          "text": "wet sand around her, reflective ground, ocean waves softly visible in background, serene beach atmosphere",
          "weight": 1.0,
          "clip_layer": 3
        }
      ]
    },
    "NODE_04_TEXT_ENCODER_NEGATIVE": {
      "type": "CLIP_Text_Encode",
      "text_string": "nsfw, deformed, blurry, bad anatomy, disfigured, low resolution, cartoon, graphic, illustration, dry sand, dull lighting, altered face, changed body structure"
    },
    "NODE_05_SAMPLER_SETTINGS": {
      "type": "KSampler",
      "parameters": {
        "seed": "random_int",
        "steps": 35,
        "cfg_scale": 7.0,
        "sampler_name": "dpmpp_2m_sde",
        "scheduler": "karras",
        "denoise": 1.0
      }
    },
    "NODE_06_FINAL_OUTPUT": {
      "type": "Image_Save",
      "metadata": {
        "prompt_string": "((100% same face and body)), A captivating shot of a woman with long dark hair, kneeling on a sandy beach. She's wearing a blue and white wet bikini tank top. The setting sun casts a warm glow, highlighting her features and the wet sand around her. The ocean waves are softly visible in the background.",
        "resolution": "1024x1536",
        "aspect_ratio": "2:3"
      }
    }
  }
}
```

---
### 🖼️ Example Images
![[GrokAIIdentityPreservedBeachScene_1.jpg]]


---
### 📺 Media
<iframe border=0 frameborder=0 height=250 width=550 src="https://platform.twitter.com/embed/Tweet.html?id=2001913867807658167"></iframe>

source: https://x.com/xIrissy/status/2001913867807658167?s=20

---

> [!info]- 📄 Original Source Content (Captions/OCR)
> Grok AI
> 
> Prompt:-
> 
> {
>   "node_graph_configuration": {
>     "version": "4.0.1",
>     "workflow_type": "Identity_Preserved_Photorealism"
>   },
>   "nodes": {
>     "NODE_01_INPUT_LOADER": {
>       "type": "LoadImage",
>       "parameters": {
>         "image_source": "reference_file_upload.png",
>         "mask_detection": "auto_face_body"
>       }
>     },
>     "NODE_02_IDENTITY_CONTROL": {
>       "type": "IP_Adapter_Advanced",
>       "inputs": {
>         "image": "NODE_01_INPUT_LOADER",
>         "model": "face_plus_body_v2.safetensors"
>       },
>       "settings": {
>         "weight": 1.0,
>         "noise": 0.0,
>         "start_at": 0.0,
>         "end_at": 1.0,
>         "instruction": "100% match constraint"
>       }
>     },
>     "NODE_03_TEXT_ENCODER_POSITIVE": {
>       "type": "CLIP_Text_Encode",
>       "segments": [
>         {
>           "id": "subject_def",
>           "text": "A captivating shot of a woman with long dark hair",
>           "weight": 1.2,
>           "clip_layer": 1
>         },
>         {
>           "id": "action_pose",
>           "text": "kneeling on a sandy beach, kneeling posture",
>           "weight": 1.1,
>           "clip_layer": 1
>         },
>         {
>           "id": "attire_desc",
>           "text": "wearing a blue and white wet bikini tank top, wet fabric texture, fitted",
>           "weight": 1.1,
>           "clip_layer": 2
>         },
>         {
>           "id": "lighting_atmos",
>           "text": "The setting sun casts a warm glow, highlighting her features, golden hour",
>           "weight": 1.0,
>           "clip_layer": 2
>         },
>         {
>           "id": "environment_detail",
>           "text": "wet sand around her, reflective ground, ocean waves softly visible in background, serene beach atmosphere",
>           "weight": 1.0,
>           "clip_layer": 3
>         }
>       ]
>     },
>     "NODE_04_TEXT_ENCODER_NEGATIVE": {
>       "type": "CLIP_Text_Encode",
>       "text_string": "nsfw, deformed, blurry, bad anatomy, disfigured, low resolution, cartoon, graphic, illustration, dry sand, dull lighting, altered face, changed body structure"
>     },
>     "NODE_05_SAMPLER_SETTINGS": {
>       "type": "KSampler",
>       "parameters": {
>         "seed": "random_int",
>         "steps": 35,
>         "cfg_scale": 7.0,
>         "sampler_name": "dpmpp_2m_sde",
>         "scheduler": "karras",
>         "denoise": 1.0
>       }
>     },
>     "NODE_06_FINAL_OUTPUT": {
>       "type": "Image_Save",
>       "metadata": {
>         "prompt_string": "((100% same face and body)), A captivating shot of a woman with long dark hair, kneeling on a sandy beach. She's wearing a blue and white wet bikini tank top. The setting sun casts a warm glow, highlighting her features and the wet sand around her. The ocean waves are softly visible in the background.",
>         "resolution": "1024x1536",
>         "aspect_ratio": "2:3"
>       }
>     }
>   }
> }

---
### 🧠 Core Insights
- Generate a photorealistic image of a woman with specific physical and environmental attributes.
- Preserve the identity of a reference image with 100% fidelity.
- Control image elements through a structured, multi-segment positive prompt.
- Eliminate undesirable elements using a comprehensive negative prompt.
- Apply specific sampling and resolution parameters for high-quality output.

### 📝 Core Summary
This workflow utilizes Grok AI to generate a photorealistic image of a woman on a sandy beach during golden hour, emphasizing identity preservation via an IP Adapter. The positive prompt is meticulously segmented across multiple CLIP layers with varying weights, detailing the subject's appearance, attire, pose, lighting, and environment. A robust negative prompt is included to prevent common generation artifacts and undesired features, while specific KSampler settings ensure high-quality output at a defined resolution.

### 🔄 Flows & Concepts
- **Identity Preservation:** Achieved through an 'IP_Adapter_Advanced' node, explicitly set for '100% match constraint' to maintain the subject's face and body from a reference image.
- **Segmented Prompting:** The positive prompt is broken down into thematic segments ('subject_def', 'action_pose', 'attire_desc', 'lighting_atmos', 'environment_detail'), each with independent weights and assigned CLIP layers for nuanced control.
- **Negative Prompting:** A comprehensive negative prompt is used to guide the generation away from common flaws like 'nsfw', 'deformed', 'blurry', 'bad anatomy', and style deviations.
- **Photorealistic Settings:** The workflow is designated as 'Identity_Preserved_Photorealism' and incorporates elements like 'golden hour' lighting, 'wet fabric texture', and 'reflective ground' to enhance realism.
- **Sampler Configuration:** Specific KSampler parameters, including 'dpmpp_2m_sde' sampler, 'karras' scheduler, and '35 steps', are defined for consistent and high-quality image synthesis.

### 🏷️ Tags
photorealism, identitypreservation, grokai, beachscene, goldenhour, bikini, wetlook, jsonworkflow

