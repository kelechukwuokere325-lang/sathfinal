import React, { useState } from 'react';
import { PayrollRun } from '../types';
import { analyzePayroll, askPayrollAssistant } from '../services/geminiService';
import { Bot, CheckCircle, AlertTriangle, Loader2, Send, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface GeminiAuditProps {
  payrollRuns: PayrollRun[];
}

const GeminiAudit: React.FC<GeminiAuditProps> = ({ payrollRuns }) => {
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string>(payrollRuns.length > 0 ? payrollRuns[payrollRuns.length - 1].id : '');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const handleAudit = async () => {
    const run = payrollRuns.find(r => r.id === selectedRunId);
    if (!run) return;

    // Find Previous Run for Anomaly Detection (Comparison)
    const sortedRuns = [...payrollRuns].sort((a, b) => a.month.localeCompare(b.month));
    const currentIndex = sortedRuns.findIndex(r => r.id === run.id);
    const previousRun = currentIndex > 0 ? sortedRuns[currentIndex - 1] : null;

    setLoading(true);
    setAuditResult(null);
    
    // Pass both current and previous run to the AI
    const result = await analyzePayroll(run, previousRun);
    
    setAuditResult(result);
    setLoading(false);
  };

  const handleChat = async () => {
    if(!chatInput.trim()) return;
    setChatLoading(true);
    const context = payrollRuns.find(r => r.id === selectedRunId) || "No payroll selected";
    const result = await askPayrollAssistant(chatInput, context);
    setChatResponse(result);
    setChatLoading(false);
  };

  return (
    <div className="p-6 h-full overflow-y-auto text-slate-900 dark:text-slate-100 pb-24">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Bot className="text-purple-600 dark:text-purple-400" /> AI Compliance & Anomaly Auditor
        </h2>
        <p className="text-slate-500 dark:text-slate-400">Leverage Gemini to detect ghost workers, salary jumps, and anomalies.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Section */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-lg mb-4 text-slate-800 dark:text-white">Run Audit</h3>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-300 mb-4 flex gap-2">
               <History size={18} className="shrink-0 mt-0.5" />
               <div>
                  <strong>Anomaly Detection Active:</strong> The AI will compare the selected month against the previous month to flag unusual salary hikes or overtime spikes.
               </div>
            </div>
            
            <div className="flex gap-4 mb-4">
              <select 
                className="flex-1 border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded-lg"
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
              >
                {payrollRuns.length === 0 && <option>No payroll runs available</option>}
                {payrollRuns.map(run => (
                  <option key={run.id} value={run.id}>{run.month} ({run.status})</option>
                ))}
              </select>
              <button 
                onClick={handleAudit}
                disabled={loading || payrollRuns.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                Start Audit
              </button>
            </div>

            {auditResult && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 prose prose-sm max-w-none dark:prose-invert">
                <div className="flex items-center gap-2 mb-2 text-purple-700 dark:text-purple-300 font-semibold border-b border-slate-200 dark:border-slate-600 pb-2">
                  <Bot size={16} /> Analysis Report
                </div>
                <div className="dark:text-slate-200">
                  <ReactMarkdown>{auditResult}</ReactMarkdown>
                </div>
              </div>
            )}
            {!auditResult && !loading && (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                <AlertTriangle className="mx-auto mb-2 opacity-50" size={32} />
                <p>Select a payroll run and click audit to scan for irregularities.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex flex-col h-full min-h-[500px] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
             <h3 className="font-semibold text-lg text-slate-800 dark:text-white">Payroll Assistant</h3>
             <p className="text-xs text-slate-500 dark:text-slate-400">Ask about tax laws, specific calculations, or summary stats.</p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                 <Bot size={16} />
               </div>
               <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm text-slate-800 dark:text-slate-200">
                 Hello Mr. Adebayo! I can help you explain tax calculations, verify pension rates, or summarize the selected payroll run. What do you need?
               </div>
            </div>

            {chatResponse && (
               <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                 <Bot size={16} />
               </div>
               <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg rounded-tl-none max-w-[80%] text-sm text-slate-800 dark:text-slate-200">
                 <ReactMarkdown>{chatResponse}</ReactMarkdown>
               </div>
            </div>
            )}
             {chatLoading && (
               <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                   <Bot size={16} />
                 </div>
                 <div className="text-slate-400 text-sm italic">Thinking...</div>
               </div>
            )}
          </div>

          <div className="p-4 border-t dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Why is Tola's tax higher this month?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              />
              <button 
                onClick={handleChat}
                disabled={chatLoading}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiAudit;