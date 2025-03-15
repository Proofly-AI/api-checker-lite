import { NextRequest, NextResponse } from 'next/server';
import { exportResultsToPDF } from '@/lib/utils/pdfExport';
import { prooflyApi } from '@/lib/api/proofly';

// API route for generating PDF report by UUID
export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  const uuid = params.uuid;
  
  try {
    console.log(`Generating PDF report for session: ${uuid}`);
    
    // Get session data through API
    let sessionInfo;
    try {
      sessionInfo = await prooflyApi.getSessionInfo(uuid);
    } catch (apiError) {
      console.error('API Error:', apiError);
      return NextResponse.json(
        { 
          error: 'Failed to retrieve session information from API',
          details: apiError instanceof Error ? apiError.message : String(apiError)
        },
        { status: 500 }
      );
    }
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: 'Session information not found' },
        { status: 404 }
      );
    }
    
    console.log('Session info retrieved. Generating PDF...');
    console.log('Session data:', JSON.stringify(sessionInfo, null, 2));
    
    // Check if we have all necessary data for PDF
    if (!sessionInfo.faces || sessionInfo.faces.length === 0) {
      return NextResponse.json(
        { error: 'No face data available in session' },
        { status: 400 }
      );
    }
    
    // Generate PDF
    try {
      const result = await exportResultsToPDF(sessionInfo);
      
      if (result.success) {
        return NextResponse.json(
          { 
            success: true, 
            message: 'PDF generated successfully',
            filename: `proofly-report-${uuid}.pdf`
          }
        );
      } else {
        return NextResponse.json(
          { error: result.error || 'Unknown error generating PDF' },
          { status: 500 }
        );
      }
    } catch (pdfError) {
      console.error('PDF Generation Error:', pdfError);
      return NextResponse.json(
        { 
          error: 'Error generating PDF',
          details: pdfError instanceof Error ? pdfError.message : String(pdfError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 