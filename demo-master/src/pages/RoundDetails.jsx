import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Calendar, Users, CheckCircle, LayoutDashboard, Search, FileText, Download, Save, CheckCircle2, Bell, Code2, X, ChevronDown, ChevronUp, Cpu, Clock3, ShieldCheck, AlertTriangle, Award, Check, ThumbsUp, ThumbsDown, AlertCircle, Info, Copy, ClipboardCheck, Compass } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useDrives } from '../contexts/DriveContext';
import { validateDateTime } from '../utils/validation';
import { generateQuestions, generateTechnicalMCQ } from '../data/questionBank';
import { fetchQuestionBank } from '../services/api';
import { Sparkles, Lock, Video, RefreshCw } from 'lucide-react';
import { CodeModal, VerdictBadge } from '../components/CodeModal';

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
const ROUND_META = {
  '1': { label: 'Aptitude', topics: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Puzzle Solving'], type: 'aptitude' },
  '2': { label: 'Coding', topics: ['Arrays', 'Trees', 'Graphs', 'Dynamic Programming', 'SQL'], type: 'coding' },
  '3': { label: 'Technical', topics: ['Software Development', 'Database Concepts', 'SQL', 'Cloud Computing', 'Operating Systems', 'Computer Networks', 'Backend Development', 'Frontend Development', 'API Concepts', 'Object Oriented Programming', 'Data Structures', 'Algorithms', 'Debugging Skills', 'Problem Solving', 'System Design Basics', 'Technical Troubleshooting', 'Database Optimization', 'Analytical Thinking', 'Domain Specific Knowledge'], type: 'technical_ai' },
  '4': { label: 'Communication', topics: ['Self Introduction', 'Professional Communication', 'Grammar Skills', 'Presentation Skills', 'Story Telling', 'Speaking Clarity', 'Listening Skills', 'Debate Skills', 'Confidence Evaluation', 'Professional Etiquette', 'Client Communication', 'Conflict Resolution', 'Leadership Communication', 'Public Speaking'], type: 'technical_ai' },
  '5': { label: 'HR', topics: [], type: 'interview' },
};

const ScheduleTab = ({ roundId, driveId }) => {
  const storageKey = `schedule_${driveId}_round_${roundId}`;
  const meta = ROUND_META[roundId] || ROUND_META['1'];
  const { saveRoundSchedule, candidates, drives, submissions, roundSchedules } = useDrives();
  const activeRound = roundSchedules?.[driveId]?.[roundId];
  const allocatedCount = candidates.filter(c => c.driveId === driveId).length;

  const shortlistedCandidatesCount = useMemo(() => {
    if (roundId !== '5') return 0;
    const r4Submissions = submissions.filter(s => s.driveId === driveId && s.roundId === '4');
    if (r4Submissions.length === 0) return allocatedCount; // Fallback if Round 4 not yet completed
    return r4Submissions.filter(s => s.decision !== 'Rejected').length;
  }, [submissions, driveId, roundId, allocatedCount]);

  // Check if round is locked due to existing submissions or schedule start time
  const now = new Date();
  let timeLock = false;
  if (activeRound?.startDate && activeRound?.startTime) {
    const startDt = new Date(`${activeRound.startDate} ${activeRound.startTime}`);
    if (now >= startDt) timeLock = true;
  }
  const isLocked = submissions.some(s => s.driveId === driveId && String(s.roundId) === String(roundId)) || timeLock;

  const [saved, setSaved] = useState(false);
  const [questionBankDB, setQuestionBankDB] = useState({});

  useEffect(() => {
    fetchQuestionBank().then(bank => setQuestionBankDB(bank));
  }, []);

  const [config, setConfig] = useState(() => {
    const existing = localStorage.getItem(storageKey);
    const defaults = {
      startDate: '', endDate: '', startTime: '', endTime: '', duration: 60,
      topics: meta.topics.reduce((acc, t) => ({ ...acc, [t]: true }), {}),
      positiveMarks: 4, negativeMarks: -1, totalQuestions: 15,
      difficulty: 'Medium', numQuestions: 10,
      cameraRequired: meta.type === 'technical_ai',
      hrMode: 'Human HR',
      cameraMandatory: true,
      micMandatory: true,
      recordingEnabled: true,
      questionSource: 'Manual Questions',
      hrQuestionCount: 5,
      hrDifficulty: 'Medium',
      resumeRequired: true,
      projectDocRequired: false,
      profileVerificationRequired: true,
      interviewer: '',
      slotsCount: 3,
      questionAssignmentMode: 'ai',
      manualQuestions: [],
    };
    if (existing) {
      const saved = JSON.parse(existing);
      // Validate saved topics against expected round topics to prevent cross-round contamination
      const savedTopicKeys = Object.keys(saved.topics || {});
      const validTopicKeys = meta.topics;
      const isTopicsValid = savedTopicKeys.length > 0 && savedTopicKeys.every(k => validTopicKeys.includes(k));
      if (!isTopicsValid) {
        // Reset topics to defaults but keep other settings (dates, duration, etc.)
        return { ...saved, topics: defaults.topics, topicDistribution: undefined, codingQuestions: undefined };
      }
      return saved;
    }
    return defaults;
  });

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));
  
  const [previewQuestions, setPreviewQuestions] = useState(config.generatedQuestions || null);
  const [codingQuestions, setCodingQuestions] = useState(config.codingQuestions || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedManualQ, setExpandedManualQ] = useState(null);

  useEffect(() => {
    // Reset config when roundId or driveId changes to load the correct schedule
    const existing = localStorage.getItem(storageKey);
    const defaults = {
      startDate: '', endDate: '', startTime: '', endTime: '', duration: 60,
      topics: meta.topics.reduce((acc, t) => ({ ...acc, [t]: true }), {}),
      positiveMarks: 4, negativeMarks: -1, totalQuestions: 15,
      difficulty: 'Medium', numQuestions: 10,
      cameraRequired: meta.type === 'technical_ai',
      hrMode: 'Human HR',
      cameraMandatory: true,
      micMandatory: true,
      recordingEnabled: true,
      questionSource: 'Manual Questions',
      hrQuestionCount: 5,
      hrDifficulty: 'Medium',
      resumeRequired: true,
      projectDocRequired: false,
      profileVerificationRequired: true,
      interviewer: '',
      slotsCount: 3,
      questionAssignmentMode: 'ai',
      manualQuestions: [],
    };
    
    if (existing) {
      const saved = JSON.parse(existing);
      const savedTopicKeys = Object.keys(saved.topics || {});
      const validTopicKeys = meta.topics;
      const isTopicsValid = savedTopicKeys.length > 0 && savedTopicKeys.every(k => validTopicKeys.includes(k));
      if (!isTopicsValid) {
        setConfig({ ...saved, topics: defaults.topics, topicDistribution: undefined, codingQuestions: undefined });
      } else {
        setConfig(saved);
      }
      setPreviewQuestions(saved.generatedQuestions || null);
      setCodingQuestions(saved.codingQuestions || null);
    } else {
      setConfig(defaults);
      setPreviewQuestions(null);
      setCodingQuestions(null);
    }
  }, [roundId, driveId, storageKey]);

  // ── Manual Question Helpers ──────────────────────────────────────────────────
  const getBlankManualQuestion = () => {
    if (meta.type === 'aptitude') {
      return { id: Date.now(), type: 'mcq', question: '', options: ['', '', '', ''], correctAnswer: 0, difficulty: 'Medium', marks: config.positiveMarks || 4, negativeMarks: config.negativeMarks || -1 };
    }
    if (meta.type === 'coding') {
      return { id: Date.now(), type: 'coding', title: '', statement: '', inputFormat: '', outputFormat: '', constraints: '', sampleInput: '', sampleOutput: '', hiddenTestCases: '', visibleTestCases: '', difficulty: 'Medium' };
    }
    if (meta.type === 'technical_ai' && roundId === '3') {
      return { id: Date.now(), type: 'mcq', question: '', options: ['', '', '', ''], correctAnswer: 0, difficulty: 'Medium', isVoice: false };
    }
    if (meta.type === 'technical_ai' && roundId === '4') {
      return { id: Date.now(), type: 'voice', category: 'Communication', question: '' };
    }
    return { id: Date.now(), question: '' };
  };

  const addManualQuestion = () => {
    const newQ = getBlankManualQuestion();
    const updated = [...(config.manualQuestions || []), newQ];
    set('manualQuestions', updated);
    setExpandedManualQ(newQ.id);
  };

  const updateManualQuestion = (id, field, value) => {
    const updated = (config.manualQuestions || []).map(q => q.id === id ? { ...q, [field]: value } : q);
    set('manualQuestions', updated);
  };

  const updateManualOption = (id, optIdx, value) => {
    const updated = (config.manualQuestions || []).map(q => {
      if (q.id !== id) return q;
      const options = [...(q.options || [])];
      options[optIdx] = value;
      return { ...q, options };
    });
    set('manualQuestions', updated);
  };

  const deleteManualQuestion = (id) => {
    const updated = (config.manualQuestions || []).filter(q => q.id !== id);
    set('manualQuestions', updated);
    if (expandedManualQ === id) setExpandedManualQ(null);
  };

  const moveManualQuestion = (idx, dir) => {
    const arr = [...(config.manualQuestions || [])];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    set('manualQuestions', arr);
  };

  useEffect(() => {
    if (meta.type !== 'technical_ai' || isLocked) return;
    const questions = generateTechnicalMCQ(config.topics, config.numQuestions);
    setPreviewQuestions(questions);
  }, [config.topics, config.numQuestions, meta.type, isLocked]);

  useEffect(() => {
    // Sync local state if config has codingQuestions
    if (config.codingQuestions) {
      setCodingQuestions(config.codingQuestions);
    }
  }, [config.codingQuestions]);

  const handleGenerateQuestions = () => {
    const questions = [];
    Object.entries(config.topicDistribution || {}).forEach(([topic, diffs]) => {
      const topicBank = questionBankDB[topic] || [];
      const shuffled = [...topicBank].sort(() => Math.random() - 0.5);
      
      diffs.forEach((diff, idx) => {
        const q = shuffled.find(sq => sq.difficulty === diff && !questions.find(eq => eq.id === sq.id));
        if (q) {
          questions.push({ ...q, assignedDifficulty: diff, assignedTopic: topic, distributionIndex: idx });
        } else {
          const fallback = shuffled.find(sq => sq.difficulty === diff) || shuffled.find(sq => !questions.find(eq => eq.id === sq.id)) || shuffled[0];
          if (fallback) {
            questions.push({ ...fallback, assignedDifficulty: diff, assignedTopic: topic, distributionIndex: idx });
          }
        }
      });
    });
    setCodingQuestions(questions);
    setConfig(prev => ({ ...prev, codingQuestions: questions }));
  };

  const handleRegenerateQuestion = (index) => {
     const currentQs = [...(codingQuestions || [])];
     const qToReplace = currentQs[index];
     const topicBank = questionBankDB[qToReplace.assignedTopic] || [];
     const shuffled = [...topicBank].sort(() => Math.random() - 0.5);
     const diff = qToReplace.assignedDifficulty;
     
     const newQ = shuffled.find(sq => sq.difficulty === diff && !currentQs.find(eq => eq.id === sq.id)) || 
                  shuffled.find(sq => sq.difficulty === diff && sq.id !== qToReplace.id) || 
                  shuffled.find(sq => sq.id !== qToReplace.id) || 
                  shuffled[0];
                  
     if (newQ) {
       currentQs[index] = { ...newQ, assignedDifficulty: diff, assignedTopic: qToReplace.assignedTopic, distributionIndex: qToReplace.distributionIndex };
       setCodingQuestions(currentQs);
       setConfig(prev => ({ ...prev, codingQuestions: currentQs }));
     }
  };

  const handleTopicToggle = (topic) => {
     const isSelected = !config.topics[topic];
     const newTopics = { ...config.topics, [topic]: isSelected };
     
     if (meta.type === 'coding') {
       const selectedTopics = Object.keys(newTopics).filter(t => newTopics[t]);
       const distribution = {};
       selectedTopics.forEach((t, idx) => {
          const count = Math.floor(config.numQuestions / Math.max(1, selectedTopics.length)) + (idx < config.numQuestions % Math.max(1, selectedTopics.length) ? 1 : 0);
          const baseDiff = config.difficulty && config.difficulty !== 'Mixed' ? config.difficulty : 'Medium';
          distribution[t] = Array(count).fill(baseDiff);
       });
       setConfig(prev => ({ ...prev, topics: newTopics, topicDistribution: distribution, codingQuestions: null }));
       setCodingQuestions(null);
     } else {
       setConfig(prev => ({ ...prev, topics: newTopics }));
     }
  };

  const handleNumQuestionsChange = (e) => {
     const newNum = Math.max(1, parseInt(e.target.value) || 1);
     if (meta.type === 'coding') {
       const selectedTopics = Object.keys(config.topics).filter(t => config.topics[t]);
       const distribution = {};
       selectedTopics.forEach((t, idx) => {
          const count = Math.floor(newNum / Math.max(1, selectedTopics.length)) + (idx < newNum % Math.max(1, selectedTopics.length) ? 1 : 0);
          const baseDiff = config.difficulty && config.difficulty !== 'Mixed' ? config.difficulty : 'Medium';
          distribution[t] = Array(count).fill(baseDiff);
       });
       setConfig(prev => ({ ...prev, numQuestions: newNum, topicDistribution: distribution, codingQuestions: null }));
       setCodingQuestions(null);
     } else {
       setConfig(prev => ({ ...prev, numQuestions: newNum }));
     }
  };

  const handleDifficultyChange = (e) => {
     const newDiff = e.target.value;
     if (meta.type === 'coding') {
       const dist = { ...(config.topicDistribution || {}) };
       if (newDiff !== 'Mixed') {
          Object.keys(dist).forEach(t => {
             dist[t] = dist[t].map(() => newDiff);
          });
       }
       setConfig(prev => ({ ...prev, difficulty: newDiff, topicDistribution: dist, codingQuestions: null }));
       setCodingQuestions(null);
     } else {
       setConfig(prev => ({ ...prev, difficulty: newDiff }));
     }
  };

  const updateQuestionDifficulty = (topic, index, newDiff) => {
    const dist = { ...(config.topicDistribution || {}) };
    dist[topic] = [...(dist[topic] || [])];
    dist[topic][index] = newDiff;
    setConfig(prev => ({ ...prev, topicDistribution: dist, difficulty: 'Mixed', codingQuestions: null }));
    setCodingQuestions(null);
  };

  const addTopicQuestion = (topic) => {
    const dist = { ...(config.topicDistribution || {}) };
    const baseDiff = config.difficulty !== 'Mixed' ? config.difficulty : 'Medium';
    dist[topic] = [...(dist[topic] || []), baseDiff];
    setConfig(prev => ({ ...prev, topicDistribution: dist, numQuestions: prev.numQuestions + 1, codingQuestions: null }));
    setCodingQuestions(null);
  };

  const removeTopicQuestion = (topic) => {
    const dist = { ...(config.topicDistribution || {}) };
    if (dist[topic] && dist[topic].length > 0) {
      dist[topic] = dist[topic].slice(0, -1);
      setConfig(prev => ({ ...prev, topicDistribution: dist, numQuestions: Math.max(1, prev.numQuestions - 1), codingQuestions: null }));
      setCodingQuestions(null);
    }
  };

  useEffect(() => {
     if (meta.type === 'coding' && !config.topicDistribution) {
       const selectedTopics = Object.keys(config.topics).filter(t => config.topics[t]);
       const distribution = {};
       selectedTopics.forEach((t, idx) => {
          const count = Math.floor(config.numQuestions / Math.max(1, selectedTopics.length)) + (idx < config.numQuestions % Math.max(1, selectedTopics.length) ? 1 : 0);
          const baseDiff = config.difficulty && config.difficulty !== 'Mixed' ? config.difficulty : 'Medium';
          distribution[t] = Array(count).fill(baseDiff);
       });
       setConfig(prev => ({ ...prev, topicDistribution: distribution }));
     }
  }, [meta.type, config.topicDistribution, config.topics, config.numQuestions, config.difficulty]);

  const currentError = validateDateTime(config.startDate, config.startTime) || validateDateTime(config.endDate, config.endTime);

  // Auto-calculate duration
  useEffect(() => {
    if (config.startDate && config.endDate && config.startTime && config.endTime && !isLocked) {
      const start = new Date(`${config.startDate} ${config.startTime}`);
      const end = new Date(`${config.endDate} ${config.endTime}`);
      if (end > start) {
        const diffMins = Math.round((end - start) / 60000);
        if (config.duration !== diffMins) {
          setConfig(prev => ({ ...prev, duration: diffMins }));
        }
      }
    }
  }, [config.startDate, config.endDate, config.startTime, config.endTime, isLocked]);

  const handleSave = (e) => {
    e.preventDefault();
    if (currentError) return;

    if (!config.startDate || !config.endDate || !config.startTime || !config.endTime || !config.duration) {
      alert("Please fill out all Date & Time Configuration fields before approving and saving.");
      return;
    }

    const start = new Date(`${config.startDate} ${config.startTime}`);
    const end = new Date(`${config.endDate} ${config.endTime}`);
    
    if (start < new Date()) {
       alert("Start date and time cannot be in the past.");
       return;
    }

    if (end <= start) {
       alert("End time must be after start time.");
       return;
    }

    if (meta.type === 'interview') {
      const totalAvailableMinutes = (end - start) / 60000;
      const totalMinutesRequired = shortlistedCandidatesCount * (config.duration || 60);
      const totalMinutesCapacity = totalAvailableMinutes * (config.slotsCount || 1);

      if (totalMinutesCapacity < totalMinutesRequired) {
        alert(`Slot Allocation Error:\nYou have ${shortlistedCandidatesCount} candidates. You need ${totalMinutesRequired} minutes total, but only have capacity for ${totalMinutesCapacity} minutes across ${config.slotsCount} slots.\n\nPlease increase the number of slots, or extend the Date & Time window.`);
        return;
      }
    }

    // Save to localStorage for local form persistence
    const finalConfig = { ...config };
    if (previewQuestions) finalConfig.generatedQuestions = previewQuestions;
    localStorage.setItem(storageKey, JSON.stringify(finalConfig));
    // Publish to DriveContext so candidates can see this allocation
    saveRoundSchedule(driveId, roundId, finalConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Schedule Round {roundId}</h2>
            {isLocked && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold rounded-full">
                <Lock className="w-3.5 h-3.5" /> LOCKED
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {meta.label} — configure and allocate this round to candidates.
          </p>
          {isLocked && <p className="text-red-400 text-xs mt-1">Candidates have already started this round. Configuration cannot be modified.</p>}
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 text-success text-sm font-semibold px-4 py-2 rounded-xl">
            <Bell className="w-4 h-4" />
            Allocated to {allocatedCount} candidate{allocatedCount !== 1 ? 's' : ''}!
          </div>
        )}
      </div>

      <form onSubmit={handleSave}>
        {currentError && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <span className="w-4 h-4 shrink-0 flex items-center justify-center font-bold">!</span>
            <p>{currentError}</p>
          </div>
        )}



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Date & Time */}
          <div className="bg-black/20 p-6 rounded-xl border border-white/5 space-y-4">
            <h3 className="font-semibold text-primary flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" /> Date &amp; Time Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" required value={config.startDate} onChange={e => set('startDate', e.target.value)} disabled={isLocked}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50 [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                <input type="date" required value={config.endDate} onChange={e => set('endDate', e.target.value)} disabled={isLocked}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50 [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</label>
                <input type="time" required value={config.startTime} onChange={e => set('startTime', e.target.value)} disabled={isLocked}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50 [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">End Time</label>
                <input type="time" required value={config.endTime} onChange={e => set('endTime', e.target.value)} disabled={isLocked}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50 [color-scheme:dark]" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Duration (minutes)</label>
                <div className="relative">
                  <input type="number" required value={config.duration} min={5} onChange={e => set('duration', e.target.value)} disabled={isLocked}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50" />
                  {config.startTime && config.endTime && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Auto-calculated</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Round-specific config */}
          <div className="bg-black/20 p-6 rounded-xl border border-white/5 space-y-4">
            <h3 className="font-semibold text-primary flex items-center gap-2 mb-4">
              <LayoutDashboard className="w-4 h-4" /> {meta.label} Configuration
            </h3>

            {/* ── Question Assignment Mode Toggle (Rounds 1-4 only) ── */}
            {meta.type !== 'interview' && (
              <div className="mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Assignment Mode</label>
                <div className="flex gap-3">
                  <label className={clsx(
                    'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
                    config.questionAssignmentMode === 'ai'
                      ? 'bg-primary/10 border-primary/50 text-primary'
                      : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                  )}>
                    <input type="radio" name={`qmode_${roundId}`} value="ai" checked={config.questionAssignmentMode === 'ai'} onChange={() => set('questionAssignmentMode', 'ai')} disabled={isLocked} className="sr-only" />
                    <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', config.questionAssignmentMode === 'ai' ? 'border-primary' : 'border-slate-600')}>
                      {config.questionAssignmentMode === 'ai' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">AI Generated Questions</div>
                      <div className="text-xs opacity-60 mt-0.5">Automatic, topic-based generation</div>
                    </div>
                    <Sparkles className="w-4 h-4 ml-auto opacity-60" />
                  </label>
                  <label className={clsx(
                    'flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all',
                    config.questionAssignmentMode === 'manual'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                      : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                  )}>
                    <input type="radio" name={`qmode_${roundId}`} value="manual" checked={config.questionAssignmentMode === 'manual'} onChange={() => set('questionAssignmentMode', 'manual')} disabled={isLocked} className="sr-only" />
                    <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0', config.questionAssignmentMode === 'manual' ? 'border-amber-400' : 'border-slate-600')}>
                      {config.questionAssignmentMode === 'manual' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Manual Question Assignment</div>
                      <div className="text-xs opacity-60 mt-0.5">Create and manage your own questions</div>
                    </div>
                    <FileText className="w-4 h-4 ml-auto opacity-60" />
                  </label>
                </div>
              </div>
            )}

            {meta.type === 'aptitude' && config.questionAssignmentMode === 'ai' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {meta.topics.map(topic => (
                      <label key={topic} className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-all',
                        config.topics[topic]
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                      )}>
                        <input type="checkbox" checked={!!config.topics[topic]} onChange={() => handleTopicToggle(topic)} className="sr-only" />
                        {config.topics[topic] && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {topic}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Positive Marks</label>
                    <input type="number" value={config.positiveMarks} onChange={e => set('positiveMarks', e.target.value)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Negative Marks</label>
                    <input type="number" value={config.negativeMarks} onChange={e => set('negativeMarks', e.target.value)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Total Questions</label>
                    <input type="number" value={config.totalQuestions} onChange={e => set('totalQuestions', e.target.value)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm" />
                  </div>
                </div>
              </>
            )}

            {/* ── Manual Builder: Aptitude ── */}
            {meta.type === 'aptitude' && config.questionAssignmentMode === 'manual' && (
              <ManualQuestionBuilder
                questions={config.manualQuestions || []}
                roundType="aptitude"
                isLocked={isLocked}
                expandedId={expandedManualQ}
                setExpandedId={setExpandedManualQ}
                onAdd={addManualQuestion}
                onUpdate={updateManualQuestion}
                onUpdateOption={updateManualOption}
                onDelete={deleteManualQuestion}
                onMove={moveManualQuestion}
              />
            )}

            {meta.type === 'coding' && config.questionAssignmentMode === 'ai' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">DSA Topics</label>
                  <div className="flex flex-wrap gap-3">
                    {meta.topics.map(topic => (
                      <label key={topic} className={clsx(
                        'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all hover:-translate-y-0.5',
                        config.topics[topic]
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                      )}>
                        <input type="checkbox" checked={!!config.topics[topic]} onChange={() => handleTopicToggle(topic)} className="sr-only" />
                        {config.topics[topic] && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {topic}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Difficulty Level</label>
                  <select value={config.difficulty} onChange={handleDifficultyChange} disabled={isLocked}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50">
                    <option>Easy</option><option>Medium</option><option>Hard</option><option>Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Number of Questions</label>
                  <input type="number" value={config.numQuestions} min={1} max={50} onChange={handleNumQuestionsChange} disabled={isLocked}
                    className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50" />
                  <p className="text-[10px] text-slate-500 mt-1.5">Minimum: 1 | Maximum: Configurable Limit</p>
                </div>
                
                {/* Question Preview Area */}
                <div className="mt-4 border border-white/10 rounded-xl bg-black/20 p-5">
                  <h4 className="font-bold text-xs text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2"><PieChart className="w-4 h-4" /> Question Distribution</h4>
                  <div className="space-y-3">
                    {Object.keys(config.topics).filter(t => config.topics[t]).map((topic) => {
                       const questions = config.topicDistribution?.[topic] || [];
                       return (
                         <div key={topic} className="bg-[#0f172a] p-3.5 rounded-lg border border-white/5">
                           <div className="flex items-center justify-between mb-3">
                             <span className="font-semibold text-slate-200">{topic}</span>
                             <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1 border border-white/5">
                               <button type="button" onClick={() => removeTopicQuestion(topic)} disabled={isLocked} className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 text-slate-300">-</button>
                               <span className="text-xs font-bold text-primary w-12 text-center">{questions.length} Qs</span>
                               <button type="button" onClick={() => addTopicQuestion(topic)} disabled={isLocked} className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded disabled:opacity-50 text-slate-300">+</button>
                             </div>
                           </div>
                           {questions.length > 0 && (
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-3 border-t border-white/5">
                               {questions.map((diff, i) => (
                                 <div key={i} className="flex items-center gap-2 text-[11px]">
                                   <span className="text-slate-500 font-bold w-5">Q{i+1}</span>
                                   <select 
                                     value={diff} 
                                     onChange={(e) => updateQuestionDifficulty(topic, i, e.target.value)}
                                     disabled={isLocked}
                                     className={clsx("flex-1 bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 outline-none focus:border-primary disabled:opacity-50 font-semibold",
                                        diff === 'Easy' ? 'text-green-400' : diff === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                                     )}
                                   >
                                     <option value="Easy" className="text-green-400 font-semibold">Easy</option>
                                     <option value="Medium" className="text-yellow-400 font-semibold">Medium</option>
                                     <option value="Hard" className="text-red-400 font-semibold">Hard</option>
                                   </select>
                                 </div>
                               ))}
                             </div>
                           )}
                         </div>
                       );
                    })}
                    {Object.keys(config.topics).filter(t => config.topics[t]).length === 0 && (
                      <div className="text-sm text-slate-500 italic">No topics selected.</div>
                    )}
                  </div>
                </div>

                {/* View Questions Button and List */}
                <div className="mt-4">
                  <button 
                    type="button" 
                    onClick={handleGenerateQuestions}
                    disabled={isLocked}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {codingQuestions ? 'Regenerate All Questions' : 'View Questions'}
                  </button>

                  {codingQuestions && codingQuestions.length > 0 && (
                    <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {codingQuestions.map((q, idx) => (
                        <div key={idx} className="bg-[#0f172a] p-4 rounded-xl border border-white/10 relative group">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded">{q.assignedTopic}</span>
                                <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", 
                                  q.assignedDifficulty === 'Easy' ? 'bg-green-500/10 text-green-400' : 
                                  q.assignedDifficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                                )}>{q.assignedDifficulty}</span>
                              </div>
                              <h5 className="font-bold text-sm text-slate-200">{q.title || q.q}</h5>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleRegenerateQuestion(idx)}
                              disabled={isLocked}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Regenerate
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{q.description || q.options?.join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Manual Builder: Coding ── */}
            {meta.type === 'coding' && config.questionAssignmentMode === 'manual' && (
              <ManualQuestionBuilder
                questions={config.manualQuestions || []}
                roundType="coding"
                isLocked={isLocked}
                expandedId={expandedManualQ}
                setExpandedId={setExpandedManualQ}
                onAdd={addManualQuestion}
                onUpdate={updateManualQuestion}
                onUpdateOption={updateManualOption}
                onDelete={deleteManualQuestion}
                onMove={moveManualQuestion}
              />
            )}

            {meta.type === 'technical_ai' && config.questionAssignmentMode === 'ai' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{meta.label} Topics (AI Generation)</label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {meta.topics.map(topic => (
                      <label key={topic} className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
                        isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                        config.topics[topic]
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20'
                      )}>
                        <input type="checkbox" checked={!!config.topics[topic]} disabled={isLocked} onChange={() => handleTopicToggle(topic)} className="sr-only" />
                        {config.topics[topic] && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {topic}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Difficulty Level</label>
                    <select value={config.difficulty} onChange={e => set('difficulty', e.target.value)} disabled={isLocked}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50">
                      <option>Easy</option><option>Moderate</option><option>Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Total Questions</label>
                    <input type="number" value={config.totalQuestions} min={1} max={50} onChange={e => set('totalQuestions', e.target.value)} disabled={isLocked}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50" />
                  </div>
                </div>
                <div>
                  <label className={clsx("flex items-center gap-2 p-3 rounded-lg border text-sm transition-all", isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer', config.cameraRequired ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-black/30 border-white/5 text-slate-400")}>
                     <input type="checkbox" checked={config.cameraRequired} disabled={isLocked} onChange={e => set('cameraRequired', e.target.checked)} className="sr-only" />
                     <Video className="w-4 h-4" />
                     Require Camera / Proctoring during this round
                  </label>
                </div>

                {previewQuestions && (
                  <div className="mt-4 border border-primary/20 rounded-xl bg-primary/5 p-4 max-h-60 overflow-y-auto custom-scrollbar">
                    <h4 className="font-bold text-sm text-primary mb-3 sticky top-0 bg-[#0f172a] py-1 border-b border-primary/20 z-10">AI Generated Preview ({previewQuestions.length} questions)</h4>
                    <div className="space-y-4">
                      {previewQuestions.map((q, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="font-medium text-white mb-1">{idx + 1}. {q.q || q.title}</div>
                          {q.type === 'mcq' ? (
                            <ul className="pl-4 space-y-1">
                              {q.options.map((opt, oIdx) => (
                                <li key={oIdx} className={clsx("text-xs", q.answer === oIdx ? "text-green-400 font-semibold" : "text-slate-400")}>• {opt}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs text-blue-400 pl-4">[Coding Problem]</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Manual Builder: Technical (Round 3) ── */}
            {meta.type === 'technical_ai' && roundId === '3' && config.questionAssignmentMode === 'manual' && (
              <ManualQuestionBuilder
                questions={config.manualQuestions || []}
                roundType="technical"
                isLocked={isLocked}
                expandedId={expandedManualQ}
                setExpandedId={setExpandedManualQ}
                onAdd={addManualQuestion}
                onUpdate={updateManualQuestion}
                onUpdateOption={updateManualOption}
                onDelete={deleteManualQuestion}
                onMove={moveManualQuestion}
              />
            )}

            {/* ── Manual Builder: Communication (Round 4) ── */}
            {meta.type === 'technical_ai' && roundId === '4' && config.questionAssignmentMode === 'manual' && (
              <ManualQuestionBuilder
                questions={config.manualQuestions || []}
                roundType="communication"
                isLocked={isLocked}
                expandedId={expandedManualQ}
                setExpandedId={setExpandedManualQ}
                onAdd={addManualQuestion}
                onUpdate={updateManualQuestion}
                onUpdateOption={updateManualOption}
                onDelete={deleteManualQuestion}
                onMove={moveManualQuestion}
              />
            )}

            {meta.type === 'interview' && (
              <div className="space-y-8">
                {/* ── Candidate Allocation ── */}
                <div>
                  <h4 className="font-bold text-xs text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4" /> Candidate Allocation
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0f172a] border border-white/5 p-4 rounded-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="text-sm text-slate-400 mb-1 relative z-10">Shortlisted From Round 4</div>
                      <div className="text-2xl font-bold text-white relative z-10">{shortlistedCandidatesCount} Candidates</div>
                    </div>
                    <div className="bg-[#0f172a] border border-white/5 p-4 rounded-xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="text-sm text-slate-400 mb-1 relative z-10">Eligible For Round 5</div>
                      <div className="text-2xl font-bold text-green-400 relative z-10 flex items-center gap-2">
                        {shortlistedCandidatesCount} Candidates
                        <CheckCircle2 className="w-5 h-5 opacity-50" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── HR Configuration ── */}
                <div className="pt-6 border-t border-white/10">
                  <h4 className="font-bold text-xs text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" /> HR Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Interview Mode</label>
                      <select value={config.hrMode} onChange={e => set('hrMode', e.target.value)} disabled={isLocked}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50">
                        <option>AI HR</option>
                        <option>Human HR</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Interviewer Name / Panel</label>
                      <input type="text" placeholder="e.g. HR Team" value={config.interviewer} onChange={e => set('interviewer', e.target.value)} disabled={isLocked}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm placeholder:text-slate-600 disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Number of Slots</label>
                      <input type="number" min={1} value={config.slotsCount} onChange={e => set('slotsCount', e.target.value)} disabled={isLocked}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50" />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-6">
                    <label className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all', config.cameraMandatory ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20')}>
                      <input type="checkbox" checked={config.cameraMandatory} onChange={e => set('cameraMandatory', e.target.checked)} disabled={isLocked} className="sr-only" />
                      {config.cameraMandatory && <CheckCircle2 className="w-4 h-4" />} Camera Mandatory
                    </label>
                    <label className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all', config.micMandatory ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20')}>
                      <input type="checkbox" checked={config.micMandatory} onChange={e => set('micMandatory', e.target.checked)} disabled={isLocked} className="sr-only" />
                      {config.micMandatory && <CheckCircle2 className="w-4 h-4" />} Microphone Mandatory
                    </label>
                    <label className={clsx('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all', config.recordingEnabled ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/20')}>
                      <input type="checkbox" checked={config.recordingEnabled} onChange={e => set('recordingEnabled', e.target.checked)} disabled={isLocked} className="sr-only" />
                      {config.recordingEnabled && <CheckCircle2 className="w-4 h-4" />} Recording Enable
                    </label>
                  </div>
                </div>

                {/* ── HR Question Configuration ── */}
                <div className="pt-6 border-t border-white/10">
                  <h4 className="font-bold text-xs text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" /> HR Question Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Question Source</label>
                      <select value={config.questionSource} onChange={e => set('questionSource', e.target.value)} disabled={isLocked}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50">
                        <option>AI Generated</option>
                        <option>Manual Questions</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Question Count</label>
                      <input type="number" min={1} value={config.hrQuestionCount} onChange={e => set('hrQuestionCount', e.target.value)} disabled={isLocked}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Difficulty</label>
                      <select value={config.hrDifficulty} onChange={e => set('hrDifficulty', e.target.value)} disabled={isLocked}
                        className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-primary outline-none text-sm disabled:opacity-50">
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Resume Requirement ── */}
                <div className="pt-6 border-t border-white/10">
                  <h4 className="font-bold text-xs text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" /> Resume Requirement
                  </h4>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={config.resumeRequired} onChange={e => set('resumeRequired', e.target.checked)} disabled={isLocked} className="w-4 h-4 rounded border-white/20 bg-[#0f172a] text-primary focus:ring-primary focus:ring-offset-[#0f172a]" />
                      Resume Upload Required Before Joining Round
                    </label>
                    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={config.projectDocRequired} onChange={e => set('projectDocRequired', e.target.checked)} disabled={isLocked} className="w-4 h-4 rounded border-white/20 bg-[#0f172a] text-primary focus:ring-primary focus:ring-offset-[#0f172a]" />
                      Project Document Required Before Joining Round
                    </label>
                    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={config.profileVerificationRequired} onChange={e => set('profileVerificationRequired', e.target.checked)} disabled={isLocked} className="w-4 h-4 rounded border-white/20 bg-[#0f172a] text-primary focus:ring-primary focus:ring-offset-[#0f172a]" />
                      Candidate Profile Verification Before Joining
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {meta.type === 'technical_ai' ? (
          config.questionAssignmentMode === 'manual' ? (
            <button type="submit" disabled={isLocked || !!currentError} className={clsx(
              'w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl shadow-lg transition-all text-sm',
              isLocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
              saved ? 'bg-success text-black' : 'bg-primary hover:bg-primary/90 text-white'
            )}>
              {saved ? <><CheckCircle2 className="w-5 h-5" /> Approved & Saved!</> : <><Save className="w-5 h-5" /> Approve & Save</>}
            </button>
          ) : (
          <div className="flex gap-4">
            {!isLocked && (
              <button 
                type="button" 
                onClick={() => {
                  setIsGenerating(true);
                  setTimeout(() => {
                  setPreviewQuestions(generateTechnicalMCQ(config.topics, parseInt(config.totalQuestions), config.difficulty));
                    setIsGenerating(false);
                  }, 800);
                }}
                className="flex-1 flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-all text-sm"
              >
                {isGenerating ? <span className="animate-pulse">Generating AI Questions...</span> : <><Sparkles className="w-5 h-5" /> {previewQuestions ? 'Regenerate Questions' : 'Generate with AI'}</>}
              </button>
            )}
            
            <button 
              type="submit" 
              disabled={isLocked || !!currentError || (!previewQuestions && !isLocked)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl shadow-lg transition-all text-sm',
                isLocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                saved ? 'bg-success text-black' : 
                (!previewQuestions ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-white')
              )}>
              {saved ? <><CheckCircle2 className="w-5 h-5" /> Approved & Saved!</> : <><Save className="w-5 h-5" /> Approve & Save</>}
            </button>
          </div>
          )
        ) : (
          <button type="submit" disabled={isLocked || !!currentError} className={clsx(
            'w-full flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl shadow-lg transition-all text-sm',
            isLocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
            saved ? 'bg-success text-black' : 'bg-primary hover:bg-primary/90 text-white'
          )}>
            {saved ? <><CheckCircle2 className="w-5 h-5" /> Configuration Saved!</> : <><Save className="w-5 h-5" /> Save Configuration</>}
          </button>
        )}
      </form>
    </div>
  );
};

// (CodeModal has been moved to src/components/CodeModal.jsx)

// ─── MANUAL QUESTION BUILDER COMPONENT ───────────────────────────────────────
const COMM_CATEGORIES = ['Communication', 'Voice Based', 'Professional Scenario', 'Project Explanation', 'Behaviour'];

const ManualQuestionBuilder = ({ questions, roundType, isLocked, expandedId, setExpandedId, onAdd, onUpdate, onUpdateOption, onDelete, onMove }) => {
  const inputCls = 'w-full bg-[#0f172a] border border-white/10 rounded-lg px-3 py-2.5 text-white focus:border-amber-400/60 outline-none text-sm placeholder:text-slate-600 disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Manual Questions ({questions.length})
        </span>
        {!isLocked && (
          <button type="button" onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold transition-all">
            + Add Question
          </button>
        )}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-slate-500 text-sm">
          No questions added yet. Click <span className="text-amber-400 font-semibold">+ Add Question</span> to start.
        </div>
      )}

      {questions.map((q, idx) => {
        const isOpen = expandedId === q.id;
        return (
          <div key={q.id} className="bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => onMove(idx, -1)} disabled={idx === 0 || isLocked}
                  className="text-slate-500 hover:text-slate-300 disabled:opacity-20 leading-none text-[10px]">▲</button>
                <button type="button" onClick={() => onMove(idx, 1)} disabled={idx === questions.length - 1 || isLocked}
                  className="text-slate-500 hover:text-slate-300 disabled:opacity-20 leading-none text-[10px]">▼</button>
              </div>
              <span className="text-xs font-bold text-slate-500 w-6">Q{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">
                  {(roundType === 'coding' ? q.title : q.question) || <span className="italic text-slate-500">Untitled question</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {q.difficulty && (
                    <span className={clsx('text-[10px] font-bold px-1.5 py-0.5 rounded',
                      q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' :
                      q.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                    )}>{q.difficulty}</span>
                  )}
                  {q.type && <span className="text-[10px] text-slate-500 capitalize">{q.type}</span>}
                  {q.category && <span className="text-[10px] text-slate-500">{q.category}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setExpandedId(isOpen ? null : q.id)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  {isOpen ? 'Collapse' : 'Edit'}
                </button>
                {!isLocked && (
                  <button type="button" onClick={() => onDelete(q.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded editor */}
            {isOpen && (
              <div className="px-4 pb-5 pt-2 border-t border-white/5 space-y-4">

                {/* ── APTITUDE ── */}
                {roundType === 'aptitude' && (
                  <>
                    <div>
                      <label className={labelCls}>Question</label>
                      <textarea rows={2} value={q.question} disabled={isLocked}
                        onChange={e => onUpdate(q.id, 'question', e.target.value)}
                        placeholder="Type your MCQ question here..."
                        className={textareaCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Options (select correct answer)</label>
                      <div className="space-y-2">
                        {(q.options || ['', '', '', '']).map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button type="button" onClick={() => onUpdate(q.id, 'correctAnswer', oIdx)} disabled={isLocked}
                              className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                                q.correctAnswer === oIdx ? 'border-green-400 bg-green-400/20' : 'border-slate-600 hover:border-slate-400')}>
                              {q.correctAnswer === oIdx && <div className="w-2 h-2 rounded-full bg-green-400" />}
                            </button>
                            <input type="text" value={opt} disabled={isLocked}
                              onChange={e => onUpdateOption(q.id, oIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              className={inputCls} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Difficulty</label>
                        <select value={q.difficulty} onChange={e => onUpdate(q.id, 'difficulty', e.target.value)} disabled={isLocked} className={inputCls}>
                          <option>Easy</option><option>Medium</option><option>Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Marks</label>
                        <input type="number" value={q.marks} disabled={isLocked} onChange={e => onUpdate(q.id, 'marks', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Negative Marks</label>
                        <input type="number" value={q.negativeMarks} disabled={isLocked} onChange={e => onUpdate(q.id, 'negativeMarks', e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </>
                )}

                {/* ── CODING ── */}
                {roundType === 'coding' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Problem Title</label>
                        <input type="text" value={q.title} disabled={isLocked} onChange={e => onUpdate(q.id, 'title', e.target.value)} placeholder="e.g. Two Sum" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Difficulty</label>
                        <select value={q.difficulty} onChange={e => onUpdate(q.id, 'difficulty', e.target.value)} disabled={isLocked} className={inputCls}>
                          <option>Easy</option><option>Medium</option><option>Hard</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Problem Statement</label>
                      <textarea rows={4} value={q.statement} disabled={isLocked} onChange={e => onUpdate(q.id, 'statement', e.target.value)} placeholder="Describe the problem..." className={textareaCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Input Format</label>
                        <textarea rows={2} value={q.inputFormat} disabled={isLocked} onChange={e => onUpdate(q.id, 'inputFormat', e.target.value)} placeholder="Describe input format..." className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Output Format</label>
                        <textarea rows={2} value={q.outputFormat} disabled={isLocked} onChange={e => onUpdate(q.id, 'outputFormat', e.target.value)} placeholder="Describe output format..." className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Constraints</label>
                        <textarea rows={2} value={q.constraints} disabled={isLocked} onChange={e => onUpdate(q.id, 'constraints', e.target.value)} placeholder="e.g. 1 ≤ n ≤ 10^5" className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Visible Test Cases</label>
                        <textarea rows={2} value={q.visibleTestCases} disabled={isLocked} onChange={e => onUpdate(q.id, 'visibleTestCases', e.target.value)} placeholder="Shown to candidate..." className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Sample Input</label>
                        <textarea rows={2} value={q.sampleInput} disabled={isLocked} onChange={e => onUpdate(q.id, 'sampleInput', e.target.value)} placeholder="e.g. [2,7,11,15], 9" className={textareaCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Sample Output</label>
                        <textarea rows={2} value={q.sampleOutput} disabled={isLocked} onChange={e => onUpdate(q.id, 'sampleOutput', e.target.value)} placeholder="e.g. [0,1]" className={textareaCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Hidden Test Cases (Internal)</label>
                      <textarea rows={3} value={q.hiddenTestCases} disabled={isLocked} onChange={e => onUpdate(q.id, 'hiddenTestCases', e.target.value)} placeholder="Hidden from candidate. One test case per line..." className={textareaCls} />
                    </div>
                  </>
                )}

                {/* ── TECHNICAL (Round 3) ── */}
                {roundType === 'technical' && (
                  <>
                    <div className="flex gap-4 mb-2">
                      {['mcq', 'voice'].map(t => (
                        <label key={t} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all capitalize',
                          q.type === t ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20')}>
                          <input type="radio" checked={q.type === t} onChange={() => onUpdate(q.id, 'type', t)} disabled={isLocked} className="sr-only" />
                          {t === 'mcq' ? 'MCQ' : 'Voice Question'}
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className={labelCls}>Technical Question</label>
                      <textarea rows={3} value={q.question} disabled={isLocked} onChange={e => onUpdate(q.id, 'question', e.target.value)}
                        placeholder={q.type === 'voice' ? 'Type the question the AI will ask verbally...' : 'Type the technical question...'}
                        className={textareaCls} />
                    </div>
                    {q.type === 'mcq' && (
                      <div>
                        <label className={labelCls}>Options (select correct answer)</label>
                        <div className="space-y-2">
                          {(q.options || ['', '', '', '']).map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <button type="button" onClick={() => onUpdate(q.id, 'correctAnswer', oIdx)} disabled={isLocked}
                                className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                                  q.correctAnswer === oIdx ? 'border-green-400 bg-green-400/20' : 'border-slate-600 hover:border-slate-400')}>
                                {q.correctAnswer === oIdx && <div className="w-2 h-2 rounded-full bg-green-400" />}
                              </button>
                              <input type="text" value={opt} disabled={isLocked}
                                onChange={e => onUpdateOption(q.id, oIdx, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} className={inputCls} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>Difficulty</label>
                      <select value={q.difficulty} onChange={e => onUpdate(q.id, 'difficulty', e.target.value)} disabled={isLocked} className={inputCls}>
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>
                  </>
                )}

                {/* ── COMMUNICATION (Round 4) ── */}
                {roundType === 'communication' && (
                  <>
                    <div>
                      <label className={labelCls}>Question Category</label>
                      <select value={q.category} onChange={e => onUpdate(q.id, 'category', e.target.value)} disabled={isLocked} className={inputCls}>
                        {COMM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Voice / Communication Question</label>
                      <textarea rows={3} value={q.question} disabled={isLocked} onChange={e => onUpdate(q.id, 'question', e.target.value)}
                        placeholder="Type the question the AI will read aloud to the candidate..."
                        className={textareaCls} />
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                      This question will be spoken by the AI. The candidate answers verbally only.
                    </p>
                  </>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── APTITUDE EVALUATION UTILITIES & COMPONENT ────────────────────────────────
const hashSeed = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const getAptitudeReport = (record, driveId, roundId, drives, roundSchedules) => {
  const drive = drives.find(d => d.id === driveId);
  const driveName = drive ? drive.name : 'Tech Talent Drive';

  const schedule = roundSchedules[driveId]?.[roundId] || {};
  const roundName = schedule.roundName || 'Aptitude Round';
  const passThreshold = schedule.passThreshold !== undefined ? Number(schedule.passThreshold) : 50;
  const positiveMarks = schedule.positiveMarks !== undefined ? Number(schedule.positiveMarks) : 4;
  const negativeMarks = schedule.negativeMarks !== undefined ? Number(schedule.negativeMarks) : -1;

  let metrics = record.metrics;
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (e) {
      console.error("Error parsing metrics JSON", e);
    }
  }
  const hasNativeMetrics = metrics && metrics.isAptitude;
  const m = hasNativeMetrics ? metrics : {};

  let dbProctoringLogs = record.proctoringLogs;
  if (typeof dbProctoringLogs === 'string') {
    try {
      dbProctoringLogs = JSON.parse(dbProctoringLogs);
    } catch (e) {}
  }

  let warningLogs = m.warningLogs || dbProctoringLogs || [];
  const isRound1or2 = ['1', '2'].includes(String(roundId));
  let warningsCount = m.warningCount !== undefined ? m.warningCount : (record.warnings !== undefined ? record.warnings : (isRound1or2 ? warningLogs.length : Math.floor(warningLogs.length / 3)));
  let autoSubmitted = false;
  let startedAt = '';
  let submittedAt = record.submittedAt || new Date().toISOString();
  let timeTaken = record.timeTaken || '20m';

  const storageKey = `coding_${record.candidateId}_${driveId}_${roundId}`;
  
  if (hasNativeMetrics || (dbProctoringLogs && dbProctoringLogs.length > 0)) {
    autoSubmitted = m.autoSubmitted || false;
    startedAt = m.startedAt || new Date(new Date(submittedAt).getTime() - 20 * 60 * 1000).toISOString();
  } else {
    const localWarnings = localStorage.getItem(`${storageKey}_warnings`);
    const localWarningLogs = localStorage.getItem(`${storageKey}_warningLogs`);
    const localStartedAt = localStorage.getItem(`${storageKey}_startedAt`);
    const localAutoSubmitted = localStorage.getItem(`${storageKey}_autoSubmitted`);

    warningsCount = localWarnings ? Number(localWarnings) : (isRound1or2 ? warningLogs.length : Math.floor(warningLogs.length / 3));
    warningLogs = localWarningLogs ? JSON.parse(localWarningLogs) : (dbProctoringLogs || []);
    autoSubmitted = localAutoSubmitted === 'true';
    
    const minMatch = timeTaken.match(/(\d+)m/);
    const durationMs = minMatch ? Number(minMatch[1]) * 60 * 1000 : 20 * 60 * 1000;
    startedAt = localStartedAt || new Date(new Date(submittedAt).getTime() - durationMs).toISOString();

    if (!localWarnings && warningLogs.length === 0) {
      const seedVal = hashSeed(record.candidateId);
      warningsCount = seedVal % 4;
      
      const reasons = [
        "Tab switching or browser minimize detected.",
        "Exiting fullscreen mode is not allowed. Please return to fullscreen.",
        "AI Proctoring: Looking away from the screen detected.",
        "Copying, pasting, and cutting are strictly prohibited."
      ];
      
      const baseTime = new Date(startedAt).getTime();
      for (let i = 0; i < warningsCount; i++) {
        const warningTime = new Date(baseTime + (i + 1) * 3 * 60 * 1000).toISOString();
        warningLogs.push({
          time: warningTime,
          reason: reasons[i % reasons.length],
          count: i + 1
        });
      }
    }
  }

  let securityVerdict = 'Safe';
  if (warningsCount >= 3) {
    securityVerdict = 'Violated';
  } else if (warningsCount > 0) {
    securityVerdict = 'Suspicious';
  }

  const tabSwitchCount = warningLogs.filter(log => log.reason.toLowerCase().includes('tab') || log.reason.toLowerCase().includes('minimize')).length;
  const fullscreenExitCount = warningLogs.filter(log => log.reason.toLowerCase().includes('fullscreen') || log.reason.toLowerCase().includes('exit')).length;
  const copyCount = warningLogs.filter(log => log.reason.toLowerCase().includes('copy') || log.reason.toLowerCase().includes('cut')).length;
  const pasteCount = warningLogs.filter(log => log.reason.toLowerCase().includes('paste')).length;
  const cameraViolationCount = warningLogs.filter(log => log.reason.toLowerCase().includes('camera') || log.reason.toLowerCase().includes('video')).length;
  const multiPersonCount = warningLogs.filter(log => log.reason.toLowerCase().includes('multiple') || log.reason.toLowerCase().includes('alone') || log.reason.toLowerCase().includes('person') || log.reason.toLowerCase().includes('face')).length;
  const phoneDetectionCount = warningLogs.filter(log => log.reason.toLowerCase().includes('phone') || log.reason.toLowerCase().includes('mobile')).length;
  const eyeAlertsCount = warningLogs.filter(log => log.reason.toLowerCase().includes('look') || log.reason.toLowerCase().includes('eye')).length;
  const restrictedKeyCount = warningLogs.filter(log => log.reason.toLowerCase().includes('key') || log.reason.toLowerCase().includes('shortcut') || log.reason.toLowerCase().includes('restricted')).length;

  let questions = schedule.questions || [];
  if (questions.length === 0) {
    const mockTopics = { 'Quantitative Aptitude': true, 'Logical Reasoning': true, 'Verbal Ability': true };
    questions = generateQuestions(mockTopics, schedule.totalQuestions || 10, false);
  }

  let mcqAnswers = m.mcqAnswers;
  if (!mcqAnswers && record.answers) {
    try {
      const parsed = typeof record.answers === 'string' ? JSON.parse(record.answers) : record.answers;
      mcqAnswers = parsed.mcqAnswers || parsed;
    } catch (e) {
      console.error("Error parsing record.answers in getAptitudeReport", e);
    }
  }
  if (!mcqAnswers) {
    const localMcq = localStorage.getItem(`${storageKey}_mcq`);
    if (localMcq) {
      mcqAnswers = JSON.parse(localMcq);
    } else {
      mcqAnswers = {};
      const N = questions.length;
      const scorePct = record.score || 0;
      const C = Math.round((scorePct / 100) * N);
      
      const seedVal = hashSeed(record.candidateId);
      const shuffledIndices = Array.from({ length: N }, (_, i) => i);
      
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = (seedVal + i) % (i + 1);
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }

      const correctIndices = new Set(shuffledIndices.slice(0, C));
      const remainingIndices = shuffledIndices.slice(C);
      const skipCount = 0; // Set to 0 to prevent any mock skipped questions
      const skippedIndices = new Set();
      const wrongIndices = new Set(remainingIndices);

      questions.forEach((q, idx) => {
        if (correctIndices.has(idx)) {
          mcqAnswers[q.id] = q.answer;
        } else if (wrongIndices.has(idx)) {
          mcqAnswers[q.id] = (q.answer + 1) % q.options.length;
        } else {
          mcqAnswers[q.id] = undefined;
        }
      });
    }
  }

  let answeredQuestions = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unansweredQuestions = 0;

  const questionLevelAnalytics = questions.map((q, index) => {
    const selectedAnswerIdx = mcqAnswers[q.id];
    const textAnswer = mcqAnswers[`${q.id}_text`];
    const audioAnswer = mcqAnswers[`${q.id}_audio`];
    
    const isMCQ = q.type === 'mcq' || (q.options && q.options.length > 0);
    
    let isAnswered = false;
    let isCorrect = false;
    let selectedAnswerText = '—';
    let correctAnswerText = '—';
    let resultStatus = 'Skipped';

    if (isMCQ) {
      isAnswered = selectedAnswerIdx !== undefined && selectedAnswerIdx !== null;
      isCorrect = isAnswered && Number(selectedAnswerIdx) === Number(q.answer);
      selectedAnswerText = isAnswered ? (q.options ? q.options[selectedAnswerIdx] : '—') : '—';
      correctAnswerText = q.options ? q.options[q.answer] : 'Expected Answer';
      if (isAnswered) {
        resultStatus = isCorrect ? 'Correct' : 'Wrong';
      }
    } else {
      isAnswered = (textAnswer !== undefined && textAnswer !== null && String(textAnswer).trim().length > 0) ||
                   (audioAnswer !== undefined && audioAnswer !== null) ||
                   (selectedAnswerIdx !== undefined && selectedAnswerIdx !== null);
      isCorrect = isAnswered;
      if (isAnswered) {
        selectedAnswerText = textAnswer || (audioAnswer ? '[Voice Recording Submitted]' : 'Answered');
        resultStatus = 'Correct';
      }
      correctAnswerText = q.correctAnswer || q.answer || '[Subjective Evaluation]';
    }

    if (isAnswered) {
      answeredQuestions++;
      if (isCorrect) {
        correctAnswers++;
      } else {
        wrongAnswers++;
      }
    } else {
      unansweredQuestions++;
    }

    const seedVal = hashSeed(record.candidateId);
    const qTime = 15 + ((seedVal * (index + 1)) % 75);
    const timeTakenStr = qTime < 60 ? `${qTime}s` : `${Math.floor(qTime/60)}m ${qTime%60}s`;

    return {
      qNum: index + 1,
      questionText: q.q || q.title || 'Aptitude Question',
      selectedAnswer: selectedAnswerText,
      correctAnswer: correctAnswerText,
      result: resultStatus,
      timeTaken: timeTakenStr,
      difficulty: q.difficulty || schedule.difficulty || 'Medium'
    };
  });

  const finalScore = record.score !== undefined ? record.score : (questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0);
  const accuracyPercentage = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0;
  const totalMarksObtained = (correctAnswers * positiveMarks) + (wrongAnswers * negativeMarks);
  const resultStatus = finalScore >= passThreshold ? 'Pass' : 'Fail';

  let aiRecommendation = 'Manual Review';
  let aiReason = '';

  if (securityVerdict === 'Violated') {
    aiRecommendation = 'Reject';
    aiReason = `Automated proctoring flagged multiple violations (${warningsCount} alerts) during the session, suggesting a critical malpractice risk. Reject is advised on safety grounds.`;
  } else if (finalScore < passThreshold) {
    aiRecommendation = 'Reject';
    aiReason = `Candidate achieved a score of ${finalScore}%, failing to meet the pass threshold of ${passThreshold}%. Accuracy was ${accuracyPercentage}%. Proctoring profile remains clean.`;
  } else {
    if (securityVerdict === 'Suspicious') {
      aiRecommendation = 'Manual Review';
      aiReason = `Candidate cleared the threshold with ${finalScore}% and accuracy of ${accuracyPercentage}%, but triggered ${warningsCount} proctoring violations. Recommend reviewing webcam/tab logs before final decision.`;
    } else {
      aiRecommendation = 'Shortlist';
      aiReason = `Candidate passed with ${finalScore}% score and ${accuracyPercentage}% accuracy. Proctoring logs indicate a secure assessment environment with zero security warnings.`;
    }
  }

  const decisionKey = `decision_${record.candidateId}_${driveId}_${roundId}`;
  const localDecision = localStorage.getItem(decisionKey);
  const savedDecision = localDecision ? JSON.parse(localDecision) : null;

  return {
    candidateInfo: {
      name: record.name,
      id: record.candidateId,
      email: record.email,
      status: record.status || 'Completed',
      completionTime: submittedAt,
      durationTaken: timeTaken,
      roundName,
      driveName
    },
    performanceSummary: {
      totalQuestions: questions.length,
      answeredQuestions,
      correctAnswers,
      wrongAnswers,
      unansweredQuestions,
      score: finalScore,
      accuracy: accuracyPercentage,
      negativeMarksCount: wrongAnswers,
      negativeMarksEnabled: negativeMarks < 0,
      negativeMarksValue: negativeMarks,
      positiveMarksValue: positiveMarks,
      totalMarksObtained,
      passThreshold,
      resultStatus
    },
    questionLevelAnalytics,
    behaviorReport: {
      startedTime: startedAt,
      submittedTime: submittedAt,
      runtime: timeTaken,
      autoSubmission: autoSubmitted ? 'Yes' : 'No',
      warningsCount,
      securityStatus: securityVerdict
    },
    securityReport: {
      tabSwitchCount,
      fullscreenExitCount,
      copyCount,
      pasteCount,
      cameraViolationCount,
      multiPersonCount,
      phoneDetectionCount,
      eyeAlertsCount,
      restrictedKeyCount,
      finalVerdict: securityVerdict,
      warningLogs
    },
    aiRecommendation: {
      recommendation: aiRecommendation,
      reason: aiReason
    },
    interviewerDecision: savedDecision || {
      status: record.status || 'Pending',
      notes: '',
      timestamp: ''
    }
  };
};

const AptitudeReportModal = ({ record, roundId, driveId, onClose }) => {
  const { drives, roundSchedules } = useDrives();
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    return getAptitudeReport(record, driveId, roundId, drives, roundSchedules);
  }, [record, driveId, roundId, drives, roundSchedules]);

  const handleCopyLogs = () => {
    const logsText = data.securityReport.warningLogs.map(l => `[${new Date(l.time).toLocaleTimeString()}] Warning #${l.count}: ${l.reason}`).join('\n');
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pieData = [
    { name: 'Correct', value: data.performanceSummary.correctAnswers, color: '#10b981' },
    { name: 'Wrong', value: data.performanceSummary.wrongAnswers, color: '#f43f5e' },
    { name: 'Skipped', value: data.performanceSummary.unansweredQuestions, color: '#475569' }
  ].filter(d => d.value > 0);

  const filteredQuestions = data.questionLevelAnalytics.filter(q => {
    if (filter === 'correct') return q.result === 'Correct';
    if (filter === 'wrong') return q.result === 'Wrong';
    if (filter === 'skipped') return q.result === 'Skipped';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Aptitude Evaluation Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">Comprehensive analysis & proctoring record</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Section 1: Candidate Demographics */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Candidate Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Candidate Name</span>
                <span className="font-bold text-white text-base">{data.candidateInfo.name}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Candidate ID</span>
                <span className="font-mono text-primary font-bold">{data.candidateInfo.id}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Email ID</span>
                <span className="text-slate-300 font-semibold">{data.candidateInfo.email}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Assessment Status</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 rounded">
                  Completed
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Completion Time</span>
                <span className="text-slate-300">{new Date(data.candidateInfo.completionTime).toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Total Duration Taken</span>
                <span className="text-slate-300 flex items-center gap-1"><Clock3 className="w-3.5 h-3.5 text-slate-400" /> {data.candidateInfo.durationTaken}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Round Name</span>
                <span className="text-slate-300 font-medium">{data.candidateInfo.roundName}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Drive Name</span>
                <span className="text-slate-300 font-medium">{data.candidateInfo.driveName}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Score Ring chart */}
            <div className="md:col-span-4 bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center relative min-h-[220px]">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 self-start flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Scoring Profile
              </h3>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={45} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white leading-none">{data.performanceSummary.score}%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Final Score</span>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="md:col-span-8 bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" /> Aptitude Performance Summary
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-black/20 border border-white/5 rounded-lg p-3 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Questions</span>
                    <span className="text-xl font-extrabold text-white">{data.performanceSummary.totalQuestions}</span>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Correct Answers</span>
                    <span className="text-xl font-extrabold text-emerald-400">{data.performanceSummary.correctAnswers}</span>
                  </div>
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Wrong Answers</span>
                    <span className="text-xl font-extrabold text-rose-400">{data.performanceSummary.wrongAnswers}</span>
                  </div>
                  <div className="bg-slate-800/20 border border-white/5 rounded-lg p-3 text-center">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unanswered</span>
                    <span className="text-xl font-extrabold text-slate-400">{data.performanceSummary.unansweredQuestions}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider">Accuracy Rate:</span>
                  <span className="text-white ml-1.5 font-bold">{data.performanceSummary.accuracy}%</span>
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider">Total Marks:</span>
                  <span className="text-white ml-1.5 font-bold">
                    {data.performanceSummary.totalMarksObtained} pts
                  </span>
                  {data.performanceSummary.negativeMarksEnabled && (
                    <span className="text-[10px] text-slate-500 block">
                      (+{data.performanceSummary.positiveMarksValue} / {data.performanceSummary.negativeMarksValue} scheme)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 uppercase tracking-wider">Pass Cutoff:</span>
                  <span className="text-white ml-1.5 font-bold">{data.performanceSummary.passThreshold}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 uppercase tracking-wider">Status:</span>
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                    data.performanceSummary.resultStatus === 'Pass' 
                      ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400" 
                      : "bg-rose-500/15 border-rose-500/20 text-rose-400"
                  )}>
                    {data.performanceSummary.resultStatus}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Question Level Analytics */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" /> Question Level Analytics
              </h3>
              
              {/* Filters */}
              <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 self-start text-[11px] font-bold">
                {[
                  { id: 'all', label: `All (${data.performanceSummary.totalQuestions})` },
                  { id: 'correct', label: `Correct (${data.performanceSummary.correctAnswers})`, color: 'text-emerald-400' },
                  { id: 'wrong', label: `Wrong (${data.performanceSummary.wrongAnswers})`, color: 'text-rose-400' },
                  { id: 'skipped', label: `Skipped (${data.performanceSummary.unansweredQuestions})`, color: 'text-slate-400' }
                ].map(opt => (
                  <button key={opt.id} onClick={() => setFilter(opt.id)}
                    className={clsx(
                      "px-2.5 py-1 rounded transition-colors",
                      filter === opt.id ? "bg-primary text-white shadow-sm" : `text-slate-400 hover:text-slate-200`
                    )}>
                    <span className={clsx(filter !== opt.id && opt.color)}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No questions match this filter criteria.</div>
              ) : filteredQuestions.map((q, idx) => (
                <div key={idx} className="bg-black/35 border border-white/5 rounded-xl p-4 flex flex-col gap-2 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-primary">Question {q.qNum}</span>
                      <span className={clsx(
                        "px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase border",
                        q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      )}>
                        {q.difficulty}
                      </span>
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Clock3 className="w-3 h-3" /> {q.timeTaken}
                      </span>
                    </div>
                    
                    <span className={clsx(
                      "font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded border",
                      q.result === 'Correct' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      q.result === 'Wrong' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-slate-700/10 text-slate-400 border-slate-700/20'
                    )}>
                      {q.result}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white mt-1 leading-relaxed">{q.questionText}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs font-semibold">
                    <div className={clsx(
                      "p-2.5 rounded-lg border",
                      q.result === 'Correct' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                      q.result === 'Wrong' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                      'bg-black/20 border-white/5 text-slate-500'
                    )}>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Candidate Answer</span>
                      {q.selectedAnswer}
                    </div>
                    
                    <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-lg">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Correct Answer</span>
                      {q.correctAnswer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Behavior & Security Monitoring Report */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Behavior Card */}
            <div className="md:col-span-5 bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-primary" /> Assessment Behavior Report
                </h3>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Assessment Started Time</span>
                    <span className="text-slate-300">{new Date(data.behaviorReport.startedTime).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Assessment Submitted Time</span>
                    <span className="text-slate-300">{new Date(data.behaviorReport.submittedTime).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Total Runtime / Active Duration</span>
                    <span className="text-slate-300">{data.behaviorReport.runtime}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Auto Submission Status</span>
                    <span className={clsx(
                      "text-slate-300 font-bold", 
                      data.behaviorReport.autoSubmission === 'Yes' && 'text-amber-400 animate-pulse'
                    )}>
                      {data.behaviorReport.autoSubmission}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500">Violations Warnings Triggered</span>
                    <span className={clsx(
                      "font-black",
                      data.behaviorReport.warningsCount > 0 ? 'text-amber-400' : 'text-green-400'
                    )}>
                      {data.behaviorReport.warningsCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Integrity Status</span>
                <span className={clsx(
                  "px-3 py-1 text-xs font-black uppercase border rounded-lg",
                  data.behaviorReport.securityStatus === 'Safe' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  data.behaviorReport.securityStatus === 'Suspicious' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                )}>
                  {data.behaviorReport.securityStatus}
                </span>
              </div>
            </div>

            {/* Proctoring Matrix Card */}
            <div className="md:col-span-7 bg-white/[0.02] border border-white/5 rounded-xl p-5">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-400" /> Security Monitoring Report
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { label: 'Tab Switches', val: data.securityReport.tabSwitchCount },
                  { label: 'Fullscreen Exits', val: data.securityReport.fullscreenExitCount },
                  { label: 'Copy Attempts', val: data.securityReport.copyCount },
                  { label: 'Paste Attempts', val: data.securityReport.pasteCount },
                  { label: 'Camera Missing', val: data.securityReport.cameraViolationCount },
                  { label: 'Multi Person', val: data.securityReport.multiPersonCount },
                  { label: 'Phone Detected', val: data.securityReport.phoneDetectionCount },
                  { label: 'Eye Track Alerts', val: data.securityReport.eyeAlertsCount },
                  { label: 'Keypress Alerts', val: data.securityReport.restrictedKeyCount || 0 }
                ].map((item, idx) => (
                  <div key={idx} className="bg-black/15 border border-white/5 rounded-lg p-2.5 flex flex-col justify-between min-h-[60px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{item.label}</span>
                    <span className={clsx("text-lg font-black mt-1", item.val > 0 ? "text-amber-400" : "text-slate-400")}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Warnings Logs terminal box */}
          {data.securityReport.warningLogs.length > 0 && (
            <div className="bg-black/45 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Proctoring Log Activity
                </span>
                <button onClick={handleCopyLogs} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 font-bold">
                  {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Logs'}
                </button>
              </div>
              <div className="bg-slate-950/60 border border-white/5 rounded-lg p-3 font-mono text-[11px] text-slate-400 max-h-36 overflow-y-auto custom-scrollbar space-y-1.5">
                {data.securityReport.warningLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-slate-600">[{new Date(log.time).toLocaleTimeString()}]</span>
                    <span className="text-amber-400 font-bold shrink-0">W#{log.count}</span>
                    <span className="text-slate-300">{log.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: AI Recommendation */}
          <div className="bg-gradient-to-r from-violet-600/10 via-indigo-600/5 to-transparent border border-indigo-500/20 p-5 rounded-xl flex gap-4 items-start relative overflow-hidden">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">AI Recommendation Engine</h4>
                <span className={clsx(
                  "px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                  data.aiRecommendation.recommendation === 'Shortlist' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  data.aiRecommendation.recommendation === 'Reject' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                )}>
                  {data.aiRecommendation.recommendation}
                </span>
              </div>
              <p className="text-sm font-semibold text-white leading-relaxed">{data.aiRecommendation.reason}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};


// ─── TECHNICAL EVALUATION UTILITIES & COMPONENT ───────────────────────────────
const getTechnicalReport = (record, driveId, roundId, drives, roundSchedules) => {
  const drive = drives.find(d => d.id === driveId);
  const driveName = drive ? drive.name : 'Tech Talent Drive';

  const schedule = roundSchedules[driveId]?.[roundId] || {};
  const roundName = schedule.roundName || 'Technical Round';
  
  let metrics = record.metrics;
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (e) {
      console.error("Error parsing metrics JSON", e);
    }
  }
  const m = metrics || {};
  
  let dbProctoringLogs = record.proctoringLogs;
  if (typeof dbProctoringLogs === 'string') {
    try {
      dbProctoringLogs = JSON.parse(dbProctoringLogs);
    } catch (e) {}
  }

  const storageKey = "coding_" + record.candidateId + "_" + driveId + "_" + roundId;
  const localWarnings = localStorage.getItem(storageKey + "_warnings");
  const localWarningLogs = localStorage.getItem(storageKey + "_warningLogs");
  
  let warningLogs = m.warningLogs || dbProctoringLogs || (localWarningLogs ? JSON.parse(localWarningLogs) : []);
  const isRound1or2 = ['1', '2'].includes(String(roundId));
  let warningsCount = m.warningCount !== undefined ? m.warningCount : (record.warnings !== undefined ? record.warnings : (localWarnings ? Number(localWarnings) : (isRound1or2 ? warningLogs.length : Math.floor(warningLogs.length / 3))));
  
  let timeTaken = record.timeTaken || '25m';
  let submittedAt = record.submittedAt || new Date().toISOString();
  
  if (m.warningCount === undefined && !localWarnings && warningLogs.length === 0 && (!dbProctoringLogs || dbProctoringLogs.length === 0)) {
    const seedVal = hashSeed(record.candidateId);
    warningsCount = seedVal % 5;
    const reasons = [
      "Tab switching or browser minimize detected.",
      "Exiting fullscreen mode is not allowed.",
      "Face not detected continuously",
      "Multiple faces detected in the camera frame",
      "Phone detected in the camera frame",
      "Copying, pasting, and cutting are strictly prohibited.",
      "Eye movement continuously away from assessment screen"
    ];
    const baseTime = new Date(submittedAt).getTime() - 25 * 60 * 1000;
    for (let i = 0; i < warningsCount; i++) {
      warningLogs.push({
        time: new Date(baseTime + (i + 1) * 4 * 60 * 1000).toISOString(),
        reason: reasons[i % reasons.length],
        count: i + 1,
        type: reasons[i % reasons.length].includes("Eye") ? "Eye Tracking" : "Violation"
      });
    }
  }

  // Also check actual record status and warning logs as fallback
  const isDisqualified = warningsCount >= 3 || record.status === 'Disqualified';
  const status = isDisqualified ? 'Disqualified' : 'Completed Successfully';
  
  let questions = schedule.questions || [];
  if (questions.length === 0) {
    questions = Array.from({ length: 15 }, (_, i) => ({
      id: "q" + i,
      title: "Technical Question " + (i+1),
      topic: ['Software Development', 'Database Concepts', 'Data Structures', 'Algorithms'][i % 4],
      answer: i % 4,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      difficulty: i % 3 === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy')
    }));
  }

  const seedVal = hashSeed(record.candidateId);
  const totalQuestions = questions.length;
  let mcqAnswers = m.mcqAnswers;
  if (!mcqAnswers && record.answers) {
    try {
      const parsed = typeof record.answers === 'string' ? JSON.parse(record.answers) : record.answers;
      mcqAnswers = parsed.mcqAnswers || parsed;
    } catch (e) {
      console.error("Error parsing record.answers in getTechnicalReport", e);
    }
  }
  if (!mcqAnswers) {
    mcqAnswers = {};
  }
  
  let answeredQuestions = 0;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unansweredQuestions = 0;

  const questionLevelAnalytics = questions.map((q, index) => {
    const selectedAnswerIdx = mcqAnswers[q.id];
    const textAnswer = mcqAnswers[`${q.id}_text`];
    const audioAnswer = mcqAnswers[`${q.id}_audio`];
    
    const isMCQ = q.type === 'mcq' || (q.options && q.options.length > 0);
    
    let isAnswered = false;
    let isCorrect = false;
    let selectedAnswerText = '—';
    let correctAnswerText = '—';
    let resultStatus = 'Skipped';

    if (isMCQ) {
      isAnswered = selectedAnswerIdx !== undefined && selectedAnswerIdx !== null;
      isCorrect = isAnswered && Number(selectedAnswerIdx) === Number(q.answer);
      selectedAnswerText = isAnswered ? (q.options ? q.options[selectedAnswerIdx] : 'Answered') : '—';
      correctAnswerText = q.options ? q.options[q.answer] : 'Expected Answer';
      if (isAnswered) {
        resultStatus = isCorrect ? 'Correct' : 'Wrong';
      }
    } else {
      isAnswered = (textAnswer !== undefined && textAnswer !== null && String(textAnswer).trim().length > 0) ||
                   (audioAnswer !== undefined && audioAnswer !== null) ||
                   (selectedAnswerIdx !== undefined && selectedAnswerIdx !== null);
      isCorrect = isAnswered;
      if (isAnswered) {
        selectedAnswerText = textAnswer || (audioAnswer ? '[Voice Recording Submitted]' : 'Answered');
        resultStatus = 'Correct';
      }
      correctAnswerText = q.correctAnswer || q.answer || '[Subjective Evaluation]';
    }

    if (isAnswered) {
      answeredQuestions++;
      if (isCorrect) {
        correctAnswers++;
      } else {
        wrongAnswers++;
      }
    } else {
      unansweredQuestions++;
    }

    return {
      qNum: index + 1,
      topic: q.topic || 'General Technical',
      questionText: q.q || q.title || 'Technical Question',
      selectedAnswer: selectedAnswerText,
      correctAnswer: correctAnswerText,
      result: resultStatus,
      timeTaken: (15 + (seedVal + index) % 45) + "s",
      difficulty: q.difficulty || 'Medium'
    };
  });

  const finalScorePercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const accuracyPercentage = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0;

  const tabSwitchCount = warningLogs.filter(log => log.reason.toLowerCase().includes('tab')).length;
  const fullscreenExitCount = warningLogs.filter(log => log.reason.toLowerCase().includes('fullscreen')).length;
  const copyCount = warningLogs.filter(log => log.reason.toLowerCase().includes('copy')).length;
  const pasteCount = warningLogs.filter(log => log.reason.toLowerCase().includes('paste')).length;
  const cameraViolationCount = warningLogs.filter(log => log.reason.toLowerCase().includes('face')).length;
  const multiPersonCount = warningLogs.filter(log => log.reason.toLowerCase().includes('multiple')).length;
  const phoneDetectionCount = warningLogs.filter(log => log.reason.toLowerCase().includes('phone')).length;
  const eyeAlertsCount = warningLogs.filter(log => log.reason.toLowerCase().includes('eye')).length;
  const restrictedKeyCount = warningLogs.filter(log => log.reason.toLowerCase().includes('key') || log.reason.toLowerCase().includes('shortcut') || log.reason.toLowerCase().includes('restricted')).length;

  return {
    isDisqualified,
    candidateInfo: {
      name: record.name,
      candidateId: record.candidateId,
      email: record.email,
      driveName,
      roundName,
      status: status,
      finalDecision: isDisqualified ? 'NOT ELIGIBLE FOR NEXT ROUND' : 'Selected For Next Round'
    },
    technicalPerformance: {
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      wrongAnswers,
      unansweredQuestions,
      finalScorePercentage,
      accuracyPercentage,
      difficultyLevel: schedule.difficulty || 'Mixed',
      timeTaken,
      averageTimePerQuestion: Math.round(45 + (seedVal % 15)) + "s",
      technicalTopicCoverage: 'High',
      questionAnalytics: questionLevelAnalytics,
      questionsAttempted: answeredQuestions,
      scoreBeforeTermination: Math.round((correctAnswers / (answeredQuestions || 1)) * 100) + "%",
      technicalProgressPercentage: Math.round((answeredQuestions / totalQuestions) * 100) + "%"
    },
    technicalSkillSummary: {
      problemSolving: finalScorePercentage > 80 ? 'Excellent' : 'Good',
      technicalKnowledge: finalScorePercentage > 75 ? 'Strong' : 'Average',
      domainUnderstanding: 'Comprehensive',
      consistencyLevel: 'High',
      confidenceScore: (85 + (seedVal % 10)) + "%",
      aiEvaluationSummary: finalScorePercentage > 70 ? 'Candidate shows strong grasp of fundamental and advanced concepts.' : 'Candidate requires more preparation.',
      candidateStrengthAreas: 'Backend Architecture, Problem Solving',
      areasForImprovement: 'Code Optimization'
    },
    malpracticeSummary: {
      totalWarningCount: warningsCount,
      finalStatus: isDisqualified ? 'DISQUALIFIED' : 'SAFE',
      violationTimeline: warningLogs.map(l => ({
        number: l.count,
        timestamp: new Date(l.time).toLocaleTimeString(),
        type: l.type || 'Rule Violation',
        description: l.reason
      }))
    },
    securityMonitoring: {
      warningsCount,
      fullscreenViolations: fullscreenExitCount,
      tabSwitchingCount: tabSwitchCount,
      cameraViolations: cameraViolationCount,
      phoneDetectionCount: phoneDetectionCount,
      multipleFaceDetectionCount: multiPersonCount,
      eyeMonitoringAlerts: eyeAlertsCount,
      copyAttemptCount: copyCount,
      pasteAttemptCount: pasteCount,
      restrictedKeyCount: restrictedKeyCount,
      securityFinalVerdict: isDisqualified ? 'SECURITY VIOLATION DETECTED' : 'Safe Candidate',
      cameraMonitoringResult: cameraViolationCount > 0 ? 'Failed' : 'Passed',
      faceDetectionResult: cameraViolationCount > 0 ? 'Failed' : 'Passed',
      eyeTrackingResult: eyeAlertsCount > 0 ? 'Failed' : 'Passed',
      fullscreenMonitoringResult: fullscreenExitCount > 0 ? 'Failed' : 'Passed',
      copyPasteMonitoringResult: (copyCount > 0 || pasteCount > 0) ? 'Failed' : 'Passed'
    },
    systemActionTaken: {
      assessmentLocked: isDisqualified ? 'Yes' : 'No',
      roundTerminated: isDisqualified ? 'Yes' : 'No',
      candidateRestrictedFromNextRound: isDisqualified ? 'Yes' : 'No',
      violationStored: isDisqualified ? 'Yes' : 'No',
      interviewerDashboardUpdated: 'Yes'
    },
    roundDecision: {
      status: isDisqualified ? 'DISQUALIFIED' : 'SELECTED',
      selectionReason: isDisqualified ? 'Exceeded malpractice limit' : 'Excellent performance in technical topics and clean proctoring record.',
      aiRecommendation: isDisqualified ? 'Reject Candidate' : 'Proceed to next round',
      interviewerNotes: '',
      nextRoundEligibility: isDisqualified ? 'NOT ELIGIBLE' : 'ELIGIBLE'
    }
  };
};

const TechnicalReportModal = ({ record, roundId, driveId, onClose }) => {
  const { drives, roundSchedules } = useDrives();
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState('all');

  const data = useMemo(() => {
    return getTechnicalReport(record, driveId, roundId, drives, roundSchedules);
  }, [record, driveId, roundId, drives, roundSchedules]);

  const { isDisqualified, candidateInfo, technicalPerformance, technicalSkillSummary, malpracticeSummary, securityMonitoring, systemActionTaken, roundDecision } = data;

  const filteredQuestions = useMemo(() => {
    if (!technicalPerformance?.questionAnalytics) return [];
    return technicalPerformance.questionAnalytics.filter(q => {
      if (filter === 'correct') return q.result === 'Correct';
      if (filter === 'wrong') return q.result === 'Wrong';
      if (filter === 'skipped') return q.result === 'Skipped';
      return true;
    });
  }, [technicalPerformance?.questionAnalytics, filter]);

  const handleCopyLogs = () => {
    const logsText = malpracticeSummary.violationTimeline.map(l => "[" + l.timestamp + "] Warning #" + l.number + ": " + l.description).join('\n');
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto pt-20">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={"p-2 rounded-xl " + (isDisqualified ? 'bg-red-500/10 text-red-400' : 'bg-primary/10 text-primary')}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Round 3 Technical Interview Report</h2>
              <p className="text-xs text-slate-400 mt-0.5">Professional Recruiter Decision Format</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
          
          {/* Candidate Information Section */}
          <section className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Candidate Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-slate-500">Candidate Name</p><p className="font-bold text-white">{candidateInfo.name}</p></div>
              <div><p className="text-xs text-slate-500">Candidate ID</p><p className="font-bold text-white">{candidateInfo.candidateId}</p></div>
              <div><p className="text-xs text-slate-500">Email ID</p><p className="font-bold text-white truncate" title={candidateInfo.email}>{candidateInfo.email}</p></div>
              <div><p className="text-xs text-slate-500">Drive Name</p><p className="font-bold text-white truncate">{candidateInfo.driveName}</p></div>
              <div><p className="text-xs text-slate-500">Round Name</p><p className="font-bold text-white">{candidateInfo.roundName}</p></div>
              <div>
                <p className="text-xs text-slate-500">Round Status</p>
                <p className={"font-black uppercase " + (isDisqualified ? 'text-red-400' : 'text-green-400')}>{candidateInfo.status}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Final Decision</p>
                <p className={"font-black uppercase " + (isDisqualified ? 'text-red-500' : 'text-blue-400')}>{candidateInfo.finalDecision}</p>
              </div>
            </div>
          </section>

          {!isDisqualified ? (
            // ================== COMPLETED SUCCESSFULLY FORMAT ==================
            <>
              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Technical Performance Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-slate-500">Total Questions</p><p className="font-bold text-white">{technicalPerformance.totalQuestions}</p></div>
                  <div><p className="text-xs text-slate-500">Answered</p><p className="font-bold text-white">{technicalPerformance.answeredQuestions}</p></div>
                  <div><p className="text-xs text-slate-500">Correct Answers</p><p className="font-bold text-green-400">{technicalPerformance.correctAnswers}</p></div>
                  <div><p className="text-xs text-slate-500">Wrong Answers</p><p className="font-bold text-red-400">{technicalPerformance.wrongAnswers}</p></div>
                  <div><p className="text-xs text-slate-500">Unanswered</p><p className="font-bold text-slate-400">{technicalPerformance.unansweredQuestions}</p></div>
                  <div><p className="text-xs text-slate-500">Final Score</p><p className="font-bold text-primary text-lg">{technicalPerformance.finalScorePercentage}%</p></div>
                  <div><p className="text-xs text-slate-500">Accuracy</p><p className="font-bold text-blue-400 text-lg">{technicalPerformance.accuracyPercentage}%</p></div>
                  <div><p className="text-xs text-slate-500">Difficulty Level</p><p className="font-bold text-white">{technicalPerformance.difficultyLevel}</p></div>
                  <div><p className="text-xs text-slate-500">Time Taken</p><p className="font-bold text-white">{technicalPerformance.timeTaken}</p></div>
                  <div><p className="text-xs text-slate-500">Avg Time/Question</p><p className="font-bold text-white">{technicalPerformance.averageTimePerQuestion}</p></div>
                  <div className="col-span-2"><p className="text-xs text-slate-500">Topic Coverage</p><p className="font-bold text-white">{technicalPerformance.technicalTopicCoverage}</p></div>
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-white/10 pb-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" /> Question Level Analytics
                  </h3>
                  
                  {/* Filters */}
                  <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 self-start text-[11px] font-bold">
                    {[
                      { id: 'all', label: `All (${technicalPerformance.totalQuestions})` },
                      { id: 'correct', label: `Correct (${technicalPerformance.correctAnswers})`, color: 'text-emerald-400' },
                      { id: 'wrong', label: `Wrong (${technicalPerformance.wrongAnswers})`, color: 'text-rose-400' },
                      { id: 'skipped', label: `Skipped (${technicalPerformance.unansweredQuestions})`, color: 'text-slate-400' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => setFilter(opt.id)}
                        className={clsx(
                          "px-2.5 py-1 rounded transition-colors",
                          filter === opt.id ? "bg-primary text-white shadow-sm" : `text-slate-400 hover:text-slate-200`
                        )}>
                        <span className={clsx(filter !== opt.id && opt.color)}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No questions match this filter criteria.</div>
                  ) : filteredQuestions.map((q, idx) => (
                    <div key={idx} className="bg-black/35 border border-white/5 rounded-xl p-4 flex flex-col gap-2 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-primary">Question {q.qNum}</span>
                          <span className="text-slate-400 font-semibold bg-white/5 px-2 py-0.5 rounded text-[10px]">
                            {q.topic}
                          </span>
                          <span className={clsx(
                            "px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase border",
                            q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          )}>
                            {q.difficulty}
                          </span>
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> {q.timeTaken}
                          </span>
                        </div>
                        
                        <span className={clsx(
                          "font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded border",
                          q.result === 'Correct' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          q.result === 'Wrong' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-slate-700/10 text-slate-400 border-slate-700/20'
                        )}>
                          {q.result}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white mt-1 leading-relaxed">{q.questionText}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs font-semibold">
                        <div className={clsx(
                          "p-2.5 rounded-lg border",
                          q.result === 'Correct' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                          q.result === 'Wrong' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                          'bg-black/20 border-white/5 text-slate-500'
                        )}>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Candidate Answer</span>
                          {q.selectedAnswer}
                        </div>
                        
                        <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-lg">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Correct Answer</span>
                          {q.correctAnswer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Technical Skill Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div><p className="text-xs text-slate-500">Problem Solving</p><p className="font-bold text-white">{technicalSkillSummary.problemSolving}</p></div>
                  <div><p className="text-xs text-slate-500">Technical Knowledge</p><p className="font-bold text-white">{technicalSkillSummary.technicalKnowledge}</p></div>
                  <div><p className="text-xs text-slate-500">Domain Understanding</p><p className="font-bold text-white">{technicalSkillSummary.domainUnderstanding}</p></div>
                  <div><p className="text-xs text-slate-500">Consistency Level</p><p className="font-bold text-white">{technicalSkillSummary.consistencyLevel}</p></div>
                  <div><p className="text-xs text-slate-500">Confidence Score</p><p className="font-bold text-blue-400">{technicalSkillSummary.confidenceScore}</p></div>
                  <div className="col-span-3">
                    <p className="text-xs text-slate-500 mt-2">AI Evaluation Summary</p>
                    <p className="font-medium text-slate-300 bg-black/20 p-3 rounded-lg mt-1 border border-white/5">{technicalSkillSummary.aiEvaluationSummary}</p>
                  </div>
                  <div className="col-span-3 sm:grid-cols-1"><p className="text-xs text-slate-500">Strength Areas</p><p className="font-bold text-green-400">{technicalSkillSummary.candidateStrengthAreas}</p></div>
                  <div className="col-span-3 sm:col-span-2"><p className="text-xs text-slate-500">Areas For Improvement</p><p className="font-bold text-amber-400">{technicalSkillSummary.areasForImprovement}</p></div>
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Security Monitoring Report</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><p className="text-xs text-slate-500">Warnings Count</p><p className="font-bold text-white">{securityMonitoring.warningsCount}</p></div>
                  <div><p className="text-xs text-slate-500">Fullscreen Violations</p><p className="font-bold text-white">{securityMonitoring.fullscreenViolations}</p></div>
                  <div><p className="text-xs text-slate-500">Tab Switching</p><p className="font-bold text-white">{securityMonitoring.tabSwitchingCount}</p></div>
                  <div><p className="text-xs text-slate-500">Camera Violations</p><p className="font-bold text-white">{securityMonitoring.cameraViolations}</p></div>
                  <div><p className="text-xs text-slate-500">Phone Detection</p><p className="font-bold text-white">{securityMonitoring.phoneDetectionCount}</p></div>
                  <div><p className="text-xs text-slate-500">Multiple Face Detection</p><p className="font-bold text-white">{securityMonitoring.multipleFaceDetectionCount}</p></div>
                  <div><p className="text-xs text-slate-500">Eye Monitoring Alerts</p><p className="font-bold text-white">{securityMonitoring.eyeMonitoringAlerts}</p></div>
                  <div><p className="text-xs text-slate-500">Keypress Violations</p><p className="font-bold text-white">{securityMonitoring.restrictedKeyCount || 0}</p></div>
                  <div><p className="text-xs text-slate-500">Copy/Paste Attempts</p><p className="font-bold text-white">{securityMonitoring.copyAttemptCount} / {securityMonitoring.pasteAttemptCount}</p></div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center">
                  <span className="font-bold text-emerald-400 uppercase">Security Final Verdict:</span>
                  <span className="font-black text-emerald-400 text-lg uppercase tracking-wider">{securityMonitoring.securityFinalVerdict}</span>
                </div>
              </section>

              <section className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
                <h3 className="text-sm font-black text-blue-400 mb-4 uppercase tracking-widest border-b border-blue-500/20 pb-2">Round Decision</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase">Status:</span>
                    <span className="text-blue-400 font-black text-xl uppercase tracking-wider">{roundDecision.status}</span>
                  </div>
                  <div><p className="text-xs text-blue-400/70 font-bold">Selection Reason</p><p className="text-slate-300">{roundDecision.selectionReason}</p></div>
                  <div><p className="text-xs text-blue-400/70 font-bold">AI Recommendation</p><p className="text-slate-300">{roundDecision.aiRecommendation}</p></div>
                  <div><p className="text-xs text-blue-400/70 font-bold">Interviewer Notes</p><p className="text-slate-300 italic">{roundDecision.interviewerNotes || 'None provided.'}</p></div>
                  <div className="pt-3 border-t border-blue-500/20 flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase">Next Round Eligibility:</span>
                    <span className="text-green-400 font-black text-lg uppercase tracking-wider">{roundDecision.nextRoundEligibility}</span>
                  </div>
                </div>
              </section>
            </>
          ) : (
            // ================== DISQUALIFIED FORMAT ==================
            <>
              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Technical Performance Until Disqualification</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-slate-500">Questions Attempted</p><p className="font-bold text-white">{technicalPerformance.questionsAttempted}</p></div>
                  <div><p className="text-xs text-slate-500">Score Before Termination</p><p className="font-bold text-white">{technicalPerformance.scoreBeforeTermination}</p></div>
                  <div><p className="text-xs text-slate-500">Runtime</p><p className="font-bold text-white">{technicalPerformance.timeTaken}</p></div>
                  <div><p className="text-xs text-slate-500">Technical Progress</p><p className="font-bold text-primary">{technicalPerformance.technicalProgressPercentage}</p></div>
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3 border-b border-white/10 pb-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" /> Question Level Analytics
                  </h3>
                  
                  {/* Filters */}
                  <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5 self-start text-[11px] font-bold">
                    {[
                      { id: 'all', label: `All (${technicalPerformance.totalQuestions})` },
                      { id: 'correct', label: `Correct (${technicalPerformance.correctAnswers})`, color: 'text-emerald-400' },
                      { id: 'wrong', label: `Wrong (${technicalPerformance.wrongAnswers})`, color: 'text-rose-400' },
                      { id: 'skipped', label: `Skipped (${technicalPerformance.unansweredQuestions})`, color: 'text-slate-400' }
                    ].map(opt => (
                      <button key={opt.id} onClick={() => setFilter(opt.id)}
                        className={clsx(
                          "px-2.5 py-1 rounded transition-colors",
                          filter === opt.id ? "bg-primary text-white shadow-sm" : `text-slate-400 hover:text-slate-200`
                        )}>
                        <span className={clsx(filter !== opt.id && opt.color)}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No questions match this filter criteria.</div>
                  ) : filteredQuestions.map((q, idx) => (
                    <div key={idx} className="bg-black/35 border border-white/5 rounded-xl p-4 flex flex-col gap-2 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-primary">Question {q.qNum}</span>
                          <span className="text-slate-400 font-semibold bg-white/5 px-2 py-0.5 rounded text-[10px]">
                            {q.topic}
                          </span>
                          <span className={clsx(
                            "px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider uppercase border",
                            q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          )}>
                            {q.difficulty}
                          </span>
                          <span className="text-slate-500 font-semibold flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> {q.timeTaken}
                          </span>
                        </div>
                        
                        <span className={clsx(
                          "font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded border",
                          q.result === 'Correct' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          q.result === 'Wrong' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-slate-700/10 text-slate-400 border-slate-700/20'
                        )}>
                          {q.result}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-white mt-1 leading-relaxed">{q.questionText}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-xs font-semibold">
                        <div className={clsx(
                          "p-2.5 rounded-lg border",
                          q.result === 'Correct' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                          q.result === 'Wrong' ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' :
                          'bg-black/20 border-white/5 text-slate-500'
                        )}>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Candidate Answer</span>
                          {q.selectedAnswer}
                        </div>
                        
                        <div className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-lg">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Correct Answer</span>
                          {q.correctAnswer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                <h3 className="text-sm font-black text-red-400 mb-4 uppercase tracking-widest border-b border-red-500/20 pb-2">Malpractice Summary</h3>
                <div className="flex justify-between items-center mb-4">
                  <div><p className="text-xs text-slate-500">Total Warning Count</p><p className="font-bold text-white text-lg">{malpracticeSummary.totalWarningCount}</p></div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">Final Status</p>
                    <p className="font-black text-red-500 text-xl tracking-wider">{malpracticeSummary.finalStatus}</p>
                  </div>
                </div>
                
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Violation Timeline:</h4>
                <div className="bg-black/40 rounded-lg border border-red-500/10 p-3 space-y-2">
                  {malpracticeSummary.violationTimeline.map((v, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-b border-white/5 last:border-0 pb-2 last:pb-0 text-sm">
                      <div className="font-bold text-amber-400 whitespace-nowrap">Warning {v.number}</div>
                      <div className="text-slate-500 whitespace-nowrap">{v.timestamp}</div>
                      <div className="text-slate-300 font-semibold">{v.type}</div>
                      <div className="text-slate-400">{v.description}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Security Monitoring Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                  <div><p className="text-xs text-slate-500">Camera Monitoring</p><p className={"font-bold " + (securityMonitoring.cameraMonitoringResult === 'Failed' ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.cameraMonitoringResult}</p></div>
                  <div><p className="text-xs text-slate-500">Face Detection</p><p className={"font-bold " + (securityMonitoring.faceDetectionResult === 'Failed' ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.faceDetectionResult}</p></div>
                  <div><p className="text-xs text-slate-500">Eye Tracking</p><p className={"font-bold " + (securityMonitoring.eyeTrackingResult === 'Failed' ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.eyeTrackingResult}</p></div>
                  <div><p className="text-xs text-slate-500">Fullscreen Monitoring</p><p className={"font-bold " + (securityMonitoring.fullscreenMonitoringResult === 'Failed' ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.fullscreenMonitoringResult}</p></div>
                  <div><p className="text-xs text-slate-500">Copy Paste Monitoring</p><p className={"font-bold " + (securityMonitoring.copyPasteMonitoringResult === 'Failed' ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.copyPasteMonitoringResult}</p></div>
                  <div><p className="text-xs text-slate-500">Phone Detection Result</p><p className={"font-bold " + (securityMonitoring.phoneDetectionCount > 0 ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.phoneDetectionCount > 0 ? 'Failed' : 'Passed'}</p></div>
                  <div><p className="text-xs text-slate-500">Multiple Face Detection</p><p className={"font-bold " + (securityMonitoring.multipleFaceDetectionCount > 0 ? 'text-red-400' : 'text-green-400')}>{securityMonitoring.multipleFaceDetectionCount > 0 ? 'Failed' : 'Passed'}</p></div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex justify-between items-center">
                  <span className="font-bold text-red-400 uppercase">Security Final Verdict:</span>
                  <span className="font-black text-red-500 text-lg uppercase tracking-wider">{securityMonitoring.securityFinalVerdict}</span>
                </div>
              </section>

              <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                <h3 className="text-sm font-black text-amber-500 mb-4 uppercase tracking-widest border-b border-amber-500/20 pb-2">System Action Taken</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div><p className="text-xs text-slate-500">Assessment Locked</p><p className="font-bold text-white">{systemActionTaken.assessmentLocked}</p></div>
                  <div><p className="text-xs text-slate-500">Round Terminated</p><p className="font-bold text-white">{systemActionTaken.roundTerminated}</p></div>
                  <div><p className="text-xs text-slate-500">Candidate Restricted</p><p className="font-bold text-white">{systemActionTaken.candidateRestrictedFromNextRound}</p></div>
                  <div><p className="text-xs text-slate-500">Violation Stored</p><p className="font-bold text-white">{systemActionTaken.violationStored}</p></div>
                  <div><p className="text-xs text-slate-500">Interviewer Dashboard</p><p className="font-bold text-white">{systemActionTaken.interviewerDashboardUpdated}</p></div>
                </div>
              </section>

              <section className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                <h3 className="text-sm font-black text-red-400 mb-4 uppercase tracking-widest border-b border-red-500/20 pb-2">Final Decision Section</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase">Status:</span>
                    <span className="text-red-500 font-black text-xl uppercase tracking-wider">{roundDecision.status}</span>
                  </div>
                  <div><p className="text-xs text-red-400/70 font-bold">Reason</p><p className="text-slate-300 font-semibold">{roundDecision.selectionReason}</p></div>
                  <div><p className="text-xs text-red-400/70 font-bold">AI Recommendation</p><p className="text-amber-400 font-bold">{roundDecision.aiRecommendation}</p></div>
                </div>
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
// ─── RECORDS TAB ──────────────────────────────────────────────────────────────
const RecordsTab = ({ roundId }) => {
  const { id } = useParams();
  const { submissions, candidates, updateCandidateStatus, roundSchedules } = useDrives();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [modalRecord, setModalRecord] = useState(null);

  const records = useMemo(() => {
    return submissions
      .filter(s => s.driveId === id && s.roundId === roundId)
      .map(sub => {
        const candidate = candidates.find(c => c.id === sub.candidateId);
        return { ...sub, name: candidate?.name || 'Unknown', email: candidate?.email || 'Unknown', status: (candidate?.roundStatuses && candidate.roundStatuses[roundId]) || 'Pending' };
      })
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()));
  }, [submissions, candidates, id, roundId, search]);

  return (
    <div className="p-6 animate-in fade-in duration-300">
      {modalRecord && (ROUND_META[roundId]?.type === 'technical_ai' || ROUND_META[roundId]?.type === 'interview' ? (
        <TechnicalReportModal
          record={modalRecord}
          roundId={roundId}
          driveId={id}
          onClose={() => setModalRecord(null)}
        />
      ) : ROUND_META[roundId]?.type === 'aptitude' ? (
        <AptitudeReportModal
          record={modalRecord}
          roundId={roundId}
          driveId={id}
          onClose={() => setModalRecord(null)}
        />
      ) : (
        <CodeModal record={modalRecord} onClose={() => setModalRecord(null)} />
      ))}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Candidate Records</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 w-56" />
          </div>
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm border border-white/10 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="p-4">Candidate</th>
              <th className="p-4">Score</th>
              <th className="p-4">Verdict</th>
              <th className="p-4">Tests</th>
              <th className="p-4">Runtime</th>
              <th className="p-4">Status</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="7" className="p-10 text-center text-slate-500">No submissions yet for this round.</td></tr>
            ) : records.map((c) => {
              const m = c.metrics || {};
              const isCoding = !!c.metrics;
              return (
                <>
                  <tr key={c.id} className="glass-table-row group border-b border-white/5">
                    <td className="p-4">
                      <div className="font-bold text-white group-hover:text-primary transition-colors">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.candidateId} • {c.email}</div>
                      {isCoding && (
                        <div className="text-[10px] text-blue-400 mt-0.5">{m.languageUsed || ''}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-primary">{c.score}%</div>
                      {isCoding && <div className="text-[10px] text-slate-500">{m.passPercentage}% pass rate</div>}
                    </td>
                    <td className="p-4">
                      {isCoding ? <VerdictBadge verdict={m.verdict} /> : <span className="text-slate-500 text-xs">—</span>}
                    </td>
                    <td className="p-4 text-sm">
                      {isCoding ? (
                        <span className="font-semibold text-white">
                          {m.passedCount ?? '—'}<span className="text-slate-500">/{m.totalTestcases ?? '—'}</span>
                        </span>
                      ) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="p-4 text-slate-400 text-sm">{isCoding ? (m.runtime || c.timeTaken) : c.timeTaken}</td>
                    <td className="p-4">
                      <span className={clsx('px-2.5 py-1 rounded-md text-xs font-bold border',
                        c.status === 'Shortlisted' ? 'bg-success/10 text-success border-success/20' :
                        c.status === 'Rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                        'bg-warning/10 text-warning border-warning/20')}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {(!c.status || c.status === 'Pending') && (
                          <>
                            <button onClick={() => updateCandidateStatus(c.candidateId, id, roundId, 'Shortlisted')}
                              className="text-xs font-semibold bg-white/5 hover:bg-success/20 text-success border border-white/10 hover:border-success/30 px-3 py-1.5 rounded transition-all">Shortlist</button>
                            <button onClick={() => updateCandidateStatus(c.candidateId, id, roundId, 'Rejected')}
                              className="text-xs font-semibold bg-white/5 hover:bg-danger/20 text-danger border border-white/10 hover:border-danger/30 px-3 py-1.5 rounded transition-all">Reject</button>
                          </>
                        )}
                        <button onClick={() => setModalRecord(c)}
                          className="text-xs font-semibold bg-white/5 hover:bg-blue-500/20 text-blue-400 border border-white/10 hover:border-blue-500/30 px-3 py-1.5 rounded transition-all flex items-center gap-1">
                          {isCoding ? <Code2 className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          View Report
                        </button>
                      </div>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── SHORTLISTED TAB ──────────────────────────────────────────────────────────
const ShortlistedTab = ({ roundId }) => {
  const { id } = useParams();
  const { candidates, submissions } = useDrives();
  const shortlisted = useMemo(() => {
    return candidates
      .filter(c => c.driveId === id && (c.roundStatuses && c.roundStatuses[roundId] === 'Shortlisted'))
      .map(c => {
        const sub = submissions.find(s => s.candidateId === c.id && s.roundId === roundId);
        return { ...c, score: sub?.score || '—', timeTaken: sub?.timeTaken || '—' };
      });
  }, [candidates, submissions, id, roundId]);

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-white mb-6">Shortlisted Candidates <span className="text-success ml-2 text-base">({shortlisted.length})</span></h2>
      {shortlisted.length === 0 ? (
        <div className="p-10 text-center text-slate-500">No candidates shortlisted yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shortlisted.map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 bg-success/5 border border-success/10 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success font-bold text-sm">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{c.name}</div>
                <div className="text-xs text-slate-400 truncate">{c.email}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-success font-bold text-sm">{c.score}{typeof c.score === 'number' ? '%' : ''}</div>
                <div className="text-xs text-slate-500">{c.timeTaken}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── REGISTERED TAB ───────────────────────────────────────────────────────────
const RegisteredTab = () => {
  const { id } = useParams();
  const { candidates } = useDrives();
  const registered = candidates.filter(c => c.driveId === id);

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <h2 className="text-xl font-bold text-white mb-6">Registered Candidates <span className="text-primary ml-2 text-base">({registered.length})</span></h2>
      {registered.length === 0 ? (
        <div className="p-10 text-center text-slate-500">No candidates registered yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {registered.map(c => (
            <div key={c.id} className="flex items-center gap-4 p-4 bg-black/20 border border-white/5 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{c.name}</div>
                <div className="text-xs text-slate-400 truncate">{c.email}</div>
              </div>
              <span className={clsx('px-2.5 py-1 rounded-md text-[10px] font-bold border shrink-0',
                c.status === 'Shortlisted' ? 'bg-success/10 text-success border-success/20' :
                c.status === 'Rejected' ? 'bg-danger/10 text-danger border-danger/20' :
                'bg-warning/10 text-warning border-warning/20')}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
const DashboardTab = ({ roundId }) => {
  const { id } = useParams();
  const { submissions, candidates } = useDrives();

  const records = useMemo(() => {
    return submissions.filter(s => s.driveId === id && s.roundId === roundId)
      .map(sub => {
        const candidate = candidates.find(c => c.id === sub.candidateId);
        return { ...sub, status: (candidate?.roundStatuses && candidate.roundStatuses[roundId]) || 'Pending' };
      });
  }, [submissions, candidates, id, roundId]);

  const stats = useMemo(() => {
    const total = records.length;
    const scores = records.map(r => r.score);
    const avgScore = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(0) : 0;
    const highestScore = total > 0 ? Math.max(...scores) : 0;
    const pending = records.filter(r => r.status === 'Pending').length;
    const shortlisted = records.filter(r => r.status === 'Shortlisted').length;
    const rejected = records.filter(r => r.status === 'Rejected').length;
    const ranges = { '<50%': 0, '50-70%': 0, '70-90%': 0, '>90%': 0 };
    scores.forEach(s => {
      if (s < 50) ranges['<50%']++;
      else if (s <= 70) ranges['50-70%']++;
      else if (s <= 90) ranges['70-90%']++;
      else ranges['>90%']++;
    });
    return { total, avgScore, highestScore, pending, shortlisted, rejected, ranges };
  }, [records]);

  const pieData = [
    { name: 'Shortlisted', value: stats.shortlisted, color: '#4ade80' },
    { name: 'Rejected', value: stats.rejected, color: '#f87171' },
    { name: 'Pending', value: stats.pending, color: '#fbbf24' },
  ].filter(d => d.value > 0);

  const barData = [
    { range: '<50%', count: stats.ranges['<50%'] },
    { range: '50-70%', count: stats.ranges['50-70%'] },
    { range: '70-90%', count: stats.ranges['70-90%'] },
    { range: '>90%', count: stats.ranges['>90%'] },
  ];

  return (
    <div className="p-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { l: 'Total Attended', v: stats.total, c: 'text-primary' },
          { l: 'Avg Score', v: `${stats.avgScore}%`, c: 'text-secondary' },
          { l: 'Highest Score', v: `${stats.highestScore}%`, c: 'text-success' },
          { l: 'Pending Review', v: stats.pending, c: 'text-warning' },
        ].map(s => (
          <div key={s.l} className="bg-black/20 border border-white/5 rounded-xl p-5 text-center">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{s.l}</div>
            <div className={`text-3xl font-black ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[280px]">
        <div className="bg-black/20 border border-white/5 rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-white mb-3 text-center text-sm">Status Distribution</h3>
          <div className="flex-1 min-h-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data available</div>}
          </div>
        </div>
        <div className="bg-black/20 border border-white/5 rounded-xl p-5 flex flex-col">
          <h3 className="font-bold text-white mb-3 text-center text-sm">Score Distribution</h3>
          <div className="flex-1 min-h-0">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="range" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data available</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RoundDetails() {
  const { roundId, id } = useParams();
  const [activeTab, setActiveTab] = useState('schedule');

  const ROUND_NAMES = { '1': 'Aptitude Test', '2': 'Coding Round', '3': 'Technical Interview', '4': 'Managerial Round', '5': 'HR Interview' };

  const tabs = [
    { id: 'schedule', label: 'Schedule Interview', icon: Calendar },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'shortlist', label: 'Shortlisted', icon: CheckCircle },
    { id: 'registered', label: 'Registered', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-neon">Round {roundId} Hub</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {ROUND_NAMES[roundId] || `Round ${roundId}`} — Manage schedules, track candidates, and analyse performance.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0 mb-6 border-b border-white/5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all whitespace-nowrap relative border-b-2',
                isActive ? 'text-primary border-primary' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/5'
              )}>
              <tab.icon className={clsx('w-4 h-4', isActive ? 'text-primary' : 'text-slate-500')} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 glass-panel rounded-2xl overflow-auto relative min-h-[500px] shadow-2xl">
        {activeTab === 'schedule' && <ScheduleTab roundId={roundId} driveId={id} />}
        {activeTab === 'records' && <RecordsTab roundId={roundId} />}
        {activeTab === 'shortlist' && <ShortlistedTab roundId={roundId} />}
        {activeTab === 'registered' && <RegisteredTab />}
        {activeTab === 'dashboard' && <DashboardTab roundId={roundId} />}
      </div>
    </div>
  );
}
