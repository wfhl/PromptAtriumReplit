import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageIcon, X, Upload, Eye } from "lucide-react";

interface ExampleImagesUploadProps {
  promptId: number;
  currentImages?: string[];
  onImagesUpdated?: (images: string[]) => void;
  maxImages?: number;
  className?: string;
}

// Helper function to resolve image URLs for both old and new formats
const resolveImageUrl = (url: string): string => {
  // Handle old format: /uploads/prompt-images/filename.png
  if (url.startsWith('/uploads/prompt-images/')) {
    return url; // Serve directly from uploads directory
  }
  
  // Handle new format: /objects/{userId}/{filename}
  if (url.startsWith('/objects/')) {
    return url; // Already in correct format
  }
  
  // Handle full GCS URLs - convert to local serving format
  if (url.startsWith('https://storage.googleapis.com/')) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Format: /bucket/PromptExampleImages/userId/filename -> /objects/userId/filename
      if (pathParts.length >= 4 && pathParts[2] === 'PromptExampleImages') {
        const userId = pathParts[3];
        const filename = pathParts.slice(4).join('/');
        return `/objects/${userId}/${filename}`;
      }
    } catch (e) {
      console.warn('Failed to parse GCS URL:', url);
    }
  }
  
  // Fallback: return as-is
  return url;
};

export function ExampleImagesUpload({
  promptId,
  currentImages = [],
  onImagesUpdated,
  maxImages = 3,
  className = ""
}: ExampleImagesUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  // Resolve all current images to proper URLs
  const [images, setImages] = useState<string[]>(currentImages.map(resolveImageUrl));
  const { toast } = useToast();

  // Update images when currentImages prop changes
  useEffect(() => {
    setImages(currentImages.map(resolveImageUrl));
  }, [currentImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Generate a unique filename
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `example_${promptId}_${timestamp}_${randomSuffix}.${fileExtension}`;

        // Get upload URL from backend
        const uploadResponse: any = await apiRequest(`/api/example-images/upload`, "POST", { fileName });
        
        // Upload file to the presigned URL
        const uploadResult = await fetch(uploadResponse.uploadURL, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResult.ok) {
          throw new Error(`Upload failed: ${uploadResult.status} ${uploadResult.statusText}`);
        }

        // Convert to local serving URL
        // From: https://storage.googleapis.com/bucket/PromptExampleImages/userId/filename
        // To: /objects/userId/filename
        const gcsUrl = uploadResponse.uploadURL.split('?')[0]; // Remove query params
        const url = new URL(gcsUrl);
        const pathParts = url.pathname.split('/');
        // Extract userId and filename from PromptExampleImages/userId/filename
        const userId = pathParts[3]; // PromptExampleImages/userId/filename
        const filename = pathParts.slice(4).join('/');
        const localUrl = `/objects/${userId}/${filename}`;
        
        uploadedUrls.push(localUrl);
      }

      // Update the images list
      const newImages = [...images, ...uploadedUrls].slice(0, maxImages);
      setImages(newImages);
      
      // Update the prompt with new example images
      await apiRequest(`/api/user-prompts/${promptId}`, "PATCH", {
        example_images: newImages
      });

      // Notify parent component
      onImagesUpdated?.(newImages);

      toast({
        title: "Upload successful",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Error",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string, index: number) => {
    try {
      const newImages = images.filter((_, i) => i !== index);
      setImages(newImages);

      // Update the prompt
      await apiRequest(`/api/user-prompts/${promptId}`, "PATCH", {
        example_images: newImages
      });

      // Notify parent component
      onImagesUpdated?.(newImages);

      toast({
        title: "Image removed",
        description: "Example image removed successfully",
      });

    } catch (error) {
      console.error("Error removing image:", error);
      toast({
        title: "Remove Error",
        description: "Failed to remove image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canUploadMore = images.length < maxImages;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Images Display */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Example Images ({images.length}/{maxImages})</h4>
          <div className="flex gap-2 flex-wrap">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Example ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
                  onError={(e) => {
                    // Handle broken images by showing a placeholder
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.image-error-placeholder')) {
                      const placeholder = document.createElement('div');
                      placeholder.className = 'image-error-placeholder w-20 h-20 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-500 text-xs';
                      placeholder.innerHTML = '<div class="text-center"><div>⚠️</div><div>Image unavailable</div></div>';
                      parent.appendChild(placeholder);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Open image in a new window/tab for preview
                        window.open(imageUrl, '_blank');
                      }}
                      className="h-6 w-6 p-0 text-white hover:bg-white hover:bg-opacity-20"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImage(imageUrl, index)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {canUploadMore && (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isUploading}
          >
            <div className="flex items-center justify-center gap-2 py-2">
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  <span>
                    {images.length === 0 
                      ? `Add Example Images (0/${maxImages})` 
                      : `Add More Images (${images.length}/${maxImages})`
                    }
                  </span>
                </>
              )}
            </div>
          </Button>
        </div>
      )}

      {/* Upload Instructions */}
      {images.length === 0 && (
        <div className="text-xs text-gray-500 text-center">
          Upload up to {maxImages} example images to showcase this prompt's results
        </div>
      )}

      {/* Max Images Reached */}
      {!canUploadMore && (
        <div className="text-xs text-gray-500 text-center">
          Maximum of {maxImages} example images reached
        </div>
      )}
    </div>
  );
}
