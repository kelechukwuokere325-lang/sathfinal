
export enum EmployeeStatus {
  ACTIVE = 'Active',
  RESIGNED = 'Resigned',
  SUSPENDED = 'Suspended',
  ON_LEAVE = 'On Leave'
}

export interface Employee {
  id: string;
  staffId: string; // NEW: Staff ID Number
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string; // NEW: For WhatsApp Alerts
  designation: string;
  department: string;
  basicSalary: number; // Annual or Monthly? Let's assume Monthly Basic for simplicity in this demo model
  housingAllowance: number;
  transportAllowance: number;
  pfa: string; // Pension Fund Administrator
  rsaNumber: string; // Retirement Savings Account
  status: EmployeeStatus;
  joinDate: string;
  exitDate?: string; // NEW: For Offboarding
  cooperativeLoanBalance: number;
  faceVerified: boolean; // NEW: Biometric status
  biometricImage?: string; // NEW: Stored face data (mock)
}

export interface PayrollEntry {
  employeeId: string;
  staffId: string; // NEW: Staff ID Number
  employeeName: string;
  employeeStatus: EmployeeStatus;
  basic: number;
  housing: number;
  transport: number;
  grossIncome: number;
  overtime: number;
  bonuses: number;
  
  // Deductions
  pensionEmployee: number; // 8%
  pensionEmployer: number; // 10%
  taxPAYE: number;
  loanDeduction: number;
  otherDeductions: number;
  
  totalDeductions: number;
  netPay: number;
  isBiometricVerified: boolean; // NEW: Snapshot of verification status at time of run
}

export interface PayrollRun {
  id: string;
  month: string; // YYYY-MM
  status: 'Draft' | 'Finalized';
  entries: PayrollEntry[];
  totalPayout: number;
  totalTax: number;
  totalPension: number;
  dateCreated: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  category: 'Payroll' | 'Employee' | 'Compliance' | 'System';
}

export interface PayrollForecast {
  predictedCost: number;
  percentageChange: number;
  confidenceScore: string;
  factors: string[];
  strategicAdvice: string;
}

export interface TaxBand {
  limit: number;
  rate: number;
}

export interface ComplianceTask {
  id: string;
  title: string;
  authority: string; // e.g., LIRS, PENCOM
  dueDate: string;
  daysRemaining: number;
  status: 'Pending' | 'Filed' | 'Overdue';
  severity: 'Critical' | 'Warning' | 'Good';
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Missed';
  progress: number;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewPeriod: string;
  status: 'Draft' | 'Self-Assessment Pending' | 'Manager Review Pending' | 'Completed';
  goals: PerformanceGoal[];
  selfAssessment: {
    achievements: string;
    challenges: string;
    rating: number;
  };
  managerFeedback: {
    comments: string;
    rating: number;
    areasForImprovement: string;
  };
  finalScore?: number;
  dateCompleted?: string;
}

export interface PayrollIssue {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  description: string;
  status: 'Open' | 'Resolved';
  dateReported: string;
  resolutionNotes?: string;
}

export interface VerificationCycle {
  id: string;
  startDate: string;
  endDate: string; // Deadline
  status: 'Active' | 'Completed' | 'Expired';
  triggeredBy: 'System' | 'Admin';
  totalEmployees: number;
  verifiedCount: number;
}

export interface EmployeeVerification {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  status: 'Pending' | 'Verified' | 'Flagged' | 'Expired';
  verificationDate?: string;
  isActivelyWorking?: boolean;
  isRoleSame?: boolean;
  selfieImage?: string; // Base64
  flagReason?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm:ss
  checkOut?: string; // HH:mm:ss
  status: 'Present' | 'Absent' | 'Late' | 'Half-Day';
  location?: string;
  notes?: string;
  verified?: boolean;
}

// Nigerian PAYE Bands (Annualized simplified)
export const TAX_BANDS: TaxBand[] = [
  { limit: 300000, rate: 0.07 },
  { limit: 300000, rate: 0.11 },
  { limit: 500000, rate: 0.15 },
  { limit: 500000, rate: 0.19 },
  { limit: 1600000, rate: 0.21 },
  { limit: Infinity, rate: 0.24 } // 3.2M and above
];

export interface WorkConfirmation {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  status: string;
}

export interface Notification {
  id: string;
  type: 'work_confirmation' | 'system' | 'payroll';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}
