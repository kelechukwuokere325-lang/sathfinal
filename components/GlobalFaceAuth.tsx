import React, { useState, useRef, useEffect } from 'react';
import { ScanFace, Camera, Loader2, AlertCircle, RefreshCw, ShieldCheck, Lock } from 'lucide-react';
import { compareBiometricFaces } from '../services/geminiService';

interface GlobalFaceAuthProps {
  onVerified: () => void;
}

const GlobalFaceAuth: React.FC<GlobalFaceAuthProps> = ({ onVerified }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [failureReason, setFailureReason] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setFailureReason("Camera access denied. Please enable your camera to access the system.");
      setVerificationFailed(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

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

  const handleVerify = async () => {
    const liveImage = captureFrame();
    if (!liveImage) return;

    setIsVerifying(true);
    setVerificationFailed(false);

    try {
      const result = await compareBiometricFaces("MASTER_FACE_REFERENCE", liveImage);
      
      if (result.match) {
        stopCamera();
        onVerified();
      } else {
        setVerificationFailed(true);
        setFailureReason(result.reason || "Face does not match the authorized master profile.");
      }
    } catch (error) {
      setVerificationFailed(true);
      setFailureReason("Biometric service error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
            <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">System Authentication</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Please verify your identity using face biometrics to access the PayPulse Nigeria platform.
          </p>

          <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-8 shadow-inner ring-4 ring-slate-100 dark:ring-slate-700">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVerifying ? 'opacity-50' : 'opacity-100'}`}
            ></video>
            
            {/* Scanning Overlay */}
            {!isVerifying && !verificationFailed && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-0 top-0 h-1 bg-blue-500/50 animate-scan shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-dashed border-white/40 rounded-full"></div>
                    </div>
                </div>
            )}

            {isVerifying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-2" />
                    <span className="text-white font-medium">Analyzing Biometrics...</span>
                </div>
            )}

            {verificationFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-sm p-6">
                    <AlertCircle className="w-12 h-12 text-white mb-3" />
                    <span className="text-white font-bold text-lg">Access Denied</span>
                    <p className="text-red-100 text-sm mt-2">{failureReason}</p>
                </div>
            )}
          </div>

          <div className="space-y-4">
            {verificationFailed ? (
              <button 
                onClick={() => { setVerificationFailed(false); startCamera(); }}
                className="w-full bg-slate-800 dark:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600 transition-all active:scale-[0.98]"
              >
                <RefreshCw size={20} /> Retry Verification
              </button>
            ) : (
              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isVerifying ? 'Verifying...' : (
                  <>
                    <ScanFace size={22} /> Authenticate Now
                  </>
                )}
              </button>
            )}
            
            <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-xs mt-6">
              <Lock size={12} />
              <span>End-to-end encrypted biometric verification</span>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          position: absolute;
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GlobalFaceAuth;
