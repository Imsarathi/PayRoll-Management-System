import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  FileText, 
  Edit3, 
  CheckSquare, 
  Square, 
  Download, 
  Send, 
  CheckCircle2, 
  Sparkles,
  Info,
  Clock,
  ArrowUpDown,
  UserPlus,
  Trash2,
  AlertTriangle,
  Banknote,
  Landmark,
  Smartphone,
  Users,
  Phone,
  Mail,
  UserCog,
  MessageCircle
} from 'lucide-react';
import { SalaryBreakdown, CompanySettings, UserRole, SalaryStructureType, PaymentMethod, EmployeeProfile } from '../types/payroll';
import { generatePaySlipPDF } from '../utils/pdfGenerator';
import { openWhatsAppPayslip } from '../utils/whatsappHelper';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PayrollGridProps {
  salaries: SalaryBreakdown[];
  settings: CompanySettings;
  currentRole: UserRole;
  onViewPaySlip: (salary: SalaryBreakdown) => void;
  onBulkApprove: (selectedIds: string[]) => void;
  onBulkDownloadPDFs: (selectedSalaries: SalaryBreakdown[]) => void;
  onOpenAddEmployee?: () => void;
  onEditEmployee?: (employee: EmployeeProfile) => void;
  onOpenEmployeeDirectory?: () => void;
  onDeleteEmployee?: (empId: string, name: string) => void;
  onClearAllEmployees?: () => void;
  onUpdatePaymentMethod?: (empId: string, method: PaymentMethod) => void;
  onBulkSetPaymentMethod?: (empIds: string[], method: PaymentMethod) => void;
}

