import jsPDF from 'jspdf';

export const generateAnalysisReport = (analysisData, documentName) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper functions
  const addNewPageIfNeeded = (requiredSpace = 30) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  const drawLine = (y = yPosition) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const addText = (text, fontSize = 12, fontStyle = 'normal', maxWidth = contentWidth) => {
    doc.setFontSize(fontSize);
    doc.setFont(undefined, fontStyle);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * fontSize * 0.5;
    return lines.length;
  };

  // Header
  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Doclarity - Legal Document Analysis Report', margin, 25);
  
  doc.setTextColor(0, 0, 0);
  yPosition = 50;

  // Document Info
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Document Information', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Document: ${documentName}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Type: ${analysisData.summary.documentType}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Analysis Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 6;
  
  // Risk Level Badge
  const riskLevel = analysisData.summary.overallRiskLevel;
  const riskColors = {
    low: [34, 197, 94],    // Green
    medium: [251, 146, 60], // Orange
    high: [239, 68, 68]     // Red
  };
  const riskColor = riskColors[riskLevel] || riskColors.medium;
  
  doc.setFillColor(...riskColor);
  doc.roundedRect(margin, yPosition, 80, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(`${riskLevel.toUpperCase()} RISK`, margin + 40, yPosition + 13, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  yPosition += 30;
  drawLine();
  yPosition += 10;

  // Executive Summary
  addNewPageIfNeeded(40);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Executive Summary', margin, yPosition);
  yPosition += 12;

  // Key Points
  if (analysisData.summary.keyPoints?.length > 0) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Key Points:', margin, yPosition);
    yPosition += 8;
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    analysisData.summary.keyPoints.forEach((point, index) => {
      addNewPageIfNeeded(15);
      const bullet = `${index + 1}. `;
      const lines = doc.splitTextToSize(point, contentWidth - 10);
      doc.text(bullet, margin, yPosition);
      doc.text(lines, margin + 10, yPosition);
      yPosition += lines.length * 6 + 2;
    });
    yPosition += 5;
  }

  // Benefits and Risks side by side
  addNewPageIfNeeded(60);
  const halfWidth = (contentWidth - 10) / 2;
  
  // Benefits
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.setFillColor(34, 197, 94); // Light green
  doc.rect(margin, yPosition - 5, halfWidth, 25, 'F');
  doc.text('Benefits', margin + 5, yPosition);
  
  // Risks
  doc.setFillColor(239, 68, 68); // Light red
  doc.rect(margin + halfWidth + 10, yPosition - 5, halfWidth, 25, 'F');
  doc.text('Risks', margin + halfWidth + 15, yPosition);
  yPosition += 10;

  const benefitsStartY = yPosition;
  const risksStartY = yPosition;

  // Draw benefits
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  let benefitsY = benefitsStartY;
  analysisData.summary.benefits?.forEach((benefit) => {
    const lines = doc.splitTextToSize(`• ${benefit}`, halfWidth - 10);
    doc.text(lines, margin + 5, benefitsY);
    benefitsY += lines.length * 5 + 3;
  });

  // Draw risks
  let risksY = risksStartY;
  analysisData.summary.risks?.forEach((risk) => {
    const lines = doc.splitTextToSize(`• ${risk}`, halfWidth - 10);
    doc.text(lines, margin + halfWidth + 15, risksY);
    risksY += lines.length * 5 + 3;
  });

  yPosition = Math.max(benefitsY, risksY) + 10;

  // Financial Terms & Important Dates
  if (analysisData.summary.financialTerms?.length > 0 || analysisData.summary.importantDates?.length > 0) {
    addNewPageIfNeeded(40);
    drawLine();
    yPosition += 10;

    if (analysisData.summary.financialTerms?.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Financial Terms', margin, yPosition);
      yPosition += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      analysisData.summary.financialTerms.forEach((term) => {
        addNewPageIfNeeded(10);
        doc.text(`${term.label}: ${term.value}`, margin + 5, yPosition);
        yPosition += 7;
      });
      yPosition += 5;
    }

    if (analysisData.summary.importantDates?.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Important Dates', margin, yPosition);
      yPosition += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      analysisData.summary.importantDates.forEach((date) => {
        addNewPageIfNeeded(10);
        doc.text(`${date.label}: ${date.value}`, margin + 5, yPosition);
        yPosition += 7;
      });
      yPosition += 5;
    }
  }

  // Clauses Analysis
  if (analysisData.clauses?.length > 0) {
    addNewPageIfNeeded(40);
    drawLine();
    yPosition += 10;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Detailed Clause Analysis', margin, yPosition);
    yPosition += 12;

    analysisData.clauses.forEach((clause, index) => {
      addNewPageIfNeeded(50);
      
      // Clause header with importance badge
      const importanceColors = {
        high: [239, 68, 68],    // Red
        medium: [251, 146, 60], // Orange  
        low: [34, 197, 94]      // Green
      };
      const impColor = importanceColors[clause.importance] || importanceColors.medium;
      
      // Clause number and title
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${clause.title}`, margin, yPosition);
      
      // Importance badge
      const badgeX = pageWidth - margin - 60;
      doc.setFillColor(...impColor);
      doc.roundedRect(badgeX, yPosition - 8, 60, 16, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(clause.importance.toUpperCase(), badgeX + 30, yPosition - 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPosition += 8;

      // Section
      if (clause.section) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text(clause.section, margin, yPosition);
        yPosition += 6;
      }

      // Explanation
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      const explainLines = doc.splitTextToSize(clause.explanation, contentWidth - 10);
      doc.text(explainLines, margin, yPosition);
      yPosition += explainLines.length * 5 + 5;

      // Implications
      if (clause.implications?.length > 0) {
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('What this means:', margin, yPosition);
        yPosition += 6;
        
        doc.setFont(undefined, 'normal');
        clause.implications.forEach((imp) => {
          const lines = doc.splitTextToSize(`• ${imp}`, contentWidth - 15);
          doc.text(lines, margin + 5, yPosition);
          yPosition += lines.length * 5 + 2;
        });
      }

      // Action Items
      if (clause.actionItems?.length > 0) {
        yPosition += 3;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Recommended actions:', margin, yPosition);
        yPosition += 6;
        
        doc.setFont(undefined, 'normal');
        clause.actionItems.forEach((action) => {
          const lines = doc.splitTextToSize(`✓ ${action}`, contentWidth - 15);
          doc.text(lines, margin + 5, yPosition);
          yPosition += lines.length * 5 + 2;
        });
      }

      yPosition += 10;
    });
  }

  // Footer on last page
  const lastPageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setFont(undefined, 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('This analysis is for informational purposes only and does not constitute legal advice.', 
    pageWidth / 2, lastPageHeight - 15, { align: 'center' });
  doc.text(`Generated by Doclarity - Legal Doc Demystifier on ${new Date().toLocaleString()}`, 
    pageWidth / 2, lastPageHeight - 10, { align: 'center' });

  // Save the PDF
  const fileName = `${documentName.replace(/\.[^/.]+$/, '')}_analysis_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};