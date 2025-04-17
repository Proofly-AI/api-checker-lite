import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import path from 'path';

const PROOFLY_API_BASE_URL = 'https://api.proofly.ai';

/**
 * Proxy handler for retrieving a face image
 */
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

    // Validate faceId
    if (!/^[0-9]+$/.test(faceId)) {
      console.error(`[API Face Proxy] Invalid faceId format: ${faceId}`);
      return NextResponse.json({ error: 'Invalid face ID format' }, { status: 400 });
    }
    const faceIndex = parseInt(faceId, 10);
    if (!uuid || isNaN(faceIndex) || faceIndex < 0) {
      return NextResponse.json({ error: 'Invalid UUID or Face ID format' }, { status: 400 });
    }

    // 1. Get session info from Proofly API
    const sessionInfoUrl = `${PROOFLY_API_BASE_URL}/api/${uuid}`;
    let sessionInfoResponse;
    try {
      sessionInfoResponse = await axios.get(sessionInfoUrl);
    } catch (sessionError: any) {
      console.error(`[API Face Proxy] Error fetching session info for ${uuid}:`, sessionError.response?.status, sessionError.response?.data);
      if (sessionError.response?.status === 404) {
        return NextResponse.json({ error: 'Session not found on Proofly API' }, { status: 404 });
      }
      throw new Error('Failed to fetch session info from Proofly API');
    }
    const sessionData = sessionInfoResponse.data;
    if (!sessionData || !Array.isArray(sessionData.faces) || sessionData.faces.length === 0) {
      console.error(`[API Face Proxy] No faces found in session data for ${uuid}`);
      return NextResponse.json({ error: 'No faces found in session data' }, { status: 404 });
    }

    // 2. Find the target face object in the array
    const targetFace = sessionData.faces.find((face: any) => {
      if (!face || !face.face_path) return false;
      const match = face.face_path.match(/_(\d+)\.[^.]+$/);
      return match && parseInt(match[1], 10) === faceIndex;
    });
    if (!targetFace || !targetFace.face_path) {
      console.error(`[API Face Proxy] Face with index ${faceIndex} not found in session ${uuid}. Available paths:`, sessionData.faces.map((f:any) => f.face_path));
      return NextResponse.json({ error: `Face index ${faceIndex} not found` }, { status: 404 });
    }

    // 3. Extract filename from face_path
    const filename = path.basename(targetFace.face_path);
    if (!filename) {
      console.error(`[API Face Proxy] Could not extract filename from face_path: ${targetFace.face_path}`);
      throw new Error('Could not parse face path');
    }

    // 4. Form URL for fetching face image from Proofly API
    const faceImageUrl = `${PROOFLY_API_BASE_URL}/api/storage/faces/${filename}`;
    let imageResponse;
    try {
      imageResponse = await axios.get(faceImageUrl, {
        responseType: 'arraybuffer',
      });
    } catch (imageError: any) {
      console.error(`[API Face Proxy] Error fetching face image ${filename} from Proofly API. Status: ${imageError.response?.status}`);
      if (imageError.response?.status === 404) {
        return NextResponse.json({ error: 'Face image not found on Proofly storage' }, { status: 404 });
      }
      throw new Error('Failed to fetch face image from Proofly API');
    }

    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
    return new NextResponse(imageResponse.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[API Face Proxy] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}