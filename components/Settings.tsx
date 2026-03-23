import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Smartphone, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface SettingsProps {
  adminWhatsAppNumber: string;
  setAdminWhatsAppNumber: (num: string) => void;
  notificationRecipient: string;
  setNotificationRecipient: (num: string) => void;
  addAuditLog: (action: string, details: string, category: AuditLogEntry['category']) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  adminWhatsAppNumber, 
  setAdminWhatsAppNumber, 
  notificationRecipient,
  setNotificationRecipient,
  addAuditLog 
}) => {
  const [localAdminNumber, setLocalAdminNumber] = useState(adminWhatsAppNumber);
  const [localRecipientNumber, setLocalRecipientNumber] = useState(notificationRecipient);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    // Basic validation for international format
    if (!localAdminNumber.startsWith('+') || localAdminNumber.length < 10) {
      setError('Please enter a valid international phone number for Admin WhatsApp starting with +');
      return;
    }
    if (!localRecipientNumber.startsWith('+') || localRecipientNumber.length < 10) {
      setError('Please enter a valid international phone number for Notification Recipient starting with +');
      return;
    }

    setAdminWhatsAppNumber(localAdminNumber);
    setNotificationRecipient(localRecipientNumber);
    setIsSaved(true);
    setError(null);
    addAuditLog('Settings Updated', `Admin WhatsApp updated to ${localAdminNumber}, Notifications to ${localRecipientNumber}`, 'System');
    
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <SettingsIcon className="text-emerald-600" /> System Settings
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Configure global application parameters and notifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Navigation/Categories */}
        <div className="lg:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium border border-emerald-100 dark:border-emerald-800 transition shadow-sm">
            <Bell size={20} /> Notification Channels
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition">
            <Shield size={20} /> Security & Compliance
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-medium transition">
            <Smartphone size={20} /> Mobile App Config
          </button>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">WhatsApp & SMS Notifications</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configure the administrative contacts for automated reports and alerts.</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Admin WhatsApp Number (Display/Identity)
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition dark:text-white`}
                    placeholder="+2348133192655"
                    value={localAdminNumber}
                    onChange={(e) => {
                      setLocalAdminNumber(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Alert Recipient Number (WhatsApp/SMS Notifications)
                </label>
                <div className="relative">
                  <Bell className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    className={`w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition dark:text-white`}
                    placeholder="+2348145398833"
                    value={localRecipientNumber}
                    onChange={(e) => {
                      setLocalRecipientNumber(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-lg font-bold transition flex items-center gap-2 shadow-md shadow-emerald-200 dark:shadow-emerald-900/20"
                >
                  <Save size={18} /> Save Settings
                </button>
              </div>

              {error && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle size={12} /> {error}
                </p>
              )}
              {isSaved && (
                <p className="text-emerald-600 text-xs mt-2 flex items-center gap-1 font-bold animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 size={12} /> Settings saved successfully!
                </p>
              )}
              <p className="text-xs text-slate-400 mt-3 italic">
                * The Alert Recipient Number will receive automated payroll summaries and compliance alerts.
              </p>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Enabled Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">Payroll Finalization Summary</p>
                      <p className="text-xs text-slate-500">Sent automatically when payroll is finalized.</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">Compliance Breach Alerts</p>
                      <p className="text-xs text-slate-500">Sent when ghost workers or unverified staff are detected.</p>
                    </div>
                    <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-4">
            <AlertCircle className="text-amber-600 shrink-0 mt-1" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">WhatsApp API Note</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Automated reports use the Twilio WhatsApp API. Ensure your Twilio credentials are correctly configured in the environment variables for production delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
