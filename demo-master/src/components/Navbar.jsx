import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Settings, Sun, Moon, LogOut, LayoutGrid, ShieldAlert, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('mock_theme') || 'dark');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings states
  const [proctoringLevel, setProctoringLevel] = useState(() => localStorage.getItem('setting_proctoring_level') || 'strict');
  const [fullscreenReq, setFullscreenReq] = useState(() => localStorage.getItem('setting_fullscreen_req') !== 'false');
  const [deviceDetect, setDeviceDetect] = useState(() => localStorage.getItem('setting_device_detect') !== 'false');

  useEffect(() => {
    // Initial theme setup on mount
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('mock_theme', next);
  };

  const saveSettings = () => {
    localStorage.setItem('setting_proctoring_level', proctoringLevel);
    localStorage.setItem('setting_fullscreen_req', fullscreenReq);
    localStorage.setItem('setting_device_detect', deviceDetect);
    setShowSettingsModal(false);
  };

  const navItems = [
    { label: 'Interview Drives', icon: LayoutGrid, action: () => navigate('/') },
    { label: 'Reports', icon: BarChart2, action: () => navigate('/') },
    { label: 'Settings', icon: Settings, action: () => setShowSettingsModal(true) },
    { label: 'Theme', icon: theme === 'dark' ? Sun : Moon, action: handleThemeToggle },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-x-0 border-t-0 rounded-none shadow-md backdrop-blur-md">
      <div className="flex h-16 items-center px-6 gap-4 w-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0 mr-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-primary/20">
            AI
          </div>
          <span className="font-bold text-slate-100 hidden sm:block whitespace-nowrap">Mock AI</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2.5 mb-5 border-b border-white/5 pb-4">
              <Settings className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-white">Interviewer Control Center</h2>
            </div>

            <div className="space-y-4 mb-6">
              {/* Proctoring Level */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Proctoring Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['relaxed', 'normal', 'strict'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setProctoringLevel(lvl)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border uppercase tracking-wider transition-all ${
                        proctoringLevel === lvl 
                          ? 'bg-primary border-primary text-[#0f172a]' 
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fullscreen Requirement */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <div className="text-sm font-semibold text-white">Require Fullscreen Mode</div>
                  <div className="text-xs text-slate-500">Locks assessment if fullscreen is exited</div>
                </div>
                <button
                  onClick={() => setFullscreenReq(!fullscreenReq)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${fullscreenReq ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#0f172a] transition-transform ${fullscreenReq ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Mobile Phone Detection */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold text-white">YOLOv8 Object Detection</div>
                  <div className="text-xs text-slate-500">Detects cell phones and restricted devices</div>
                </div>
                <button
                  onClick={() => setDeviceDetect(!deviceDetect)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${deviceDetect ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-[#0f172a] transition-transform ${deviceDetect ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-5 py-2.5 text-xs font-bold bg-primary hover:bg-[#0284c7] text-[#0f172a] rounded-lg transition-all flex items-center gap-1 shadow-lg shadow-primary/20"
              >
                <Check className="w-3.5 h-3.5" /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
