import React, { useState, useMemo } from 'react';
import { VerificationCycle, EmployeeVerification, Employee } from '../types';
import { ShieldCheck, Plus, Clock, AlertTriangle, CheckCircle, Search, Filter, Mail, Phone, User, Calendar, Loader2, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';

interface StaffVerificationProps {
  employees: Employee[];
  cycles: VerificationCycle[];
  verifications: EmployeeVerification[];
  onTriggerCycle: (employeeIds?: string[]) => void;
  addAuditLog: (action: string, details: string, category: 'Payroll' | 'Employee' | 'Compliance' | 'System') => void;
}

const StaffVerification: React.FC<StaffVerificationProps> = ({ 
  employees, 
  cycles, 
  verifications, 
  onTriggerCycle,
  addAuditLog
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Verified' | 'Flagged' | 'Expired'>('All');
  const [selectedCycleId, setSelectedCycleId] = useState<string>(cycles.length > 0 ? cycles[0].id : '');
  const [isTriggering, setIsTriggering] = useState(false);

  const activeCycle = cycles.find(c => c.id === selectedCycleId);
  
  const filteredVerifications = useMemo(() => {
    return verifications.filter(v => {
      const matchesCycle = v.cycleId === selectedCycleId;
      const matchesSearch = v.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           v.employeeId.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchesCycle && matchesSearch && matchesStatus;
    });
  }, [verifications, selectedCycleId, searchTerm, statusFilter]);

  const handleManualTrigger = () => {
    setIsTriggering(true);
    // Simulate API delay
    setTimeout(() => {
      onTriggerCycle();
      setIsTriggering(false);
      addAuditLog('Manual Verification Triggered', 'Admin initiated a new staff verification cycle for all employees.', 'Compliance');
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={12} /> Verified</span>;
      case 'Flagged':
        return <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={12} /> Flagged</span>;
      case 'Expired':
        return <span className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Clock size={12} /> Expired</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Clock size={12} /> Pending</span>;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 text-slate-900 dark:text-slate-100 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-600" /> Staff Verification
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Periodic identity and employment status checks to eliminate ghost workers.</p>
        </div>
        <button 
          onClick={handleManualTrigger}
          disabled={isTriggering}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 disabled:opacity-50"
        >
          {isTriggering ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
          Trigger New Cycle
        </button>
      </div>

      {/* Cycle Selection & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" /> Verification Cycles
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {cycles.length === 0 && <p className="text-slate-500 text-sm italic">No cycles triggered yet.</p>}
            {cycles.map(cycle => (
              <button
                key={cycle.id}
                onClick={() => setSelectedCycleId(cycle.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedCycleId === cycle.id 
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                    : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">{new Date(cycle.startDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    cycle.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {cycle.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>{cycle.verifiedCount} / {cycle.totalEmployees} Verified</span>
                  <span>{Math.round((cycle.verifiedCount / cycle.totalEmployees) * 100)}%</span>
                </div>
                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${(cycle.verifiedCount / cycle.totalEmployees) * 100}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="font-bold text-lg">Verification Details</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search staff..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Verified">Verified</option>
                <option value="Flagged">Flagged</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Employee</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Verification Date</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filteredVerifications.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 italic text-sm">No verification records found.</td>
                  </tr>
                )}
                {filteredVerifications.map(v => (
                  <tr key={v.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                          {v.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{v.employeeName}</div>
                          <div className="text-[10px] text-slate-500">ID: {v.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm">{v.department}</td>
                    <td className="py-4">{getStatusBadge(v.status)}</td>
                    <td className="py-4 text-sm text-slate-500">
                      {v.verificationDate ? new Date(v.verificationDate).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </td>
                    <td className="py-4">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors text-slate-400 hover:text-blue-600">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Flagged Section */}
      <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-100 dark:border-red-900/30">
        <h3 className="font-bold text-lg mb-4 text-red-800 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={20} /> Flagged for Investigation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {verifications.filter(v => v.cycleId === selectedCycleId && v.status === 'Flagged').length === 0 && (
            <p className="text-slate-500 text-sm italic lg:col-span-3">No flagged employees in this cycle.</p>
          )}
          {verifications.filter(v => v.cycleId === selectedCycleId && v.status === 'Flagged').map(v => (
            <div key={v.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-red-200 dark:border-red-800/50 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">
                  {v.employeeName.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm">{v.employeeName}</div>
                  <div className="text-xs text-slate-500">{v.department}</div>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs text-red-700 dark:text-red-300 mb-3">
                <strong>Reason:</strong> {v.flagReason || 'Discrepancy in status or role.'}
              </div>
              <button className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-black transition">
                Investigate Ghost Worker Risk
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffVerification;
