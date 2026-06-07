import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Target } from 'lucide-react';

export default function Login() {
  const [role, setRole] = useState('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Reset fields when switching roles
  useEffect(() => {
    setError('');
    if (role === 'interviewer') {
      setEmail('admin@mock.ai');
      setPassword('admin');
    } else {
      setEmail('');
      setPassword('');
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password, role);
    if (result.success) {
      if (role === 'candidate') {
        navigate('/candidate/home');
      } else {
        navigate('/');
      }
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

        {/* Headings */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-white mb-2">Secure Login</h1>
          <p className="text-[#94a3b8] text-sm">Access your autonomous AI proctoring dashboard.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0f172a] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setRole('candidate')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'candidate' ? 'bg-[#3b82f6] text-white' : 'text-[#64748b] hover:text-white'
            }`}
          >
            Candidate
          </button>
          <button
            type="button"
            onClick={() => setRole('interviewer')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'interviewer' ? 'bg-[#3b82f6] text-white' : 'text-[#64748b] hover:text-white'
            }`}
          >
            Interviewer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-bold text-white mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#334155] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors placeholder:text-slate-500"
              placeholder={role === 'candidate' ? 'allvinimmanuvel@nec.edu.in' : 'admin@mock.ai'}
              required
              autoComplete="username"
            />
          </div>
          
          {/* Password Field */}
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              {role === 'candidate' ? 'Date of Birth (Password)' : 'Password'}
            </label>
            <input
              type={role === 'candidate' ? 'date' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#334155] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#3b82f6] transition-colors [color-scheme:dark]"
              placeholder={role === 'interviewer' ? 'Password' : ''}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-danger text-sm text-center font-medium bg-danger/10 border border-danger/20 p-2 rounded-lg">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold py-3.5 rounded-lg transition-colors mt-2"
          >
            Login to Dashboard
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#94a3b8]">
          Don't have an account? <Link to="/signup" className="text-[#3b82f6] hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
