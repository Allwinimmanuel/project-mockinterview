const fs = require('fs');

const envPath = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/CandidateCodingEnv.jsx';
const detailsPath = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/RoundDetails.jsx';

// 1. Patch CandidateCodingEnv.jsx
let envCode = fs.readFileSync(envPath, 'utf8');

const oldSubmitStart = "      // 📝 Coding: evaluate all hidden testcases";
const oldSubmitEnd = "submitRound(candidateId, driveId, roundId, score, Math.round(score * 0.95), timeTaken, metrics);";

let startIdx = envCode.indexOf(oldSubmitStart);
let endIdx = envCode.indexOf(oldSubmitEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newSubmitLogic = `      // 📝 Coding: evaluate all hidden testcases for ALL questions
      let totalPassedCount = 0;
      let totalFailedCount = 0;
      let totalRuntime = 0;
      let totalTestcasesAcrossAll = 0;
      let totalScoreAcc = 0;
      const questionsData = [];

      for (let qIdx = 0; qIdx < codingQs.length; qIdx++) {
        const q = codingQs[qIdx];
        const savedCode = localStorage.getItem(key(candidateId, driveId, roundId, \`code_\${qIdx}_\${language}\`)) || code;
        
        const hiddenTcs  = q?.hiddenTestcases  || [];
        const visibleTcs = q?.visibleTestcases || [];
        const allTcs     = [...visibleTcs, ...hiddenTcs];

        let qPassedCount = 0;
        let qFailedCount = 0;
        let qTotalRuntime = 0;
        let firstError = null;
        const questionResults = [];

        for (let i = 0; i < allTcs.length; i++) {
          const tc = allTcs[i];
          try {
            const t0   = Date.now();
            const data = await runSingle(savedCode, language, tc.input);
            const rt   = Date.now() - t0;
            qTotalRuntime += rt;
            const res  = classifyResult(data);

            if (res.type !== 'OK') {
              qFailedCount++;
              if (!firstError) firstError = res.type;
              questionResults.push({ input: tc.input, expected: tc.expected, actual: '', status: res.type });
            } else {
              const got = res.output;
              if (got === tc.expected.trim()) {
                qPassedCount++;
                questionResults.push({ input: tc.input, expected: tc.expected, actual: got, status: 'Pass' });
              } else {
                qFailedCount++;
                questionResults.push({ input: tc.input, expected: tc.expected, actual: got, status: 'Fail' });
              }
            }
          } catch {
            qFailedCount++;
            if (!firstError) firstError = 'NetworkError';
            questionResults.push({ input: tc.input, expected: tc.expected, actual: '', status: 'NetworkError' });
          }
        }

        const qTotal = allTcs.length || 1;
        const qPassPercent = Math.round((qPassedCount / qTotal) * 100);
        const qAvgRuntime = qTotal > 0 ? Math.round(qTotalRuntime / qTotal) : 0;
        
        let qVerdict = 'Failed';
        if      (qPassedCount === qTotal) qVerdict = 'Accepted';
        else if (qPassedCount > 0)       qVerdict = 'Partially Passed';
        else if (firstError === 'CompilationError') qVerdict = 'Compilation Error';
        else if (firstError === 'TimeLimitExceeded') qVerdict = 'Time Limit Exceeded';
        else if (firstError === 'MemoryLimitExceeded') qVerdict = 'Memory Limit Exceeded';
        else if (firstError === 'RuntimeError')     qVerdict = 'Runtime Error';

        totalPassedCount += qPassedCount;
        totalFailedCount += qFailedCount;
        totalTestcasesAcrossAll += qTotal;
        totalRuntime += qTotalRuntime;
        totalScoreAcc += qPassPercent;

        questionsData.push({
          questionId: q.id,
          questionTitle: q.title || \`Question \${qIdx + 1}\`,
          codeSubmitted: savedCode,
          runtime: \`\${qAvgRuntime}ms\`,
          passedCount: qPassedCount,
          failedCount: qFailedCount,
          totalTestcases: qTotal,
          passPercentage: qPassPercent,
          verdict: qVerdict,
          questionResults: questionResults
        });
      }

      const finalAvgScore = Math.round(totalScoreAcc / codingQs.length);
      score = finalAvgScore;
      const finalAvgRuntime = totalTestcasesAcrossAll > 0 ? Math.round(totalRuntime / totalTestcasesAcrossAll) : 0;
      
      let finalVerdict = 'Failed';
      if (totalPassedCount === totalTestcasesAcrossAll) finalVerdict = 'Accepted';
      else if (totalPassedCount > 0) finalVerdict = 'Partially Passed';

      const metrics = {
        languageUsed:    language,
        codeSubmitted:   questionsData[0]?.codeSubmitted || code, // fallback for legacy logic
        runtime:         \`\${finalAvgRuntime}ms\`,
        memoryUsage:     'N/A',
        passPercentage:  finalAvgScore,
        passedCount:     totalPassedCount,
        failedCount:     totalFailedCount,
        totalTestcases:  totalTestcasesAcrossAll,
        verdict:         finalVerdict,
        submissionTime:  new Date().toISOString(),
        questionResults: questionsData[0]?.questionResults || [], // fallback
        questionsData:   questionsData, // NEW multi-question array
        warnings:        warningCount,
        warningLogs:     warningLogs,
      };

      `;
  
  envCode = envCode.substring(0, startIdx) + newSubmitLogic + envCode.substring(endIdx);
  fs.writeFileSync(envPath, envCode);
  console.log("CandidateCodingEnv patched successfully");
} else {
  console.log("Failed to find boundaries in CandidateCodingEnv");
}

