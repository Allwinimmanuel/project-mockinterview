import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Target, CheckCircle2 } from 'lucide-react';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await signup(name, email, dob);
    if (result.success) {
      setSuccess(true);
      // After 2 seconds, navigate to login
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1121] p-4 font-sans">
      <div className="w-full max-w-[420px] bg-[#1a2332]/50 border border-white/5 rounded-2xl p-8 shadow-2xl">
        
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#2563eb]/20 border border-[#3b82f6]/30 flex items-center justify-center text-[#3b82f6]">
            <Target className="w-6 h-6" />
          </div>
          <div className="text-2xl font-bold text-white flex gap-1">
            Mock <span className="text-[#3b82f6]">AI</span>
          </div>
        </div>

        {success ? (
          /* ── Success State ── */
          <div className="text-center py-6 animate-in fade-in duration-500">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-[#94a3b8] text-sm mb-1">Your account has been registered successfully.</p>
            <p className="text-[#3b82f6] text-sm font-semibold">Redirecting to login...</p>
          </div>
        ) : (
          <>
            {/* Headings */}
            <div className="text-center mb-8">
              <h1 className="text-[28px] font-bold text-white mb-2">Candidate Signup</h1>
              <p className="text-[#94a3b8] text-sm">Register your profile to access the exam.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#334155] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors placeholder:text-slate-500"
                  placeholder="e.g. Alwin Immanuel"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Institution Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#334155] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors placeholder:text-slate-500"
                  placeholder="yourname@nec.edu.in"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Must end with @nec.edu.in</p>
              </div>
              
              {/* DOB Field */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">Date of Birth <span className="text-slate-400 font-normal">(used as your password)</span></label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-[#334155] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors [color-scheme:dark]"
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <button 
                type="submit" 
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 rounded-lg transition-colors mt-2"
              >
                Create Account
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-[#94a3b8]">
              Already have an account? <Link to="/login" className="text-[#3b82f6] hover:underline">Log in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
