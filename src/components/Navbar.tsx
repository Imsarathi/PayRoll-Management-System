import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Settings, 
  BookOpen, 
  UserCheck, 
  Calendar,
  Users,
  History,
  Send,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UserRole, CompanySettings } from '../types/payroll';

interface NavbarProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  companySettings: CompanySettings;
  onOpenSettings: () => void;
  onOpenArchitecture: () => void;
  onOpenUpload: () => void;
  onOpenAuditTrail: () => void;
  onOpenEmployeeDirectory?: () => void;
  onOpenHistoricalArchive?: () => void;
  onOpenDispatchEngine?: () => void;
  employeeCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setCurrentRole,
  selectedMonth,
  setSelectedMonth,
  companySettings,
  onOpenSettings,
  onOpenArchitecture,
  onOpenUpload,
  onOpenAuditTrail,
  onOpenEmployeeDirectory,
  onOpenHistoricalArchive,
  onOpenDispatchEngine,
  employeeCount,
}) => {
  const handlePrevMonth = () => {
    const parts = selectedMonth.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const prevDate = new Date(y, m - 2, 1);
      const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(newMonth);
    }
  };

  const handleNextMonth = () => {
    const parts = selectedMonth.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const nextDate = new Date(y, m, 1);
      const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(newMonth);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200/80 p-1 shadow-xs transition-transform hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs shadow-blue-200">
                {(companySettings.appTitle || 'P').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  {companySettings.appTitle || 'PayMaster Pro'}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                  {companySettings.brandSubTitle || 'Enterprise'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">
                {companySettings.name}
              </p>
            </div>
          </div>

          {/* Center Navigation: Month & Template */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-md text-xs font-medium text-slate-600">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <Calendar className="w-3.5 h-3.5 text-blue-600 mx-0.5" />
              <span className="text-slate-400 font-normal">Month:</span>
              <input
                type="month"
                id="pay-period-input"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                  }
                }}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-xs"
                title="Select any custom month and year for pay cycle"
              />
              <button
                type="button"
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {onOpenEmployeeDirectory && currentRole !== 'employee' && (
              <button
                id="btn-navbar-employees"
                onClick={onOpenEmployeeDirectory}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-800 transition cursor-pointer shadow-2xs"
                title="Manage Employee Directory (View, Search, Edit Mobile, Email, DOB & Salary)"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Manage Employees</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-extrabold">
                  {employeeCount}
                </span>
              </button>
            )}

            {onOpenHistoricalArchive && (
              <button
                id="btn-navbar-history"
                onClick={onOpenHistoricalArchive}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-800 transition cursor-pointer shadow-2xs"
                title="View and manage employee past payslip records and archives"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Past Payslips</span>
              </button>
            )}

            
          </div>

          {/* Right Controls: Role Switcher & Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Role Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <select
                id="user-role-select"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="super_admin" className="bg-white text-slate-900">Super Admin</option>
                <option value="employee" className="bg-white text-slate-900">Employee Self-Service</option>
              </select>
            </div>

            {/* Settings Trigger */}
            {currentRole !== 'employee' && (
              <button
                id="btn-company-settings"
                onClick={onOpenSettings}
                className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-2xs cursor-pointer"
                title="Payroll & Company Configuration"
              >
                <Settings className="w-4 h-4 text-slate-500 hover:text-slate-800" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
