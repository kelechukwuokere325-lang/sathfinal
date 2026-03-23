import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EmployeeRegister from './components/EmployeeRegister';
import PayrollProcessor from './components/PayrollProcessor';
import Reports from './components/Reports';
import GeminiAudit from './components/GeminiAudit';
import EmployeePortal from './components/EmployeePortal';
import AuditLogViewer from './components/AuditLogViewer';
import Forecasting from './components/Forecasting';
import IssueTracker from './components/IssueTracker';
import PerformanceReviewModule from './components/PerformanceReview';
import GlobalFaceAuth from './components/GlobalFaceAuth';
import MapLocator from './components/MapLocator';
import AttendanceManager from './components/AttendanceManager';
import Settings from './components/Settings';
import { Employee, EmployeeStatus, PayrollRun, AuditLogEntry, PayrollEntry, PayrollIssue, PerformanceReview, VerificationCycle, EmployeeVerification, AttendanceRecord } from './types';
import { calculatePayrollEntry } from './services/payrollUtils';
import StaffVerification from './components/StaffVerification';
import LandingPage from './components/LandingPage';
import DemoController from './components/DemoController';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Smartphone, Mail } from 'lucide-react';

// Helper to generate random employees
const generateDummyData = () => {
  const departments = ['Production', 'Sales', 'HR', 'Finance', 'Logistics', 'Engineering', 'Quality Control'];
  const designations = ['Operator', 'Supervisor', 'Manager', 'Assistant', 'Analyst', 'Driver', 'Technician'];
  const pfas = ['Stanbic IBTC Pension Managers', 'ARM Pension Managers', 'Leadway Pensure', 'Fidelity Pension', 'Premium Pension'];
  const firstNames = ['Olu', 'Ade', 'Chi', 'Emeka', 'Fatima', 'Musa', 'Ngozi', 'Yusuf', 'Zainab', 'Bisi', 'Kemi', 'Tunde', 'Sola', 'Femi', 'Chika', 'Ibrahim', 'Samuel', 'David', 'Sarah', 'Grace', 'Emmanuel', 'Precious', 'Kehinde', 'Idris', 'Blessing'];
  const lastNames = ['Adeyemi', 'Okonkwo', 'Balogun', 'Ojo', 'Ibrahim', 'Mohammed', 'Eze', 'Okafor', 'Lawal', 'Bello', 'Odunsi', 'Soweto', 'Danladi', 'Okeke', 'Adebayo', 'Oni', 'Bakare', 'Cole', 'Davies', 'Ajayi', 'Nwosu', 'Danjuma', 'Bankole', 'Popoola', 'Sanni'];

  const employees: Employee[] = [];

  // 1. Add Specific Demo Characters - Updated to use the requested example phone number for testing
  employees.push(
    { id: '1', staffId: 'PP-001', firstName: 'Tola', lastName: 'Adeyemi', email: 'tola.a@company.com', phoneNumber: '+2348133192655', designation: 'Production Supervisor', department: 'Production', basicSalary: 150000, housingAllowance: 70000, transportAllowance: 30000, pfa: 'Stanbic IBTC Pension Managers', rsaNumber: 'PEN100234', status: EmployeeStatus.ACTIVE, joinDate: '2023-01-10', cooperativeLoanBalance: 0, faceVerified: true, biometricImage: 'MASTER_FACE_REFERENCE' },
    { id: '2', staffId: 'PP-002', firstName: 'Chinedu', lastName: 'Okonkwo', email: 'chinedu.o@company.com', phoneNumber: '+2348133192655', designation: 'Machine Operator', department: 'Production', basicSalary: 80000, housingAllowance: 30000, transportAllowance: 20000, pfa: 'ARM Pension Managers', rsaNumber: 'PEN100555', status: EmployeeStatus.ACTIVE, joinDate: '2024-05-15', cooperativeLoanBalance: 50000, faceVerified: true, biometricImage: 'MASTER_FACE_REFERENCE' },
    { id: '3', staffId: 'PP-003', firstName: 'Segun', lastName: 'Balogun', email: 'segun.b@company.com', phoneNumber: '+2348055555555', designation: 'Factory Worker', department: 'Production', basicSalary: 70000, housingAllowance: 25000, transportAllowance: 15000, pfa: 'Stanbic IBTC Pension Managers', rsaNumber: 'PEN100999', status: EmployeeStatus.ACTIVE, joinDate: '2025-02-01', cooperativeLoanBalance: 0, faceVerified: false }
  );

  // 2. Generate remaining to reach 250
  for (let i = 4; i <= 250; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const dept = departments[Math.floor(Math.random() * departments.length)];
    const desig = designations[Math.floor(Math.random() * designations.length)];
    const pfa = pfas[Math.floor(Math.random() * pfas.length)];
    
    // Random salary between 60k and 450k basic
    const basic = Math.floor(Math.random() * (450000 - 60000) + 60000);
    const housing = Math.floor(basic * 0.4); // 40% of basic
    const transport = Math.floor(basic * 0.2); // 20% of basic

    employees.push({
      id: i.toString(),
      staffId: `PP-${i.toString().padStart(3, '0')}`,
      firstName: fn,
      lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@company.com`,
      phoneNumber: `+23480${Math.floor(Math.random() * 90000000) + 10000000}`,
      designation: desig,
      department: dept,
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      pfa: pfa,
      rsaNumber: `PEN${Math.floor(Math.random() * 899999) + 100000}`,
      status: Math.random() > 0.95 ? EmployeeStatus.RESIGNED : EmployeeStatus.ACTIVE, // 5% resigned
      joinDate: '2024-06-15',
      cooperativeLoanBalance: Math.random() > 0.8 ? Math.floor(Math.random() * 200000) : 0, // 20% have loans
      faceVerified: Math.random() > 0.1 // 90% verified
    });
  }

  // 3. Generate Historical Payroll Run (Jan 2026)
  const entries: PayrollEntry[] = employees.map(emp => {
      // Simulate that some active employees might have been resigned last month (unlikely) or just different values
      return calculatePayrollEntry(emp, 0, 0, 0); 
  });

  const totalPayout = entries.reduce((acc, curr) => acc + curr.netPay, 0);
  const totalTax = entries.reduce((acc, curr) => acc + curr.taxPAYE, 0);
  const totalPension = entries.reduce((acc, curr) => acc + curr.pensionEmployee + curr.pensionEmployer, 0);

  const historicalRun: PayrollRun = {
    id: 'run-jan-2026',
    month: '2026-01',
    status: 'Finalized',
    dateCreated: '2026-01-28T14:30:00.000Z',
    entries: entries,
    totalPayout,
    totalTax,
    totalPension
  };

  // 4. Generate Attendance Records for Today
  const attendanceRecords: AttendanceRecord[] = [];
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  employees.slice(0, 50).forEach((emp, idx) => {
    // Today's records (some present, some late)
    if (Math.random() > 0.1) {
      const isLate = Math.random() > 0.8;
      attendanceRecords.push({
        id: `att-today-${idx}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        date: today,
        checkIn: isLate ? '09:15 AM' : '08:00 AM',
        checkOut: Math.random() > 0.5 ? '05:00 PM' : undefined,
        status: isLate ? 'Late' : 'Present',
        location: 'Main Office',
        verified: true
      });
    }

    // Yesterday's records
    if (Math.random() > 0.05) {
      attendanceRecords.push({
        id: `att-yest-${idx}`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        date: yesterday,
        checkIn: '08:00 AM',
        checkOut: '05:00 PM',
        status: 'Present',
        location: 'Main Office',
        verified: true
      });
    }
  });

  return { employees, payrollRuns: [historicalRun], attendanceRecords };
};

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
    { id: 'log-1', timestamp: '2026-01-28T14:30:00.000Z', action: 'Payroll Finalized', user: 'Mr. Adebayo', details: 'Finalized payroll for January 2026.', category: 'Payroll' },
    { id: 'log-2', timestamp: '2026-01-20T10:15:00.000Z', action: 'Employee Update', user: 'Mr. Adebayo', details: 'Updated housing allowance for Tola Adeyemi to ₦70,000', category: 'Employee' },
    { id: 'log-3', timestamp: '2026-01-15T09:00:00.000Z', action: 'System Init', user: 'System', details: 'System initialized and compliance tables updated for FY2026', category: 'System' },
];

