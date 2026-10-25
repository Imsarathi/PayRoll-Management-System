import * as XLSX from 'xlsx';
import { AttendanceRecord, ColumnMapping } from '../types/payroll';

export interface ParseResult {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  records: AttendanceRecord[];
  validationErrors: { row: number; empId?: string; field: string; message: string; severity: 'error' | 'warning' }[];
}

export const DEFAULT_COLUMN_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
  empId: [
    'empid', 'emp_id', 'employeeid', 'employee_id', 'staff_id', 'id', 'empcode', 'emp_code', 'code',
    'empno', 'emp_no', 'employeeno', 'employee_no', 'employeenumber', 'employee_number',
    'staffno', 'staff_no', 'staffcode', 'staff_code',
    'srno', 'sr_no', 'sno', 's_no', 'slno', 'sl_no', 'serialno', 'serial_no',
    'tokenno', 'token_no', 'badgeno', 'badge_no', 'payrollid', 'payroll_id',
    'personnelno', 'fileno', 'emp', 'no'
  ],
  name: [
    'name', 'employeename', 'employee_name', 'staff_name', 'fullname', 'full_name',
    'empname', 'emp_name', 'personname', 'person_name', 'staffname', 'worker_name'
  ],
  department: ['department', 'dept', 'division', 'team', 'business_unit', 'unit', 'designation', 'role'],
  daysPresent: ['present', 'dayspresent', 'days_present', 'present_days', 'attended_days', 'working_days_present', 'actual_present', 'workingdays', 'p'],
  daysAbsent: ['absent', 'daysabsent', 'days_absent', 'absent_days', 'absences', 'a'],
  halfDays: ['halfday', 'halfdays', 'half_days', 'half_day', 'hd', 'half_day_count'],
  overtimeHours: ['overtime', 'ot', 'othours', 'ot_hours', 'overtime_hours', 'ot_hrs', 'extra_hours'],
  paidLeaves: ['paidleave', 'paidleaves', 'paid_leaves', 'paid_leave', 'cl', 'sl', 'el', 'leaves_taken', 'approved_leaves', 'pl'],
  unpaidLeaves: ['unpaidleave', 'unpaidleaves', 'unpaid_leaves', 'unpaid_leave', 'lwp', 'lop_days', 'unpaid_days', 'unpaidleaveslop', 'lop'],
  holidaysWorked: ['holidaysworked', 'holidays_worked', 'holiday_work', 'ph_worked', 'holiday_days_worked'],
  lateArrivals: ['latemarks', 'late_marks', 'late', 'latearrivals', 'late_arrivals', 'lates', 'late_count'],
  baseSalary: ['salary', 'basesalary', 'basic_salary', 'base_salary', 'monthly_salary', 'ctc', 'gross_salary'],

  // Custom Earnings
  basicPay: ['basicpay', 'basic_pay', 'basicsalary', 'basic_salary', 'basic', 'basicamount', 'basic_amt'],
  hra: ['hra', 'h.r.a.', 'h.r.a', 'houserentallowancehra', 'houserentallowance', 'house_rent_allowance', 'rent_allowance'],
  conveyance: ['conveyanceallowance', 'conveyance_allowance', 'travel_allowance', 'conveyance', 'ca', 'ta'],
  da: ['da', 'd.a.', 'd.a', 'dearnessallowanceda', 'dearnessallowance', 'dearness_allowance', 'dearness'],
  specialAllowance: ['specialallowance', 'special_allowance', 'specialallowancesa', 'spl_allowance', 'special', 'sa'],
  otherAllowance: ['otherallowance', 'other_allowance', 'otherallowances', 'allowance_other', 'misc_allowance', 'other'],
  medicalAllowance: ['medicalallowance', 'medical_allowance', 'med_allowance', 'medical'],
  overtimePay: ['ot', 'o.t', 'o.t.', 'overtimepayot', 'overtimepay', 'overtime_pay', 'otpay', 'ot_pay', 'ot_amount', 'ot_amt'],
  incentiveBonus: ['incentivebonus', 'incentive_bonus', 'incentive', 'bonus', 'incentiveandbonus', 'incentivebonusamount', 'performancebonus', 'performance_bonus', 'incentives', 'variable_pay', 'incentive_pay'],
  reimbursements: ['reimbursement', 'reimbursements', 'claims', 'other_additions'],
  grossSalary: ['grosssalary', 'gross_salary', 'gross', 'gross_pay', 'grosspay'],

  // Custom Deductions
  providentFund: ['providentfundpf', 'providentfund', 'provident_fund', 'epf', 'employee_pf', 'pf_deduction', 'pf'],
  professionalTax: ['professionaltaxpt', 'professionaltax', 'professional_tax', 'prof_tax', 'pt_deduction', 'pt'],
  lopDeduction: ['lossofpaylopdeductions', 'lossofpaydeductions', 'lossofpaydeduction', 'loss_of_pay_deductions', 'lossofpay', 'loss_of_pay', 'lopdeduction', 'lop_deduction', 'unpaid_deduction'],
  lateDeduction: ['latearrivalpenalty', 'late_arrival_penalty', 'latepenalty', 'late_penalty', 'latededuction', 'late_deduction', 'late_fine'],
  loanAdvance: ['loan/advance', 'loanadvance', 'loan_advance', 'loanandsalaryadvances', 'loansalaryadvance', 'salaryadvance', 'salary_advance', 'loan', 'advance'],
  otherDeductions: ['otherdeduction', 'other_deduction', 'otherdeductions', 'other_deductions', 'misc_deductions'],
  totalDeduction: ['totaldeduction', 'totaldeductions', 'total_deduction', 'total_deductions', 'tot_ded', 'deductions_total'],
  netPay: ['netpay', 'net_pay', 'net_salary', 'netsalary', 'take_home'],
};

