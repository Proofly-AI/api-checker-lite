import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://api.proofly.ai/api';

/**
 * Proxy handler for retrieving a face image
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string, faceId: string } }
) {
  try {
    // Correctly extracting parameters from the route
    const paramsObj = await params;
    const { uuid, faceId } = paramsObj;
    
    console.log(`[PROXY] Request for face image ${faceId} for session ${uuid}`);
    
    // Using the correct direct URL, as in the curl request
    const response = await axios.get(`${API_BASE_URL}/storage/faces/${uuid}_${faceId}.png`, {
      responseType: 'arraybuffer',
      headers: {
        'accept': 'application/octet-stream'
      }
    });
    
    // Get content type from headers
    const contentType = response.headers['content-type'] || 'image/png';
    
    console.log(`[PROXY] Face image retrieved, type: ${contentType}`);
    
    // Return the image
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    console.error('[PROXY] Error retrieving face image:', error);
    
    // Error handling
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      console.error('Error details:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      });
      return new NextResponse('Error retrieving face image', { status: statusCode });
    }
    
    return new NextResponse(
      'Error retrieving face image', 
      { status: 500 }
    );
  }
} 