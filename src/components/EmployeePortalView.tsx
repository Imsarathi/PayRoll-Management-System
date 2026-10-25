import React, { useState } from 'react';
import { 
  User, 
  Download, 
  Calendar, 
  Wallet,
  CheckCircle2,
  Receipt,
  History,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { SalaryBreakdown, CompanySettings } from '../types/payroll';
import { generatePaySlipPDF } from '../utils/pdfGenerator';

interface EmployeePortalViewProps {
  salaries: SalaryBreakdown[];
  historicalSalaries?: SalaryBreakdown[];
  settings: CompanySettings;
  onViewPaySlip: (salary: SalaryBreakdown) => void;
  onOpenHistoricalArchive?: (empId?: string) => void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  salaries,
  historicalSalaries = [],
  settings,
  onViewPaySlip,
  onOpenHistoricalArchive,
}) => {
  const sym = settings?.currencySymbol || '$';
  const [selectedEmpId, setSelectedEmpId] = useState(salaries[0]?.profile?.empId || '');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('current');

  const currentMonthSalary = salaries.find(s => s.profile?.empId === selectedEmpId) || salaries[0];

  // All historical records for this employee
  const employeePastSalaries = historicalSalaries.filter(s => s.empId === selectedEmpId);
  
  // All combined records (current + historical)
  const allEmployeeStatements = [
    ...(currentMonthSalary ? [currentMonthSalary] : []),
    ...employeePastSalaries
  ];

  // Selected statement for the active display
  const activeSalary = selectedMonthKey === 'current' 
    ? currentMonthSalary 
    : (allEmployeeStatements.find(s => s.month === selectedMonthKey || s.id === selectedMonthKey) || currentMonthSalary);

  if (!activeSalary || !activeSalary.profile) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
        No active employee payroll records found.
      </div>
    );
  }

  const profile = activeSalary.profile;
  const att = activeSalary.attendance || {
    daysPresent: 0,
    paidLeaves: 0,
    overtimeHours: 0,
    lateArrivalsCount: 0,
  };

  const basicPay = activeSalary.basicPay ?? 0;
  const hra = activeSalary.hra ?? 0;
  const conveyance = (activeSalary.conveyanceAllowance ?? 0) + (activeSalary.medicalAllowance ?? 0);
  const specialAllowance = activeSalary.specialAllowance ?? 0;
  const overtimePay = activeSalary.overtimePay ?? 0;
  const performanceBonus = (activeSalary.performanceBonus ?? 0) + (activeSalary.holidayWorkPay ?? 0);
  const grossEarnings = activeSalary.grossEarnings ?? 0;

  const providentFund = activeSalary.providentFund ?? 0;
  const esi = activeSalary.esi ?? 0;
  const professionalTax = activeSalary.professionalTax ?? 0;
  const incomeTaxTDS = activeSalary.incomeTaxTDS ?? 0;
  const lossOfPayDeduction = activeSalary.lossOfPayDeduction ?? 0;
  const lateDeduction = activeSalary.lateDeduction ?? 0;
  const otherDeductions = activeSalary.otherDeductions ?? 0;
  const totalDeductions = activeSalary.totalDeductions ?? 0;
  const netPay = activeSalary.netPay ?? 0;

  return (
    <div className="space-y-6">
      
      {/* Header Banner with Employee Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center font-bold text-lg overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                (profile.name || 'E').charAt(0)
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight">{profile.name}</h2>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-semibold">
                {profile.empId}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {profile.designation} • {profile.department} • Joined: {profile.joinDate || 'Current'}
            </p>
          </div>
        </div>

        {/* Employee & Period Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-2 rounded-xl text-xs">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Employee:</span>
            <select
              value={selectedEmpId}
              onChange={(e) => {
                setSelectedEmpId(e.target.value);
                setSelectedMonthKey('current');
              }}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2"
            >
              {salaries.map((s) => (
                <option key={s.profile?.empId || Math.random()} value={s.profile?.empId} className="bg-slate-900 text-white">
                  {s.profile?.name} ({s.profile?.empId})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 p-2 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Statement:</span>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2"
            >
              <option value="current" className="bg-slate-900 text-white">
                Current ({currentMonthSalary?.periodLabel || 'Active Month'})
              </option>
              {employeePastSalaries.map((hist) => (
                <option key={hist.id} value={hist.id} className="bg-slate-900 text-white">
                  Past: {hist.periodLabel}
                </option>
              ))}
            </select>
          </div>

          {onOpenHistoricalArchive && (
            <button
              type="button"
              onClick={() => onOpenHistoricalArchive(selectedEmpId)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs border border-indigo-500/50 shadow-xs transition cursor-pointer"
              title="Open full past payslips archive"
            >
              <History className="w-3.5 h-3.5" />
              <span>Full Archive ({allEmployeeStatements.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Pay Cycle Statement Overview Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Official Pay Statement • {activeSalary.periodLabel || 'Current Cycle'}
              </span>
            </div>
            
            <div className="mt-3">
              <span className="text-xs text-slate-300 block font-medium">
                {activeSalary.status === 'disbursed' ? 'Net Salary Paid' : 'Net Salary to Pay'}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                {sym} {netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-2 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Verified pay advice generated for {profile.name} ({profile.empId})
              </span>
            </p>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-700">
            <div>
              <span className="text-[11px] text-slate-400 block">Gross Earnings</span>
              <span className="text-sm sm:text-base font-bold text-white">
                {sym} {grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Total Deductions</span>
              <span className="text-sm sm:text-base font-bold text-rose-400">
                -{sym} {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Provident Fund (PF)</span>
              <span className="text-sm sm:text-base font-bold text-blue-300">
                {sym} {providentFund.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Breakdown Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Earnings Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider">Earnings Breakdown</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Gross: {sym}{grossEarnings.toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Basic Pay</span>
                <span className="font-semibold text-slate-900">{sym} {basicPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">House Rent Allowance (HRA)</span>
                <span className="font-semibold text-slate-900">{sym} {hra.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Medical / Conveyance</span>
                <span className="font-semibold text-slate-900">{sym} {conveyance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Special Allowances</span>
                <span className="font-semibold text-slate-900">{sym} {specialAllowance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {overtimePay > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Overtime (O.T. Hrs: {att.overtimeHours || 0}h)</span>
                  <span className="font-semibold text-purple-700">+{sym} {overtimePay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {performanceBonus > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Incentives / Bonus</span>
                  <span className="font-semibold text-emerald-700">+{sym} {performanceBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700">Total Gross Earnings</span>
            <span className="text-emerald-700 font-extrabold text-sm">{sym} {grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Card 2: Deductions Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider">Deductions Breakdown</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                Total: -{sym}{totalDeductions.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Provident Fund (PF)</span>
                <span className="font-semibold text-slate-900">{sym} {providentFund.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600">Professional Tax (PT)</span>
                <span className="font-semibold text-slate-900">{sym} {professionalTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              {lossOfPayDeduction > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Loss of Pay ({activeSalary.lossOfPayDays || 0} days)</span>
                  <span className="font-semibold text-rose-600">-{sym} {lossOfPayDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {lateDeduction > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Late Penalty</span>
                  <span className="font-semibold text-rose-600">-{sym} {lateDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {otherDeductions > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-600">Loan & Salary Advances</span>
                  <span className="font-semibold text-slate-900">-{sym} {otherDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700">Total Deductions</span>
            <span className="text-rose-600 font-extrabold text-sm">-{sym} {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Card 3: Attendance Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider">Attendance Details</span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-600 font-medium">Days Present</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {att.daysPresent || 0} days
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex space-x-2">
            <button
              onClick={() => onViewPaySlip(activeSalary)}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-lg transition text-center cursor-pointer"
            >
              View Full Pay Slip
            </button>
            <button
              onClick={() => generatePaySlipPDF(activeSalary, settings)}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 transition cursor-pointer"
              title="Download Official PDF"
            >
              <Download className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

      </div>

      {/* Pay Statement History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Official Pay Statement History</span>
            </h3>
            <p className="text-xs text-slate-500">
              Verified salary slip and disbursement summary for {profile.name} ({profile.empId})
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-medium">
              {activeSalary.status === 'disbursed' ? 'Net Paid: ' : 'Net Salary: '}
            </span>
            <strong className="text-xs text-emerald-700 font-extrabold">{sym} {netPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Pay Period</th>
                <th className="py-3 px-4">Department / Role</th>
                <th className="py-3 px-4">Gross Earnings</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Salary</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allEmployeeStatements.map((stmt, idx) => {
                const isSelected = (selectedMonthKey === 'current' && idx === 0) || selectedMonthKey === stmt.id || selectedMonthKey === stmt.month;
                return (
                  <tr 
                    key={stmt.id || idx} 
                    className={`hover:bg-slate-50/80 transition ${
                      isSelected ? 'bg-indigo-50/40 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <Calendar className={`w-3.5 h-3.5 ${idx === 0 ? 'text-blue-500' : 'text-indigo-500'}`} />
                        <span>{stmt.periodLabel || 'Pay Period'}</span>
                        {idx === 0 && (
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-sm uppercase">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {stmt.profile?.designation} ({stmt.profile?.department})
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {sym} {(stmt.grossEarnings ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-rose-600 font-medium">
                      -{sym} {(stmt.totalDeductions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 bg-emerald-50/40">
                      {sym} {(stmt.netPay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Approved
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthKey(stmt.id || stmt.month);
                            onViewPaySlip(stmt);
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => generatePaySlipPDF(stmt, settings)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