/**
 * Automatically detects the closest matching header for each internal field
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map(h => ({
    original: h,
    clean: String(h).toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  const mapping: ColumnMapping = {
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
    totalDeduction: '',
    netPay: '',
  };

  const fieldKeys = Object.keys(DEFAULT_COLUMN_KEYWORDS) as (keyof ColumnMapping)[];

  // Pass 1: Exact matches first
  fieldKeys.forEach(fieldKey => {
    const keywords = DEFAULT_COLUMN_KEYWORDS[fieldKey];
    for (const kw of keywords) {
      const cleanKw = kw.replace(/[^a-z0-9]/g, '');
      const exactMatch = normalizedHeaders.find(h => h.clean === cleanKw);
      if (exactMatch) {
        mapping[fieldKey] = exactMatch.original;
        break;
      }
    }
  });

  // Pass 2: Substring matches for unmapped fields (with length guard to prevent short false positives)
  fieldKeys.forEach(fieldKey => {
    if (mapping[fieldKey]) return; // Already matched in Pass 1
    const keywords = DEFAULT_COLUMN_KEYWORDS[fieldKey];
    for (const kw of keywords) {
      const cleanKw = kw.replace(/[^a-z0-9]/g, '');
      if (cleanKw.length < 3) continue;
      const partialMatch = normalizedHeaders.find(h => h.clean.includes(cleanKw));
      if (partialMatch) {
        mapping[fieldKey] = partialMatch.original;
        break;
      }
    }
  });

  // Pass 3: Smart fallbacks if empId or name were not matched
  if (!mapping.empId && headers.length > 0) {
    const candidate = headers.find(h => {
      const c = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return c.includes('id') || c.includes('code') || c.includes('emp') || c.startsWith('sr') || c.startsWith('no');
    });
    mapping.empId = candidate || headers[0];
  }

  if (!mapping.name && headers.length > 1) {
    const candidate = headers.find(h => {
      const c = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return c.includes('name') || c.includes('staff') || c.includes('emp');
    });
    if (candidate && candidate !== mapping.empId) {
      mapping.name = candidate;
    } else if (headers[1] && headers[1] !== mapping.empId) {
      mapping.name = headers[1];
    }
  }

  return mapping;
}

/**
 * Parses raw Excel / CSV file buffer or ArrayBuffer with multi-row header scanning
 */
