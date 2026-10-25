import React from 'react';
import { 
  DollarSign, 
  Users, 
  FileUp, 
  CheckCircle2, 
  FileSpreadsheet, 
  Building, 
  Send, 
  Download,
  RotateCcw,
  Clock,
  MessageCircle,
  History
} from 'lucide-react';
import { SalaryBreakdown, CompanySettings, PayrollStatus, UserRole } from '../types/payroll';

interface DashboardOverviewProps {
  salaries: SalaryBreakdown[];
  settings: CompanySettings;
  payrollStatus: PayrollStatus;
  onUpdatePayrollStatus: (status: PayrollStatus) => void;
  onOpenUploadModal: () => void;
  onOpenBankTransferModal: () => void;
  onOpenEmailModal: () => void;
  onExportConsolidatedExcel: () => void;
  onExportDeptSummaryExcel?: () => void;
  onBatchDownloadPDF: () => void;
  currentRole: UserRole;
  onArchiveCurrentMonth?: () => void;
  historicalCount?: number;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  salaries,
  settings,
  payrollStatus,
  onUpdatePayrollStatus,
  onOpenUploadModal,
  onOpenBankTransferModal,
  onOpenEmailModal,
  onExportConsolidatedExcel,
  onBatchDownloadPDF,
  currentRole,
  onArchiveCurrentMonth,
  historicalCount,
}) => {
  const sym = settings.currencySymbol || '$';

  // Calculations
  const totalGross = salaries.reduce((acc, s) => acc + (s.grossEarnings ?? 0), 0);
  const totalEmployees = salaries.length;

  const isApproved = payrollStatus === 'approved';

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Cycle Status & Action Pipeline */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Payroll Processing Command Center
            </h1>
            {isApproved ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold border bg-emerald-100 text-emerald-800 border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approved</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold border bg-amber-100 text-amber-800 border-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Approval</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Period: <span className="font-semibold text-slate-700">{salaries[0]?.periodLabel || 'August 2026'}</span> • {totalEmployees} Active Employees Ingested • Currency: {settings.currency} ({sym})
          </p>
        </div>

        {/* Workflow Action Buttons */}
        {currentRole !== 'employee' && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Step 1: Ingest Attendance */}
            <button
              id="btn-upload-attendance"
              onClick={onOpenUploadModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>Upload New Month Excel</span>
            </button>

            {/* Step 2: One-Click Approve / Reopen */}
            {!isApproved ? (
              (currentRole === 'super_admin' || currentRole === 'hr_manager' || currentRole === 'dept_head') && (
                <button
                  id="btn-approve-payroll"
                  onClick={() => onUpdatePayrollStatus('approved')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Payroll</span>
                </button>
              )
            ) : (
              (currentRole === 'super_admin' || currentRole === 'hr_manager') && (
                <button
                  id="btn-reopen-payroll"
                  onClick={() => onUpdatePayrollStatus('draft')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition cursor-pointer"
                  title="Reopen payroll cycle to make adjustments"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reopen / Edit</span>
                </button>
              )
            )}

            {/* Archive to History Button */}
            {onArchiveCurrentMonth && (
              <button
                id="btn-archive-current-month"
                onClick={onArchiveCurrentMonth}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-xs transition cursor-pointer"
                title="Save current month's payslips into Past Payslips archive"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Archive to Past Payslips</span>
                {historicalCount !== undefined && historicalCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-bold">
                    {historicalCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Card 1: Gross Payroll */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Gross Payroll</span>
            <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {sym} {totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total monthly gross wage obligation across all employees
            </p>
          </div>
        </div>

        {/* Card 2: Total Active Staff */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active Employees</span>
            <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {totalEmployees}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active staff members on current payroll roster
            </p>
          </div>
        </div>

      </div>

      {/* Quick Action Ribbon */}
      {currentRole !== 'employee' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Multi-Format Output & Dispatch Center:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-export-excel-register"
              onClick={onExportConsolidatedExcel}
              className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-md text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Consolidated Excel Register</span>
            </button>

            <button
              id="btn-export-bank-advice"
              onClick={onOpenBankTransferModal}
              className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-md text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bank Transfer Advice (NEFT/ACH)</span>
            </button>

            <button
              id="btn-batch-pdf-download"
              onClick={onBatchDownloadPDF}
              className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-md text-xs font-medium shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Batch Download All PDFs</span>
            </button>

            <button
              id="btn-dispatch-payslips"
              onClick={onOpenEmailModal}
              className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Payslip Dispatch</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
