import { Employee, PayrollEntry, TAX_BANDS } from '../types';

/**
 * Calculates the monthly PAYE tax based on Nigerian Personal Income Tax Act (PITA).
 * Note: PITA is annual, so we annualize monthly figures, calculate annual tax, then divide by 12.
 */
export const calculatePAYE = (grossMonthly: number, pensionMonthly: number, nhfMonthly: number = 0): number => {
  const grossAnnual = grossMonthly * 12;
  const pensionAnnual = pensionMonthly * 12;
  const nhfAnnual = nhfMonthly * 12;

  // Consolidated Relief Allowance (CRA)
  // Higher of 200k or 1% of Gross Annual Income, PLUS 20% of Gross Annual Income
  const baseRelief = Math.max(200000, grossAnnual * 0.01);
  const percentageRelief = grossAnnual * 0.20;
  const cra = baseRelief + percentageRelief;

  // Tax Exempt Items
  const taxExempt = pensionAnnual + nhfAnnual + cra;

  // Chargeable Income
  let chargeableIncome = grossAnnual - taxExempt;

  if (chargeableIncome <= 0) {
    // Minimum Tax Rule: 1% of Gross Income if taxable income is too low (Simplified rule)
    // For this demo, let's just say 0 if negative.
    return Math.max(0, (grossAnnual * 0.01) / 12); 
  }

  let totalTax = 0;
  let remainingIncome = chargeableIncome;

  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const taxableAmount = Math.min(remainingIncome, band.limit);
    totalTax += taxableAmount * band.rate;
    remainingIncome -= taxableAmount;
  }

  return totalTax / 12;
};

export const calculatePayrollEntry = (
  employee: Employee, 
  overtime: number = 0, 
  bonus: number = 0,
  loanRepayment: number = 0
): PayrollEntry => {
  
  // 1. Gross Calculation
  const fixedAllowances = employee.housingAllowance + employee.transportAllowance;
  const grossIncome = employee.basicSalary + fixedAllowances + overtime + bonus;

  // 2. Pension (8% of Basic + Housing + Transport) - Strictly strictly usually Basic+Housing+Transport in practice
  // Some companies do on Basic only, but standard is BHT.
  const pensionableEmolument = employee.basicSalary + employee.housingAllowance + employee.transportAllowance;
  const pensionEmployee = pensionableEmolument * 0.08;
  const pensionEmployer = pensionableEmolument * 0.10;

  // 3. Tax
  const taxPAYE = calculatePAYE(grossIncome, pensionEmployee);

  // 4. Other Deductions
  const loanDeduction = Math.min(loanRepayment, employee.cooperativeLoanBalance); // Cannot deduct more than balance

  const totalDeductions = pensionEmployee + taxPAYE + loanDeduction;
  const netPay = grossIncome - totalDeductions;

  return {
    employeeId: employee.id,
    staffId: employee.staffId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeStatus: employee.status,
    basic: employee.basicSalary,
    housing: employee.housingAllowance,
    transport: employee.transportAllowance,
    grossIncome,
    overtime,
    bonuses: bonus,
    pensionEmployee,
    pensionEmployer,
    taxPAYE,
    loanDeduction,
    otherDeductions: 0,
    totalDeductions,
    netPay,
    isBiometricVerified: employee.faceVerified
  };
};