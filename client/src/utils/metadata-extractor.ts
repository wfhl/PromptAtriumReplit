/**
 * Browser-compatible metadata extraction utilities
 * For extracting comprehensive metadata from images including AI generation data
 */

interface ImageMetadata {
  // Basic properties
  width?: number;
  height?: number;
  fileSize?: number;
  fileName?: string;
  fileType?: string;
  dimensionString?: string;
  aspectRatio?: string;
  lastModified?: string;
  
  // AI Generation
  isAIGenerated?: boolean;
  aiGenerator?: 'stable-diffusion' | 'midjourney' | 'comfyui' | 'dall-e' | 'unknown';
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  seed?: string | number;
  model?: string;
  
  // Midjourney specific
  mjVersion?: string;
  mjJobId?: string;
  mjAspectRatio?: string;
  mjChaos?: number;
  mjQuality?: number;
  mjStylize?: number;
  mjWeirdness?: number;
  mjAuthor?: string;
  mjRaw?: boolean;
  
  // DALL-E specific
  dalleVersion?: string;
  dalleQuality?: string;
  dalleStyle?: string;
  
  // Raw metadata
  rawMetadata?: any;
  warnings?: string[];
}

export class MetadataExtractor {
  /**
   * Extract all metadata from an image file
   */
  static async extractFromFile(file: File): Promise<ImageMetadata> {
    const metadata: ImageMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
      warnings: []
    };

    // Get image dimensions
    const dimensions = await this.getImageDimensions(file);
    Object.assign(metadata, dimensions);

