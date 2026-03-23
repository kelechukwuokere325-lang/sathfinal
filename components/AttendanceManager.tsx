import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Employee } from '../types';
import { Calendar, Clock, User, Search, Filter, Download, CheckCircle, XCircle, AlertTriangle, MapPin } from 'lucide-react';

interface AttendanceManagerProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  addAuditLog: (action: string, details: string, category: 'Payroll' | 'Employee' | 'Compliance' | 'System') => void;
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ employees, attendanceRecords, addAuditLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const filteredRecords = useMemo(() => {
    // If a specific date is selected, we want to see ALL active staff and their status for that day
    if (filterDate) {
      const activeEmployees = employees.filter(e => e.status === 'Active');
      
      return activeEmployees.map(emp => {
        const record = attendanceRecords.find(r => r.employeeId === emp.id && r.date === filterDate);
        
        if (record) return record;
        
        // No record found, return a placeholder 'Absent' record
        return {
          id: `absent-${emp.id}-${filterDate}`,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          date: filterDate,
          status: 'Absent' as const,
          location: 'Office'
        };
      }).filter(record => {
        const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'All' || record.status === filterStatus;
        return matchesSearch && matchesStatus;
      });
    }

    // Otherwise, just filter existing records
    return attendanceRecords.filter(record => {
      const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || record.status === filterStatus;
      const matchesDate = !filterDate || record.date === filterDate;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [attendanceRecords, employees, searchTerm, filterStatus, filterDate]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    return {
      present: todayRecords.filter(r => r.status === 'Present' || r.status === 'Late').length,
      late: todayRecords.filter(r => r.status === 'Late').length,
      total: employees.filter(e => e.status === 'Active').length,
      get absent() { return this.total - this.present; }
    };
  }, [attendanceRecords, employees]);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="text-emerald-600" /> Attendance Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Track and monitor staff daily attendance.</p>
        </div>
        <button 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
          onClick={() => {
            const csv = [
              ['Date', 'Staff ID', 'Name', 'Check In', 'Check Out', 'Status', 'Location'],
              ...filteredRecords.map(r => [r.date, r.employeeId, r.employeeName, r.checkIn || '-', r.checkOut || '-', r.status, r.location || '-'])
            ].map(e => e.join(",")).join("\n");
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `attendance_${filterDate || 'all'}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            addAuditLog('Attendance Export', `Exported attendance records for ${filterDate || 'all dates'}`, 'Compliance');
          }}
        >
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Active Staff</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Present Today</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.present}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">Late Today</div>
          <div className="text-2xl font-bold text-amber-600">{stats.late}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">Absent Today</div>
          <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search staff name..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select 
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
            <option value="Half-Day">Half-Day</option>
          </select>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="text-xs text-slate-500 hover:text-red-500 font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Staff</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Check In</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Check Out</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No attendance records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          {record.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{record.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{record.date}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                      {record.checkIn ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Clock size={14} /> {record.checkIn}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                      {record.checkOut ? (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock size={14} /> {record.checkOut}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        record.status === 'Late' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        record.status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {record.status === 'Present' && <CheckCircle size={12} />}
                        {record.status === 'Late' && <Clock size={12} />}
                        {record.status === 'Absent' && <XCircle size={12} />}
                        {record.status === 'Half-Day' && <AlertTriangle size={12} />}
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {record.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {record.location}
                        </span>
                      ) : 'Office'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
