import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

const API_BASE_URL = 'https://api.proofly.ai/api';

/**
 * Proxy handler for file upload to Proofly API
 */
export async function POST(request: NextRequest) {
  try {
    // Get FormData from request
    const reqFormData = await request.formData();
    
    console.log('[PROXY] Form data received:', {
      keys: Array.from(reqFormData.keys())
    });
    
    // Get file from form
    const file = reqFormData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File not provided' }, { status: 400 });
    }
    
    console.log('[PROXY] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Convert File to Buffer for node format
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create node-FormData (from form-data package)
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: file.name,
      contentType: file.type
    });
    
    console.log('[PROXY] Sending request to API...');
    
    // Make request to Proofly API exactly as in working example
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000
    });
    
    console.log('[PROXY] API response:', response.data);
    
    // Return response to client
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[PROXY] Error uploading file:', error);
    
    // More detailed error logging
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
      
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data || error.message;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
    
    console.error('Detailed error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 