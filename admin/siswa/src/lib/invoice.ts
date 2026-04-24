import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { id as localeID, ja as localeJA } from 'date-fns/locale';
import type { Student, Payment } from './types';
import { translations } from '../translations';

// Add types for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = async (student: Student, payment: Payment, dueDate: string, language: 'ja' | 'id') => {
  const doc = new jsPDF();
  const primaryColor = [204, 0, 0]; // #CC0000
  const t = translations[language];
  const dateLocale = language === 'ja' ? localeJA : localeID;
  const dateFormat = language === 'ja' ? 'yyyy\u5e74MM\u6708dd\u65e5' : 'dd MMMM yyyy';

  // --- Header ---
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, 210, 45, 'F');

  // Load and add logo
  try {
    const logoData = await loadImageToBase64('/balijapan_logo.webp');
    doc.addImage(logoData, 'WEBP', 15, 8, 30, 30);
  } catch (err) {
    console.error('Failed to load logo', err);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(t.invoice_title as string, 140, 28);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('PT BALI JAPAN DREAM', 55, 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. Merdeka VI No.5, Sumerta Kelod,', 55, 20);
  doc.text('Kec. Denpasar Tim., Kota Denpasar, Bali 80239', 55, 25);
  doc.text('Email: info@balijapandream.com', 55, 30);

  // --- Invoice Info ---
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(t.bill_info as string, 15, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t.invoice_number}: INV-${payment.id?.substring(0, 8).toUpperCase()}`, 15, 67);
  doc.text(`${t.date}: ${format(new Date(), dateFormat, { locale: dateLocale })}`, 15, 73);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${t.due_date_label}: ${format(new Date(dueDate), dateFormat, { locale: dateLocale })}`, 15, 79);

  // --- Student Info ---
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(t.billed_to as string, 120, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(student.fullName, 120, 67);
  doc.text(`ID: ${student.registrationNumber}`, 120, 73);
  doc.text(`Batch: ${student.batchNumber}`, 120, 79);

  // --- Table ---
  const tableHeaders = [[t.description as string, t.amount as string]];
  const tableData = [
    [
      getPaymentTypeLabel(payment.paymentType, t),
      `Rp ${payment.totalAmount.toLocaleString('id-ID')}`
    ]
  ];

  doc.autoTable({
    startY: 90,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 105;

  // --- Total ---
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.total_bill}:`, 140, finalY + 15);
  doc.text(`Rp ${payment.totalAmount.toLocaleString('id-ID')}`, 195, finalY + 15, { align: 'right' });

  // --- Payment Info ---
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(t.payment_info as string, 15, finalY + 35);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.bank_transfer}:`, 15, finalY + 45);
  doc.setFont('helvetica', 'normal');
  doc.text('Bank BNI', 15, finalY + 52);
  doc.text(`${t.account_name}: PT BALI JAPAN DREAM`, 15, finalY + 57);
  doc.text(`${t.account_number_label}: 1915673006`, 15, finalY + 62);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(t.proof_note as string, 15, finalY + 75);

  // --- Footer ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(t.footer_thanks as string, 105, 285, { align: 'center' });

  // Save the PDF
  doc.save(`Invoice_${student.fullName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateYellowCardInvoicePDF = async (student: Student, card: YellowCardRecord, dueDate: string, language: 'ja' | 'id') => {
  const doc = new jsPDF();
  const primaryColor = [204, 0, 0]; // #CC0000
  const t = translations[language];
  const dateLocale = language === 'ja' ? localeJA : localeID;
  const dateFormat = language === 'ja' ? 'yyyy\u5e74MM\u6708dd\u65e5' : 'dd MMMM yyyy';

  // --- Header ---
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, 210, 45, 'F');

  try {
    const logoData = await loadImageToBase64('/balijapan_logo.webp');
    doc.addImage(logoData, 'WEBP', 15, 8, 30, 30);
  } catch (err) {
    console.error('Failed to load logo', err);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(t.invoice_title as string, 140, 28);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('PT BALI JAPAN DREAM', 55, 15);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. Merdeka VI No.5, Sumerta Kelod,', 55, 20);
  doc.text('Kec. Denpasar Tim., Kota Denpasar, Bali 80239', 55, 25);

  // --- Invoice Info ---
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(t.bill_info as string, 15, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t.invoice_number}: YC-${card.id?.substring(0, 8).toUpperCase()}`, 15, 67);
  doc.text(`${t.date}: ${format(new Date(), dateFormat, { locale: dateLocale })}`, 15, 73);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${t.due_date_label}: ${format(new Date(dueDate), dateFormat, { locale: dateLocale })}`, 15, 79);

  // --- Student Info ---
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(t.billed_to as string, 120, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(student.fullName, 120, 67);
  doc.text(`ID: ${student.registrationNumber}`, 120, 73);
  doc.text(`Batch: ${student.batchNumber}`, 120, 79);

  // --- Table ---
  const tableHeaders = [[t.description as string, t.amount as string]];
  const tableData = [
    [
      `${t.yellow_card_fee} (${card.reason})`,
      `Rp 500.000` // Assuming a fixed fine for now, or adjustable
    ]
  ];

  doc.autoTable({
    startY: 90,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 105;

  // --- Total ---
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.total_bill}:`, 140, finalY + 15);
  doc.text(`Rp 500.000`, 195, finalY + 15, { align: 'right' });

  // --- Payment Info ---
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(t.payment_info as string, 15, finalY + 35);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(`${t.bank_transfer}:`, 15, finalY + 45);
  doc.setFont('helvetica', 'normal');
  doc.text('Bank BNI', 15, finalY + 52);
  doc.text(`${t.account_name}: PT BALI JAPAN DREAM`, 15, finalY + 57);
  doc.text(`${t.account_number_label}: 1915673006`, 15, finalY + 62);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(t.proof_note as string, 15, finalY + 75);

  // --- Footer ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(t.footer_thanks as string, 105, 285, { align: 'center' });

  doc.save(`YC_Invoice_${student.fullName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

async function loadImageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Failed to get canvas context');
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function getPaymentTypeLabel(type: string, t: any): string {
  switch (type) {
    case 'education': return t.edu_fee_type;
    case 'dormitory': return t.dorm_fee_type;
    case 'job_matching': return t.jm_fee_type;
    case 'other': return t.other;
    default: return t.bill_info;
  }
}

export type { YellowCardRecord }; // Export for type safety if needed
import type { YellowCardRecord } from './types';
