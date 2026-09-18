import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  body?: any;
  query?: Record<string, string | string[]>;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => VercelResponse;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb', // Support up to 6 photos in single batch
    },
  },
};

/**
 * Vercel Serverless Endpoint: /api/upload
 * Accepts an array of multiple image files (Base64 or multipart)
 * Loops through, validates each photo, and returns uploaded image URLs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    
    // Support multiple format inputs:
    // 1. { images: string[] } (array of Base64 or URLs)
    // 2. { images: { name?: string, data: string, type?: string }[] }
    // 3. { files: string[] }
    // 4. Raw array directly: [string, string, ...]
    let rawImages: any[] = [];

    if (Array.isArray(body)) {
      rawImages = body;
    } else if (Array.isArray(body.images)) {
      rawImages = body.images;
    } else if (Array.isArray(body.files)) {
      rawImages = body.files;
    } else if (body.image || body.file || body.data) {
      rawImages = [body.image || body.file || body.data];
    }

    if (!rawImages || rawImages.length === 0) {
      return res.status(400).json({
        error: 'No image files provided. Please upload an array containing 1 to 6 photos.',
      });
    }

    // Enforce 6 photos maximum per listing limit
    const MAX_PHOTOS = 6;
    if (rawImages.length > MAX_PHOTOS) {
      return res.status(400).json({
        error: `Maximum ${MAX_PHOTOS} photos allowed per listing. Received ${rawImages.length}.`,
      });
    }

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    // Loop through each photo file
    for (let index = 0; index < rawImages.length; index++) {
      const item = rawImages[index];
      let dataString = '';
      let fileName = `listing_photo_${Date.now()}_${index + 1}`;

      if (typeof item === 'string') {
        dataString = item.trim();
      } else if (item && typeof item === 'object') {
        dataString = (item.data || item.url || item.base64 || '').trim();
        if (item.name) fileName = item.name;
      }

      if (!dataString) {
        errors.push(`Photo #${index + 1}: Empty file content.`);
        continue;
      }

      // Basic validation for image data URI or URL
      const isDataUri = dataString.startsWith('data:image/');
      const isHttpUrl = dataString.startsWith('http://') || dataString.startsWith('https://');

      if (!isDataUri && !isHttpUrl) {
        // Assume raw base64 and wrap
        dataString = `data:image/jpeg;base64,${dataString}`;
      }

      // If Supabase Storage is configured in env, can persist to Supabase bucket 'listing-images'
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseServiceKey && isDataUri) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

          // Extract base64 buffer
          const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const ext = mimeType.split('/')[1] || 'jpg';
            const storagePath = `listings/${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
              .from('listing-images')
              .upload(storagePath, buffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (!uploadError && uploadData) {
              const { data: publicUrlData } = supabaseClient.storage
                .from('listing-images')
                .getPublicUrl(storagePath);

              if (publicUrlData?.publicUrl) {
                uploadedUrls.push(publicUrlData.publicUrl);
                continue;
              }
            }
          }
        } catch (supabaseErr) {
          console.warn(`Supabase storage upload skipped for photo #${index + 1}:`, supabaseErr);
        }
      }

      // Default fallback: Data URI / optimized URL
      uploadedUrls.push(dataString);
    }

    if (uploadedUrls.length === 0) {
      return res.status(400).json({
        error: 'Failed to process any uploaded images.',
        details: errors,
      });
    }

    return res.status(200).json({
      success: true,
      count: uploadedUrls.length,
      urls: uploadedUrls,
      images_json: JSON.stringify(uploadedUrls),
      primary_url: uploadedUrls[0],
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('Serverless Upload Error:', err);
    return res.status(500).json({
      error: 'Internal Server Error during multiple image upload.',
      message: err?.message || 'Unknown processing error',
    });
  }
}