export const PayrollGrid: React.FC<PayrollGridProps> = ({
  salaries,
  settings,
  currentRole,
  onViewPaySlip,
  onBulkApprove,
  onBulkDownloadPDFs,
  onOpenAddEmployee,
  onEditEmployee,
  onOpenEmployeeDirectory,
  onDeleteEmployee,
  onClearAllEmployees,
  onUpdatePaymentMethod,
  onBulkSetPaymentMethod,
}) => {
  const sym = settings.currencySymbol || '$';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStructure, setSelectedStructure] = useState('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal confirmation states (replacing window.confirm which is blocked in iFrame sandboxes)
  const [deleteTarget, setDeleteTarget] = useState<{ empId: string; name: string } | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  // Extract unique departments
  const departments = Array.from(new Set(salaries.map(s => s.profile.department || 'General')));

  // Filtering
  const filteredSalaries = salaries.filter(s => {
    const matchesSearch = 
      s.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profile.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profile.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.profile.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'ALL' || s.profile.department === selectedDept;
    const matchesStructure = selectedStructure === 'ALL' || s.profile.structureType === selectedStructure;
    const matchesPaymentMode = selectedPaymentMode === 'ALL' || (s.paymentMethod || 'bank_transfer') === selectedPaymentMode;

    return matchesSearch && matchesDept && matchesStructure && matchesPaymentMode;
  });

  const handleSelectAll = () => {
    if (selectedIds.size === filteredSalaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSalaries.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedList = filteredSalaries.filter(s => selectedIds.has(s.id));

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Search & Filter Header Strip */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50/70">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="payroll-search-input"
            type="text"
            placeholder="Search by Employee Name, ID, Department, or Designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-md text-xs">
            <span className="text-slate-500 font-medium">Dept:</span>
            <select
              id="filter-dept-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Salary Structure Filter */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-md text-xs">
            <span className="text-slate-500 font-medium">Type:</span>
            <select
              id="filter-structure-select"
              value={selectedStructure}
              onChange={(e) => setSelectedStructure(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Structures</option>
              <option value="fixed">Fixed Monthly</option>
              <option value="hourly">Hourly Contract</option>
              <option value="contract">Contractor</option>
              <option value="piece_rate">Piece-rate</option>
            </select>
          </div>

          {/* Payment Mode Filter (Bank vs Cash) */}
          <div className="flex items-center space-x-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-md text-xs">
            <span className="text-slate-500 font-medium">Payment Mode:</span>
            <select
              id="filter-payment-mode-select"
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Modes (Bank & Cash)</option>
              <option value="bank_transfer">🏦 Direct Bank Transfer</option>
              <option value="cash">💵 Paid by Cash</option>
              <option value="upi">📱 UPI / Mobile</option>
              <option value="cheque">📝 Cheque</option>
            </select>
          </div>

          {/* Add Employee Action */}
          {onOpenAddEmployee && currentRole !== 'employee' && (
            <button
              id="btn-grid-add-employee"
              onClick={onOpenAddEmployee}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          )}

          {/* Clear / Reset Roster Action */}
          {onClearAllEmployees && currentRole === 'super_admin' && (
            <button
              id="btn-grid-clear-all"
              onClick={() => setIsClearAllOpen(true)}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition cursor-pointer"
              title="Clear all mock/sample employees to start fresh with your own team"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Sample Data</span>
            </button>
          )}
        </div>

      </div>

      {/* Bulk Selection Action Bar */}
      {selectedIds.size > 0 && currentRole !== 'employee' && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900 animate-in fade-in">
          <span className="font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? 'employee' : 'employees'} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {onBulkSetPaymentMethod && (
              <>
                <button
                  onClick={() => onBulkSetPaymentMethod(Array.from(selectedIds), 'cash')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition inline-flex items-center space-x-1 cursor-pointer"
                  title="Mark selected as Paid by Cash"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Set Mode: Paid by Cash</span>
                </button>
                <button
                  onClick={() => onBulkSetPaymentMethod(Array.from(selectedIds), 'bank_transfer')}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition inline-flex items-center space-x-1 cursor-pointer"
                  title="Mark selected as Bank Transfer"
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Set Mode: Bank Transfer</span>
                </button>
              </>
            )}

            <button
              onClick={() => onBulkApprove(Array.from(selectedIds))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium shadow-2xs transition"
            >
              Approve Selected
            </button>
            <button
              onClick={() => onBulkDownloadPDFs(selectedList)}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-blue-800 border border-blue-300 font-medium shadow-2xs transition"
            >
              Download Selected PDFs
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              {currentRole !== 'employee' && (
                <th className="p-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="cursor-pointer text-slate-500 hover:text-slate-800">
                    {selectedIds.size === filteredSalaries.length && filteredSalaries.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
              )}
              <th className="p-3">Employee</th>
              <th className="p-3">Department & Role</th>
              <th className="p-3 text-center">Attendance</th>
              <th className="p-3 text-center">Payment Mode</th>
              <th className="p-3 text-right">Basic Pay</th>
              <th className="p-3 text-right">Overtime</th>
              <th className="p-3 text-right">Gross Earnings</th>
              <th className="p-3 text-right">Deductions</th>
              <th className="p-3 text-right">Net Take-Home</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredSalaries.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-slate-400">
                  No employee payroll records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredSalaries.map((s) => {
                const isSelected = selectedIds.has(s.id);
                return (
                  <tr 
                    key={s.id} 
                    className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}
                  >
                    {currentRole !== 'employee' && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(s.id)}
                          className="cursor-pointer text-slate-400 hover:text-slate-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}

                    {/* Employee info */}
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs overflow-hidden">
                          {s.profile.avatarUrl ? (
                            <img src={s.profile.avatarUrl} alt={s.profile.name} className="w-full h-full object-cover" />
                          ) : (
                            s.profile.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {s.profile.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1">
                            <span>{s.profile.empId}</span>
                            {s.profile.isProbation && <span className="text-amber-600 font-semibold">• Probation</span>}
                            {s.profile.mobileNumber && (
                              <span className="text-emerald-700 font-medium hidden xl:inline" title={`Mobile: ${s.profile.mobileNumber}`}>
                                • 📞 {s.profile.mobileNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Designation */}
                    <td className="p-3">
                      <div className="text-slate-800 font-medium">{s.profile.department}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{s.profile.designation}</div>
                    </td>

                    {/* Attendance stats: strictly Total Present Days count only */}
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                        {s.attendance.daysPresent} Days Present
                      </span>
                    </td>

                    {/* Payment Mode (Bank Transfer vs Cash vs UPI vs Cheque) */}
                    <td className="p-3 text-center">
                      {onUpdatePaymentMethod && currentRole !== 'employee' ? (
                        <div className="inline-flex flex-col items-center">
                          <select
                            value={s.paymentMethod || 'bank_transfer'}
                            onChange={(e) => onUpdatePaymentMethod(s.empId, e.target.value as PaymentMethod)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border focus:outline-none cursor-pointer transition ${
                              (s.paymentMethod || 'bank_transfer') === 'cash'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : (s.paymentMethod || 'bank_transfer') === 'upi'
                                ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                                : (s.paymentMethod || 'bank_transfer') === 'cheque'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                            }`}
                            title="Click to switch Payment Mode (Bank / Cash / UPI / Cheque)"
                          >
                            <option value="bank_transfer">🏦 Bank</option>
                            <option value="cash">💵 Cash</option>
                            <option value="upi">📱 UPI</option>
                            <option value="cheque">📝 Cheque</option>
                          </select>
                          {(s.paymentMethod || 'bank_transfer') === 'cash' ? (
                            <span className="text-[9.5px] text-emerald-700 font-semibold mt-0.5">Paid in Cash</span>
                          ) : (
                            <span className="text-[9.5px] text-slate-400 font-medium mt-0.5 truncate max-w-[85px]" title={s.profile.bankName}>
                              {s.profile.bankName ? s.profile.bankName.split(' ')[0] : 'Bank'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            (s.paymentMethod || 'bank_transfer') === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : (s.paymentMethod || 'bank_transfer') === 'upi'
                              ? 'bg-purple-100 text-purple-800'
                              : (s.paymentMethod || 'bank_transfer') === 'cheque'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {(s.paymentMethod || 'bank_transfer') === 'cash' ? '💵 Cash' :
                             (s.paymentMethod || 'bank_transfer') === 'upi' ? '📱 UPI' :
                             (s.paymentMethod || 'bank_transfer') === 'cheque' ? '📝 Cheque' : '🏦 Bank'}
                          </span>
                          {(s.paymentMethod || 'bank_transfer') === 'cash' ? (
                            <div className="text-[9.5px] text-emerald-700 font-medium mt-0.5">Paid by Cash</div>
                          ) : (
                            <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">Direct Deposit</div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Basic Pay */}
                    <td className="p-3 text-right text-slate-800 font-medium">
                      {sym} {(s.basicPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Overtime */}
                    <td className="p-3 text-right">
                      {(s.overtimePay ?? 0) > 0 ? (
                        <span className="font-semibold text-purple-700">
                          +{sym} {(s.overtimePay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Gross */}
                    <td className="p-3 text-right font-bold text-slate-900">
                      {sym} {(s.grossEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Deductions */}
                    <td className="p-3 text-right text-rose-600 font-medium">
                      -{sym} {(s.totalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Net Pay */}
                    <td className="p-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold text-xs border border-emerald-200">
                        {sym} {(s.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {s.isCustomAdjusted && (
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          *Adjusted
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {onEditEmployee && currentRole !== 'employee' && (
                          <button
                            onClick={() => onEditEmployee(s.profile)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title={`Edit ${s.profile.name}'s Profile (Mobile, Email, DOB, Salary)`}
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onViewPaySlip(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="View Pay Slip Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openWhatsAppPayslip(s, settings)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title={`Send WhatsApp payslip advice to ${s.profile.name} (${s.profile.phone || 'no phone'})`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => generatePaySlipPDF(s, settings)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title="Download PDF Pay Slip"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {onDeleteEmployee && (currentRole === 'super_admin' || currentRole === 'hr_manager') && (
                          <button
                            onClick={() => setDeleteTarget({ empId: s.profile.empId, name: s.profile.name })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title={`Remove ${s.profile.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Footer Statistics */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 gap-2">
        <div>
          Showing {filteredSalaries.length} of {salaries.length} payroll entries
        </div>
        <div className="flex items-center space-x-4">
          <span>Total Net Payout in View: <strong className="text-slate-900 font-bold">{sym} {filteredSalaries.reduce((acc, s) => acc + s.netPay, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget && onDeleteEmployee) {
            onDeleteEmployee(deleteTarget.empId, deleteTarget.name);
          }
        }}
        title="Remove Employee from Payroll"
        message={`Are you sure you want to permanently remove ${deleteTarget?.name} (${deleteTarget?.empId}) from the company roster? All associated attendance and salary calculations will be cleared.`}
        confirmLabel="Remove Employee"
        isDangerous={true}
      />

      <ConfirmDeleteModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={() => {
          if (onClearAllEmployees) {
            onClearAllEmployees();
          }
        }}
        title="Clear All Sample Employees"
        message="Are you sure you want to clear all current employees and start with an empty roster? You will be able to add your own real employees or upload your attendance Excel spreadsheet."
        confirmLabel="Clear All Data"
        isDangerous={true}
      />

    </div>
  );
};
