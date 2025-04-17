import { jsPDF } from 'jspdf';
import { SessionInfoResponse, formatAnalysisResults, AnalysisResult } from '@/lib/types/proofly';
import { prooflyApi } from '@/lib/api/proofly';

// Helper function for formatting percentages
const formatPercent = (value: number): string => {
  return (value * 100).toFixed(2) + '%';
};

// Helper function to load an image as base64
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const fetchUrl = `${url}?t=${new Date().getTime()}`;
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    if (typeof window !== 'undefined') {
      const blob = new Blob([arrayBuffer]);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const buffer = Buffer.from(arrayBuffer);
      const extension = url.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
  } catch (error) {
    console.error('Error loading image:', error);
    throw error;
  }
}

/**
 * Exports analysis results to a PDF in certificate style.
 * @param sessionInfo Session information with analysis results.
 * @returns Promise with export result.
 */
export const exportResultsToPDF = async (sessionInfo: SessionInfoResponse): Promise<{ success: boolean; error?: string }> => {
  try {
    const analysisResults = formatAnalysisResults(sessionInfo);
    let logoBase64: string | null = null;
    let logoProps: any | null = null;

    // Load logo
    try {
      logoBase64 = await loadImageAsBase64('/logo.png');
    } catch (logoError) {
      console.error('PDF Export: Failed to load logo.png', logoError);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFont('helvetica');

    // Set PDF metadata
    pdf.setProperties({
      title: `Proofly Analysis Report - ${sessionInfo.uuid}`,
      subject: `Deepfake Analysis Results for Session ${sessionInfo.uuid}`,
      author: 'Proofly AI',
      keywords: `proofly, deepfake, analysis, report, ${sessionInfo.uuid}`,
      creator: 'Proofly AI App',
    });

    // Get logo properties if loaded
    if (logoBase64) {
      try {
        logoProps = pdf.getImageProperties(logoBase64);
      } catch (propsError) {
        console.error('PDF Export: Failed to get logo properties', propsError);
        logoBase64 = null;
      }
    }

    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = width - 2 * margin;
    const leftCol = margin + 5;
    const rightCol = margin + 55;
    let yPos = 0;

    // Page break helper
    const checkPageBreak = (currentY: number, requiredSpace: number): number => {
      const safeBottomMargin = 30;
      if (currentY + requiredSpace > height - safeBottomMargin) {
        pdf.addPage();
        pdf.setDrawColor(0);
        pdf.setLineWidth(1);
        pdf.rect(margin, margin, contentWidth, height - 2 * margin);
        return margin + 15;
      }
      return currentY;
    };

    // Footer helper
    const addFooter = (logoBase64Data: string | null, logoProperties: any | null) => {
      const footerY = height - margin - 15;
      pdf.setLineWidth(0.5);
      pdf.line(margin, footerY, width - margin, footerY);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      if (logoBase64Data && logoProperties) {
        const logoHeight = 8;
        const logoWidth = (logoProperties.width * logoHeight) / logoProperties.height;
        const logoX = margin + 5;
        const logoY = footerY + 3;
        try {
          pdf.addImage(logoBase64Data, 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch (imgError) {
          console.error('PDF Export: Error adding logo to footer', imgError);
        }
      }
      pdf.text('Proofly AI, 2025 - All Rights Reserved - www.proofly.ai', width / 2, footerY + 8, { align: 'center' });
      const pageInfo = pdf.getCurrentPageInfo();
      const pageCount = pdf.getNumberOfPages();
      if (pageCount > 1) {
        pdf.text(`Page ${pageInfo.pageNumber} of ${pageCount}`, width - margin - 5, footerY + 8, { align: 'right' });
      }
    };

    // --- FIRST PAGE ---
    pdf.setDrawColor(0);
    pdf.setLineWidth(1);
    pdf.rect(margin, margin, contentWidth, height - 2 * margin);

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANALYSIS REPORT', width / 2, margin + 20, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Deepfake Detection Analysis Results', width / 2, margin + 28, { align: 'center' });
    const reportDate = new Date().toLocaleDateString();
    pdf.text(`Report generated on: ${reportDate}`, width / 2, margin + 34, { align: 'center' });
    yPos = margin + 45;
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, width - margin, yPos);
    yPos += 10;

    // --- SESSION DETAILS ---
    yPos = checkPageBreak(yPos, 30);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SESSION DETAILS', margin + 5, yPos);
    yPos += 8;
    pdf.setFontSize(10);
    const addDetail = (label: string, value: string | undefined) => {
      if (!value) return;
      yPos = checkPageBreak(yPos, 7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, leftCol, yPos);
      pdf.setFont('helvetica', 'normal');
      const splitValue = pdf.splitTextToSize(value, contentWidth - (rightCol - margin));
      pdf.text(splitValue, rightCol, yPos);
      yPos += splitValue.length * 5;
      yPos += 3;
    };
    addDetail('Session UUID:', sessionInfo.uuid);
    addDetail('SHA256 Hash:', sessionInfo.sha256);
    yPos += 5;
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, width - margin, yPos);
    yPos += 10;

    // --- FACE ANALYSIS DETAILS ---
    yPos = checkPageBreak(yPos, 20);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FACE ANALYSIS DETAILS', margin + 5, yPos);
    yPos += 10;

    if (!analysisResults || analysisResults.length === 0) {
      yPos = checkPageBreak(yPos, 10);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('No faces detected in the image.', leftCol, yPos);
      yPos += 10;
    } else {
      for (let i = 0; i < analysisResults.length; i++) {
        const result = analysisResults[i];
        yPos = checkPageBreak(yPos, 100);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Face ${result.faceIndex}:`, margin + 5, yPos);
        yPos += 8;
        let faceImageBase64: string | null = null;
        let faceImageError = false;
        try {
          const faceImageUrl = prooflyApi.getFaceImageUrl(sessionInfo.uuid, result.faceIndex - 1);
          faceImageBase64 = await loadImageAsBase64(faceImageUrl);
        } catch (err) {
          console.error(`PDF Export: Failed to load image for face ${result.faceIndex}`, err);
          faceImageError = true;
        }
        const faceDataStartY = yPos;
        const imageWidth = 50;
        let imageRenderedHeight = 0;
        if (faceImageBase64) {
          try {
            const imgProps = pdf.getImageProperties(faceImageBase64);
            imageRenderedHeight = (imgProps.height * imageWidth) / imgProps.width;
            yPos = checkPageBreak(yPos, imageRenderedHeight + 5);
            pdf.addImage(faceImageBase64, 'PNG', leftCol, yPos, imageWidth, imageRenderedHeight);
            const verdictUpper = result.verdict.toUpperCase();
            let frameColor: number[] | null = null;
            if (verdictUpper.includes('REAL')) {
              frameColor = [0, 128, 0];
            } else if (verdictUpper.includes('FAKE')) {
              frameColor = [200, 0, 0];
            }
            if (frameColor) {
              pdf.setDrawColor(frameColor[0], frameColor[1], frameColor[2]);
              pdf.setLineWidth(1);
              pdf.rect(leftCol, yPos, imageWidth, imageRenderedHeight);
              pdf.setDrawColor(0);
              pdf.setLineWidth(0.2);
            }
          } catch (imgAddError) {
            console.error(`PDF Export: Failed to add image for face ${result.faceIndex}`, imgAddError);
            faceImageError = true;
            imageRenderedHeight = 0;
            pdf.setFontSize(9);
            pdf.setTextColor(150, 0, 0);
            pdf.text('Error adding face image', leftCol + 5, yPos + 5);
            pdf.setTextColor(0);
            yPos += 10;
          }
        } else if (faceImageError) {
          yPos = checkPageBreak(yPos, 10);
          pdf.setFontSize(9);
          pdf.setTextColor(150, 0, 0);
          pdf.text('Failed to load face image', leftCol + 5, yPos + 5);
          pdf.setTextColor(0);
          yPos += 10;
        }
        const textStartX = faceImageBase64 && imageRenderedHeight > 0 ? leftCol + imageWidth + 15 : leftCol + 5;
        const textStartY = faceDataStartY;
        let textCurrentY = textStartY;
        const textBlockWidth = contentWidth - (textStartX - margin);
        const addFaceDetail = (label: string, value: string, valueColor: number[] | null = null) => {
          textCurrentY = checkPageBreak(textCurrentY, 7);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text(label, textStartX, textCurrentY);
          pdf.setFont('helvetica', 'normal');
          if (valueColor) {
            pdf.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
          }
          const valueStartX = textStartX + 40;
          const valueWidth = contentWidth - valueStartX - margin + 5;
          const splitValue = pdf.splitTextToSize(value, valueWidth);
          pdf.text(splitValue, valueStartX, textCurrentY);
          if (valueColor) {
            pdf.setTextColor(0);
          }
          textCurrentY += splitValue.length * 5 + 2;
        };
        let verdictColor: number[] | null = null;
        const verdictUpper = result.verdict.toUpperCase();
        if (verdictUpper.includes('REAL')) verdictColor = [0, 128, 0];
        else if (verdictUpper.includes('FAKE')) verdictColor = [200, 0, 0];
        else verdictColor = [200, 150, 0];
        addFaceDetail('Verdict:', result.verdict, verdictColor);
        addFaceDetail('Real Probability:', formatPercent(result.ensembleProbability.real));
        addFaceDetail('Deepfake Probability:', formatPercent(result.ensembleProbability.fake));
        textCurrentY += 5;
        textCurrentY = checkPageBreak(textCurrentY, 15);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Individual Model Scores:', textStartX, textCurrentY);
        textCurrentY += 6;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        for (const model of result.modelProbabilities) {
          textCurrentY = checkPageBreak(textCurrentY, 6);
          const modelText = `Model ${model.model}: ${formatPercent(model.realProbability)}`;
          const splitModelText = pdf.splitTextToSize(modelText, textBlockWidth - 5);
          pdf.text(splitModelText, textStartX, textCurrentY);
          textCurrentY += splitModelText.length * 4 + 1;
        }
        yPos = Math.max(yPos + imageRenderedHeight + 10, textCurrentY + 10);
        if (i < analysisResults.length - 1) {
          yPos = checkPageBreak(yPos, 10);
          pdf.setLineWidth(0.3);
          pdf.line(margin, yPos, width - margin, yPos);
          yPos += 10;
        }
      }
    }
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      addFooter(logoBase64, logoProps);
    }
    pdf.save(`proofly-report-${sessionInfo.uuid}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Error creating PDF report:', error);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFont('helvetica');
      const width = pdf.internal.pageSize.getWidth();
      pdf.setFontSize(12);
      pdf.text('Error generating PDF report.', width / 2, 30, { align: 'center' });
      if (error instanceof Error) {
        pdf.text(`Details: ${error.message}`, 15, 40, { maxWidth: width - 30 });
      }
      pdf.save(`proofly-report-error-${sessionInfo.uuid}.pdf`);
      return { success: false, error: `Error creating PDF: ${error instanceof Error ? error.message : String(error)}` };
    } catch (fallbackError) {
      return { success: false, error: 'Failed to create even an error PDF.' };
    }
  }
};