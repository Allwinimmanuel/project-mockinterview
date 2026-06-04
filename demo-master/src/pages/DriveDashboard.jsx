import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Activity, Users, CheckCircle, Clock } from 'lucide-react';
import { useDrives } from '../contexts/DriveContext';

export default function DriveDashboard() {
  const { id } = useParams();
  const { drives, candidates, submissions, roundSchedules } = useDrives();

  const drive = drives.find(d => d.id === id);
  const driveCandidates = candidates.filter(c => c.driveId === id);
  const driveSubmissions = submissions.filter(s => s.driveId === id);

  const totalApplicants = driveCandidates.length;
  const shortlistedCount = driveCandidates.filter(c => c.status === 'Shortlisted').length;
  const inProgressCount = driveCandidates.filter(c => c.status === 'Pending').length;

  const STATS = [
    { label: 'Total Applicants', value: totalApplicants.toString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Shortlisted', value: shortlistedCount.toString(), icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'In Progress', value: inProgressCount.toString(), icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Time to Hire', value: '14 Days', icon: Clock, color: 'text-secondary', bg: 'bg-secondary/10' },
  ];

  const ROUNDS = [
    { id: '1', name: 'Aptitude Test' },
    { id: '2', name: 'Coding Round' },
    { id: '3', name: 'Technical Interview' },
    { id: '4', name: 'Managerial Round' },
    { id: '5', name: 'HR Interview' },
  ].map(r => {
    // Calculate passed/failed dynamically
    const roundSubs = driveSubmissions.filter(s => s.roundId === r.id);
    const passed = roundSubs.filter(s => s.score >= 50).length;
    const failed = roundSubs.filter(s => s.score < 50).length;
    
    // Determine status from schedule
    const roundSchedule = roundSchedules?.[id]?.[r.id];
    let status = 'Upcoming';
    if (roundSchedule?.startDate && roundSchedule?.startTime && roundSchedule?.endDate && roundSchedule?.endTime) {
      const now = new Date();
      const startDt = new Date(`${roundSchedule.startDate} ${roundSchedule.startTime}`);
      const endDt = new Date(`${roundSchedule.endDate} ${roundSchedule.endTime}`);
      if (now >= startDt && now <= endDt) {
        status = 'Active';
      } else if (now > endDt) {
        status = 'Completed';
      }
    }
    
    return { ...r, passed, failed, status };
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">Drive Overview</h1>
        <p className="text-slate-400 mt-1">High-level statistics and round progression for {drive?.name || id}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {STATS.map((stat) => (
          <div key={stat.label} className="glass-panel p-6 rounded-2xl flex items-center gap-5 hover:-translate-y-1 transition-transform">
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        Round Progression
      </h2>

      <div className="space-y-4">
        {ROUNDS.map((round) => (
          <Link 
            key={round.id} 
            to={`/drive/${id}/round/${round.id}`}
            className="block glass-panel p-5 rounded-2xl group hover:border-primary/30 transition-all hover:bg-white/5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-black/30 border border-white/10 flex items-center justify-center font-black text-slate-300 group-hover:text-primary transition-colors">
                  {round.id}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors">{round.name}</h3>
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      round.status === 'Completed' ? 'bg-success' : round.status === 'Active' ? 'bg-warning animate-pulse' : 'bg-slate-500'
                    }`} />
                    {round.status}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-center hidden sm:block">
                  <div className="text-xl font-bold text-success">{round.passed}</div>
                  <div className="text-xs text-slate-500 uppercase">Passed</div>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="text-xl font-bold text-danger">{round.failed}</div>
                  <div className="text-xs text-slate-500 uppercase">Failed</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors text-slate-400 group-hover:text-primary">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
