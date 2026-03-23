import React from 'react';
import { Users, UserCircle, ShieldCheck, ArrowRight, Zap, Shield, BarChart3, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onSelectRole: (role: 'hr' | 'employee') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="z-10 text-center mb-12 px-4"
      >
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Zap className="text-white w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-2">
            Pay<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Pulse</span>
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-transparent rounded-full"></div>
        </div>
        <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto">
          The next-generation payroll & workforce management system for modern Nigerian enterprises.
        </p>
      </motion.div>

      {/* Features Highlight */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mb-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl z-10 px-4"
      >
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Biometric Security</h3>
            <p className="text-slate-500 text-[10px]">Face ID verification for all staff.</p>
          </div>
        </div>
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Service Locator</h3>
            <p className="text-slate-500 text-[10px]">Find nearby banks & tax offices.</p>
          </div>
        </div>
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Instant Payroll</h3>
            <p className="text-slate-500 text-[10px]">Automated compliance & payments.</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl z-10 px-4">
        {/* HR Card */}
        <motion.button
          whileHover={{ scale: 1.02, translateY: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRole('hr')}
          className="group relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 hover:border-emerald-500/50 p-8 rounded-3xl text-left transition-all duration-300 shadow-2xl"
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ShieldCheck className="text-emerald-400 w-6 h-6" />
          </div>
          
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
            <Users className="text-emerald-400 w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
            HR & Payroll Admin
            <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Access the full administrative suite. Manage employees, process payroll, generate reports, and monitor compliance.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Payroll</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Audit</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Compliance</span>
          </div>
        </motion.button>

        {/* Employee Card */}
        <motion.button
          whileHover={{ scale: 1.02, translateY: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectRole('employee')}
          className="group relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 hover:border-blue-500/50 p-8 rounded-3xl text-left transition-all duration-300 shadow-2xl"
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <UserCircle className="text-blue-400 w-6 h-6" />
          </div>

          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
            <UserCircle className="text-blue-400 w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
            Employee Portal
            <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            View your payslips, manage your profile, report issues, and complete verification cycles securely.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Payslips</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Verification</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Service Locator</span>
            <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] font-bold text-slate-300 uppercase tracking-wider">Help Desk</span>
          </div>
        </motion.button>
      </div>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 flex items-center gap-8 text-slate-500 text-xs font-medium uppercase tracking-widest"
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-emerald-500/50" />
          <span>Secure Biometrics</span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-blue-500/50" />
          <span>Real-time Analytics</span>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
