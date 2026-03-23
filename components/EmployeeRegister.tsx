import React, { useState, useRef, useEffect } from 'react';
import { Employee, EmployeeStatus, AuditLogEntry } from '../types';
import { calculatePayrollEntry } from '../services/payrollUtils';
import { Plus, Search, Edit2, UserMinus, UserCheck, ScanFace, Camera, Upload, CheckCircle, X, Calculator, Calendar, ShieldAlert, ChevronRight, MessageCircle, AlertTriangle, FileText, RefreshCw, Download, Info } from 'lucide-react';
import { compareBiometricFaces } from '../services/geminiService';
import { exportToCSV, exportToPDF } from '../services/exportUtils';

interface EmployeeRegisterProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  addAuditLog: (action: string, details: string, category: AuditLogEntry['category']) => void;
  adminWhatsAppNumber: string;
}

const EmployeeRegister: React.FC<EmployeeRegisterProps> = ({ employees, setEmployees, addAuditLog, adminWhatsAppNumber }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Offboarding State
  const [showOffboardModal, setShowOffboardModal] = useState(false);
  const [offboardDate, setOffboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [offboardReason, setOffboardReason] = useState('Resignation');
  
  // Biometric State
  const [biometricStep, setBiometricStep] = useState<'start' | 'scanning' | 'processing' | 'success' | 'failed'>('start');
  const [failureReason, setFailureReason] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null); // For ID Card

  // Initial State for form
  const initialFormState: Employee = {
    id: '',
    staffId: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    designation: '',
    department: '',
    basicSalary: 0,
    housingAllowance: 0,
    transportAllowance: 0,
    pfa: 'Stanbic IBTC Pension Managers',
    rsaNumber: '',
    status: EmployeeStatus.ACTIVE,
    joinDate: new Date().toISOString().split('T')[0],
    cooperativeLoanBalance: 0,
    faceVerified: false
  };

  const [formData, setFormData] = useState<Employee>(initialFormState);

  // Fix: Attach stream to video element whenever step becomes 'scanning' and stream is available
  useEffect(() => {
    if (biometricStep === 'scanning' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [biometricStep, stream]);

  // Fix: Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array for unmount cleanup only, specific cleanup is handled in stopCamera

  const handleSave = () => {
    if (editingEmployee) {
      // Logic for Audit: Check if salary changed
      const salaryChanged = editingEmployee.basicSalary !== formData.basicSalary;
      const allowanceChanged = (editingEmployee.housingAllowance !== formData.housingAllowance) || (editingEmployee.transportAllowance !== formData.transportAllowance);

      if (salaryChanged) {
          addAuditLog('Salary Update', `Changed Basic Salary for ${formData.firstName} ${formData.lastName} from ₦${editingEmployee.basicSalary.toLocaleString()} to ₦${formData.basicSalary.toLocaleString()}`, 'Employee');
          
          // WhatsApp Notification for Salary Change (Primary Demo)
          window.dispatchEvent(new CustomEvent('demo-notify', { 
            detail: { type: 'whatsapp', message: `Salary Update: ${formData.firstName} ${formData.lastName} to ₦${formData.basicSalary.toLocaleString()}.` } 
          }));

          fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Salary Update: ${formData.firstName} ${formData.lastName} from ₦${editingEmployee.basicSalary.toLocaleString()} to ₦${formData.basicSalary.toLocaleString()}.`,
              to: adminWhatsAppNumber
            })
          }).catch(err => console.error("Failed to send salary update WhatsApp:", err));

          // Email Notification for Salary Change
          window.dispatchEvent(new CustomEvent('demo-notify', { 
            detail: { type: 'email', message: `Salary Update: ${formData.firstName} ${formData.lastName} to ₦${formData.basicSalary.toLocaleString()}.` } 
          }));

          fetch('/api/gmail/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: `Salary Update: ${formData.firstName} ${formData.lastName}`,
              message: `Hello Admin,\n\nAn employee's salary has been updated.\n\n*Details:*\n- Name: ${formData.firstName} ${formData.lastName}\n- Old Basic Salary: ₦${editingEmployee.basicSalary.toLocaleString()}\n- New Basic Salary: ₦${formData.basicSalary.toLocaleString()}\n\nBest regards,\nPayPulse System`,
              to: "okerekelechukwu10@gmail.com, odera.okpala1@gmail.com"
            })
          }).catch(err => console.error("Failed to send salary update email:", err));

          // SMS Notification for Salary Change
          window.dispatchEvent(new CustomEvent('demo-notify', { 
            detail: { type: 'sms', message: `Salary Update: ${formData.firstName} ${formData.lastName} to ₦${formData.basicSalary.toLocaleString()}.` } 
          }));

          fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Salary Update: ${formData.firstName} ${formData.lastName} from ₦${editingEmployee.basicSalary.toLocaleString()} to ₦${formData.basicSalary.toLocaleString()}.`,
              to: adminWhatsAppNumber
            })
          }).catch(err => console.error("Failed to send salary update SMS:", err));
      } else if (allowanceChanged) {
          addAuditLog('Allowance Update', `Updated allowances for ${formData.firstName} ${formData.lastName}`, 'Employee');
      } else {
          addAuditLog('Profile Update', `Updated profile details for ${formData.firstName} ${formData.lastName}`, 'Employee');
      }

      setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { ...formData, id: emp.id } : emp));
      
      // Close modal normally for edits
      setShowModal(false);
      setEditingEmployee(null);
      setFormData(initialFormState);
    } else {
      // NEW EMPLOYEE LOGIC
      const newId = crypto.randomUUID();
      const nextIdNumber = employees.length + 1;
      const staffId = `PP-${nextIdNumber.toString().padStart(3, '0')}`;
      const newEmployee = { ...formData, id: newId, staffId, faceVerified: false };
      
      setEmployees(prev => [...prev, newEmployee]);
      addAuditLog('Employee Onboarding', `Added new employee: ${formData.firstName} ${formData.lastName} (${formData.designation})`, 'Employee');

      // WhatsApp Notification to Admins (Primary Demo)
      fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `New Employee: ${formData.firstName} ${formData.lastName} (${formData.designation}) onboarded to PayPulse.`,
          to: adminWhatsAppNumber
        })
      }).catch(err => console.error("Failed to send onboarding WhatsApp:", err));

      // Email Notification to Admins
      fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `New Employee Onboarded: ${formData.firstName} ${formData.lastName}`,
          message: `Hello Admin,\n\nA new employee has been onboarded to PayPulse.\n\n*Details:*\n- Name: ${formData.firstName} ${formData.lastName}\n- Designation: ${formData.designation}\n- Department: ${formData.department}\n- Basic Salary: ₦${formData.basicSalary.toLocaleString()}\n\nPlease ensure their biometric enrollment is completed.\n\nBest regards,\nPayPulse System`,
          to: "okerekelechukwu10@gmail.com, odera.okpala1@gmail.com"
        })
      }).catch(err => console.error("Failed to send onboarding email:", err));

      // SMS Notification to Admins
      fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `New Employee: ${formData.firstName} ${formData.lastName} (${formData.designation}) onboarded to PayPulse.`,
          to: adminWhatsAppNumber
        })
      }).catch(err => console.error("Failed to send onboarding SMS:", err));

      // CHAIN REACTION: Close Form -> Open Biometrics
      setShowModal(false);
      setFormData(initialFormState);
      
      // Set the context to the newly created employee and open biometric modal immediately
      setEditingEmployee(newEmployee); 
      setBiometricStep('start');
      setReferenceImage(null); // Reset ref image
      setTimeout(() => setShowBiometricModal(true), 300); // Slight delay for smooth transition
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData(employee);
    setShowModal(true);
  };

  const handleEnrollFace = (employee: Employee) => {
    setEditingEmployee(employee);
    setBiometricStep('start');
    setReferenceImage(null);
    setShowBiometricModal(true);
  };

  const handleWhatsAppInvite = (employee: Employee) => {
    // 1. Clean number (Remove non-digits)
    let cleanNumber = employee.phoneNumber.replace(/[^\d]/g, '');
    
    // 2. Ensure international format for Nigeria (strip leading 0, add 234 if missing)
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '234' + cleanNumber.substring(1);
    } else if (!cleanNumber.startsWith('234')) {
        // Assume default Nigeria if just 80...
        cleanNumber = '234' + cleanNumber;
    }

    const message = `Hello ${employee.firstName}, \n\nWelcome to PayPulse! \n\nYou have been successfully onboarded to the Employee Portal. \n\n*Login Details:* \nEmail: ${employee.email} \n\nPlease visit HR to complete your Face ID enrollment for secure access.`;

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    addAuditLog('Communication', `Sent WhatsApp Onboarding Invite to ${employee.firstName} ${employee.lastName}`, 'System');
  };

  const initiateOffboard = (employee: Employee) => {
    setEditingEmployee(employee);
    setOffboardDate(new Date().toISOString().split('T')[0]);
    setShowOffboardModal(true);
  };

  const confirmOffboard = () => {
    if (editingEmployee) {
        setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { 
            ...emp, 
            status: EmployeeStatus.RESIGNED,
            exitDate: offboardDate 
        } : emp));
        
        addAuditLog('Employee Offboarding', `Offboarded ${editingEmployee.firstName} ${editingEmployee.lastName}. Reason: ${offboardReason}. Exit Date: ${offboardDate}`, 'Employee');
        
        setShowOffboardModal(false);
        setEditingEmployee(null);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setBiometricStep('scanning');
    } catch (err) {
      console.error(err);
      alert("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        return canvas.toDataURL('image/jpeg');
    }
    return null;
  };

  const captureAndVerify = async () => {
    const liveImage = captureFrame();
    if (!liveImage) {
        alert("Failed to capture image");
        return;
    }

    stopCamera();
    setBiometricStep('processing');

    // If no reference image was uploaded (optional fallback), we skip strict match or just mock success.
    // But since the user ASKED for strict checking, we will enforce it if reference exists.
    if (referenceImage) {
        // AI Comparison
        const result = await compareBiometricFaces(referenceImage, liveImage);
        
        if (result.match) {
             finalizeEnrollment(liveImage);
        } else {
             setBiometricStep('failed');
             setFailureReason(result.reason || "Face does not match the provided ID document.");
             addAuditLog('Biometric Rejected', `Failed enrollment for ${editingEmployee?.firstName}. Reason: ${result.reason}`, 'Compliance');
        }
    } else {
        // Fallback for demo if they skipped ID upload (simulate success)
        // In a real strict mode, we would force ID upload.
        finalizeEnrollment(liveImage);
    }
  };

  const finalizeEnrollment = (capturedImage: string) => {
     if (editingEmployee) {
         setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { 
           ...emp, 
           faceVerified: true,
           biometricImage: capturedImage 
         } : emp));
         addAuditLog('Biometric Verification', `Successfully enrolled face biometrics for ${editingEmployee.firstName} ${editingEmployee.lastName}`, 'Compliance');
      }
      setBiometricStep('success');
  };

  const handleIDUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const closeBiometricModal = () => {
    stopCamera();
    setShowBiometricModal(false);
    setEditingEmployee(null);
    setReferenceImage(null);
  };

  const reactivateEmployee = (id: string) => {
    if (confirm("Are you sure you want to reactivate this employee?")) {
        setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, status: EmployeeStatus.ACTIVE, exitDate: undefined } : emp));
        addAuditLog('Employee Reactivation', `Reactivated employee ID: ${id}`, 'Employee');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadRegister = (format: 'csv' | 'pdf') => {
    const data = filteredEmployees.map(emp => ({
      'ID': emp.id,
      'First Name': emp.firstName,
      'Last Name': emp.lastName,
      'Email': emp.email,
      'Phone': emp.phoneNumber,
      'Department': emp.department,
      'Designation': emp.designation,
      'Basic Salary': emp.basicSalary,
      'Status': emp.status,
      'Join Date': emp.joinDate,
      'Face Verified': emp.faceVerified ? 'Yes' : 'No'
    }));

    if (format === 'csv') {
      exportToCSV(data, 'Employee_Register');
    } else {
      const headers = Object.keys(data[0]);
      const rows = data.map(obj => Object.values(obj));
      exportToPDF(headers, rows, 'Employee Register', 'Employee_Register');
    }
    addAuditLog('Report Export', 'Exported Employee Register', 'System');
  };

  // Final Pay Calculation Helper
  const getFinalPayEstimate = () => {
      if (!editingEmployee) return { days: 0, gross: 0, prorated: 0, loan: 0, final: 0 };
      
      const exitDay = new Date(offboardDate).getDate();
      const monthlyGross = editingEmployee.basicSalary + editingEmployee.housingAllowance + editingEmployee.transportAllowance;
      const dailyRate = monthlyGross / 30; // Using 30 days as standard basis
      const proratedSalary = dailyRate * exitDay;
      const loan = editingEmployee.cooperativeLoanBalance;
      const final = Math.max(0, proratedSalary - loan);

      return {
          days: exitDay,
          gross: monthlyGross,
          prorated: proratedSalary,
          loan: loan,
          final: final
      };
  };
  
  const finalPay = getFinalPayEstimate();

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 text-slate-900 dark:text-slate-100 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Employee Register</h2>
          <p className="text-slate-500 dark:text-slate-400">Official record of all personnel, statuses, and biometric compliance.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex flex-1 md:flex-none rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
            <button 
              onClick={() => downloadRegister('csv')}
              className="flex-1 md:flex-none bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 flex items-center justify-center gap-1.5 text-sm font-medium border-r border-slate-200 dark:border-slate-700 transition"
              title="Download as CSV"
            >
              <Download size={16} /> CSV
            </button>
            <button 
              onClick={() => downloadRegister('pdf')}
              className="flex-1 md:flex-none bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 flex items-center justify-center gap-1.5 text-sm font-medium transition"
              title="Download as PDF"
            >
              <Download size={16} /> PDF
            </button>
          </div>
          <button 
            onClick={() => { setEditingEmployee(null); setFormData(initialFormState); setShowModal(true); }}
            className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition shadow-sm text-sm"
          >
            <Plus size={18} /> <span className="whitespace-nowrap">Add Employee</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or department..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-700 dark:text-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 dark:text-slate-400 shrink-0">
            <CheckCircle size={16} className="text-emerald-500" />
            <span>{employees.length} Total Personnel</span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="w-full text-left text-sm min-w-[700px] md:min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 md:px-6 py-4">Staff ID</th>
                <th className="px-4 md:px-6 py-4">Name</th>
                <th className="px-4 md:px-6 py-4 hidden sm:table-cell">Department</th>
                <th className="px-4 md:px-6 py-4">Status</th>
                <th className="px-4 md:px-6 py-4 hidden md:table-cell">Biometrics</th>
                <th className="px-4 md:px-6 py-4 hidden lg:table-cell">Loan Balance</th>
                <th className="px-4 md:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  <td className="px-4 md:px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {emp.staffId}
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white truncate max-w-[120px] md:max-w-none">{emp.firstName} {emp.lastName}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs truncate max-w-[120px] md:max-w-none">{emp.email}</div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{emp.department}</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      emp.status === EmployeeStatus.ACTIVE ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      emp.status === EmployeeStatus.RESIGNED ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                     {emp.faceVerified ? (
                       <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded text-[10px] font-medium border border-green-200 dark:border-green-800">
                         <ScanFace size={14} /> Verified
                       </div>
                     ) : (
                       <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 w-fit px-2 py-1 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-600">
                         <ScanFace size={14} /> Not Enrolled
                       </div>
                     )}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                    ₦{emp.cooperativeLoanBalance.toLocaleString()}
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => handleWhatsAppInvite(emp)}
                        className="p-1.5 rounded text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
                        title="Send WhatsApp Onboarding Invite"
                      >
                        <MessageCircle size={16} />
                      </button>
                       <button 
                        onClick={() => handleEnrollFace(emp)}
                        className={`p-1.5 rounded transition ${emp.faceVerified ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
                        title="Biometric Enrollment"
                      >
                        <ScanFace size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(emp)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/30 rounded"
                        title="Edit Details"
                      >
                        <Edit2 size={16} />
                      </button>
                      
                      {emp.status === EmployeeStatus.ACTIVE ? (
                        <button 
                          onClick={() => initiateOffboard(emp)}
                          className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                          title="Offboard Employee (Exit)"
                        >
                          <UserMinus size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => reactivateEmployee(emp.id)}
                          className="p-1.5 rounded text-slate-500 hover:text-green-600 hover:bg-green-50 dark:text-slate-400 dark:hover:text-green-400 dark:hover:bg-green-900/30"
                          title="Reactivate Employee"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">{editingEmployee ? 'Edit Employee' : 'New Employee'}</h3>
            
            {/* Unverified Warning Banner */}
            {editingEmployee && !formData.faceVerified && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-6 rounded-r shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" size={20} />
                            <div>
                                <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm">Biometric Enrollment Required</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Face ID is required for secure Employee Portal access. This employee cannot download payslips until enrolled.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setShowModal(false);
                                handleEnrollFace(editingEmployee);
                            }}
                            className="text-xs font-bold bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-1 shrink-0"
                        >
                            Enroll Now <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ... Form Content ... */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Staff ID</label>
                <input 
                  type="text" 
                  className="w-full border dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 p-2 rounded outline-none cursor-not-allowed" 
                  value={formData.staffId || 'Auto-generated'}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                <input 
                  type="text" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                <input 
                  type="text" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input 
                  type="email" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number (WhatsApp)</label>
                <input 
                  type="text" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.phoneNumber}
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="+234..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
                <input 
                  type="text" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                />
              </div>
              
              <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">Compensation (Monthly)</h4>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Basic Salary (₦)</label>
                <input 
                  type="number" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.basicSalary}
                  onChange={e => setFormData({...formData, basicSalary: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Housing Allowance (₦)</label>
                <input 
                  type="number" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.housingAllowance}
                  onChange={e => setFormData({...formData, housingAllowance: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transport Allowance (₦)</label>
                <input 
                  type="number" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.transportAllowance}
                  onChange={e => setFormData({...formData, transportAllowance: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cooperative Loan Bal (₦)</label>
                <input 
                  type="number" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.cooperativeLoanBalance}
                  onChange={e => setFormData({...formData, cooperativeLoanBalance: Number(e.target.value)})}
                />
              </div>

              {/* Live Salary Breakdown */}
              <div className="col-span-2 mt-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">Live Salary Breakdown (Estimate)</h4>
                </div>
                
                {(() => {
                  const breakdown = calculatePayrollEntry(formData);
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Gross Income</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">₦{breakdown.grossIncome.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">PAYE Tax</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">₦{breakdown.taxPAYE.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Pension (8%)</p>
                        <p className="text-sm font-bold text-purple-600 dark:text-purple-400">₦{breakdown.pensionEmployee.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Est. Net Pay</p>
                        <p className="text-base font-black text-emerald-800 dark:text-emerald-200">₦{breakdown.netPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  );
                })()}
                
                <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400 italic">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <p>Calculated based on current Nigerian PITA tax bands and 8% employee pension contribution. Actual net pay may vary during payroll runs due to overtime or bonuses.</p>
                </div>
              </div>
              
               <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">Compliance</h4>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">PFA Name</label>
                <select 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.pfa}
                  onChange={e => setFormData({...formData, pfa: e.target.value})}
                >
                  <option>Stanbic IBTC Pension Managers</option>
                  <option>ARM Pension Managers</option>
                  <option>Leadway Pensure</option>
                  <option>Fidelity Pension</option>
                  <option>Premium Pension</option>
                </select>
              </div>
               <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">RSA Number</label>
                <input 
                  type="text" 
                  className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={formData.rsaNumber}
                  onChange={e => setFormData({...formData, rsaNumber: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow"
              >
                {editingEmployee ? 'Save Changes' : 'Save & Continue to Biometrics'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offboarding Modal */}
      {showOffboardModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55]">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b dark:border-slate-700">
                    <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full text-red-600 dark:text-red-400">
                        <UserMinus size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Offboard Employee</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Initiate exit and calculate final settlement.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                         <div className="flex justify-between mb-2">
                             <span className="text-sm text-slate-500 dark:text-slate-400">Employee</span>
                             <span className="font-bold text-slate-900 dark:text-white">{editingEmployee.firstName} {editingEmployee.lastName}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-sm text-slate-500 dark:text-slate-400">Department</span>
                             <span className="font-medium text-slate-700 dark:text-slate-300">{editingEmployee.department}</span>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Exit Date</label>
                            <input 
                              type="date" 
                              className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded-lg"
                              value={offboardDate}
                              onChange={(e) => setOffboardDate(e.target.value)}
                            />
                        </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Reason</label>
                            <select 
                                className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white p-2 rounded-lg"
                                value={offboardReason}
                                onChange={(e) => setOffboardReason(e.target.value)}
                            >
                                <option>Resignation</option>
                                <option>Termination</option>
                                <option>Retirement</option>
                                <option>Absconded</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/40 mt-4">
                        <h4 className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 mb-3">
                            <Calculator size={16} /> Final Settlement Estimate
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-emerald-900/70 dark:text-emerald-300/70">
                                <span>Monthly Gross</span>
                                <span>₦{finalPay.gross.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-emerald-900/70 dark:text-emerald-300/70">
                                <span>Days Worked in Month ({finalPay.days} days)</span>
                                <span>(Prorated)</span>
                            </div>
                            <div className="flex justify-between font-medium text-emerald-900 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                                <span>Prorated Salary</span>
                                <span>₦{finalPay.prorated.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                             <div className="flex justify-between text-red-600 dark:text-red-400">
                                <span>Less: Outstanding Loan</span>
                                <span>-₦{finalPay.loan.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-white pt-2 border-t border-emerald-200 dark:border-emerald-800 mt-2">
                                <span>Net Final Pay</span>
                                <span>₦{finalPay.final.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <div className="mt-0.5"><Calendar size={14} /></div>
                        <p>
                            Confirming this will set status to <strong>Resigned</strong> and stop automatic salary generation in future payroll runs.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button 
                      onClick={() => setShowOffboardModal(false)}
                      className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button 
                      onClick={confirmOffboard}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-red-900/50 transition"
                    >
                        Confirm Exit
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Biometric Enrollment Modal */}
      {showBiometricModal && editingEmployee && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden w-full max-w-md border border-slate-200 dark:border-slate-700">
               <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                   <ScanFace size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enroll Face Biometrics</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                   {biometricStep === 'success' 
                     ? `Verified ${editingEmployee.firstName}'s Identity`
                     : `Enroll identity for ${editingEmployee.firstName} ${editingEmployee.lastName}`}
                 </p>
                 {biometricStep === 'start' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs px-3 py-2 rounded mt-3 text-left">
                        <span className="font-bold flex items-center gap-1 mb-1"><ShieldAlert size={12}/> Security Requirement:</span> 
                        Upload a Government ID (Reference) first, then scan live face. The AI will reject enrollment if faces do not match.
                    </div>
                 )}
               </div>

               <div className="px-6 pb-6">
                 {biometricStep === 'start' && (
                   <div className="space-y-4">
                      {/* Step 1: Upload ID */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Step 1: Upload Reference ID</label>
                        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-center cursor-pointer">
                           <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleIDUpload}
                            />
                            {referenceImage ? (
                                <div className="flex flex-col items-center text-green-600">
                                    <CheckCircle size={24} className="mb-2" />
                                    <span className="text-sm font-medium">ID Uploaded</span>
                                    <span className="text-xs text-slate-400">Click to change</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <FileText size={24} className="mb-2" />
                                    <span className="text-sm font-medium">Click to Upload ID Card</span>
                                    <span className="text-xs text-slate-400">JPG or PNG</span>
                                </div>
                            )}
                        </div>
                      </div>

                      {/* Step 2: Camera */}
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase">Step 2: Scan Live Face</label>
                         <button 
                            onClick={startCamera}
                            disabled={!referenceImage}
                            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition ${referenceImage ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-700'}`}
                        >
                            <Camera size={20} /> Start Camera
                        </button>
                      </div>
                   </div>
                 )}

                 {biometricStep === 'scanning' && (
                   <div className="relative bg-black rounded-lg overflow-hidden aspect-square mb-4">
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                     <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-lg"></div>
                     <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-48 h-48 border-2 border-dashed border-white/50 rounded-full"></div>
                     </div>
                     <button 
                        onClick={captureAndVerify}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur text-white px-6 py-2 rounded-full font-bold hover:bg-white/30 transition border border-white/50"
                      >
                        Capture & Verify
                      </button>
                   </div>
                 )}

                 {biometricStep === 'processing' && (
                   <div className="py-12 flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-emerald-200 dark:border-emerald-900 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">Verifying Identity...</p>
                      <p className="text-xs text-slate-400 mt-1">Comparing Live Face vs. ID Card</p>
                   </div>
                 )}

                 {biometricStep === 'failed' && (
                   <div className="py-8 flex flex-col items-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                        <AlertTriangle size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">Enrollment Rejected</h4>
                      <p className="text-sm text-red-600 dark:text-red-400 text-center mt-2 px-4">
                        {failureReason}
                      </p>
                      <button 
                        onClick={() => setBiometricStep('start')}
                        className="mt-6 w-full py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={16} /> Try Again
                      </button>
                   </div>
                 )}

                 {biometricStep === 'success' && (
                   <div className="py-8 flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4 animate-bounce">
                        <CheckCircle size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">Enrollment Successful</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                        Employee biometrics have been securely linked to their profile.
                      </p>
                      <button 
                        onClick={closeBiometricModal}
                        className="mt-6 w-full py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600"
                      >
                        Close
                      </button>
                   </div>
                 )}
               </div>
               
               {biometricStep === 'start' && (
                 <button onClick={closeBiometricModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                   <X size={20} />
                 </button>
               )}
            </div>
         </div>
      )}
    </div>
  );
};

export default EmployeeRegister;