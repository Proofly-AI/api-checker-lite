import { jsPDF } from 'jspdf';
import { SessionInfoResponse } from '@/lib/types/proofly';
import { formatAnalysisResults } from '@/lib/types/proofly';
import { prooflyApi } from '@/lib/api/proofly';

/**
 * Function for exporting analysis results to PDF
 * @param sessionInfo Session information with analysis results
 * @returns Promise with export result
 */
export const exportResultsToPDF = async (sessionInfo: SessionInfoResponse): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get analysis results
    const analysisResults = formatAnalysisResults(sessionInfo);
    
    // Create PDF document A4 format
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Connect font for Cyrillic support
    // This is an important step - adding Cyrillic support
    pdf.addFont('/fonts/PTSans-Regular.ttf', 'PTSans', 'normal');
    pdf.addFont('/fonts/PTSans-Bold.ttf', 'PTSans', 'bold');
    pdf.setFont('PTSans');
    
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    
    /**
     * Helper function to draw probability bars
     * @param pdf PDF document
     * @param result Analysis result for face
     * @param startX X coordinate to start drawing from
     * @param startY Y coordinate to start drawing from
     * @param barWidth Width of progress bars
     * @return Height of drawn content
     */
    const drawProbabilityBars = (
      pdf: jsPDF,
      result: any,
      startX: number,
      startY: number,
      barWidth: number
    ): number => {
      let currentY = startY;
      const barHeight = 3; // progress bar height
      
      // --- REAL IMAGE PROBABILITY ---
      pdf.setFontSize(10);
      pdf.setFont('PTSans', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Real Image Probability', startX, currentY);
      currentY += 6;
      
      // Progress bar background (gray)
      pdf.setFillColor(230, 230, 230);
      pdf.rect(startX, currentY, barWidth, barHeight, 'F');
      
      // Filled part of progress bar
      const realProbabilityWidth = barWidth * result.ensembleProbability.real;
      
      // Choose color based on value
      if (result.ensembleProbability.real > 0.7) {
        pdf.setFillColor(0, 200, 0); // green
      } else if (result.ensembleProbability.real < 0.3) {
        pdf.setFillColor(200, 0, 0); // red
      } else {
        pdf.setFillColor(200, 150, 0); // orange
      }
      
      pdf.rect(startX, currentY, realProbabilityWidth, barHeight, 'F');
      
      // Percentage and label
      pdf.setFontSize(9);
      pdf.text(`${(result.ensembleProbability.real * 100).toFixed(2)}%`, startX, currentY + 7);
      pdf.text('Model Ensemble Confidence', startX + barWidth - 10, currentY + 7, { align: 'right' });
      
      currentY += 14; // Margin for next element
      
      // --- DEEPFAKE PROBABILITY ---
      pdf.setFontSize(10);
      pdf.text('Deepfake Probability', startX, currentY);
      currentY += 6;
      
      // Progress bar background (gray)
      pdf.setFillColor(230, 230, 230);
      pdf.rect(startX, currentY, barWidth, barHeight, 'F');
      
      // Filled part of progress bar
      const fakeProbabilityWidth = barWidth * result.ensembleProbability.fake;
      
      // Choose color based on value (inverted relative to real)
      if (result.ensembleProbability.fake < 0.3) {
        pdf.setFillColor(0, 200, 0); // green
      } else if (result.ensembleProbability.fake > 0.7) {
        pdf.setFillColor(200, 0, 0); // red
      } else {
        pdf.setFillColor(200, 150, 0); // orange
      }
      
      pdf.rect(startX, currentY, fakeProbabilityWidth, barHeight, 'F');
      
      // Percentage and label
      pdf.setFontSize(9);
      pdf.text(`${(result.ensembleProbability.fake * 100).toFixed(2)}%`, startX, currentY + 7);
      pdf.text('Model Ensemble Confidence', startX + barWidth - 10, currentY + 7, { align: 'right' });
      
      currentY += 10; // Final margin
      
      // Return total height used
      return currentY - startY;
    };
    
    // Function to load images
    const loadImage = (url: string) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = url;
      });
    };
    
    try {
      // Load logo from public directory
      const logoUrl = '/logo.png';
      const logoImage = await loadImage(logoUrl);
      
      // Add logo (centered at the top)
      const logoWidth = 40; // logo width in mm
      const logoHeight = (logoImage.height * logoWidth) / logoImage.width; // maintain proportions
      const logoX = (width - logoWidth) / 2; // horizontal centering
      
      // Create canvas for logo
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = logoImage.width;
      logoCanvas.height = logoImage.height;
      const logoContext = logoCanvas.getContext('2d');
      if (logoContext) {
        logoContext.drawImage(logoImage, 0, 0);
      }
      
      // Get logo data
      const logoData = logoCanvas.toDataURL('image/png');
      
      // Add logo at the top
      pdf.addImage({
        imageData: logoData,
        format: 'PNG',
        x: logoX,
        y: 10, 
        width: logoWidth,
        height: logoHeight
      });
      
      // Move title down after logo
      const titleY = 10 + logoHeight + 10; // 10mm margin after logo
      
      // Get current date
      const currentDate = new Date().toLocaleDateString('en-US');
      
      // Add title and session information
      pdf.setFontSize(14);
      pdf.setFont('PTSans', 'bold');
      pdf.text(`Image Analysis Report - ${currentDate}`, width / 2, titleY, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('PTSans', 'normal');
      
      // Display SHA256 and UUID in requested order
      if (sessionInfo.sha256) {
        pdf.text(`SHA256: ${sessionInfo.sha256}`, 14, titleY + 10);
      }
      
      pdf.text(`UUID: ${sessionInfo.uuid}`, 14, titleY + 17);
      
      // Initial position for content
      let yPos = titleY + 30; // Adjusted to account for removed Date line
      
      // Add information about analysis results programmatically
      if (!sessionInfo.faces || sessionInfo.faces.length === 0) {
        // Case when no faces are detected
        pdf.setFontSize(12);
        pdf.text('No faces detected in the image', width / 2, yPos, { align: 'center' });
      } else {
        // Process each detected face
        for (let faceIndex = 0; faceIndex < sessionInfo.faces.length; faceIndex++) {
          // Start new page for each face (except first one which is already on first page)
          if (faceIndex > 0) {
            pdf.addPage();
            yPos = 20; // Reset Y position for new page
          }

          const result = analysisResults[faceIndex];
          
          if (!result) continue;
          
          // Add header for each face
          pdf.setFontSize(14);
          pdf.setFont('PTSans', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`Face ${result.faceIndex}`, 14, yPos);
          pdf.setFont('PTSans', 'normal');
          yPos += 8;
          
          // Try to add face image if possible
          try {
            if (faceIndex < sessionInfo.faces.length) {
              const faceImageUrl = prooflyApi.getFaceImageUrl(sessionInfo.uuid, faceIndex);
              const faceImage = await loadImage(faceImageUrl);
              
              // Define face image dimensions
              const faceImageWidth = 50; // width in mm
              const faceImageHeight = (faceImage.height * faceImageWidth) / faceImage.width;
              
              // Create canvas for face image
              const faceCanvas = document.createElement('canvas');
              faceCanvas.width = faceImage.width;
              faceCanvas.height = faceImage.height;
              const faceContext = faceCanvas.getContext('2d');
              if (faceContext) {
                faceContext.drawImage(faceImage, 0, 0);
              }
              
              // Get face image data
              const faceImageData = faceCanvas.toDataURL('image/png');
              
              // Add face image
              pdf.addImage({
                imageData: faceImageData,
                format: 'PNG',
                x: 14,
                y: yPos,
                width: faceImageWidth,
                height: faceImageHeight
              });
              
              // Place probability bars on the right side of the image
              const rightColumnX = faceImageWidth + 20; // Start right column after image with margin
              
              // Determine verdict text
              let verdictText = "Likely Real"; // default value
              
              if (result.ensembleProbability.real > 0.7) {
                verdictText = "Likely Real";
              } else if (result.ensembleProbability.real < 0.3) {
                verdictText = "Likely Deepfake";
              } else {
                verdictText = "Uncertain Result";
              }
              
              // Right column should be exactly aligned with image top
              const rightColumnY = yPos + 3; // No offset, align exactly with image top
              
              // Display verdict in single line at the top of right column
              pdf.setFontSize(12);
              pdf.setFont('PTSans', 'bold');
              pdf.setTextColor(0, 0, 0);
              pdf.text(`Verdict: ${verdictText}`, rightColumnX, rightColumnY);
              
              // Reset to normal font and ensure we reset text color
              pdf.setFont('PTSans', 'normal');
              pdf.setTextColor(0, 0, 0);
              
              // Draw probability bars to the right of the image
              // Start probability bars a bit below the verdict text
              drawProbabilityBars(pdf, result, rightColumnX, rightColumnY + 7, 90);
              
              // Move position after the face section
              yPos += faceImageHeight + 10;
            }
          } catch (faceImgError) {
            console.error('Failed to load face image:', faceImgError);
            pdf.setFontSize(10);
            pdf.setTextColor(150, 0, 0);
            pdf.text('Failed to load face image', 14, yPos);
            yPos += 10;
            
            // Add verdict
            pdf.setFontSize(12);
            pdf.setFont('PTSans', 'bold');
            pdf.setTextColor(0, 0, 0);
            
            // Determine verdict text
            let verdictText = "Likely Real"; // default value
            
            if (result.ensembleProbability.real > 0.7) {
              verdictText = "Likely Real";
            } else if (result.ensembleProbability.real < 0.3) {
              verdictText = "Likely Deepfake";
            } else {
              verdictText = "Uncertain Result";
            }
            
            // Display verdict
            pdf.text(`Verdict: ${verdictText}`, 14, yPos);
            
            // Reset font and draw probability bars vertically (when image fails)
            pdf.setFont('PTSans', 'normal');
            pdf.setTextColor(0, 0, 0);
            yPos += 10;
            
            // Draw probability bars (stacked vertically when image fails)
            const heightUsed = drawProbabilityBars(pdf, result, 14, yPos, 150);
            yPos += heightUsed + 5;
          }
          
          // --- INDIVIDUAL MODEL RESULTS ---
          pdf.setFontSize(12);
          pdf.setFont('PTSans', 'bold');
          pdf.text('Individual Model Results', 14, yPos);
          pdf.setFont('PTSans', 'normal');
          yPos += 8;
          
          // Define positioning for model bars
          const modelBarX = 14;
          const modelBarWidth = 150;
          const modelBarHeight = 3;
          
          // Add results for each model
          for (let i = 0; i < result.modelProbabilities.length; i++) {
            const model = result.modelProbabilities[i];
            
            // Use model name instead of just number
            const modelName = model.model ? `Model ${model.model}` : `Model ${i + 1}`;
            
            pdf.setFontSize(9);
            pdf.text(modelName, 14, yPos);
            pdf.text(`${(model.realProbability * 100).toFixed(2)}%`, modelBarX + modelBarWidth - 10, yPos, { align: 'right' });
            yPos += 4;
            
            // Draw progress bar for model
            pdf.setFillColor(230, 230, 230);
            pdf.rect(modelBarX, yPos, modelBarWidth, modelBarHeight, 'F');
            
            // Filled part of progress bar
            const modelProbabilityWidth = modelBarWidth * model.realProbability;
            
            // Choose color based on value
            if (model.realProbability > 0.7) {
              pdf.setFillColor(0, 200, 0);
            } else if (model.realProbability < 0.3) {
              pdf.setFillColor(200, 0, 0);
            } else {
              pdf.setFillColor(200, 150, 0);
            }
            
            pdf.rect(modelBarX, yPos, modelProbabilityWidth, modelBarHeight, 'F');
            
            yPos += 8;
          }
        }
      }
      
      // Add metadata
      pdf.setProperties({
        title: `Proofly Checker - Report (${sessionInfo.uuid})`,
        subject: 'Image Analysis for Deepfakes',
        creator: 'Proofly Checker',
        keywords: 'analysis, deepfake, image'
      });
      
      // Add footer to all pages
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        
        // Add company information
        pdf.text('© Proofly AI, 2025 - All Rights Reserved - www.proofly.ai', width/2, height - 10, { align: 'center' });
        
        // Page number
        if (pageCount > 1) {
          pdf.text(`Page ${i} of ${pageCount}`, width - 20, height - 5);
        }
      }
      
      // Save PDF
      pdf.save(`proofly-report-${sessionInfo.uuid}.pdf`);
      
      return { success: true };
    } catch (imgError) {
      console.error('Error creating PDF:', imgError);
      
      // Create PDF with text information only if images failed to load
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Connect font for Cyrillic support
      pdf.addFont('/fonts/PTSans-Regular.ttf', 'PTSans', 'normal');
      pdf.addFont('/fonts/PTSans-Bold.ttf', 'PTSans', 'bold');
      pdf.setFont('PTSans');
      
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      
      // For fallback PDF without images
      const titleY = 20;
      
      // Get current date
      const currentDate = new Date().toLocaleDateString('en-US');
      
      pdf.setFontSize(14);
      pdf.setFont('PTSans', 'bold');
      pdf.text(`Image Analysis Report - ${currentDate}`, width / 2, titleY, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('PTSans', 'normal');
      
      // Display SHA256 and UUID in requested order
      if (sessionInfo.sha256) {
        pdf.text(`SHA256: ${sessionInfo.sha256}`, 14, titleY + 10);
      }
      
      pdf.text(`UUID: ${sessionInfo.uuid}`, 14, titleY + 17);
      pdf.text('Error loading images. Report contains text information only.', 14, titleY + 30);
      
      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('© Proofly AI, 2025 - All Rights Reserved - www.proofly.ai', width/2, height - 10, { align: 'center' });
      
      // Save PDF
      pdf.save(`proofly-report-${sessionInfo.uuid}.pdf`);
      
      return { success: true, error: 'Created report without images due to loading error' };
    }
  } catch (error) {
    console.error('Error creating PDF:', error);
    return { success: false, error: 'Error creating PDF report' };
  }
}; 