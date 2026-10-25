import { CompanySettings, EmployeeProfile, AttendanceRecord, SalaryBreakdown } from '../types/payroll';

/**
 * Converts a numeric amount to English words (e.g. 1250.50 -> "One Thousand Two Hundred Fifty Dollars and Fifty Cents")
 */
export function numberToWords(amount: number, currencyName = 'Dollars', centsName = 'Cents'): string {
  if (isNaN(amount) || amount === 0) return `Zero ${currencyName} Only`;

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Million', 'Billion'];

  function convertChunk(num: number): string {
    let chunkStr = '';
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (hundred > 0) {
      chunkStr += `${singleDigits[hundred]} Hundred `;
    }

    if (remainder > 0) {
      if (remainder < 10) {
        chunkStr += `${singleDigits[remainder]} `;
      } else if (remainder < 20) {
        chunkStr += `${teens[remainder - 10]} `;
      } else {
        const tenDigit = Math.floor(remainder / 10);
        const singleDigit = remainder % 10;
        chunkStr += `${tens[tenDigit]} ${singleDigits[singleDigit]} `;
      }
    }

    return chunkStr.trim();
  }

  const integerPart = Math.floor(Math.abs(amount));
  const decimalPart = Math.round((Math.abs(amount) - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return `Zero ${currencyName} Only`;

  let words = '';
  let tempInt = integerPart;
  let chunkIdx = 0;

  if (integerPart === 0) {
    words = 'Zero';
  } else {
    while (tempInt > 0) {
      const chunk = tempInt % 1000;
      if (chunk > 0) {
        const chunkWords = convertChunk(chunk);
        words = `${chunkWords} ${thousands[chunkIdx]} ${words}`.trim();
      }
      tempInt = Math.floor(tempInt / 1000);
      chunkIdx++;
    }
  }

  let result = `${words} ${currencyName}`;
  if (decimalPart > 0) {
    result += ` and ${convertChunk(decimalPart)} ${centsName}`;
  }
  result += ' Only';

  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Calculates progressive Income Tax (TDS) based on annual projected taxable income
 */
export function calculateEstimatedTDS(monthlyGross: number): number {
  const annualGross = monthlyGross * 12;
  const standardDeduction = 50000; // Standard annual deduction
  const taxableIncome = Math.max(0, annualGross - standardDeduction);

  let annualTax = 0;
  if (taxableIncome <= 300000) {
    annualTax = 0;
  } else if (taxableIncome <= 600000) {
    annualTax = (taxableIncome - 300000) * 0.05;
  } else if (taxableIncome <= 900000) {
    annualTax = 15000 + (taxableIncome - 600000) * 0.10;
  } else if (taxableIncome <= 1200000) {
    annualTax = 45000 + (taxableIncome - 900000) * 0.15;
  } else if (taxableIncome <= 1500000) {
    annualTax = 90000 + (taxableIncome - 1200000) * 0.20;
  } else {
    annualTax = 150000 + (taxableIncome - 1500000) * 0.30;
  }

  // Monthly TDS rounded
  return Math.round((annualTax / 12) * 100) / 100;
}

/**
 * Computes the complete salary breakdown for an employee based on attendance & rules
 */
export function calculateSalaryBreakdown(
  profile: EmployeeProfile,
  attendance: AttendanceRecord,
  settings: CompanySettings,
  month = '2026-08',
  periodLabel = 'August 2026'
): SalaryBreakdown {
  const totalMonthDays = attendance.totalMonthDays || settings.payCycleDayCount || 30;

  // 1. Calculate active join/exit proration if applicable
  let effectiveMaxDays = totalMonthDays;
  if (profile.joinDate) {
    const join = new Date(profile.joinDate);
    const [currYear, currMonth] = month.split('-').map(Number);
    // Only apply joining proration if join date is strictly within the current pay cycle and after day 1
    if (join.getFullYear() === currYear && (join.getMonth() + 1) === currMonth && join.getDate() > 1) {
      const dayOfMonth = join.getDate();
      effectiveMaxDays = Math.max(1, totalMonthDays - dayOfMonth + 1);
    }
  }

  // 2. Payable Days calculation
  const halfDaysValue = (attendance.halfDays || 0) * 0.5;
  const presentDays = attendance.daysPresent !== undefined ? attendance.daysPresent : totalMonthDays;
  const paidLeaves = attendance.paidLeaves || 0;
  const unpaidLeaves = attendance.unpaidLeaves || 0;
  const holidaysWorked = attendance.holidaysWorked || 0;

  // Actual payable days: days present + approved paid leaves + half-day fractions
  const rawPayableDays = presentDays + paidLeaves + halfDaysValue;
  // Bound strictly between 0 and totalMonthDays
  const payableDays = Math.min(totalMonthDays, Math.max(0, rawPayableDays));
  const lossOfPayDays = Math.max(0, totalMonthDays - payableDays);

  const prorationFactor = totalMonthDays > 0 ? (payableDays / totalMonthDays) : 1;

  // 3. Base salary calculation according to structure
  let fullMonthlyBase = 0;
  let hourlyRate = 0;

  if (profile.structureType === 'hourly') {
    hourlyRate = profile.hourlyRate || profile.baseSalary || 35;
    // Standard 8h per payable day
    fullMonthlyBase = hourlyRate * 8 * 22; // approx monthly
  } else if (profile.structureType === 'piece_rate') {
    const pieces = attendance.piecesCompleted || 100;
    fullMonthlyBase = profile.baseSalary * pieces;
  } else {
    fullMonthlyBase = attendance.manualBasicPay !== undefined && attendance.manualBasicPay > 0 
      ? attendance.manualBasicPay * 2 // if direct basic is given, scale appropriately or use profile
      : profile.baseSalary;
  }

  // Daily rate for proration & loss of pay (e.g. ₹15,000 / 30 = ₹500/day)
  const dailyRate = (fullMonthlyBase || profile.baseSalary) / (totalMonthDays || 30);
  // Hourly rate based on standard 8-hour workday (e.g. ₹500 / 8 = ₹62.50/hr)
  const standardHourlyRate = dailyRate / 8;

  // 3. Earnings Calculation
  const fullBasic = fullMonthlyBase * 0.50;
  const fullHra = fullBasic * 0.40;
  const fullDa = fullBasic * 0.10;
  const dearnessAllowance = attendance.manualDa !== undefined 
    ? Math.round(attendance.manualDa * 100) / 100 
    : Math.round(fullDa * 100) / 100;
  const fullSpecial = Math.max(0, fullMonthlyBase - (fullBasic + fullHra + dearnessAllowance));

  // If manual Excel earnings are provided, use them exactly; otherwise use standard components
  const basicPay = attendance.manualBasicPay !== undefined
    ? Math.round(attendance.manualBasicPay * 100) / 100
    : Math.round(fullBasic * 100) / 100;

  const hra = attendance.manualHra !== undefined
    ? Math.round(attendance.manualHra * 100) / 100
    : Math.round(fullHra * 100) / 100;

  const specialAllowance = attendance.manualSpecialAllowance !== undefined
    ? Math.round(attendance.manualSpecialAllowance * 100) / 100
    : Math.round(fullSpecial * 100) / 100;

  const otherAllowance = attendance.manualOtherAllowance !== undefined
    ? Math.round(attendance.manualOtherAllowance * 100) / 100
    : 0;

  // 4. Overtime & Holiday Pay
  // Formula: Base Salary / Total Working Days in Month / 8 working hours * OT Hours
  const workingDaysInMonth = totalMonthDays > 0 ? totalMonthDays : 30;
  const baseSalaryAmount = profile.baseSalary || fullMonthlyBase || 0;
  const otHourlyRate = (baseSalaryAmount / workingDaysInMonth) / 8;
  const otHours = attendance.overtimeHours || 0;
  const holidayOtHours = attendance.holidayOvertimeHours || 0;

  let overtimePay = 0;
  if (attendance.manualOvertimePay !== undefined) {
    overtimePay = Math.round(attendance.manualOvertimePay * 100) / 100;
  } else {
    const regularOtPay = otHours * otHourlyRate;
    const holidayOtPay = holidayOtHours * otHourlyRate;
    overtimePay = Math.round((regularOtPay + holidayOtPay) * 100) / 100;
  }

  const holidayWorkPay = holidaysWorked > 0 ? Math.round(holidaysWorked * dailyRate * 100) / 100 : 0;
  
  const performanceBonus = attendance.manualIncentiveBonus !== undefined
    ? Math.round(attendance.manualIncentiveBonus * 100) / 100
    : 0;

  const reimbursements = attendance.manualReimbursements !== undefined
    ? Math.round(attendance.manualReimbursements * 100) / 100
    : 0;

  const conveyanceAllowance = attendance.manualConveyance !== undefined
    ? Math.round(attendance.manualConveyance * 100) / 100
    : 0;

  const medicalAllowance = attendance.manualMedicalAllowance !== undefined
    ? Math.round(attendance.manualMedicalAllowance * 100) / 100
    : 0;

  // Gross Earnings = Direct Excel Gross Salary if provided; otherwise sum of components
  const grossEarnings = attendance.manualGrossSalary !== undefined
    ? Math.round(attendance.manualGrossSalary * 100) / 100
    : Math.round(
        (basicPay + hra + dearnessAllowance + specialAllowance + otherAllowance + conveyanceAllowance + medicalAllowance + overtimePay + holidayWorkPay + performanceBonus + reimbursements) * 100
      ) / 100;

  // 5. Deductions Calculation
  // Loan & Salary Advances from Excel
  const loanAdvance = attendance.manualLoanAdvance !== undefined
    ? Math.round(attendance.manualLoanAdvance * 100) / 100
    : 0;

  // Other Deductions from Excel
  const otherDeductions = attendance.manualOtherDeductions !== undefined
    ? Math.round(attendance.manualOtherDeductions * 100) / 100
    : 0;

  // If Excel specifies total deduction (or if imported from Excel without auto-deductions), strictly honor Excel value
  const isDirectExcelMode = attendance.manualTotalDeduction !== undefined || attendance.manualGrossSalary !== undefined;

  const esi = 0;
  const incomeTaxTDS = 0;
  let providentFund = 0;
  let employerPF = 0;
  let professionalTax = 0;
  let lossOfPayDeduction = 0;
  let lateDeduction = 0;

  if (!isDirectExcelMode) {
    if (attendance.manualPf !== undefined) {
      providentFund = Math.round(attendance.manualPf * 100) / 100;
    } else if (settings.enablePF && settings.pfPercentage > 0) {
      providentFund = basicPay * (settings.pfPercentage / 100);
      if (settings.pfCapLimit > 0 && providentFund > settings.pfCapLimit) {
        providentFund = settings.pfCapLimit;
      }
      providentFund = Math.round(providentFund * 100) / 100;
    }
    employerPF = providentFund;

    if (attendance.manualPt !== undefined) {
      professionalTax = Math.round(attendance.manualPt * 100) / 100;
    } else if (settings.enablePT && (settings.ptSlabAmount || 0) > 0) {
      professionalTax = (settings.ptSlabAmount || 0);
    }

    if (attendance.manualLopDeduction !== undefined) {
      lossOfPayDeduction = Math.round(attendance.manualLopDeduction * 100) / 100;
    } else if (lossOfPayDays > 0) {
      lossOfPayDeduction = Math.round((lossOfPayDays * dailyRate) * 100) / 100;
    }

    if (attendance.manualLateDeduction !== undefined) {
      lateDeduction = Math.round(attendance.manualLateDeduction * 100) / 100;
    } else if (attendance.lateArrivalsCount && attendance.lateArrivalsCount > 0) {
      lateDeduction = Math.round((attendance.lateArrivalsCount * 0.5 * dailyRate) * 100) / 100;
    }
  }

  // Total Deductions
  const totalDeductions = attendance.manualTotalDeduction !== undefined
    ? Math.round(attendance.manualTotalDeduction * 100) / 100
    : Math.round(
        (providentFund + professionalTax + lossOfPayDeduction + lateDeduction + loanAdvance + otherDeductions) * 100
      ) / 100;

  // 6. Net Pay = Direct Excel Net Pay if specified; otherwise (Gross Earnings - Total Deductions)
  const netPay = attendance.manualNetPay !== undefined
    ? Math.round(attendance.manualNetPay * 100) / 100
    : Math.max(0, Math.round((grossEarnings - totalDeductions) * 100) / 100);

  const netPayInWords = numberToWords(netPay, settings.currency === 'USD' ? 'Dollars' : 'Rupees', 'Cents');

  return {
    id: `calc-${profile.empId}-${month}`,
    empId: profile.empId,
    month,
    periodLabel,
    profile,
    attendance,
    totalDays: totalMonthDays,
    payableDays: Math.round(payableDays * 10) / 10,
    lossOfPayDays: Math.round(lossOfPayDays * 10) / 10,
    basicPay,
    hra,
    dearnessAllowance,
    specialAllowance,
    otherAllowance,
    conveyanceAllowance,
    medicalAllowance,
    overtimePay,
    holidayWorkPay,
    performanceBonus,
    reimbursements,
    grossEarnings,
    providentFund,
    employerPF,
    esi,
    professionalTax,
    incomeTaxTDS,
    lossOfPayDeduction,
    lateDeduction,
    loanAdvance,
    otherDeductions,
    totalDeductions,
    netPay,
    netPayInWords,
    paymentMethod: profile.preferredPaymentMethod || 'bank_transfer',
    paymentReference: profile.preferredPaymentMethod === 'cash' 
      ? `CASH-VCHR-${month.replace('-', '')}-${profile.empId.replace(/[^a-zA-Z0-9]/g, '')}`
      : `TXN-${month.replace('-', '')}-${profile.empId.replace(/[^a-zA-Z0-9]/g, '')}`,
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
    status: 'draft',
    isCustomAdjusted: false,
    lastUpdated: new Date().toISOString(),
  };
}
