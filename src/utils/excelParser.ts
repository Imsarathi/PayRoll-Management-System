import * as XLSX from 'xlsx';
import { AttendanceRecord, ColumnMapping } from '../types/payroll';

export interface ParseResult {
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
  records: AttendanceRecord[];
  validationErrors: { row: number; empId?: string; field: string; message: string; severity: 'error' | 'warning' }[];
  detectedPeriod?: { month: string; periodLabel: string };
}

export const DEFAULT_COLUMN_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
  empId: ['employeecode', 'empcode', 'employeecodeid', 'employeeid', 'emp_id', 'empid', 'staff_id', 'id', 'empcode', 'code', 'employee'],
  name: ['employeename', 'employee_name', 'staff_name', 'fullname', 'full_name', 'name'],
  department: ['department', 'dept', 'division', 'team', 'business_unit', 'unit'],
  daysPresent: ['presentdays', 'present_days', 'presentd', 'dayspresent', 'days_present', 'present', 'attended_days', 'working_days_present', 'actual_present'],
  daysAbsent: ['absent', 'daysabsent', 'days_absent', 'absent_days', 'absences'],
  halfDays: ['halfday', 'halfdays', 'half_days', 'half_day', 'hd', 'half_day_count'],
  overtimeHours: ['overtimehours', 'othours', 'ot_hours', 'overtime_hours', 'ot_hrs', 'extra_hours'],
  paidLeaves: ['paidleave', 'paidleaves', 'paid_leaves', 'paid_leave', 'cl', 'sl', 'el', 'leaves_taken', 'approved_leaves'],
  unpaidLeaves: ['unpaidleave', 'unpaidleaves', 'unpaid_leaves', 'unpaid_leave', 'lwp', 'lop_days', 'unpaid_days', 'unpaidleaveslop'],
  holidaysWorked: ['holidaysworked', 'holidays_worked', 'holiday_work', 'ph_worked', 'holiday_days_worked'],
  lateArrivals: ['latemarks', 'late_marks', 'late', 'latearrivals', 'late_arrivals', 'lates', 'late_count'],
  baseSalary: ['salary', 'basesalary', 'basic_salary', 'base_salary', 'monthly_salary', 'ctc'],

  // Custom Earnings
  basicPay: ['basicpay', 'basicpa', 'basicsalary', 'basic_salary', 'basic', 'basic_pay', 'basicamount', 'basic_amt'],
  hra: ['hra', 'h.r.a.', 'h.r.a', 'houserentallowancehra', 'houserentallowance', 'house_rent_allowance', 'house_rent', 'rent_allowance'],
  conveyance: ['conveyanceallowance', 'conveyance_allowance', 'travel_allowance', 'conveyance', 'ca', 'ta'],
  da: ['da', 'd.a.', 'd.a', 'dearnessallowanceda', 'dearnessallowance', 'dearness_allowance', 'dearness'],
  specialAllowance: ['specialallowance', 'specialallowa', 'special_allowance', 'specialallowancesa', 'spl_allowance', 'special', 'sa'],
  otherAllowance: ['otherallowance', 'otherallowa', 'other_allowance', 'otherallowances', 'other_all', 'otherall', 'other'],
  medicalAllowance: ['medicalallowance', 'medical_allowance', 'med_allowance', 'medical'],
  overtimePay: ['ot', 'o.t', 'o.t.', 'overtimepayot', 'overtimepay', 'overtime_pay', 'otpay', 'ot_pay', 'ot_amount', 'ot_amt'],
  incentiveBonus: ['incentivebonus', 'incentive_bonus', 'incentive', 'bonus', 'incentiveandbonus', 'incentivebonusamount', 'performancebonus', 'performance_bonus', 'incentives', 'variable_pay', 'incentive_pay'],
  reimbursements: ['reimbursement', 'reimbursements', 'claims', 'other_additions', 'allowance_other'],
  grossSalary: ['grosssalary', 'grosssala', 'gross_salary', 'gross_earnings', 'totalgross', 'gross'],

  // Custom Deductions
  providentFund: ['providentfundpf', 'providentfund', 'provident_fund', 'epf', 'employee_pf', 'pf_deduction', 'pf'],
  professionalTax: ['professionaltaxpt', 'professionaltax', 'professional_tax', 'prof_tax', 'pt_deduction', 'pt'],
  lopDeduction: ['lossofpaylopdeductions', 'lossofpaydeductions', 'lossofpaydeduction', 'loss_of_pay_deductions', 'lossofpay', 'loss_of_pay', 'lopdeduction', 'lop_deduction', 'unpaid_deduction'],
  lateDeduction: ['latearrivalpenalty', 'late_arrival_penalty', 'latepenalty', 'late_penalty', 'latededuction', 'late_deduction', 'late_fine'],
  loanAdvance: ['loanadvance', 'loan/advance', 'loan/advances', 'loanandsalaryadvances', 'loanandadvance', 'loansalaryadvances', 'loan_salary_advances', 'loansalaryadvance', 'salaryadvance', 'salary_advance', 'loan_advance', 'loan_deduction', 'advance_recovery', 'loan', 'advance', 'loans', 'advances', 'loanadvances'],
  otherDeductions: ['otherdeductions', 'otherdeduc', 'otherdeduction', 'other_deductions', 'other_deduction', 'misc_deductions', 'deductions_other'],
  totalDeductions: ['totaldeductions', 'totaldeduct', 'total_deductions', 'totaldeduction', 'total_deduction'],
  netPay: ['netpay', 'net_pay', 'net', 'takehome', 'net_salary'],
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
    totalDeductions: '',
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
      // Avoid short keywords (< 3 chars) matching arbitrarily inside long unrelated column headers
      if (cleanKw.length < 3) continue;
      const partialMatch = normalizedHeaders.find(h => h.clean.includes(cleanKw));
      if (partialMatch) {
        mapping[fieldKey] = partialMatch.original;
        break;
      }
    }
  });

  return mapping;
}

