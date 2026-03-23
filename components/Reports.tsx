import React from 'react';
import { PayrollRun, Employee, PayrollEntry } from '../types';
import { FileText, Download, MessageCircle } from 'lucide-react';
import { exportToCSV, exportToPDF, generatePayslipPDF } from '../services/exportUtils';

interface ReportsProps {
  payrollRuns: PayrollRun[];
  employees: Employee[];
}

const Reports: React.FC<ReportsProps> = ({ payrollRuns, employees }) => {
  const lastRun = payrollRuns[payrollRuns.length - 1];

  const handleShareWhatsApp = (entry: PayrollEntry) => {
    const employee = employees.find(e => e.id === entry.employeeId);
    if (!employee || !lastRun) return;

    // Format phone number: remove non-digits, ensure no leading + if present in logic but usually wa.me needs clean number
    // Assuming phoneNumber in data is like +234..., wa.me expects 234...
    const cleanNumber = employee.phoneNumber.replace(/[^\d]/g, '');
    
    const message = `Hello ${employee.firstName}, your payslip for ${lastRun.month} is ready. \n\nNet Pay: ₦${entry.netPay.toLocaleString()}\n\nPlease login to the employee portal to download the full PDF.`;
    
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const downloadPayslip = (entry: PayrollEntry) => {
      const employee = employees.find(e => e.id === entry.employeeId) || null;
      generatePayslipPDF(entry, employee, lastRun.month);
  };

  const downloadPAYE = (type: 'csv' | 'pdf') => {
    if (!lastRun) return;
    const data = lastRun.entries.map(e => ({
       'Staff ID': e.staffId,
       'Name': e.employeeName,
       'Tax ID': `LAG-${e.staffId.replace('PP-', '')}`, // Mocking Tax ID based on Staff ID
       'Gross Income': e.grossIncome,
       'Tax Payable': e.taxPAYE
    }));

    if (type === 'csv') {
      exportToCSV(data, `LIRS_PAYE_Schedule_${lastRun.month}`);
    } else {
      const headers = Object.keys(data[0]);
      const rows = data.map(obj => Object.values(obj));
      exportToPDF(headers, rows, `LIRS PAYE Schedule - ${lastRun.month}`, `LIRS_PAYE_Schedule_${lastRun.month}`);
    }
  };

  const downloadPension = (type: 'csv' | 'pdf') => {
     if (!lastRun) return;
     const data = lastRun.entries.map(e => {
       const emp = employees.find(emp => emp.id === e.employeeId);
       return {
         'Staff ID': e.staffId,
         'Name': e.employeeName,
         'PFA': emp?.pfa || 'N/A',
         'RSA': emp?.rsaNumber || 'N/A',
         'Employee': e.pensionEmployee.toLocaleString(),
         'Employer': e.pensionEmployer.toLocaleString(),
         'Total': (e.pensionEmployee + e.pensionEmployer).toLocaleString()
       };
     });
     
     if (type === 'csv') {
        exportToCSV(data, `Pension_Schedule_${lastRun.month}`);
     } else {
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => Object.values(obj));
        exportToPDF(headers, rows, `Pension Contribution Schedule - ${lastRun.month}`, `Pension_Schedule_${lastRun.month}`);
     }
  };

  const downloadBank = (type: 'csv' | 'pdf') => {
     if (!lastRun) return;
      const data = lastRun.entries.map(e => ({
         'Account Name': e.employeeName,
         'Bank Code': '058', // Mock GTBank Code
         'Account Number': '0123456789', // Mock
         'Amount': e.netPay.toLocaleString(),
         'Narration': `Salary ${lastRun.month}`
      }));
      
      if (type === 'csv') {
        exportToCSV(data, `Bank_Payment_File_${lastRun.month}`);
      } else {
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => Object.values(obj));
        exportToPDF(headers, rows, `Bank Payment Schedule - ${lastRun.month}`, `Bank_Payment_File_${lastRun.month}`);
      }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 text-slate-900 dark:text-slate-100 pb-24">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Compliance</h2>
        <p className="text-slate-500 dark:text-slate-400">Download schedules for Tax, Pension, and Bank payments for {lastRun ? lastRun.month.split('-')[0] : '2026'}.</p>
      </div>

      {!lastRun ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          No payroll data available. Run payroll first to generate reports.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PAYE Remittance Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">LIRS PAYE Schedule</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">
              Monthly Schedule for Lagos State Internal Revenue Service. Includes Tax ID and Remittance amounts.
            </p>
            <div className="flex justify-between items-end mb-4">
               <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Amount Due</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">₦{lastRun.totalTax.toLocaleString()}</p>
               </div>
            </div>
            <div className="flex gap-2">
               <button 
                onClick={() => downloadPAYE('csv')}
                className="flex-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
               >
                 <Download size={16} /> CSV
               </button>
               <button 
                onClick={() => downloadPAYE('pdf')}
                className="flex-1 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
               >
                 <Download size={16} /> PDF
               </button>
            </div>
          </div>

          {/* Pension Schedule Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="bg-purple-50 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Pension Schedule</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">
              Consolidated schedule for all PFAs (Stanbic, ARM, etc.) with RSA numbers.
            </p>
             <div className="flex justify-between items-end mb-4">
               <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Contribution</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">₦{lastRun.totalPension.toLocaleString()}</p>
               </div>
            </div>
             <div className="flex gap-2">
               <button 
                onClick={() => downloadPension('csv')}
                className="flex-1 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
               >
                 <Download size={16} /> CSV
               </button>
               <button 
                onClick={() => downloadPension('pdf')}
                className="flex-1 text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
               >
                 <Download size={16} /> PDF
               </button>
            </div>
          </div>

          {/* Bank Payment File */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="bg-green-50 dark:bg-green-900/30 w-12 h-12 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Bank Payment File</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 mt-2">
              NIBSS/Bank compatible format for bulk salary transfer.
            </p>
             <div className="flex justify-between items-end mb-4">
               <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Payout</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">₦{lastRun.totalPayout.toLocaleString()}</p>
               </div>
            </div>
             <div className="flex gap-2">
               <button 
                onClick={() => downloadBank('csv')}
                className="flex-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
               >
                 <Download size={16} /> Excel
               </button>
               <button 
                onClick={() => downloadBank('pdf')}
                className="flex-1 text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
               >
                 <Download size={16} /> PDF
               </button>
            </div>
          </div>
        </div>
      )}

      {lastRun && (
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-white">Recent Payslips Generated ({lastRun.month})</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {lastRun.entries.slice(0, 5).map(entry => (
              <div key={entry.employeeId} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div>
                   <p className="font-medium text-slate-900 dark:text-white">{entry.employeeName}</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400">NET: ₦{entry.netPay.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                      onClick={() => handleShareWhatsApp(entry)}
                      className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 p-2 rounded-lg transition"
                      title="Share via WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button 
                      onClick={() => downloadPayslip(entry)}
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                      title="Download Payslip PDF"
                    >
                      <Download size={18} />
                    </button>
                </div>
              </div>
            ))}
             <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 text-center text-sm text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">
               View All Payslips
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;