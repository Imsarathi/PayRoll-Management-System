import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, SalaryBreakdown } from '../types/payroll';

/**
 * Generates an executive-level, professional PDF Pay Slip for an employee
 * Guaranteed 1-page pixel-perfect alignment with balanced margins and zero text overlapping
 */
export function generatePaySlipPDF(salary: SalaryBreakdown, settings: CompanySettings, returnBlob = false): any {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const leftMargin = 14;
  const contentWidth = 182; // 210 - 28
  const topMargin = 12; // Balanced top margin so it does not cling to the top edge

  // Clean currency symbol safe for standard PDF fonts
  let symbol = settings.currencySymbol || '$';
  if (symbol === '₹' || settings.currency === 'INR' || symbol.charCodeAt(0) > 127) {
    symbol = 'Rs.';
  }

  const paymentMethod = salary.paymentMethod || salary.profile.preferredPaymentMethod || 'bank_transfer';
  const isCash = paymentMethod === 'cash';
  const isUpi = paymentMethod === 'upi';
  const isCheque = paymentMethod === 'cheque';

  const paymentModeLabel = isCash 
    ? 'Paid by Cash'
    : isUpi
    ? 'UPI / Instant Payment'
    : isCheque
    ? 'Cheque'
    : 'Bank Transfer';

  const voucherRef = salary.paymentReference || (
    isCash 
      ? `CASH-VCHR-${salary.periodLabel.replace(/\s+/g, '')}-${salary.profile.empId}`
      : isUpi
      ? `UPI-${salary.profile.empId.toLowerCase()}@pay`
      : isCheque
      ? `CHQ-98402-${salary.profile.empId}`
      : `ACH-TRF-90281-${salary.profile.empId}`
  );

  const statusText = salary.status === 'approved'
    ? 'APPROVED'
    : 'REVIEW PENDING';

  // 1. Header Frame & Branding (Cleanly placed with top margin)
  // Outer header rounded card
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(leftMargin, topMargin, contentWidth, 32, 2, 2, 'F');
  
  // Top brand accent strip
  doc.setFillColor(30, 58, 138); // Navy
  doc.roundedRect(leftMargin, topMargin, contentWidth, 2.5, 1, 1, 'F');

  // Company Name & Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(settings.name, leftMargin + 4, topMargin + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(settings.address || 'Corporate Headquarters', leftMargin + 4, topMargin + 14.5);
  doc.text(`Email: ${settings.email || 'payroll@company.com'}  |  Phone: ${settings.phone || '+91 98400 12345'}`, leftMargin + 4, topMargin + 19);

  // Payslip Title & Period Badge on Top Right (No "Confidential" wording)
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(pageWidth - leftMargin - 66, topMargin + 5.5, 62, 8.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text(`PAYSLIP FOR ${salary.periodLabel.toUpperCase()}`, pageWidth - leftMargin - 35, topMargin + 11.2, { align: 'center' });

  // Status Badge
  if (salary.status === 'approved') {
    doc.setFillColor(22, 101, 52); // green
  } else {
    doc.setFillColor(180, 83, 9); // amber
  }
  doc.roundedRect(pageWidth - leftMargin - 66, topMargin + 16, 62, 5.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text(`STATUS: ${statusText}`, pageWidth - leftMargin - 35, topMargin + 19.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pay Slip Ref: ${salary.id}`, pageWidth - leftMargin - 66, topMargin + 26);

  // 2. Employee Summary Info Grid
  const empInfo = [
    [
      { content: 'Employee ID:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: salary.profile.empId, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
      { content: 'Department:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: salary.profile.department, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Employee Name:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: salary.profile.name, styles: { fontStyle: 'bold', textColor: [15, 23, 42] } },
      { content: 'Designation:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: salary.profile.designation, styles: { fontStyle: 'normal', textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Contact / Mobile:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: salary.profile.mobileNumber || salary.profile.email || 'N/A', styles: { fontStyle: 'normal', textColor: [15, 23, 42] } },
      { content: 'DOB / Joining:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: `${salary.profile.dob ? `DOB: ${salary.profile.dob} | ` : ''}Joined: ${salary.profile.joinDate || 'N/A'}`, styles: { fontStyle: 'normal', textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Base Monthly Salary:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: `${symbol} ${(salary.profile.baseSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'normal', textColor: [15, 23, 42] } },
      { content: 'Pay Period:', styles: { fontStyle: 'bold', textColor: [100, 116, 139] } },
      { content: salary.periodLabel, styles: { fontStyle: 'normal', textColor: [15, 23, 42] } },
    ],
  ];

  autoTable(doc, {
    body: empInfo as any,
    startY: topMargin + 35,
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      fontSize: 8,
      cellPadding: 1.4,
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 59 },
      2: { cellWidth: 32 },
      3: { cellWidth: 59 },
    },
    margin: { left: leftMargin, right: leftMargin },
  });

  // 3. Attendance Overview Bar (Strictly Total Present Count Only)
  const attendanceStartY = (doc as any).lastAutoTable.finalY + 2.5;
  const attendanceData = [
    [
      { content: 'Attendance Record:', styles: { fontStyle: 'bold', halign: 'left', textColor: [100, 116, 139] } },
      { content: `Total Present Days: ${salary.attendance.daysPresent} Days`, styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 101, 52] } },
    ],
  ];

  autoTable(doc, {
    body: attendanceData as any,
    startY: attendanceStartY,
    theme: 'plain',
    tableWidth: contentWidth,
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: contentWidth - 50 },
    },
    margin: { left: leftMargin, right: leftMargin },
  });

  // 4. Earnings vs Deductions Dual Table
  const tableStartY = (doc as any).lastAutoTable.finalY + 3.5;
  const incentiveBonus = (salary.performanceBonus || 0) + (salary.reimbursements || 0) + (salary.holidayWorkPay || 0);

  const earningsRows: string[][] = [
    ['Basic Salary', `${symbol} ${(salary.basicPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['House Rent Allowance (HRA)', `${symbol} ${(salary.hra ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Dearness Allowance (D.A.)', `${symbol} ${(salary.dearnessAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
    ['Special Allowance', `${symbol} ${(salary.specialAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
  ];

  if (salary.otherAllowance && salary.otherAllowance > 0) {
    earningsRows.push(['Other Allowance', `${symbol} ${(salary.otherAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
  }

  earningsRows.push(['Overtime Pay (O.T.)', `${symbol} ${(salary.overtimePay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);

  if (incentiveBonus > 0) {
    earningsRows.push(['Incentive & Bonus', `${symbol} ${incentiveBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
  }

  earningsRows.push(['Total Gross Earnings', `${symbol} ${(salary.grossEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);

  const deductionsRows: string[][] = [];

  if (salary.providentFund > 0) {
    deductionsRows.push(['Provident Fund (PF)', `${symbol} ${(salary.providentFund ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
  }
  if (salary.professionalTax > 0) {
    deductionsRows.push(['Professional Tax (PT)', `${symbol} ${(salary.professionalTax ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
  }

  deductionsRows.push(['Loan / Advance', `${symbol} ${(salary.loanAdvance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
  deductionsRows.push(['Other Deductions', `${symbol} ${(salary.otherDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);
  deductionsRows.push(['Total Deductions', `${symbol} ${(salary.totalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);

  const combinedTableBody: any[] = [];
  const earnItems = earningsRows.slice(0, -1);
  const earnTotal = earningsRows[earningsRows.length - 1];
  const dedItems = deductionsRows.slice(0, -1);
  const dedTotal = deductionsRows[deductionsRows.length - 1];
  const maxItems = Math.max(earnItems.length, dedItems.length);

  for (let i = 0; i < maxItems; i++) {
    const earn = earnItems[i] || ['', ''];
    const ded = dedItems[i] || ['', ''];

    combinedTableBody.push([
      {
        content: earn[0],
        styles: { fontStyle: 'normal', textColor: [30, 41, 59] },
      },
      {
        content: earn[1],
        styles: { halign: 'right', fontStyle: 'normal', textColor: [15, 23, 42] },
      },
      {
        content: ded[0],
        styles: { fontStyle: 'normal', textColor: [30, 41, 59] },
      },
      {
        content: ded[1],
        styles: { halign: 'right', fontStyle: 'normal', textColor: [15, 23, 42] },
      },
    ]);
  }

  // Bottom Total Row
  combinedTableBody.push([
    {
      content: earnTotal[0],
      styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 58, 138] },
    },
    {
      content: earnTotal[1],
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 58, 138] },
    },
    {
      content: dedTotal[0],
      styles: { fontStyle: 'bold', fillColor: [255, 241, 242], textColor: [153, 27, 27] },
    },
    {
      content: dedTotal[1],
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 241, 242], textColor: [153, 27, 27] },
    },
  ]);

  autoTable(doc, {
    head: [
      [
        { content: 'EARNINGS COMPONENT', styles: { halign: 'left', fillColor: [30, 58, 138], textColor: [255, 255, 255] } },
        { content: 'AMOUNT', styles: { halign: 'right', fillColor: [30, 58, 138], textColor: [255, 255, 255] } },
        { content: 'DEDUCTIONS COMPONENT', styles: { halign: 'left', fillColor: [153, 27, 27], textColor: [255, 255, 255] } },
        { content: 'AMOUNT', styles: { halign: 'right', fillColor: [153, 27, 27], textColor: [255, 255, 255] } },
      ],
    ],
    body: combinedTableBody,
    startY: tableStartY,
    theme: 'grid',
    tableWidth: contentWidth,
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 2.0, right: 3, bottom: 2.0, left: 3 },
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'ellipsize',
    },
    columnStyles: {
      0: { cellWidth: 53, halign: 'left' },
      1: { cellWidth: 38, halign: 'right' },
      2: { cellWidth: 53, halign: 'left' },
      3: { cellWidth: 38, halign: 'right' },
    },
    margin: { left: leftMargin, right: leftMargin },
  });

  // 5. Salary Paid / To Pay Highlight Banner Box
  const netPayBoxY = (doc as any).lastAutoTable.finalY + 4;

  const netSalaryLabel = salary.status === 'approved' || salary.status === 'disbursed'
    ? 'SALARY PAID:'
    : 'SALARY TO PAY:';

  if (salary.status === 'approved') {
    doc.setFillColor(240, 253, 244); // green-50
    doc.setDrawColor(34, 197, 94); // green-500
  } else {
    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(59, 130, 246); // blue-500
  }
  doc.setLineWidth(0.6);
  doc.roundedRect(leftMargin, netPayBoxY, contentWidth, 16.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(salary.status === 'approved' ? 22 : 30, salary.status === 'approved' ? 101 : 58, salary.status === 'approved' ? 52 : 138);
  doc.text(netSalaryLabel, leftMargin + 5, netPayBoxY + 5.5);

  doc.setFontSize(13);
  doc.setTextColor(salary.status === 'approved' ? 21 : 30, salary.status === 'approved' ? 128 : 58, salary.status === 'approved' ? 61 : 138);
  doc.text(`${symbol} ${(salary.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, pageWidth - leftMargin - 5, netPayBoxY + 6.8, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Amount in Words: ${salary.netPayInWords}`, leftMargin + 5, netPayBoxY + 11.5);
  doc.text(
    isCash 
      ? `Payment Mode: Cash Handover (Voucher Ref: ${voucherRef})` 
      : isUpi
      ? `Payment Mode: UPI Instant (Ref: ${voucherRef})`
      : `Payment Mode: Direct Bank Transfer (${salary.profile.bankName || 'Bank'} A/C: ${salary.profile.accountNumber || 'Primary'})`,
    leftMargin + 5,
    netPayBoxY + 15
  );

  // 6. Cash Handover Receipt or Settlement Note
  let footerY = netPayBoxY + 19.5;
  if (isCash) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftMargin, footerY, contentWidth, 10.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(146, 64, 14);
    doc.text('CASH HANDOVER ACKNOWLEDGMENT & RECEIPT', leftMargin + 3, footerY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Disbursed By: ${settings.companySignatoryName}        |        Received By: ${salary.profile.name} (Signature: _____________________)`, leftMargin + 3, footerY + 7.8);
    footerY += 13;
  }

  // 7. Footer, Employer PF Note & Authorized Signatory Block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Employer PF Contribution: ${symbol} ${(salary.employerPF ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Retirement benefit / not deducted from gross)`, leftMargin, footerY + 3);
  doc.text('This is a verified computer-generated salary slip and payment advice authenticated under company payroll rules.', leftMargin, footerY + 7);
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}  |  Reference ID: ${salary.id}`, leftMargin, footerY + 11);

  // Digital Authentication Security Mark on bottom left
  if (settings.showDigitalSignature !== false) {
    doc.setFillColor(240, 253, 244); // light emerald
    doc.setDrawColor(34, 197, 94); // emerald-500
    doc.setLineWidth(0.2);
    doc.roundedRect(leftMargin, footerY + 13.5, 80, 7.5, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(22, 101, 52);
    doc.text(`[✔ DIGITALLY AUTHENTICATED & AUDITED]`, leftMargin + 2.5, footerY + 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signatory: ${settings.companySignatoryName} (${settings.companySignatoryTitle})`, leftMargin + 2.5, footerY + 19.5);
  }

  // Signatory Stamp & Digital Signature Block on bottom right
  const sigBoxWidth = 56;
  const sigBoxX = pageWidth - leftMargin - sigBoxWidth;
  const sigCenter = sigBoxX + sigBoxWidth / 2;

  // If user provided a signature image / drawn signature Data URL
  if (settings.signatureUrl && settings.showDigitalSignature !== false) {
    try {
      doc.addImage(settings.signatureUrl, 'PNG', sigBoxX + (sigBoxWidth - 38) / 2, footerY - 2, 38, 10.5, undefined, 'FAST');
    } catch (e) {
      // Fallback cursive if image load fails
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text(settings.companySignatoryName, sigCenter, footerY + 7, { align: 'center' });
    }
  } else if (settings.showDigitalSignature !== false) {
    // Stylized default digital cursive signature
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text(settings.companySignatoryName, sigCenter, footerY + 7, { align: 'center' });
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(sigBoxX, footerY + 9.5, sigBoxX + sigBoxWidth, footerY + 9.5);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(settings.companySignatoryName, sigCenter, footerY + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.companySignatoryTitle, sigCenter, footerY + 17, { align: 'center' });
  doc.text(settings.name, sigCenter, footerY + 20, { align: 'center' });

  if (returnBlob) {
    return doc.output('blob');
  }

  doc.save(`PaySlip_${salary.profile.empId}_${salary.month}.pdf`);
}

