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
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('paymaster_settings');
    return saved ? JSON.parse(saved) : DEFAULT_COMPANY_SETTINGS;
  });
  
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => {
    const saved = localStorage.getItem('paymaster_employees');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
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
        return JSON.parse(saved);
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
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isBankTransferOpen, setIsBankTransferOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const [activePaySlip, setActivePaySlip] = useState<SalaryBreakdown | null>(null);

  // Manual Overrides state map (empId -> partial overrides)
  const [salaryOverrides, setSalaryOverrides] = useState<Record<string, Partial<SalaryBreakdown>>>({});

  // Recalculate salaries whenever employees, attendance, settings, or month change
  const computedSalaries: SalaryBreakdown[] = useMemo(() => {
    const periodLabel = selectedMonth === '2026-08' ? 'August 2026' : selectedMonth === '2026-07' ? 'July 2026' : `${selectedMonth}`;
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
  }, [employees, attendanceRecords, companySettings, selectedMonth, salaryOverrides, payrollStatus]);

  // Handlers
  const handleSaveSettings = (newSettings: CompanySettings) => {
    setCompanySettings(newSettings);
    localStorage.setItem('paymaster_settings', JSON.stringify(newSettings));
  };

  const handleApplyAttendance = (newRecords: AttendanceRecord[], detectedPeriod?: { month: string; periodLabel: string }) => {
    // 1. Update pay period if detected from spreadsheet header banner (e.g. June 2026)
    if (detectedPeriod && detectedPeriod.month) {
      setSelectedMonth(detectedPeriod.month);
    }

    // 2. Update attendance records
    setAttendanceRecords(newRecords);
    localStorage.setItem('paymaster_attendance', JSON.stringify(newRecords));

    // 3. Auto-sync employees: if any employee in Excel does not exist, auto-create their profile
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
          // User rule 3: only update department if provided and non-empty, otherwise retain or let client edit
          if (rec.department && rec.department !== '-' && rec.department !== existing.department) {
            updatedEmp.department = rec.department;
          }
          if (rec.baseSalary && rec.baseSalary > 0) {
            updatedEmp.baseSalary = rec.baseSalary;
          } else if (rec.manualGross && rec.manualGross > 0) {
            updatedEmp.baseSalary = rec.manualGross;
          }
          updatedEmployees[existingIdx] = updatedEmp;
        } else {
          newCount++;
          const resolvedSalary = rec.baseSalary && rec.baseSalary > 0 
            ? rec.baseSalary 
            : (rec.manualGross && rec.manualGross > 0 
              ? rec.manualGross 
              : (rec.manualBasicPay && rec.manualBasicPay > 0 
                ? rec.manualBasicPay * 2 
                : 10000));

          const newEmp: EmployeeProfile = {
            id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            empId: rec.empId,
            name: rec.employeeName || `Employee ${rec.empId}`,
            email: `${(rec.employeeName || rec.empId).toLowerCase().replace(/[^a-z0-9]/g, '.')}@company.com`,
            department: (rec.department && rec.department.trim() !== '') ? rec.department : '-',
            designation: 'Staff Member',
            joinDate: new Date().toISOString().split('T')[0],
            structureType: 'fixed',
            baseSalary: resolvedSalary,
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

  const periodLabel = computedSalaries[0]?.periodLabel || 'August 2026';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        companySettings={companySettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
      />

      {/* 3. Company & Payroll Settings */}
      <CompanySettingsModal
        isOpen={isSettingsOpen}
        settings={companySettings}
        activeMonth={selectedMonth}
        periodLabel={periodLabel}
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
