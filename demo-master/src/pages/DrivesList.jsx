import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Calendar, Users, ChevronRight, X, Search, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { useDrives } from '../contexts/DriveContext';
import { validateDateTime } from '../utils/validation';

export default function DrivesList() {
  const { drives, addDrive, deleteDrive } = useDrives();
  
  const [showModal, setShowModal] = useState(false);
  const [driveToDelete, setDriveToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newDrive, setNewDrive] = useState({ name: '', company: '', date: '' });

  const isDuplicateName = newDrive.name ? drives.some(d => d.name.toLowerCase() === newDrive.name.toLowerCase()) : false;
  const currentError = newDrive.date ? validateDateTime(newDrive.date) : (isDuplicateName ? 'A drive with this name already exists' : null);

  const handleCreate = (e) => {
    e.preventDefault();
    if (currentError) return;
    addDrive(newDrive);
    setShowModal(false);
    setNewDrive({ name: '', company: '', date: '' });
  };

  const filteredDrives = drives.filter(drive =>
    drive.name.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    drive.company?.toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Level 2: Controls Layout ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        
        {/* Left: Heading */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Interview Drives</h1>
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 max-w-md w-full mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Interview Drives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
          />
        </div>

        {/* Right: Create Drive */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap text-sm w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Drive</span>
          </button>
        </div>
      </div>

      {/* ── Level 3: Drive Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrives.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No drives found{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
          </div>
        ) : filteredDrives.map((drive) => (
          <Link
            key={drive.id}
            to={`/drive/${drive.id}`}
            className="glass-panel p-6 rounded-2xl group hover:-translate-y-1 transition-all duration-300 block"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  drive.status === 'Active' ? 'bg-success/10 text-success border border-success/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                  {drive.status}
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDriveToDelete(drive); }}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors"
                  title="Delete Drive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{drive.name}</h3>
            <p className="text-slate-400 text-sm font-medium mb-6">{drive.company}</p>

            <div className="flex items-center gap-6 text-sm text-slate-300 mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>{Array.isArray(drive.candidates) ? drive.candidates.length : drive.candidates} Cands</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>{drive.date}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-sm font-medium text-primary group-hover:text-white transition-colors">
              Manage Drive
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Create Drive Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Create New Drive</h2>

            {currentError && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{currentError}</p>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Drive Title</label>
                <input required type="text" value={newDrive.name} onChange={e => setNewDrive({...newDrive, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. Zoho Hiring Drive" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                <input required type="text" value={newDrive.company} onChange={e => setNewDrive({...newDrive, company: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. Zoho Corp" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input required type="date" value={newDrive.date} onChange={e => setNewDrive({...newDrive, date: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none [color-scheme:dark]" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="aiMode" className="w-4 h-4 rounded border-white/10 bg-black/20 text-primary focus:ring-primary focus:ring-offset-background" defaultChecked />
                <label htmlFor="aiMode" className="text-sm font-medium text-slate-300">Enable AI Proctoring</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={!!currentError} className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {driveToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Delete Drive?</h2>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete <span className="text-white font-semibold">{driveToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDriveToDelete(null)} 
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  deleteDrive(driveToDelete.id);
                  setDriveToDelete(null);
                }} 
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
