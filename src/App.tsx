import React, { useState, useMemo, useEffect } from 'react';
import { 
  DEFAULT_COMPANY_SETTINGS, 
  INITIAL_EMPLOYEES, 
  INITIAL_ATTENDANCE,
  INITIAL_HISTORICAL_PAYSLIPS
} from './utils/sampleData';
import { 
  CompanySettings, 
  EmployeeProfile, 
  AttendanceRecord, 
  SalaryBreakdown, 
  PayrollStatus, 
  UserRole, 
  AuditLog,
  PaymentMethod
} from './types/payroll';
import { calculateSalaryBreakdown } from './utils/payrollCalculator';
import { 
  exportConsolidatedPayrollExcel, 
  exportDepartmentSummaryExcel, 
  downloadBatchPDFs 
} from './utils/exportUtils';
import { generatePaySlipPDF } from './utils/pdfGenerator';

// Components
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { PayrollGrid } from './components/PayrollGrid';
import { PaySlipModal } from './components/PaySlipModal';
import { DataIngestionModal } from './components/DataIngestionModal';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { AuditTrailModal } from './components/AuditTrailModal';
import { BankTransferModal } from './components/BankTransferModal';
import { BulkDispatchModal } from './components/BulkDispatchModal';
import { EmployeePortalView } from './components/EmployeePortalView';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { EmployeeDirectoryModal } from './components/EmployeeDirectoryModal';
import { EditEmployeeModal } from './components/EditEmployeeModal';
import { HistoricalPayslipModal } from './components/HistoricalPayslipModal';

