import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react';
import { AttendanceRecord, ColumnMapping } from '../types/payroll';
import { 
  parseAttendanceExcel, 
  mapRowsToAttendance, 
  autoDetectMapping,
  DEFAULT_COLUMN_KEYWORDS, 
  downloadSampleAttendanceTemplate 
} from '../utils/excelParser';
import { INITIAL_ATTENDANCE } from '../utils/sampleData';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAttendance: (records: AttendanceRecord[], targetMonth?: string) => void;
  totalMonthDays: number;
  currentSelectedMonth?: string;
  onArchiveCurrentMonth?: () => void;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  onClose,
  onApplyAttendance,
  totalMonthDays,
  currentSelectedMonth,
  onArchiveCurrentMonth,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [targetMonth, setTargetMonth] = useState<string>(currentSelectedMonth || '2026-06');
  const [archivePreviousBeforeApplying, setArchivePreviousBeforeApplying] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
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
  });
  const [parsedRecords, setParsedRecords] = useState<AttendanceRecord[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; empId?: string; field: string; message: string; severity: 'error' | 'warning' }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentSelectedMonth) {
      setTargetMonth(currentSelectedMonth);
    }
  }, [currentSelectedMonth, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setInlineError(null);
      setFileName(file.name);
      const result = await parseAttendanceExcel(file);
      setHeaders(result.headers);
      setRawRows(result.rawRows);
      setMapping(result.detectedMapping);
      setParsedRecords(result.records);
      setValidationErrors(result.validationErrors);
      setStep('mapping');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setInlineError(`Error reading file: ${err.message || 'Please upload a valid Excel (.xlsx, .xls) or CSV file.'}`);
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
    setInlineError(null);
    try {
      const { records, validationErrors: errors } = mapRowsToAttendance(rawRows, updatedMapping, totalMonthDays);
      setParsedRecords(records);
      setValidationErrors(errors);
    } catch (err: any) {
      console.error('Error re-mapping rows:', err);
    }
  };

  const handleProceedToPreview = () => {
    setInlineError(null);
    try {
      let effectiveMapping = { ...mapping };
      if (!effectiveMapping.empId) {
        // If empId is not explicitly mapped, auto-select candidate column or column 0
        const candidate = headers.find(h => {
          const c = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return c.includes('id') || c.includes('code') || c.includes('emp') || c.startsWith('sr') || c.startsWith('no');
        }) || headers[0] || '';
        effectiveMapping.empId = candidate;
        setMapping(effectiveMapping);
      }

      const { records, validationErrors: errors } = mapRowsToAttendance(rawRows, effectiveMapping, totalMonthDays);
      if (records.length === 0) {
        setInlineError('No valid employee records were found in this sheet. Please verify column mappings or ensure data rows are present.');
        return;
      }
      setParsedRecords(records);
      setValidationErrors(errors);
      setStep('preview');
    } catch (err: any) {
      console.error('Error generating preview:', err);
      setInlineError(`Failed to generate parsed preview: ${err.message || 'Unknown error'}. Please check column mappings.`);
    }
  };

  const handleCommit = () => {
    if (archivePreviousBeforeApplying && onArchiveCurrentMonth) {
      onArchiveCurrentMonth();
    }
    onApplyAttendance(parsedRecords, targetMonth);
    onClose();
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance Data Ingestion Module</h2>
              <p className="text-xs text-slate-500">Excel / CSV parser with automated column schema mapping</p>
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
            <span className={step === 'upload' ? 'text-blue-600' : ''}>Upload File</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'mapping' ? 'bg-blue-600 text-white' : step === 'preview' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>2</span>
            <span className={step === 'mapping' ? 'text-blue-600' : ''}>Map Columns</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center space-x-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</span>
            <span className={step === 'preview' ? 'text-blue-600' : ''}>Validate & Process</span>
          </div>
        </div>

        {/* Body Content by Step */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Target Month Selector */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Designated Pay Month for this Upload</h4>
                    <p className="text-[11px] text-slate-500">
                      Specify which month (e.g. June 2026, July 2026, September 2026) this spreadsheet corresponds to.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-700">Month:</span>
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {inlineError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{inlineError}</p>
                    <p className="text-[11px] text-rose-600 mt-0.5">Please check your spreadsheet file format and try again.</p>
                  </div>
                </div>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isProcessing ? 'Parsing Excel File...' : 'Drop your Attendance Excel or CSV here'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Supports .xlsx, .xls, and .csv formats. The system will auto-detect headers for Employee ID, Present Days, Absent, OT, etc.
                </p>
                <div className="mt-4 flex items-center space-x-2">
                  <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs">
                    Browse Files
                  </span>
                </div>
              </div>

              {/* Sample Helpers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Standard Excel Template</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Download a pre-formatted Excel template with sample formulas and column descriptions.
                    </p>
                    <button
                      onClick={downloadSampleAttendanceTemplate}
                      className="mt-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Download Template (.xlsx)
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Load Demo Attendance Dataset</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Instantly populate August 2026 attendance with diverse employee cases (overtime, LOP, mid-month join).
                    </p>
                    <button
                      onClick={handleLoadSampleDataset}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
                    >
                      Load Sample Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    File: <strong className="font-semibold">{fileName}</strong> ({rawRows.length} rows, {headers.length} columns detected).
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const auto = autoDetectMapping(headers);
                      setMapping(auto);
                      const { records, validationErrors: errs } = mapRowsToAttendance(rawRows, auto, totalMonthDays);
                      setParsedRecords(records);
                      setValidationErrors(errs);
                      setInlineError(null);
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-50 transition"
                  >
                    Reset Auto-Mapping
                  </button>
                  <button
                    onClick={handleProceedToPreview}
                    className="text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition shadow-2xs inline-flex items-center space-x-1"
                  >
                    <span>Preview Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {inlineError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{inlineError}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">Please check that the Employee ID and attendance columns are assigned to the correct headers below.</p>
                  </div>
                </div>
              )}

              {/* Attendance Fields Group */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Attendance & Employee Timesheet Columns</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                  {/* Mandatory Field */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Employee ID <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Key</span>
                    </label>
                    <select
                      value={mapping.empId}
                      onChange={(e) => handleMappingChange('empId', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Name */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Employee Name</span>
                      <span className="text-[10px] text-slate-400 font-normal">Display</span>
                    </label>
                    <select
                      value={mapping.name}
                      onChange={(e) => handleMappingChange('name', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Department */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Department / Division</span>
                      <span className="text-[10px] text-slate-400 font-normal">Unit</span>
                    </label>
                    <select
                      value={mapping.department}
                      onChange={(e) => handleMappingChange('department', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Days Present */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Days Present</span>
                      <span className="text-[10px] text-slate-400 font-normal">Present</span>
                    </label>
                    <select
                      value={mapping.daysPresent}
                      onChange={(e) => handleMappingChange('daysPresent', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Days Absent */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Days Absent</span>
                      <span className="text-[10px] text-slate-400 font-normal">Absent</span>
                    </label>
                    <select
                      value={mapping.daysAbsent}
                      onChange={(e) => handleMappingChange('daysAbsent', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Half Days */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Half Days</span>
                      <span className="text-[10px] text-slate-400 font-normal">0.5x</span>
                    </label>
                    <select
                      value={mapping.halfDays}
                      onChange={(e) => handleMappingChange('halfDays', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Paid Leaves */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Paid Leaves (CL/SL)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Leaves</span>
                    </label>
                    <select
                      value={mapping.paidLeaves}
                      onChange={(e) => handleMappingChange('paidLeaves', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unpaid Leaves */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Unpaid Leaves (LOP Days)</span>
                      <span className="text-[10px] text-slate-400 font-normal">LOP</span>
                    </label>
                    <select
                      value={mapping.unpaidLeaves}
                      onChange={(e) => handleMappingChange('unpaidLeaves', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Overtime Hours */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>OT Hours</span>
                      <span className="text-[10px] text-slate-400 font-normal">Hours</span>
                    </label>
                    <select
                      value={mapping.overtimeHours}
                      onChange={(e) => handleMappingChange('overtimeHours', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Late Arrivals */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Late Arrivals / Marks</span>
                      <span className="text-[10px] text-slate-400 font-normal">Count</span>
                    </label>
                    <select
                      value={mapping.lateArrivals}
                      onChange={(e) => handleMappingChange('lateArrivals', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Select Excel Header --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Incentive & Bonus */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                      <span>Incentive & Bonus</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">+Earnings</span>
                    </label>
                    <select
                      value={mapping.incentiveBonus}
                      onChange={(e) => handleMappingChange('incentiveBonus', e.target.value)}
                      className="w-full text-xs font-medium bg-emerald-50/50 border border-emerald-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Optional (Auto/None) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Loan & Salary Advances */}
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-xs font-bold text-rose-800 flex items-center justify-between">
                      <span>Loan & Salary Advances</span>
                      <span className="text-[10px] text-rose-600 font-semibold">-Deduction</span>
                    </label>
                    <select
                      value={mapping.loanAdvance}
                      onChange={(e) => handleMappingChange('loanAdvance', e.target.value)}
                      className="w-full text-xs font-medium bg-rose-50/50 border border-rose-300 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="">-- Optional (0.00) --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Direct Excel Salary Columns Group */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>Direct Salary Components (Exact Excel Values)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border border-slate-200 rounded-xl p-3.5 bg-emerald-50/30">
                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">Basic Pay</label>
                    <select
                      value={mapping.basicPay || ''}
                      onChange={(e) => handleMappingChange('basicPay', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">D. A. (Dearness)</label>
                    <select
                      value={mapping.da || ''}
                      onChange={(e) => handleMappingChange('da', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">H. R. A.</label>
                    <select
                      value={mapping.hra || ''}
                      onChange={(e) => handleMappingChange('hra', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">Special Allowance</label>
                    <select
                      value={mapping.specialAllowance || ''}
                      onChange={(e) => handleMappingChange('specialAllowance', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">Other Allowance</label>
                    <select
                      value={mapping.otherAllowance || ''}
                      onChange={(e) => handleMappingChange('otherAllowance', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">O.T (Overtime)</label>
                    <select
                      value={mapping.overtimePay || ''}
                      onChange={(e) => handleMappingChange('overtimePay', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">Gross Salary</label>
                    <select
                      value={mapping.grossSalary || ''}
                      onChange={(e) => handleMappingChange('grossSalary', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-slate-800 block">Total Deduction</label>
                    <select
                      value={mapping.totalDeduction || ''}
                      onChange={(e) => handleMappingChange('totalDeduction', e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-2 py-1"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1 p-2.5 rounded-lg bg-white border border-slate-200">
                    <label className="text-[11px] font-bold text-emerald-800 block">Net Pay</label>
                    <select
                      value={mapping.netPay || ''}
                      onChange={(e) => handleMappingChange('netPay', e.target.value)}
                      className="w-full text-xs font-medium bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 font-bold text-emerald-800"
                    >
                      <option value="">-- Auto/None --</option>
                      {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Exact Values Notice */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <h4 className="font-bold text-emerald-950">Direct Excel Value Preservation Active</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Values mapped from your Excel sheet (<strong>Basic Pay</strong>, <strong>D. A.</strong>, <strong>H. R. A.</strong>, <strong>Special Allowance</strong>, <strong>Other Allowance</strong>, <strong>O.T</strong>, <strong>Gross Salary</strong>, <strong>Deductions</strong>, and <strong>Net Pay</strong>) are filled directly into the payslips without unwanted automatic recalculation overrides.
                  </p>
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
                      <span>{warningCount} Warnings</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Warning Log if any */}
              {validationErrors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                  {validationErrors.map((err, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Row {err.row} ({err.empId || 'Unknown'}): <strong>{err.field}</strong> — {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Table Preview with Attendance Inputs */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2.5 border-b border-slate-200">Emp ID</th>
                      <th className="p-2.5 border-b border-slate-200">Employee Name</th>
                      <th className="p-2.5 border-b border-slate-200">Department</th>
                      <th className="p-2.5 border-b border-slate-200 text-center">Present</th>
                      <th className="p-2.5 border-b border-slate-200 text-center">Absent</th>
                      <th className="p-2.5 border-b border-slate-200 text-center">Half Days</th>
                      <th className="p-2.5 border-b border-slate-200 text-center">Paid Leaves</th>
                      <th className="p-2.5 border-b border-slate-200 text-center text-rose-700">Unpaid (LOP)</th>
                      <th className="p-2.5 border-b border-slate-200 text-center text-purple-700">OT Hours</th>
                      <th className="p-2.5 border-b border-slate-200 text-center text-amber-700">Late Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {parsedRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-blue-600">{r.empId}</td>
                        <td className="p-2.5 text-slate-800 whitespace-nowrap font-medium">{r.employeeName || '—'}</td>
                        <td className="p-2.5 text-slate-600">{r.department || '—'}</td>
                        <td className="p-2.5 text-center text-emerald-700 font-semibold">{r.daysPresent}</td>
                        <td className="p-2.5 text-center text-slate-700">{r.daysAbsent}</td>
                        <td className="p-2.5 text-center text-slate-700">{r.halfDays}</td>
                        <td className="p-2.5 text-center text-blue-700">{r.paidLeaves}</td>
                        <td className="p-2.5 text-center text-rose-600 font-semibold">{r.unpaidLeaves}</td>
                        <td className="p-2.5 text-center text-purple-600 font-semibold">{r.overtimeHours}h</td>
                        <td className="p-2.5 text-center text-amber-700 font-medium">{r.lateArrivalsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 3 Options: Target Month & Auto-Archive */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={archivePreviousBeforeApplying}
                    onChange={(e) => setArchivePreviousBeforeApplying(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Automatically archive current active payslips to <strong>Past Payslips</strong> history before applying</span>
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">Applying to Month:</span>
                  <input
                    type="month"
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-bold text-slate-800"
                  />
                </div>
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
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition"
            >
              Back
            </button>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            {step === 'mapping' && (
              <button
                onClick={handleProceedToPreview}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-xs hover:shadow transition cursor-pointer"
              >
                <span>Preview Parsed Data ({rawRows.length} Rows)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleCommit}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-xs transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Process & Recalculate Payroll</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
