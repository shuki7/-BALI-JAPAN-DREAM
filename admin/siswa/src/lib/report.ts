import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { id as localeID, ja as localeJA } from 'date-fns/locale';
import type { Student, Payment } from './types';
import { translations } from '../translations';

export const generateStudentReportPDF = async (
  student: Student,
  payments: Payment[],
  language: 'ja' | 'id'
) => {
  const doc = new jsPDF();
  const primaryColor = [204, 0, 0]; // #CC0000
  const t = translations[language];
  const dateLocale = language === 'ja' ? localeJA : localeID;
  const dateFormat = language === 'ja' ? 'yyyy/MM/dd' : 'dd/MM/yyyy';

  // --- Header ---
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, 210, 40, 'F');

  // Load and add logo
  try {
    const logoData = await loadImageToBase64('/balijapan_logo.webp');
    doc.addImage(logoData, 'WEBP', 15, 5, 30, 30);
  } catch (err) {
    console.error('Failed to load logo', err);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(language === 'ja' ? '生徒個人レポート' : 'LAPORAN INDIVIDU SISWA', 50, 22);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, 22);

  // --- Profile Photo & Basic Info Section ---
  let currentY = 50;
  
  // Try to add student photo
  try {
    const photoUrl = student.photos?.[0]?.url || student.photoUrl;
    if (photoUrl) {
      const imgBase64 = await loadImageToBase64(photoUrl);
      doc.addImage(imgBase64, 'JPEG', 20, currentY, 35, 45);
    } else {
      doc.setFillColor(240, 240, 240);
      doc.rect(20, currentY, 35, 45, 'F');
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text('No Photo', 30, currentY + 25);
    }
  } catch (err) {
    console.error('Failed to add photo to PDF', err);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(student.fullName, 65, currentY + 10);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${student.registrationNumber}`, 65, currentY + 18);
  doc.text(`${t.batch}: ${student.batchNumber}`, 65, currentY + 24);
  doc.text(`${t.status}: ${student.status.toUpperCase()}`, 65, currentY + 30);
  doc.text(`${t.enroll_date}: ${format(student.enrollmentDate, dateFormat, { locale: dateLocale })}`, 65, currentY + 36);

  // --- Personal Information Table ---
  currentY += 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(t.personal_info as string, 20, currentY);
  
  const personalData = [
    [t.full_name as string, student.fullName, t.gender as string, student.gender === 'male' ? t.male : t.female],
    [t.birth_date as string, format(student.dateOfBirth, dateFormat), t.religion as string, student.religion || '-'],
    [t.whatsapp as string, student.whatsapp || '-', 'Email', student.email || '-'],
    [t.address as string, student.address, t.city as string, student.city]
  ];

  doc.autoTable({
    startY: currentY + 5,
    body: personalData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', width: 35 },
      2: { fontStyle: 'bold', width: 35 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // --- Social Media Section ---
  if (student.instagramAccount || student.tiktokAccount) {
    let snsX = 20;
    if (student.instagramAccount) {
      try {
        const igLogo = await loadImageToBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png');
        doc.addImage(igLogo, 'PNG', snsX, currentY, 5, 5);
        doc.setFontSize(9);
        doc.text(`@${student.instagramAccount}`, snsX + 7, currentY + 4);
        snsX += 45;
      } catch (e) {
        console.error('IG Logo fail', e);
      }
    }
    if (student.tiktokAccount) {
      try {
        const ttLogo = await loadImageToBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/TikTok_logo.svg/600px-TikTok_logo.svg.png');
        doc.addImage(ttLogo, 'PNG', snsX, currentY, 5, 5);
        doc.setFontSize(9);
        doc.text(`@${student.tiktokAccount}`, snsX + 7, currentY + 4);
      } catch (e) {
        console.error('TikTok Logo fail', e);
      }
    }
    currentY += 10;
  } else {
    currentY += 5;
  }

  // --- Education & Exams ---
  doc.setFont('helvetica', 'bold');
  doc.text(t.edu_qualifications as string, 20, currentY);
  
  const eduData = [
    [t.education_level as string, student.educationLevel.toUpperCase(), t.school_name as string, student.schoolName],
    ['JLPT', student.jlptLevel.toUpperCase(), 'JFT-A2', student.jftPassed ? t.passed : t.not_passed],
    ['SSW', student.sswPassed ? t.passed : t.not_passed, 'Psychotest', student.psychotestDone ? t.done : t.not_done]
  ];

  doc.autoTable({
    startY: currentY + 5,
    body: eduData,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: 0 },
    styles: { fontSize: 9 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // --- Payment Summary ---
  doc.setFont('helvetica', 'bold');
  doc.text(t.payments as string, 20, currentY);
  
  const totalDue = payments.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalPaid = payments.reduce((acc, p) => acc + p.paidAmount, 0);
  
  const paymentData = [
    [t.total_amount as string, `Rp ${totalDue.toLocaleString('id-ID')}`],
    [t.paid_amount as string, `Rp ${totalPaid.toLocaleString('id-ID')}`],
    [t.remaining_balance as string, `Rp ${(totalDue - totalPaid).toLocaleString('id-ID')}`]
  ];

  doc.autoTable({
    startY: currentY + 5,
    body: paymentData,
    theme: 'striped',
    styles: { fontSize: 10 },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 100 } // Keep it compact
  });

  // --- Discipline / Yellow Cards ---
  const ycCount = student.yellowCards?.length || 0;
  if (ycCount > 0) {
    currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${t.discipline} (${ycCount})`, 20, currentY);
    
    const ycData = student.yellowCards!.map((card, i) => [
      `#${i+1}`,
      format(card.date, dateFormat),
      card.reason
    ]);

    doc.autoTable({
      startY: currentY + 5,
      head: [['#', t.date as string, t.reason as string]],
      body: ycData,
      theme: 'grid',
      headStyles: { fillColor: [255, 200, 200], textColor: 0 },
      styles: { fontSize: 9 }
    });
    doc.setTextColor(0, 0, 0);
  }

  // --- Footer ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('BALI JAPAN DREAM - Student Management System', 105, 285, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: 'right' });
  }

  doc.save(`Report_${student.fullName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
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
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}
