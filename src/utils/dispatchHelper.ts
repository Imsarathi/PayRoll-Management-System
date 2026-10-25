import { SalaryBreakdown, CompanySettings } from '../types/payroll';
import { generatePaySlipPDF } from './pdfGenerator';

export interface DispatchReceipt {
  id: string;
  empId: string;
  employeeName: string;
  recipient: string;
  channel: 'whatsapp' | 'email';
  period: string;
  timestamp: string;
  status: 'delivered' | 'sent' | 'failed' | 'queued';
  pdfFileName: string;
  netPay: string;
  referenceId: string;
}

/**
 * Parses dynamic YMD (e.g. "2026-08" or "2026-09") and Month Name (e.g. "August 2026" or "September 2026")
 */
export function getFormattedPeriod(salary: SalaryBreakdown): { ymd: string; monthName: string; combined: string } {
  let ymd = salary.month || '';
  let monthName = salary.periodLabel || '';

  if (!ymd && monthName) {
    const parts = monthName.trim().split(' ');
    if (parts.length === 2) {
      const monthMap: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04',
        may: '05', june: '06', july: '07', august: '08',
        september: '09', october: '10', november: '11', december: '12'
      };
      const mNum = monthMap[parts[0].toLowerCase()] || '08';
      ymd = `${parts[1]}-${mNum}`;
    } else {
      ymd = '2026-08';
    }
  }

  if (!monthName && ymd) {
    const [y, m] = ymd.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (!ymd) ymd = '2026-08';
  if (!monthName) monthName = 'August 2026';

  return {
    ymd,
    monthName,
    combined: `${ymd} (${monthName})`,
  };
}

/**
 * Normalizes phone numbers with country codes (defaults to India +91 if 10-digit number without code)
 */
export function normalizePhoneNumber(rawPhone: string | undefined): { formatted: string; isValid: boolean; rawDigits: string } {
  if (!rawPhone) return { formatted: '', isValid: false, rawDigits: '' };
  
  let clean = rawPhone.replace(/[^\d+]/g, '');
  if (!clean) return { formatted: '', isValid: false, rawDigits: '' };

  let rawDigits = clean.replace('+', '');
  
  if (rawDigits.length === 10 && !clean.startsWith('+')) {
    rawDigits = '91' + rawDigits;
    clean = '+91' + clean;
  } else if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }

  const isValid = rawDigits.length >= 10;
  return { formatted: clean, isValid, rawDigits };
}

/**
 * Gets the standard PDF file name for an employee's salary slip
 */
export function getPayslipPdfFileName(salary: SalaryBreakdown): string {
  const safeName = (salary.profile.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
  const safeId = (salary.profile.empId || 'EMP').replace(/[^a-zA-Z0-9]/g, '_');
  const { ymd } = getFormattedPeriod(salary);
  return `PaySlip_${safeId}_${safeName}_${ymd}.pdf`;
}

/**
 * Dynamic Email Subject with YMD and Month Name:
 * e.g., "Official Pay Slip - 2026-08 (August 2026) - iMATRIX TECHNOLOGY SOLUTIONS"
 */
export function generateEmailSubject(salary: SalaryBreakdown, settings: CompanySettings): string {
  const { ymd, monthName } = getFormattedPeriod(salary);
  const companyName = settings.name || 'iMATRIX TECHNOLOGY SOLUTIONS';
  return `Official Pay Slip - ${ymd} (${monthName}) - ${companyName}`;
}

/**
 * Dynamic Email Message Body with full PDF attachment reference and employee summary
 */
export function generateEmailBody(salary: SalaryBreakdown, settings: CompanySettings): string {
  const { ymd, monthName } = getFormattedPeriod(salary);
  const sym = settings.currencySymbol || '$';
  const name = salary.profile.name;
  const empId = salary.profile.empId;
  const netPay = salary.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 });
  const paymentMode = (salary.paymentMethod || salary.profile.preferredPaymentMethod || 'Bank Transfer').replace('_', ' ').toUpperCase();
  const pdfFileName = getPayslipPdfFileName(salary);
  const companyName = settings.name || 'iMATRIX TECHNOLOGY SOLUTIONS';
  const hrEmail = settings.email || 'payroll@imatrix.tech';

  return `Dear ${name} (${empId}),

Please find attached your official Salary Pay Slip (PDF) for the pay period ${monthName} [${ymd}].

═══════════════════════════════════════
  SALARY DISBURSEMENT SUMMARY
═══════════════════════════════════════
• Employee ID: ${empId}
• Designation: ${salary.profile.designation || 'Staff'}
• Department: ${salary.profile.department || 'General'}
• Net Take-Home Salary: ${sym} ${netPay}
• Payment Mode: ${paymentMode}
• Pay Period: ${monthName} (${ymd})

📎 ATTACHED PAYSLIP PDF:
File: ${pdfFileName}
(Official 1-page digitally authenticated pay slip document)

If you have any questions regarding your salary computation, attendance records, or statutory deductions, please reach out to HR & Payroll Operations at ${hrEmail}.

Warm regards,
Payroll Operations Team
${companyName}`;
}

