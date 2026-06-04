import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, FileText, Sun, LogOut, ArrowRight, Shield, Activity, CheckCircle2 } from 'lucide-react';

export default function CandidateHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleJoinInterview = () => {
    navigate('/candidate/exams');
  };

  return (
    <div className="min-h-screen bg-[#0b1121] flex font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-[200px] min-h-screen bg-[#0f172a] border-r border-white/5 flex flex-col py-6 px-4 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb]/20 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6] text-xs font-bold">
            M
          </div>
          <span className="text-white font-bold text-lg">
            Mock <span className="text-[#3b82f6]">AI</span>
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 flex-1">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white bg-white/10 text-sm font-medium w-full text-left">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={handleJoinInterview}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium w-full text-left transition-colors"
          >
            <FileText className="w-4 h-4" />
            My Exam
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium w-full text-left transition-colors">
            <Sun className="w-4 h-4" />
            Theme
          </button>
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium w-full text-left transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* Hero Welcome Card */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-[#1e3a5f] via-[#1a2d4a] to-[#0f1e35] border border-white/10 p-10 shadow-2xl">
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#6366f1]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <h1 className="text-4xl font-extrabold text-white mb-3">
              Welcome, <span className="text-[#3b82f6]">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-[#94a3b8] text-base leading-relaxed mb-8">
              Your AI-powered interview environment is ready. Follow the proctoring guidelines and begin your scheduled session when prepared.
            </p>
            <button
              onClick={handleJoinInterview}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
            >
              <ArrowRight className="w-5 h-5" />
              Join Scheduled Interview
            </button>
          </div>
        </div>

        {/* Bottom Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Proctoring Guidelines */}
          <div className="bg-[#1a2332]/60 border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#2563eb]/15 border border-[#3b82f6]/20 flex items-center justify-center text-[#3b82f6]">
                <Shield className="w-4 h-4" />
              </div>
              <h2 className="text-white font-bold text-base">Proctoring Guidelines</h2>
            </div>
            <ul className="space-y-3">
              {[
                'Ensure your camera and microphone are functional.',
                'Stay within the camera frame at all times.',
                'Avoid switching tabs or minimizing the browser window.',
                'Maintain a quiet environment for accurate voice analysis.',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                  <span className="text-[#3b82f6] mt-0.5 shrink-0">›</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* System Status */}
          <div className="bg-[#1a2332]/60 border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e]">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-white font-bold text-base">System Status</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'AI Proctoring Engine', status: 'ACTIVE', color: 'bg-[#22c55e]' },
                { label: 'Face Detection Service', status: 'READY', color: 'bg-[#3b82f6]' },
                { label: 'Voice Recognition', status: 'READY', color: 'bg-[#3b82f6]' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-[#94a3b8]">{item.label}</span>
                  <span className={`${item.color} text-white text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