export async function parseAttendanceExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // First convert to 2D array to identify real header row if sheet has title or blank lines
  const raw2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (raw2D.length === 0) {
    throw new Error('The uploaded file is empty. Please upload an Excel sheet containing attendance data.');
  }

  const commonKeywords = [
    'emp', 'id', 'name', 'salary', 'basic', 'present', 'absent', 'gross', 'net',
    'dept', 'leave', 'ot', 'code', 'designation', 'sr', 'sno', 'hra', 'pf', 'pt', 'lop', 'pay'
  ];

  let bestHeaderRowIndex = 0;
  let bestScore = -1;

  for (let r = 0; r < Math.min(raw2D.length, 12); r++) {
    const row = raw2D[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let rowScore = 0;
    let nonEmptyCount = 0;

    row.forEach(cell => {
      const str = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (str) {
        nonEmptyCount++;
        if (commonKeywords.some(kw => str.includes(kw))) {
          rowScore += 3;
        }
      }
    });

    if (nonEmptyCount >= 2 && rowScore > bestScore) {
      bestScore = rowScore;
      bestHeaderRowIndex = r;
    }
  }

  const rawHeaderRow = raw2D[bestHeaderRowIndex] || [];
  const headers: string[] = [];
  const usedHeaders = new Set<string>();

  rawHeaderRow.forEach((h: any, colIdx: number) => {
    let name = String(h || '').trim();
    if (!name) {
      name = `Column_${colIdx + 1}`;
    }
    let uniqueName = name;
    let counter = 1;
    while (usedHeaders.has(uniqueName)) {
      uniqueName = `${name}_${counter++}`;
    }
    usedHeaders.add(uniqueName);
    headers.push(uniqueName);
  });

  const dataRows = raw2D.slice(bestHeaderRowIndex + 1);
  const rawRows: Record<string, any>[] = [];

  dataRows.forEach(rowArr => {
    if (!Array.isArray(rowArr)) return;
    const hasValue = rowArr.some(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasValue) return;

    const rowObj: Record<string, any> = {};
    headers.forEach((hdr, idx) => {
      rowObj[hdr] = rowArr[idx] !== undefined ? rowArr[idx] : '';
    });
    rawRows.push(rowObj);
  });

  // Fallback to standard sheet_to_json if 2D parsing yielded 0 rows
  if (rawRows.length === 0) {
    const fallbackRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (fallbackRows.length > 0) {
      const headerSet = new Set<string>();
      fallbackRows.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
      headers.length = 0;
      headers.push(...Array.from(headerSet));
      rawRows.push(...fallbackRows);
    }
  }

  if (rawRows.length === 0) {
    throw new Error('No data rows found in the sheet. Please check the uploaded spreadsheet.');
  }

  const detectedMapping = autoDetectMapping(headers);
  const { records, validationErrors } = mapRowsToAttendance(rawRows, detectedMapping);

  return {
    headers,
    rawRows,
    detectedMapping,
    records,
    validationErrors,
  };
}

/**
 * Maps raw excel rows according to column mapping and runs validation rules
 */
