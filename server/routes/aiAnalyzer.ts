import { Router } from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  analyzeFieldsWithAI, 
  verifyFieldMappings, 
  analyzeUnstructuredContent,
  detectContentPattern,
  extractPromptFromImage,
  generatePromptMetadata
} from '../aiFieldAnalyzer';

const router = Router();

// Test endpoint to verify Gemini API is working
router.get('/api/ai/test', async (req, res) => {
  try {
    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY not found in environment variables' 
      });
    }

    // Create a simple test request
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent("Say 'API is working!' in exactly 3 words.");
    const response = await result.response;
    const text = response.text();
    
    res.json({
      success: true,
      message: "Gemini API is connected and working!",
      response: text,
      apiKeyPresent: true
    });
  } catch (error: any) {
    console.error('Gemini API test failed:', error);
    res.status(500).json({ 
      error: 'Gemini API test failed',
      message: error.message || 'Unknown error',
      details: error.errorDetails || error.toString()
    });
  }
});

// Analyze CSV/structured data fields
router.post('/api/ai/analyze-fields', async (req, res) => {
  try {
    const { headers, sampleRows, fileType } = req.body;

    if (!headers || !sampleRows || !fileType) {
      return res.status(400).json({ 
        error: 'Missing required fields: headers, sampleRows, fileType' 
      });
    }

    // Get initial AI analysis
    const analysis = await analyzeFieldsWithAI(headers, sampleRows, fileType);

    // Create sample content for verification
    const sampleContent: Record<string, string> = {};
    analysis.fieldMappings.forEach(mapping => {
      if (mapping.targetField && sampleRows[0]) {
        sampleContent[mapping.targetField] = String(sampleRows[0][mapping.sourceField] || '');
      }
    });

    // Verify the mappings with a second pass
    const verification = await verifyFieldMappings(analysis, sampleContent);

    // Use corrections if needed
    const finalAnalysis = verification.corrections || analysis;

    res.json({
      success: true,
      analysis: finalAnalysis,
      verified: verification.verified,
      verificationConfidence: verification.confidence
    });
  } catch (error) {
    console.error('AI field analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze fields', 
      details: (error as any).message 
    });
  }
});

// Analyze unstructured content
router.post('/api/ai/analyze-unstructured', async (req, res) => {
  try {
    const { content, fileType } = req.body;

    if (!content || !fileType) {
      return res.status(400).json({ 
        error: 'Missing required fields: content, fileType' 
      });
    }

    const result = await analyzeUnstructuredContent(content, fileType);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Unstructured analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze unstructured content', 
      details: (error as any).message 
    });
  }
});

// Detect if content is a prompt or description
router.post('/api/ai/detect-content-type', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Missing required field: text' 
      });
    }

    const result = await detectContentPattern(text);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Content type detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect content type', 
      details: (error as any).message 
    });
  }
});

// Extract prompt from image
router.post('/api/ai/extract-prompt-from-image', async (req, res) => {
  try {
    const { imageBase64, extractionMode } = req.body;

    if (!imageBase64 || !extractionMode) {
      return res.status(400).json({ 
        error: 'Missing required fields: imageBase64, extractionMode' 
      });
    }

    // Validate extraction mode
    if (!['content', 'content_and_name', 'all_fields'].includes(extractionMode)) {
      return res.status(400).json({
        error: 'Invalid extractionMode. Must be: content, content_and_name, or all_fields'
      });
    }

    const result = await extractPromptFromImage(imageBase64, extractionMode);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to extract prompt from image'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Image prompt extraction error:', error);
    
    // Handle API quota errors with helpful message
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      res.status(429).json({ 
        error: 'AI API quota exceeded',
        message: 'You have exceeded your Gemini API quota. Please wait a moment and try again. The free tier has daily limits.',
        details: errorMessage
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to extract prompt from image', 
        details: errorMessage
      });
    }
  }
});

// Generate prompt metadata
router.post('/api/ai/generate-prompt-metadata', async (req, res) => {
  try {
    const { promptContent, generationMode } = req.body;

    if (!promptContent || !generationMode) {
      return res.status(400).json({ 
        error: 'Missing required fields: promptContent, generationMode' 
      });
    }

    // Validate generation mode
    if (!['name_only', 'all_fields'].includes(generationMode)) {
      return res.status(400).json({
        error: 'Invalid generationMode. Must be: name_only or all_fields'
      });
    }

    const result = await generatePromptMetadata(promptContent, generationMode);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate metadata'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Metadata generation error:', error);
    
    // Handle API quota errors with helpful message
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      res.status(429).json({ 
        error: 'AI API quota exceeded',
        message: 'You have exceeded your Gemini API quota. Please wait a moment and try again. The free tier has daily limits.',
        details: errorMessage
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate metadata', 
        details: errorMessage
      });
    }
  }
});

export default router;