import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Send, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Coins, 
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  FileCheck,
  Award,
  MessageCircle,
  Check
} from 'lucide-react';
import { SalaryBreakdown, CompanySettings, PaymentMethod } from '../types/payroll';
import { generatePaySlipPDF } from '../utils/pdfGenerator';
import { openWhatsAppPayslip, getPayslipPdfFileName } from '../utils/whatsappHelper';

interface PaySlipModalProps {
  isOpen: boolean;
  salary: SalaryBreakdown | null;
  settings: CompanySettings;
  onClose: () => void;
  onSendEmail?: (salary: SalaryBreakdown) => void;
}

export const PaySlipModal: React.FC<PaySlipModalProps> = ({
  isOpen,
  salary,
  settings,
  onClose,
  onSendEmail,
}) => {
  const [waNotification, setWaNotification] = useState<string | null>(null);

  if (!isOpen || !salary) return null;

  const sym = settings.currencySymbol || '$';
  const paymentMethod: PaymentMethod = salary.paymentMethod || salary.profile.preferredPaymentMethod || 'bank_transfer';
  const isCash = paymentMethod === 'cash';
  const isUpi = paymentMethod === 'upi';
  const isCheque = paymentMethod === 'cheque';
  const isBank = paymentMethod === 'bank_transfer';

  const voucherRef = salary.paymentReference || (
    isCash 
      ? `CASH-VCHR-${salary.periodLabel.replace(/\s+/g, '')}-${salary.profile.empId}`
      : isUpi
      ? `UPI-${salary.profile.empId.toLowerCase()}@pay`
      : isCheque
      ? `CHQ-98402-${salary.profile.empId}`
      : `ACH-TRF-90281-${salary.profile.empId}`
  );

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'cash': return 'PAID BY CASH (Physical Treasury Voucher)';
      case 'upi': return 'UPI / Instant Mobile Payment';
      case 'cheque': return 'Cheque / Draft Issue';
      default: return 'Direct Bank Transfer (ACH / NEFT)';
    }
  };

  const getStatusBadge = () => {
    switch (salary.status) {
      case 'approved':
        return { label: '✔ APPROVED', bg: 'bg-emerald-600 text-white border-emerald-700' };
      default:
        return { label: '⏳ REVIEW PENDING', bg: 'bg-amber-600 text-white border-amber-700' };
    }
  };

  const statusBadge = getStatusBadge();

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = async () => {
    const pdfName = getPayslipPdfFileName(salary);
    await openWhatsAppPayslip(salary, settings);
    setWaNotification(`PDF downloaded: ${pdfName}. In WhatsApp, attach the downloaded PDF to send!`);
    setTimeout(() => {
      setWaNotification(null);
    }, 6000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Action Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold tracking-tight">Verified Employee Pay Slip & Payment Advice</span>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
              {salary.periodLabel}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
              title="Share payslip summary & download official PDF via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print</span>
            </button>

            <button
              onClick={() => generatePaySlipPDF(salary, settings)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
              title="Download official PDF copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp/PDF Notification Toast */}
        {waNotification && (
          <div className="bg-emerald-700 text-white text-xs px-6 py-2.5 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span><strong>Official PDF Downloaded:</strong> In WhatsApp chat, click the attachment icon (📎) to send the downloaded file to the employee.</span>
            </div>
            <button 
              onClick={() => setWaNotification(null)}
              className="text-emerald-200 hover:text-white ml-3 text-[11px] font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Printable Pay Slip Content Container */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/40 print:p-0 print:bg-white text-slate-800 text-xs space-y-5" id="printable-payslip">
          
          {/* Main Paper Frame */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-5">
            
            {/* 1. Header: Company Brand & Pay Slip Title */}
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  {settings.logoUrl ? (
                    <img 
                      src={settings.logoUrl} 
                      alt="Company Logo" 
                      className="w-11 h-11 rounded-xl object-contain bg-white border border-slate-200/90 p-1 shadow-2xs"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      <Building2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                      {settings.name}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {settings.appTitle || 'Corporate Enterprise Payroll Services'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 max-w-md leading-relaxed">
                  {settings.address}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Email: {settings.email} • Tel: {settings.phone}
                </p>
              </div>

              <div className="text-right sm:self-center space-y-1.5">
                <div className="inline-block bg-blue-900 text-white font-bold text-xs px-3 py-1 rounded tracking-wider">
                  PAYSLIP FOR {salary.periodLabel.toUpperCase()}
                </div>
                
                <div className="flex items-center justify-end space-x-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.bg}`}>
                    {statusBadge.label}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 font-medium">
                  Ref ID: {salary.id}
                </div>
              </div>
            </div>

            {/* 2. Employee Demographic Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-md border border-slate-200">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Employee ID</div>
                <div className="text-xs font-extrabold text-slate-900 mt-0.5">{salary.profile.empId}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Employee Name</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">{salary.profile.name}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Department</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">{salary.profile.department}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Designation</div>
                <div className="text-xs text-slate-800 mt-0.5">{salary.profile.designation}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Date of Joining</div>
                <div className="text-xs text-slate-800 mt-0.5">{salary.profile.joinDate || 'N/A'}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Base Monthly Salary</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {sym} {((salary.profile.baseSalary || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* 3. Total Present Count Banner (Strictly Total Present Count Only) */}
            <div className="bg-slate-50 rounded-md px-4 py-2.5 border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Attendance:</span>
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Total Present Count:</span>
                <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold px-3 py-0.5 rounded text-xs">
                  {salary.attendance.daysPresent} Days
                </span>
              </div>
            </div>

            {/* 4. Dual Table: Earnings vs Deductions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Earnings Table */}
              <div className="border border-slate-200 rounded-md overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-blue-900 text-white font-bold px-3.5 py-2 flex items-center justify-between text-xs">
                    <span>EARNINGS COMPONENT</span>
                    <span>AMOUNT ({sym})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">Basic Salary</span>
                      <span className="font-semibold text-slate-900">{(salary.basicPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">House Rent Allowance (HRA)</span>
                      <span className="font-semibold text-slate-900">{(salary.hra ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">Dearness Allowance (D.A.)</span>
                      <span className="font-semibold text-slate-900">{(salary.dearnessAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">Special Allowance</span>
                      <span className="font-semibold text-slate-900">{(salary.specialAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {(salary.otherAllowance !== undefined && salary.otherAllowance > 0) && (
                      <div className="px-3.5 py-2 flex justify-between">
                        <span className="text-slate-600 font-medium">Other Allowance</span>
                        <span className="font-semibold text-slate-900">{(salary.otherAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">Overtime Pay (O.T.)</span>
                      <span className="font-semibold text-purple-700">+{(salary.overtimePay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {((salary.performanceBonus || 0) + (salary.reimbursements || 0) + (salary.holidayWorkPay || 0)) > 0 && (
                      <div className="px-3.5 py-2 flex justify-between">
                        <span className="text-slate-600 font-medium">Incentive & Bonus</span>
                        <span className="font-semibold text-emerald-700">+{((salary.performanceBonus || 0) + (salary.reimbursements || 0) + (salary.holidayWorkPay || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-3.5 py-2.5 bg-blue-50/70 font-bold flex justify-between text-blue-950 border-t border-blue-100">
                  <span>TOTAL GROSS EARNINGS</span>
                  <span>{sym} {(salary.grossEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="border border-slate-200 rounded-md overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-rose-900 text-white font-bold px-3.5 py-2 flex items-center justify-between text-xs">
                    <span>DEDUCTIONS COMPONENT</span>
                    <span>AMOUNT ({sym})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {salary.providentFund > 0 && (
                      <div className="px-3.5 py-2 flex justify-between">
                        <span className="text-slate-600 font-medium">Provident Fund (PF)</span>
                        <span className="font-semibold text-slate-900">{(salary.providentFund ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {salary.professionalTax > 0 && (
                      <div className="px-3.5 py-2 flex justify-between">
                        <span className="text-slate-600 font-medium">Professional Tax (PT)</span>
                        <span className="font-semibold text-slate-900">{(salary.professionalTax ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">Loan / Advance</span>
                      <span className="font-semibold text-slate-900">{(salary.loanAdvance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="px-3.5 py-2 flex justify-between">
                      <span className="text-slate-600 font-medium">Other Deductions</span>
                      <span className="font-semibold text-slate-900">{(salary.otherDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                <div className="px-3.5 py-2.5 bg-rose-50/70 font-bold flex justify-between text-rose-950 border-t border-rose-100">
                  <span>TOTAL DEDUCTIONS</span>
                  <span>{sym} {(salary.totalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

            </div>

            {/* 5. Salary Paid / To Pay Highlight Banner Box */}
            <div className={`border-2 rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs ${
              salary.status === 'disbursed' ? 'bg-emerald-50 border-emerald-500/80' : 'bg-blue-50/90 border-blue-500/80'
            }`}>
              <div>
                <div className="flex items-center space-x-2">
                  <div className={`text-xs uppercase font-extrabold tracking-wider ${salary.status === 'disbursed' ? 'text-emerald-900' : 'text-blue-900'}`}>
                    {salary.status === 'disbursed' ? 'Salary Paid:' : 'Salary to Pay:'}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    salary.status === 'disbursed' ? 'bg-emerald-200 text-emerald-900' : 'bg-blue-200 text-blue-900'
                  }`}>
                    {getPaymentMethodLabel()}
                  </span>
                </div>
                <div className={`text-xs italic font-medium mt-1 ${salary.status === 'disbursed' ? 'text-emerald-800' : 'text-blue-800'}`}>
                  Amount in words: <strong className="font-semibold">{salary.netPayInWords}</strong>
                </div>
              </div>

              <div className="text-right">
                <div className={`text-2xl font-black tracking-tight ${salary.status === 'disbursed' ? 'text-emerald-700' : 'text-blue-800'}`}>
                  {sym} {(salary.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-[10px] font-medium ${salary.status === 'disbursed' ? 'text-emerald-800' : 'text-blue-800'}`}>
                  {isCash 
                    ? `Physical Cash Voucher Ref: ${voucherRef}` 
                    : isUpi 
                    ? `UPI Settlement Ref: ${voucherRef}`
                    : `Direct Bank Deposit to ${salary.profile?.bankName || 'Bank'}`
                  }
                </div>
              </div>
            </div>

            {/* 6. Cash Acknowledgment Receipt / Bank Settlement Note */}
            {isCash && (
              <div className="bg-amber-50/60 border border-amber-300 rounded-md p-3 text-[11px] text-amber-950 space-y-2">
                <div className="font-bold flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-700" />
                  <span>CASH DISBURSEMENT RECEIPT & HANDOVER ACKNOWLEDGMENT</span>
                </div>
                <p className="text-[10px] text-amber-900 leading-relaxed">
                  I hereby acknowledge the receipt of net salary of <strong>{sym} {(salary.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> in physical currency / cash from <strong>{settings.name}</strong> for the pay period of {salary.periodLabel}.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-200/80 text-[10px]">
                  <div>
                    <span className="text-amber-800 font-semibold block">Disbursed by Cashier / Treasury:</span>
                    <span className="text-slate-900 font-bold">{settings.companySignatoryName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-800 font-semibold block">Employee Signature / Fingerprint:</span>
                    <span className="italic text-slate-700">___________________________ ({salary.profile.name})</span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Signatory & Digital Compliance Seal */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
              <div>
                <p>* Employer PF Contribution: {sym} {(salary.employerPF ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Retirement benefits / not deducted from gross)</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  System Generated Electronic Pay Advice • Digitally authenticated under Payroll Compliance Act
                </p>
                {settings.showDigitalSignature !== false && (
                  <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-300 rounded text-[10px] text-emerald-800 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Digitally Certified & Authenticated by {settings.companySignatoryName}</span>
                  </div>
                )}
              </div>

              <div className="text-center sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 flex flex-col items-center sm:items-end">
                {/* Render Signature */}
                {settings.signatureUrl && settings.showDigitalSignature !== false ? (
                  <div className="mb-1">
                    <img 
                      src={settings.signatureUrl} 
                      alt="Digital Signature" 
                      className="h-10 max-w-[140px] object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : settings.showDigitalSignature !== false ? (
                  <div className="font-serif italic text-blue-900 text-base mb-1 tracking-wide">
                    {settings.companySignatoryName}
                  </div>
                ) : null}

                <div className="border-t border-slate-300 pt-1 w-44 text-center">
                  <div className="font-bold text-slate-900">{settings.companySignatoryName}</div>
                  <div className="text-[10px] text-slate-500">{settings.companySignatoryTitle}</div>
                  <div className="text-[10px] text-slate-400">{settings.name}</div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
