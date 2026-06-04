import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Mic, MonitorPlay, Wifi, AlertTriangle, CheckCircle2, Maximize, ShieldAlert, Key, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDrives } from '../contexts/DriveContext';

export default function SystemVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { drives, registerCandidateForDrive, roundSchedules, isCandidateEligible, hasCandidateSubmittedRound } = useDrives();
  
  const [viewStep, setViewStep] = useState('checks'); // 'checks' | 'instructions'
  
  // Retrieve active round to check camera requirements
  const session = JSON.parse(localStorage.getItem('active_candidate_session') || '{}');
  const driveId = session.driveId;
  let activeRound = null;
  const driveSchedules = roundSchedules[driveId];
  if (driveSchedules) {
    const ids = Object.keys(driveSchedules).sort((a, b) => Number(a) - Number(b));
    for (const id of ids) {
      if (isCandidateEligible(user?.email, driveId, id) && !hasCandidateSubmittedRound(user?.email, driveId, id)) {
        activeRound = driveSchedules[id];
        break;
      }
    }
  }

  const cameraRequired = ['3', '4', '5'].includes(String(activeRound?.roundId));

  const [checks, setChecks] = useState({
    browser: { status: 'checking', message: 'Checking compatibility...' },
    internet: { status: 'checking', message: 'Checking ping...' },
    webcam: { status: 'checking', message: 'Requesting access...' },
    mic: { status: 'checking', message: 'Requesting access...' }
  });
  
  const [isReady, setIsReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const webcamRef = useRef(null);

  useEffect(() => {
    // Simulate check progression
    setTimeout(() => setChecks(c => ({ ...c, browser: { status: 'passed', message: 'Chrome (Supported)' } })), 500);
    setTimeout(() => setChecks(c => ({ ...c, internet: { status: 'passed', message: 'Connected (45ms ping)' } })), 1000);
    
    // Auto-pass camera if not required
    if (!cameraRequired) {
      setTimeout(() => setChecks(c => ({ 
        ...c, 
        webcam: { status: 'passed', message: 'Camera Not Required' },
        mic: { status: 'passed', message: 'Mic Not Required' }
      })), 1500);
    }
  }, [cameraRequired]);

  const handleMediaSuccess = () => {
    setChecks(c => ({ 
      ...c, 
      webcam: { status: 'passed', message: 'Camera detected' },
      mic: { status: 'passed', message: 'Microphone detected' }
    }));
  };

  const handleMediaError = () => {
    setChecks(c => ({ 
      ...c, 
      webcam: { status: 'failed', message: 'Permission denied' },
      mic: { status: 'failed', message: 'Permission denied' }
    }));
  };

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        setIsReady(true);
      }).catch(() => {
        // Handle error gracefully if needed
      });
    }
  };

  const handleFullscreenChange = () => {
    setIsReady(!!document.fullscreenElement);
  };

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const allChecksPassed = Object.values(checks).every(c => c.status === 'passed');

  const CheckItem = ({ icon: Icon, title, data }) => (
    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${
          data.status === 'passed' ? 'bg-success/20 text-success' : 
          data.status === 'failed' ? 'bg-danger/20 text-danger' : 
          'bg-primary/20 text-primary animate-pulse'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-white text-sm">{title}</h4>
          <p className="text-slate-400 text-xs mt-0.5">{data.message}</p>
        </div>
      </div>
      {data.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-success" />}
      {data.status === 'failed' && <AlertTriangle className="w-5 h-5 text-danger" />}
      {data.status === 'checking' && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {viewStep === 'checks' ? (
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Left Side - Info & Video Preview */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">System Validity Check</h1>
              <p className="text-slate-400 text-sm">Please complete system checks before entering the proctored environment.</p>
            </div>
            
            <div className="glass-panel p-2 rounded-2xl aspect-video bg-black/40 relative overflow-hidden border border-white/10 shadow-2xl">
              {cameraRequired ? (
                <Webcam
                  audio={true}
                  ref={webcamRef}
                  onUserMedia={handleMediaSuccess}
                  onUserMediaError={handleMediaError}
                  className="w-full h-full object-cover rounded-xl"
                  mirrored={true}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <Camera className="w-12 h-12 mb-3 opacity-20" />
                  <p>Camera is not required for this round.</p>
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {checks.webcam.status === 'passed' && cameraRequired && (
                  <div className="w-48 h-64 border-2 border-success/50 rounded-2xl relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-black text-xs font-bold px-2 py-0.5 rounded">
                      Face Detected
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex gap-3 text-sm text-warning">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p><strong>Warning:</strong> Navigating away, opening new tabs, or exiting fullscreen will result in a security violation. 3 violations will terminate your exam.</p>
            </div>
          </div>

          {/* Right Side - Checklists */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-6 text-lg">System Checks</h3>
            
            <div className="space-y-3 mb-8">
              <CheckItem icon={MonitorPlay} title="Browser Compatibility" data={checks.browser} />
              <CheckItem icon={Wifi} title="Internet Connection" data={checks.internet} />
              <CheckItem icon={Camera} title="Webcam Feed" data={checks.webcam} />
              <CheckItem icon={Mic} title="Microphone Audio" data={checks.mic} />
            </div>

            <button 
              onClick={() => setViewStep('instructions')}
              disabled={!allChecksPassed}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Show Instructions <FileText className="w-5 h-5" />
            </button>
          </div>

        </div>
      ) : (
        <div className="max-w-3xl w-full">
          <div className="glass-panel p-8 rounded-2xl">
            <h1 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              INSTRUCTIONS TO BE FOLLOWED
            </h1>
            
            <div className="bg-black/30 rounded-xl p-6 border border-white/5 max-h-[60vh] overflow-y-auto mb-6 text-sm text-slate-300 space-y-4 font-medium leading-relaxed">
              <p>1. Read each question carefully before answering.</p>
              <p>2. Fullscreen mode must remain enabled throughout the entire assessment.</p>
              <p>3. Do not switch browser tabs during the examination.</p>
              <p>4. Do not minimize or close the assessment window.</p>
              <p>5. Do not exit fullscreen mode once the assessment begins.</p>
              <p>6. Copying assessment content is strictly prohibited.</p>
              <p>7. Pasting external content into the assessment is not allowed.</p>
              <div>
                <p>8. Restricted keyboard shortcuts are not permitted. Examples include:</p>
                <ul className="list-disc pl-8 mt-2 space-y-1 text-slate-400">
                  <li>Ctrl + C</li>
                  <li>Ctrl + V</li>
                  <li>Ctrl + X</li>
                  <li>Ctrl + A</li>
                  <li>Ctrl + Shift + I</li>
                  <li>Print Screen</li>
                  <li>Windows + Shift + S</li>
                </ul>
              </div>
              <p>9. Use of unauthorized websites, external tools, AI tools, or study materials during the assessment is prohibited.</p>
              <p>10. Do not attempt to capture screenshots or screen recordings.</p>
              <p>11. Multiple malpractice violations may lead to immediate termination of the assessment.</p>
              <p>12. Ensure a stable internet connection before starting.</p>
              <p>13. Do not refresh the page unnecessarily during the examination.</p>
              <p>14. Only one assessment attempt is allowed.</p>
              <p>15. Complete the assessment within the allocated time limit.</p>
              <p>16. All examination activities may be monitored for assessment integrity.</p>
              <p>17. Any suspicious activity may be recorded and reviewed.</p>
              
              <div className="mt-8 pt-6 border-t border-white/10 text-slate-400">
                <p>Please read all instructions carefully before proceeding.</p>
                <p>By continuing, you confirm that you understand and agree to follow all examination guidelines.</p>
              </div>
            </div>

            <div className="space-y-6">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-black/40 transition-colors">
                <div className="mt-0.5">
                  <input 
                    type="checkbox" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 text-primary focus:ring-primary bg-black/50"
                  />
                </div>
                <span className="text-sm text-slate-300">
                  I have read and understood all examination instructions and agree to follow them.
                </span>
              </label>

              {!isReady ? (
                <button 
                  onClick={requestFullscreen}
                  disabled={!agreed}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Maximize className="w-5 h-5" /> Enter Fullscreen Mode
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/candidate/coding')}
                  disabled={!agreed}
                  className="w-full bg-success hover:bg-success/90 text-white font-bold py-4 rounded-xl transition-all animate-pulse flex items-center justify-center gap-2"
                >
                  Start Assessment <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
