import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdf = async (elementId, fileName) => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  // For elements inside a scrolling dialog, scroll to top before capture
  const parentDialogContent = input.closest('[role="dialog"] > div');
  let originalScrollTop;
  if(parentDialogContent){
    originalScrollTop = parentDialogContent.scrollTop;
    parentDialogContent.scrollTop = 0;
  }

  try {
    const canvas = await html2canvas(input, {
      scale: 2, // Higher scale for better quality
      useCORS: true, 
      allowTaint: true,
      logging: false,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 page size in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = imgProps.width;
    const imgHeight = imgProps.height;
    
    // Calculate the aspect ratio
    const ratio = imgWidth / imgHeight;
    
    // Calculate the width and height of the image on the PDF
    // Use pdfWidth with some margin
    let width = pdfWidth - 20; // 10mm margin on each side
    let height = width / ratio;

    // If the calculated height is greater than the page height, we need to split the image
    if (height > pdfHeight - 20) {
        height = pdfHeight - 20; // 10mm margin top/bottom
        width = height * ratio;
    }

    // Center the image
    const x = (pdfWidth - width) / 2;
    const y = 10;

    pdf.addImage(imgData, 'PNG', x, y, width, height);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
     // Restore scroll position if it was changed
     if(parentDialogContent){
      parentDialogContent.scrollTop = originalScrollTop;
    }
  }
};