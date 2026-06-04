import { Link } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Bell, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useLocation, useParams } from 'react-router-dom';

export default function Sidebar() {
  const { id, roundId } = useParams();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard overview', icon: LayoutDashboard, path: `/drive/${id}` },
    { name: 'Round 1', icon: FileText, path: `/drive/${id}/round/1` },
    { name: 'Round 2', icon: FileText, path: `/drive/${id}/round/2` },
    { name: 'Round 3', icon: FileText, path: `/drive/${id}/round/3` },
    { name: 'Round 4', icon: FileText, path: `/drive/${id}/round/4` },
    { name: 'Round 5', icon: FileText, path: `/drive/${id}/round/5` },
  ];

  return (
    <div className="w-64 glass-panel border-y-0 border-l-0 rounded-none h-full flex flex-col pt-6 pb-4 shadow-xl z-10 relative">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
          AI
        </div>
        <div>
          <h1 className="font-bold text-slate-100 tracking-tight leading-tight">Mock AI</h1>
          <p className="text-xs font-medium text-slate-400">Enterprise Edition</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Interview Flow</p>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.name.startsWith('Round') && roundId === item.name.split(' ')[1]);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              )}
              <item.icon className={clsx("w-5 h-5", isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 mt-auto space-y-1 pt-4 border-t border-white/5">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
          <Settings className="w-5 h-5 text-slate-500" />
          Settings
        </Link>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-danger hover:bg-danger/10 transition-all">
          <LogOut className="w-5 h-5 text-slate-500" />
          Log out
        </button>
      </div>
    </div>
  );
}
