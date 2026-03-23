import React, { useState } from 'react';
import { AuditLogEntry } from '../types';
import { Search, Filter, Shield, Clock, User, FileText, Download } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../services/exportUtils';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExportCSV = () => {
    exportToCSV(filteredLogs, `Audit_Logs_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const headers = ['Timestamp', 'User', 'Category', 'Action', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.user,
      log.category,
      log.action,
      log.details
    ]);
    exportToPDF(headers, rows, 'Audit Logs & Change History', `Audit_Logs_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto text-slate-900 dark:text-slate-100 pb-24">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Shield className="text-slate-600 dark:text-slate-400" /> Audit Logs & Change History
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Track all system activities, salary changes, and payroll events for compliance.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50">
           <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <select 
                className="w-full sm:w-auto border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
             >
                <option value="All">All Categories</option>
                <option value="Payroll">Payroll</option>
                <option value="Employee">Employee Data</option>
                <option value="Compliance">Compliance</option>
                <option value="System">System</option>
             </select>
           </div>
           
           <div className="flex gap-2 w-full lg:w-auto">
             <button 
               onClick={handleExportCSV}
               className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
             >
                <Download size={16} /> CSV
             </button>
             <button 
               onClick={handleExportPDF}
               className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium px-3 py-2 rounded-lg transition shadow-sm"
             >
                <FileText size={16} /> PDF
             </button>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-600">
                <tr>
                   <th className="px-6 py-4 w-48 whitespace-nowrap">Timestamp</th>
                   <th className="hidden md:table-cell px-6 py-4 w-40 whitespace-nowrap">User</th>
                   <th className="hidden sm:table-cell px-6 py-4 w-32 whitespace-nowrap">Category</th>
                   <th className="px-6 py-4 w-48 whitespace-nowrap">Action</th>
                   <th className="px-6 py-4 whitespace-nowrap">Details</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                       No audit records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                       <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">
                          <div className="flex items-center gap-2">
                             <Clock size={14} />
                             {new Date(log.timestamp).toLocaleString()}
                          </div>
                       </td>
                       <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                             <User size={14} className="text-slate-400" />
                             {log.user}
                          </div>
                       </td>
                       <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${
                             log.category === 'Payroll' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' :
                             log.category === 'Employee' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' :
                             log.category === 'Compliance' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' :
                             'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                          }`}>
                             {log.category}
                          </span>
                       </td>
                       <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {log.action}
                       </td>
                       <td className="px-6 py-4 text-slate-600 dark:text-slate-400 max-w-md truncate" title={log.details}>
                          {log.details}
                       </td>
                    </tr>
                  ))
                )}
             </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center">
           <span>Showing {filteredLogs.length} of {logs.length} records</span>
           <span>Audit logs are immutable and stored securely.</span>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;