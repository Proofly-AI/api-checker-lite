import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://api.proofly.ai/api';

interface RouteParams {
  params: {
    uuid: string;
  };
}

/**
 * Proxy handler for retrieving original image
 */
function isValidUuid(uuid: string): boolean {
  // Any standard UUID (v1-v5, v7)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Get UUID from route parameters
    const params = await context.params;
    const uuid = params.uuid;
    
    // 2.1. UUID validation (any standard UUID)
    if (!isValidUuid(uuid)) {
      console.error('[SECURITY] Invalid UUID format:', uuid);
      return new NextResponse('Invalid session identifier', { status: 400 });
    }
    // 2.2. Path traversal protection
    if (uuid.includes('..') || /%2e%2e/i.test(uuid)) {
      console.error('[SECURITY] Path traversal attempt in UUID:', uuid);
      return new NextResponse('Invalid session identifier', { status: 400 });
    }
    
    console.log(`[PROXY] Request for original image for session ${uuid}`);
    
    // Get image_path from response to /api/${uuid}
    const sessionResponse = await axios.get(`${API_BASE_URL}/${uuid}`);
    const imagePath = sessionResponse.data?.image_path;
    if (!imagePath || typeof imagePath !== 'string' || !imagePath.match(/^(\.?\/storage\/original\/)[\w\-/]+\.jpg$/)) {
      console.error('[SECURITY] Invalid or missing image_path:', imagePath);
      return new NextResponse('Image not found', { status: 404 });
    }
    // Protection: prevent path traversal
    if (imagePath.includes('..') || imagePath.includes('//')) {
      console.error('[SECURITY] Suspicious image_path:', imagePath);
      return new NextResponse('Image not found', { status: 404 });
    }
    // Build full path for request to storage
    let storagePath = imagePath;
    if (storagePath.startsWith('.')) storagePath = storagePath.slice(1);
    const imageUrl = `${API_BASE_URL}${storagePath}`;
    let response;
    try {
      response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'accept': 'application/octet-stream'
        },
        maxRedirects: 0
      });
    } catch (err) {
      console.error('[SECURITY] Error retrieving original image from storage:', err);
      return new NextResponse('Error retrieving image', { status: 500 });
    }
    const contentType = response.headers['content-type'] || 'image/jpeg';
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    console.error('[SECURITY] Error retrieving original image');
    return new NextResponse('Error retrieving image', { status: 500 });
  }
} 