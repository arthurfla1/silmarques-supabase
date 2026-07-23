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

export async function generateOSReport(veiculo, m) {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Ordem de Servico", width / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    let y = 40;
    const lh = 8;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Veiculo:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${veiculo.marca} ${veiculo.modelo} (${veiculo.ano}) - Placa: ${veiculo.placa}`, 35, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Servico:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.titulo || '-', 35, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Data:", 15, y);
    pdf.setFont("helvetica", "normal");
    const dataParts = m.data.split('-');
    const dataFormatada = dataParts.length === 3 ? `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}` : m.data;
    pdf.text(dataFormatada, 30, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Status:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : '-', 32, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Categoria:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.categoria || '-', 38, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Local/Oficina:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.local || '-', 45, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Quilometragem:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.km ? `${m.km.toLocaleString('pt-BR')} km` : '-', 48, y);
    y += lh;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Valor:", 15, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(m.valor ? `R$ ${Number(m.valor).toFixed(2).replace('.', ',')}` : 'R$ 0,00', 30, y);
    y += lh + 4;
    
    if (m.descricao) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Descricao / Observacoes:", 15, y);
      y += lh;
      
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(m.descricao, width - 30);
      pdf.text(lines, 15, y);
    }
    
    const basePdfBytes = pdf.output('arraybuffer');
    const pdfDoc = await PDFDocument.load(basePdfBytes);
    
    const allAttachments = [];
    if (m.nota_fiscal_path) allAttachments.push(m.nota_fiscal_path);
    if (m.anexos && Array.isArray(m.anexos)) allAttachments.push(...m.anexos);
    
    const uniqueAttachments = [...new Set(allAttachments)].filter(Boolean);

    for (const path of uniqueAttachments) {
      try {
        const url = path.startsWith('http') ? path : `https://zzpzvjueortfmcyfygef.supabase.co/storage/v1/object/public/arquivos/${path}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        
        const arrayBuffer = await res.arrayBuffer();
        if (path.toLowerCase().endsWith('.pdf')) {
          const attachedPdf = await PDFDocument.load(arrayBuffer);
          const copiedPages = await pdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());
          copiedPages.forEach(page => pdfDoc.addPage(page));
        } else if (path.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
          const page = pdfDoc.addPage();
          let image;
          if (path.toLowerCase().endsWith('.png')) image = await pdfDoc.embedPng(arrayBuffer);
          else image = await pdfDoc.embedJpg(arrayBuffer);
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
    
    const finalPdfBytes = await pdfDoc.save();
    const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OS_${veiculo.placa}_${m.titulo || 'Servico'}.pdf`.replace(/[^a-z0-9._-]/gi, '_');
    a.click();
    URL.revokeObjectURL(url);
    
    return true;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
