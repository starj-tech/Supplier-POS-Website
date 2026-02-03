/**
 * Image utilities for safe handling of product images
 * Optimized for MySQL database storage with size limits
 */

// Maximum dimensions for database storage (keep small to avoid MySQL packet limits)
const MAX_WIDTH = 400;
const MAX_HEIGHT = 300;
const JPEG_QUALITY = 0.6;
const MAX_BASE64_LENGTH = 500000; // ~500KB max for safe MySQL storage

/**
 * Chunked ArrayBuffer to Base64 conversion
 * Prevents stack overflow for large files by processing in chunks
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Process 8KB at a time
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    // Loop avoids function call stack limit (~65K args for spread operator)
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }

  return btoa(binary);
}

/**
 * Clean and validate base64 string
 * Removes data URI prefix and whitespace, validates format
 */
export function cleanBase64(base64String: string): string {
  if (!base64String) return "";
  
  let cleaned = base64String.trim();

  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  if (cleaned.includes(",") && cleaned.startsWith("data:")) {
    cleaned = cleaned.split(",")[1];
  }

  // Remove all whitespace and newlines
  cleaned = cleaned.replace(/\s/g, "");

  // Validate base64 format
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    console.warn('[cleanBase64] Invalid base64 string detected');
    return "";
  }

  return cleaned;
}

/**
 * Compress image file for database storage
 * Returns a Promise that resolves to a data URL or empty string on error
 */
export function compressImageForStorage(
  file: File,
  maxWidth = MAX_WIDTH,
  maxHeight = MAX_HEIGHT,
  quality = JPEG_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('File bukan gambar'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const ratio = Math.min(widthRatio, heightRatio);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal membuat canvas context'));
            return;
          }

          // Draw with white background (for transparent PNGs)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with specified quality
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          console.log('[compressImageForStorage] Compressed:', {
            originalSize: file.size,
            finalDimensions: `${width}x${height}`,
            dataUrlLength: dataUrl.length,
          });

          // Check if result is within acceptable limits
          if (dataUrl.length > MAX_BASE64_LENGTH) {
            // Try with even lower quality
            const lowerQuality = canvas.toDataURL('image/jpeg', 0.4);
            if (lowerQuality.length > MAX_BASE64_LENGTH) {
              reject(new Error(`Gambar terlalu besar. Maksimal ${Math.round(MAX_BASE64_LENGTH / 1024)}KB.`));
              return;
            }
            console.log('[compressImageForStorage] Used lower quality, new length:', lowerQuality.length);
            resolve(lowerQuality);
            return;
          }

          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Parse and normalize image URL from various formats
 * Handles: data URLs, HTTP URLs, raw base64 strings
 */
export function normalizeImageUrl(imageData: string | null | undefined): string {
  const placeholder = '/placeholder.svg';
  
  if (!imageData || typeof imageData !== 'string') {
    return placeholder;
  }

  const trimmed = imageData.trim();
  
  // Empty or too short to be valid
  if (trimmed.length < 20) {
    return placeholder;
  }

  // Already a complete data URL
  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  // HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Check if it's a valid base64 string (at least first 100 chars)
  const sampleLength = Math.min(100, trimmed.length);
  const sample = trimmed.substring(0, sampleLength);
  
  // Valid base64 characters: A-Z, a-z, 0-9, +, /, and = for padding
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(sample)) {
    // Clean any whitespace from the full string
    const cleanedBase64 = trimmed.replace(/\s/g, '');
    return `data:image/jpeg;base64,${cleanedBase64}`;
  }

  // Not a recognized format
  console.warn('[normalizeImageUrl] Unrecognized image format:', {
    length: trimmed.length,
    prefix: trimmed.substring(0, 30),
  });
  
  return placeholder;
}

/**
 * Validate if string is a valid image (data URL or HTTP URL)
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  return (
    url.startsWith('data:image') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
}
