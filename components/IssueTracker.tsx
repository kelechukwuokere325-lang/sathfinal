import React, { useState } from 'react';
import { PayrollIssue, Employee, AuditLogEntry } from '../types';
import { MessageSquare, CheckCircle, Clock, Search, Filter, User, AlertCircle, Check } from 'lucide-react';

interface IssueTrackerProps {
  issues: PayrollIssue[];
  setIssues: React.Dispatch<React.SetStateAction<PayrollIssue[]>>;
  addAuditLog: (action: string, details: string, category: AuditLogEntry['category']) => void;
}

const IssueTracker: React.FC<IssueTrackerProps> = ({ issues, setIssues, addAuditLog }) => {
  const [filter, setFilter] = useState<'All' | 'Open' | 'Resolved'>('Open');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const filteredIssues = issues.filter(issue => {
    const matchesFilter = filter === 'All' || issue.status === filter;
    const matchesSearch = 
      issue.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      issue.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleResolve = (id: string) => {
    setResolvingId(id);
    setResolutionNote('');
  };

  const confirmResolve = () => {
    if (!resolvingId) return;

    const issue = issues.find(i => i.id === resolvingId);
    if (issue) {
        const updatedIssues = issues.map(i => 
            i.id === resolvingId ? { ...i, status: 'Resolved' as const, resolutionNotes: resolutionNote } : i
        );
        setIssues(updatedIssues);
        addAuditLog('Ticket Resolved', `Resolved issue for ${issue.employeeName}: ${issue.type}. Note: ${resolutionNote}`, 'Employee');
        setResolvingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto text-slate-900 dark:text-slate-100 pb-24">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-blue-600 dark:text-blue-400" /> Help Desk
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage payroll discrepancies and queries reported by employees.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 w-full sm:w-auto">
                <button 
                    onClick={() => setFilter('Open')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition ${filter === 'Open' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Open
                </button>
                 <button 
                    onClick={() => setFilter('Resolved')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition ${filter === 'Resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Resolved
                </button>
                 <button 
                    onClick={() => setFilter('All')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition ${filter === 'All' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    All
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue List */}
        <div className="lg:col-span-2 space-y-4">
             {/* Search Bar */}
             <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by employee name or issue type..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredIssues.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <CheckCircle className="mx-auto text-slate-300 mb-2" size={48} />
                    <p className="text-slate-500 dark:text-slate-400">No {filter !== 'All' ? filter.toLowerCase() : ''} tickets found.</p>
                </div>
            ) : (
                filteredIssues.map(issue => (
                    <div key={issue.id} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                        {issue.status === 'Open' && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                    issue.type === 'Incorrect Salary Amount' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800' :
                                    issue.type === 'Bank Transfer Issue' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' :
                                    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                }`}>
                                    {issue.type}
                                </span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(issue.dateReported).toLocaleDateString()}
                                </span>
                            </div>
                            {issue.status === 'Open' ? (
                                <button 
                                    onClick={() => handleResolve(issue.id)}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    Resolve Issue
                                </button>
                            ) : (
                                <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <CheckCircle size={12} /> Resolved
                                </span>
                            )}
                        </div>
                        
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{issue.employeeName}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mb-3">
                            "{issue.description}"
                        </p>

                        {/* Resolve Form */}
                        {resolvingId === issue.id && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Resolution Note (Required)</label>
                                <textarea 
                                    className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white mb-2"
                                    placeholder="Explain how this was fixed (e.g., 'Processed payment manually')..."
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                ></textarea>
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => setResolvingId(null)}
                                        className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={confirmResolve}
                                        disabled={!resolutionNote.trim()}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                                    >
                                        Mark Resolved
                                    </button>
                                </div>
                            </div>
                        )}

                        {issue.status === 'Resolved' && issue.resolutionNotes && (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex gap-1 bg-green-50 dark:bg-green-900/10 p-2 rounded">
                                <Check size={14} className="shrink-0 text-green-600" />
                                <span><strong>Resolution:</strong> {issue.resolutionNotes}</span>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>

        {/* Stats / Quick Info */}
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Ticket Status</h3>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                            {issues.filter(i => i.status === 'Open').length}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-white">Open Issues</div>
                            <div className="text-xs text-slate-500">Requires Attention</div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center font-bold">
                         {issues.filter(i => i.status === 'Resolved').length}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-white">Resolved</div>
                        <div className="text-xs text-slate-500">Completed</div>
                    </div>
                </div>
            </div>

            <div className="bg-blue-600 dark:bg-blue-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-lg mb-1">Response Policy</h4>
                        <p className="text-blue-100 text-sm">
                            Urgent salary discrepancies must be acknowledged within 24 hours. Ensure all adjustments are logged in the Audit Trail.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default IssueTracker;