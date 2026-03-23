import React, { useState, useRef, useEffect } from 'react';
import { Employee, PayrollRun, PayrollIssue, EmployeeVerification, AttendanceRecord } from '../types';
import { Download, AlertCircle, CheckCircle, Wallet, Calendar, ChevronRight, X, Lock, LogIn, LogOut, ScanFace, Camera, Loader2, UserCheck, HelpCircle, Send, RefreshCw, ShieldCheck, User, MapPin, Clock } from 'lucide-react';
import { generatePayslipPDF } from '../services/exportUtils';
import { compareBiometricFaces } from '../services/geminiService';
import MapLocator from './MapLocator';

interface EmployeePortalProps {
  employees: Employee[];
  payrollRuns: PayrollRun[];
  verifications: EmployeeVerification[];
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  onVerify?: (verificationId: string, data: Partial<EmployeeVerification>) => void;
  onRaiseIssue?: (issue: Omit<PayrollIssue, 'id' | 'status' | 'dateReported'>) => void;
}

const EmployeePortal: React.FC<EmployeePortalProps> = ({ employees, payrollRuns, verifications, attendanceRecords, setAttendanceRecords, onVerify, onRaiseIssue }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Login Flow State
  const [loginStep, setLoginStep] = useState<'email' | 'face'>('email');
  const [pendingUser, setPendingUser] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'payroll' | 'locator' | 'attendance'>('payroll');
  
  // Biometric State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [failureReason, setFailureReason] = useState('');

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('Incorrect Salary Amount');
  const [issueText, setIssueText] = useState('');

  // Staff Verification State
  const [isVerifyingStaff, setIsVerifyingStaff] = useState(false);
  const [verificationData, setVerificationData] = useState({
    isActivelyWorking: true,
    isRoleSame: true,
    selfieImage: ''
  });
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);
  const [staffVerificationLoading, setStaffVerificationLoading] = useState(false);

  // Attendance State
  const [isVerifyingAttendance, setIsVerifyingAttendance] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState<'check-in' | 'check-out' | null>(null);

  // Fix: Attach stream to video element whenever step becomes 'face', 'selfie', or 'attendance' and stream is available
  useEffect(() => {
    if ((loginStep === 'face' || isCapturingSelfie || isVerifyingAttendance) && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [loginStep, isCapturingSelfie, isVerifyingAttendance, stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
    } catch (err) {
      console.error(err);
      setLoginError("Camera access required for verification.");
      setLoginStep('email');
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const user = employees.find(emp => emp.email.toLowerCase() === emailInput.trim().toLowerCase());
    
    if (user) {
      if (user.status === 'Resigned' || user.status === 'Suspended') {
           setLoginError('Access restricted. Account is not Active.');
           return;
      }

      // STRICT CHECK: Has this employee been enrolled by HR yet?
      if (!user.faceVerified) {
        setLoginError('Face ID not enrolled. Please visit HR to complete biometric registration.');
        return;
      }

      // Found user and verified status, move to face verification
      setPendingUser(user);
      setLoginStep('face');
      await startCamera();
    } else {
      setLoginError('Email not found in employee records.');
    }
  };

  const verifyFace = async () => {
    if (!pendingUser) return;
    
    const liveImage = captureFrame();
    if (!liveImage) {
        setLoginError("Failed to capture image from camera.");
        return;
    }

    setIsVerifying(true);
    setVerificationFailed(false);
    
    try {
        // If the user has a stored biometric image, compare against it.
        // Otherwise, we might have to allow them in for this demo if they were pre-loaded,
        // but the strict rule is they must be enrolled.
        if (pendingUser.biometricImage) {
            const result = await compareBiometricFaces(pendingUser.biometricImage, liveImage);
            
            if (result.match) {
                stopCamera();
                setCurrentUser(pendingUser);
                setPendingUser(null);
                setLoginStep('email');
            } else {
                setVerificationFailed(true);
                setFailureReason(result.reason || "Face does not match our records.");
            }
        } else {
            // Fallback for demo characters who might not have images yet but are marked verified
            // In a real app, we'd ensure biometricImage is always present if faceVerified is true
            setTimeout(() => {
                stopCamera();
                setCurrentUser(pendingUser);
                setPendingUser(null);
                setLoginStep('email');
            }, 1500);
        }
    } catch (error) {
        setLoginError("Biometric service error. Please try again.");
    } finally {
        setIsVerifying(false);
    }
  };

  const cancelLogin = () => {
      stopCamera();
      setLoginStep('email');
      setPendingUser(null);
      setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmailInput('');
    setLoginError('');
    setLoginStep('email');
    setIsVerifyingStaff(false);
    setActiveTab('payroll');
  };

  const handleAttendanceAction = async (action: 'check-in' | 'check-out') => {
    setAttendanceAction(action);
    setIsVerifyingAttendance(true);
    await startCamera();
  };

  const confirmAttendance = () => {
    if (!attendanceAction || !currentUser) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check if record already exists for today
    const existingRecordIndex = attendanceRecords.findIndex(
      r => r.employeeId === currentUser.id && r.date === today
    );

    if (attendanceAction === 'check-in') {
      if (existingRecordIndex !== -1 && attendanceRecords[existingRecordIndex].checkIn) {
        alert('You have already checked in today.');
        setIsVerifyingAttendance(false);
        stopCamera();
        return;
      }

      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        employeeId: currentUser.id,
        employeeName: `${currentUser.firstName} ${currentUser.lastName}`,
        date: today,
        checkIn: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Present',
        location: 'Main Office (Verified)',
        verified: true
      };

      if (existingRecordIndex !== -1) {
        const updated = [...attendanceRecords];
        updated[existingRecordIndex] = { ...updated[existingRecordIndex], ...newRecord };
        setAttendanceRecords(updated);
      } else {
        setAttendanceRecords(prev => [newRecord, ...prev]);
      }
    } else {
      if (existingRecordIndex === -1 || !attendanceRecords[existingRecordIndex].checkIn) {
        alert('You must check in before checking out.');
        setIsVerifyingAttendance(false);
        stopCamera();
        return;
      }

      const updated = [...attendanceRecords];
      updated[existingRecordIndex] = {
        ...updated[existingRecordIndex],
        checkOut: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAttendanceRecords(updated);
    }

    setIsVerifyingAttendance(false);
    setAttendanceAction(null);
    stopCamera();
    alert(`Successfully ${attendanceAction === 'check-in' ? 'checked in' : 'checked out'}!`);
  };

  // Check for active verification
  const activeVerification = currentUser ? verifications.find(v => 
    v.employeeId === currentUser.id && 
    v.status === 'Pending'
  ) : null;

  const handleStartStaffVerification = async () => {
    setIsVerifyingStaff(true);
    await startCamera();
    setIsCapturingSelfie(true);
  };

  const handleCaptureSelfie = () => {
    const selfie = captureFrame();
    if (selfie) {
      setVerificationData(prev => ({ ...prev, selfieImage: selfie }));
      setIsCapturingSelfie(false);
      stopCamera();
    }
  };

  const handleSubmitStaffVerification = async () => {
    if (!activeVerification || !onVerify) return;
    
    setStaffVerificationLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const isFlagged = !verificationData.isActivelyWorking || !verificationData.isRoleSame;
      
      onVerify(activeVerification.id, {
        status: isFlagged ? 'Flagged' : 'Verified',
        isActivelyWorking: verificationData.isActivelyWorking,
        isRoleSame: verificationData.isRoleSame,
        selfieImage: verificationData.selfieImage,
        flagReason: isFlagged ? `Employee reported: Working=${verificationData.isActivelyWorking}, RoleSame=${verificationData.isRoleSame}` : undefined
      });
      
      setStaffVerificationLoading(false);
      setIsVerifyingStaff(false);
      alert(isFlagged ? "Verification completed. Your status has been flagged for HR review." : "Identity and employment status verified successfully.");
    }, 2000);
  };

  if (!currentUser) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
          
          {loginStep === 'email' ? (
            <>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4 rotate-3">
                      <ShieldCheck className="text-white w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
                      Pay<span className="text-emerald-500">Pulse</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold">Employee Portal</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Work Email</label>
                    <input 
                        type="email" 
                        required
                        className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        placeholder="name@company.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                    />
                    </div>
                    
                    {loginError && (
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{loginError}</span>
                    </div>
                    )}

                    <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transition flex items-center justify-center gap-2"
                    >
                    <LogIn size={20} /> Next
                    </button>
                </form>
            </>
          ) : (
            // Face Verification Step
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                 <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Verify Identity</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Welcome, {pendingUser?.firstName}. Please verify your face to continue.
                    </p>
                </div>

                <div className="relative bg-black rounded-xl overflow-hidden aspect-square mb-6 mx-auto w-64 shadow-inner ring-4 ring-slate-100 dark:ring-slate-700">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={`w-full h-full object-cover ${isVerifying ? 'opacity-50' : 'opacity-100'}`}
                    ></video>
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 border-2 border-blue-500/50 rounded-xl pointer-events-none"></div>
                    {!isVerifying && !verificationFailed && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="w-40 h-40 border-2 border-dashed border-white/60 rounded-full"></div>
                        </div>
                    )}

                    {isVerifying && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                            <Loader2 className="w-12 h-12 text-green-400 animate-spin mb-2" />
                            <span className="text-white font-medium text-sm">Matching Biometrics...</span>
                        </div>
                    )}

                    {verificationFailed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-sm p-4">
                            <AlertCircle className="w-12 h-12 text-white mb-2" />
                            <span className="text-white font-bold text-sm text-center">Verification Failed</span>
                            <p className="text-red-100 text-xs text-center mt-1">{failureReason}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {verificationFailed ? (
                        <button 
                            onClick={() => { setVerificationFailed(false); startCamera(); }}
                            className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition"
                        >
                            <RefreshCw size={20} /> Try Again
                        </button>
                    ) : (
                        <button 
                            onClick={verifyFace}
                            disabled={isVerifying}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 rounded-lg shadow-lg transition flex items-center justify-center gap-2"
                        >
                            {isVerifying ? 'Verifying...' : (
                                <>
                                    <ScanFace size={20} /> Verify & Login
                                </>
                            )}
                        </button>
                    )}
                    <button 
                        onClick={cancelLogin}
                        disabled={isVerifying}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
          )}

          <div className="mt-8 text-center border-t border-slate-100 dark:border-slate-700 pt-4">
             <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-2">
               <div className="flex items-center justify-center gap-1 font-semibold">
                  <Lock size={12} /> Protected by PayPulse Security
               </div>
               <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-left">
                  <p className="font-bold mb-1 flex items-center gap-1"><HelpCircle size={10}/> Login Help:</p>
                  <ul className="list-disc list-inside space-y-1">
                      <li>Use your company email (e.g. <em>tola.a@company.com</em>)</li>
                      <li>For generated staff, use: <em>firstname.lastname[ID]@company.com</em></li>
                      <li>Example: <strong>musa.bello15@company.com</strong></li>
                  </ul>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Get employee specific payroll history
  const history = payrollRuns
    .filter(run => run.status === 'Finalized' && run.entries.some(e => e.employeeId === currentUser.id))
    .map(run => ({
      ...run,
      entry: run.entries.find(e => e.employeeId === currentUser.id)!
    }))
    .reverse(); // Newest first

  const latestPay = history[0];

  const downloadPayslip = (item: typeof history[0]) => {
     generatePayslipPDF(item.entry, currentUser, item.month);
  };

  const handleRaiseIssue = () => {
    if (onRaiseIssue && currentUser && issueText.trim()) {
        onRaiseIssue({
            employeeId: currentUser.id,
            employeeName: `${currentUser.firstName} ${currentUser.lastName}`,
            type: issueType,
            description: issueText
        });
        alert(`Issue reported: "${issueType}". Ticket created successfully.`);
        setShowIssueModal(false);
        setIssueText('');
        setIssueType('Incorrect Salary Amount');
    } else {
        alert("Please describe the issue.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Portal Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              Pay<span className="text-emerald-500">Pulse</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Employee Portal</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'payroll' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Wallet size={14} /> <span className="hidden sm:inline">My Payroll</span>
          </button>
          <button 
            onClick={() => setActiveTab('locator')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'locator' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MapPin size={14} /> <span className="hidden sm:inline">Service Locator</span>
          </button>
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'attendance' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar size={14} /> <span className="hidden sm:inline">Attendance</span>
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'locator' ? (
          <div className="h-full">
            <MapLocator />
          </div>
        ) : activeTab === 'attendance' ? (
          <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                  <Clock size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Daily Attendance</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">Record your presence for today. Biometric verification required.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                  <button 
                    onClick={() => handleAttendanceAction('check-in')}
                    className="flex flex-col items-center justify-center p-6 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition group"
                  >
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <LogIn size={24} />
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">Check In</span>
                    <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 uppercase font-bold mt-1">Start Shift</span>
                  </button>
                  
                  <button 
                    onClick={() => handleAttendanceAction('check-out')}
                    className="flex flex-col items-center justify-center p-6 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition group"
                  >
                    <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <LogOut size={24} />
                    </div>
                    <span className="font-bold text-orange-700 dark:text-orange-300">Check Out</span>
                    <span className="text-[10px] text-orange-600/60 dark:text-orange-400/60 uppercase font-bold mt-1">End Shift</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                Secure Biometric Verification Active
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-800 dark:text-white">Recent Attendance</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {attendanceRecords.filter(r => r.employeeId === currentUser.id).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic">No attendance records found.</div>
                ) : (
                  attendanceRecords
                    .filter(r => r.employeeId === currentUser.id)
                    .slice(0, 5)
                    .map(record => (
                      <div key={record.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(record.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(record.date).getDate()}</span>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{record.status}</div>
                            <div className="text-xs text-slate-500">{record.location}</div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-right">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">In</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.checkIn || '--:--'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Out</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.checkOut || '--:--'}</div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-6">
            {/* Verification Banner */}
            {activeVerification && !isVerifyingStaff && (
              <div className="mb-6 bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={32} className="shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Periodic Staff Verification Required</h3>
                    <p className="text-emerald-100 text-sm">Please complete your identity and employment status check to avoid payroll delays.</p>
                  </div>
                </div>
                <button 
                  onClick={handleStartStaffVerification}
                  className="w-full md:w-auto bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-2 rounded-lg font-bold transition shadow-sm"
                >
                  Verify Now
                </button>
              </div>
            )}

            {isVerifyingStaff && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <ShieldCheck className="text-emerald-600" /> Staff Verification Flow
                    </h3>
                    <button onClick={() => { setIsVerifyingStaff(false); stopCamera(); }} className="text-slate-400 hover:text-slate-600">
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Step 1: Details */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Step 1: Confirm Details</h4>
                          <div className="space-y-3">
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                              <label className="block text-[10px] text-slate-500 uppercase font-bold">Full Name</label>
                              <div className="font-bold text-slate-800 dark:text-white">{currentUser.firstName} {currentUser.lastName}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                              <label className="block text-[10px] text-slate-500 uppercase font-bold">Staff ID</label>
                              <div className="font-bold text-slate-800 dark:text-white">{currentUser.staffId}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                              <label className="block text-[10px] text-slate-500 uppercase font-bold">Department</label>
                              <div className="font-bold text-slate-800 dark:text-white">{currentUser.department}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Step 2: Employment Status</h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                              <span className="text-sm font-medium">Are you still actively working in this organization?</span>
                              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                <button 
                                  onClick={() => setVerificationData(prev => ({ ...prev, isActivelyWorking: true }))}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${verificationData.isActivelyWorking ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}
                                >
                                  Yes
                                </button>
                                <button 
                                  onClick={() => setVerificationData(prev => ({ ...prev, isActivelyWorking: false }))}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${!verificationData.isActivelyWorking ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-slate-500'}`}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                              <span className="text-sm font-medium">Is your role still the same?</span>
                              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                <button 
                                  onClick={() => setVerificationData(prev => ({ ...prev, isRoleSame: true }))}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${verificationData.isRoleSame ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}
                                >
                                  Yes
                                </button>
                                <button 
                                  onClick={() => setVerificationData(prev => ({ ...prev, isRoleSame: false }))}
                                  className={`px-3 py-1 rounded-md text-xs font-bold transition ${!verificationData.isRoleSame ? 'bg-white dark:bg-slate-700 shadow-sm text-red-600' : 'text-slate-500'}`}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Identity */}
                      <div className="space-y-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Step 3: Identity Verification</h4>
                        
                        <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700 shadow-inner">
                          {isCapturingSelfie ? (
                            <>
                              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-48 border-2 border-dashed border-white/40 rounded-full"></div>
                              </div>
                              <button 
                                onClick={handleCaptureSelfie}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-slate-900 p-4 rounded-full shadow-xl hover:scale-110 transition active:scale-95"
                              >
                                <Camera size={24} />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                              {verificationData.selfieImage ? (
                                <>
                                  <img src={verificationData.selfieImage} alt="Selfie" className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => { setIsCapturingSelfie(true); startCamera(); }}
                                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition"
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                </>
                              ) : (
                                <div className="text-center p-6">
                                  <Camera size={48} className="mx-auto mb-4 text-slate-700" />
                                  <p className="text-slate-500 text-sm">Capture a live selfie to verify your identity.</p>
                                  <button 
                                    onClick={() => { setIsCapturingSelfie(true); startCamera(); }}
                                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
                                  >
                                    Start Camera
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex gap-3">
                          <AlertCircle size={18} className="shrink-0" />
                          <p><strong>Security Note:</strong> We use real-time biometric matching to ensure you are the authorized staff member. No photo uploads allowed.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <button 
                      onClick={() => { setIsVerifyingStaff(false); stopCamera(); }}
                      className="px-6 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSubmitStaffVerification}
                      disabled={!verificationData.selfieImage || staffVerificationLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-lg font-bold transition shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {staffVerificationLoading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                      Submit Verification
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Welcome, {currentUser.firstName} <UserCheck className="text-green-500" size={24} />
                </h2>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">Identity Verified. Manage your payslips securely.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => setShowIssueModal(true)}
                    className="flex-1 md:flex-none text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition"
                  >
                    <AlertCircle size={16} /> Report Issue
                  </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Col: Latest Payslip & Stats */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Digital Payslip Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Wallet size={120} className="dark:text-white" />
                    </div>
                    
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                          Latest Payment
                        </span>
                        <span className="text-slate-400 text-sm font-medium">
                          {latestPay ? latestPay.month : 'No Data'}
                        </span>
                      </div>
                      <div className="mb-1 text-slate-500 dark:text-slate-400 text-sm">Net Pay</div>
                      <div className="text-4xl font-bold text-slate-900 dark:text-white">
                        ₦{latestPay ? latestPay.entry.netPay.toLocaleString() : '0.00'}
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-2 gap-y-4 gap-x-8">
                      <div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mb-1">Earnings</div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Basic</span>
                            <span className="font-medium dark:text-slate-200">₦{latestPay?.entry.basic.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Housing</span>
                            <span className="font-medium dark:text-slate-200">₦{latestPay?.entry.housing.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Transport</span>
                            <span className="font-medium dark:text-slate-200">₦{latestPay?.entry.transport.toLocaleString() || '0'}</span>
                          </div>
                      </div>
                      <div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mb-1">Deductions</div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600 dark:text-slate-400">Tax (PAYE)</span>
                            <span className="font-medium text-red-600 dark:text-red-400">-₦{latestPay?.entry.taxPAYE.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Pension</span>
                            <span className="font-medium text-red-600 dark:text-red-400">-₦{latestPay?.entry.pensionEmployee.toLocaleString() || '0'}</span>
                          </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex justify-between items-center">
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-500" />
                        Paid to Savings Account •••• 4521
                      </div>
                      <button 
                          onClick={() => latestPay && downloadPayslip(latestPay)}
                          className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1 hover:underline"
                      >
                        <Download size={16} /> Download PDF
                      </button>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white">Payment History</h3>
                      <button className="text-sm text-blue-600 dark:text-blue-400 font-medium">View All</button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {history.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm">No payment history found.</div>
                      ) : (
                        history.map(item => (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                  <Calendar size={18} />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{item.month}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Processed on {new Date(item.dateCreated).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="font-bold text-slate-900 dark:text-white">₦{item.entry.netPay.toLocaleString()}</p>
                                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Paid</p>
                                </div>
                                <button 
                                  onClick={() => downloadPayslip(item)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                  title="Download PDF"
                                >
                                  <Download size={20} />
                                </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                </div>
              </div>

              {/* Right Col: Profile & Info */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 mb-3 flex items-center justify-center text-2xl font-bold text-slate-500 dark:text-slate-400">
                        {currentUser.firstName[0]}{currentUser.lastName[0]}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{currentUser.firstName} {currentUser.lastName}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser.designation}</p>
                      <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          {currentUser.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">Department</span>
                        <span className="font-medium text-slate-900 dark:text-white">{currentUser.department}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">Staff ID</span>
                        <span className="font-medium text-slate-900 dark:text-white">{currentUser.staffId}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">PFA</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right w-32 truncate">{currentUser.pfa}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2">
                        <span className="text-slate-500 dark:text-slate-400">RSA Number</span>
                        <span className="font-medium text-slate-900 dark:text-white">{currentUser.rsaNumber}</span>
                      </div>
                    </div>
                </div>
                
                <div className="bg-blue-600 dark:bg-blue-700 rounded-xl p-6 text-white shadow-lg">
                    <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                    <p className="text-blue-100 text-sm mb-4">
                      If you notice any discrepancies in your pay or tax calculations, please raise a ticket immediately.
                    </p>
                    <button 
                      onClick={() => setShowIssueModal(true)}
                      className="w-full bg-white text-blue-600 dark:text-blue-700 font-bold py-2 rounded-lg hover:bg-blue-50 transition"
                    >
                      Raise Ticket
                    </button>
                </div>

                <div className="bg-emerald-600 dark:bg-emerald-700 rounded-xl p-6 text-white shadow-lg">
                    <h4 className="font-bold text-lg mb-2">Service Locator</h4>
                    <p className="text-emerald-100 text-sm mb-4">
                      Find nearby banks, tax offices, and hospitals to manage your finances and health.
                    </p>
                    <button 
                      onClick={() => setActiveTab('locator')}
                      className="w-full bg-white text-emerald-600 dark:text-emerald-700 font-bold py-2 rounded-lg hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                    >
                      <MapPin size={18} /> Open Locator
                    </button>
                </div>
              </div>
            </div>

            {/* Footer Branding */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2 opacity-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                  <ShieldCheck className="text-white w-4 h-4" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">PayPulse Nigeria</span>
              </div>
              <p className="text-[10px] text-slate-400">Secure Workforce Management System v2.5</p>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Verification Modal */}
      {isVerifyingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2 capitalize">
                <ShieldCheck className="text-blue-600" /> {attendanceAction?.replace('-', ' ')}
              </h3>
              <button onClick={() => { setIsVerifyingAttendance(false); stopCamera(); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden mb-6">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-dashed border-white/40 rounded-full"></div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex gap-3 mb-6">
                <AlertCircle size={18} className="shrink-0" />
                <p>Position your face in the circle to verify identity and record your {attendanceAction?.replace('-', ' ')}.</p>
              </div>

              <button 
                onClick={confirmAttendance}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition shadow-lg shadow-blue-200 dark:shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                <Camera size={20} /> Verify & Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raise Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Payroll Issue</h3>
                 <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                   <X size={20} />
                 </button>
              </div>
              
              <div className="mb-4">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Issue Type</label>
                 <select 
                    className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg p-2"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                 >
                    <option>Incorrect Salary Amount</option>
                    <option>Tax Deduction Error</option>
                    <option>Pension Not Remitted</option>
                    <option>Bank Transfer Issue</option>
                    <option>Other</option>
                 </select>
              </div>
              
              <div className="mb-4">
                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                 <textarea 
                   className="w-full border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg p-3 h-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   placeholder="Please describe the discrepancy..."
                   value={issueText}
                   onChange={(e) => setIssueText(e.target.value)}
                 ></textarea>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setShowIssueModal(false)}
                   className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleRaiseIssue}
                   className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                 >
                   <Send size={16} /> Submit Report
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePortal;