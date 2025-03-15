import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

const API_BASE_URL = 'https://api.proofly.ai/api';

/**
 * Request handler for uploading image URL to Proofly API
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL not provided' },
        { status: 400 }
      );
    }
    
    // Check if it's a valid image URL
    if (!isValidImageUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      );
    }
    
    console.log('[PROXY] Downloading image from URL:', url.substring(0, 100) + (url.length > 100 ? '...' : ''));
    
    // Step 1: Download image from URL
    const imageResponse = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000 
    });
    
    if (!imageResponse.data) {
      throw new Error('Failed to download image from URL');
    }
    
    // Get image type from headers
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    console.log('[PROXY] Downloaded image type:', contentType);
    
    // Create buffer from response data
    const imageBuffer = Buffer.from(imageResponse.data);
    console.log('[PROXY] Downloaded image size:', imageBuffer.length, 'bytes');
    
    // Step 2: Send downloaded image as a file to Proofly API
    const apiUrl = `${API_BASE_URL}/upload`;
    
    // Create FormData to send the file
    const formData = new FormData();
    
    // Generate filename from URL
    const fileName = url.split('/').pop() || 'image.jpg';
    
    // Add file to FormData
    formData.append('file', imageBuffer, {
      filename: fileName,
      contentType: contentType
    });
    
    console.log('[PROXY] Sending downloaded image to API, filename:', fileName);
    
    // Send request to API
    const response = await axios.post(apiUrl, formData, {
      headers: {
        ...formData.getHeaders()  // Important: use getHeaders() from node-FormData
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000
    });
    
    console.log('[PROXY] API response for image upload:', response.data);
    
    // Return session UUID for further result retrieval
    return NextResponse.json({ uuid: response.data.uuid });
    
  } catch (error) {
    console.error('Error processing URL:', error);
    
    // Handle API errors
    if (axios.isAxiosError(error)) {
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      const status = error.response?.status || 500;
      
      let errorMessage = 'Error sending URL';
      let errorDetails = error.message;
      
      if (error.response?.data) {
        try {
          // If response is JSON
          if (typeof error.response.data === 'object') {
            errorDetails = JSON.stringify(error.response.data);
          } 
          // If response is text or HTML
          else if (typeof error.response.data === 'string' || Buffer.isBuffer(error.response.data)) {
            errorDetails = error.response.data.toString().substring(0, 200); // Limit length
          }
        } catch (e) {
          errorDetails = 'Failed to read error details';
        }
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
        { status }
      );
    }
    
    // General error
    return NextResponse.json(
      { 
        error: 'Error processing URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Checks if URL points to an image
 */
function isValidImageUrl(url: string): boolean {
  try {
    // Simple URL validation
    new URL(url);
    
    // File extension or MIME-type check can be added here
    // For simplicity, we accept all valid URLs, but in production
    // a more strict validation should be implemented
    
    return true;
  } catch (e) {
    return false;
  }
} 