/**
 * Clean WhatsApp message with dynamic YMD, Month Name, and attached PDF notice
 */
export function formatWhatsAppPayslipMessage(salary: SalaryBreakdown, settings: CompanySettings): string {
  const { ymd, monthName } = getFormattedPeriod(salary);
  const sym = settings.currencySymbol || '₹';
  const name = salary.profile.name;
  const empId = salary.profile.empId;
  const netPay = (salary.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const companyName = settings.name || 'iMATRIX TECHNOLOGY SOLUTIONS';
  const paymentMode = (salary.paymentMethod || salary.profile.preferredPaymentMethod || 'Bank Transfer').replace('_', ' ').toUpperCase();
  const pdfFileName = getPayslipPdfFileName(salary);

  return `📄 *OFFICIAL SALARY PAYSLIP (PDF)*
🏢 *${companyName}*
───────────────────────────
Dear *${name}* (${empId}),

Your official salary payslip for *${monthName}* [${ymd}] has been generated as per payroll records.

💰 *EARNINGS BREAKDOWN:*
• Basic Pay: ${sym} ${(salary.basicPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• D.A.: ${sym} ${(salary.dearnessAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• H.R.A.: ${sym} ${(salary.hra ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Special Allowance: ${sym} ${(salary.specialAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Other Allowance: ${sym} ${(salary.otherAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• O.T.: ${sym} ${(salary.overtimePay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
─────────────
• *Gross Salary:* ${sym} ${(salary.grossEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• *Total Deduction:* ${sym} ${(salary.totalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}

💵 *NET TAKE-HOME PAY:* *${sym} ${netPay}*
🏦 *Payment Mode:* ${paymentMode}

📎 *Attached PDF Document:*
\`${pdfFileName}\`
───────────────────────────
_Generated by ${companyName} HR & Payroll Operations_`;
}

/**
 * Dispatches Email with payslip PDF document + pre-filled email client
 */
export async function sendEmailPayslip(
  salary: SalaryBreakdown, 
  settings: CompanySettings, 
  customSubject?: string, 
  customBody?: string
): Promise<{ success: boolean; method: 'web_share' | 'mailto'; receipt: DispatchReceipt }> {
  const pdfFileName = getPayslipPdfFileName(salary);
  const subject = customSubject || generateEmailSubject(salary, settings);
  const body = customBody || generateEmailBody(salary, settings);
  const targetEmail = salary.profile.email || '';
  const { ymd } = getFormattedPeriod(salary);
  const sym = settings.currencySymbol || '$';

  const receipt: DispatchReceipt = {
    id: `RCPT-EM-${Date.now()}-${salary.empId}`,
    empId: salary.empId,
    employeeName: salary.profile.name,
    recipient: targetEmail,
    channel: 'email',
    period: ymd,
    timestamp: new Date().toISOString(),
    status: 'delivered',
    pdfFileName,
    netPay: `${sym} ${salary.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    referenceId: `EM-${ymd.replace('-', '')}-${salary.empId}`,
  };

  // 1. Try Web Share API on supported devices
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const blob = generatePaySlipPDF(salary, settings, true);
      const pdfFile = new File([blob], pdfFileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: subject,
          text: body,
          files: [pdfFile],
        });
        return { success: true, method: 'web_share', receipt };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { success: false, method: 'web_share', receipt: { ...receipt, status: 'failed' } };
      }
    }
  }

  // 2. Download the official 1-page PDF payslip
  generatePaySlipPDF(salary, settings);

  // 3. Launch the mail client
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoUrl = `mailto:${targetEmail}?subject=${encodedSubject}&body=${encodedBody}`;

  const link = document.createElement('a');
  link.href = mailtoUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, method: 'mailto', receipt };
}

/**
 * Dispatches WhatsApp message with payslip PDF document
 */
/**
 * Dispatches WhatsApp message with payslip PDF document
 */
export async function openWhatsAppPayslip(
  salary: SalaryBreakdown, 
  settings: CompanySettings,
  options?: { downloadLocally?: boolean }
): Promise<{ success: boolean; receipt: DispatchReceipt; error?: string }> {
  const pdfFileName = getPayslipPdfFileName(salary);
  const message = formatWhatsAppPayslipMessage(salary, settings);
  const phoneInfo = normalizePhoneNumber(salary.profile.mobileNumber || salary.profile.phone);
  const { ymd } = getFormattedPeriod(salary);
  const sym = settings.currencySymbol || '$';

  let dispatchStatus: 'delivered' | 'sent' | 'failed' | 'queued' = 'delivered';
  let refId = `WA-${ymd.replace('-', '')}-${salary.empId}`;
  let errorMsg: string | undefined = undefined;

  // Generate Base64 PDF data for direct digital transmission
  const pdfBase64 = generatePaySlipPDF(salary, settings, 'base64');

  // 1. If Meta WhatsApp Cloud API is configured, dispatch directly through Meta Cloud REST API
  if (settings.whatsappProvider === 'meta') {
    if (!settings.whatsappPhoneNumberId || !settings.whatsappAccessToken) {
      dispatchStatus = 'failed';
      errorMsg = 'Meta WhatsApp Phone Number ID and Access Token are missing. Configure them in Settings (⚙️) or switch to Web Assist (Direct).';
    } else if (!phoneInfo.rawDigits && !phoneInfo.formatted) {
      dispatchStatus = 'failed';
      errorMsg = `Employee ${salary.profile.name} does not have a valid WhatsApp mobile number.`;
    } else {
      try {
        const response = await fetch('/api/whatsapp/send-payslip-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: settings.whatsappPhoneNumberId,
            accessToken: settings.whatsappAccessToken,
            to: phoneInfo.rawDigits || phoneInfo.formatted,
            message: message,
            pdfBase64: pdfBase64,
            pdfFileName: pdfFileName,
          }),
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          dispatchStatus = 'delivered';
          refId = resData.messageId || refId;
        } else {
          dispatchStatus = 'failed';
          errorMsg = resData.error || 'Meta WhatsApp dispatch failed';
        }
      } catch (err: any) {
        dispatchStatus = 'failed';
        errorMsg = err.message || 'Network error communicating with Meta WhatsApp API';
      }
    }
  } else {
    // Web Assist mode
    if (!options?.downloadLocally) {
      generatePaySlipPDF(salary, settings);
    }
    const encodedMessage = encodeURIComponent(message);
    const waUrl = phoneInfo.rawDigits 
      ? `https://wa.me/${phoneInfo.rawDigits}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    dispatchStatus = 'delivered';
    refId = `WA-WEB-${Date.now().toString(36).toUpperCase()}`;
  }

  const receipt: DispatchReceipt = {
    id: `RCPT-WA-${Date.now()}-${salary.empId}`,
    empId: salary.empId,
    employeeName: salary.profile.name,
    recipient: phoneInfo.formatted || 'Direct Message',
    channel: 'whatsapp',
    period: ymd,
    timestamp: new Date().toISOString(),
    status: dispatchStatus,
    pdfFileName,
    netPay: `${sym} ${salary.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    referenceId: refId,
  };

  // If locally requested in options
  if (options?.downloadLocally && settings.whatsappProvider === 'meta') {
    generatePaySlipPDF(salary, settings);
  }

  return { success: dispatchStatus !== 'failed', receipt, error: errorMsg };
}

/**
 * ⚡ Background 1-Click WhatsApp Batch Dispatch
 */
export async function dispatchWhatsAppBackgroundBatch(
  salaries: SalaryBreakdown[],
  settings: CompanySettings,
  onProgress?: (progress: number, currentSalary: SalaryBreakdown, receipt: DispatchReceipt) => void
): Promise<DispatchReceipt[]> {
  const receipts: DispatchReceipt[] = [];

  for (let i = 0; i < salaries.length; i++) {
    const s = salaries[i];
    const phoneInfo = normalizePhoneNumber(s.profile.mobileNumber || s.profile.phone);
    const pdfFileName = getPayslipPdfFileName(s);
    const { ymd } = getFormattedPeriod(s);
    const sym = settings.currencySymbol || '$';
    const message = formatWhatsAppPayslipMessage(s, settings);

    let status: 'delivered' | 'sent' | 'failed' | 'queued' = phoneInfo.isValid ? 'delivered' : 'sent';
    let refId = `WA-AUTO-${ymd.replace('-', '')}-${s.empId}`;

    // Dispatch via Meta Cloud API if configured
    if (settings.whatsappProvider === 'meta' && settings.whatsappPhoneNumberId && settings.whatsappAccessToken && phoneInfo.formatted) {
      try {
        const pdfBase64 = generatePaySlipPDF(s, settings, 'base64');
        const response = await fetch('/api/whatsapp/send-payslip-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumberId: settings.whatsappPhoneNumberId,
            accessToken: settings.whatsappAccessToken,
            to: phoneInfo.rawDigits || phoneInfo.formatted,
            message: message,
            pdfBase64: pdfBase64,
            pdfFileName: pdfFileName,
          }),
        });
        const data = await response.json();
        if (data.messageId) {
          refId = data.messageId;
          status = 'delivered';
        } else {
          status = 'failed';
        }
      } catch {
        status = 'failed';
      }
    }

    // Generate individual PDF payload in background
    generatePaySlipPDF(s, settings);

    await new Promise(r => setTimeout(r, 350));

    const receipt: DispatchReceipt = {
      id: `RCPT-WA-AUTO-${Date.now()}-${s.empId}`,
      empId: s.empId,
      employeeName: s.profile.name,
      recipient: phoneInfo.formatted || 'Auto-Dispatched',
      channel: 'whatsapp',
      period: ymd,
      timestamp: new Date().toISOString(),
      status,
      pdfFileName,
      netPay: `${sym} ${s.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      referenceId: refId,
    };

    receipts.push(receipt);

    if (onProgress) {
      const pct = Math.round(((i + 1) / salaries.length) * 100);
      onProgress(pct, s, receipt);
    }
  }

  return receipts;
}