export function mapRowsToAttendance(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  totalMonthDays = 30
): { records: AttendanceRecord[]; validationErrors: ParseResult['validationErrors'] } {
  const records: AttendanceRecord[] = [];
  const validationErrors: ParseResult['validationErrors'] = [];

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // 1-indexed Excel row after header
    
    // Check if row is completely blank
    const rowValues = Object.values(row).map(v => String(v ?? '').trim()).filter(Boolean);
    if (rowValues.length === 0) return;

    // Filter out total/summary rows at bottom of spreadsheets
    const firstFew = rowValues.slice(0, 3).join(' ').toLowerCase();
    if (firstFew.includes('total') || firstFew.includes('grand total') || firstFew.includes('summary')) {
      return;
    }

    let rawEmpId = mapping.empId ? String(row[mapping.empId] || '').trim() : '';
    const rawName = mapping.name ? String(row[mapping.name] || '').trim() : '';
    const rawDept = mapping.department ? String(row[mapping.department] || '').trim() : '';

    // Smart fallback if empId is missing in row: derive from name or row sequence
    if (!rawEmpId) {
      if (rawName) {
        const cleanNamePart = rawName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
        rawEmpId = `EMP-${cleanNamePart || String(index + 1).padStart(3, '0')}`;
      } else {
        rawEmpId = `EMP-${String(index + 1).padStart(3, '0')}`;
      }
    }

    const parseNum = (val: any, defaultVal = 0): number => {
      if (val === undefined || val === null || val === '') return defaultVal;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const daysPresent = parseNum(mapping.daysPresent ? row[mapping.daysPresent] : 0, 0);
    const daysAbsent = parseNum(mapping.daysAbsent ? row[mapping.daysAbsent] : 0, 0);
    const halfDays = parseNum(mapping.halfDays ? row[mapping.halfDays] : 0, 0);
    const overtimeHours = parseNum(mapping.overtimeHours ? row[mapping.overtimeHours] : 0, 0);
    const paidLeaves = parseNum(mapping.paidLeaves ? row[mapping.paidLeaves] : 0, 0);
    const unpaidLeaves = parseNum(mapping.unpaidLeaves ? row[mapping.unpaidLeaves] : 0, 0);
    const holidaysWorked = parseNum(mapping.holidaysWorked ? row[mapping.holidaysWorked] : 0, 0);
    const lateArrivalsCount = parseNum(mapping.lateArrivals ? row[mapping.lateArrivals] : 0, 0);
    const baseSalary = mapping.baseSalary && row[mapping.baseSalary] !== undefined ? parseNum(row[mapping.baseSalary], 0) : parseNum(row['Basic Salary'] || row['Base Salary'] || row['Salary'], 0);

    // Parse manual earnings if present
    const manualBasicPay = mapping.basicPay && row[mapping.basicPay] !== undefined ? parseNum(row[mapping.basicPay], -1) : (row['Basic Salary'] !== undefined || row['Basic Pay'] !== undefined || row['Basic'] !== undefined ? parseNum(row['Basic Salary'] ?? row['Basic Pay'] ?? row['Basic'], -1) : -1);
    const manualHra = mapping.hra && row[mapping.hra] !== undefined ? parseNum(row[mapping.hra], -1) : (row['House Rent Allowance (HRA)'] !== undefined || row['House Rent Allowance'] !== undefined || row['HRA'] !== undefined || row['H. R. A.'] !== undefined || row['H.R.A.'] !== undefined ? parseNum(row['House Rent Allowance (HRA)'] ?? row['House Rent Allowance'] ?? row['HRA'] ?? row['H. R. A.'] ?? row['H.R.A.'], -1) : -1);
    const manualConveyance = mapping.conveyance && row[mapping.conveyance] !== undefined ? parseNum(row[mapping.conveyance], -1) : (row['CA'] !== undefined || row['Conveyance'] !== undefined ? parseNum(row['CA'] ?? row['Conveyance'], -1) : -1);
    const manualDa = mapping.da && row[mapping.da] !== undefined ? parseNum(row[mapping.da], -1) : (row['Dearness Allowance'] !== undefined || row['DA'] !== undefined || row['Dearness'] !== undefined || row['D. A.'] !== undefined || row['D.A.'] !== undefined ? parseNum(row['Dearness Allowance'] ?? row['DA'] ?? row['Dearness'] ?? row['D. A.'] ?? row['D.A.'], -1) : -1);
    const manualSpecialAllowance = mapping.specialAllowance && row[mapping.specialAllowance] !== undefined ? parseNum(row[mapping.specialAllowance], -1) : (row['Special Allowance'] !== undefined || row['SA'] !== undefined ? parseNum(row['Special Allowance'] ?? row['SA'], -1) : -1);
    const manualOtherAllowance = mapping.otherAllowance && row[mapping.otherAllowance] !== undefined ? parseNum(row[mapping.otherAllowance], -1) : (row['Other Allowance'] !== undefined || row['Other Allowances'] !== undefined ? parseNum(row['Other Allowance'] ?? row['Other Allowances'], -1) : -1);
    const manualMedicalAllowance = mapping.medicalAllowance && row[mapping.medicalAllowance] !== undefined ? parseNum(row[mapping.medicalAllowance], -1) : (row['Medical'] !== undefined || row['Medical Allowance'] !== undefined ? parseNum(row['Medical'] ?? row['Medical Allowance'], -1) : -1);
    const manualOvertimePay = mapping.overtimePay && row[mapping.overtimePay] !== undefined ? parseNum(row[mapping.overtimePay], -1) : (row['Overtime Pay (O.T.)'] !== undefined || row['Overtime Pay'] !== undefined || row['OT Pay'] !== undefined || row['O.T'] !== undefined || row['O.T.'] !== undefined || row['OT'] !== undefined ? parseNum(row['Overtime Pay (O.T.)'] ?? row['Overtime Pay'] ?? row['OT Pay'] ?? row['O.T'] ?? row['O.T.'] ?? row['OT'], -1) : -1);
    const manualIncentiveBonus = mapping.incentiveBonus && row[mapping.incentiveBonus] !== undefined ? parseNum(row[mapping.incentiveBonus], -1) : (row['Incentive & Bonus'] !== undefined || row['Incentive'] !== undefined || row['Bonus'] !== undefined || row['Performance Bonus'] !== undefined ? parseNum(row['Incentive & Bonus'] ?? row['Incentive'] ?? row['Bonus'] ?? row['Performance Bonus'], -1) : -1);
    const manualReimbursements = mapping.reimbursements && row[mapping.reimbursements] !== undefined ? parseNum(row[mapping.reimbursements], -1) : (row['Reimbursement'] !== undefined || row['Reimbursements'] !== undefined ? parseNum(row['Reimbursement'] ?? row['Reimbursements'], -1) : -1);
    const manualGrossSalary = mapping.grossSalary && row[mapping.grossSalary] !== undefined ? parseNum(row[mapping.grossSalary], -1) : (row['Gross Salary'] !== undefined || row['Gross'] !== undefined || row['Gross Pay'] !== undefined ? parseNum(row['Gross Salary'] ?? row['Gross'] ?? row['Gross Pay'], -1) : -1);

    // Parse manual deductions if present
    const manualPf = mapping.providentFund && row[mapping.providentFund] !== undefined ? parseNum(row[mapping.providentFund], -1) : (row['Provident Fund (PF)'] !== undefined || row['Provident Fund'] !== undefined || row['PF'] !== undefined ? parseNum(row['Provident Fund (PF)'] ?? row['Provident Fund'] ?? row['PF'], -1) : -1);
    const manualPt = mapping.professionalTax && row[mapping.professionalTax] !== undefined ? parseNum(row[mapping.professionalTax], -1) : (row['Professional Tax (PT)'] !== undefined || row['Professional Tax'] !== undefined || row['PT'] !== undefined ? parseNum(row['Professional Tax (PT)'] ?? row['Professional Tax'] ?? row['PT'], -1) : -1);
    const manualLopDeduction = mapping.lopDeduction && row[mapping.lopDeduction] !== undefined ? parseNum(row[mapping.lopDeduction], -1) : (row['Loss of Pay (LOP Deductions)'] !== undefined || row['Loss of Pay Deduction'] !== undefined || row['LOP Deduction'] !== undefined ? parseNum(row['Loss of Pay (LOP Deductions)'] ?? row['Loss of Pay Deduction'] ?? row['LOP Deduction'], -1) : -1);
    const manualLateDeduction = mapping.lateDeduction && row[mapping.lateDeduction] !== undefined ? parseNum(row[mapping.lateDeduction], -1) : (row['Late Arrival Penalty'] !== undefined || row['Late Penalty'] !== undefined || row['Late Deduction'] !== undefined ? parseNum(row['Late Arrival Penalty'] ?? row['Late Penalty'] ?? row['Late Deduction'], -1) : -1);
    const manualLoanAdvance = mapping.loanAdvance && row[mapping.loanAdvance] !== undefined ? parseNum(row[mapping.loanAdvance], -1) : (row['Loan & Salary Advances'] !== undefined || row['Loan / Advances'] !== undefined || row['Loan / Advance'] !== undefined || row['Loan'] !== undefined || row['Advance'] !== undefined || row['Salary Advance'] !== undefined ? parseNum(row['Loan & Salary Advances'] ?? row['Loan / Advances'] ?? row['Loan / Advance'] ?? row['Loan'] ?? row['Advance'] ?? row['Salary Advance'], -1) : -1);
    const manualOtherDeductions = mapping.otherDeductions && row[mapping.otherDeductions] !== undefined ? parseNum(row[mapping.otherDeductions], -1) : (row['Other Deductions'] !== undefined || row['Other Deduction'] !== undefined ? parseNum(row['Other Deductions'] ?? row['Other Deduction'], -1) : -1);
    const manualTotalDeduction = mapping.totalDeduction && row[mapping.totalDeduction] !== undefined ? parseNum(row[mapping.totalDeduction], -1) : (row['Total Deduction'] !== undefined || row['Total Deductions'] !== undefined ? parseNum(row['Total Deduction'] ?? row['Total Deductions'], -1) : -1);
    const manualNetPay = mapping.netPay && row[mapping.netPay] !== undefined ? parseNum(row[mapping.netPay], -1) : (row['Net Pay'] !== undefined || row['Net Salary'] !== undefined ? parseNum(row['Net Pay'] ?? row['Net Salary'], -1) : -1);

    // Business Logic Validations
    if (daysPresent < 0) {
      validationErrors.push({
        row: rowNum,
        empId: rawEmpId,
        field: 'Days Present',
        message: `Days present (${daysPresent}) cannot be negative.`,
        severity: 'error',
      });
    }

    if (daysPresent > totalMonthDays) {
      validationErrors.push({
        row: rowNum,
        empId: rawEmpId,
        field: 'Days Present',
        message: `Days present (${daysPresent}) exceeds total days in month (${totalMonthDays}).`,
        severity: 'warning',
      });
    }

    if (daysPresent + paidLeaves + unpaidLeaves + (halfDays * 0.5) > totalMonthDays + 2) {
      validationErrors.push({
        row: rowNum,
        empId: rawEmpId,
        field: 'Attendance Tally',
        message: `Total accounted days (${daysPresent + paidLeaves + unpaidLeaves + halfDays * 0.5}) exceed cycle length (${totalMonthDays}).`,
        severity: 'warning',
      });
    }

    if (overtimeHours > 120) {
      validationErrors.push({
        row: rowNum,
        empId: rawEmpId,
        field: 'Overtime Hours',
        message: `High overtime hours detected (${overtimeHours} hrs). Please verify for labor regulation compliance.`,
        severity: 'warning',
      });
    }

    records.push({
      empId: rawEmpId,
      employeeName: rawName || undefined,
      department: rawDept || undefined,
      totalMonthDays,
      daysPresent,
      daysAbsent,
      halfDays,
      paidLeaves,
      unpaidLeaves,
      overtimeHours,
      holidayOvertimeHours: 0,
      lateArrivalsCount,
      earlyDeparturesCount: 0,
      holidaysWorked,
      baseSalary: baseSalary > 0 ? baseSalary : undefined,
      remarks: row['Remarks'] || row['Notes'] || '',

      manualBasicPay: manualBasicPay >= 0 ? manualBasicPay : undefined,
      manualHra: manualHra >= 0 ? manualHra : undefined,
      manualConveyance: manualConveyance >= 0 ? manualConveyance : undefined,
      manualDa: manualDa >= 0 ? manualDa : undefined,
      manualSpecialAllowance: manualSpecialAllowance >= 0 ? manualSpecialAllowance : undefined,
      manualOtherAllowance: manualOtherAllowance >= 0 ? manualOtherAllowance : undefined,
      manualMedicalAllowance: manualMedicalAllowance >= 0 ? manualMedicalAllowance : undefined,
      manualOvertimePay: manualOvertimePay >= 0 ? manualOvertimePay : undefined,
      manualIncentiveBonus: manualIncentiveBonus >= 0 ? manualIncentiveBonus : undefined,
      manualReimbursements: manualReimbursements >= 0 ? manualReimbursements : undefined,
      manualGrossSalary: manualGrossSalary >= 0 ? manualGrossSalary : undefined,
      manualPf: manualPf >= 0 ? manualPf : undefined,
      manualPt: manualPt >= 0 ? manualPt : undefined,
      manualLopDeduction: manualLopDeduction >= 0 ? manualLopDeduction : undefined,
      manualLateDeduction: manualLateDeduction >= 0 ? manualLateDeduction : undefined,
      manualLoanAdvance: manualLoanAdvance >= 0 ? manualLoanAdvance : undefined,
      manualOtherDeductions: manualOtherDeductions >= 0 ? manualOtherDeductions : undefined,
      manualTotalDeduction: manualTotalDeduction >= 0 ? manualTotalDeduction : undefined,
      manualNetPay: manualNetPay >= 0 ? manualNetPay : undefined,
    });
  });

  return { records, validationErrors };
}

/**
 * Generates and downloads a standardized sample Excel file with prefilled instructions
 */
export function downloadSampleAttendanceTemplate(): void {
  const sampleData = [
    {
      'Employee ID': 'EMP-1001',
      'Employee Name': 'Alexander Wright',
      'Department': 'XML',
      'Days Present': 28,
      'Days Absent': 0,
      'Half Days': 0,
      'Paid Leaves': 2,
      'Unpaid Leaves (LOP)': 0,
      'Overtime Hours': 14,
      'Late Marks': 0,
      'Incentive & Bonus': 500,
      'Loan & Salary Advances': 0,
      'Remarks': 'Standard Month - 100% attendance'
    },
    {
      'Employee ID': 'EMP-1002',
      'Employee Name': 'Sophia Chen',
      'Department': 'ePub',
      'Days Present': 26,
      'Days Absent': 1,
      'Half Days': 2,
      'Paid Leaves': 1,
      'Unpaid Leaves (LOP)': 2,
      'Overtime Hours': 18.5,
      'Late Marks': 4,
      'Incentive & Bonus': 0,
      'Loan & Salary Advances': 250,
      'Remarks': 'Overtime & late marks'
    },
    {
      'Employee ID': 'EMP-1003',
      'Employee Name': 'Marcus Holloway',
      'Department': 'PPT',
      'Days Present': 29,
      'Days Absent': 0,
      'Half Days': 0,
      'Paid Leaves': 1,
      'Unpaid Leaves (LOP)': 0,
      'Overtime Hours': 5,
      'Late Marks': 1,
      'Incentive & Bonus': 300,
      'Loan & Salary Advances': 0,
      'Remarks': 'PPT master slide templates'
    },
    {
      'Employee ID': 'EMP-1004',
      'Employee Name': 'Amara Patel',
      'Department': 'Word',
      'Days Present': 27,
      'Days Absent': 0,
      'Half Days': 0,
      'Paid Leaves': 3,
      'Unpaid Leaves (LOP)': 0,
      'Overtime Hours': 8,
      'Late Marks': 2,
      'Incentive & Bonus': 0,
      'Loan & Salary Advances': 0,
      'Remarks': 'Approved annual leave'
    },
    {
      'Employee ID': 'EMP-1005',
      'Employee Name': 'David Rodriguez',
      'Department': 'XML',
      'Days Present': 22,
      'Days Absent': 0,
      'Half Days': 0,
      'Paid Leaves': 0,
      'Unpaid Leaves (LOP)': 8,
      'Overtime Hours': 32,
      'Late Marks': 0,
      'Incentive & Bonus': 1000,
      'Loan & Salary Advances': 500,
      'Remarks': '24/7 Server migration on-call'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Auto-width columns
  const colWidths = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Employee Name
    { wch: 18 }, // Department
    { wch: 14 }, // Days Present
    { wch: 14 }, // Days Absent
    { wch: 12 }, // Half Days
    { wch: 14 }, // Paid Leaves
    { wch: 22 }, // Unpaid Leaves (LOP)
    { wch: 16 }, // Overtime Hours
    { wch: 14 }, // Late Marks
    { wch: 18 }, // Incentive & Bonus
    { wch: 24 }, // Loan & Salary Advances
    { wch: 34 }, // Remarks
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Template');
  XLSX.writeFile(wb, 'PayMaster_Attendance_Template.xlsx');
}
