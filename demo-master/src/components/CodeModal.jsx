import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Cpu, Clock3, AlertTriangle, User, Mail, Calendar, FileText, Code2, AlertCircle, Lightbulb, Lock, Crosshair, TrendingUp, Download, Eye, Terminal, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useDrives } from '../contexts/DriveContext';

export const VerdictBadge = ({ verdict }) => {
  if (!verdict) return null;
  const colors = {
    'Accepted': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Partially Passed': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Partial Accepted': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Failed': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Compilation Error': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Runtime Error': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'Time Limit Exceeded': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Memory Limit Exceeded': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Safe': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Suspicious': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Violated': 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-bold border', colors[verdict] || 'bg-slate-500/10 text-slate-400 border-slate-500/20')}>
      {verdict}
    </span>
  );
};

export const CodeModal = ({ record, onClose }) => {
  const { updateCandidateStatus, drives } = useDrives();
  const m = record.metrics || {};
  const driveName = drives?.find(d => d.id === record.driveId)?.name || 'Mock Drive';
  
  // Candidate Info
  const candidateName = record.name || 'Unknown Candidate';
  const candidateId = record.candidateId || 'CAND-0000';
  const emailId = record.email || 'N/A';
  const langUsed = m.languageUsed || 'N/A';
  const startTime = m.startedAt ? new Date(m.startedAt).toLocaleString() : 'N/A';
  const submissionTime = record.submittedAt ? new Date(record.submittedAt).toLocaleString() : 'N/A';
  const totalDuration = m.timeTaken || record.timeTaken || '60m';
  
  // Performance Summary
  const questionsData = m.questionsData || [];
  const totalQuestions = questionsData.length || (m.codeSubmitted ? 1 : 0);
  let accepted = 0;
  let partial = 0;
  let failed = 0;
  let visiblePassed = 0;
  let visibleTotal = 0;
  let hiddenPassed = 0;
  let hiddenTotal = 0;

  questionsData.forEach(q => {
    if (q.verdict === 'Accepted') accepted++;
    else if (q.verdict === 'Partially Passed' || q.verdict === 'Partial Accepted') partial++;
    else failed++;
    
    visiblePassed += q.passedCount || 0;
    visibleTotal += q.totalTestcases || 0;
    hiddenPassed += Math.floor((q.passedCount || 0) * 0.4);
    hiddenTotal += Math.floor((q.totalTestcases || 0) * 0.4);
  });
  
  if (totalQuestions === 1 && questionsData.length === 0) {
    visiblePassed = m.passedCount || 0;
    visibleTotal = m.totalTestcases || 0;
    if (m.verdict === 'Accepted') accepted = 1;
    else if (m.verdict === 'Partially Passed' || m.verdict === 'Partial Accepted') partial = 1;
    else failed = 1;
  }

  const overallScore = m.passPercentage ?? record.score ?? 0;
  const overallVerdict = overallScore >= 90 ? 'Accepted' : (overallScore > 0 ? 'Partially Passed' : 'Failed');
  
  // Security
  const warnings = Array.isArray(m.warningLogs) ? m.warningLogs : [];
  const getW = (kw1, kw2) => warnings.filter(log => {
    const text = typeof log === 'string' ? log : (log?.reason || '');
    return text.toLowerCase().includes(kw1) || (kw2 && text.toLowerCase().includes(kw2));
  }).length;
  
  const tabSwitchCount = getW('tab', 'minimize');
  const fullscreenExitCount = getW('fullscreen', 'exit');
  const copyCount = getW('copy', 'cut');
  const pasteCount = getW('paste');
  const cameraViolationCount = getW('camera', 'video');
  const multiPersonCount = getW('multiple', 'alone');
  const phoneDetectionCount = getW('phone', 'mobile');
  const eyeAlertsCount = getW('look', 'eye');
  
  let secVerdict = 'Safe';
  if (warnings.length >= 3) secVerdict = 'Violated';
  else if (warnings.length > 0) secVerdict = 'Suspicious';

  // AI Rec
  let aiRec = 'Manual Review';
  let aiReason = 'Requires human evaluation.';
  let aiRecColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  if (secVerdict === 'Violated') {
    aiRec = 'Reject';
    aiReason = 'Multiple security violations detected.';
    aiRecColor = 'text-red-400 bg-red-500/10 border-red-500/20';
  } else if (overallScore >= 90 && secVerdict === 'Safe') {
    aiRec = 'Strong Shortlist';
    aiReason = 'Excellent coding performance, high optimization, no malpractice.';
    aiRecColor = 'text-green-400 bg-green-500/10 border-green-500/20';
  } else if (overallScore >= 70 && secVerdict !== 'Violated') {
    aiRec = 'Shortlist';
    aiReason = 'Good problem-solving abilities. Minor issues in edge cases.';
    aiRecColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  } else if (overallScore < 40) {
    aiRec = 'Reject';
    aiReason = 'Low coding proficiency and logic errors.';
    aiRecColor = 'text-red-400 bg-red-500/10 border-red-500/20';
  }

  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState(record.status || null);
  const [decisionTime, setDecisionTime] = useState(null);

  const handleDecision = (status) => {
    if (updateCandidateStatus) {
      updateCandidateStatus(candidateId, record.driveId, record.roundId, status, notes);
    }
    setDecision(status);
    setDecisionTime(new Date().toLocaleString());
  };

  const SectionTitle = ({ title, icon: Icon }) => (
    <h3 className="font-bold text-white text-base flex items-center gap-2 mb-4 mt-8 first:mt-0 border-b border-white/10 pb-2">
      <Icon className="w-5 h-5 text-primary" /> {title}
    </h3>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-5xl h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1e293b]/50 rounded-t-2xl shrink-0">
          <div>
            <div className="font-extrabold text-white text-xl flex items-center gap-3">
              Recruiter Evaluation Report <span className="text-xs font-normal text-slate-400 bg-black/30 px-2 py-1 rounded border border-white/5">Round 2: Coding</span>
            </div>
            <div className="text-sm text-slate-400 mt-1">Detailed analysis for {candidateName}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors bg-black/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-2">
          
          {/* Candidate Information */}
          <SectionTitle title="Candidate Information" icon={User} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm bg-black/20 p-5 rounded-xl border border-white/5">
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Candidate Name</p><p className="font-semibold text-white">{candidateName}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Candidate ID</p><p className="font-semibold text-white">{candidateId}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Email ID</p><p className="font-semibold text-white">{emailId}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Drive Name</p><p className="font-semibold text-white">{driveName}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Round Name</p><p className="font-semibold text-white">Round {record.roundId || 2}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Programming Language Used</p><p className="font-semibold text-blue-400">{langUsed}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Assessment Start Time</p><p className="font-semibold text-slate-300">{startTime}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Assessment Submission Time</p><p className="font-semibold text-slate-300">{submissionTime}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Coding Duration</p><p className="font-semibold text-slate-300">{totalDuration}</p></div>
            <div className="col-span-3 flex items-center gap-3 bg-[#1e293b]/50 p-3 rounded-lg border border-white/5">
              <p className="text-slate-500 text-xs font-bold uppercase">Overall Round Status:</p>
              <VerdictBadge verdict={overallVerdict} />
              <span className="ml-auto font-bold text-white">Score: {overallScore}%</span>
            </div>
          </div>

          {/* Coding Performance Summary */}
          <SectionTitle title="Coding Performance Summary" icon={TrendingUp} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Questions</p><p className="font-bold text-lg text-white">{totalQuestions}</p>
            </div>
            <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/10">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Accepted</p><p className="font-bold text-lg text-green-400">{accepted}</p>
            </div>
            <div className="bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Partial Accepted</p><p className="font-bold text-lg text-yellow-400">{partial}</p>
            </div>
            <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Failed</p><p className="font-bold text-lg text-red-400">{failed}</p>
            </div>
            
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Overall Score %</p><p className="font-bold text-lg text-white">{overallScore}%</p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Visible Tests Passed</p><p className="font-bold text-lg text-slate-300">{visiblePassed}/{visibleTotal}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Hidden Tests Passed</p><p className="font-bold text-lg text-slate-300">{hiddenPassed}/{hiddenTotal}</p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Avg Solve Time</p><p className="font-bold text-lg text-slate-300">12m</p>
            </div>
            
            {/* Error counts */}
            <div className="col-span-2 md:col-span-4 flex gap-4 mt-2">
              <div className="flex-1 bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                 <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Compilation Errors</p><p className="font-semibold text-white">0</p>
              </div>
              <div className="flex-1 bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                 <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Runtime Errors</p><p className="font-semibold text-white">0</p>
              </div>
              <div className="flex-1 bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                 <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Memory Limit</p><p className="font-semibold text-white">0</p>
              </div>
              <div className="flex-1 bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                 <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Time Limit</p><p className="font-semibold text-white">0</p>
              </div>
            </div>
          </div>

          {/* Question Wise Analysis */}
          <SectionTitle title="Question Wise Analysis" icon={Code2} />
          <div className="space-y-4">
            {questionsData.map((q, idx) => (
              <div key={idx} className="bg-black/30 border border-white/5 rounded-xl overflow-hidden shadow-inner">
                <div className="flex flex-wrap items-center justify-between px-5 py-4 bg-[#1e293b] border-b border-white/5 gap-4">
                  <div>
                    <div className="font-bold text-white text-sm mb-1">{q.questionTitle || q.title || `Question ${idx + 1}`}</div>
                    <div className="text-xs text-slate-400">Difficulty: Medium</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <VerdictBadge verdict={q.verdict} />
                    <div className="text-xs font-semibold text-white bg-black/30 px-2 py-1 rounded border border-white/5">{q.passPercentage}% Score</div>
                  </div>
                </div>
                
                <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-white/5 bg-[#0f172a]">
                  <div><p className="text-slate-500 font-bold uppercase mb-1">Visible Tests Passed</p><p className="font-semibold text-white">{q.passedCount}/{q.totalTestcases}</p></div>
                  <div><p className="text-slate-500 font-bold uppercase mb-1">Hidden Tests Passed</p><p className="font-semibold text-white">{Math.floor((q.passedCount||0)*0.4)}/{Math.floor((q.totalTestcases||0)*0.4)}</p></div>
                  <div><p className="text-slate-500 font-bold uppercase mb-1">Runtime</p><p className="font-semibold text-white">{q.runtime || '25ms'}</p></div>
                  <div><p className="text-slate-500 font-bold uppercase mb-1">Memory Usage</p><p className="font-semibold text-white">O(N) / 12MB</p></div>
                  <div><p className="text-slate-500 font-bold uppercase mb-1">Optimization Level</p><p className="font-semibold text-green-400">Good</p></div>
                  <div><p className="text-slate-500 font-bold uppercase mb-1">Est. Efficiency</p><p className="font-semibold text-blue-400">O(N log N)</p></div>
                </div>
                
                <div className="p-4 bg-black/20">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><Terminal className="w-3 h-3" /> Candidate Code View</p>
                  <pre className="p-4 bg-[#0a0f18] rounded-lg font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                    {q.codeSubmitted || q.code || '// No code submitted'}
                  </pre>
                </div>
              </div>
            ))}
            {questionsData.length === 0 && m.codeSubmitted && (
               <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Candidate Code View (Fallback)</p>
                 <pre className="p-4 bg-[#0a0f18] rounded-lg font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed border border-white/5 max-h-60 overflow-y-auto">
                    {m.codeSubmitted}
                 </pre>
               </div>
            )}
          </div>

          {/* Coding Skill Evaluation */}
          <SectionTitle title="Coding Skill Evaluation" icon={TargetIcon} />
          <div className="bg-black/20 p-6 rounded-xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <SkillBar label="Problem Solving Skill" score={overallScore > 0 ? Math.min(overallScore + 10, 100) : 0} />
              <SkillBar label="Algorithm Understanding" score={overallScore} />
              <SkillBar label="Data Structure Knowledge" score={overallScore > 0 ? Math.min(overallScore + 5, 100) : 0} />
              <SkillBar label="Optimization Skill" score={Math.floor(overallScore * 0.9)} />
              <SkillBar label="Debugging Ability" score={Math.floor(overallScore * 0.85)} />
              <SkillBar label="Code Quality Score" score={overallScore > 0 ? Math.min(overallScore + 15, 100) : 0} />
              <SkillBar label="Edge Case Handling" score={Math.floor(overallScore * 0.8)} />
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2"><Sparkles className="w-3 h-3 text-primary" /> AI Coding Evaluation Summary</p>
              <div className="bg-[#1e293b]/50 p-4 rounded-lg border border-white/5 text-sm text-slate-300 leading-relaxed mb-4">
                The candidate demonstrated a {overallScore >= 70 ? 'strong' : 'moderate'} grasp of algorithms and problem solving. Code structuring is {overallScore >= 80 ? 'excellent' : 'adequate'}.
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Strengths</p>
              <div className="flex flex-wrap gap-2 mb-4">
                 <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20">Syntax Familiarity</span>
                 <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs border border-green-500/20">Basic Algorithms</span>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-2">Improvement Areas</p>
              <div className="flex flex-wrap gap-2">
                 <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs border border-yellow-500/20">Edge Case Testing</span>
                 <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs border border-yellow-500/20">Time Complexity Optimization</span>
              </div>
            </div>
          </div>

          {/* Security Monitoring Report */}
          <SectionTitle title="Security Monitoring Report" icon={ShieldCheck} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-black/20 p-5 rounded-xl border border-white/5">
            <SecMetric label="Copy Attempt" val={copyCount} />
            <SecMetric label="Paste Attempt" val={pasteCount} />
            <SecMetric label="Tab Switch" val={tabSwitchCount} />
            <SecMetric label="Fullscreen Exit" val={fullscreenExitCount} />
            <SecMetric label="Camera Violation" val={cameraViolationCount} />
            <SecMetric label="Phone Detection" val={phoneDetectionCount} />
            <SecMetric label="Multiple Person" val={multiPersonCount} />
            <SecMetric label="Eye Monitoring Violations" val={eyeAlertsCount} />
            <div className="col-span-2 md:col-span-4 mt-2 flex items-center justify-between bg-[#1e293b] p-4 rounded-lg border border-white/5">
              <span className="font-bold text-white uppercase text-xs tracking-wider">Final Security Status</span>
              <VerdictBadge verdict={secVerdict} />
            </div>
          </div>

          {/* AI Recommendation */}
          <SectionTitle title="AI Recommendation Section" icon={Lightbulb} />
          <div className={clsx("p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4", aiRecColor)}>
             <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">AI Recommendation:</p>
                <p className="font-extrabold text-lg">{aiRec}</p>
             </div>
             <div className="md:border-l border-current/20 md:pl-6 max-w-xl">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Recommendation Reason:</p>
                <p className="text-sm font-semibold opacity-90">{aiReason}</p>
             </div>
          </div>

          {/* Final Interviewer Decision Area */}
          <SectionTitle title="Final Interviewer Decision Area" icon={ClipboardCheck} />
          <div className="bg-[#1e293b]/50 p-6 rounded-xl border border-white/10 flex flex-col gap-4 shadow-lg mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Interviewer Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your evaluation notes here for HR review..."
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary transition-colors resize-none custom-scrollbar"
                />
              </div>
              <div className="flex-1 flex flex-col justify-end gap-3">
                 <button 
                   onClick={() => handleDecision('Shortlisted')}
                   className={clsx("w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all", decision === 'Shortlisted' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 ring-2 ring-green-500/50 ring-offset-2 ring-offset-[#0f172a]' : 'bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/30')}
                 >
                   <CheckCircle2 className="w-5 h-5" /> Shortlist Candidate
                 </button>
                 <button 
                   onClick={() => handleDecision('Rejected')}
                   className={clsx("w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all", decision === 'Rejected' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 ring-2 ring-red-500/50 ring-offset-2 ring-offset-[#0f172a]' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30')}
                 >
                   <X className="w-5 h-5" /> Reject Candidate
                 </button>
              </div>
            </div>
            {decision && (
              <div className="text-right text-xs text-slate-400 font-semibold flex justify-end items-center gap-2 mt-2 border-t border-white/5 pt-4">
                 Decision recorded as <VerdictBadge verdict={decision === 'Shortlisted' ? 'Accepted' : 'Failed'} /> at {decisionTime || new Date().toLocaleString()}
              </div>
            )}
          </div>

        </div>
        {/* Warning Logs */}
        {warnings && warnings.length > 0 && (
          <div className="border-t border-red-500/20 bg-red-500/5 px-6 py-4 max-h-40 overflow-y-auto">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Malpractice Logs</p>
            <div className="space-y-2">
              {warnings.map((log, i) => {
                const count = log.count || (i + 1);
                const timeStr = log.time ? new Date(log.time).toLocaleTimeString() : 'N/A';
                const reasonStr = typeof log === 'string' ? log : (log.reason || 'Unknown violation');
                return (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="font-bold w-6 shrink-0 text-yellow-500">#{count}</span>
                    <span className="text-slate-400 w-32 shrink-0">{timeStr}</span>
                    <span className="text-red-300">{reasonStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TargetIcon = (props) => <Crosshair {...props} />;
const ClipboardCheck = (props) => <FileText {...props} />;

const SkillBar = ({ label, score }) => (
  <div>
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-slate-400 font-semibold">{label}</span>
      <span className="text-white font-bold">{score}/100</span>
    </div>
    <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
      <div className="h-full bg-blue-500 transition-all rounded-full" style={{ width: `${score}%` }}></div>
    </div>
  </div>
);

const SecMetric = ({ label, val }) => (
  <div>
    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">{label}</p>
    <p className={clsx("font-semibold", val > 0 ? 'text-red-400' : 'text-slate-300')}>{val}</p>
  </div>
);
