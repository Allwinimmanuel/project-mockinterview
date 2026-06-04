const fs = require('fs');

const envPath = './src/pages/CandidateCodingEnv.jsx';
let code = fs.readFileSync(envPath, 'utf8');

// Normalize line endings to \n
code = code.replace(/\r\n/g, '\n');

// 1. ADD STATE HOOKS
if (!code.includes('const [codingAnswers, setCodingAnswers]')) {
  const stateHookAnchor = "const [code,         setCode]         = useState(() => getPersistedCode(getPersistedIdx(), getPersistedLang()));";
  if (code.includes(stateHookAnchor)) {
    code = code.replace(stateHookAnchor, stateHookAnchor + `
  const [codingAnswers, setCodingAnswers] = useState(() => {
    const s = localStorage.getItem(key(candidateId, driveId, roundId, 'codingAnswers'));
    return s ? JSON.parse(s) : {};
  });
  const [isSavingQ, setIsSavingQ] = useState(false);
  
  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'codingAnswers'), JSON.stringify(codingAnswers));
  }, [codingAnswers, candidateId, driveId, roundId]);
  `);
    console.log("State hooks added.");
  } else {
    console.log("Could not find state hook anchor.");
  }
} else {
  console.log("State hooks already exist, skipping.");
}

// 2. PATCH goToQuestion
if (!code.includes('// auto-save current\n      setCodingAnswers')) {
  const gotoAnchorStart = "const goToQuestion = (idx) => {";
  const gotoAnchorEnd = "setCurrentIdx(idx);\n  };";
  let startIdx = code.indexOf(gotoAnchorStart);
  let endIdx = code.indexOf(gotoAnchorEnd, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const newGoTo = `const goToQuestion = (idx) => {
      if (idx < 0 || idx >= codingQs.length) return;
      // auto-save current
      setCodingAnswers(prev => ({
        ...prev,
        [currentIdx]: { ...(prev[currentIdx] || {}), code, language, output }
      }));
      setCurrentIdx(idx);
      
      // load new
      setCodingAnswers(prev => {
        const saved = prev[idx];
        if (saved) {
          setCode(saved.code || '');
          if (saved.language) setLanguage(saved.language);
          setOutput(saved.output || null);
        } else {
          setCode('');
          setOutput(null);
        }
        return prev;
      });
    };`;
    code = code.substring(0, startIdx) + newGoTo + code.substring(endIdx + gotoAnchorEnd.length);
    console.log("goToQuestion patched.");
  } else {
    console.log("Could not find goToQuestion boundaries.");
  }
} else {
  console.log("goToQuestion already patched, skipping.");
}

// 3. ADD handleSaveQuestion & PATCH handleSubmit
if (!code.includes('const handleSaveQuestion = async ()')) {
  const submitAnchorStart = "const handleSubmit = useCallback(async () => {";
  const submitAnchorEnd = "}, [code, language, currentCodingQ, examType, isSubmitting, submitted, mcqAnswers, questions]);";
  let startIdx = code.indexOf(submitAnchorStart);
  let endIdx = code.indexOf(submitAnchorEnd, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const newSubmitBlock = `const handleSaveQuestion = async () => {
    if (isSavingQ || submitted) return;
    setIsSavingQ(true);
    
    const hiddenTcs  = currentCodingQ?.hiddenTestcases  || [];
    const visibleTcs = currentCodingQ?.visibleTestcases || [];
    const allTcs     = [...visibleTcs, ...hiddenTcs];

    let passedCount = 0;
    let failedCount = 0;
    let totalRuntime = 0;
    let firstError = null;
    const questionResults = [];

    for (let i = 0; i < allTcs.length; i++) {
      const tc = allTcs[i];
      try {
        const t0   = Date.now();
        const data = await runSingle(code, language, tc.input);
        const rt   = Date.now() - t0;
        totalRuntime += rt;
        const res  = classifyResult(data);

        if (res.type !== 'OK') {
          failedCount++;
          if (!firstError) firstError = res.type;
          questionResults.push({ input: tc.input, expected: tc.expected, actual: '', status: res.type });
        } else {
          const got = res.output;
          if (got === tc.expected.trim()) {
            passedCount++;
            questionResults.push({ input: tc.input, expected: tc.expected, actual: got, status: 'Pass' });
          } else {
            failedCount++;
            questionResults.push({ input: tc.input, expected: tc.expected, actual: got, status: 'Fail' });
          }
        }
      } catch {
        questionResults.push({ tcIdx: i, input: tc.input, expected: tc.expected, type: 'NetworkError', message: 'Network error', status: 'Error' });
      }
    }

    const total = allTcs.length;
    const passPercentage = total > 0 ? Math.round((passedCount / total) * 100) : 0;
    const isAccepted = passedCount === total;
    let verdict = isAccepted ? 'Accepted' : (firstError || 'Wrong Answer');
    if (total === 0) verdict = 'No Testcases';

    setCodingAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        code,
        language,
        output: questionResults,
        metrics: {
           passedCount,
           totalTestcases: total,
           passPercentage,
           runtime: total > 0 ? Math.round(totalRuntime / total) + 'ms' : '0ms',
           verdict
        }
      }
    }));
    
    setOutput(questionResults);
    setActiveTab('result');

    const newToastId = ++toastIdRef.current;
    setToasts(prev => [...prev, {
      id: newToastId,
      type: 'success',
      title: 'Problem ' + (currentIdx + 1) + ' Saved',
      message: 'Score: ' + passPercentage + '%. Progress secured.',
      timestamp: Date.now()
    }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToastId)), 4000);

    setIsSavingQ(false);
  };

  const handleSubmit = useCallback(async () => {
      if (isSubmitting || submitted) return;
      setIsSubmitting(true);
  
      let timeTaken = \`\${Math.floor((Date.now() - startTime.current) / 60000)}m\`;
  
      if (examType === 'mcq') {
        const mcqQs = questions.filter(q => q.type === 'mcq');
        const correct = mcqQs.filter(q => mcqAnswers[q.id] === q.answer).length;
        let score = mcqQs.length > 0 ? Math.round((correct / mcqQs.length) * 100) : 0;
        submitRound(candidateId, driveId, roundId, score, Math.round(score * 0.95), timeTaken);
        setSubmitted(true);
        setIsSubmitting(false);
        setTimeout(() => navigate('/candidate/home'), 3000);
        return;
      }
  
      // Aggregation logic
      const questionsData = [];
      let combinedScore = 0;
      let combinedMaxScore = 0;
      
      // Auto-inject current active question if not saved yet
      const currentAnsState = codingAnswers[currentIdx];
      
      for (let i = 0; i < codingQs.length; i++) {
          const qData = (i === currentIdx && !currentAnsState?.metrics) ? { code, language } : (codingAnswers[i] || {});
          const qMetrics = qData.metrics || { passPercentage: 0, passedCount: 0, totalTestcases: 0, runtime: '0ms', verdict: 'Not Attempted' };
          
          combinedScore += qMetrics.passPercentage;
          combinedMaxScore += 100;
          
          questionsData.push({
             questionId: codingQs[i].id,
             title: codingQs[i].title,
             code: qData.code || '',
             language: qData.language || 'javascript',
             verdict: qMetrics.verdict,
             passedCount: qMetrics.passedCount,
             totalTestcases: qMetrics.totalTestcases,
             passPercentage: qMetrics.passPercentage,
             runtime: qMetrics.runtime,
             results: qData.output || []
          });
      }
      
      const finalScore = combinedMaxScore > 0 ? Math.round((combinedScore / combinedMaxScore) * 100) : 0;
      const finalCutoff = Math.round(finalScore * 0.95);
  
      submitRound(candidateId, driveId, roundId, finalScore, finalCutoff, timeTaken, {
          verdict: finalScore === 100 ? "Accepted" : (finalScore > 0 ? "Partial Accepted" : "Failed"),
          questionsData: questionsData
      });
  
      setSubmitResult({
        verdict: finalScore === 100 ? "Accepted" : (finalScore > 0 ? "Partial Accepted" : "Failed"),
        passedCount: questionsData.reduce((acc, q) => acc + q.passedCount, 0),
        totalTestcases: questionsData.reduce((acc, q) => acc + q.totalTestcases, 0),
        passPercentage: finalScore,
        runtime: "Aggregated",
        languageUsed: "Multiple"
      });
  
      setSubmitted(true);
      setIsSubmitting(false);
    }, [isSubmitting, submitted, examType, codingAnswers, codingQs, candidateId, driveId, roundId, submitRound, currentIdx, code, language, navigate, questions, mcqAnswers]);`;
    code = code.substring(0, startIdx) + newSubmitBlock + code.substring(endIdx + submitAnchorEnd.length);
    console.log("handleSaveQuestion added and handleSubmit patched.");
  } else {
    console.log("Could not find handleSubmit boundaries.");
  }
} else {
  console.log("handleSaveQuestion already exists, skipping.");
}

