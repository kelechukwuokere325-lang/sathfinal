import React, { useState } from 'react';
import { Employee, PerformanceReview, PerformanceGoal } from '../types';
import { Plus, Search, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, User, MessageSquare, Target } from 'lucide-react';

interface PerformanceReviewProps {
  employees: Employee[];
  reviews: PerformanceReview[];
  setReviews: React.Dispatch<React.SetStateAction<PerformanceReview[]>>;
  addAuditLog: (action: string, details: string, category: 'Payroll' | 'Employee' | 'Compliance' | 'System') => void;
}

const PerformanceReviewModule: React.FC<PerformanceReviewProps> = ({ employees, reviews, setReviews, addAuditLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [newReviewData, setNewReviewData] = useState({ employeeId: '', reviewPeriod: '' });

  const filteredReviews = reviews.filter(r => 
    r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reviewPeriod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectReview = (review: PerformanceReview) => {
    setSelectedReview(review);
    setShowMobileList(false);
  };

  const handleCreateReview = () => {
    if (!newReviewData.employeeId || !newReviewData.reviewPeriod) return;

    const employee = employees.find(e => e.id === newReviewData.employeeId);
    if (!employee) return;

    const newReview: PerformanceReview = {
      id: crypto.randomUUID(),
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      reviewPeriod: newReviewData.reviewPeriod,
      status: 'Draft',
      goals: [],
      selfAssessment: { achievements: '', challenges: '', rating: 0 },
      managerFeedback: { comments: '', rating: 0, areasForImprovement: '' }
    };

    setReviews([newReview, ...reviews]);
    setIsCreating(false);
    setNewReviewData({ employeeId: '', reviewPeriod: '' });
    addAuditLog('Performance Review Created', `Created ${newReviewData.reviewPeriod} review for ${employee.firstName} ${employee.lastName}`, 'Employee');
  };

  const updateReview = (updatedReview: PerformanceReview) => {
    setReviews(reviews.map(r => r.id === updatedReview.id ? updatedReview : r));
    setSelectedReview(updatedReview);
  };

  const addGoal = () => {
    if (!selectedReview) return;
    const newGoal: PerformanceGoal = {
      id: crypto.randomUUID(),
      title: 'New Goal',
      description: '',
      targetDate: new Date().toISOString().split('T')[0],
      status: 'Not Started',
      progress: 0
    };
    updateReview({
      ...selectedReview,
      goals: [...selectedReview.goals, newGoal]
    });
  };

  const updateGoal = (goalId: string, updates: Partial<PerformanceGoal>) => {
    if (!selectedReview) return;
    updateReview({
      ...selectedReview,
      goals: selectedReview.goals.map(g => g.id === goalId ? { ...g, ...updates } : g)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'Manager Review Pending': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Self-Assessment Pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Reviews</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage employee goals and evaluations</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Review Cycle
        </button>
      </div>

      {isCreating && (
        <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Initialize New Review</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee</label>
              <select
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={newReviewData.employeeId}
                onChange={(e) => setNewReviewData({ ...newReviewData, employeeId: e.target.value })}
              >
                <option value="">Select Employee...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} - {e.department}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Review Period</label>
              <input
                type="text"
                placeholder="e.g., H1 2026, Annual 2025"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                value={newReviewData.reviewPeriod}
                onChange={(e) => setNewReviewData({ ...newReviewData, reviewPeriod: e.target.value })}
              />
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 lg:flex-none px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReview}
                disabled={!newReviewData.employeeId || !newReviewData.reviewPeriod}
                className="flex-1 lg:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0 relative">
        {/* Left Sidebar - List of Reviews */}
        <div className={`${showMobileList ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden`}>
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search reviews..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredReviews.map(review => (
              <button
                key={review.id}
                onClick={() => handleSelectReview(review)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedReview?.id === review.id 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-slate-900 dark:text-white">{review.employeeName}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(review.status)}`}>
                    {review.status}
                  </span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Clock size={14} />
                  {review.reviewPeriod}
                </div>
              </button>
            ))}
            {filteredReviews.length === 0 && (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                No reviews found.
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Review Details */}
        <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-y-auto`}>
          {selectedReview ? (
            <div className="p-4 md:p-6 space-y-8 w-full">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 dark:border-slate-700 pb-6">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <ChevronDown className="rotate-90" size={20} />
                  </button>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{selectedReview.employeeName}</h3>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                      <Clock size={16} /> {selectedReview.reviewPeriod} Review
                    </p>
                  </div>
                </div>
                <select
                  value={selectedReview.status}
                  onChange={(e) => updateReview({ ...selectedReview, status: e.target.value as any })}
                  className={`w-full sm:w-auto px-3 py-1.5 rounded-lg text-sm font-medium border-0 ring-1 ring-inset ${getStatusColor(selectedReview.status)}`}
                >
                  <option value="Draft">Draft</option>
                  <option value="Self-Assessment Pending">Self-Assessment Pending</option>
                  <option value="Manager Review Pending">Manager Review Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Goals Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target size={20} className="text-emerald-500" />
                    Performance Goals
                  </h4>
                  <button onClick={addGoal} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                    + Add Goal
                  </button>
                </div>
                <div className="space-y-4">
                  {selectedReview.goals.map((goal, index) => (
                    <div key={goal.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={goal.title}
                            onChange={(e) => updateGoal(goal.id, { title: e.target.value })}
                            className="w-full bg-transparent font-medium text-slate-900 dark:text-white border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 focus:outline-none"
                            placeholder="Goal Title"
                          />
                          <textarea
                            value={goal.description}
                            onChange={(e) => updateGoal(goal.id, { description: e.target.value })}
                            className="w-full bg-transparent text-sm text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 focus:outline-none rounded p-1 resize-none"
                            placeholder="Goal description..."
                            rows={2}
                          />
                        </div>
                        <div className="w-full sm:w-48 space-y-3">
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Status</label>
                            <select
                              value={goal.status}
                              onChange={(e) => updateGoal(goal.id, { status: e.target.value as any })}
                              className="w-full text-sm p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                              <option value="Missed">Missed</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Progress ({goal.progress}%)</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={goal.progress}
                              onChange={(e) => updateGoal(goal.id, { progress: parseInt(e.target.value) })}
                              className="w-full accent-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedReview.goals.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">No goals set for this period.</p>
                  )}
                </div>
              </section>

              {/* Self Assessment */}
              <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <User size={20} className="text-blue-500" />
                  Self-Assessment
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Key Achievements</label>
                      <textarea
                        value={selectedReview.selfAssessment.achievements}
                        onChange={(e) => updateReview({
                          ...selectedReview,
                          selfAssessment: { ...selectedReview.selfAssessment, achievements: e.target.value }
                        })}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows={3}
                        placeholder="Employee's notes on their achievements..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Challenges & Roadblocks</label>
                      <textarea
                        value={selectedReview.selfAssessment.challenges}
                        onChange={(e) => updateReview({
                          ...selectedReview,
                          selfAssessment: { ...selectedReview.selfAssessment, challenges: e.target.value }
                        })}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows={2}
                        placeholder="Employee's notes on challenges faced..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Self Rating (1-5)</label>
                    <input
                      type="number"
                      min="1" max="5"
                      value={selectedReview.selfAssessment.rating || ''}
                      onChange={(e) => updateReview({
                        ...selectedReview,
                        selfAssessment: { ...selectedReview.selfAssessment, rating: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full sm:w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Manager Feedback */}
              <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <MessageSquare size={20} className="text-purple-500" />
                  Manager Feedback
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Overall Comments</label>
                      <textarea
                        value={selectedReview.managerFeedback.comments}
                        onChange={(e) => updateReview({
                          ...selectedReview,
                          managerFeedback: { ...selectedReview.managerFeedback, comments: e.target.value }
                        })}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        rows={3}
                        placeholder="Manager's evaluation..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Areas for Improvement</label>
                      <textarea
                        value={selectedReview.managerFeedback.areasForImprovement}
                        onChange={(e) => updateReview({
                          ...selectedReview,
                          managerFeedback: { ...selectedReview.managerFeedback, areasForImprovement: e.target.value }
                        })}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        rows={2}
                        placeholder="Constructive feedback..."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Manager Rating (1-5)</label>
                      <input
                        type="number"
                        min="1" max="5"
                        value={selectedReview.managerFeedback.rating || ''}
                        onChange={(e) => updateReview({
                          ...selectedReview,
                          managerFeedback: { ...selectedReview.managerFeedback, rating: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full sm:w-24 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Final Score (Auto-calc or Override)</label>
                      <input
                        type="number"
                        min="1" max="5" step="0.1"
                        value={selectedReview.finalScore || ''}
                        onChange={(e) => updateReview({
                          ...selectedReview,
                          finalScore: parseFloat(e.target.value) || undefined
                        })}
                        className="w-full sm:w-32 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </section>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <Target size={48} className="mb-4 opacity-20" />
              <p>Select a review from the list or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceReviewModule;
