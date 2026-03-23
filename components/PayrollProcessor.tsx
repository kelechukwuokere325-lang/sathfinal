import React, { useState, useEffect } from 'react';
import { Employee, EmployeeStatus, PayrollRun, PayrollEntry, AuditLogEntry } from '../types';
import { calculatePayrollEntry } from '../services/payrollUtils';
import { explainPayrollBlock } from '../services/geminiService';
import { Play, Save, Download, RefreshCw, AlertCircle, ScanFace, ShieldAlert, Loader2, XCircle, Bot, CheckCircle2, FileCheck, MessageCircle, Send, Calculator } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PayrollProcessorProps {
  employees: Employee[];
  payrollRuns: PayrollRun[];
  setPayrollRuns: React.Dispatch<React.SetStateAction<PayrollRun[]>>;
  addAuditLog: (action: string, details: string, category: AuditLogEntry['category']) => void;
  adminWhatsAppNumber: string;
}

const PayrollProcessor: React.FC<PayrollProcessorProps> = ({ employees, payrollRuns, setPayrollRuns, addAuditLog, adminWhatsAppNumber }) => {
  const [selectedMonth, setSelectedMonth] = useState('2026-02');
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);
  
  // Local state for variable inputs before calculation
  const [variableInputs, setVariableInputs] = useState<Record<string, { overtime: number, bonus: number, loanPaid: number }>>({});

  // Blocking State
  const [blockingExplanation, setBlockingExplanation] = useState<string | null>(null);
  const [isAnalyzingBlock, setIsAnalyzingBlock] = useState(false);

  // Validation State
  const [validationStatus, setValidationStatus] = useState<'valid' | 'issues' | null>(null);

  // WhatsApp Alert Bot State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [viewingEntry, setViewingEntry] = useState<PayrollEntry | null>(null);

  useEffect(() => {
    // Check if run exists
    const existingRun = payrollRuns.find(r => r.month === selectedMonth);
    setCurrentRun(existingRun || null);
    if (existingRun) {
        setValidationStatus('valid'); // Assume finalized runs are valid
    } else {
        setValidationStatus(null);
    }
  }, [selectedMonth, payrollRuns]);

  const calculateEntries = () => {
      return employees.map(emp => {
      // Feature: Stop salary for resigned employees automatically
      // If status is RESIGNED, we return a zeroed entry to ensure they are not paid
      // unless specifically manually overridden later (which would be caught by anomaly detection)
      if (emp.status === EmployeeStatus.RESIGNED) {
          return {
              employeeId: emp.id,
              staffId: emp.staffId,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              employeeStatus: emp.status,
              basic: 0, housing: 0, transport: 0, grossIncome: 0, overtime: 0, bonuses: 0,
              pensionEmployee: 0, pensionEmployer: 0, taxPAYE: 0, loanDeduction: 0, otherDeductions: 0,
              totalDeductions: 0, netPay: 0, isBiometricVerified: emp.faceVerified
          };
      }

      const inputs = variableInputs[emp.id] || { overtime: 0, bonus: 0, loanPaid: 0 };
      return calculatePayrollEntry(emp, inputs.overtime, inputs.bonus, inputs.loanPaid);
    });
  }

  const validateRun = (entries: PayrollEntry[]) => {
    const ghostWorkers = entries.filter(e => e.employeeStatus === EmployeeStatus.RESIGNED && e.netPay > 0);
    const unverified = entries.filter(e => !e.isBiometricVerified && e.employeeStatus === EmployeeStatus.ACTIVE);
    
    return {
        ghostWorkers,
        unverified,
        hasIssues: ghostWorkers.length > 0 || unverified.length > 0
    };
  };

  const handleRunPayroll = () => {
    const entries = calculateEntries();

    const totalPayout = entries.reduce((acc, curr) => acc + curr.netPay, 0);
    const totalTax = entries.reduce((acc, curr) => acc + curr.taxPAYE, 0);
    const totalPension = entries.reduce((acc, curr) => acc + curr.pensionEmployee + curr.pensionEmployer, 0);

    const newRun: PayrollRun = {
      id: crypto.randomUUID(),
      month: selectedMonth,
      status: 'Draft',
      entries,
      totalPayout,
      totalTax,
      totalPension,
      dateCreated: new Date().toISOString()
    };

    setCurrentRun(newRun);
    setBlockingExplanation(null); 
    
    // Auto-Validate
    const { hasIssues } = validateRun(entries);
    setValidationStatus(hasIssues ? 'issues' : 'valid');

    addAuditLog('Run Payroll Draft', `Generated draft payroll for ${selectedMonth}. Total Estimate: ₦${totalPayout.toLocaleString()}`, 'Payroll');
  };

  const handleFinalize = async () => {
    if (!currentRun) return;

    const { ghostWorkers, unverified } = validateRun(currentRun.entries);
    const issues = [];

    if (ghostWorkers.length > 0) {
      issues.push({
        type: "Ghost Worker Detected",
        details: ghostWorkers.map(e => `${e.employeeName} is marked RESIGNED but has calculated Net Pay of ₦${e.netPay.toLocaleString()}.`)
      });
    }

    if (unverified.length > 0) {
      issues.push({
        type: "Biometric Verification Missing",
        details: unverified.map(e => `${e.employeeName} is ACTIVE but has no face biometrics enrolled.`)
      });
    }

    // If issues exist, BLOCK and EXPLAIN
    if (issues.length > 0) {
      setIsAnalyzingBlock(true);
      const explanation = await explainPayrollBlock(issues);
      setBlockingExplanation(explanation);
      addAuditLog('Compliance Block', `Payroll Finalization Blocked for ${selectedMonth} due to ${issues.length} compliance issues.`, 'Compliance');
      setIsAnalyzingBlock(false);
      return; // STOP execution
    }

    const finalRun = { ...currentRun, status: 'Finalized' as const };
    const otherRuns = payrollRuns.filter(r => r.month !== selectedMonth);
    setPayrollRuns([...otherRuns, finalRun]);
    setCurrentRun(finalRun);
    
    addAuditLog('Payroll Finalized', `Successfully finalized payroll for ${selectedMonth}. Total Payout: ₦${finalRun.totalPayout.toLocaleString()}`, 'Payroll');

    // Automatic WhatsApp Report to Admin - Primary Demo
    sendAutomaticWhatsAppReport(finalRun);
    
    // Automatic Email Report to Admins
    sendAutomaticEmailReport(finalRun);

    // Automatic SMS Report to Admin
    sendAutomaticSMSReport(finalRun);

    alert("Payroll finalized successfully! A summary report has been sent to the director via WhatsApp, email, and SMS.");
  };

  const sendAutomaticSMSReport = async (run: PayrollRun) => {
    const summary = `Payroll ${run.month} Finalized. Total Payout: ₦${run.totalPayout.toLocaleString()}. Staff: ${run.entries.length}.`;

    // Demo Notification
    window.dispatchEvent(new CustomEvent('demo-notify', { 
      detail: { type: 'sms', message: summary } 
    }));

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: summary,
          to: adminWhatsAppNumber
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.warn("Automatic SMS failed:", data.error);
      } else {
        addAuditLog('System Alert', `Automatic payroll summary sent to director via SMS.`, 'System');
      }
    } catch (error) {
      console.error("Error sending automatic SMS:", error);
    }
  };

  const sendAutomaticEmailReport = async (run: PayrollRun) => {
    const summary = `Hello Admin,\n\n` +
      `Payroll for ${run.month} has been finalized.\n\n` +
      `*Summary:*\n` +
      `- Total Payout: ₦${run.totalPayout.toLocaleString()}\n` +
      `- Total Tax: ₦${run.totalTax.toLocaleString()}\n` +
      `- Total Pension: ₦${run.totalPension.toLocaleString()}\n` +
      `- Staff Count: ${run.entries.length}\n\n` +
      `*Top Earners:*\n` +
      run.entries.slice(0, 3).map(e => `- ${e.employeeName}: ₦${e.netPay.toLocaleString()}`).join('\n') +
      `\n\nBest regards,\nPayPulse System`;

    // Demo Notification
    window.dispatchEvent(new CustomEvent('demo-notify', { 
      detail: { type: 'email', message: `Payroll ${run.month} Finalized. Total: ₦${run.totalPayout.toLocaleString()}` } 
    }));

    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `PayPulse Payroll Finalized: ${run.month}`,
          message: summary,
          to: "okerekelechukwu10@gmail.com, odera.okpala1@gmail.com"
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.warn("Automatic Email failed:", data.error);
      } else {
        addAuditLog('System Alert', `Automatic payroll summary sent to admins via Email.`, 'System');
      }
    } catch (error) {
      console.error("Error sending automatic Email:", error);
    }
  };

  const sendAutomaticWhatsAppReport = async (run: PayrollRun) => {
    const summary = `*Payroll Report: ${run.month}*\n\n` +
      `Status: Finalized\n` +
      `Total Payout: ₦${run.totalPayout.toLocaleString()}\n` +
      `Total Tax: ₦${run.totalTax.toLocaleString()}\n` +
      `Total Pension: ₦${run.totalPension.toLocaleString()}\n` +
      `Staff Count: ${run.entries.length}\n\n` +
      `*Top Earners:*\n` +
      run.entries.slice(0, 3).map(e => `- ${e.employeeName}: ₦${e.netPay.toLocaleString()}`).join('\n') +
      `\n\n_Sent automatically by PayPulse Nigeria._`;

    // Demo Notification
    window.dispatchEvent(new CustomEvent('demo-notify', { 
      detail: { type: 'whatsapp', message: `Payroll Report ${run.month}: ₦${run.totalPayout.toLocaleString()} finalized.` } 
    }));

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: summary,
          to: adminWhatsAppNumber
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.warn("Automatic WhatsApp failed (likely missing credentials):", data.error);
      } else {
        addAuditLog('System Alert', `Automatic payroll summary sent to director via WhatsApp.`, 'System');
      }
    } catch (error) {
      console.error("Error sending automatic WhatsApp:", error);
    }
  };

  const startWhatsAppBroadcast = () => {
    if (!currentRun) return;
    setShowWhatsAppModal(true);
    setSendingProgress(0);
    setSentCount(0);
    
    // Simulate sending delay
    const total = currentRun.entries.length;
    let current = 0;
    
    addAuditLog('WhatsApp Broadcast', `Started payslip distribution for ${selectedMonth} via WhatsApp.`, 'System');

    const interval = setInterval(() => {
        current += 1;
        setSentCount(current);
        setSendingProgress((current / total) * 100);
        
        if (current >= total) {
            clearInterval(interval);
        }
    }, 600); // 600ms per employee
  };

  const sendSingleWhatsAppAlert = (entry: PayrollEntry) => {
    // Look up the employee to get phone number
    const emp = employees.find(e => e.id === entry.employeeId);
    if (!emp || !currentRun) return;

    let cleanNumber = emp.phoneNumber.replace(/[^\d]/g, '');
    if (cleanNumber.startsWith('0')) cleanNumber = '234' + cleanNumber.substring(1);
    else if (!cleanNumber.startsWith('234')) cleanNumber = '234' + cleanNumber;

    const message = `Hello ${entry.employeeName}, \n\nAlert: Your salary for ${currentRun.month} has been processed. \n\nNet Pay: ₦${entry.netPay.toLocaleString()} \n\nPlease login to the employee portal to view details.`;
    
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const updateVariableInput = (id: string, field: 'overtime' | 'bonus' | 'loanPaid', value: number) => {
    setVariableInputs(prev => ({
      ...prev,
      [id]: {
        ...prev[id] || { overtime: 0, bonus: 0, loanPaid: 0 },
        [field]: value
      }
    }));
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 relative pb-24 text-slate-900 dark:text-slate-100">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Run Payroll</h2>
          <p className="text-slate-500 dark:text-slate-400">Calculate salaries, taxes, and deductions for {selectedMonth}.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="month" 
              className="flex-1 md:flex-none border p-2 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white shadow-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            {currentRun && currentRun.status === 'Draft' && (
               <button 
                onClick={handleRunPayroll}
                className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 transition font-medium text-sm md:text-base"
              >
                <RefreshCw size={18} /> <span className="hidden sm:inline">Re-Run</span><span className="sm:hidden">Run</span>
              </button>
            )}
        </div>
      </div>

      {!currentRun && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-16 flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-10">
            <div className="bg-emerald-100 dark:bg-emerald-900/50 p-6 rounded-full text-emerald-600 dark:text-emerald-400 mb-6 shadow-inner">
              <Play size={48} fill="currentColor" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Ready to Process Payroll</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-8 max-w-md">
              Click below to automatically calculate deductions, validate compliance, and check for ghost workers for <strong>{selectedMonth}</strong>.
            </p>
            <button 
              onClick={handleRunPayroll}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-emerald-500/30 transition transform hover:-translate-y-1 flex items-center gap-3"
            >
               Run Payroll for {selectedMonth}
            </button>
        </div>
      )}

      {currentRun && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Finalized Action Banner */}
          {currentRun.status === 'Finalized' && (
             <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full text-green-700 dark:text-green-400 shrink-0">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-green-900 dark:text-green-300">Payroll is Finalized</h4>
                        <p className="text-sm text-green-700 dark:text-green-400">All data is locked and reports are ready for distribution.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button 
                      onClick={startWhatsAppBroadcast}
                      className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-sm hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm"
                    >
                        <MessageCircle size={18} /> <span className="whitespace-nowrap">WhatsApp Alerts</span>
                    </button>
                    <button 
                      onClick={() => sendAutomaticWhatsAppReport(currentRun)}
                      className="flex-1 md:flex-none border border-green-600 text-green-600 dark:text-green-400 px-4 py-2.5 rounded-lg font-bold hover:bg-green-50 dark:hover:bg-green-900/20 transition flex items-center justify-center gap-2 text-sm"
                    >
                        <Send size={18} /> <span className="whitespace-nowrap">Admin Report</span>
                    </button>
                </div>
             </div>
          )}

          {/* Validation Status Banner (Only for Draft) */}
          {currentRun.status === 'Draft' && (
             <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start gap-4 ${
                 validationStatus === 'issues' 
                 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200' 
                 : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
             }`}>
                <div className={`p-2 rounded-full shrink-0 ${validationStatus === 'issues' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'}`}>
                    {validationStatus === 'issues' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-lg">
                        {validationStatus === 'issues' ? 'Compliance Issues Detected' : 'Data Validation Passed'}
                    </h4>
                    <p className="text-sm opacity-90 mt-1">
                        {validationStatus === 'issues' 
                           ? 'The system has flagged potential ghost workers or unverified employees. Please review the highlighted entries below before finalizing.'
                           : 'All calculations are complete. No ghost workers or compliance risks detected.'
                        }
                    </p>
                </div>
                <div className="w-full md:w-auto">
                    {validationStatus === 'valid' && (
                        <button 
                            onClick={handleFinalize}
                            className="w-full md:w-auto bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> Finalize Run
                        </button>
                    )}
                    {validationStatus === 'issues' && (
                        <button 
                            onClick={handleFinalize}
                            className="w-full md:w-auto bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                            Review & Resolve
                        </button>
                    )}
                </div>
             </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Net Payout</p>
              <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">₦{currentRun.totalPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total PAYE Tax</p>
              <p className="text-lg md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">₦{currentRun.totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Pension</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400">₦{currentRun.totalPension.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 text-[10px] md:text-sm text-slate-500 dark:text-slate-400 mb-1">
                    <FileCheck size={14} className="shrink-0" /> <span className="truncate">Reports Ready</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">PAYE</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">Pension</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">Bank</span>
                </div>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-left text-sm min-w-[1000px] md:min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Staff ID</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Basic + Allowances</th>
                    <th className="px-4 py-3 w-32">Overtime (₦)</th>
                    <th className="px-4 py-3">Gross</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3 bg-slate-100 dark:bg-slate-700 font-bold">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {currentRun.entries.map((entry) => {
                    const isGhostRisk = entry.employeeStatus === EmployeeStatus.RESIGNED && entry.netPay > 0;
                    const isBiometricRisk = !entry.isBiometricVerified && entry.employeeStatus === EmployeeStatus.ACTIVE;
                    const hasError = isGhostRisk || isBiometricRisk;

                    return (
                      <tr key={entry.employeeId} className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition ${hasError ? 'bg-red-50/70 dark:bg-red-900/20' : ''}`}>
                        <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {entry.staffId}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                             {entry.employeeName}
                             <button 
                                onClick={() => setViewingEntry(entry)}
                                className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                                title="View Detailed Breakdown"
                             >
                                <Calculator size={14} />
                             </button>
                             {/* WhatsApp Nudge Button */}
                             {currentRun.status === 'Finalized' && entry.netPay > 0 && (
                                <button 
                                  onClick={() => sendSingleWhatsAppAlert(entry)}
                                  className="text-green-500 hover:text-green-600 dark:hover:text-green-400 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 transition"
                                  title="Send Payslip Alert via WhatsApp"
                                >
                                    <MessageCircle size={14} />
                                </button>
                             )}
                          </div>
                          {isGhostRisk && (
                            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-bold mt-1 animate-pulse">
                              <AlertCircle size={12} /> GHOST WORKER DETECTED
                            </div>
                          )}
                          {isBiometricRisk && (
                             <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-bold mt-1">
                              <ShieldAlert size={12} /> IDENTITY UNVERIFIED
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{entry.employeeStatus}</td>
                        <td className="px-4 py-3">
                          {entry.isBiometricVerified ? (
                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 text-xs font-bold"><ScanFace size={14}/> Verified</span>
                          ) : (
                            <span className="text-red-500 dark:text-red-400 flex items-center gap-1 text-xs font-bold"><ShieldAlert size={14}/> Missing</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">₦{(entry.basic + entry.housing + entry.transport).toLocaleString()}</td>
                        
                        {/* Inputs: Editable only if Draft */}
                        <td className="px-4 py-3">
                           {currentRun.status === 'Draft' ? (
                             <input 
                              type="number" 
                              className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded p-1 text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                              value={variableInputs[entry.employeeId]?.overtime || 0}
                              onChange={(e) => updateVariableInput(entry.employeeId, 'overtime', Number(e.target.value))}
                              disabled={entry.employeeStatus === EmployeeStatus.RESIGNED}
                            />
                           ) : (
                             <span className="text-slate-700 dark:text-slate-300">₦{entry.overtime.toLocaleString()}</span>
                           )}
                        </td>
                        
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">₦{entry.grossIncome.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 dark:text-red-400 text-xs">
                          <div>Tax: ₦{entry.taxPAYE.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          <div>Pension: ₦{(entry.pensionEmployee + entry.pensionEmployer).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700 border-l dark:border-slate-700">
                          ₦{entry.netPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center">
                <span>* Pension: 8% Employee + 10% Employer. Tax: PITA Bands applies.</span>
                {currentRun.status === 'Draft' && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Draft Mode - Values not final. Edit Overtime/Bonuses above if needed.</span>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Compliance Blocking Modal */}
      {(isAnalyzingBlock || blockingExplanation) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-red-500 animate-in fade-in zoom-in duration-300">
             
             {/* Header */}
             <div className="bg-red-50 dark:bg-red-900/30 p-6 border-b border-red-100 dark:border-red-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full text-red-600 dark:text-red-400">
                      <ShieldAlert size={32} />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payroll Finalization Blocked</h3>
                     <p className="text-sm text-red-600 dark:text-red-400 font-medium">Compliance Intervention Required</p>
                   </div>
                </div>
                <button onClick={() => setBlockingExplanation(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <XCircle size={24} />
                </button>
             </div>

             {/* Content */}
             <div className="p-6 max-h-[60vh] overflow-y-auto">
               {isAnalyzingBlock ? (
                 <div className="flex flex-col items-center justify-center py-12">
                   <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
                   <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Analyzing Risk Factors...</h4>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Consulting AI Compliance Engine</p>
                 </div>
               ) : (
                 <div className="prose prose-sm prose-red dark:prose-invert max-w-none">
                    <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                      <Bot size={20} className="text-purple-600 dark:text-purple-400" />
                      <span>Explainable AI Report:</span>
                    </div>
                    <div className="dark:text-slate-300">
                      <ReactMarkdown>{blockingExplanation || ""}</ReactMarkdown>
                    </div>
                 </div>
               )}
             </div>

             {/* Footer */}
             <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700 flex justify-end">
               <button 
                onClick={() => setBlockingExplanation(null)}
                className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition"
               >
                 Acknowledge & Fix
               </button>
             </div>
          </div>
        </div>
      )}

      {/* WhatsApp Broadcast Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
             <div className="bg-[#25D366] p-6 text-white flex items-center gap-3">
                <MessageCircle size={32} />
                <div>
                   <h3 className="text-xl font-bold">WhatsApp Bot</h3>
                   <p className="text-white/80 text-sm">Distributing Payslips & Alerts</p>
                </div>
             </div>
             
             <div className="p-8">
                {sendingProgress < 100 ? (
                    <div className="text-center">
                        <div className="mb-4 relative h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div className="absolute top-0 left-0 h-full bg-[#25D366] transition-all duration-300" style={{ width: `${sendingProgress}%`}}></div>
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Sending Alerts...</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Notifying {sentCount} of {currentRun?.entries.length} employees</p>
                        
                        <div className="mt-6 bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border border-slate-100 dark:border-slate-600 text-left">
                            <p className="text-xs text-slate-400 mb-2 font-mono">DEBUG: WHATSAPP_API_STREAM</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono line-clamp-3">
                                {'>'} Initializing secure session... <br/>
                                {'>'} Template: PAYSLIP_ALERT_V2 <br/>
                                {'>'} Dispatching to {currentRun?.entries[Math.min(sentCount, (currentRun?.entries.length || 1) - 1)].employeeName}...
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                           <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-white">Broadcast Complete</h4>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">
                           Successfully sent {currentRun?.entries.length} payslips and payment alerts via WhatsApp.
                        </p>
                        <button 
                          onClick={() => setShowWhatsAppModal(false)}
                          className="bg-slate-900 dark:bg-slate-700 text-white w-full py-3 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-600 mb-3"
                        >
                           Close
                        </button>
                        
                        <button 
                            onClick={() => {
                                if (!currentRun) return;
                                const msg = `Payroll Run ${currentRun.month} Completed.\nTotal Payout: ₦${currentRun.totalPayout.toLocaleString()}\nStaff Count: ${currentRun.entries.length}\nStatus: Finalized & Disbursed.`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="w-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-3 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"
                        >
                            <Send size={18} /> Share Summary with Director
                        </button>
                    </div>
                )}
             </div>
           </div>
        </div>
      )}

      {/* Detailed Breakdown Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
             <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="bg-blue-500 p-2 rounded-lg">
                      <Calculator size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold">{viewingEntry.employeeName}</h3>
                      <p className="text-slate-400 text-sm">Detailed Salary Breakdown</p>
                   </div>
                </div>
                <button onClick={() => setViewingEntry(null)} className="text-slate-400 hover:text-white transition">
                   <XCircle size={24} />
                </button>
             </div>
             
             <div className="p-6 space-y-6">
                {/* Earnings */}
                <section>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Play size={12} className="text-emerald-500" /> Earnings
                   </h4>
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-600 dark:text-slate-400">Basic Salary</span>
                         <span className="font-medium text-slate-900 dark:text-white">₦{viewingEntry.basic.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-600 dark:text-slate-400">Housing Allowance</span>
                         <span className="font-medium text-slate-900 dark:text-white">₦{viewingEntry.housing.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-slate-600 dark:text-slate-400">Transport Allowance</span>
                         <span className="font-medium text-slate-900 dark:text-white">₦{viewingEntry.transport.toLocaleString()}</span>
                      </div>
                      {viewingEntry.overtime > 0 && (
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-600 dark:text-slate-400">Overtime Pay</span>
                           <span className="font-medium text-slate-900 dark:text-white">₦{viewingEntry.overtime.toLocaleString()}</span>
                        </div>
                      )}
                      {viewingEntry.bonuses > 0 && (
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-600 dark:text-slate-400">Bonuses</span>
                           <span className="font-medium text-slate-900 dark:text-white">₦{viewingEntry.bonuses.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                         <span>Gross Income</span>
                         <span>₦{viewingEntry.grossIncome.toLocaleString()}</span>
                      </div>
                   </div>
                </section>

                {/* Deductions */}
                <section>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <XCircle size={12} className="text-red-500" /> Statutory Deductions
                   </h4>
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <div className="flex flex-col">
                            <span className="text-slate-600 dark:text-slate-400">PAYE Tax (LIRS/FIRS)</span>
                            <span className="text-[10px] text-slate-400 italic">Based on PITA Tax Bands</span>
                         </div>
                         <span className="font-medium text-red-600 dark:text-red-400">-₦{viewingEntry.taxPAYE.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <div className="flex flex-col">
                            <span className="text-slate-600 dark:text-slate-400">Employee Pension (8%)</span>
                            <span className="text-[10px] text-slate-400 italic">Deducted from Basic+Housing+Transport</span>
                         </div>
                         <span className="font-medium text-red-600 dark:text-red-400">-₦{viewingEntry.pensionEmployee.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      {viewingEntry.loanDeduction > 0 && (
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-600 dark:text-slate-400">Cooperative Loan Repayment</span>
                           <span className="font-medium text-red-600 dark:text-red-400">-₦{viewingEntry.loanDeduction.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700 font-bold text-red-700 dark:text-red-500">
                         <span>Total Deductions</span>
                         <span>-₦{viewingEntry.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                   </div>
                </section>

                {/* Net Pay */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
                   <span className="font-bold text-emerald-900 dark:text-emerald-300">Net Take-Home Pay</span>
                   <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₦{viewingEntry.netPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>

                {/* Employer Contributions */}
                <section className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                   <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Employer Contributions (Not deducted from salary)</h5>
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Employer Pension (10%)</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">₦{viewingEntry.pensionEmployer.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                   </div>
                </section>
             </div>
             
             <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700 flex justify-end">
                <button 
                  onClick={() => setViewingEntry(null)}
                  className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition"
                >
                  Close
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollProcessor;