const fs = require('fs');
const p = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/CandidateCodingEnv.jsx';
let code = fs.readFileSync(p, 'utf8');

// 1. Add isCameraMinimized state
code = code.replace(
  'const [showWarningModal, setShowWarningModal] = useState(false);',
  'const [showWarningModal, setShowWarningModal] = useState(false);\n  const [isCameraMinimized, setIsCameraMinimized] = useState(false);'
);

// 2. Hide MCQ Options for Rounds 3, 4, 5
const optStartStr = '{/* Options */}';
const optEndStr = '{/* 🎤 Voice / Text Answer Input (Rounds 3-5) 🎤 */}';
let s1 = code.indexOf(optStartStr);
let e1 = code.indexOf(optEndStr);
if (s1 !== -1 && e1 !== -1) {
  const replacement = `{/* Options */}
                {!['3', '4', '5'].includes(String(roundId)) && (
                  <div className="space-y-3">
                    {currentQ?.options?.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          selectAnswer(currentQ.id, idx);
                          setMcqStatus(prev => {
                            const cur = prev[currentQ.id];
                            if (cur === 'marked_for_review' || cur === 'answered_marked_for_review') {
                              return { ...prev, [currentQ.id]: 'answered_marked_for_review' };
                            }
                            return prev;
                          });
                        }}
                        className={\`w-full text-left flex items-center gap-4 px-5 py-4 rounded-xl border text-sm font-medium transition-all duration-200 \${
                          stagedAnswer === idx
                            ? 'bg-[#1e3a5f] border-[#3b82f6] text-white shadow-lg shadow-blue-500/10'
                            : 'bg-[#0d1829] border-white/8 text-slate-300 hover:border-[#3b82f6]/40 hover:bg-[#1a2840]'
                        }\`}
                      >
                        <span className={\`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors \${
                          stagedAnswer === idx
                            ? 'bg-[#3b82f6] text-white'
                            : 'bg-white/5 text-[#3b82f6]'
                        }\`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}
                `;
  code = code.slice(0, s1) + replacement + '\n                ' + code.slice(e1);
}

// 3. Bottom Right minimized PIP
const pipStart = 'const CameraPIP = [\'3\', \'4\', \'5\'].includes(String(roundId)) && (';
const pipEnd = '  // 🎒 No questions fallback';
let s2 = code.indexOf(pipStart);
let e2 = code.indexOf(pipEnd);
if (s2 !== -1 && e2 !== -1) {
  const pipReplace = `const CameraPIP = ['3', '4', '5'].includes(String(roundId)) && (
      <div className={\`fixed bottom-6 right-6 z-50 bg-black rounded-xl shadow-2xl overflow-hidden border-2 transition-all duration-300 \${
        isCameraMinimized ? 'w-20 h-20 rounded-full' : 'w-52 h-40'
      } \${
        faceDetected ? 'border-green-500/60' : 'border-red-500/60'
      }\`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={\`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 \${isCameraMinimized ? 'opacity-60' : 'opacity-100'}\`}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Minimize Toggle Button */}
        <button
          onClick={() => setIsCameraMinimized(!isCameraMinimized)}
          className="absolute top-1 right-1 bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 z-10 transition-colors"
          title={isCameraMinimized ? "Maximize Camera" : "Minimize Camera"}
        >
          {isCameraMinimized ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {!isCameraMinimized && (
          <>
            <div className={\`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 \${
              faceDetected
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }\`}>
              <span className={\`w-2 h-2 rounded-full animate-pulse \${faceDetected ? 'bg-green-500' : 'bg-red-500'}\`}></span>
              {faceDetected ? 'Face Detected' : 'No Face'}
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> AI Proctor
            </div>
            <div className={\`absolute bottom-0 left-0 right-0 h-1 \${faceDetected ? 'bg-green-500' : 'bg-red-500'}\`} />
          </>
        )}
      </div>
    );
\n`;
  code = code.slice(0, s2) + pipReplace + code.slice(e2);
}

// 4. Voice Unified State + Textarea
code = code.replace(
  'setMcqAnswers(prev => ({ ...prev, [`${currentQ?.id}_voice`]: transcript }));',
  'setMcqAnswers(prev => { const currentText = prev[currentQ?.id] || ""; return { ...prev, [currentQ?.id]: currentText + (currentText ? " " : "") + transcript }; });'
);
code = code.replace(
  'value={mcqAnswers[`${currentQ?.id}_text`] || \'\'}',
  'value={mcqAnswers[currentQ?.id] || \'\'}'
);
code = code.replace(
  'onChange={(e) => setMcqAnswers(prev => ({ ...prev, [`${currentQ?.id}_text`]: e.target.value }))}',
  'onChange={(e) => setMcqAnswers(prev => ({ ...prev, [currentQ?.id]: e.target.value }))}'
);

// 5. Submit scoring update
code = code.replace(
  'const answeredCount = questions.filter(q => subjectAnswers[q.id]?.text || subjectAnswers[q.id]?.audio).length;',
  'const answeredCount = questions.filter(q => !!mcqAnswers[q.id]).length;'
);
code = code.replace(
  'submitRound(candidateId, driveId, roundId, score, Math.round(score * 0.95), timeTaken, { manualReviewRequired: true, subjectAnswers });',
  'submitRound(candidateId, driveId, roundId, score, Math.round(score * 0.95), timeTaken, { manualReviewRequired: true, mcqAnswers });'
);

// 6. Camera Deactivation on Submit
code = code.replace(
  'setTimeout(() => navigate(\'/candidate/home\'), 6000);',
  `if (stream) stream.getTracks().forEach(t => t.stop());
      if (faceCheckInterval) clearInterval(faceCheckInterval);
      if (noFaceTimer) clearTimeout(noFaceTimer);
      setCameraActive(false);
      setTimeout(() => navigate('/candidate/home'), 6000);`
);

fs.writeFileSync(p, code);
console.log('Patch complete.');
