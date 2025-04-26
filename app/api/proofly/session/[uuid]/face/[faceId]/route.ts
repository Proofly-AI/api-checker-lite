import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import path from 'path';

const PROOFLY_API_BASE_URL = 'https://api.proofly.ai';

/**
 * Proxy handler for retrieving a face image
 */
function isValidUuid(uuid: string): boolean {
  // Any standard UUID (v1-v5, v7)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string; faceId: string } }
) {
  try {
    // --- Get parameters from URL ---
    const pathname = request.nextUrl.pathname;
    const parts = pathname.split('/');
    if (parts.length < 7 || parts[3] !== 'session' || parts[5] !== 'face') {
      console.error('[API Face Proxy] Error parsing URL path:', pathname);
      throw new Error('Could not parse UUID and FaceId from URL path');
    }
    const uuid = parts[4];
    const faceId = parts[6];

    // 2.1. Check UUID (any standard UUID)
    if (!isValidUuid(uuid)) {
      console.error('[SECURITY] Invalid UUID format:', uuid);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    // 2.2. Path traversal
    if (uuid.includes('..') || /%2e%2e/i.test(uuid)) {
      console.error('[SECURITY] Path traversal attempt in UUID:', uuid);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    // 2.3. Validate faceId (only positive numbers)
    if (!/^[0-9]+$/.test(faceId) || parseInt(faceId, 10) < 0) {
      console.error('[SECURITY] Invalid faceId format:', faceId);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const faceIndex = parseInt(faceId, 10);
    if (!uuid || isNaN(faceIndex) || faceIndex < 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 3.3. Strict routing: only allow access to /api/proofly/session/[uuid]/face/[faceId]
    const validPathRegex = /^\/api\/proofly\/session\/[0-9a-f\-]{36}\/face\/[0-9]+$/i;
    if (!validPathRegex.test(pathname)) {
      console.error('[SECURITY] Path does not match strict routing pattern:', pathname);
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 1. Get session info from Proofly API
    const sessionInfoUrl = `${PROOFLY_API_BASE_URL}/api/${uuid}`;
    let sessionInfoResponse;
    try {
      sessionInfoResponse = await axios.get(sessionInfoUrl);
    } catch (sessionError: any) {
      console.error(`[API Face Proxy] Error fetching session info for ${uuid}`);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    const sessionData = sessionInfoResponse.data;
    if (!sessionData || !Array.isArray(sessionData.faces) || sessionData.faces.length === 0) {
      console.error(`[API Face Proxy] No faces found in session data for ${uuid}`);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 3.1. Check that face_path belongs only to api.proofly.ai
    const targetFace = sessionData.faces.find((face: any) => {
      if (!face || !face.face_path) return false;
      const allowed =
        (face.face_path.startsWith('./storage/original/') ||
         face.face_path.startsWith('/storage/original/') ||
         face.face_path.startsWith('/storage/faces/')) &&
        !face.face_path.includes('..') &&
        !face.face_path.includes('//');
      if (!allowed) {
        console.error('[SECURITY] Suspicious face_path:', face.face_path);
        return false;
      }
      const match = face.face_path.match(/_(\d+)\.[^.]+$/);
      return match && parseInt(match[1], 10) === faceIndex;
    });
    if (!targetFace || !targetFace.face_path) {
      console.error(`[API Face Proxy] Face with index ${faceIndex} not found in session ${uuid}`);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // 3.2. Do not allow redirects when downloading files/images
    const filename = path.basename(targetFace.face_path);
    if (!filename) {
      console.error(`[API Face Proxy] Could not extract filename from face_path: ${targetFace.face_path}`);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    const faceImageUrl = `${PROOFLY_API_BASE_URL}/api/storage/faces/${filename}`;
    let imageResponse;
    try {
      imageResponse = await axios.get(faceImageUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 0
      });
    } catch (imageError: any) {
      console.error(`[API Face Proxy] Error fetching face image for ${uuid} file ${filename}`);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    return new NextResponse(imageResponse.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[SECURITY] Fatal error in face proxy');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}