export default function App() {
  // State
  const [currentRole, setCurrentRole] = useState<UserRole>('super_admin');
  const [selectedMonth, setSelectedMonth] = useState('2026-06');
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('paymaster_settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_COMPANY_SETTINGS;
    return { ...DEFAULT_COMPANY_SETTINGS, ...parsed, currency: 'INR', currencySymbol: '₹' };
  });
  
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => {
    const saved = localStorage.getItem('paymaster_employees');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((p: any) => p.empId === '072023' || p.name === 'Akila R')) {
          return parsed;
        }
      } catch (e) {
        return INITIAL_EMPLOYEES;
      }
    }
    return INITIAL_EMPLOYEES;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('paymaster_attendance');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((a: any) => a.empId === '072023')) {
          return parsed;
        }
      } catch (e) {
        return INITIAL_ATTENDANCE;
      }
    }
    return INITIAL_ATTENDANCE;
  });

  // Historical Payslips storage
  const [historicalSalaries, setHistoricalSalaries] = useState<SalaryBreakdown[]>(() => {
    const saved = localStorage.getItem('paymaster_historical_salaries');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_HISTORICAL_PAYSLIPS;
      }
    }
    return INITIAL_HISTORICAL_PAYSLIPS;
  });

  const [payrollStatus, setPayrollStatus] = useState<PayrollStatus>('draft');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'audit-init-01',
      empId: 'AGT-1005',
      employeeName: 'David Rodriguez',
      fieldChanged: 'Overtime Pay',
      previousValue: '$1,200',
      newValue: '$1,824',
      changedBy: 'Eleanor Vance (HR)',
      timestamp: '2026-08-20T14:32:00.000Z',
      reason: 'Approved 24/7 server migration shift overtime log',
    },
  ]);

  // Modals state
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEmployeeDirectoryOpen, setIsEmployeeDirectoryOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [historicalFilterEmpId, setHistoricalFilterEmpId] = useState<string | undefined>(undefined);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'signature' | 'rules' | 'whatsapp'>('profile');
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isBankTransferOpen, setIsBankTransferOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const [activePaySlip, setActivePaySlip] = useState<SalaryBreakdown | null>(null);

  // Manual Overrides state map (empId -> partial overrides)
  const [salaryOverrides, setSalaryOverrides] = useState<Record<string, Partial<SalaryBreakdown>>>({});
  const [archiveNotification, setArchiveNotification] = useState<string | null>(null);

  // Helper to format any YYYY-MM to readable month label (e.g., 'June 2026', 'July 2026', 'September 2026')
  const formatMonthLabel = (monthStr: string): string => {
    if (!monthStr) return 'Active Cycle';
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

  const periodLabel = formatMonthLabel(selectedMonth);

  // Recalculate salaries whenever employees, attendance, settings, or month change
  const computedSalaries: SalaryBreakdown[] = useMemo(() => {
    const totalMonthDays = companySettings.payCycleDayCount || 30;
    
    return employees.map((emp) => {
      const normEmpId = (emp.empId || '').toLowerCase().trim();
      const normEmpName = (emp.name || '').toLowerCase().trim();

      const att = attendanceRecords.find(a => {
        const aId = (a.empId || '').toLowerCase().trim();
        const aName = (a.employeeName || '').toLowerCase().trim();
        return (aId && aId === normEmpId) || (aName && aName === normEmpName);
      }) || {
        empId: emp.empId,
        employeeName: emp.name,
        department: emp.department,
        totalMonthDays,
        daysPresent: totalMonthDays,
        daysAbsent: 0,
        halfDays: 0,
        paidLeaves: 0,
        unpaidLeaves: 0,
        overtimeHours: 0,
        holidayOvertimeHours: 0,
        lateArrivalsCount: 0,
        earlyDeparturesCount: 0,
        holidaysWorked: 0,
      };

      const calculated = calculateSalaryBreakdown(emp, att, companySettings, selectedMonth, periodLabel);

      // Apply any manual adjustment if present
      if (salaryOverrides[emp.empId]) {
        return {
          ...calculated,
          ...salaryOverrides[emp.empId],
          status: payrollStatus,
        };
      }

      return {
        ...calculated,
        status: payrollStatus,
      };
    });
  }, [employees, attendanceRecords, companySettings, selectedMonth, salaryOverrides, payrollStatus, periodLabel]);

  // Handlers
  const handleSaveSettings = (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    localStorage.setItem('paymaster_settings', JSON.stringify(newSettings));
  };

  // Archive current active payroll cycle into historical past payslips
  const handleArchiveCurrentMonth = () => {
    if (!computedSalaries || computedSalaries.length === 0) return;
    const currentPeriod = formatMonthLabel(selectedMonth);
    
    setHistoricalSalaries(prev => {
      const filtered = prev.filter(p => p.month !== selectedMonth);
      const updated = [...computedSalaries, ...filtered];
      localStorage.setItem('paymaster_historical_salaries', JSON.stringify(updated));
      return updated;
    });

    const newLog: AuditLog = {
      id: `audit-${Date.now()}-archive`,
      empId: 'CYCLE-ARCHIVE',
      employeeName: `All Staff (${computedSalaries.length})`,
      fieldChanged: 'Month Payroll Archived',
      previousValue: 'Active Cycle',
      newValue: `Archived ${computedSalaries.length} payslips for ${currentPeriod} to Past Payslips history`,
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: `User archived payroll run for ${currentPeriod}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setArchiveNotification(`Successfully saved ${computedSalaries.length} payslips for ${currentPeriod} to Past Payslips archive!`);
    setTimeout(() => setArchiveNotification(null), 5000);
  };

  const handleApplyAttendance = (newRecords: AttendanceRecord[], targetMonth?: string) => {
    if (targetMonth && targetMonth !== selectedMonth) {
      setSelectedMonth(targetMonth);
    }

    // 1. Update attendance records
    setAttendanceRecords(newRecords);
    localStorage.setItem('paymaster_attendance', JSON.stringify(newRecords));

    // 2. Auto-sync employees: if any employee in Excel does not exist, auto-create their profile
    setEmployees(prevEmployees => {
      const updatedEmployees = [...prevEmployees];
      let newCount = 0;

      newRecords.forEach(rec => {
        const normRecId = (rec.empId || '').toLowerCase().trim();
        const normRecName = (rec.employeeName || '').toLowerCase().trim();

        const existingIdx = updatedEmployees.findIndex(
          e => (e.empId && e.empId.toLowerCase().trim() === normRecId) || (normRecName && e.name && e.name.toLowerCase().trim() === normRecName)
        );

        if (existingIdx >= 0) {
          const existing = updatedEmployees[existingIdx];
          const updatedEmp = { ...existing };
          if (rec.employeeName && rec.employeeName !== existing.name) {
            updatedEmp.name = rec.employeeName;
          }
          if (rec.department && rec.department !== existing.department) {
            updatedEmp.department = rec.department;
          }
          if (rec.baseSalary && rec.baseSalary > 0) {
            updatedEmp.baseSalary = rec.baseSalary;
          }
          updatedEmployees[existingIdx] = updatedEmp;
        } else {
          newCount++;
          const newEmp: EmployeeProfile = {
            id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            empId: rec.empId,
            name: rec.employeeName || `Employee ${rec.empId}`,
            email: `${(rec.employeeName || rec.empId).toLowerCase().replace(/[^a-z0-9]/g, '.')}@company.com`,
            department: rec.department || 'Operations',
            designation: 'Staff Member',
            joinDate: new Date().toISOString().split('T')[0],
            structureType: 'fixed',
            baseSalary: rec.baseSalary && rec.baseSalary > 0 ? rec.baseSalary : 5000,
            hourlyRate: 35,
            bankName: 'Corporate Bank',
            accountNumber: `482910${Math.floor(1000 + Math.random() * 9000)}`,
            routingOrIfsc: 'CHASUS33',
            panOrTaxNumber: `TX-${Math.floor(10000 + Math.random() * 90000)}-A`,
          };
          updatedEmployees.push(newEmp);
        }
      });

      localStorage.setItem('paymaster_employees', JSON.stringify(updatedEmployees));
      return updatedEmployees;
    });

    setSalaryOverrides({}); // reset manual overrides for fresh run
    setPayrollStatus('draft');

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      empId: 'BULK-IMPORT',
      employeeName: 'All Uploaded Staff',
      fieldChanged: 'Attendance Spreadsheet Batch Ingestion',
      previousValue: 'Previous State',
      newValue: `Updated ${newRecords.length} records`,
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: 'Biometric/Excel Attendance data synced with payroll calculator',
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleAddEmployee = (newEmployee: EmployeeProfile) => {
    handleAddMultipleEmployees([newEmployee]);
  };

  const handleSaveEditEmployee = (updatedEmployee: EmployeeProfile) => {
    setEmployees(prev => {
      const updated = prev.map(e => e.empId === updatedEmployee.empId ? updatedEmployee : e);
      localStorage.setItem('paymaster_employees', JSON.stringify(updated));
      return updated;
    });

    setAttendanceRecords(prev => {
      const updated = prev.map(a => {
        if (a.empId === updatedEmployee.empId) {
          return {
            ...a,
            employeeName: updatedEmployee.name,
            department: updatedEmployee.department,
            baseSalary: updatedEmployee.baseSalary,
          };
        }
        return a;
      });
      localStorage.setItem('paymaster_attendance', JSON.stringify(updated));
      return updated;
    });

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      empId: updatedEmployee.empId,
      employeeName: updatedEmployee.name,
      fieldChanged: 'Employee Profile & Structure Update',
      previousValue: 'Previous Profile',
      newValue: `Updated (${updatedEmployee.designation}, ${updatedEmployee.department}, Base: ${companySettings.currencySymbol}${(updatedEmployee.baseSalary ?? 0).toLocaleString()})`,
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: 'Employee profile updated in Employee Directory',
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleAddMultipleEmployees = (newEmployees: EmployeeProfile[]) => {
    if (!newEmployees || newEmployees.length === 0) return;

    setEmployees(prev => {
      const updated = [...prev, ...newEmployees];
      localStorage.setItem('paymaster_employees', JSON.stringify(updated));
      return updated;
    });

    // Create default full attendance records for all new employees
    const defaultAtts: AttendanceRecord[] = newEmployees.map(emp => ({
      empId: emp.empId,
      employeeName: emp.name,
      department: emp.department,
      totalMonthDays: companySettings.payCycleDayCount || 30,
      daysPresent: companySettings.payCycleDayCount || 30,
      daysAbsent: 0,
      halfDays: 0,
      paidLeaves: 0,
      unpaidLeaves: 0,
      overtimeHours: 0,
      holidayOvertimeHours: 0,
      lateArrivalsCount: 0,
      earlyDeparturesCount: 0,
      holidaysWorked: 0,
    }));

    setAttendanceRecords(prev => {
      const updated = [...prev, ...defaultAtts];
      localStorage.setItem('paymaster_attendance', JSON.stringify(updated));
      return updated;
    });

    const newLogs: AuditLog[] = newEmployees.map((emp, idx) => ({
      id: `audit-${Date.now()}-${idx}`,
      empId: emp.empId,
      employeeName: emp.name,
      fieldChanged: newEmployees.length > 1 ? 'Bulk Employee Onboarding' : 'Employee Onboarding',
      previousValue: 'None',
      newValue: `Added (${emp.designation}, ${emp.department}, Base: ${companySettings.currencySymbol}${(emp.baseSalary ?? 0).toLocaleString()})`,
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: newEmployees.length > 1 
        ? `Batch onboarded ${newEmployees.length} employees in one step` 
        : 'New employee onboarded to payroll roster',
    }));

    setAuditLogs(prev => [...newLogs, ...prev]);
  };

  const handleDeleteEmployee = (empId: string, name: string) => {
    setEmployees(prev => {
      const updated = prev.filter(e => e.empId !== empId);
      localStorage.setItem('paymaster_employees', JSON.stringify(updated));
      return updated;
    });

    setAttendanceRecords(prev => {
      const updated = prev.filter(a => a.empId !== empId);
      localStorage.setItem('paymaster_attendance', JSON.stringify(updated));
      return updated;
    });

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      empId: empId,
      employeeName: name,
      fieldChanged: 'Employee Offboarding / Removal',
      previousValue: 'Active Profile',
      newValue: 'Removed from Roster',
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: 'Employee removed from company payroll roster',
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleClearAllEmployees = () => {
    setEmployees([]);
    setAttendanceRecords([]);
    setSalaryOverrides({});
    localStorage.setItem('paymaster_employees', JSON.stringify([]));
    localStorage.setItem('paymaster_attendance', JSON.stringify([]));

    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      empId: 'SYSTEM',
      employeeName: 'All Employees',
      fieldChanged: 'Roster Reset',
      previousValue: 'Sample Data',
      newValue: 'Empty Roster (Ready for custom data)',
      changedBy: 'Super Admin',
      timestamp: new Date().toISOString(),
      reason: 'Cleared sample employee profiles for custom roster entry',
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleBulkApprove = (selectedIds: string[]) => {
    setPayrollStatus('approved');
  };

  const handleBulkDownloadPDFs = (selectedSalaries: SalaryBreakdown[]) => {
    downloadBatchPDFs(selectedSalaries, companySettings);
  };

  const handleUpdatePaymentMethod = (empId: string, method: PaymentMethod) => {
    // 1. Update salary breakdown override
    const current = computedSalaries.find(s => s.empId === empId);
    if (current) {
      const updated: SalaryBreakdown = {
        ...current,
        paymentMethod: method,
        paymentReference: method === 'cash' 
          ? `CASH-VCHR-${current.month.replace('-', '')}-${empId.replace(/[^a-zA-Z0-9]/g, '')}`
          : `TXN-${current.month.replace('-', '')}-${empId.replace(/[^a-zA-Z0-9]/g, '')}`,
        lastUpdated: new Date().toISOString(),
      };
      setSalaryOverrides(prev => ({
        ...prev,
        [empId]: updated,
      }));
    }

    // 2. Update employee preferred payment method in employee roster
    setEmployees(prev => {
      const updatedEmps = prev.map(e => e.empId === empId ? { ...e, preferredPaymentMethod: method } : e);
      localStorage.setItem('paymaster_employees', JSON.stringify(updatedEmps));
      return updatedEmps;
    });

    // 3. Log audit event
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${empId}`,
      empId: empId,
      employeeName: current?.profile.name || empId,
      fieldChanged: 'Payment Mode',
      previousValue: current?.paymentMethod || 'bank_transfer',
      newValue: method,
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: `Switched payout mode to ${method.replace('_', ' ').toUpperCase()}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleBulkSetPaymentMethod = (empIds: string[], method: PaymentMethod) => {
    // 1. Update employee roster
    setEmployees(prev => {
      const updatedEmps = prev.map(e => empIds.includes(e.empId) ? { ...e, preferredPaymentMethod: method } : e);
      localStorage.setItem('paymaster_employees', JSON.stringify(updatedEmps));
      return updatedEmps;
    });

    // 2. Update salary overrides for all selected
    setSalaryOverrides(prev => {
      const nextOverrides = { ...prev };
      empIds.forEach(empId => {
        const current = computedSalaries.find(s => s.empId === empId);
        if (current) {
          nextOverrides[empId] = {
            ...current,
            paymentMethod: method,
            paymentReference: method === 'cash'
              ? `CASH-VCHR-${current.month.replace('-', '')}-${empId.replace(/[^a-zA-Z0-9]/g, '')}`
              : `TXN-${current.month.replace('-', '')}-${empId.replace(/[^a-zA-Z0-9]/g, '')}`,
            lastUpdated: new Date().toISOString(),
          };
        }
      });
      return nextOverrides;
    });

    // 3. Log bulk audit event
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-bulk`,
      empId: 'BULK',
      employeeName: `${empIds.length} Selected Employees`,
      fieldChanged: 'Payment Mode (Bulk)',
      previousValue: 'Mixed Modes',
      newValue: method,
      changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
      timestamp: new Date().toISOString(),
      reason: `Bulk updated ${empIds.length} employees to ${method.replace('_', ' ').toUpperCase()}`,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };


  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        companySettings={companySettings}
        onOpenSettings={() => {
          setSettingsTab('profile');
          setIsSettingsOpen(true);
        }}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
        onOpenEmployeeDirectory={() => setIsEmployeeDirectoryOpen(true)}
        onOpenHistoricalArchive={() => {
          setHistoricalFilterEmpId(undefined);
          setIsHistoricalModalOpen(true);
        }}
        onOpenDispatchEngine={() => setIsEmailModalOpen(true)}
        employeeCount={employees.length}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        
        {currentRole === 'employee' ? (
          /* Employee Self-Service Portal View */
          <EmployeePortalView
            salaries={computedSalaries}
            historicalSalaries={historicalSalaries}
            settings={companySettings}
            onViewPaySlip={(s) => setActivePaySlip(s)}
            onOpenHistoricalArchive={(empId) => {
              setHistoricalFilterEmpId(empId);
              setIsHistoricalModalOpen(true);
            }}
          />
        ) : (
          /* Administrative & HR View */
          <>

            {archiveNotification && (
              <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
                <span>{archiveNotification}</span>
                <button onClick={() => setArchiveNotification(null)} className="text-indigo-200 hover:text-white ml-2 cursor-pointer">✕</button>
              </div>
            )}

            <DashboardOverview
              salaries={computedSalaries}
              settings={companySettings}
              payrollStatus={payrollStatus}
              onUpdatePayrollStatus={(s) => setPayrollStatus(s)}
              onOpenUploadModal={() => setIsUploadOpen(true)}
              onOpenBankTransferModal={() => setIsBankTransferOpen(true)}
              onOpenEmailModal={() => setIsEmailModalOpen(true)}
              onExportConsolidatedExcel={() => exportConsolidatedPayrollExcel(computedSalaries, companySettings, periodLabel)}
              onExportDeptSummaryExcel={() => exportDepartmentSummaryExcel(computedSalaries, companySettings, periodLabel)}
              onBatchDownloadPDF={() => downloadBatchPDFs(computedSalaries, companySettings)}
              currentRole={currentRole}
              onArchiveCurrentMonth={handleArchiveCurrentMonth}
              historicalCount={historicalSalaries.length}
            />

            <PayrollGrid
              salaries={computedSalaries}
              settings={companySettings}
              currentRole={currentRole}
              onViewPaySlip={(s) => setActivePaySlip(s)}
              onBulkApprove={handleBulkApprove}
              onBulkDownloadPDFs={handleBulkDownloadPDFs}
              onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
              onEditEmployee={(emp) => setEditingEmployee(emp)}
              onOpenEmployeeDirectory={() => setIsEmployeeDirectoryOpen(true)}
              onDeleteEmployee={handleDeleteEmployee}
              onClearAllEmployees={handleClearAllEmployees}
              onUpdatePaymentMethod={handleUpdatePaymentMethod}
              onBulkSetPaymentMethod={handleBulkSetPaymentMethod}
              onOpenDispatchEngine={() => setIsEmailModalOpen(true)}
            />
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 {companySettings.name} • PayMaster Pro Enterprise Engine
          </span>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Tax Compliance Verified</span>
            <span>•</span>
            <button 
              onClick={() => setIsArchitectureOpen(true)}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              System Architecture & Schema
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 0. Add New Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onAddEmployee={handleAddEmployee}
        onAddMultipleEmployees={handleAddMultipleEmployees}
        settings={companySettings}
        existingCount={employees.length}
      />

      {/* 0.5 Employee Directory Modal */}
      <EmployeeDirectoryModal
        isOpen={isEmployeeDirectoryOpen}
        onClose={() => setIsEmployeeDirectoryOpen(false)}
        employees={employees}
        settings={companySettings}
        currentRole={currentRole}
        onEditEmployee={(emp) => setEditingEmployee(emp)}
        onDeleteEmployee={handleDeleteEmployee}
        onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
        onViewPaySlipForEmployee={(empId) => {
          const s = computedSalaries.find(sal => sal.empId === empId);
          if (s) setActivePaySlip(s);
        }}
        onOpenHistoricalPayslips={(empId) => {
          setHistoricalFilterEmpId(empId);
          setIsHistoricalModalOpen(true);
        }}
      />

      {/* 0.6 Edit Employee Profile Modal */}
      <EditEmployeeModal
        isOpen={!!editingEmployee}
        employee={editingEmployee}
        settings={companySettings}
        onClose={() => setEditingEmployee(null)}
        onSave={handleSaveEditEmployee}
      />

      {/* 0.7 Historical Payslip Archive Modal */}
      <HistoricalPayslipModal
        isOpen={isHistoricalModalOpen}
        onClose={() => {
          setIsHistoricalModalOpen(false);
          setHistoricalFilterEmpId(undefined);
        }}
        employees={employees}
        historicalSalaries={historicalSalaries}
        settings={companySettings}
        currentRole={currentRole}
        initialEmpId={historicalFilterEmpId}
        onSaveHistoricalPayslip={(newRecord) => {
          setHistoricalSalaries(prev => {
            const updated = [newRecord, ...prev];
            localStorage.setItem('paymaster_historical_salaries', JSON.stringify(updated));
            return updated;
          });
          // Log audit
          const newLog: AuditLog = {
            id: `audit-${Date.now()}-hist`,
            empId: newRecord.empId,
            employeeName: newRecord.profile?.name || newRecord.empId,
            fieldChanged: 'Historical Payslip Ingested',
            previousValue: 'None',
            newValue: `${newRecord.periodLabel} (${companySettings.currencySymbol || '$'}${newRecord.netPay})`,
            changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
            timestamp: new Date().toISOString(),
            reason: `Manual entry of historical payslip for ${newRecord.periodLabel}`,
          };
          setAuditLogs(prev => [newLog, ...prev]);
        }}
        onBulkIngestHistorical={(records) => {
          setHistoricalSalaries(prev => {
            const updated = [...records, ...prev];
            localStorage.setItem('paymaster_historical_salaries', JSON.stringify(updated));
            return updated;
          });
          // Log audit
          const newLog: AuditLog = {
            id: `audit-${Date.now()}-hist-bulk`,
            empId: 'BULK',
            employeeName: `${records.length} Past Records`,
            fieldChanged: 'Bulk Historical Payslips Upload',
            previousValue: 'N/A',
            newValue: `${records.length} Historical Statements Ingested`,
            changedBy: currentRole === 'super_admin' ? 'Super Admin' : 'HR Payroll Manager',
            timestamp: new Date().toISOString(),
            reason: `Spreadsheet ingestion of ${records.length} past payslip records`,
          };
          setAuditLogs(prev => [newLog, ...prev]);
        }}
        onDeleteHistoricalPayslip={(id) => {
          setHistoricalSalaries(prev => {
            const updated = prev.filter(r => r.id !== id);
            localStorage.setItem('paymaster_historical_salaries', JSON.stringify(updated));
            return updated;
          });
        }}
        onViewPaySlip={(record) => setActivePaySlip(record)}
      />

      {/* 1. Pay Slip View & PDF Generator */}
      <PaySlipModal
        isOpen={!!activePaySlip}
        salary={activePaySlip}
        settings={companySettings}
        onClose={() => setActivePaySlip(null)}
      />

      {/* 2. Attendance Excel Ingestion */}
      <DataIngestionModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onApplyAttendance={handleApplyAttendance}
        totalMonthDays={companySettings.payCycleDayCount || 30}
        currentSelectedMonth={selectedMonth}
        onArchiveCurrentMonth={handleArchiveCurrentMonth}
      />

      {/* 3. Company & Payroll Settings */}
      <CompanySettingsModal
        isOpen={isSettingsOpen}
        settings={companySettings}
        activeMonth={selectedMonth}
        periodLabel={periodLabel}
        initialTab={settingsTab}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={handleSaveSettings}
      />

      {/* 4. Audit Trail Ledger */}
      <AuditTrailModal
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
        logs={auditLogs}
        settings={companySettings}
      />

      {/* 6. Bank Transfer ACH / NEFT */}
      <BankTransferModal
        isOpen={isBankTransferOpen}
        onClose={() => setIsBankTransferOpen(false)}
        salaries={computedSalaries}
        settings={companySettings}
      />

      {/* 7. WhatsApp & Email Multi-Channel Dispatcher */}
      <BulkDispatchModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        salaries={computedSalaries}
        settings={companySettings}
        onOpenSettings={() => {
          setSettingsTab('whatsapp');
          setIsSettingsOpen(true);
        }}
      />

      {/* 8. Complete System Architecture & Tech Specs Modal */}
      {isArchitectureOpen && (
        <ArchitectureDocsModal
          isOpen={isArchitectureOpen}
          onClose={() => setIsArchitectureOpen(false)}
        />
      )}

    </div>
  );
}
