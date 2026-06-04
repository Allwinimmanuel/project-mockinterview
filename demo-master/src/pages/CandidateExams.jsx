import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDrives } from '../contexts/DriveContext';
import { LayoutDashboard, FileText, Sun, LogOut, Calendar, ArrowRight, BookOpen, Clock, AlertCircle, XCircle } from 'lucide-react';

export default function CandidateExams() {
  const { user, logout } = useAuth();
  const { drives, roundSchedules, isCandidateEligible, hasCandidateSubmittedRound, candidates } = useDrives();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if candidate has been rejected in any round or globally
  const isCandidateRejected = (driveId) => {
    const candidate = candidates.find(c => c.email === user?.email && c.driveId === driveId);
    if (!candidate) return false;
    if (candidate.status === 'Rejected') return true;
    if (candidate.roundStatuses) {
      return Object.values(candidate.roundStatuses).includes('Rejected');
    }
    return false;
  };

  // For each drive, find the earliest scheduled round this candidate is eligible for and hasn't submitted yet
  const getEligibleRound = (driveId) => {
    const driveSchedules = roundSchedules[driveId];
    if (!driveSchedules) return null;
    const ids = Object.keys(driveSchedules).sort((a, b) => Number(a) - Number(b));
    for (const id of ids) {
      if (isCandidateEligible(user?.email, driveId, id)) {
        if (!hasCandidateSubmittedRound(user?.email, driveId, id)) {
          return driveSchedules[id];
        }
      } else {
        // If not eligible for this round, they cannot skip to future rounds.
        return null;
      }
    }
    return null;
  };

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
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white bg-white/10 text-sm font-medium w-full text-left">
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
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Your <span className="text-[#3b82f6]">Scheduled Exam</span>
          </h1>
          <p className="text-[#94a3b8] text-sm">Below is your exam assigned by the interviewer. Join when ready.</p>
        </div>

        {(() => {
          const scheduledDrives = drives.filter(drive => {
            const driveSchedules = roundSchedules[drive.id];
            return driveSchedules && Object.keys(driveSchedules).length > 0;
          });

          if (scheduledDrives.length === 0) {
            return (
              <div className="text-center py-20 text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No exams scheduled yet.</p>
                <p className="text-sm mt-1 opacity-60">The interviewer hasn't scheduled any rounds yet. Please check back later.</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {scheduledDrives.map((drive) => {
                const activeRound = getEligibleRound(drive.id);
                const isRejected = isCandidateRejected(drive.id);

                let isFutureRound = false;
                let isExpiredRound = false;
                if (activeRound?.startDate && activeRound?.startTime) {
                  const now = new Date();
                  const currentTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();

                  // Check if not started yet
                  if (activeRound.startDate > currentTodayStr) {
                    isFutureRound = true;
                  } else if (activeRound.startDate === currentTodayStr) {
                    const [sh, sm] = activeRound.startTime.split(':').map(Number);
                    if ((sh * 60 + sm) > currentMinutes) {
                      isFutureRound = true;
                    }
                  }

                  // Check if end time has passed (expired)
                  if (!isFutureRound && activeRound.endDate && activeRound.endTime) {
                    if (activeRound.endDate < currentTodayStr) {
                      isExpiredRound = true;
                    } else if (activeRound.endDate === currentTodayStr) {
                      const [eh, em] = activeRound.endTime.split(':').map(Number);
                      if ((eh * 60 + em) <= currentMinutes) {
                        isExpiredRound = true;
                      }
                    }
                  }
                }

                return (
                  <div key={drive.id} className="bg-[#1a2332]/70 border border-white/5 rounded-2xl p-5 hover:border-[#3b82f6]/30 hover:bg-[#1e2d45]/70 transition-all group">

                    {/* Drive Header */}
                    <div className="mb-4">
                      <h2 className="text-white font-bold text-base group-hover:text-[#3b82f6] transition-colors">{drive.name}</h2>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isRejected
                            ? 'bg-red-500/15 text-red-400 border-red-500/25'
                            : activeRound
                              ? (isFutureRound ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' : isExpiredRound ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-green-500/15 text-green-400 border-green-500/25')
                              : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25'
                        }`}>
                          {isRejected ? '✖ Rejected' : activeRound ? (isFutureRound ? '⏳ Upcoming' : isExpiredRound ? '🔒 Expired' : '✓ Exam Ready') : 'Awaiting Schedule'}
                        </span>
                        <span className="text-[10px] text-slate-500">{drive.company}</span>
                      </div>
                    </div>

                    {/* Active Round Info */}
                    <div className="border-t border-white/5 pt-3 mb-4">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Round</p>

                      {isRejected ? (
                        <div className="flex items-center gap-2 text-xs text-red-400 py-2">
                          <XCircle className="w-4 h-4 text-red-500/60" />
                          You have not been shortlisted for further rounds.
                        </div>
                      ) : activeRound ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                            <BookOpen className="w-3.5 h-3.5 text-[#3b82f6]" />
                            Round {activeRound.roundId}: {activeRound.roundName}
                          </div>

                          {/* Schedule Details */}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {activeRound.startDate && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {activeRound.startDate}
                              </div>
                            )}
                            {activeRound.startTime && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {activeRound.startTime}
                              </div>
                            )}
                            {activeRound.duration && (
                              <div className="text-xs text-slate-400 col-span-2">
                                Duration: <span className="text-white font-semibold">{activeRound.duration} min</span>
                              </div>
                            )}
                          </div>

                          {/* Completion Progress */}
                          <div className="mt-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Completion Status</p>
                            <div className="w-full h-1.5 bg-white/10 rounded-full">
                              <div className="h-1.5 bg-[#3b82f6] rounded-full" style={{ width: '0%' }} />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">0%</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500/60" />
                          No round scheduled yet by the interviewer.
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {drive.date}
                      </div>
                      <button
                        onClick={() => navigate(`/candidate/exam/${drive.id}`)}
                        disabled={!activeRound || isFutureRound || isExpiredRound}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                          activeRound && !isFutureRound && !isExpiredRound
                            ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
                            : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        {activeRound
                          ? isFutureRound
                            ? <>Starts at {activeRound.startTime}</>
                            : isExpiredRound
                              ? <>Access Expired</>
                              : <>Enter Drive <ArrowRight className="w-3.5 h-3.5" /></>
                          : 'Not Scheduled'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
