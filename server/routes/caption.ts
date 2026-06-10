import { Router } from 'express';
import { analyzeImageWithFallback, testCustomVisionServer } from '../services/customVisionService';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import OpenAI from 'openai';
import { isAuthenticated } from '../replitAuth';
import { strictApiLimiter } from '../rateLimit';

const router = Router();

// Temporary directory for image processing
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'vision');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Clean caption text by removing unwanted phrases
 */
function cleanCaption(caption: string): string {
  return caption
    .replace(/I'm unable to identify[^.]+\./g, '')
    .replace(/the visual elements[:\s]*/gi, '')
    .replace(/I cannot identify[^.]+\./g, '')
    .replace(/I can see[:\s]*/gi, '')
    .replace(/The image shows[:\s]*/gi, '')
    .replace(/This appears to be[:\s]*/gi, '')
    .trim();
}

/**
 * Generate social media caption with GPT-4o
 */
async function generateSocialCaption(
  imageAnalysis: string,
  tone: string
): Promise<string> {
  const tonePrompts: Record<string, string> = {
    professional: "Create a professional social media caption based on this image description. Keep it formal, informative, and suitable for LinkedIn or business platforms.",
    casual: "Create a casual, friendly social media caption based on this image description. Make it engaging and relatable for Instagram or Facebook.",
    creative: "Create a creative, artistic social media caption based on this image description. Use poetic language and evocative descriptions.",
    funny: "Create a funny, witty social media caption based on this image description. Include humor and wordplay where appropriate.",
    informative: "Create an informative, educational social media caption based on this image description. Include interesting facts or insights."
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `📸 ${imageAnalysis.substring(0, 200)}...`;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: "system",
          content: tonePrompts[tone] || tonePrompts.professional
        },
        {
          role: "user",
          content: imageAnalysis
        }
      ],
      max_tokens: 300,
      temperature: 0.8
    });

    return completion.choices[0].message.content || imageAnalysis;
  } catch (error) {
    console.error('Error generating social caption:', error);
    return `📸 ${imageAnalysis.substring(0, 200)}...`;
  }
}

/**
 * POST /api/caption/generate
 * Generate caption for an uploaded image
 */
router.post('/generate', isAuthenticated, strictApiLimiter, async (req, res) => {
  try {
    const { 
      image, 
      model = 'custom-vision',
      captionStyle = 'Descriptive',
      captionLength = 'medium',
      customPrompt,
      socialTone
    } = req.body;

    if (!image) {
      return res.status(400).json({ 
        error: 'No image provided',
        success: false 
      });
    }

    // Debug information collection
    const debugReport: any[] = [];
    const startTime = Date.now();

    // Test vision server status
    const serverStatus = await testCustomVisionServer();
    debugReport.push({
      stage: 'Server Check',
      model: 'Custom Vision',
      timestamp: new Date().toISOString(),
      serverStatus: serverStatus.isOnline ? 'online' : 'offline',
      details: serverStatus.details || serverStatus.error
    });

    // Extract base64 from data URL if needed
    let imageData = image;
    if (image.startsWith('data:image')) {
      imageData = image.replace(/^data:image\/[a-z]+;base64,/, '');
    }

    // Save image temporarily if needed for certain services
    const tempFileName = `${nanoid()}.png`;
    const tempFilePath = path.join(TEMP_DIR, tempFileName);
    
    try {
      // Write temporary file for services that need file path
      fs.writeFileSync(tempFilePath, Buffer.from(imageData, 'base64'));

      // Analyze image with fallback mechanism
      const analysisResult = await analyzeImageWithFallback(
        image, // Pass original data URL or base64
        {
          prompt: customPrompt,
          captionStyle,
          captionLength
        }
      );

      // Clean the caption
      const cleanedCaption = cleanCaption(analysisResult.caption);

      // Add debug info
      debugReport.push({
        stage: 'Vision Analysis',
        model: analysisResult.model,
        timestamp: analysisResult.timestamp,
        captionLength: cleanedCaption.length,
        serverStatus: analysisResult.serverOnline ? 'online' : 'offline',
        processingTime: Date.now() - startTime
      });

      // Generate social media caption if requested
      let socialCaption = null;
      if (socialTone) {
        socialCaption = await generateSocialCaption(cleanedCaption, socialTone);
        debugReport.push({
          stage: 'Social Caption',
          model: 'GPT-4o',
          timestamp: new Date().toISOString(),
          tone: socialTone,
          success: true
        });
      }

      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      // Return response
      res.json({
        success: true,
        caption: cleanedCaption,
        socialCaption,
        metadata: {
          model: analysisResult.model,
          timestamp: analysisResult.timestamp,
          serverOnline: analysisResult.serverOnline,
          processingTime: Date.now() - startTime,
          captionStyle,
          captionLength
        },
        debugReport
      });

    } catch (error: any) {
      // Clean up temp file on error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }

  } catch (error: any) {
    console.error('Caption generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate caption',
      debugReport: [{
        stage: 'Error',
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }]
    });
  }
});

/**
 * GET /api/caption/server-status
 * Check vision server status
 */
router.get('/server-status', async (req, res) => {
  try {
    const status = await testCustomVisionServer();
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      isOnline: false,
      error: error.message
    });
  }
});

/**
 * POST /api/caption/social
 * Generate social media caption from existing analysis
 */
router.post('/social', isAuthenticated, strictApiLimiter, async (req, res) => {
  try {
    const { imageAnalysis, tone = 'professional' } = req.body;

    if (!imageAnalysis) {
      return res.status(400).json({
        error: 'No image analysis provided',
        success: false
      });
    }

    const socialCaption = await generateSocialCaption(imageAnalysis, tone);

    res.json({
      success: true,
      caption: socialCaption,
      tone,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Social caption generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate social caption'
    });
  }
});

export default router;