const INITIAL_ISSUES: PayrollIssue[] = [
    { id: 'iss-1', employeeId: '2', employeeName: 'Chinedu Okonkwo', type: 'Incorrect Salary Amount', description: 'My overtime for last weekend was not included in January pay.', status: 'Open', dateReported: '2026-02-01T09:30:00.000Z' },
    { id: 'iss-2', employeeId: '1', employeeName: 'Tola Adeyemi', type: 'Pension Not Remitted', description: 'I got an alert from my PFA that Dec contribution is missing.', status: 'Resolved', dateReported: '2026-01-25T14:00:00.000Z', resolutionNotes: 'Payment trace sent to PFA, issue resolved.' }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [userRole, setUserRole] = useState<'hr' | 'employee' | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminWhatsAppNumber, setAdminWhatsAppNumber] = useState('+2348133192655');
  const [notificationRecipient, setNotificationRecipient] = useState('+2348145398833');
  const [demoNotifications, setDemoNotifications] = useState<{id: string, type: 'whatsapp' | 'sms' | 'email', message: string, timestamp: Date}[]>([]);

  const triggerDemoNotification = (type: 'whatsapp' | 'sms' | 'email', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setDemoNotifications(prev => [{id, type, message, timestamp: new Date()}, ...prev].slice(0, 5));
    setTimeout(() => {
      setDemoNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  };

  // Add a global listener for demo notifications
  useEffect(() => {
    const handleNotify = (e: any) => {
      triggerDemoNotification(e.detail.type, e.detail.message);
    };
    window.addEventListener('demo-notify', handleNotify);
    return () => window.removeEventListener('demo-notify', handleNotify);
  }, []);
  
  // Use useMemo so we don't regenerate 250 employees on every render
  const { employees: initialEmployees, payrollRuns: initialRuns, attendanceRecords: initialAttendance } = useMemo(() => generateDummyData(), []);
  
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(initialRuns);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [payrollIssues, setPayrollIssues] = useState<PayrollIssue[]>(INITIAL_ISSUES);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [verificationCycles, setVerificationCycles] = useState<VerificationCycle[]>([]);
  const [employeeVerifications, setEmployeeVerifications] = useState<EmployeeVerification[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendance);

  // Effect to toggle body class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const addAuditLog = (action: string, details: string, category: AuditLogEntry['category']) => {
    const newLog: AuditLogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: 'Mr. Adebayo', // Hardcoded for demo
        action,
        details,
        category
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Automatic Verification Trigger (Every 15 days)
  useEffect(() => {
    if (verificationCycles.length === 0) {
      // Initial trigger if none exist
      handleTriggerCycle('System');
      return;
    }

    const lastCycle = verificationCycles[0];
    const lastDate = new Date(lastCycle.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 15) {
      handleTriggerCycle('System');
    }
  }, [verificationCycles]);

  const handleTriggerCycle = (triggeredBy: 'System' | 'Admin' = 'Admin') => {
    const cycleId = crypto.randomUUID();
    const now = new Date();
    const deadline = new Date(now.getTime() + 36 * 60 * 60 * 1000); // 36 hours deadline

    const activeEmployees = employees.filter(e => e.status === EmployeeStatus.ACTIVE);
    
    const newCycle: VerificationCycle = {
      id: cycleId,
      startDate: now.toISOString(),
      endDate: deadline.toISOString(),
      status: 'Active',
      triggeredBy,
      totalEmployees: activeEmployees.length,
      verifiedCount: 0
    };

    const newVerifications: EmployeeVerification[] = activeEmployees.map(e => ({
      id: crypto.randomUUID(),
      cycleId,
      employeeId: e.id,
      employeeName: `${e.firstName} ${e.lastName}`,
      department: e.department,
      status: 'Pending'
    }));

    setVerificationCycles(prev => [newCycle, ...prev]);
    setEmployeeVerifications(prev => [...newVerifications, ...prev]);
    
    addAuditLog('Verification Cycle Triggered', `${triggeredBy} initiated a new staff verification cycle. Notifications sent to okerekelechukwu10@gmail.com, odera.okpala1@gmail.com`, 'Compliance');
  };

  const handleVerifyEmployee = (verificationId: string, data: Partial<EmployeeVerification>) => {
    setEmployeeVerifications(prev => prev.map(v => {
      if (v.id === verificationId) {
        const updated = { ...v, ...data, verificationDate: new Date().toISOString() };
        
        // Update cycle count if this is a new verification
        if (v.status === 'Pending' && (updated.status === 'Verified' || updated.status === 'Flagged')) {
          setVerificationCycles(cycles => cycles.map(c => 
            c.id === v.cycleId ? { ...c, verifiedCount: c.verifiedCount + 1 } : c
          ));
        }
        
        return updated;
      }
      return v;
    }));
  };

  const handleSelectRole = (role: 'hr' | 'employee') => {
    setUserRole(role);
    if (role === 'employee') {
      setCurrentView('portal');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setIsAppLocked(true); // Re-lock for HR
  };

  const addPayrollIssue = (issue: Omit<PayrollIssue, 'id' | 'status' | 'dateReported'>) => {
      const newIssue: PayrollIssue = {
          ...issue,
          id: crypto.randomUUID(),
          status: 'Open',
          dateReported: new Date().toISOString()
      };
      setPayrollIssues(prev => [newIssue, ...prev]);
      // Optional: Add audit log for system tracking
      addAuditLog('Ticket Created', `New issue reported by ${issue.employeeName}: ${issue.type}`, 'System');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard 
          employees={employees} 
          payrollRuns={payrollRuns} 
          attendanceRecords={attendanceRecords} 
          adminWhatsAppNumber={adminWhatsAppNumber}
          notificationRecipient={notificationRecipient}
        />;
      case 'employees':
        return <EmployeeRegister employees={employees} setEmployees={setEmployees} addAuditLog={addAuditLog} adminWhatsAppNumber={notificationRecipient} />;
      case 'attendance':
        return <AttendanceManager employees={employees} attendanceRecords={attendanceRecords} addAuditLog={addAuditLog} />;
      case 'performance':
        return <PerformanceReviewModule employees={employees} reviews={performanceReviews} setReviews={setPerformanceReviews} addAuditLog={addAuditLog} />;
      case 'payroll':
        return <PayrollProcessor employees={employees} payrollRuns={payrollRuns} setPayrollRuns={setPayrollRuns} addAuditLog={addAuditLog} adminWhatsAppNumber={notificationRecipient} />;
      case 'forecasting':
        return <Forecasting employees={employees} payrollRuns={payrollRuns} />;
      case 'reports':
        return <Reports payrollRuns={payrollRuns} employees={employees} />;
      case 'verification':
        return (
          <StaffVerification 
            employees={employees} 
            cycles={verificationCycles} 
            verifications={employeeVerifications} 
            onTriggerCycle={() => handleTriggerCycle('Admin')}
            addAuditLog={addAuditLog}
          />
        );
      case 'audit':
        return <GeminiAudit payrollRuns={payrollRuns} />;
      case 'locator':
        return <MapLocator />;
      case 'audit-logs':
        return <AuditLogViewer logs={auditLogs} />;
      case 'settings':
        return <Settings 
          adminWhatsAppNumber={adminWhatsAppNumber} 
          setAdminWhatsAppNumber={setAdminWhatsAppNumber} 
          notificationRecipient={notificationRecipient}
          setNotificationRecipient={setNotificationRecipient}
          addAuditLog={addAuditLog} 
        />;
      case 'help-desk':
        return <IssueTracker issues={payrollIssues} setIssues={setPayrollIssues} addAuditLog={addAuditLog} />;
      case 'portal':
        return (
          <EmployeePortal 
            employees={employees} 
            payrollRuns={payrollRuns} 
            verifications={employeeVerifications}
            attendanceRecords={attendanceRecords}
            setAttendanceRecords={setAttendanceRecords}
            onVerify={handleVerifyEmployee}
            onRaiseIssue={addPayrollIssue} 
          />
        );
      default:
        return <Dashboard employees={employees} payrollRuns={payrollRuns} attendanceRecords={attendanceRecords} adminWhatsAppNumber={adminWhatsAppNumber} notificationRecipient={notificationRecipient} />;
    }
  };

  if (!userRole) {
    return <LandingPage onSelectRole={handleSelectRole} />;
  }

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200`}>
      {userRole === 'hr' && isAppLocked && <GlobalFaceAuth onVerified={() => setIsAppLocked(false)} />}
      
      {userRole === 'hr' && (
        <Sidebar 
          currentView={currentView} 
          setCurrentView={(view) => {
            setCurrentView(view);
            setIsSidebarOpen(false);
          }} 
          isDarkMode={darkMode} 
          toggleDarkMode={toggleDarkMode} 
          openIssueCount={payrollIssues.filter(i => i.status === 'Open').length}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Demo Notification Overlay */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {demoNotifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 pointer-events-auto overflow-hidden relative"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                notification.type === 'whatsapp' ? 'bg-emerald-100 text-emerald-600' :
                notification.type === 'sms' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
              }`}>
                {notification.type === 'whatsapp' && <MessageSquare className="w-5 h-5" />}
                {notification.type === 'sms' && <Smartphone className="w-5 h-5" />}
                {notification.type === 'email' && <Mail className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {notification.type === 'whatsapp' ? 'WhatsApp to Admin' : 
                     notification.type === 'sms' ? 'SMS to Admin' : 'Email to Admin'}
                  </span>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 italic">
                  "{notification.message}"
                </p>
              </div>
            </div>
            <motion.div 
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 8, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-slate-200 dark:bg-slate-700"
            />
          </motion.div>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
            PayPulse
          </h1>
          <div className="flex items-center gap-2">
            {userRole === 'employee' && (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
                title="Switch Role"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
              </button>
            )}
            {userRole === 'hr' && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg>
              </button>
            )}
          </div>
        </header>

        <main className={`flex-1 ${userRole === 'hr' ? 'lg:ml-64' : ''} h-full overflow-hidden relative`}>
          {userRole === 'employee' && (
            <button 
              onClick={handleLogout}
              className="hidden lg:flex absolute top-6 right-6 z-50 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
              title="Switch Role"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-red-500 transition-colors"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
            </button>
          )}
          {renderContent()}
        </main>
      </div>

      {userRole === 'hr' && (
        <DemoController 
          employees={employees} 
          setEmployees={setEmployees} 
          attendanceRecords={attendanceRecords} 
          setAttendanceRecords={setAttendanceRecords}
          addPayrollIssue={addPayrollIssue}
          addAuditLog={addAuditLog}
        />
      )}
    </div>
  );
};

export default App;