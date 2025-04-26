import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

const API_BASE_URL = 'https://api.proofly.ai/api';

function isHttpOrHttps(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPrivateIp(host: string): boolean {
  // IPv4 localhost
  if (host === '127.0.0.1') return true;
  // IPv6 localhost
  if (host === '::1') return true;
  // Add additional ranges as needed
  return false;
}

async function safeResolveHost(url: string): Promise<string | null> {
  try {
    const u = new URL(url);
    const addresses = await (await import('dns')).promises.lookup(u.hostname, { all: true });
    return addresses[0]?.address || null;
  } catch {
    return null;
  }
}

function isLikelyImageContentType(contentType: string): boolean {
  return contentType && contentType.startsWith('image/');
}

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
    
    // 1. Allow only http/https
    if (!isHttpOrHttps(url)) {
      return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
    }
    
    // 2. Block private/local IPs
    const resolvedIp = await safeResolveHost(url);
    if (!resolvedIp || isPrivateIp(resolvedIp)) {
      return NextResponse.json({ error: 'URL resolves to private/local IP' }, { status: 400 });
    }
    
    // 3. Limit URL length
    if (url.length > 512) {
      return NextResponse.json({ error: 'URL too long' }, { status: 400 });
    }
    
    console.log('[PROXY] Downloading image from URL:', url.substring(0, 100) + (url.length > 100 ? '...' : ''));
    
    // 4. Download image (20-second timeout, User-Agent and Referer as browser)
    let imageResponse;
    try {
      imageResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': url
        }
      });
    } catch (err: any) {
      console.error('[SECURITY] Error or suspicious URL upload:', err);
      if (err.response) {
        console.error('Error response status:', err.response.status);
        console.error('Error response headers:', err.response.headers);
      }
      return NextResponse.json({ error: 'Failed to download image from URL' }, { status: 500 });
    }
    
    if (!imageResponse.data) {
      throw new Error('Failed to download image from URL');
    }
    
    // 5. Check Content-Type
    const contentType = imageResponse.headers['content-type'] || '';
    if (!isLikelyImageContentType(contentType)) {
      return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
    }
    
    // Get image type from headers
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
    // Logging suspicious requests
    console.error('[SECURITY] Error or suspicious URL upload:', error);
    
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