// 4. PATCH UI BUTTONS
if (!code.includes('Save Question')) {
  const runBtnAnchor = `          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running...' : 'Run'}
          </button>`;
  if (code.includes(runBtnAnchor)) {
    code = code.replace(runBtnAnchor, runBtnAnchor + `
          <button
            onClick={handleSaveQuestion}
            disabled={isSavingQ}
            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSavingQ ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
            Save Question
          </button>`);
    console.log("Save Question button added.");
  } else {
    console.log("Could not find run button anchor for UI buttons patch.");
  }
} else {
  console.log("Save Question button already exists, skipping.");
}

if (!code.includes('Final Submit Round')) {
  const submitBtnAnchor = `          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Send className="w-4 h-4" /> Submit
          </button>`;
  if (code.includes(submitBtnAnchor)) {
    code = code.replace(submitBtnAnchor, `          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Send className="w-4 h-4" /> Final Submit Round
          </button>`);
    console.log("Final Submit Round button patched.");
  } else {
    console.log("Could not find submit button anchor.");
  }
} else {
  console.log("Final Submit Round button already patched, skipping.");
}

// 5. Add Grid Colors for Problem Grid
if (!code.includes('const sAns = codingAnswers[idx];')) {
  const gridBlockStart = "{codingQs.map((q, idx) => {";
  const gridBlockEnd = "</div>";
  let startIdx = code.indexOf(gridBlockStart);
  let endIdx = code.indexOf(gridBlockEnd, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    const newGrid = `{codingQs.map((q, idx) => {
                  const sAns = codingAnswers[idx];
                  let bgColor = 'bg-white/5 text-slate-400 hover:bg-white/10';
                  if (sAns?.metrics) {
                     if (sAns.metrics.passPercentage === 100) bgColor = 'bg-green-500/20 text-green-400 border border-green-500/30';
                     else if (sAns.metrics.passPercentage > 0) bgColor = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
                     else bgColor = 'bg-red-500/20 text-red-400 border border-red-500/30';
                  }
                  if (idx === currentIdx) bgColor = 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20';
                  
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
                      className={\`w-8 h-8 rounded-lg text-xs font-bold transition-all \${bgColor}\`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>`;
    code = code.substring(0, startIdx) + newGrid + code.substring(endIdx + gridBlockEnd.length);
    console.log("Grid colors patched.");
  } else {
    console.log("Could not find grid block boundaries.");
  }
} else {
  console.log("Grid colors already patched, skipping.");
}

fs.writeFileSync(envPath, code);
console.log("CandidateCodingEnv multi-question patch complete.");
