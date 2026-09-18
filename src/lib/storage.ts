import { supabase } from './supabase';

/**
 * EXACT Supabase Storage bucket name specified in dashboard:
 * "Listing image" (Preserves exact space and capitalization)
 */
export const LISTING_IMAGE_BUCKET = 'Listing image';

/**
 * Converts a data URL (base64 string) into a standard Blob object
 */
export function dataURLtoBlob(dataurl: string): Blob {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('Error converting dataURL to Blob:', e);
    throw new Error('Failed to process image data.');
  }
}

/**
 * Direct file upload to Supabase Storage bucket "Listing image".
 * Bypasses auth/RLS checks and returns the resulting public CDN URL.
 *
 * @param file File or Blob to upload
 * @param customFileName Optional custom file name
 * @returns Public URL string
 */
export async function uploadListingImageToStorage(
  file: File | Blob,
  customFileName?: string
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  // Derive file extension and sanitized base name
  let ext = 'jpg';
  let baseName = 'img';

  if (file instanceof File && file.name) {
    const parts = file.name.split('.');
    if (parts.length > 1) {
      ext = parts.pop()?.toLowerCase() || 'jpg';
    }
    baseName = parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  } else if (file.type) {
    ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = customFileName || `${timestamp}_${randomStr}_${baseName}.${ext}`;
  const filePath = `listings/${fileName}`;

  // Direct upload to exact bucket "Listing image"
  const { data, error } = await supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });

  if (error) {
    console.error(`Error uploading to "${LISTING_IMAGE_BUCKET}":`, error);
    throw new Error(error.message || `Failed to upload to "${LISTING_IMAGE_BUCKET}" bucket.`);
  }

  // Retrieve public URL
  const { data: publicUrlData } = supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error(`Could not obtain public URL from "${LISTING_IMAGE_BUCKET}".`);
  }

  return publicUrlData.publicUrl;
}

/**
 * Helper to upload multiple images (Files or data URLs) to "Listing image" bucket
 */
export async function uploadMultipleListingImagesToStorage(
  items: (File | Blob | string)[]
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // If it is already a remote public URL (starts with http:// or https://), keep as is
    if (typeof item === 'string' && item.startsWith('http')) {
      uploadedUrls.push(item);
      continue;
    }

    let fileOrBlob: File | Blob;
    if (typeof item === 'string' && item.startsWith('data:')) {
      fileOrBlob = dataURLtoBlob(item);
    } else if (item instanceof File || item instanceof Blob) {
      fileOrBlob = item;
    } else {
      continue;
    }

    const publicUrl = await uploadListingImageToStorage(fileOrBlob);
    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}
