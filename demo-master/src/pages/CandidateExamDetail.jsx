import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDrives } from '../contexts/DriveContext';
import { LayoutDashboard, FileText, Sun, LogOut, ArrowRight, ShieldAlert, Clock, Layers, HelpCircle, Calendar, AlertCircle } from 'lucide-react';

export default function CandidateExamDetail() {
  const { driveId } = useParams();
  const { user, logout } = useAuth();
  const { drives, roundSchedules, registerCandidateForDrive, isCandidateEligible, hasCandidateSubmittedRound } = useDrives();
  const navigate = useNavigate();

  const drive = drives.find(d => d.id === driveId);

  // For each drive, find the earliest scheduled round this candidate is eligible for and hasn't submitted yet
  let activeRound = null;
  const driveSchedules = roundSchedules[driveId];
  if (driveSchedules) {
    const ids = Object.keys(driveSchedules).sort((a, b) => Number(a) - Number(b));
    for (const id of ids) {
      if (isCandidateEligible(user?.email, driveId, id)) {
        if (!hasCandidateSubmittedRound(user?.email, driveId, id)) {
          activeRound = driveSchedules[id];
          break;
        }
      } else {
        // If not eligible for this round, cannot be eligible for subsequent rounds
        break;
      }
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleJoinExam = () => {
    if (user) {
      const candidateRecord = registerCandidateForDrive(user.email, user.name, driveId);
      localStorage.setItem('active_candidate_session', JSON.stringify(candidateRecord));
    }
    navigate('/candidate/verify');
  };

  if (!activeRound) {
    return (
      <div className="min-h-screen bg-[#0b1121] flex font-sans">
        <aside className="w-[200px] min-h-screen bg-[#0f172a] border-r border-white/5 flex flex-col py-6 px-4 shrink-0">
          <div className="flex items-center gap-2 mb-10 px-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563eb]/20 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] text-xs font-bold">M</div>
            <span className="text-white font-bold text-lg">Mock <span className="text-[#3b82f6]">AI</span></span>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            <button onClick={() => navigate('/candidate/home')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium w-full text-left transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            <button onClick={() => navigate('/candidate/exams')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white bg-white/10 text-sm font-medium w-full text-left">
              <FileText className="w-4 h-4" /> My Exam
            </button>
          </nav>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium w-full text-left transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </aside>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-14 h-14 text-yellow-500/60 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Round Scheduled Yet</h2>
            <p className="text-slate-400 text-sm mb-6">The interviewer hasn't scheduled a round for this drive yet. Please check back later.</p>
            <button onClick={() => navigate('/candidate/exams')} className="text-[#3b82f6] hover:underline text-sm">← Back to My Exams</button>
          </div>
        </main>
      </div>
    );
  }

  // Determine difficulty label from config
  const difficultyLabel = activeRound.difficulty || 'Intermediate';
  const isCodingRound = String(activeRound.roundId) === '2';
  const isCameraRound = ['3', '4', '5'].includes(String(activeRound.roundId));
  const totalQuestions = isCodingRound 
    ? (activeRound.numQuestions || 2) 
    : (activeRound.totalQuestions || 15);
  const duration = activeRound.duration || 60;

  return (
    <div className="min-h-screen bg-[#0b1121] flex font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-[200px] min-h-screen bg-[#0f172a] border-r border-white/5 flex flex-col py-6 px-4 shrink-0">
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb]/20 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] text-xs font-bold">M</div>
          <span className="text-white font-bold text-lg">Mock <span className="text-[#3b82f6]">AI</span></span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <button onClick={() => navigate('/candidate/home')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium w-full text-left transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => navigate('/candidate/exams')} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white bg-white/10 text-sm font-medium w-full text-left">
            <FileText className="w-4 h-4" /> My Exam
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium w-full text-left transition-colors">
            <Sun className="w-4 h-4" /> Theme
          </button>
        </nav>

        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium w-full text-left transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Your <span className="text-[#3b82f6]">Scheduled Exam</span>
          </h1>
          <p className="text-[#94a3b8] text-sm">Below is your exam assigned by the interviewer. Join when ready.</p>
        </div>

        {/* Exam Card */}
        <div className="w-full max-w-lg bg-[#1a2332]/80 border border-white/10 rounded-2xl p-6 shadow-2xl">

          {/* Drive Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#2563eb]/20 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-white font-bold text-lg">{drive?.name || 'Mock Drive'}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/20 flex items-center gap-1">
                  ✓ Exam Ready
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Round {activeRound.roundId}: {activeRound.roundName}
                </span>
              </div>

              {/* Schedule time info */}
              {(activeRound.startDate || activeRound.startTime) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  {activeRound.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {activeRound.startDate}
                    </span>
                  )}
                  {activeRound.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {activeRound.startTime}
                      {activeRound.endTime && ` – ${activeRound.endTime}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { icon: Layers, label: 'DIFFICULTY', value: difficultyLabel, color: 'text-white' },
              { icon: Clock, label: 'DURATION', value: `${duration} min`, color: 'text-white' },
              { icon: HelpCircle, label: 'QUESTIONS', value: totalQuestions, color: 'text-[#22c55e]' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-[#0f172a]/80 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className={`font-bold text-base ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Topics (if available) */}
          {activeRound.topics && Object.keys(activeRound.topics).some(k => activeRound.topics[k]) && (
            <div className="mb-5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Topics Covered</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(activeRound.topics)
                  .filter(([, v]) => Boolean(v))
                  .map(([topic]) => (
                    <span key={topic} className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20">
                      {topic}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Proctoring Notice */}
          <div className={`flex items-start gap-2 rounded-xl p-3 mb-6 border ${isCameraRound ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
            <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${isCameraRound ? 'text-red-400' : 'text-emerald-400'}`} />
            <p className="text-xs text-slate-400 leading-relaxed">
              {isCameraRound ? (
                <>
                  <span className="text-red-400 font-bold">⚠ Proctoring Active: </span>
                  Your camera, microphone, and browser activity will be monitored during this round.
                </>
              ) : (
                <>
                  <span className="text-emerald-400 font-bold">✓ No Camera Required: </span>
                  This round uses standard browser activity only. Camera monitoring starts in rounds 3, 4, and 5.
                </>
              )}
            </p>
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinExam}
            className="w-full flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20"
          >
            <ArrowRight className="w-5 h-5" />
            Join Exam Now
          </button>
        </div>
      </main>
    </div>
  );
}
