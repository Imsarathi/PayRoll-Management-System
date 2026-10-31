import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  Download,
  Calendar,
  Layers
} from 'lucide-react';
import { AttendanceRecord, ColumnMapping } from '../types/payroll';
import { 
  parseAttendanceExcel, 
  mapRowsToAttendance, 
  downloadSampleAttendanceTemplate 
} from '../utils/excelParser';
import { INITIAL_ATTENDANCE } from '../utils/sampleData';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAttendance: (records: AttendanceRecord[], detectedPeriod?: { month: string; periodLabel: string }) => void;
  totalMonthDays: number;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  onClose,
  onApplyAttendance,
  totalMonthDays,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [detectedPeriod, setDetectedPeriod] = useState<{ month: string; periodLabel: string } | undefined>(undefined);
  const [mapping, setMapping] = useState<ColumnMapping>({
    empId: '',
    name: '',
    department: '',
    daysPresent: '',
    daysAbsent: '',
    halfDays: '',
    overtimeHours: '',
    paidLeaves: '',
    unpaidLeaves: '',
    holidaysWorked: '',
    lateArrivals: '',
    baseSalary: '',
    basicPay: '',
    hra: '',
    conveyance: '',
    da: '',
    specialAllowance: '',
    otherAllowance: '',
    medicalAllowance: '',
    overtimePay: '',
    incentiveBonus: '',
    reimbursements: '',
    grossSalary: '',
    providentFund: '',
    professionalTax: '',
    lopDeduction: '',
    lateDeduction: '',
    loanAdvance: '',
    otherDeductions: '',
    totalDeductions: '',
    netPay: '',
  });
  const [parsedRecords, setParsedRecords] = useState<AttendanceRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; empId?: string; field: string; message: string; severity: 'error' | 'warning' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setFileName(file.name);
      const result = await parseAttendanceExcel(file);
      setHeaders(result.headers);
      setRawRows(result.rawRows);
      setMapping(result.detectedMapping);
      setParsedRecords(result.records);
      setValidationErrors(result.validationErrors);
      setDetectedPeriod(result.detectedPeriod);
      setStep('mapping');
    } catch (err: any) {
      alert(`Error reading file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSampleDataset = () => {
    setFileName('August_2026_Attendance_Master.xlsx');
    setParsedRecords(INITIAL_ATTENDANCE);
    setValidationErrors([]);
    onApplyAttendance(INITIAL_ATTENDANCE);
    onClose();
  };

  const handleMappingChange = (field: keyof ColumnMapping, header: string) => {
    const updatedMapping = { ...mapping, [field]: header };
    setMapping(updatedMapping);
    const { records, validationErrors: errors } = mapRowsToAttendance(rawRows, updatedMapping, totalMonthDays);
    setParsedRecords(records);
    setValidationErrors(errors);
  };

  const handleProceedToPreview = () => {
    if (!mapping.empId) {
      alert('Please map the Employee Code / ID column before proceeding.');
      return;
    }
    const { records, validationErrors: errors } = mapRowsToAttendance(rawRows, mapping, totalMonthDays);
    setParsedRecords(records);
    setValidationErrors(errors);
    setStep('preview');
  };

  const handleCommit = () => {
    onApplyAttendance(parsedRecords, detectedPeriod);
    onClose();
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Monthly Salary & Attendance Ingestion Module</h2>
              <p className="text-xs text-slate-500">Excel parser with automated column detection and exact figure verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>1</span>
            <span className={step === 'upload' ? 'text-blue-600 font-bold' : ''}>Upload Excel / CSV</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200"></div>
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'mapping' ? 'bg-blue-600 text-white' : step === 'preview' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>2</span>
            <span className={step === 'mapping' ? 'text-blue-600 font-bold' : ''}>Verify Columns Mapping</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200"></div>
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</span>
            <span className={step === 'preview' ? 'text-blue-600 font-bold' : ''}>Preview & Generate Payslips</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {isProcessing ? 'Analyzing spreadsheet structure...' : 'Drop your Monthly Salary / Attendance sheet here'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Upload client Excel (.xlsx, .xls) containing Employee Code, Name, Present Days, Basic Pay, D.A., H.R.A., Allowances, O.T., Deductions & Net Pay.
                </p>
                <div className="mt-4 inline-flex items-center space-x-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  <span>Browse File From Computer</span>
                </div>
              </div>

              {/* Rules & Ingestion Guide */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Configured Ingestion Rules for Client Spreadsheet:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1">
                  <li><strong>Present Days:</strong> If left empty or blank by client, defaults automatically to <strong>30 days</strong> with an informational warning note.</li>
                  <li><strong>Exact Figures Displayed:</strong> Basic, D.A., H.R.A., Special & Other Allowances, O.T., Loan / Advance, Other Deductions, Gross & Net Pay match the spreadsheet strictly with zero rounding drift.</li>
                  <li><strong>Department:</strong> If missing from spreadsheet, set to <strong>'-'</strong>. Client can edit department at any time via Edit Employee.</li>
                  <li><strong>Summary Rows:</strong> Total and summary rows (e.g. Row 16) are automatically filtered out.</li>
                </ul>
              </div>

              {/* Sample Template & Quick Load */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={downloadSampleAttendanceTemplate}
                  className="inline-flex items-center space-x-1.5 text-slate-600 hover:text-blue-600 font-medium transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Client Salary Template (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleDataset}
                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Load Demo Records
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    File: <strong className="font-semibold">{fileName}</strong> ({rawRows.length} staff rows detected).
                  </span>
                </div>
                {detectedPeriod && (
                  <div className="flex items-center space-x-1 text-emerald-800 font-bold bg-emerald-100 px-2.5 py-1 rounded-md">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pay Period: {detectedPeriod.periodLabel}</span>
                  </div>
                )}
              </div>

              {/* Identification & Attendance Group */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>1. Employee & Attendance Columns</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                  {/* Emp ID */}
                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Employee Code / ID <span className="text-red-500">*</span></span>
                    </label>
                    <select
                      value={mapping.empId}
                      onChange={(e) => handleMappingChange('empId', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Name */}
                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800">Employee Name</label>
                    <select
                      value={mapping.name}
                      onChange={(e) => handleMappingChange('name', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Present Days */}
                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Present Days</span>
                      <span className="text-[10px] text-emerald-600 font-normal">Default: 30</span>
                    </label>
                    <select
                      value={mapping.daysPresent}
                      onChange={(e) => handleMappingChange('daysPresent', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Department</span>
                      <span className="text-[10px] text-slate-400 font-normal">Default: '-'</span>
                    </label>
                    <select
                      value={mapping.department}
                      onChange={(e) => handleMappingChange('department', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5"
                    >
                      <option value="">-- Optional / None --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Earnings Components Group */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>2. Earnings Columns (Strictly Displays Client Sheet Figures)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-emerald-100 rounded-xl p-3.5 bg-emerald-50/30">
                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">Monthly Salary (Base)</label>
                    <select
                      value={mapping.baseSalary}
                      onChange={(e) => handleMappingChange('baseSalary', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Optional / None --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">Basic Pay</label>
                    <select
                      value={mapping.basicPay}
                      onChange={(e) => handleMappingChange('basicPay', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">D.A. (Dearness)</label>
                    <select
                      value={mapping.da}
                      onChange={(e) => handleMappingChange('da', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">H.R.A.</label>
                    <select
                      value={mapping.hra}
                      onChange={(e) => handleMappingChange('hra', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">Special Allowance</label>
                    <select
                      value={mapping.specialAllowance}
                      onChange={(e) => handleMappingChange('specialAllowance', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">Other Allowance</label>
                    <select
                      value={mapping.otherAllowance}
                      onChange={(e) => handleMappingChange('otherAllowance', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">O.T (Overtime Amount)</label>
                    <select
                      value={mapping.overtimePay}
                      onChange={(e) => handleMappingChange('overtimePay', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-emerald-900">Gross Salary</label>
                    <select
                      value={mapping.grossSalary}
                      onChange={(e) => handleMappingChange('grossSalary', e.target.value)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Deductions & Net Pay Group */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>3. Deductions & Net Pay Columns</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-rose-100 rounded-xl p-3.5 bg-rose-50/30">
                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">Loan / Advance</label>
                    <select
                      value={mapping.loanAdvance}
                      onChange={(e) => handleMappingChange('loanAdvance', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Optional / None --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-semibold text-slate-800">Other Deductions</label>
                    <select
                      value={mapping.otherDeductions}
                      onChange={(e) => handleMappingChange('otherDeductions', e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Optional / None --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-rose-900">Total Deductions</label>
                    <select
                      value={mapping.totalDeductions}
                      onChange={(e) => handleMappingChange('totalDeductions', e.target.value)}
                      className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1 p-2 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-extrabold text-blue-900">Net Pay</label>
                    <select
                      value={mapping.netPay}
                      onChange={(e) => handleMappingChange('netPay', e.target.value)}
                      className="w-full text-xs font-extrabold bg-blue-50 border border-blue-300 rounded px-2 py-1.5"
                    >
                      <option value="">-- Select Header --</option>
                      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: PREVIEW & VALIDATION */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Validation Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-slate-800">
                    Validation Outcome: {parsedRecords.length} records ready for processing
                  </span>
                  {errorCount > 0 ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errorCount} Errors</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>0 Fatal Errors</span>
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{warningCount} Warnings / Policy Notes</span>
                    </span>
                  )}
                </div>
                {detectedPeriod && (
                  <span className="font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">
                    Pay Period: {detectedPeriod.periodLabel}
                  </span>
                )}
              </div>

              {/* Warning Log if any */}
              {validationErrors.length > 0 && (
                <div className="max-h-28 overflow-y-auto space-y-1.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                  {validationErrors.map((err, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Row {err.row} ({err.empId || 'Record'}): <strong>{err.field}</strong> — {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comprehensive Table Preview matching Client Excel Structure */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-80">
                <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Emp Code</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Dept</th>
                      <th className="p-2 text-center">Present</th>
                      <th className="p-2 text-right">Basic Pay</th>
                      <th className="p-2 text-right">D.A.</th>
                      <th className="p-2 text-right">H.R.A.</th>
                      <th className="p-2 text-right">Special Allw</th>
                      <th className="p-2 text-right">Other Allw</th>
                      <th className="p-2 text-right">O.T</th>
                      <th className="p-2 text-right font-bold text-blue-900">Gross Salary</th>
                      <th className="p-2 text-right">Loan / Adv</th>
                      <th className="p-2 text-right">Other Ded</th>
                      <th className="p-2 text-right text-rose-700">Total Ded</th>
                      <th className="p-2 text-right font-black text-emerald-700">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {parsedRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-medium text-blue-600">{r.empId}</td>
                        <td className="p-2 font-medium text-slate-800">{r.employeeName || '—'}</td>
                        <td className="p-2 text-slate-500">{r.department || '-'}</td>
                        <td className="p-2 text-center font-bold text-emerald-700">{r.daysPresent}</td>
                        <td className="p-2 text-right">{(r.manualBasicPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualDa ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualHra ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualSpecialAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualOtherAllowance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualOvertimePay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-bold text-blue-900">{(r.manualGross ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualLoanAdvance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{(r.manualOtherDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right text-rose-700">{(r.manualTotalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{(r.manualNetPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step === 'upload' ? (
            <div></div>
          ) : (
            <button
              onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Back
            </button>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>

            {step === 'mapping' && (
              <button
                onClick={handleProceedToPreview}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <span>Preview Parsed Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleCommit}
                className="inline-flex items-center space-x-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Process & Generate All Payslips</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
