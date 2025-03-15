import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://api.proofly.ai/api';

/**
 * Proxy handler for retrieving Proofly session status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const paramsObj = await params;
    const { uuid } = paramsObj;
    
    console.log(`[PROXY] GET /${uuid}/status - Requesting session status`);
    
    // Make request to Proofly API
    const response = await axios.get(`${API_BASE_URL}/${uuid}/status`);
    
    console.log(`[PROXY] GET /${uuid}/status - API response:`, response.data);
    
    // Return response to client
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[PROXY] Error retrieving session status:', error);
    
    // Handle errors
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data || error.message;
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 