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
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Get UUID from route parameters
    const params = await context.params;
    const uuid = params.uuid;
    
    console.log(`[PROXY] Request for original image for session ${uuid}`);
    
    // Use correct API path to get image
    const response = await axios.get(`${API_BASE_URL}/storage/original/${uuid}.jpeg`, {
      responseType: 'arraybuffer',
      headers: {
        'accept': 'application/octet-stream'
      }
    });
    
    // Get content type from headers
    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    console.log(`[PROXY] Original image retrieved, type: ${contentType}`);
    
    // Return image
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    console.error('[PROXY] Error retrieving original image:', error);
    
    // Handle errors
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      console.error('Error details:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
      return new NextResponse('Error retrieving image', { status: statusCode });
    }
    
    return new NextResponse(
      'Error retrieving image', 
      { status: 500 }
    );
  }
} 