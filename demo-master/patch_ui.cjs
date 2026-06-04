const fs = require('fs');

const envPath = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/CandidateCodingEnv.jsx';
let code = fs.readFileSync(envPath, 'utf8');

// 1. Patch CameraPIP
const oldPipStart = "// ── CAMERA PIP with face detection status ──────────────────────────────";
const oldPipEnd = "// ── No questions fallback ──────────────────────────────────────────────────";

let startIdx = code.indexOf(oldPipStart);
let endIdx = code.indexOf(oldPipEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newPip = `// ── CAMERA PIP with face detection status ──────────────────────────────
  const CameraPIP = ['3', '4', '5'].includes(String(roundId)) && (
    <div className={\`fixed bottom-6 right-6 z-[9999] bg-black rounded-xl shadow-2xl overflow-hidden w-64 h-48 border-4 transition-colors duration-300 \${
      faceDetected ? 'border-green-500/80 shadow-green-500/20' : 'border-red-500/80 shadow-red-500/40'
    }\`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      <canvas ref={canvasRef} className="hidden" />
      {/* Face detection status badge */}
      <div className={\`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 \${
        faceDetected
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
      }\`}>
        <span className={\`w-2 h-2 rounded-full animate-pulse \${faceDetected ? 'bg-green-500' : 'bg-red-500'}\`}></span>
        {faceDetected ? 'Face Detected' : 'No Face / Looking Away'}
      </div>
      {/* AI Proctor label */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> AI Proctor
      </div>
      {/* Status bar at bottom */}
      <div className={\`absolute bottom-0 left-0 right-0 h-1.5 \${faceDetected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}\`} />
    </div>
  );

  `;
  code = code.substring(0, startIdx) + newPip + code.substring(endIdx);
  console.log("CandidateCodingEnv patched CameraPIP successfully.");
}

// 2. Patch Fullscreen Overlay inside the MCQ return
const oldReturnStart = "return (";
const oldReturnEnd = "{ToastNotifications}";

startIdx = code.indexOf(oldReturnStart, code.indexOf("// ── MCQ Exam"));
endIdx = code.indexOf(oldReturnEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newReturn = `return (
      <div className="min-h-screen bg-[#0b1121] font-sans flex flex-col relative">
      {!isFullscreen && ['3', '4', '5'].includes(String(roundId)) && (
        <div className="fixed inset-0 z-[99999] bg-[#0b1121]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
          <h1 className="text-3xl font-black text-white mb-4">Fullscreen Required</h1>
          <p className="text-slate-300 max-w-lg mb-8">
            This is an AI-proctored technical interview round. You must remain in fullscreen mode at all times. Exiting fullscreen will trigger a violation warning.
          </p>
          <button
            onClick={() => {
              document.documentElement.requestFullscreen().catch(err => {
                console.error("Fullscreen error:", err);
              });
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl shadow-2xl transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5" /> Enter Fullscreen to Continue
          </button>
        </div>
      )}
      `;
  
  code = code.substring(0, startIdx) + newReturn + code.substring(endIdx);
  console.log("CandidateCodingEnv patched Fullscreen overlay successfully.");
}


// 3. Patch Voice Transcription
const oldVoiceStart = "{answerMode === 'voice' ? (";
const oldVoiceEnd = ") : (";

startIdx = code.indexOf(oldVoiceStart);
endIdx = code.indexOf(oldVoiceEnd, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newVoiceLogic = `{answerMode === 'voice' ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <button
                          onClick={() => {
                            if (isListening) {
                              recognitionRef.current?.stop();
                              setIsListening(false);
                            } else {
                              try {
                                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                                if (!SpeechRecognition) {
                                  alert('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
                                  return;
                                }
                                const recognition = new SpeechRecognition();
                                recognition.continuous = true;
                                recognition.interimResults = true;
                                recognition.lang = 'en-US';
                                
                                recognition.onresult = (event) => {
                                  let transcript = '';
                                  for (let i = 0; i < event.results.length; i++) {
                                    transcript += event.results[i][0].transcript;
                                  }
                                  // Update text input area live instead of separate read-only box
                                  setMcqAnswers(prev => ({ ...prev, [\`\${currentQ?.id}_text\`]: transcript }));
                                };
                                
                                recognition.onerror = (e) => {
                                  console.error("Speech error", e.error);
                                  if (e.error !== 'no-speech') {
                                    setIsListening(false);
                                  }
                                };
                                
                                // Auto-restart if user hasn't clicked stop
                                recognition.onend = () => {
                                  if (recognitionRef.current && isListening) {
                                      try { recognition.start(); } catch (e) {}
                                  } else {
                                      setIsListening(false);
                                  }
                                };
                                
                                recognitionRef.current = recognition;
                                recognition.start();
                                setIsListening(true);
                              } catch (err) {
                                console.error('Speech recognition error:', err);
                                setIsListening(false);
                              }
                            }
                          }}
                          className={\`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl border-4 \${
                            isListening
                              ? 'bg-red-500/20 border-red-500 hover:bg-red-500/30 animate-pulse shadow-red-500/30 text-red-400'
                              : 'bg-blue-600 border-blue-500 hover:bg-blue-700 shadow-blue-500/30 text-white'
                          }\`}
                        >
                          {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                        </button>
                        <span className={\`text-sm font-semibold \${isListening ? 'text-red-400' : 'text-slate-500'}\`}>
                          {isListening ? '🔴 Recording... Speak now' : 'Click to start speaking'}
                        </span>
                        
                        {/* Live Transcription Box */}
                        <div className="w-full mt-4">
                          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                            <span>Live Transcription</span>
                            {isListening && <span className="text-red-400 animate-pulse">● Live</span>}
                          </div>
                          <textarea
                            value={mcqAnswers[\`\${currentQ?.id}_text\`] || ''}
                            onChange={(e) => setMcqAnswers(prev => ({ ...prev, [\`\${currentQ?.id}_text\`]: e.target.value }))}
                            placeholder="Your spoken words will appear here. You can manually edit this text..."
                            className="w-full bg-[#0a0f1f] border border-white/10 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-y min-h-[120px] font-sans"
                          />
                        </div>
                      </div>
                    `;
  code = code.substring(0, startIdx) + newVoiceLogic + code.substring(endIdx);
  console.log("CandidateCodingEnv patched Voice successfully.");
}

// 4. Update the Text Input block (just to make it look matching)
const oldTextStart = "<textarea";
const oldTextEnd = "/>";

startIdx = code.indexOf(oldTextStart, code.indexOf("answerMode === 'text'"));
endIdx = code.indexOf(oldTextEnd, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const newText = `<textarea
                          placeholder="Type your detailed answer here..."
                          value={mcqAnswers[\`\${currentQ?.id}_text\`] || ''}
                          onChange={(e) => setMcqAnswers(prev => ({ ...prev, [\`\${currentQ?.id}_text\`]: e.target.value }))}
                          className="w-full bg-[#0a0f1f] border border-white/10 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-y min-h-[160px] font-sans shadow-inner"
                        `;
  code = code.substring(0, startIdx) + newText + code.substring(endIdx);
  console.log("CandidateCodingEnv patched Text input successfully.");
}

fs.writeFileSync(envPath, code);
