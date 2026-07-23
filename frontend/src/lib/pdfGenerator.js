import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

export async function generateVehicleReport(elementId, veiculo, manutRealizadas) {
  try {
    // 1. Snapshot the element
    const el = document.getElementById(elementId);
    if (!el) throw new Error("Element not found");
    
    // We can temporarily add a class to hide unwanted buttons like "Edit" or "Excluir"
    // To make sure things look good, we can apply a background color
    const originalBg = el.style.background;
    el.style.background = '#ffffff';

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    el.style.background = originalBg;

    const imgData = canvas.toDataURL('image/png');
    
    // 2. Create base PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // If the table is longer than one page, jsPDF addImage will cut it.
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
    const basePdfBytes = pdf.output('arraybuffer');
    
    // 3. Load with pdf-lib to merge attachments
    const pdfDoc = await PDFDocument.load(basePdfBytes);
    
    // Collect all attachments
    const allAttachments = [];
    manutRealizadas.forEach(m => {
      if (m.nota_fiscal_path) allAttachments.push(m.nota_fiscal_path);
      if (m.anexos && Array.isArray(m.anexos)) {
        allAttachments.push(...m.anexos);
      }
    });

    // Remove duplicates
    const uniqueAttachments = [...new Set(allAttachments)].filter(Boolean);

    for (const path of uniqueAttachments) {
      try {
        const url = path.startsWith('http') ? path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${path}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        
        const arrayBuffer = await res.arrayBuffer();
        
        if (path.toLowerCase().endsWith('.pdf')) {
          // Merge PDF
          const attachedPdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await pdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());
          copiedPages.forEach(page => pdfDoc.addPage(page));
        } else if (path.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
          // Add image
          const page = pdfDoc.addPage();
          let image;
          if (path.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(arrayBuffer);
          } else {
            image = await pdfDoc.embedJpg(arrayBuffer);
          }
          const { width, height } = page.getSize();
          const imgDims = image.scaleToFit(width - 40, height - 40);
          page.drawImage(image, {
            x: width / 2 - imgDims.width / 2,
            y: height / 2 - imgDims.height / 2,
            width: imgDims.width,
            height: imgDims.height,
          });
        }
      } catch (err) {
        console.warn('Erro ao processar anexo', path, err);
      }
    }
    
    // Save
    const finalPdfBytes = await pdfDoc.save();
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_${veiculo.marca}_${veiculo.modelo}.pdf`.replace(/[^a-z0-9._-]/gi, '_');
    a.click();
    URL.revokeObjectURL(url);
    
    return true;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
