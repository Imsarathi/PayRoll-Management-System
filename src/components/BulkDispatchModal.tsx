import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageCircle, 
  CheckCircle2, 
  Download, 
  ShieldCheck, 
  History, 
  Clock, 
  Play, 
  RotateCcw, 
  Settings, 
  Send, 
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  CheckSquare,
  Square,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { SalaryBreakdown, CompanySettings } from '../types/payroll';
import { 
  openWhatsAppPayslip, 
  formatWhatsAppPayslipMessage,
  getPayslipPdfFileName,
  getFormattedPeriod,
  normalizePhoneNumber,
  DispatchReceipt
} from '../utils/dispatchHelper';
import { generatePaySlipPDF } from '../utils/pdfGenerator';

interface BulkDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  salaries: SalaryBreakdown[];
  settings: CompanySettings;
  onOpenSettings?: () => void;
}

export const BulkDispatchModal: React.FC<BulkDispatchModalProps> = ({
  isOpen,
  onClose,
  salaries,
  settings,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'receipts'>('roster');
  const [activeProvider, setActiveProvider] = useState<'meta' | 'web_assist'>(
    settings.whatsappProvider === 'meta' ? 'meta' : 'web_assist'
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [sendingEmpId, setSendingEmpId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dispatchStatusMap, setDispatchStatusMap] = useState<Record<string, { status: 'delivered' | 'failed' | 'sent'; error?: string; sid?: string }>>({});
  const [receipts, setReceipts] = useState<DispatchReceipt[]>([]);
  const [previewSalary, setPreviewSalary] = useState<SalaryBreakdown | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string; fallbackSalary?: SalaryBreakdown } | null>(null);

  const sym = settings.currencySymbol || '$';
  const totalPayout = salaries.reduce((acc, s) => acc + s.netPay, 0);
  const periodInfo = salaries[0] ? getFormattedPeriod(salaries[0]) : { ymd: '2026-08', monthName: 'August 2026', combined: '2026-08 (August 2026)' };

  // Synchronize initial provider when modal opens
  useEffect(() => {
    if (isOpen && salaries.length > 0) {
      setSelectedIds(new Set(salaries.map(s => s.empId)));
      setPreviewSalary(salaries[0]);
      setIsSendingBatch(false);
      setSendingEmpId(null);
      setProgress(0);
      setAlertBanner(null);
      setActiveProvider(settings.whatsappProvider === 'meta' ? 'meta' : 'web_assist');
    }
  }, [isOpen, salaries, settings.whatsappProvider]);

  if (!isOpen) return null;

  const isAllSelected = salaries.length > 0 && selectedIds.size === salaries.length;

  const currentSettings: CompanySettings = {
    ...settings,
    whatsappProvider: activeProvider,
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(salaries.map(s => s.empId)));
    }
  };

  const handleToggleSelectOne = (empId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  // Launch direct WhatsApp Web helper
  const handleLaunchWhatsAppWeb = (s: SalaryBreakdown) => {
    const phoneInfo = normalizePhoneNumber(s.profile.mobileNumber || s.profile.phone);
    const message = formatWhatsAppPayslipMessage(s, currentSettings);
    // Download official PDF
    generatePaySlipPDF(s, currentSettings);
    // Open WhatsApp Web with text
    const encoded = encodeURIComponent(message);
    const waUrl = phoneInfo.rawDigits 
      ? `https://wa.me/${phoneInfo.rawDigits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    setDispatchStatusMap(prev => ({
      ...prev,
      [s.empId]: {
        status: 'delivered',
        sid: `WA-WEB-${s.empId}`
      }
    }));
  };

  // Dispatch single employee
  const handleSendSingle = async (s: SalaryBreakdown) => {
    setSendingEmpId(s.empId);
    setAlertBanner(null);

    const res = await openWhatsAppPayslip(s, currentSettings);
    
    setDispatchStatusMap(prev => ({
      ...prev,
      [s.empId]: {
        status: res.success ? 'delivered' : 'failed',
        error: res.error,
        sid: res.receipt?.referenceId
      }
    }));

    if (res.receipt) {
      setReceipts(prev => [res.receipt, ...prev]);
    }

    if (res.success) {
      setAlertBanner({
        type: 'success',
        text: `Payslip dispatched successfully to ${s.profile.name} (${normalizePhoneNumber(s.profile.mobileNumber || s.profile.phone).formatted || 'WhatsApp'})`
      });
    } else {
      setAlertBanner({
        type: 'error',
        text: `Failed to dispatch to ${s.profile.name}: ${res.error || 'Trial account limitation or sandbox not joined.'}`,
        fallbackSalary: s
      });
    }

    setSendingEmpId(null);
  };

  // Dispatch selected batch
  const handleStartBatchDispatch = async () => {
    const targetSalaries = salaries.filter(s => selectedIds.has(s.empId));
    if (targetSalaries.length === 0) return;

    setIsSendingBatch(true);
    setProgress(0);
    setAlertBanner(null);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetSalaries.length; i++) {
      const s = targetSalaries[i];
      setSendingEmpId(s.empId);

      const res = await openWhatsAppPayslip(s, currentSettings);
      
      setDispatchStatusMap(prev => ({
        ...prev,
        [s.empId]: {
          status: res.success ? 'delivered' : 'failed',
          error: res.error,
          sid: res.receipt?.referenceId
        }
      }));

      if (res.receipt) {
        setReceipts(prev => [res.receipt, ...prev]);
      }

      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }

      setProgress(Math.round(((i + 1) / targetSalaries.length) * 100));
      await new Promise(r => setTimeout(r, 400));
    }

    setSendingEmpId(null);
    setIsSendingBatch(false);

    if (failCount === 0) {
      setAlertBanner({
        type: 'success',
        text: `All ${successCount} payslips dispatched successfully via WhatsApp!`
      });
    } else {
      setAlertBanner({
        type: 'info',
        text: `Batch completed: ${successCount} delivered, ${failCount} failed. You can click "Open WhatsApp" on failed rows to send directly without sandbox limits.`
      });
    }
  };

  const handleDownloadAllPDFs = () => {
    salaries.forEach((s, idx) => {
      setTimeout(() => {
        generatePaySlipPDF(s, settings);
      }, idx * 120);
    });
  };

  const handleCopyPreview = () => {
    if (!previewSalary) return;
    const msg = formatWhatsAppPayslipMessage(previewSalary, settings);
    navigator.clipboard.writeText(msg);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const deliveredCount = Object.values(dispatchStatusMap).filter((v: { status: 'delivered' | 'failed' | 'sent'; error?: string; sid?: string }) => v.status === 'delivered').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Matching BankTransferModal layout */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900">WhatsApp Payslip Dispatch Engine</h2>
                <div className="flex items-center bg-emerald-100/60 p-0.5 rounded-full text-[10px] font-bold border border-emerald-300">
                  <button
                    type="button"
                    onClick={() => setActiveProvider('meta')}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                      activeProvider === 'meta'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-emerald-800 hover:text-emerald-950'
                    }`}
                  >
                    Meta Cloud API
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProvider('web_assist')}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                      activeProvider === 'web_assist'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-emerald-800 hover:text-emerald-950'
                    }`}
                  >
                    Web Assist (Direct)
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Direct automated PDF payslip advice distribution • Pay Cycle: <span className="font-semibold text-slate-700">{periodInfo.combined}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
              <button
                id="btn-tab-roster"
                onClick={() => setActiveTab('roster')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'roster' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Roster ({salaries.length})
              </button>
              <button
                id="btn-tab-receipts"
                onClick={() => setActiveTab('receipts')}
                className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center space-x-1 ${
                  activeTab === 'receipts' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Receipts ({receipts.length})</span>
              </button>
            </div>

            {onOpenSettings && (
              <button
                id="btn-open-gateway-settings"
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                title="Configure Meta WhatsApp API Credentials"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip - Matching BankTransferModal stats strip */}
        <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-4 text-emerald-950">
            <span>Total Beneficiaries: <strong>{salaries.length}</strong></span>
            <span>•</span>
            <span>Selected for Dispatch: <strong>{selectedIds.size}</strong></span>
            <span>•</span>
            <span>Delivered: <strong className="text-emerald-700 font-extrabold">{deliveredCount} of {salaries.length}</strong></span>
            <span>•</span>
            <span>Total Net Payout: <strong className="text-emerald-800 font-extrabold">{sym} {totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadAllPDFs}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs"
              title="Download all generated PDF payslips locally"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download All PDFs</span>
            </button>
          </div>
        </div>

        {/* Alert / Notification Banner */}
        {alertBanner && (
          <div className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
            alertBanner.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
              : alertBanner.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              {alertBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : alertBanner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <MessageCircle className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{alertBanner.text}</span>
              {alertBanner.fallbackSalary && (
                <div className="inline-flex items-center space-x-2">
                  <button
                    onClick={() => handleLaunchWhatsAppWeb(alertBanner.fallbackSalary!)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open WhatsApp Web for {alertBanner.fallbackSalary.profile.name}</span>
                  </button>
                  {activeProvider === 'meta' && (
                    <button
                      onClick={() => {
                        setActiveProvider('web_assist');
                        setAlertBanner({
                          type: 'info',
                          text: `Switched to Web Assist (Direct). You can now click Send on any employee to open WhatsApp with the PDF without Meta API or template requirements.`
                        });
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                    >
                      <span>Switch All to Web Assist (Direct)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setAlertBanner(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Progress Bar when dispatching batch */}
        {isSendingBatch && (
          <div className="px-6 py-2.5 bg-emerald-50/80 border-b border-emerald-100 space-y-1.5">
            <div className="flex justify-between font-semibold text-emerald-900 text-xs">
              <span className="flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Dispatching WhatsApp Pay Slips...</span>
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Dynamic Warning for Meta Cloud API Setup */}
        {activeProvider === 'meta' && (!settings.whatsappPhoneNumberId || !settings.whatsappAccessToken) && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Meta Cloud API Credentials Missing:</strong> Add your Phone Number ID and Access Token in Settings to send directly via Meta API, or use <strong>Web Assist (Direct)</strong> for instant zero-setup sending!
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setActiveProvider('web_assist')}
                className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded text-[11px] transition cursor-pointer"
              >
                Use Web Assist
              </button>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded text-[11px] transition cursor-pointer"
                >
                  Open Settings
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'roster' ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAll}
                        className="cursor-pointer text-slate-500 hover:text-slate-800"
                        title={isAllSelected ? "Deselect All" : "Select All"}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Emp ID</th>
                    <th className="p-3">Employee Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">WhatsApp Mobile</th>
                    <th className="p-3 text-right">Net Salary</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {salaries.map((s) => {
                    const isSelected = selectedIds.has(s.empId);
                    const phoneInfo = normalizePhoneNumber(s.profile.mobileNumber || s.profile.phone);
                    const statusInfo = dispatchStatusMap[s.empId];
                    const isSendingThis = sendingEmpId === s.empId;

                    return (
                      <tr 
                        key={s.id} 
                        className={`hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50/20' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleSelectOne(s.empId)}
                            className="cursor-pointer text-slate-400 hover:text-slate-700"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Emp ID */}
                        <td className="p-3 font-mono text-slate-600 font-medium">
                          {s.profile.empId}
                        </td>

                        {/* Name */}
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span>{s.profile.name}</span>
                            {s.profile.isProbation && (
                              <span className="text-[9.5px] px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 font-semibold">
                                Probation
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Department & Designation */}
                        <td className="p-3 text-slate-600">
                          <span className="font-medium text-slate-800">{s.profile.department}</span>
                          <span className="text-[11px] text-slate-400 block">{s.profile.designation}</span>
                        </td>

                        {/* Mobile Number */}
                        <td className="p-3 font-mono">
                          {phoneInfo.isValid ? (
                            <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{phoneInfo.formatted}</span>
                            </span>
                          ) : (
                            <span className="text-rose-600 text-[11px] font-semibold">
                              Missing Number
                            </span>
                          )}
                        </td>

                        {/* Net Salary */}
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {sym} {s.netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          {statusInfo?.status === 'delivered' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Delivered</span>
                            </span>
                          ) : statusInfo?.status === 'failed' ? (
                            <span 
                              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                              title={statusInfo.error}
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Failed</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          {/* Download PDF button */}
                          <button
                            onClick={() => generatePaySlipPDF(s, currentSettings)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg inline-block cursor-pointer transition"
                            title="Download Official PDF Pay Slip"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct WhatsApp Web button */}
                          <button
                            onClick={() => handleLaunchWhatsAppWeb(s)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg inline-block cursor-pointer transition border border-emerald-200"
                            title="Open WhatsApp Web & Download PDF (Direct Web Dispatch)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Send WhatsApp (Meta API / Configured provider) button */}
                          <button
                            disabled={isSendingThis || isSendingBatch}
                            onClick={() => handleSendSingle(s)}
                            className={`px-3 py-1 rounded-lg font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer transition shadow-2xs ${
                              statusInfo?.status === 'delivered'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title={`Send payslip to ${s.profile.name}`}
                          >
                            {isSendingThis ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <MessageCircle className="w-3 h-3" />
                                <span>{statusInfo?.status === 'delivered' ? 'Resend' : 'Send'}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Audit Receipts Tab */
            <div className="space-y-4">
              {receipts.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-bold text-slate-700 text-sm">No dispatches sent in this session yet</div>
                  <p className="text-xs text-slate-500">
                    Click <strong>"Send"</strong> on any employee or <strong>"Dispatch Selected Pay Slips"</strong> to trigger verified deliveries.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Reference / SID</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Mobile Destination</th>
                        <th className="p-3">PDF Document</th>
                        <th className="p-3 text-right">Net Amount</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {receipts.map((rcpt) => (
                        <tr key={rcpt.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-500 text-[11px]">{rcpt.referenceId}</td>
                          <td className="p-3 font-bold text-slate-900">{rcpt.employeeName} ({rcpt.empId})</td>
                          <td className="p-3 font-mono text-emerald-700 font-semibold">{rcpt.recipient}</td>
                          <td className="p-3 text-[11px] text-blue-600 font-mono">{rcpt.pdfFileName}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">{rcpt.netPay}</td>
                          <td className="p-3 text-slate-500">{new Date(rcpt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Delivered</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Matching BankTransferModal layout */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted PDF payslips sent directly to verified employee WhatsApp numbers</span>
          </span>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Close
            </button>

            <button
              disabled={isSendingBatch || selectedIds.size === 0}
              onClick={handleStartBatchDispatch}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold shadow-xs transition cursor-pointer"
            >
              {isSendingBatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching ({selectedIds.size})...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Selected ({selectedIds.size}) Pay Slips</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
