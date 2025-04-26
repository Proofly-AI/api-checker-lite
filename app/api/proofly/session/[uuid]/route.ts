import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://api.proofly.ai/api';

/**
 * Proxy handler for retrieving Proofly session information
 */
// --- UUID VALIDATION ---
function isValidUuid(uuid: string): boolean {
  // Any standard UUID (v1-v5, v7)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const paramsObj = await params;
    const { uuid } = paramsObj;
    // 2.1. UUID validation (any standard UUID)
    if (!isValidUuid(uuid)) {
      console.error('[SECURITY] Invalid UUID format:', uuid);
      return NextResponse.json({ error: 'Invalid session identifier' }, { status: 400 });
    }
    // 2.2. Path traversal
    if (uuid.includes('..') || /%2e%2e/i.test(uuid)) {
      console.error('[SECURITY] Path traversal attempt in UUID:', uuid);
      return NextResponse.json({ error: 'Invalid session identifier' }, { status: 400 });
    }
    
    console.log(`[PROXY] GET /${uuid} - Requesting session information`);
    
    // Make request to Proofly API
    const response = await axios.get(`${API_BASE_URL}/${uuid}`);
    
    console.log(`[PROXY] GET /${uuid} - API response:`, response.data);
    
    // Return response to client
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[SECURITY] Error retrieving session information');
    return NextResponse.json(
      { error: 'Failed to retrieve session information' },
      { status: 500 }
    );
  }
} 