import React, { useState, useEffect } from 'react';
import { PayrollRun, Employee, PayrollForecast } from '../types';
import { generatePayrollForecast } from '../services/geminiService';
import { TrendingUp, Calendar, AlertTriangle, ArrowRight, Loader2, DollarSign, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';

interface ForecastingProps {
  employees: Employee[];
  payrollRuns: PayrollRun[];
}

const Forecasting: React.FC<ForecastingProps> = ({ employees, payrollRuns }) => {
  const [forecast, setForecast] = useState<PayrollForecast | null>(null);
  const [loading, setLoading] = useState(false);

  const runForecast = async () => {
    setLoading(true);
    const result = await generatePayrollForecast(payrollRuns, employees);
    setForecast(result);
    setLoading(false);
  };

  useEffect(() => {
    // Auto-run forecast on mount if data exists
    if (payrollRuns.length > 0 && !forecast) {
        runForecast();
    }
  }, [payrollRuns]);

  // Prepare chart data combining history + forecast
  const chartData = [...payrollRuns].map(run => ({
    name: run.month,
    amount: run.totalPayout,
    type: 'Actual'
  }));

  if (forecast) {
    // Add next month
    const lastMonth = new Date(payrollRuns[payrollRuns.length - 1].dateCreated);
    const nextMonthDate = new Date(lastMonth);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonthStr = nextMonthDate.toISOString().slice(0, 7); // YYYY-MM

    chartData.push({
        name: nextMonthStr,
        amount: forecast.predictedCost,
        type: 'Forecast'
    });
  }

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto pb-24 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-blue-600 dark:text-blue-400" /> Payroll Cost Forecasting
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">AI-powered predictions for next month's financial planning.</p>
        </div>
        <button 
            onClick={runForecast}
            disabled={loading}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition font-medium"
        >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <BarChart3 size={18} />}
            Regenerate Forecast
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         {/* Main Forecast Card */}
         <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-xl p-6 text-white shadow-lg md:col-span-1">
            <div className="flex items-center gap-2 text-blue-100 mb-2 text-sm font-medium uppercase tracking-wider">
                <Calendar size={16} /> Next Month Projection
            </div>
            {loading ? (
                <div className="h-20 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white/50" size={32} />
                </div>
            ) : forecast ? (
                <>
                    <div className="text-4xl font-bold mb-2">
                        ₦{(forecast.predictedCost / 1000000).toFixed(2)}M
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${forecast.percentageChange >= 0 ? 'bg-white/20 text-white' : 'bg-green-400/20 text-green-100'}`}>
                            {forecast.percentageChange >= 0 ? '+' : ''}{forecast.percentageChange}%
                        </span>
                        <span className="text-blue-100">vs last month</span>
                    </div>
                </>
            ) : (
                <div className="text-white/60 text-sm">No data available.</div>
            )}
         </div>

         {/* Factors Card */}
         <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <PieIcon size={18} className="text-slate-500 dark:text-slate-400" /> Key Cost Drivers
            </h3>
            {loading ? (
                 <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/2"></div>
                 </div>
            ) : forecast ? (
                <ul className="space-y-3">
                    {forecast.factors.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className="mt-0.5 text-blue-500 dark:text-blue-400"><ArrowRight size={16} /></div>
                            {factor}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-slate-400 dark:text-slate-500 text-sm">Run forecast to analyze drivers.</div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Chart Section */}
         <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="font-bold text-slate-800 dark:text-white mb-6">Cost Trajectory (Actual vs Forecast)</h3>
             <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tickFormatter={(val) => `₦${val/1000}k`} 
                            tick={{fill: '#94a3b8'}}
                        />
                        <Tooltip 
                            formatter={(val: number) => `₦${val.toLocaleString()}`} 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#2563eb" 
                            strokeWidth={3} 
                            dot={{ r: 4 }}
                            activeDot={{ r: 8 }}
                            name="Cost"
                        />
                         {/* Visual separation for forecast */}
                         <ReferenceLine x={payrollRuns[payrollRuns.length - 1]?.month} stroke="red" strokeDasharray="3 3" />
                    </LineChart>
                </ResponsiveContainer>
             </div>
             <div className="text-center text-xs text-slate-400 mt-2">
                 Dashed line indicates forecast start point
             </div>
         </div>

         {/* Strategic Advice Section */}
         <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                 <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full text-amber-600 dark:text-amber-400">
                     <AlertTriangle size={20} />
                 </div>
                 <h3 className="font-bold text-slate-800 dark:text-white">AI Strategic Advice</h3>
             </div>
             
             {loading ? (
                 <div className="space-y-2 animate-pulse">
                     <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                     <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                     <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                 </div>
             ) : forecast ? (
                 <div className="prose prose-sm text-slate-600 dark:text-slate-300">
                     <p>{forecast.strategicAdvice}</p>
                     
                     <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confidence Score</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            forecast.confidenceScore === 'High' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            forecast.confidenceScore === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                            {forecast.confidenceScore} Confidence
                        </span>
                     </div>
                 </div>
             ) : (
                 <div className="text-sm text-slate-400 dark:text-slate-500 italic">
                     "Run the forecast to generate strategic insights for your finance team."
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default Forecasting;