/**
 * Parses raw Excel / CSV file buffer or ArrayBuffer
 * Robustly handles top title banners (e.g. "Salary for the month June 2026")
 * and detects actual table headers on rows 1, 2, 3, etc.
 */
export async function parseAttendanceExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Get raw 2D grid to accurately identify title vs header rows
  const grid: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (grid.length === 0) {
    throw new Error('The uploaded file is empty. Please upload an Excel sheet containing attendance data.');
  }

  // 1. Detect title banner / period if present in top rows
  let detectedPeriod: { month: string; periodLabel: string } | undefined;
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  
  for (let r = 0; r < Math.min(5, grid.length); r++) {
    const rowStr = (grid[r] || []).map(c => String(c || '').trim()).join(' ').toLowerCase();
    const match = rowStr.match(/(?:salary\s+for\s+the\s+month\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i);
    if (match) {
      const mName = match[1].toLowerCase();
      const mYear = match[2];
      const mIdx = monthNames.indexOf(mName) + 1;
      const monthPadded = mIdx.toString().padStart(2, '0');
      detectedPeriod = {
        month: `${mYear}-${monthPadded}`,
        periodLabel: `${match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase()} ${mYear}`,
      };
      break;
    }
  }

  // 2. Identify header row: find the row with the most matching column keywords
  const candidateKeywords = [
    'employee', 'emp', 'code', 'id', 'name', 'salary', 'basic', 'pay', 'present', 
    'da', 'hra', 'special', 'other', 'ot', 'gross', 'deduction', 'net'
  ];

  let headerRowIndex = 0;
  let maxKeywordMatches = 0;

  for (let r = 0; r < Math.min(10, grid.length); r++) {
    const row = grid[r] || [];
    let matches = 0;
    row.forEach(cell => {
      const clean = String(cell || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (candidateKeywords.some(kw => clean.includes(kw))) {
        matches++;
      }
    });

    if (matches > maxKeywordMatches && matches >= 3) {
      maxKeywordMatches = matches;
      headerRowIndex = r;
    }
  }

  // Extract headers
  const headerRow = grid[headerRowIndex] || [];
  const headers: string[] = [];
  const colIndexToHeader: { [colIdx: number]: string } = {};

  headerRow.forEach((cell, idx) => {
    const headerStr = String(cell || '').trim();
    if (headerStr) {
      headers.push(headerStr);
      colIndexToHeader[idx] = headerStr;
    }
  });

  if (headers.length === 0) {
    throw new Error('Unable to detect table column headers. Please ensure the Excel sheet has column titles.');
  }

  // 3. Extract data rows
  const rawRows: Record<string, any>[] = [];

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    // Check if row has any non-empty cell
    const hasContent = row.some(c => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasContent) continue;

    // Check if row is a "Total" summary or "Note:" row to skip
    const firstCellText = String(row[0] || '').trim().toLowerCase();
    const secondCellText = String(row[1] || '').trim().toLowerCase();
    const rowText = row.map(c => String(c || '').trim()).join(' ').toLowerCase();

    if (
      firstCellText === 'total' || 
      secondCellText === 'total' || 
      firstCellText.startsWith('totals') || 
      firstCellText.startsWith('note:') || 
      firstCellText.startsWith('summary') ||
      rowText.startsWith('note:')
    ) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    let rowHasData = false;

    Object.keys(colIndexToHeader).forEach(cIdxStr => {
      const colIdx = Number(cIdxStr);
      const headerName = colIndexToHeader[colIdx];
      const val = row[colIdx];
      rowObj[headerName] = val !== undefined && val !== null ? val : '';
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        rowHasData = true;
      }
    });

    if (rowHasData) {
      rawRows.push(rowObj);
    }
  }

  if (rawRows.length === 0) {
    throw new Error('No employee payroll data rows found beneath the header row.');
  }

  const detectedMapping = autoDetectMapping(headers);
  const { records, validationErrors } = mapRowsToAttendance(rawRows, detectedMapping);

  return {
    headers,
    rawRows,
    detectedMapping,
    records,
    validationErrors,
    detectedPeriod,
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
    const rowNum = index + 2; // Display row number
    const rawEmpId = mapping.empId ? String(row[mapping.empId] || '').trim() : '';
    const rawName = mapping.name ? String(row[mapping.name] || '').trim() : '';
    const rawDept = mapping.department ? String(row[mapping.department] || '').trim() : '';

    // Ignore empty/total rows if any slipped through
    if (!rawEmpId && !rawName) return;

    if (!rawEmpId) {
      validationErrors.push({
        row: rowNum,
        field: 'Employee ID',
        message: 'Missing Employee ID in row. Row skipped or requires mapping.',
        severity: 'error',
      });
      return;
    }

    const parseNum = (val: any, defaultVal = 0): number => {
      if (val === undefined || val === null || val === '') return defaultVal;
      const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? defaultVal : parsed;
    };

    // User rule #1: If client doesn't give value in present days, default to 30 and raise a warning/note
    const rawPresentVal = mapping.daysPresent ? row[mapping.daysPresent] : undefined;
    let daysPresent: number;
    if (rawPresentVal === undefined || rawPresentVal === null || String(rawPresentVal).trim() === '') {
      daysPresent = 30;
      validationErrors.push({
        row: rowNum,
        empId: rawEmpId,
        field: 'Present Days',
        message: `Present days was blank; defaulted to 30 as per company rule.`,
        severity: 'warning',
      });
    } else {
      const parsed = parseNum(rawPresentVal, 0);
      if (parsed === 0) {
        daysPresent = 30;
        validationErrors.push({
          row: rowNum,
          empId: rawEmpId,
          field: 'Present Days',
          message: `Present days was 0; defaulted to 30 as per company rule.`,
          severity: 'warning',
        });
      } else {
        daysPresent = parsed;
      }
    }

    const daysAbsent = parseNum(mapping.daysAbsent ? row[mapping.daysAbsent] : 0, 0);
    const halfDays = parseNum(mapping.halfDays ? row[mapping.halfDays] : 0, 0);
    const overtimeHours = parseNum(mapping.overtimeHours ? row[mapping.overtimeHours] : 0, 0);
    const paidLeaves = parseNum(mapping.paidLeaves ? row[mapping.paidLeaves] : 0, 0);
    const unpaidLeaves = parseNum(mapping.unpaidLeaves ? row[mapping.unpaidLeaves] : 0, 0);
    const holidaysWorked = parseNum(mapping.holidaysWorked ? row[mapping.holidaysWorked] : 0, 0);
    const lateArrivalsCount = parseNum(mapping.lateArrivals ? row[mapping.lateArrivals] : 0, 0);
    const baseSalary = mapping.baseSalary && row[mapping.baseSalary] !== undefined ? parseNum(row[mapping.baseSalary], 0) : parseNum(row['Basic Salary'] || row['Base Salary'] || row['Salary'], 0);

    // User rule #2: Strictly parse exact figures from client Excel columns
    const manualBasicPay = mapping.basicPay && row[mapping.basicPay] !== undefined 
      ? parseNum(row[mapping.basicPay], -1) 
      : (row['Basic Pay'] !== undefined || row['Basic Salary'] !== undefined || row['Basic'] !== undefined 
        ? parseNum(row['Basic Pay'] ?? row['Basic Salary'] ?? row['Basic'], -1) 
        : -1);

    const manualDa = mapping.da && row[mapping.da] !== undefined 
      ? parseNum(row[mapping.da], -1) 
      : (row['D.A.'] !== undefined || row['D.A'] !== undefined || row['DA'] !== undefined || row['Dearness Allowance'] !== undefined 
        ? parseNum(row['D.A.'] ?? row['D.A'] ?? row['DA'] ?? row['Dearness Allowance'], -1) 
        : -1);

    const manualHra = mapping.hra && row[mapping.hra] !== undefined 
      ? parseNum(row[mapping.hra], -1) 
      : (row['H.R.A.'] !== undefined || row['H.R.A'] !== undefined || row['HRA'] !== undefined || row['House Rent Allowance'] !== undefined 
        ? parseNum(row['H.R.A.'] ?? row['H.R.A'] ?? row['HRA'] ?? row['House Rent Allowance'], -1) 
        : -1);

    const manualSpecialAllowance = mapping.specialAllowance && row[mapping.specialAllowance] !== undefined 
      ? parseNum(row[mapping.specialAllowance], -1) 
      : (row['Special Allowance'] !== undefined || row['Special Allowa...'] !== undefined || row['Special Allowa'] !== undefined || row['SA'] !== undefined 
        ? parseNum(row['Special Allowance'] ?? row['Special Allowa...'] ?? row['Special Allowa'] ?? row['SA'], -1) 
        : -1);

    const manualOtherAllowance = mapping.otherAllowance && row[mapping.otherAllowance] !== undefined 
      ? parseNum(row[mapping.otherAllowance], -1) 
      : (row['Other Allowance'] !== undefined || row['Other Allowa...'] !== undefined || row['Other Allowa'] !== undefined || row['Other All'] !== undefined 
        ? parseNum(row['Other Allowance'] ?? row['Other Allowa...'] ?? row['Other Allowa'] ?? row['Other All'], -1) 
        : -1);

    const manualOvertimePay = mapping.overtimePay && row[mapping.overtimePay] !== undefined 
      ? parseNum(row[mapping.overtimePay], -1) 
      : (row['O.T'] !== undefined || row['O.T.'] !== undefined || row['OT'] !== undefined || row['Overtime Pay'] !== undefined 
        ? parseNum(row['O.T'] ?? row['O.T.'] ?? row['OT'] ?? row['Overtime Pay'], -1) 
        : -1);

    const manualGross = mapping.grossSalary && row[mapping.grossSalary] !== undefined 
      ? parseNum(row[mapping.grossSalary], -1) 
      : (row['Gross Salary'] !== undefined || row['Gross Sala...'] !== undefined || row['Gross Sala'] !== undefined || row['Gross'] !== undefined 
        ? parseNum(row['Gross Salary'] ?? row['Gross Sala...'] ?? row['Gross Sala'] ?? row['Gross'], -1) 
        : -1);

    const manualLoanAdvance = mapping.loanAdvance && row[mapping.loanAdvance] !== undefined 
      ? parseNum(row[mapping.loanAdvance], -1) 
      : (row['Loan / Advance'] !== undefined || row['Loan / Advances'] !== undefined || row['Loan'] !== undefined || row['Advance'] !== undefined 
        ? parseNum(row['Loan / Advance'] ?? row['Loan / Advances'] ?? row['Loan'] ?? row['Advance'], -1) 
        : -1);

    const manualOtherDeductions = mapping.otherDeductions && row[mapping.otherDeductions] !== undefined 
      ? parseNum(row[mapping.otherDeductions], -1) 
      : (row['Other Deductions'] !== undefined || row['Other Deduc...'] !== undefined || row['Other Deduc'] !== undefined 
        ? parseNum(row['Other Deductions'] ?? row['Other Deduc...'] ?? row['Other Deduc'], -1) 
        : -1);

    const manualTotalDeductions = mapping.totalDeductions && row[mapping.totalDeductions] !== undefined 
      ? parseNum(row[mapping.totalDeductions], -1) 
      : (row['Total Deductions'] !== undefined || row['Total Deduct...'] !== undefined || row['Total Deduct'] !== undefined 
        ? parseNum(row['Total Deductions'] ?? row['Total Deduct...'] ?? row['Total Deduct'], -1) 
        : -1);

    const manualNetPay = mapping.netPay && row[mapping.netPay] !== undefined 
      ? parseNum(row[mapping.netPay], -1) 
      : (row['Net Pay'] !== undefined || row['Net'] !== undefined 
        ? parseNum(row['Net Pay'] ?? row['Net'], -1) 
        : -1);

    const manualConveyance = mapping.conveyance && row[mapping.conveyance] !== undefined ? parseNum(row[mapping.conveyance], -1) : -1;
    const manualMedicalAllowance = mapping.medicalAllowance && row[mapping.medicalAllowance] !== undefined ? parseNum(row[mapping.medicalAllowance], -1) : -1;
    const manualIncentiveBonus = mapping.incentiveBonus && row[mapping.incentiveBonus] !== undefined ? parseNum(row[mapping.incentiveBonus], -1) : -1;
    const manualReimbursements = mapping.reimbursements && row[mapping.reimbursements] !== undefined ? parseNum(row[mapping.reimbursements], -1) : -1;
    const manualPf = mapping.providentFund && row[mapping.providentFund] !== undefined ? parseNum(row[mapping.providentFund], -1) : -1;
    const manualPt = mapping.professionalTax && row[mapping.professionalTax] !== undefined ? parseNum(row[mapping.professionalTax], -1) : -1;
    const manualLopDeduction = mapping.lopDeduction && row[mapping.lopDeduction] !== undefined ? parseNum(row[mapping.lopDeduction], -1) : -1;
    const manualLateDeduction = mapping.lateDeduction && row[mapping.lateDeduction] !== undefined ? parseNum(row[mapping.lateDeduction], -1) : -1;

    // User rule #3: If client doesn't give department value, set it as empty or '-'
    const departmentValue = rawDept.trim() || '-';

    records.push({
      empId: rawEmpId,
      employeeName: rawName || undefined,
      department: departmentValue,
      totalMonthDays,
      daysPresent,
      daysAbsent: 0,
      halfDays: 0,
      paidLeaves: 0,
      unpaidLeaves: 0,
      overtimeHours: 0,
      holidayOvertimeHours: 0,
      lateArrivalsCount: 0,
      earlyDeparturesCount: 0,
      holidaysWorked: 0,
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
      manualGross: manualGross >= 0 ? manualGross : undefined,
      manualPf: manualPf >= 0 ? manualPf : undefined,
      manualPt: manualPt >= 0 ? manualPt : undefined,
      manualLopDeduction: undefined,
      manualLateDeduction: undefined,
      manualLoanAdvance: manualLoanAdvance >= 0 ? manualLoanAdvance : undefined,
      manualOtherDeductions: manualOtherDeductions >= 0 ? manualOtherDeductions : undefined,
      manualTotalDeductions: manualTotalDeductions >= 0 ? manualTotalDeductions : undefined,
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
      'Employee Code': '072023',
      'Employee Name': 'Akila R',
      'Present Days': 30,
      'Salary': 15866.67,
      'Basic Pay': 7933.33,
      'D.A.': 3173.33,
      'H.R.A.': 3173.33,
      'Special Allowance': 1586.67,
      'Other Allowance': 528.00,
      'O.T': 283.33,
      'Gross Salary': 16678.00,
      'Loan / Advance': 0.00,
      'Other Deductions': 0.00,
      'Total Deductions': 0.00,
      'Net Pay': 16678.00
    },
    {
      'Employee Code': '122026',
      'Employee Name': 'Ezhilarasi A',
      'Present Days': 30,
      'Salary': 11000.00,
      'Basic Pay': 5500.00,
      'D.A.': 2200.00,
      'H.R.A.': 2200.00,
      'Special Allowance': 1100.00,
      'Other Allowance': 576.00,
      'O.T': 45.83,
      'Gross Salary': 11621.83,
      'Loan / Advance': 0.00,
      'Other Deductions': 0.00,
      'Total Deductions': 0.00,
      'Net Pay': 11621.83
    },
    {
      'Employee Code': '112026',
      'Employee Name': 'Monika V',
      'Present Days': 30,
      'Salary': 10633.33,
      'Basic Pay': 5316.67,
      'D.A.': 2126.67,
      'H.R.A.': 2126.67,
      'Special Allowance': 1063.33,
      'Other Allowance': 576.00,
      'O.T': 45.83,
      'Gross Salary': 11255.17,
      'Loan / Advance': 0.00,
      'Other Deductions': 0.00,
      'Total Deductions': 0.00,
      'Net Pay': 11255.17
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Auto-width columns
  const colWidths = [
    { wch: 16 }, // Employee Code
    { wch: 24 }, // Employee Name
    { wch: 14 }, // Present Days
    { wch: 14 }, // Salary
    { wch: 14 }, // Basic Pay
    { wch: 12 }, // D.A.
    { wch: 12 }, // H.R.A.
    { wch: 18 }, // Special Allowance
    { wch: 16 }, // Other Allowance
    { wch: 12 }, // O.T
    { wch: 16 }, // Gross Salary
    { wch: 16 }, // Loan / Advance
    { wch: 16 }, // Other Deductions
    { wch: 16 }, // Total Deductions
    { wch: 16 }, // Net Pay
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary_Sheet');
  XLSX.writeFile(wb, 'Monthly_Salary_Register_Template.xlsx');
}