// 2. Patch RoundDetails.jsx
let detailsCode = fs.readFileSync(detailsPath, 'utf8');

const oldModalCodeStart = "{/* Code */}";
const oldModalCodeEnd = "{/* Warning Logs */}";

startIdx = detailsCode.indexOf(oldModalCodeStart);
endIdx = detailsCode.indexOf(oldModalCodeEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newModalLogic = `{/* Questions Loop */}
        {m.questionsData ? (
          <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-6">
            {m.questionsData.map((q, idx) => (
              <div key={idx} className="bg-black/30 border border-white/5 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b] border-b border-white/5">
                  <div className="font-bold text-white text-sm">{q.questionTitle}</div>
                  <div className="flex items-center gap-3">
                    <VerdictBadge verdict={q.verdict} />
                    <div className="text-xs text-slate-400 font-semibold">{q.passPercentage}% Score</div>
                    <div className="text-xs text-slate-400 font-semibold">{q.passedCount}/{q.totalTestcases} Passed</div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Candidate Code</p>
                  <pre className="p-4 bg-black/50 rounded-lg font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed border border-white/5">
                    {q.codeSubmitted}
                  </pre>
                </div>
                {q.questionResults && q.questionResults.length > 0 && (
                  <div className="px-4 pb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Testcase Breakdown</p>
                    <div className="space-y-1.5 bg-[#0f172a] p-3 rounded-lg border border-white/5 max-h-40 overflow-y-auto">
                      {q.questionResults.map((qr, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs p-1.5 rounded hover:bg-white/5 transition-colors">
                          <span className={qr.status === 'Pass' ? 'text-green-400 font-bold w-16 shrink-0' : 'text-red-400 font-bold w-16 shrink-0'}>
                            {qr.status === 'Pass' ? '✅ Pass' : \`❌ \${qr.status}\`}
                          </span>
                          <span className="text-slate-400 truncate flex-1 font-mono text-[10px]">in: {String(qr.input).replace(/\\n/g,' ')}</span>
                          {qr.status !== 'Pass' && <span className="text-slate-500 shrink-0 font-mono text-[10px]">got: <span className="text-red-300">{qr.actual || '—'}</span></span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Legacy Fallback for older submissions without questionsData array */}
            {m.codeSubmitted && (
              <pre className="p-5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {m.codeSubmitted}
              </pre>
            )}
            {m.questionResults && m.questionResults.length > 0 && (
              <div className="border-t border-white/10 px-6 py-4 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Testcase Results</p>
                <div className="space-y-1">
                  {m.questionResults.map((qr, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className={qr.status === 'Pass' ? 'text-green-400 font-bold w-16 shrink-0' : 'text-red-400 font-bold w-16 shrink-0'}>
                        {qr.status === 'Pass' ? '✅ Pass' : \`❌ \${qr.status}\`}
                      </span>
                      <span className="text-slate-500 truncate">in: {String(qr.input).replace(/\\n/g,' ').substring(0,60)}</span>
                      {qr.status !== 'Pass' && <span className="text-slate-500 shrink-0">got: <span className="text-red-300">{qr.actual || '—'}</span></span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        `;
        
  detailsCode = detailsCode.substring(0, startIdx) + newModalLogic + detailsCode.substring(endIdx);
  fs.writeFileSync(detailsPath, detailsCode);
  console.log("RoundDetails patched successfully");
} else {
  console.log("Failed to find boundaries in RoundDetails");
}
