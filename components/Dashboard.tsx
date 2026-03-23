import React, { useState, useEffect } from 'react';
import { PayrollRun, Employee, EmployeeStatus, ComplianceTask, AttendanceRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, AlertTriangle, Briefcase, Calendar, Clock, CheckCircle, BellRing, Mail, Loader2, UserCheck, Eye, EyeOff } from 'lucide-react';

interface DashboardProps {
  employees: Employee[];
  payrollRuns: PayrollRun[];
  attendanceRecords: AttendanceRecord[];
  adminWhatsAppNumber: string;
  notificationRecipient: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  employees, 
  payrollRuns, 
  attendanceRecords, 
  adminWhatsAppNumber,
  notificationRecipient 
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{success: boolean, message: string} | null>(null);
  const [showBalances, setShowBalances] = useState(() => {
    const saved = localStorage.getItem('paypulse_show_balances');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('paypulse_show_balances', JSON.stringify(showBalances));
  }, [showBalances]);

  const formatAmount = (amount: number | string) => {
    if (!showBalances) return '₦ ••••';
    return typeof amount === 'number' ? `₦${amount.toLocaleString()}` : `₦${amount}`;
  };

  const handleNotifyAdmins = async () => {
    setIsSending(true);
    setSendResult(null);
    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: "PayPulse System Alert: Ghost Worker Risk Detected",
          message: `Hello Admin,\n\nThis is an automated alert from PayPulse.\n\nOur system has detected ${potentialGhostWorkers} potential ghost worker risks in the latest payroll run for ${lastRun?.month || 'the current period'}.\n\nPlease log in to the HR Dashboard to review and take action.\n\nBest regards,\nPayPulse AI Auditor`,
          to: "okerekelechukwu10@gmail.com, odera.okpala1@gmail.com"
        })
      });
      const data = await response.json();
      if (data.success) {
        setSendResult({ success: true, message: "Notification sent successfully to admins." });
      } else {
        setSendResult({ success: false, message: data.error || "Failed to send notification." });
      }

      // Also send WhatsApp (Primary Demo)
      window.dispatchEvent(new CustomEvent('demo-notify', { 
        detail: { type: 'whatsapp', message: `PayPulse Alert: ${potentialGhostWorkers} Ghost Worker Risks detected.` } 
      }));
      
      fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `PayPulse Alert: ${potentialGhostWorkers} Ghost Worker Risks detected in ${lastRun?.month || 'current period'}.`,
          to: notificationRecipient
        })
      }).catch(err => console.error("Failed to send risk WhatsApp:", err));

      // Also send SMS
      window.dispatchEvent(new CustomEvent('demo-notify', { 
        detail: { type: 'sms', message: `PayPulse Alert: ${potentialGhostWorkers} Ghost Worker Risks detected.` } 
      }));

      fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `PayPulse Alert: ${potentialGhostWorkers} Ghost Worker Risks detected in ${lastRun?.month || 'current period'}.`,
          to: notificationRecipient
        })
      }).catch(err => console.error("Failed to send risk SMS:", err));

    } catch (error) {
      setSendResult({ success: false, message: "Network error. Please check your connection." });
    } finally {
      setIsSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  // Stats
  const activeEmployees = employees.filter(e => e.status === EmployeeStatus.ACTIVE).length;
  const resignedEmployees = employees.filter(e => e.status === EmployeeStatus.RESIGNED).length;
  
  const lastRun = payrollRuns[payrollRuns.length - 1];
  const lastPayout = lastRun ? lastRun.totalPayout : 0;
  
  // Ghost worker risk check
  const potentialGhostWorkers = lastRun 
    ? lastRun.entries.filter(e => e.employeeStatus === EmployeeStatus.RESIGNED && e.netPay > 0).length
    : 0;

  // Chart Data
  const trendData = payrollRuns.length > 0 ? payrollRuns.map(run => ({
    name: run.month,
    payout: run.totalPayout,
    tax: run.totalTax
  })) : [
    { name: '2025-08', payout: 4200000, tax: 600000 },
    { name: '2025-09', payout: 4350000, tax: 620000 },
    { name: '2025-10', payout: 4300000, tax: 610000 },
    { name: '2025-11', payout: 4500000, tax: 650000 },
    { name: '2025-12', payout: 4450000, tax: 640000 },
    { name: '2026-01', payout: 4500000, tax: 650000 },
  ];
  
  const pfaData = [
    { name: 'Stanbic IBTC', value: 45 },
    { name: 'ARM Pension', value: 30 },
    { name: 'Leadway', value: 15 },
    { name: 'Others', value: 10 },
  ];
  const COLORS = ['#059669', '#0d9488', '#FFBB28', '#FF8042'];

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendanceRecords.filter(r => r.date === today);
  const presentToday = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const lateToday = todayRecords.filter(r => r.status === 'Late').length;

  const [complianceTasks, setComplianceTasks] = useState<ComplianceTask[]>([]);

  useEffect(() => {
    // Generate dates for 2026 manually
    const payeDate = '2026-02-10';
    const pensionDate = '2026-02-15';
    const nhfDate = '2026-02-15';

    setComplianceTasks([
      {
        id: '1',
        title: 'PAYE Tax Remittance',
        authority: 'LIRS (Lagos State)',
        dueDate: payeDate,
        daysRemaining: 5,
        status: 'Pending',
        severity: 'Critical'
      },
      {
        id: '2',
        title: 'Monthly Pension Remittance',
        authority: 'PENCOM',
        dueDate: pensionDate,
        daysRemaining: 10,
        status: 'Pending',
        severity: 'Warning'
      },
      {
        id: '3',
        title: 'NHF Contribution',
        authority: 'Fed. Mortgage Bank',
        dueDate: nhfDate,
        daysRemaining: 10,
        status: 'Pending',
        severity: 'Warning'
      }
    ]);
  }, []);

  return (
    <div className="p-6 overflow-y-auto h-full pb-24 text-slate-900 dark:text-slate-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400">Overview of your HR and Payroll operations for 2026.</p>
        </div>
        <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowBalances(!showBalances)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
            >
              {showBalances ? <EyeOff size={16} /> : <Eye size={16} />}
              {showBalances ? 'Hide Balances' : 'Show Balances'}
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">February 5, 2026</span>
        </div>
      </div>

      {/* Compliance Action Center */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BellRing size={20} className="text-red-500 animate-pulse" /> Compliance Tracker
            </h3>
            <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-xs font-bold px-2 py-0.5 rounded-full">1 Urgent</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {complianceTasks.map(task => (
                <div key={task.id} className={`p-4 rounded-xl border-l-4 shadow-sm bg-white dark:bg-slate-800 ${
                    task.severity === 'Critical' ? 'border-l-red-500 ring-1 ring-red-100 dark:ring-red-900/30' : 
                    task.severity === 'Warning' ? 'border-l-amber-400' : 'border-l-green-500'
                }`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                             task.severity === 'Critical' ? 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200' : 
                             task.severity === 'Warning' ? 'bg-amber-50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200' : 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                        }`}>
                            {task.severity === 'Critical' ? 'DUE SOON' : task.status}
                        </span>
                        <div className="text-right">
                             <div className={`text-xl font-bold ${
                                 task.severity === 'Critical' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
                             }`}>
                                 {task.daysRemaining} Days
                             </div>
                             <div className="text-xs text-slate-400">Remaining</div>
                        </div>
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{task.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{task.authority}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 border-t dark:border-slate-700 pt-3">
                        <Calendar size={14} /> Due: {task.dueDate}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Active Staff</h3>
            <div className="bg-emerald-50 dark:bg-emerald-900/50 p-2 rounded-full text-emerald-600 dark:text-emerald-300"><Users size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{activeEmployees}</p>
          <p className="text-xs text-slate-400 mt-1">{resignedEmployees} Resigned</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Last Month Payout</h3>
            <div className="bg-green-50 dark:bg-green-900/50 p-2 rounded-full text-green-600 dark:text-green-300"><TrendingUp size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">
            {showBalances ? `₦${(lastPayout/1000000).toFixed(2)}M` : '₦ ••••'}
          </p>
          <p className="text-xs text-slate-400 mt-1">{lastRun ? lastRun.month : 'No Data'}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ghost Worker Risk</h3>
            <div className="bg-red-50 dark:bg-red-900/50 p-2 rounded-full text-red-600 dark:text-red-300"><AlertTriangle size={20} /></div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{potentialGhostWorkers}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">Requires attention</p>
            </div>
            {potentialGhostWorkers > 0 && (
              <button 
                onClick={handleNotifyAdmins}
                disabled={isSending}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Notify Admins
              </button>
            )}
          </div>
          {sendResult && (
            <div className={`mt-3 text-[10px] font-bold p-2 rounded ${sendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {sendResult.message}
            </div>
          )}
        </div>
        
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Remittance</h3>
            <div className="bg-purple-50 dark:bg-purple-900/50 p-2 rounded-full text-purple-600 dark:text-purple-300"><Briefcase size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">
            {formatAmount(lastRun ? (lastRun.totalPension + lastRun.totalTax) : 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Tax & Pension</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Attendance Today</h3>
            <div className="bg-blue-50 dark:bg-blue-900/50 p-2 rounded-full text-blue-600 dark:text-blue-300"><UserCheck size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white">{presentToday} / {activeEmployees}</p>
          <p className="text-xs text-amber-500 font-bold mt-1 flex items-center gap-1">
            <Clock size={12} /> {lateToday} late arrivals
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-lg mb-6 text-slate-800 dark:text-white">Payroll Trend (6 Months)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₦${val/1000000}M`} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  formatter={(value: number) => showBalances ? `₦${value.toLocaleString()}` : '₦ ••••'}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Bar dataKey="payout" fill="#059669" radius={[4, 4, 0, 0]} name="Net Payout" />
                <Bar dataKey="tax" fill="#0d9488" radius={[4, 4, 0, 0]} name="Tax Remitted" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PFA Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-lg mb-6 text-slate-800 dark:text-white">Pension Distribution (PFA)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pfaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pfaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {pfaData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;