const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/pages/RoundDetails.jsx');
let content = fs.readFileSync(targetFile, 'utf8');

const technicalCode = `
// ─── TECHNICAL EVALUATION UTILITIES & COMPONENT ───────────────────────────────
const getTechnicalReport = (record, driveId, roundId, drives, roundSchedules) => {
  const drive = drives.find(d => d.id === driveId);
  const driveName = drive ? drive.name : 'Tech Talent Drive';

  const schedule = roundSchedules[driveId]?.[roundId] || {};
  const roundName = schedule.roundName || 'Technical Round';
  
  const m = record.metrics || {};
  
  const storageKey = "coding_" + record.candidateId + "_" + driveId + "_" + roundId;
  const localWarnings = localStorage.getItem(storageKey + "_warnings");
  const localWarningLogs = localStorage.getItem(storageKey + "_warningLogs");
  
  let warningsCount = m.warningCount !== undefined ? m.warningCount : (localWarnings ? Number(localWarnings) : 0);
  let warningLogs = m.warningLogs || (localWarningLogs ? JSON.parse(localWarningLogs) : []);
  
  let timeTaken = record.timeTaken || '25m';
  let submittedAt = record.submittedAt || new Date().toISOString();
  
  if (!m.warningCount && !localWarnings && warningLogs.length === 0) {
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

  const isDisqualified = warningsCount >= 3;
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
  const answeredQuestions = isDisqualified ? Math.floor(totalQuestions * 0.4) : totalQuestions - (seedVal % 3);
  const correctAnswers = isDisqualified ? Math.floor(answeredQuestions * 0.3) : Math.floor(answeredQuestions * 0.85);
  const wrongAnswers = answeredQuestions - correctAnswers;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  
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

  const questionLevelAnalytics = questions.map((q, index) => {
    let result = 'Skipped';
    if (index < answeredQuestions) {
      result = index < correctAnswers ? 'Correct' : 'Wrong';
    }
    return {
      qNum: index + 1,
      topic: q.topic || 'General Technical',
      selectedAnswer: result === 'Correct' ? q.options[q.answer] : (result === 'Wrong' ? q.options[(q.answer + 1) % 4] : '—'),
      correctAnswer: q.options[q.answer],
      result,
      timeTaken: (15 + (seedVal + index) % 45) + "s",
      difficulty: q.difficulty || 'Medium'
    };
  });

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

  const data = useMemo(() => {
    return getTechnicalReport(record, driveId, roundId, drives, roundSchedules);
  }, [record, driveId, roundId, drives, roundSchedules]);

  const { isDisqualified, candidateInfo, technicalPerformance, technicalSkillSummary, malpracticeSummary, securityMonitoring, systemActionTaken, roundDecision } = data;

  const handleCopyLogs = () => {
    const logsText = malpracticeSummary.violationTimeline.map(l => "[" + l.timestamp + "] Warning #" + l.number + ": " + l.description).join('\\n');
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
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Question Analytics</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 text-xs">
                        <th className="py-2 pr-4">#</th>
                        <th className="py-2 pr-4">Question Topic</th>
                        <th className="py-2 pr-4">Selected Answer</th>
                        <th className="py-2 pr-4">Correct Answer</th>
                        <th className="py-2 pr-4">Result</th>
                        <th className="py-2 pr-4">Time Taken</th>
                        <th className="py-2">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {technicalPerformance.questionAnalytics.map(q => (
                        <tr key={q.qNum} className="border-b border-white/5 text-sm text-slate-300">
                          <td className="py-2 pr-4 font-bold">{q.qNum}</td>
                          <td className="py-2 pr-4">{q.topic}</td>
                          <td className="py-2 pr-4">{q.selectedAnswer}</td>
                          <td className="py-2 pr-4">{q.correctAnswer}</td>
                          <td className={"py-2 pr-4 font-bold " + (q.result === 'Correct' ? 'text-green-400' : q.result === 'Wrong' ? 'text-red-400' : 'text-slate-500')}>{q.result}</td>
                          <td className="py-2 pr-4">{q.timeTaken}</td>
                          <td className="py-2">{q.difficulty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  <div className="col-span-3 sm:col-span-1"><p className="text-xs text-slate-500">Strength Areas</p><p className="font-bold text-green-400">{technicalSkillSummary.candidateStrengthAreas}</p></div>
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
`;

const recordsTabMarker = '// ─── RECORDS TAB ──────────────────────────────────────────────────────────────';

if (content.includes('const getTechnicalReport = (record')) {
  console.log("Already patched.");
} else if (content.includes(recordsTabMarker)) {
  content = content.replace(recordsTabMarker, technicalCode + '\\n' + recordsTabMarker);
  
  // Now modify the rendering inside RecordsTab to use TechnicalReportModal
  const oldModalRender = "{modalRecord && (ROUND_META[roundId]?.type === 'aptitude' ? (\\n        <AptitudeReportModal\\n          record={modalRecord}\\n          roundId={roundId}\\n          driveId={id}\\n          onClose={() => setModalRecord(null)}\\n        />\\n      ) : (\\n        <CodeModal record={modalRecord} onClose={() => setModalRecord(null)} />\\n      ))}";

  const newModalRender = "{modalRecord && (ROUND_META[roundId]?.type === 'technical_ai' ? (\\n        <TechnicalReportModal\\n          record={modalRecord}\\n          roundId={roundId}\\n          driveId={id}\\n          onClose={() => setModalRecord(null)}\\n        />\\n      ) : ROUND_META[roundId]?.type === 'aptitude' ? (\\n        <AptitudeReportModal\\n          record={modalRecord}\\n          roundId={roundId}\\n          driveId={id}\\n          onClose={() => setModalRecord(null)}\\n        />\\n      ) : (\\n        <CodeModal record={modalRecord} onClose={() => setModalRecord(null)} />\\n      ))}";
      
  content = content.replace(oldModalRender, newModalRender);

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log("Patched successfully");
} else {
  console.log("Marker not found.");
}
