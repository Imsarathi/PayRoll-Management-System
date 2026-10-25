import React, { useState, useRef } from 'react';
import { 
  X, 
  History, 
  Calendar, 
  DollarSign, 
  Download, 
  Eye, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  CheckCircle2, 
  Upload,
  AlertCircle,
  FileText,
  Building2,
  Clock,
  Landmark,
  Banknote,
  Smartphone,
  Trash2,
  HelpCircle,
  MessageCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SalaryBreakdown, EmployeeProfile, CompanySettings, UserRole, PaymentMethod } from '../types/payroll';
import { generatePaySlipPDF } from '../utils/pdfGenerator';
import { openWhatsAppPayslip } from '../utils/whatsappHelper';

interface HistoricalPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeProfile[];
  historicalSalaries: SalaryBreakdown[];
  settings: CompanySettings;
  currentRole: UserRole;
  onSaveHistoricalPayslip: (record: SalaryBreakdown) => void;
  onBulkIngestHistorical: (records: SalaryBreakdown[]) => void;
  onDeleteHistoricalPayslip?: (id: string) => void;
  onViewPaySlip: (record: SalaryBreakdown) => void;
  initialEmpId?: string;
}

export const HistoricalPayslipModal: React.FC<HistoricalPayslipModalProps> = ({
  isOpen,
  onClose,
  employees,
  historicalSalaries,
  settings,
  currentRole,
  onSaveHistoricalPayslip,
  onBulkIngestHistorical,
  onDeleteHistoricalPayslip,
  onViewPaySlip,
  initialEmpId,
}) => {
  const sym = settings?.currencySymbol || '$';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs: 'list' | 'add_single' | 'bulk_upload'
  const [activeTab, setActiveTab] = useState<'list' | 'add_single' | 'bulk_upload'>('list');
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>(initialEmpId || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Single Entry Form State
  const [singleForm, setSingleForm] = useState({
    empId: employees[0]?.empId || '',
    month: '2026-07',
    totalDays: 30,
    daysPresent: 30,
    paidLeaves: 0,
    lossOfPayDays: 0,
    overtimeHours: 0,
    basicPay: 5000,
    hra: 2000,
    dearnessAllowance: 500,
    conveyanceAllowance: 800,
    specialAllowance: 1000,
    overtimePay: 0,
    holidayWorkPay: 0,
    performanceBonus: 0,
    providentFund: 600,
    employerPF: 600,
    professionalTax: 200,
    lossOfPayDeduction: 0,
    lateDeduction: 0,
    otherDeductions: 0,
    paymentMethod: 'bank_transfer' as PaymentMethod,
    paymentReference: '',
    disbursedDate: '2026-07-31',
    remarks: 'Historical pay record ingested',
  });

  const [formError, setFormError] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<{ success: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  // Format month to label (e.g., '2025-03' -> 'March 2025')
  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr) return 'Historical Period';
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${months[monthNum - 1]} ${year}`;
      }
    }
    return monthStr;
  };

  // Filtered List
  const filteredRecords = historicalSalaries.filter(record => {
    const matchesEmp = selectedEmpFilter === 'ALL' || record.empId === selectedEmpFilter;
    const matchesQuery = 
      record.profile?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.periodLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.month.includes(searchQuery);
    return matchesEmp && matchesQuery;
  }).sort((a, b) => (b.month || '').localeCompare(a.month || ''));

  // Calculate Single Form Live Totals
  const singleGross = 
    Number(singleForm.basicPay || 0) +
    Number(singleForm.hra || 0) +
    Number(singleForm.dearnessAllowance || 0) +
    Number(singleForm.conveyanceAllowance || 0) +
    Number(singleForm.specialAllowance || 0) +
    Number(singleForm.overtimePay || 0) +
    Number(singleForm.holidayWorkPay || 0) +
    Number(singleForm.performanceBonus || 0);

  const singleDeductions = 
    Number(singleForm.providentFund || 0) +
    Number(singleForm.professionalTax || 0) +
    Number(singleForm.lossOfPayDeduction || 0) +
    Number(singleForm.lateDeduction || 0) +
    Number(singleForm.otherDeductions || 0);

  const singleNet = Math.max(0, singleGross - singleDeductions);

  // Handle Single Form Submission
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const targetEmp = employees.find(emp => emp.empId === singleForm.empId);
    if (!targetEmp) {
      setFormError('Please select a valid employee.');
      return;
    }
    if (!singleForm.month) {
      setFormError('Please specify the pay period month (e.g. 2026-07).');
      return;
    }

    const periodLabel = formatMonthLabel(singleForm.month);
    const totalDays = Number(singleForm.totalDays) || 30;
    const lopDays = Number(singleForm.lossOfPayDays) || 0;
    const payableDays = Math.max(0, totalDays - lopDays);

    const newRecord: SalaryBreakdown = {
      id: `hist-${targetEmp.empId}-${singleForm.month}-${Date.now()}`,
      empId: targetEmp.empId,
      month: singleForm.month,
      periodLabel,
      profile: targetEmp,
      attendance: {
        empId: targetEmp.empId,
        employeeName: targetEmp.name,
        department: targetEmp.department,
        totalMonthDays: totalDays,
        daysPresent: Number(singleForm.daysPresent) || (totalDays - lopDays),
        daysAbsent: lopDays,
        halfDays: 0,
        paidLeaves: Number(singleForm.paidLeaves) || 0,
        unpaidLeaves: lopDays,
        overtimeHours: Number(singleForm.overtimeHours) || 0,
        holidayOvertimeHours: 0,
        lateArrivalsCount: 0,
        earlyDeparturesCount: 0,
        holidaysWorked: 0,
        remarks: singleForm.remarks || 'Historical record',
      },
      totalDays,
      payableDays,
      lossOfPayDays: lopDays,
      basicPay: Number(singleForm.basicPay),
      hra: Number(singleForm.hra),
      dearnessAllowance: Number(singleForm.dearnessAllowance || 0),
      conveyanceAllowance: Number(singleForm.conveyanceAllowance),
      medicalAllowance: 0,
      specialAllowance: Number(singleForm.specialAllowance),
      overtimePay: Number(singleForm.overtimePay),
      holidayWorkPay: Number(singleForm.holidayWorkPay),
      performanceBonus: Number(singleForm.performanceBonus),
      reimbursements: 0,
      grossEarnings: singleGross,
      providentFund: Number(singleForm.providentFund),
      employerPF: Number(singleForm.employerPF),
      esi: 0,
      professionalTax: Number(singleForm.professionalTax),
      incomeTaxTDS: 0,
      lossOfPayDeduction: Number(singleForm.lossOfPayDeduction),
      lateDeduction: Number(singleForm.lateDeduction),
      loanAdvance: 0,
      otherDeductions: Number(singleForm.otherDeductions),
      totalDeductions: singleDeductions,
      netPay: singleNet,
      netPayInWords: `${singleNet.toLocaleString('en-US')} ${settings.currency || 'USD'}`,
      paymentMethod: singleForm.paymentMethod,
      paymentReference: singleForm.paymentReference || `HIST-REF-${singleForm.month.replace('-', '')}-${targetEmp.empId}`,
      paymentStatus: 'paid',
      paidAt: singleForm.disbursedDate ? new Date(singleForm.disbursedDate).toISOString() : new Date().toISOString(),
      status: 'approved',
      isCustomAdjusted: false,
      lastUpdated: new Date().toISOString(),
    };

    onSaveHistoricalPayslip(newRecord);
    setActiveTab('list');
    setSelectedEmpFilter(targetEmp.empId);
  };

  // Download Sample Template for Past Payslips with all Payslip fields
  const handleDownloadSampleExcel = () => {
    const templateRows = employees.map(emp => ({
      'Employee ID': emp.empId,
      'Employee Name': emp.name,
      'Department': emp.department,
      'Pay Month (YYYY-MM)': '2026-07',
      'Total Month Days': 30,
      'Days Present': 28,
      'Paid Leaves': 2,
      'Loss of Pay (LOP) Days': 0,
      'Overtime Hours': 4,
      'Basic Pay': (emp.baseSalary * 0.5) || 5000,
      'HRA': (emp.baseSalary * 0.2) || 2000,
      'Conveyance Allowance': 800,
      'Special Allowance': (emp.baseSalary * 0.3) || 1200,
      'Overtime Pay': 150,
      'Performance Bonus': 0,
      'Provident Fund (PF)': (emp.baseSalary * 0.06) || 600,
      'Professional Tax (PT)': 200,
      'Loss of Pay (LOP) Deduction': 0,
      'Late Arrival Penalty': 0,
      'Other Deductions': 0,
      'Payment Method (bank_transfer/cash/upi/cheque)': emp.preferredPaymentMethod || 'bank_transfer',
      'Payment Reference': `ACH-202607-${emp.empId}`,
      'Disbursed Date (YYYY-MM-DD)': '2026-07-31',
      'Remarks': 'Past salary disbursed'
    }));

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historical_Payslips');
    XLSX.writeFile(wb, 'Historical_Employee_Payslips_Template.xlsx');
  };

  // Bulk File Upload Processor
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          setUploadStatus({ success: 0, errors: ['The uploaded file contains no data rows.'] });
          return;
        }

        const newRecords: SalaryBreakdown[] = [];
        const errors: string[] = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const rawEmpId = row['Employee ID'] || row['empId'] || row['Emp ID'];
          const rawMonth = row['Pay Month (YYYY-MM)'] || row['Month'] || row['month'] || '2026-07';

          if (!rawEmpId) {
            errors.push(`Row ${rowNum}: Missing Employee ID.`);
            return;
          }

          const targetEmp = employees.find(e => 
            e.empId.toLowerCase().trim() === String(rawEmpId).toLowerCase().trim() ||
            e.name.toLowerCase().trim() === String(row['Employee Name'] || '').toLowerCase().trim()
          );

          if (!targetEmp) {
            errors.push(`Row ${rowNum}: Employee ID "${rawEmpId}" not found in current employee roster.`);
            return;
          }

          const totalDays = Number(row['Total Month Days'] || row['totalDays'] || 30);
          const lopDays = Number(row['Loss of Pay (LOP) Days'] || row['lossOfPayDays'] || row['unpaidLeaves'] || 0);
          const daysPresent = Number(row['Days Present'] || row['daysPresent'] || (totalDays - lopDays));
          const paidLeaves = Number(row['Paid Leaves'] || row['paidLeaves'] || 0);
          const overtimeHours = Number(row['Overtime Hours'] || row['overtimeHours'] || 0);
          const payableDays = Math.max(0, totalDays - lopDays);

          const basicPay = Number(row['Basic Pay'] || row['basicPay'] || 0);
          const hra = Number(row['HRA'] || row['hra'] || 0);
          const conveyance = Number(row['Conveyance Allowance'] || row['conveyanceAllowance'] || 0);
          const medical = Number(row['Medical Allowance'] || row['medicalAllowance'] || 0);
          const special = Number(row['Special Allowance'] || row['specialAllowance'] || 0);
          const overtime = Number(row['Overtime Pay'] || row['overtimePay'] || 0);
          const bonus = Number(row['Performance Bonus'] || row['performanceBonus'] || 0);
          const reimbursements = Number(row['Reimbursements'] || row['reimbursements'] || 0);
          const gross = basicPay + hra + conveyance + medical + special + overtime + bonus + reimbursements;

          const pf = Number(row['Provident Fund (PF)'] || row['PF'] || row['providentFund'] || 0);
          const esi = Number(row['ESI'] || row['esi'] || 0);
          const pt = Number(row['Professional Tax (PT)'] || row['PT'] || row['professionalTax'] || 0);
          const tds = Number(row['Income Tax (TDS)'] || row['TDS'] || row['incomeTaxTDS'] || 0);
          const lopDeduction = Number(row['Loss of Pay (LOP) Deduction'] || row['lossOfPayDeduction'] || 0);
          const lateDeduction = Number(row['Late Arrival Penalty'] || row['lateDeduction'] || 0);
          const otherDeductions = Number(row['Other Deductions'] || row['otherDeductions'] || 0);
          const deductions = pf + esi + pt + tds + lopDeduction + lateDeduction + otherDeductions;
          const net = Math.max(0, gross - deductions);

          const monthStr = String(rawMonth).trim();
          const periodLabel = formatMonthLabel(monthStr);

          const record: SalaryBreakdown = {
            id: `hist-${targetEmp.empId}-${monthStr}-${Date.now()}-${idx}`,
            empId: targetEmp.empId,
            month: monthStr,
            periodLabel,
            profile: targetEmp,
            attendance: {
              empId: targetEmp.empId,
              employeeName: targetEmp.name,
              department: targetEmp.department,
              totalMonthDays: totalDays,
              daysPresent,
              daysAbsent: lopDays,
              halfDays: 0,
              paidLeaves,
              unpaidLeaves: lopDays,
              overtimeHours,
              holidayOvertimeHours: 0,
              lateArrivalsCount: 0,
              earlyDeparturesCount: 0,
              holidaysWorked: 0,
              remarks: String(row['Remarks'] || 'Bulk imported historical payslip'),
            },
            totalDays,
            payableDays,
            lossOfPayDays: lopDays,
            basicPay,
            hra,
            dearnessAllowance: Number(row['Dearness Allowance (DA)'] || row['DA'] || row['dearnessAllowance'] || 0),
            conveyanceAllowance: conveyance,
            medicalAllowance: medical,
            specialAllowance: special,
            overtimePay: overtime,
            holidayWorkPay: 0,
            performanceBonus: bonus,
            reimbursements,
            grossEarnings: gross,
            providentFund: pf,
            employerPF: pf,
            esi,
            professionalTax: pt,
            incomeTaxTDS: tds,
            lossOfPayDeduction: lopDeduction,
            lateDeduction,
            loanAdvance: Number(row['Loan / Advances'] || row['loanAdvance'] || 0),
            otherDeductions,
            totalDeductions: deductions,
            netPay: net,
            netPayInWords: `${net.toLocaleString('en-US')} ${settings.currency || 'USD'}`,
            paymentMethod: (row['Payment Method (bank_transfer/cash/upi/cheque)'] || targetEmp.preferredPaymentMethod || 'bank_transfer') as PaymentMethod,
            paymentReference: String(row['Payment Reference'] || `ACH-${monthStr.replace('-', '')}-${targetEmp.empId}`),
            paymentStatus: 'paid',
            paidAt: row['Disbursed Date (YYYY-MM-DD)'] ? new Date(row['Disbursed Date (YYYY-MM-DD)']).toISOString() : new Date().toISOString(),
            status: 'approved',
            isCustomAdjusted: false,
            lastUpdated: new Date().toISOString(),
          };

          newRecords.push(record);
        });

        if (newRecords.length > 0) {
          onBulkIngestHistorical(newRecords);
          setUploadStatus({ success: newRecords.length, errors });
        } else {
          setUploadStatus({ success: 0, errors: errors.length > 0 ? errors : ['No valid records could be extracted.'] });
        }
      } catch (err: any) {
        setUploadStatus({ success: 0, errors: [`Failed to parse file: ${err.message}`] });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">
                  Historical Payslips & Past Records Archive
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {historicalSalaries.length} Records Stored
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Access, view, download PDF, or import historical salary slips for past months/years
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex rounded-lg bg-slate-200/80 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  activeTab === 'list' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Archive Records ({filteredRecords.length})
              </button>
              {currentRole !== 'employee' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add_single')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center space-x-1 ${
                      activeTab === 'add_single' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Past Payslip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bulk_upload')}
                    className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center space-x-1 ${
                      activeTab === 'bulk_upload' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>
                </>
              )}
            </div>

            <button 
              type="button"
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Historical Records List & Timeline */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Filters Bar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, ID or month..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                <select
                  value={selectedEmpFilter}
                  onChange={(e) => setSelectedEmpFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">All Employees ({employees.length})</option>
                  {employees.map(emp => (
                    <option key={emp.empId} value={emp.empId}>
                      {emp.name} ({emp.empId})
                    </option>
                  ))}
                </select>
              </div>

              {currentRole !== 'employee' && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('add_single')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Past Payslip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bulk_upload')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bulk Upload Excel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredRecords.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">No Past Payslips Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {selectedEmpFilter !== 'ALL' 
                        ? 'No historical payslip records found for this employee yet.'
                        : 'No historical payslip records matching your filter.'}
                    </p>
                  </div>
                  {currentRole !== 'employee' && (
                    <div className="pt-2 flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('add_single')}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
                      >
                        Add Past Payslip
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('bulk_upload')}
                        className="px-3.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                      >
                        Upload Excel Data
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Pay Period</th>
                      <th className="p-3.5 text-right">Gross Pay</th>
                      <th className="p-3.5 text-right">Deductions</th>
                      <th className="p-3.5 text-right">Net Salary</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition">
                        
                        {/* Employee */}
                        <td className="p-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                              {record.profile?.avatarUrl ? (
                                <img src={record.profile.avatarUrl} alt={record.profile.name} className="w-full h-full object-cover" />
                              ) : (
                                record.profile?.name.charAt(0) || 'E'
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{record.profile?.name}</div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {record.profile?.empId} • {record.profile?.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Period */}
                        <td className="p-3.5">
                          <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{record.periodLabel}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{record.month}</div>
                        </td>

                        {/* Gross */}
                        <td className="p-3.5 text-right text-slate-700 font-medium">
                          {sym} {(record.grossEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Deductions */}
                        <td className="p-3.5 text-right text-rose-600 font-medium">
                          -{sym} {(record.totalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Net Salary */}
                        <td className="p-3.5 text-right font-extrabold text-emerald-700 bg-emerald-50/30">
                          {sym} {(record.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Approved
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center space-x-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onViewPaySlip(record);
                              }}
                              className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition cursor-pointer"
                              title="View Interactive Payslip"
                            >
                              <Eye className="w-3.5 h-3.5 inline mr-1" />
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => openWhatsAppPayslip(record, settings)}
                              className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                              title={`Share via WhatsApp to ${record.profile?.name}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => generatePaySlipPDF(record, settings)}
                              className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                              title="Download Official PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {currentRole !== 'employee' && onDeleteHistoricalPayslip && (
                              <button
                                type="button"
                                onClick={() => onDeleteHistoricalPayslip(record.id)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Past Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Add Single Historical Payslip (Mirroring Full Payslip Structure) */}
        {activeTab === 'add_single' && (
          <form onSubmit={handleSingleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-slate-50/50">
            
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Section 1: Employee Selection & Profile Overview */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-2xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs">1. Employee Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Select Employee *</label>
                  <select
                    value={singleForm.empId}
                    onChange={(e) => {
                      const found = employees.find(emp => emp.empId === e.target.value);
                      setSingleForm(prev => ({
                        ...prev,
                        empId: e.target.value,
                        basicPay: found ? Math.round(found.baseSalary * 0.5) : prev.basicPay,
                        hra: found ? Math.round(found.baseSalary * 0.2) : prev.hra,
                        specialAllowance: found ? Math.round(found.baseSalary * 0.3) : prev.specialAllowance,
                        providentFund: found ? Math.round(found.baseSalary * 0.06) : prev.providentFund,
                        paymentMethod: (found?.preferredPaymentMethod || prev.paymentMethod) as PaymentMethod,
                      }));
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp.empId} value={emp.empId}>
                        {emp.name} ({emp.empId}) — {emp.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Pay Period Month (YYYY-MM) *</label>
                  <input
                    type="month"
                    value={singleForm.month}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Disbursed Date</label>
                  <input
                    type="date"
                    value={singleForm.disbursedDate}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, disbursedDate: e.target.value }))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  />
                </div>
              </div>

              {(() => {
                const foundEmp = employees.find(emp => emp.empId === singleForm.empId);
                return foundEmp ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Designation:</span>
                      <span className="font-semibold text-slate-800">{foundEmp.designation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Department:</span>
                      <span className="font-semibold text-slate-800">{foundEmp.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Bank Account:</span>
                      <span className="font-mono font-semibold text-slate-800">{foundEmp.bankAccountNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">PAN / Tax ID:</span>
                      <span className="font-mono font-semibold text-slate-800">{foundEmp.panNumber || 'N/A'}</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Section 2: Attendance & Working Days Summary */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs">2. Attendance & Working Days Summary</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Total Month Days</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={singleForm.totalDays}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, totalDays: parseInt(e.target.value, 10) || 30 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Days Present</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={singleForm.daysPresent}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, daysPresent: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Paid Leaves</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={singleForm.paidLeaves}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, paidLeaves: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Loss of Pay (LOP) Days</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={singleForm.lossOfPayDays}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, lossOfPayDays: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Overtime Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={singleForm.overtimeHours}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, overtimeHours: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Earnings & Allowances */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs">3. Earnings & Allowances</h3>
                </div>
                <span className="text-emerald-700 font-bold">
                  Total Gross: {sym} {singleGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Basic Salary ({sym}) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.basicPay}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, basicPay: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">HRA ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.hra}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, hra: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Dearness Allowance (DA) ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.dearnessAllowance}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, dearnessAllowance: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Conveyance Allowance ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.conveyanceAllowance}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, conveyanceAllowance: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Special Allowance ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.specialAllowance}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, specialAllowance: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Overtime Pay ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.overtimePay}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, overtimePay: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Performance Bonus ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.performanceBonus}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, performanceBonus: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Deductions */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-slate-900 text-xs">4. Statutory & Tax Deductions</h3>
                </div>
                <span className="text-rose-700 font-bold">
                  Total Deductions: -{sym} {singleDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Provident Fund (PF) ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.providentFund}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, providentFund: parseFloat(e.target.value) || 0, employerPF: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Professional Tax (PT) ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.professionalTax}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, professionalTax: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">LOP Deduction ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.lossOfPayDeduction}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, lossOfPayDeduction: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Late Penalty ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.lateDeduction}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, lateDeduction: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Other Deductions / Loan ({sym})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={singleForm.otherDeductions}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, otherDeductions: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-rose-700"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Statement Notes & Remarks */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs">5. Statement Notes & Remarks</h3>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Remarks / Statement Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved and archived historical payslip"
                  value={singleForm.remarks}
                  onChange={(e) => setSingleForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Section 6: Live Net Pay Calculation & Submit */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-[11px] font-bold text-indigo-900 uppercase">Calculated Historical Net Pay</div>
                <div className="text-2xl font-extrabold text-indigo-700">
                  {sym} {singleNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-600">
                  Gross: {sym} {singleGross.toLocaleString('en-US', { minimumFractionDigits: 2 })} • Deductions: -{sym} {singleDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-bold text-xs text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Save Historical Payslip
                </button>
              </div>
            </div>

          </form>
        )}

        {/* Tab 3: Bulk Excel Upload for Past Months */}
        {activeTab === 'bulk_upload' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-indigo-950 text-sm flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Bulk Ingest Historical Payslips Excel</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Upload an Excel spreadsheet with multi-month past payslips for all historical employees at once.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 font-bold text-xs shadow-2xs transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Download Excel Template</span>
              </button>
            </div>

            {/* Dropzone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-indigo-50/30 transition cursor-pointer group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 flex items-center justify-center mx-auto mb-3 transition">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">Click to Select or Drop Historical Excel File</h4>
              <p className="text-xs text-slate-500 mt-1">
                Supports .xlsx, .xls, and .csv with columns: Employee ID, Month (YYYY-MM), Basic, HRA, Allowances, PF, TDS, Net Pay.
              </p>
            </div>

            {/* Upload Feedback */}
            {uploadStatus && (
              <div className={`p-4 rounded-xl border ${
                uploadStatus.success > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {uploadStatus.success > 0 ? (
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Successfully ingested {uploadStatus.success} historical payslip records into the software!</span>
                  </div>
                ) : null}

                {uploadStatus.errors.length > 0 && (
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div className="font-bold text-rose-900">Notes / Issues:</div>
                    {uploadStatus.errors.slice(0, 5).map((err, i) => (
                      <div key={i} className="text-rose-700">• {err}</div>
                    ))}
                    {uploadStatus.errors.length > 5 && (
                      <div className="text-rose-500 italic">...and {uploadStatus.errors.length - 5} more</div>
                    )}
                  </div>
                )}

                {uploadStatus.success > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      View Archive Records Table
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing past payslips database for {employees.length} employees
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 font-semibold text-slate-700 cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
