import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Ghost, Clock, AlertCircle, ShieldAlert, X, Zap, UserPlus } from 'lucide-react';
import { Employee, EmployeeStatus, AttendanceRecord, PayrollIssue } from '../types';

interface DemoControllerProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  addPayrollIssue: (issue: Omit<PayrollIssue, 'id' | 'dateReported' | 'status'>) => void;
  addAuditLog: (action: string, details: string, category: any) => void;
}

const DemoController: React.FC<DemoControllerProps> = ({ 
  employees, 
  setEmployees, 
  attendanceRecords, 
  setAttendanceRecords,
  addPayrollIssue,
  addAuditLog
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const simulateGhostWorker = () => {
    // Find an active employee and mark them as resigned
    const activeEmp = employees.find(e => e.status === EmployeeStatus.ACTIVE);
    if (activeEmp) {
      setEmployees(prev => prev.map(e => e.id === activeEmp.id ? { ...e, status: EmployeeStatus.RESIGNED } : e));
      addAuditLog('Demo Simulation', `Simulated Ghost Worker Risk: ${activeEmp.firstName} marked as Resigned.`, 'Compliance');
      
      window.dispatchEvent(new CustomEvent('demo-notify', { 
        detail: { type: 'whatsapp', message: `DEMO ALERT: Potential Ghost Worker detected: ${activeEmp.firstName} ${activeEmp.lastName}.` } 
      }));
    }
  };

  const simulateLateAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeEmps = employees.filter(e => e.status === EmployeeStatus.ACTIVE);
    const randomEmps = activeEmps.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    const newRecords: AttendanceRecord[] = randomEmps.map(emp => ({
      id: Math.random().toString(36).substring(7),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date: today,
      checkIn: '09:45 AM',
      status: 'Late'
    }));

    setAttendanceRecords(prev => [...prev, ...newRecords]);
    addAuditLog('Demo Simulation', `Simulated Late Attendance for ${randomEmps.length} employees.`, 'System');
    
    window.dispatchEvent(new CustomEvent('demo-notify', { 
      detail: { type: 'sms', message: `DEMO: ${randomEmps.length} employees clocked in late today.` } 
    }));
  };

  const simulateNewIssue = () => {
    const activeEmp = employees[Math.floor(Math.random() * employees.length)];
    addPayrollIssue({
      employeeId: activeEmp.id,
      employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
      type: 'Incorrect Deduction',
      description: 'Employee claims their pension deduction was calculated incorrectly for last month.'
    });
    addAuditLog('Demo Simulation', `Simulated New Payroll Issue for ${activeEmp.firstName}.`, 'Payroll');
  };

  const simulateBiometricFailure = () => {
    window.dispatchEvent(new CustomEvent('demo-notify', { 
      detail: { type: 'whatsapp', message: `SECURITY ALERT: Biometric verification failed for Staff ID: PP-005. Access Blocked.` } 
    }));
    addAuditLog('Security Alert', `Simulated Biometric Failure for Staff ID: PP-005`, 'Compliance');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 mb-4 w-64 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4 border-b dark:border-slate-700 pb-2">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Zap size={16} className="text-amber-500" /> Demo Scenarios
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <button 
                onClick={simulateGhostWorker}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition text-sm text-slate-700 dark:text-slate-300"
              >
                <Ghost size={16} className="text-purple-500" />
                <span>Ghost Worker Risk</span>
              </button>
              
              <button 
                onClick={simulateLateAttendance}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition text-sm text-slate-700 dark:text-slate-300"
              >
                <Clock size={16} className="text-blue-500" />
                <span>Late Attendance</span>
              </button>

              <button 
                onClick={simulateNewIssue}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition text-sm text-slate-700 dark:text-slate-300"
              >
                <AlertCircle size={16} className="text-amber-500" />
                <span>New Payroll Issue</span>
              </button>

              <button 
                onClick={simulateBiometricFailure}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition text-sm text-slate-700 dark:text-slate-300"
              >
                <ShieldAlert size={16} className="text-red-500" />
                <span>Biometric Failure</span>
              </button>
            </div>
            
            <div className="mt-4 pt-2 border-t dark:border-slate-700 text-[10px] text-slate-400 text-center italic">
              Use these to trigger demo-worthy events instantly.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-800 rotate-90' : 'bg-emerald-600 text-white hover:bg-emerald-700 scale-110'
        }`}
      >
        {isOpen ? <X size={24} /> : <Zap size={24} fill="currentColor" />}
      </button>
    </div>
  );
};

export default DemoController;