    // Extract metadata based on file type
    if (file.type === 'image/png') {
      const pngMetadata = await this.extractPNGMetadata(file);
      Object.assign(metadata, pngMetadata);
    } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      const jpegMetadata = await this.extractJPEGMetadata(file);
      Object.assign(metadata, jpegMetadata);
    } else if (file.type === 'image/webp') {
      const webpMetadata = await this.extractWebPMetadata(file);
      Object.assign(metadata, webpMetadata);
    }

    // Detect AI generator
    const aiDetection = this.detectAIGenerator(metadata);
    Object.assign(metadata, aiDetection);

    return metadata;
  }

  /**
   * Get image dimensions
   */
  private static getImageDimensions(file: File): Promise<Partial<ImageMetadata>> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const gcd = this.calculateGCD(width, height);
        const aspectRatio = `${width / gcd}:${height / gcd}`;
        
        URL.revokeObjectURL(url);
        resolve({
          width,
          height,
          dimensionString: `${width} × ${height}`,
          aspectRatio
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };
      
      img.src = url;
    });
  }

  /**
   * Decompress DEFLATE compressed data using browser's DecompressionStream
   */
  private static async decompressData(compressed: Uint8Array): Promise<Uint8Array | null> {
    try {
      // Check if DecompressionStream is available
      if (typeof DecompressionStream === 'undefined') {
        return null;
      }

      // Create a readable stream from the compressed data
      const blob = new Blob([compressed]);
      const stream = blob.stream();
      
      // Create decompression stream
      const ds = new DecompressionStream('deflate');
      const decompressedStream = stream.pipeThrough(ds);
      
      // Read the decompressed data
      const reader = decompressedStream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch (error) {
      console.warn('Decompression failed:', error);
      return null;
    }
  }

  /**
   * Extract PNG metadata including all text chunks (tEXt, zTXt, iTXt)
   */
  private static async extractPNGMetadata(file: File): Promise<Partial<ImageMetadata>> {
    try {
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      const metadata: Partial<ImageMetadata> = { warnings: [] };
      
      // Check PNG signature
      const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
      for (let i = 0; i < 8; i++) {
        if (view.getUint8(i) !== pngSignature[i]) {
          return metadata;
        }
      }
      
      let pos = 8;
      const textChunks: Record<string, string> = {};
      
      while (pos < buffer.byteLength - 12) {
        const chunkLength = view.getUint32(pos);
        const chunkType = this.readString(view, pos + 4, 4);
        
        if (chunkType === 'tEXt') {
          // Uncompressed text
          const chunkData = new Uint8Array(buffer, pos + 8, chunkLength);
          const nullIndex = chunkData.indexOf(0);
          
          if (nullIndex !== -1) {
            const keyword = new TextDecoder().decode(chunkData.slice(0, nullIndex));
            const text = new TextDecoder().decode(chunkData.slice(nullIndex + 1));
            textChunks[keyword] = text;
          }
        } else if (chunkType === 'zTXt') {
          // Compressed text
          const chunkData = new Uint8Array(buffer, pos + 8, chunkLength);
          const nullIndex = chunkData.indexOf(0);
          
          if (nullIndex !== -1) {
            const keyword = new TextDecoder().decode(chunkData.slice(0, nullIndex));
            const compressionMethod = chunkData[nullIndex + 1];
            
            if (compressionMethod === 0) { // DEFLATE compression
              const compressedText = chunkData.slice(nullIndex + 2);
              const decompressed = await this.decompressData(compressedText);
              
              if (decompressed) {
                const text = new TextDecoder().decode(decompressed);
                textChunks[keyword] = text;
              } else {
                metadata.warnings?.push(`Compressed zTXt chunk '${keyword}' detected but could not be decompressed`);
              }
            }
          }
        } else if (chunkType === 'iTXt') {
          // International text (may be compressed)
          const chunkData = new Uint8Array(buffer, pos + 8, chunkLength);
          let offset = 0;
          
          // Find keyword
          const keywordEnd = chunkData.indexOf(0, offset);
          if (keywordEnd !== -1) {
            const keyword = new TextDecoder().decode(chunkData.slice(offset, keywordEnd));
            offset = keywordEnd + 1;
            
            // Compression flag
            const compressionFlag = chunkData[offset++];
            const compressionMethod = chunkData[offset++];
            
            // Language tag (skip to next null)
            const langEnd = chunkData.indexOf(0, offset);
            if (langEnd !== -1) {
              offset = langEnd + 1;
              
              // Translated keyword (skip to next null)
              const transEnd = chunkData.indexOf(0, offset);
              if (transEnd !== -1) {
                offset = transEnd + 1;
                
                // Text (may be compressed)
                const textData = chunkData.slice(offset);
                
                if (compressionFlag === 0) {
                  // Uncompressed
                  const text = new TextDecoder('utf-8').decode(textData);
                  textChunks[keyword] = text;
                } else if (compressionFlag === 1 && compressionMethod === 0) {
                  // DEFLATE compressed
                  const decompressed = await this.decompressData(textData);
                  
                  if (decompressed) {
                    const text = new TextDecoder('utf-8').decode(decompressed);
                    textChunks[keyword] = text;
                  } else {
                    metadata.warnings?.push(`Compressed iTXt chunk '${keyword}' detected but could not be decompressed`);
                  }
                }
              }
            }
          }
        }
        
        pos += 12 + chunkLength; // 4 (length) + 4 (type) + chunkLength + 4 (CRC)
        
        if (chunkType === 'IEND') break;
      }
      
      // Process text chunks for AI metadata
      const parametersText = textChunks['parameters'] || textChunks['Parameters'] || 
                            textChunks['Description'] || textChunks['description'] || 
                            textChunks['prompt'] || '';
      
      if (parametersText) {
        metadata.rawMetadata = { ...metadata.rawMetadata, textChunks };
        
        // Check for Stable Diffusion
        if (parametersText.includes('Steps:') || parametersText.includes('CFG scale:') || 
            parametersText.includes('Sampler:')) {
          const sdMetadata = this.parseStableDiffusionParameters(parametersText);
          Object.assign(metadata, sdMetadata);
        }
        
        // Check for Midjourney
        if (parametersText.includes('--v ') || parametersText.includes('Job ID:') ||
            parametersText.includes('--ar ') || parametersText.includes('--chaos ')) {
          const mjMetadata = this.parseMidjourneyParameters(parametersText);
          Object.assign(metadata, mjMetadata);
        }
      }
      
      // ComfyUI workflow
      if (textChunks['workflow']) {
        try {
          const workflow = JSON.parse(textChunks['workflow']);
          metadata.rawMetadata = { ...metadata.rawMetadata, workflow };
          metadata.aiGenerator = 'comfyui';
          metadata.isAIGenerated = true;
        } catch (e) {
          console.warn('Failed to parse ComfyUI workflow');
        }
      }
      
      // Direct prompt field
      if (textChunks['prompt'] && !metadata.prompt) {
        metadata.prompt = textChunks['prompt'];
      }
      
      return metadata;
    } catch (error) {
      console.error('Error extracting PNG metadata:', error);
      return { warnings: ['Failed to extract PNG metadata'] };
    }
  }

  /**
   * Extract JPEG metadata including XMP data
   */
  private static async extractJPEGMetadata(file: File): Promise<Partial<ImageMetadata>> {
    try {
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      const metadata: Partial<ImageMetadata> = { warnings: [] };
      
      // Check for JPEG signature
      if (view.getUint16(0) !== 0xFFD8) {
        return metadata;
      }
      
      let offset = 2;
      
      while (offset < buffer.byteLength - 4) {
        const marker = view.getUint16(offset);
        offset += 2;
        
        if (marker === 0xFFE1) {
          // APP1 marker (EXIF or XMP)
          const length = view.getUint16(offset);
          offset += 2;
          
          if (length < 2) continue;
          
          const data = new Uint8Array(buffer, offset, Math.min(length - 2, buffer.byteLength - offset));
          
          // Check for XMP
          const xmpHeader = 'http://ns.adobe.com/xap/1.0/\0';
          const xmpHeaderBytes = new TextEncoder().encode(xmpHeader);
          
          let isXMP = data.length >= xmpHeaderBytes.length;
          if (isXMP) {
            for (let i = 0; i < xmpHeaderBytes.length; i++) {
              if (data[i] !== xmpHeaderBytes[i]) {
                isXMP = false;
                break;
              }
            }
          }
          
          if (isXMP) {
            // Parse XMP data
            const xmpString = new TextDecoder().decode(data.slice(xmpHeaderBytes.length));
            metadata.rawMetadata = { ...metadata.rawMetadata, xmp: xmpString };
            
            // Parse XMP as XML
            try {
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(xmpString, 'text/xml');
              
              // Look for dc:description
              const descriptions = xmlDoc.getElementsByTagName('dc:description');
              if (descriptions.length > 0) {
                // Get the text content from rdf:Alt/rdf:li
                const liElements = descriptions[0].getElementsByTagName('rdf:li');
                let description = '';
                
                if (liElements.length > 0) {
                  description = liElements[0].textContent || '';
                } else {
                  description = descriptions[0].textContent || '';
                }
                
                description = description.trim();
                
                if (description) {
                  // Check for Midjourney patterns
                  if (description.includes('--v ') || description.includes('Job ID:') ||
                      description.includes('--ar ') || description.includes('--chaos ')) {
                    const mjMetadata = this.parseMidjourneyParameters(description);
                    Object.assign(metadata, mjMetadata);
                    metadata.aiGenerator = 'midjourney';
                    metadata.isAIGenerated = true;
                  }
                  
                  // Check for DALL-E patterns
                  if (description.includes('DALL·E') || description.includes('DALL-E') || 
                      description.includes('OpenAI')) {
                    const dalleMetadata = this.parseDALLEMetadata(description);
                    Object.assign(metadata, dalleMetadata);
                    metadata.aiGenerator = 'dall-e';
                    metadata.isAIGenerated = true;
                  }
                  
                  // Save as prompt if not already set
                  if (!metadata.prompt && description) {
                    metadata.prompt = description;
                  }
                }
              }
              
              // Look for other AI-related XMP fields
              const checkXMPField = (namespace: string, field: string) => {
                const elements = xmlDoc.getElementsByTagName(`${namespace}:${field}`);
                if (elements.length > 0) {
                  return elements[0].textContent || '';
                }
                return '';
              };
              
              // Check for specific AI tool mentions
              const creator = checkXMPField('dc', 'creator');
              const software = checkXMPField('xmp', 'CreatorTool');
              const title = checkXMPField('dc', 'title');
              
              if (creator.includes('Midjourney') || software.includes('Midjourney')) {
                metadata.aiGenerator = 'midjourney';
                metadata.isAIGenerated = true;
              }
              if (creator.includes('Stable Diffusion') || software.includes('Stable Diffusion')) {
                metadata.aiGenerator = 'stable-diffusion';
                metadata.isAIGenerated = true;
              }
              if (creator.includes('DALL') || software.includes('DALL') || 
                  creator.includes('OpenAI') || software.includes('OpenAI')) {
                metadata.aiGenerator = 'dall-e';
                metadata.isAIGenerated = true;
              }
              
            } catch (xmlError) {
              console.warn('Failed to parse XMP as XML, falling back to text search');
              
              // Fallback to text search
              if (xmpString.includes('Midjourney')) {
                metadata.aiGenerator = 'midjourney';
                metadata.isAIGenerated = true;
              }
              if (xmpString.includes('Stable Diffusion')) {
                metadata.aiGenerator = 'stable-diffusion';
                metadata.isAIGenerated = true;
              }
              if (xmpString.includes('DALL') || xmpString.includes('OpenAI')) {
                metadata.aiGenerator = 'dall-e';
                metadata.isAIGenerated = true;
              }
            }
          }
          
          offset += length - 2;
        } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFF00 && marker !== 0xFFFF) {
          // Other markers with length
          if (marker === 0xFFDA) {
            // Start of scan - rest is image data
            break;
          }
          if (marker === 0xFFD9) {
            // End of image
            break;
          }
          const length = view.getUint16(offset);
          offset += length;
        }
      }
      
      return metadata;
    } catch (error) {
      console.error('Error extracting JPEG metadata:', error);
      return { warnings: ['Failed to extract JPEG metadata'] };
    }
  }

  /**
   * Extract WebP metadata
   */
  private static async extractWebPMetadata(file: File): Promise<Partial<ImageMetadata>> {
    try {
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      const metadata: Partial<ImageMetadata> = { warnings: [] };
      
      // Check WebP signature
      const riff = this.readString(view, 0, 4);
      const webp = this.readString(view, 8, 4);
      
      if (riff !== 'RIFF' || webp !== 'WEBP') {
        return metadata;
      }
      
      metadata.rawMetadata = { format: 'WebP' };
      
      // WebP metadata extraction is limited in browser
      // Most AI tools don't use WebP for output yet
      metadata.warnings?.push('WebP metadata extraction is limited');
      
      return metadata;
    } catch (error) {
      console.error('Error extracting WebP metadata:', error);
      return { warnings: ['Failed to extract WebP metadata'] };
    }
  }

  /**
   * Parse Stable Diffusion parameters
   */
  private static parseStableDiffusionParameters(params: string): Partial<ImageMetadata> {
    const metadata: Partial<ImageMetadata> = {};
    
    // Extract prompt (everything before "Negative prompt:" or "Steps:")
    const promptMatch = params.match(new RegExp('^(.*?)(?:Negative prompt:|Steps:|$)', 's'));
    if (promptMatch) {
      const prompt = promptMatch[1].trim();
      if (prompt && !prompt.includes('--v ') && !prompt.includes('Job ID:')) {
        metadata.prompt = prompt;
      }
    }
    
    // Extract negative prompt
    const negPromptMatch = params.match(new RegExp('Negative prompt:\\s*(.*?)(?:Steps:|$)', 's'));
    if (negPromptMatch) {
      metadata.negativePrompt = negPromptMatch[1].trim();
    }
    
    // Extract steps
    const stepsMatch = params.match(/Steps:\s*(\d+)/i);
    if (stepsMatch) {
      metadata.steps = parseInt(stepsMatch[1]);
    }
    
    // Extract CFG scale
    const cfgMatch = params.match(/CFG scale:\s*([\d.]+)/i);
    if (cfgMatch) {
      metadata.cfgScale = parseFloat(cfgMatch[1]);
    }
    
    // Extract seed
    const seedMatch = params.match(/Seed:\s*(\d+)/i);
    if (seedMatch) {
      metadata.seed = seedMatch[1];
    }
    
    // Extract sampler
    const samplerMatch = params.match(/Sampler:\s*([^,\n]+)/i);
    if (samplerMatch) {
      metadata.sampler = samplerMatch[1].trim();
    }
    
    // Extract scheduler (also called Schedule type)
    const schedulerMatch = params.match(/(?:Schedule type|Scheduler):\s*([^,\n]+)/i);
    if (schedulerMatch) {
      metadata.scheduler = schedulerMatch[1].trim();
    }
    
    // Extract model
    const modelMatch = params.match(/Model:\s*([^,\n]+)/i);
    if (modelMatch) {
      metadata.model = modelMatch[1].trim();
    }
    
    return metadata;
  }

  /**
   * Parse Midjourney parameters
   */
  private static parseMidjourneyParameters(description: string): Partial<ImageMetadata> {
    const metadata: Partial<ImageMetadata> = {};
    
    // Extract prompt (everything before parameters or Job ID)
    const promptMatch = description.match(/^(.*?)(?:\s--|\sJob ID:|$)/);
    if (promptMatch && promptMatch[1].trim()) {
      const prompt = promptMatch[1].trim();
      // Only set as prompt if it doesn't look like SD parameters
      if (!prompt.includes('Steps:') && !prompt.includes('CFG scale:')) {
        metadata.prompt = prompt;
      }
    }
    
    // Extract version
    const versionMatch = description.match(/--v\s+(\d+(?:\.\d+)?)/);
    if (versionMatch) {
      metadata.mjVersion = versionMatch[1];
    }
    
    // Extract aspect ratio
    const arMatch = description.match(/--ar\s+(\d+:\d+)/);
    if (arMatch) {
      metadata.mjAspectRatio = arMatch[1];
    }
    
    // Extract chaos
    const chaosMatch = description.match(/--chaos\s+(\d+)/);
    if (chaosMatch) {
      metadata.mjChaos = parseInt(chaosMatch[1]);
    }
    
    // Extract quality
    const qualityMatch = description.match(/--q(?:uality)?\s+(\d+(?:\.\d+)?)/);
    if (qualityMatch) {
      metadata.mjQuality = parseFloat(qualityMatch[1]);
    }
    
    // Extract stylize
    const stylizeMatch = description.match(/--stylize\s+(\d+)/);
    if (stylizeMatch) {
      metadata.mjStylize = parseInt(stylizeMatch[1]);
    }
    
    // Extract weirdness
    const weirdMatch = description.match(/--(?:weird|w)\s+(\d+)/);
    if (weirdMatch) {
      metadata.mjWeirdness = parseInt(weirdMatch[1]);
    }
    
    // Extract raw flag
    if (description.includes('--style raw')) {
      metadata.mjRaw = true;
    }
    
    // Extract Job ID
    const jobIdMatch = description.match(/Job ID:\s*([a-f0-9-]+)/i);
    if (jobIdMatch) {
      metadata.mjJobId = jobIdMatch[1];
    }
    
    return metadata;
  }

  /**
   * Parse DALL-E metadata patterns
   */
  private static parseDALLEMetadata(text: string): Partial<ImageMetadata> {
    const metadata: Partial<ImageMetadata> = {};
    
    // DALL-E typically stores prompt in description
    if (text.includes('DALL·E') || text.includes('DALL-E') || text.includes('OpenAI')) {
      // Clean up the text to extract just the prompt
      let cleanedText = text
        .replace(/DALL·E\s*\d*/gi, '')
        .replace(/DALL-E\s*\d*/gi, '')
        .replace(/OpenAI/gi, '')
        .trim();
      
      if (cleanedText) {
        metadata.prompt = cleanedText;
      }
      
      // Extract version if present
      const versionMatch = text.match(/DALL[·-]E\s*(\d+)/i);
      if (versionMatch) {
        metadata.dalleVersion = versionMatch[1];
      }
      
      // Look for quality indicators
      if (text.toLowerCase().includes('hd') || text.toLowerCase().includes('high quality') ||
          text.toLowerCase().includes('high definition')) {
        metadata.dalleQuality = 'hd';
      } else if (text.toLowerCase().includes('standard')) {
        metadata.dalleQuality = 'standard';
      }
      
      // Look for style indicators
      if (text.toLowerCase().includes('vivid')) {
        metadata.dalleStyle = 'vivid';
      } else if (text.toLowerCase().includes('natural')) {
        metadata.dalleStyle = 'natural';
      }
    }
    
    return metadata;
  }

  /**
   * Detect AI generator based on metadata patterns
   */
  private static detectAIGenerator(metadata: Partial<ImageMetadata>): Partial<ImageMetadata> {
    const result: Partial<ImageMetadata> = {};
    
    // Already detected from parsing
    if (metadata.aiGenerator && metadata.aiGenerator !== 'unknown') {
      result.aiGenerator = metadata.aiGenerator;
      result.isAIGenerated = true;
      return result;
    }
    
    // Check for Midjourney patterns
    if (metadata.mjVersion || metadata.mjJobId || metadata.mjAspectRatio ||
        metadata.mjChaos !== undefined || metadata.mjQuality !== undefined) {
      result.aiGenerator = 'midjourney';
      result.isAIGenerated = true;
      return result;
    }
    
    // Check for Stable Diffusion patterns
    if (metadata.steps !== undefined || metadata.cfgScale !== undefined || 
        metadata.sampler || metadata.negativePrompt) {
      result.aiGenerator = 'stable-diffusion';
      result.isAIGenerated = true;
      return result;
    }
    
    // Check for DALL-E patterns
    if (metadata.dalleVersion || metadata.dalleQuality || metadata.dalleStyle) {
      result.aiGenerator = 'dall-e';
      result.isAIGenerated = true;
      return result;
    }
    
    // Check filename patterns
    if (metadata.fileName) {
      const filename = metadata.fileName.toLowerCase();
      
      // Discord/Midjourney naming patterns
      if (filename.match(/^[a-zA-Z0-9_]+_.*_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_\d+/)) {
        result.aiGenerator = 'midjourney';
        result.isAIGenerated = true;
        
        // Extract username
        const usernameMatch = filename.match(/^([a-zA-Z0-9_]+)_/);
        if (usernameMatch) {
          result.mjAuthor = usernameMatch[1];
        }
        return result;
      }
      
      // DALL-E naming pattern
      if (filename.includes('dall-e') || filename.includes('dall_e') || filename.includes('openai')) {
        result.aiGenerator = 'dall-e';
        result.isAIGenerated = true;
        return result;
      }
      
      // ComfyUI naming pattern
      if (filename.includes('comfyui') || filename.match(/^ComfyUI_\d+/)) {
        result.aiGenerator = 'comfyui';
        result.isAIGenerated = true;
        return result;
      }
      
      // Stable Diffusion patterns
      if (filename.match(/^\d{5}-\d+/) || filename.includes('sd_')) {
        result.aiGenerator = 'stable-diffusion';
        result.isAIGenerated = true;
        return result;
      }
    }
    
    // Check prompt content for patterns
    if (metadata.prompt) {
      const promptLower = metadata.prompt.toLowerCase();
      
      if (promptLower.includes('midjourney') || metadata.prompt.includes('--v ')) {
        result.aiGenerator = 'midjourney';
        result.isAIGenerated = true;
        return result;
      }
      
      if (promptLower.includes('stable diffusion') || promptLower.includes('sdxl')) {
        result.aiGenerator = 'stable-diffusion';
        result.isAIGenerated = true;
        return result;
      }
      
      if (promptLower.includes('dall-e') || promptLower.includes('dall·e') || 
          promptLower.includes('openai')) {
        result.aiGenerator = 'dall-e';
        result.isAIGenerated = true;
        return result;
      }
    }
    
    result.aiGenerator = 'unknown';
    result.isAIGenerated = false;
    return result;
  }

  /**
   * Helper function to read string from DataView
   */
  private static readString(view: DataView, offset: number, length: number): string {
    let str = '';
    for (let i = 0; i < length; i++) {
      const byte = view.getUint8(offset + i);
      if (byte === 0) break; // Stop at null terminator
      str += String.fromCharCode(byte);
    }
    return str;
  }

  /**
   * Calculate greatest common divisor
   */
  private static calculateGCD(a: number, b: number): number {
    return b === 0 ? a : this.calculateGCD(b, a % b);
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}