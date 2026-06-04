import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Send, Play, CheckCircle2,
  Clock, AlertTriangle, Terminal, Code2, Loader2, ShieldCheck, Flag, Eraser, BookmarkCheck,
  Mic, MicOff, MessageSquare, X, Menu, Square, RefreshCw, Maximize
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useDrives } from '../contexts/DriveContext';
import { useAuth } from '../contexts/AuthContext';
import * as faceapi from '@vladmandic/face-api';
import { generateTechnicalMCQ, generateQuestions, generateQuestionsSeeded } from '../data/questionBank';
import { submitExam } from '../services/api';

// ── Piston language map ────────────────────────────────────────────────────────
const PISTON_LANGS = {
  javascript: { language: 'javascript', version: '*' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '*' },
  c: { language: 'c', version: '*' },
};

// ── Boilerplate starter code from Online-Compiler-main ────────────────────────
const LANGUAGE_BOILERPLATE = {
  javascript: `\nfunction processData(input){\n\t//write your code here\n}\n\nprocess.stdin.resume();\nprocess.stdin.setEncoding("ascii");\n_input = "";\nprocess.stdin.on("data", function (input) {\n\t_input += input;\n});\n\nprocess.stdin.on("end", function () {\n\tprocessData(_input);\n});`,
  python: `'''\n# Sample code to perform I/O:\n\ntry:\n\tname = input()\t\t# Reading input from STDIN\n\tprint('Hi, %s.' % name)\t\t# Writing output to STDOUT\nexcept EOFError as e:\n\tprint(e)\n'''\n\n# Write your code here`,
  java: `\n/*\n*uncomment this if you want to read input.\n//imports for BufferedReader\nimport java.io.BufferedReader;\nimport java.io.InputStreamReader;\n\n//import for Scanner and other utility classes\nimport java.util.*;\n*/\n\nclass Main {\n\tpublic static void main(String args[] ) throws Exception {\n\t/* Sample code to perform I/O:\n\t* Use either of these methods for input\n\t\t//BufferedReader\n\tBufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n\tString name = br.readLine();\t\t// Reading input from STDIN\n\tSystem.out.println("Hi, " + name +".");\t// Writing output to STDOUT\n\n\t//Scanner\n\tScanner s = new Scanner(System.in);\n\tString name = s.nextLine();\t\t// Reading input from STDIN\n\tSystem.out.println("Hi," + name + ".");\t// Writing output to STDOUT\n\n\t*/\n\t\n\t// Write your code here\n\t\n\t}\n}`,
  cpp: `\n// Sample code to perform I/O:\n\n#include <iostream>\n\nusing namespace std;\n\nint main() {\n\tint num;\n\tcin >> num;\t\t\t// Reading input from STDIN\n\tcout << "Input number is " << num << endl;\t// Writing output to STDOUT\n}\n\n\n// Write your code here`,
  c: `\n// Sample code to perform I/O:\n\n#include <stdio.h>\n\nint main() {\n\tint num;\n\tscanf("%d",&num);\t\t\t// Reading input from STDIN\n\tprintf("Input number is %d",num);\t// Writing output to STDOUT\n\treturn 0;\n}\n\n\n// Write your code here`
};

// ── Execute a single testcase via local compiler ────────────────────────────────
async function runSingle(code, language, stdin) {
  const res = await fetch('/api/compile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: language,
      code: code,
      stdin: stdin || '',
    }),
  });
  return res.json();
}

// ── Determine error type from Piston response ──────────────────────────────────
function classifyResult(data) {
  if (data.compile && data.compile.code !== 0) {
    return { type: 'CompilationError', message: data.compile.stderr || data.compile.output };
  }
  if (data.run) {
    if (data.run.signal === 'SIGKILL' || (data.run.wall_time && data.run.wall_time > 5000)) {
      return { type: 'TimeLimitExceeded', message: 'Time Limit Exceeded' };
    }
    if (data.run.memory && data.run.memory > 256 * 1024) {
      return { type: 'MemoryLimitExceeded', message: 'Memory Limit Exceeded' };
    }
    if (data.run.code !== 0 && (data.run.stderr || data.run.signal)) {
      return { type: 'RuntimeError', message: data.run.stderr || data.run.output };
    }
    return { type: 'OK', output: (data.run.stdout || data.run.output || '').trim() };
  }
  return { type: 'RuntimeError', message: 'Unknown error' };
}

// ── Persist Key builders ───────────────────────────────────────────────────────
const key = (candidateId, driveId, roundId, suffix) => `coding_${candidateId}_${driveId}_${roundId}_${suffix}`;

export default function CandidateCodingEnv() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Session ────────────────────────────────────────────────────────────────
  const session = JSON.parse(localStorage.getItem('active_candidate_session') || '{}');
  const driveId = session.driveId || 'drv-001';
  const candidateId = session.id || 'CAND-0000';

  const { submitRound, roundSchedules, isCandidateEligible, hasCandidateSubmittedRound, updateCandidateStatus } = useDrives();

  // ── Determine active schedule ──────────────────────────────────────────────
  let activeSchedule = null;
  const driveSchedules = roundSchedules[driveId];
  if (driveSchedules) {
    const ids = Object.keys(driveSchedules).sort((a, b) => Number(a) - Number(b));
    for (const id of ids) {
      if (isCandidateEligible(user?.email, driveId, id)) {
        if (!hasCandidateSubmittedRound(user?.email, driveId, id)) {
          activeSchedule = driveSchedules[id];
          break;
        }
      }
    }
  }

  const roundId = activeSchedule?.roundId || '1';
  const isProctoredRound = ['3', '4', '5'].includes(String(roundId));

  // Round 3/4/5 are MCQ-based technical/interview rounds
  const ROUND_TYPE_MAP = { '1': 'aptitude', '2': 'coding', '3': 'technical_ai', '4': 'interview', '5': 'interview' };
  const roundMetaType = ROUND_TYPE_MAP[String(roundId)] || 'aptitude';
  const isTechnicalAI = roundMetaType === 'technical_ai';
  const isMCQRound = ['3', '4', '5'].includes(String(roundId));

  // Load questions — with candidate-specific seeded randomization for aptitude/coding rounds
  const storedQuestions = activeSchedule?.questions || [];
  const questions = (() => {
    const isCoding = roundMetaType === 'coding';
    const isAptitude = roundMetaType === 'aptitude';
    
    // For coding and aptitude rounds, we strictly want each candidate to get different questions.
    if (activeSchedule && (isCoding || isAptitude)) {
      const count = isCoding
        ? (Number(activeSchedule.numQuestions) || 2)
        : (Number(activeSchedule.totalQuestions) || 15);
      
      // Build a pool of questions (either from the scheduled/selected list, or dynamically from topics)
      let pool = [];
      if (activeSchedule.questionAssignmentMode === 'manual' && storedQuestions && storedQuestions.length > 0) {
        pool = storedQuestions;
      } else {
        pool = generateQuestionsSeeded(activeSchedule.topics || {}, 9999, isCoding, candidateId);
      }
      
      if (pool.length > 0) {
        // Deterministically seed and shuffle the pool for this candidate based on candidateId
        let h = 0;
        const seedStr = String(candidateId);
        for (let i = 0; i < seedStr.length; i++) {
          h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
        }
        const seededRandom = () => {
          let t = h += 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const shuffled = [...pool].sort(() => seededRandom() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
      }
    }

    if (storedQuestions.length > 0) return storedQuestions;
    if (!activeSchedule) return [];
    // Fallback: regenerate on the fly for MCQ rounds
    if (isMCQRound) {
      const count = Number(activeSchedule.totalQuestions) || Number(activeSchedule.numQuestions) || 15;
      return generateTechnicalMCQ(activeSchedule.topics || {}, count, activeSchedule.difficulty);
    }
    // Fallback: regenerate for aptitude/coding rounds
    const count = Number(activeSchedule.numQuestions) || 5;
    const generated = generateQuestions(activeSchedule.topics || {}, count, isCoding);
    return generated.length > 0 ? generated : generateQuestions({}, count, isCoding);
  })();

  const hasCoding = !isMCQRound && questions.some(q => q.type === 'coding');
  const examType = hasCoding ? 'coding' : 'mcq';

  // Enforce the interviewer's numQuestions cap — prevents stale localStorage
  // from showing more questions than the interviewer actually configured.
  const allCodingQs = questions.filter(q => q.type === 'coding');
  const configuredCount = Number(activeSchedule?.numQuestions) || allCodingQs.length;
  const codingQs = allCodingQs.slice(0, configuredCount);


  // ── Restore persisted state ────────────────────────────────────────────────
  const getPersistedIdx = () => Number(localStorage.getItem(key(candidateId, driveId, roundId, 'idx')) || 0);
  const getPersistedLang = () => localStorage.getItem(key(candidateId, driveId, roundId, 'lang')) || 'javascript';
  const getPersistedTime = () => {
    const saved = localStorage.getItem(key(candidateId, driveId, roundId, 'timer'));
    if (saved) return Number(saved);
    return (activeSchedule?.duration || 60) * 60;
  };
  const getPersistedCode = (idx, lang) => {
    const saved = localStorage.getItem(key(candidateId, driveId, roundId, `code_${idx}_${lang}`));
    return saved || codingQs[idx]?.starterCode?.[lang] || LANGUAGE_BOILERPLATE[lang] || '// Write your solution here\n';
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(getPersistedIdx);
  const currentQ = questions[currentIdx];
  const [language, setLanguage] = useState(getPersistedLang);
  const [code, setCode] = useState(() => getPersistedCode(getPersistedIdx(), getPersistedLang()));
  const [codingAnswers, setCodingAnswers] = useState(() => {
    const s = localStorage.getItem(key(candidateId, driveId, roundId, 'codingAnswers'));
    return s ? JSON.parse(s) : {};
  });
  const [isSavingQ, setIsSavingQ] = useState(false);

  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'codingAnswers'), JSON.stringify(codingAnswers));
  }, [codingAnswers, candidateId, driveId, roundId]);

  const [mcqAnswers, setMcqAnswers] = useState(() => {
    const s = localStorage.getItem(key(candidateId, driveId, roundId, 'mcq'));
    return s ? JSON.parse(s) : {};
  });

  // NPTEL-style question status:
  // not_visited | not_answered | answered | marked_for_review | answered_marked_for_review
  const [mcqStatus, setMcqStatus] = useState(() => {
    const s = localStorage.getItem(key(candidateId, driveId, roundId, 'mcq_status'));
    return s ? JSON.parse(s) : {};
  });

  const [clearMsg, setClearMsg] = useState(false);
  const [output, setOutput] = useState(null); // stores array of testcase results or simple string
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(getPersistedTime);
  const [activeTab, setActiveTab] = useState('testcases');

  // ── AI Camera State ────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // persists stream across review-page toggles
  const faceCheckIntervalRef = useRef(null);
  const faceAbsenceTimerRef = useRef(null);
  const multiFaceTimerRef = useRef(null);
  const noFaceStartRef = useRef(null);
  const multiFaceStartRef = useRef(null);
  const phoneStartRef = useRef(null);
  const distractionStartRef = useRef(null);
  const warningIssuedRef = useRef({});
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [proctoringStatus, setProctoringStatus] = useState("safe");
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [redirectCountdown, setRedirectCountdown] = useState(7);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    }
  };

  // ── Voice / Text answer state (Rounds 3-5) ──────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [answerMode, setAnswerMode] = useState('text'); // 'voice' | 'text'
  const recognitionRef = useRef(null);

  // ── Round 4 Voice State ──────────────────────────────────────────────────
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recognizedText, setRecognizedText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const isCommunicationRound = String(roundId) === '4';

  // ── Toast Notifications State ───────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  // ── Malpractice State ──────────────────────────────────────────────────────
  const [warningCount, setWarningCount] = useState(() => Number(localStorage.getItem(key(candidateId, driveId, roundId, 'warnings'))) || 0);
  const [alertsCount, setAlertsCount] = useState(() => Number(localStorage.getItem(key(candidateId, driveId, roundId, 'alertsCount'))) || 0);
  
  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'alertsCount'), alertsCount);
  }, [alertsCount, candidateId, driveId, roundId]);

  const [warningLogs, setWarningLogs] = useState(() => {
    const s = localStorage.getItem(key(candidateId, driveId, roundId, 'warningLogs'));
    return s ? JSON.parse(s) : [];
  });
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [latestWarning, setLatestWarning] = useState("");
  const isRound1or2 = ['1', '2'].includes(String(roundId));
  const isTerminated = warningCount >= 3;
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [showReviewPage, setShowReviewPage] = useState(false);

  const startTime = useRef(Date.now());

  const stopProctoring = () => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
    if (faceAbsenceTimerRef.current) {
      clearTimeout(faceAbsenceTimerRef.current);
      faceAbsenceTimerRef.current = null;
    }
    if (multiFaceTimerRef.current) {
      clearTimeout(multiFaceTimerRef.current);
      multiFaceTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Failed to stop speech recognition cleanly:', e);
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
    setIsRecordingAudio(false);
    setCameraActive(false);
    setFaceDetected(true);
  };

  // ── Persist index / language / timer ────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'idx'), currentIdx);
  }, [currentIdx]);

  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'lang'), language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'mcq'), JSON.stringify(mcqAnswers));
  }, [mcqAnswers]);

  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'mcq_status'), JSON.stringify(mcqStatus));
  }, [mcqStatus]);

  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'warnings'), warningCount);
  }, [warningCount]);

  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, 'warningLogs'), JSON.stringify(warningLogs));
  }, [warningLogs]);

  // ── Persist code whenever it changes ────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(key(candidateId, driveId, roundId, `code_${currentIdx}_${language}`), code);
  }, [code]);

  // ── On question or language change → restore persisted code ─────────────────
  useEffect(() => {
    if (examType === 'coding') {
      setCode(getPersistedCode(currentIdx, language));
      setOutput('');
      setActiveTab('testcases');
    }
  }, [currentIdx, language]);

  // ── Auto-mark first MCQ question as visited on mount ─────────────────────────
  useEffect(() => {
    if (examType === 'mcq') {
      markVisited(currentIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reattach camera stream when returning from review page ───────────────────
  // When showReviewPage was true the <video> element unmounts; when it becomes
  // false the element remounts but its srcObject is null → black feed.
  // This effect reattaches the existing stream without restarting the camera.
  useEffect(() => {
    if (!showReviewPage && streamRef.current && videoRef.current) {
      if (!videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [showReviewPage]);

  // ── Auto-speak question for Round 4 ──────────────────────────────────────────
  const handleReplayQuestion = () => {
    if (currentQ?.q) {
      window.speechSynthesis.cancel(); // stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(currentQ.q);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (isCommunicationRound && currentQ) {
      handleReplayQuestion();
    }
    return () => window.speechSynthesis.cancel();
  }, [currentIdx, currentQ, isCommunicationRound]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        // Save the presence of audio to mcqAnswers so that the "Save & Next" logic marks it as answered
        setMcqAnswers(prev => ({ ...prev, [`${currentQ?.id}_audio`]: audioUrl }));
        
        // Stop all tracks to release the mic
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      };

      mediaRecorder.start();
      audioStreamRef.current = stream;
      
      // Initialize Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setRecognizedText(prev => prev + finalTranscript + interimTranscript);
          
          if (finalTranscript || interimTranscript) {
             const textKey = `${currentQ?.id}_text`;
             setMcqAnswers(prev => ({ 
               ...prev, 
               [textKey]: prev[textKey] ? prev[textKey] + finalTranscript + interimTranscript : finalTranscript + interimTranscript 
             }));
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
      
      setIsRecordingAudio(true);
      setRecognizedText('');
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for this round.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecordingAudio(false);
    }
  };


  // ── Timer ──────────────────────────────────────────────────────────────────
  const autoSubmitRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        localStorage.setItem(key(candidateId, driveId, roundId, 'timer'), next);
        if (next <= 0) {
          clearInterval(interval);
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleSubmit();
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // run once on mount

  useEffect(() => {
    if (submitted) {
      const interval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            navigate('/candidate/home');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [submitted, navigate]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getRedirectionText = () => {
    if (redirectCountdown > 1) {
      return `Redirecting to home in ${redirectCountdown - 1} seconds...`;
    }
    return "Directing to the home page...";
  };
  const isWarning = timeLeft < 300;

  // ── MCQ selection (stage only — does NOT lock status to 'answered') ────────
  const selectAnswer = (qId, optionIdx) => {
    setMcqAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  // ── Mark current question as visited when navigating to it ──────────────────
  const markVisited = (idx) => {
    const q = questions[idx];
    if (!q) return;
    setMcqStatus(prev => {
      const cur = prev[q.id];
      if (!cur || cur === 'not_visited') {
        return { ...prev, [q.id]: 'not_answered' };
      }
      return prev;
    });
  };

  // ── Navigate with visit tracking ──────────────────────────────────────────
  const goToMcq = (idx) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIdx(idx);
    markVisited(idx);
  };

  // ── Save & Next: lock status as 'answered' and advance ──────────────────────
  const handleSaveAndNext = () => {
    const q = questions[currentIdx];
    if (!q) return;
    const hasAnswer = mcqAnswers[q.id] !== undefined || 
                      (mcqAnswers[`${q.id}_text`] && mcqAnswers[`${q.id}_text`].trim().length > 0) ||
                      mcqAnswers[`${q.id}_audio`] !== undefined;
    if (hasAnswer) {
      setMcqStatus(prev => ({ ...prev, [q.id]: 'answered' }));
    } else {
      setMcqStatus(prev => ({ ...prev, [q.id]: 'not_answered' }));
    }
    if (currentIdx < questions.length - 1) goToMcq(currentIdx + 1);
  };

  // ── Mark for Review & Next ───────────────────────────────────────────────────
  const handleMarkForReview = () => {
    const q = questions[currentIdx];
    if (!q) return;
    const hasAnswer = mcqAnswers[q.id] !== undefined || 
                      (mcqAnswers[`${q.id}_text`] && mcqAnswers[`${q.id}_text`].trim().length > 0) ||
                      mcqAnswers[`${q.id}_audio`] !== undefined;
    setMcqStatus(prev => ({
      ...prev,
      [q.id]: hasAnswer ? 'answered_marked_for_review' : 'marked_for_review',
    }));
    if (currentIdx < questions.length - 1) goToMcq(currentIdx + 1);
  };

  // ── Clear Answer ─────────────────────────────────────────────────────────────
  const handleClearAnswer = () => {
    const q = questions[currentIdx];
    if (!q) return;
    const hasAnswer = mcqAnswers[q.id] !== undefined || 
                      (mcqAnswers[`${q.id}_text`] && mcqAnswers[`${q.id}_text`].trim().length > 0) ||
                      mcqAnswers[`${q.id}_audio`] !== undefined;
    if (!hasAnswer) return;

    setMcqAnswers(prev => {
      const next = { ...prev };
      delete next[q.id];
      delete next[`${q.id}_text`];
      delete next[`${q.id}_audio`];
      return next;
    });
    setMcqStatus(prev => ({
      ...prev,
      [q.id]: prev[q.id] === 'answered_marked_for_review' ? 'marked_for_review' : 'not_answered',
    }));
    setClearMsg(true);
    setTimeout(() => setClearMsg(false), 2000);
  };

  // ── Current coding question ────────────────────────────────────────────────
  const currentCodingQ = codingQs[currentIdx] || codingQs[0];

  // ── RUN: visible testcases only ────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveTab('result');
    setOutput([{ status: 'Running...' }]);

    const visibleTcs = currentCodingQ?.visibleTestcases || [];

    // Fallback: no testcases — just run free
    if (visibleTcs.length === 0) {
      try {
        const data = await runSingle(code, language, '');
        const res = classifyResult(data);
        setOutput([{
          isFallback: true,
          status: res.type === 'OK' ? 'Finished' : 'Error',
          type: res.type,
          actual: res.type === 'OK' ? (res.output || '(no output)') : res.message
        }]);
      } catch {
        setOutput([{ isFallback: true, status: 'Error', type: 'NetworkError', actual: '⚠ Could not connect to compiler.' }]);
      }
      setIsRunning(false);
      return;
    }

    const results = [];
    let passed = 0;

    for (let i = 0; i < visibleTcs.length; i++) {
      const tc = visibleTcs[i];
      try {
        const data = await runSingle(code, language, tc.input);
        const res = classifyResult(data);

        if (res.type !== 'OK') {
          results.push({
            tcIdx: i,
            input: tc.input,
            expected: tc.expected,
            actual: '',
            type: res.type,
            message: res.message,
            status: 'Error'
          });
          continue;
        }

        const got = res.output;
        const expected = tc.expected.trim();
        if (got === expected) {
          passed++;
          results.push({ tcIdx: i, input: tc.input, expected, actual: got, type: 'OK', status: 'Pass' });
        } else {
          results.push({ tcIdx: i, input: tc.input, expected, actual: got, type: 'OK', status: 'Fail' });
        }
      } catch {
        results.push({ tcIdx: i, input: tc.input, expected: tc.expected, type: 'NetworkError', message: 'Network error', status: 'Error' });
      }
    }

    setOutput(results);
    setIsRunning(false);
  }, [code, language, currentCodingQ, isRunning]);

  // ── TERMINATE: Malpractice detected ────────────────────────────────────────
  const handleMalpractice = useCallback((reason) => {
    if (isSubmitting || submitted) return;

    // Cooldown check: prevent multiple triggers within 2 seconds
    const now = Date.now();
    const lastLog = warningLogs.length > 0 ? warningLogs[warningLogs.length - 1] : null;
    if (lastLog && (now - new Date(lastLog.time).getTime()) < 2000) {
      return;
    }

    const currentWarnings = warningCount + 1;
    const newLog = { time: new Date().toISOString(), reason: reason, count: currentWarnings };

    setWarningCount(currentWarnings);
    setWarningLogs(prev => [...prev, newLog]);
    setLatestWarning(reason);

    setShowWarningModal(true);

    const terminated = currentWarnings >= 3;

    if (terminated) {
      if (updateCandidateStatus && candidateId && driveId) {
        updateCandidateStatus(candidateId, driveId, roundId, 'Disqualified');
      }
      submitRound(candidateId, driveId, roundId, 0, 0, "0m", {
        verdict: "Disqualified",
        reason: reason,
        warnings: currentWarnings,
        warningLogs: [...warningLogs, newLog]
      });
    }
  }, [candidateId, driveId, roundId, isSubmitting, submitted, submitRound, updateCandidateStatus, warningCount, warningLogs]);

  const handleMalpracticeRef = useRef(handleMalpractice);
  useEffect(() => {
    handleMalpracticeRef.current = handleMalpractice;
  }, [handleMalpractice]);

  const handleProctoringAlert = useCallback((reason) => {
    if (isSubmitting || submitted) return;

    // Cooldown check: prevent multiple triggers within 2 seconds
    const now = Date.now();
    const lastLog = warningLogs.length > 0 ? warningLogs[warningLogs.length - 1] : null;
    if (lastLog && (now - new Date(lastLog.time).getTime()) < 2000) {
      return;
    }

    setAlertsCount(prev => {
      const nextAlerts = prev + 1;
      
      // Toast notification for the alert so they see it instantly!
      const newToastId = Date.now();
      setToasts(t => [...t, { id: newToastId, title: 'Proctoring Alert', message: reason, type: 'warning' }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newToastId)), 5000);
      
      // Log the alert in warningLogs as a proctoring alert
      const newLog = { 
        time: new Date().toISOString(), 
        reason: `[Alert #${nextAlerts}] ${reason}`, 
        count: warningCount 
      };
      setWarningLogs(w => [...w, newLog]);

      // If it reaches a multiple of 3, trigger the warning dialog box!
      if (nextAlerts % 3 === 0) {
        setToasts([]); // Clear all small toast notifications so only the big dialog is seen!
        handleMalpractice(`AI Camera Proctoring: 3 camera detection red-light events occurred. counted as 1 warning.`);
      }
      
      return nextAlerts;
    });
  }, [warningCount, handleMalpractice, warningLogs, isSubmitting, submitted]);

  const handleProctoringAlertRef = useRef(handleProctoringAlert);
  useEffect(() => {
    handleProctoringAlertRef.current = handleProctoringAlert;
  }, [handleProctoringAlert]);

  // ── STRICT PROCTORING EVENT LISTENERS ──────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleMalpracticeRef.current("Tab switching or browser minimize detected.");
      }
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      handleMalpracticeRef.current("Copying, pasting, and cutting are strictly prohibited.");
    };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (e.key === 'PrintScreen' || e.key === 'F12' || e.key === 'Meta' || e.key === 'OS') {
        e.preventDefault();
        handleMalpracticeRef.current("Restricted key press detected.");
      }
      if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'v' || key === 'x' || key === 'a' || key === 'p')) {
        e.preventDefault();
        handleMalpracticeRef.current("Restricted keyboard shortcut (Copy/Paste/Print/Select All) detected.");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 's')) {
        e.preventDefault();
        handleMalpracticeRef.current("Restricted developer tools shortcut detected.");
      }
      if (e.metaKey && e.shiftKey && key === 's') {
        e.preventDefault();
        handleMalpracticeRef.current("Screenshots are not allowed.");
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleMalpracticeRef.current("Screenshots are not allowed.");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        handleMalpracticeRef.current("Exiting full screen mode is strictly prohibited.");
      } else {
        setIsFullscreen(true);
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      handleMalpracticeRef.current("Right-click context menu is not allowed.");
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // ── AI PROCTORING (Rounds 3-5) ─────────────────────────────────────────────
  useEffect(() => {
    if (!isProctoredRound) return;

    let isCancelled = false;

    const NO_FACE_INDICATOR_MS = 8000;
    const NO_FACE_WARNING_MS = 30000; // Increased to 30s to avoid conflicts with Python AI Engine
    const MULTI_FACE_INDICATOR_MS = 8000;
    const MULTI_FACE_WARNING_MS = 30000; // Increased to 30s
    const MIN_FACE_CONFIDENCE = 0.55;

    const initCamera = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        // If unmounted or already submitted while awaiting camera
        if (isCancelled || submitted || isSubmitting || isTerminated) {
          localStream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = localStream; // persist so we can reattach after review page
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        setCameraActive(true);

        // Load face-api models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
        console.log("Face API models loaded successfully");

        faceCheckIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          const video = videoRef.current;

          if (video.paused || video.ended) return;

          // Check if camera stream is active and enabled
          const track = streamRef.current?.getVideoTracks()[0];
          if (!track || !track.enabled || track.readyState === 'ended') {
            if (!warningIssuedRef.current["camera_disabled"]) {
              warningIssuedRef.current["camera_disabled"] = true;
              handleMalpracticeRef.current("AI Proctoring: Camera stream is disabled or unavailable. Camera feed is mandatory.");
            }
            return;
          } else {
            warningIssuedRef.current["camera_disabled"] = false;
          }

          let numFaces = 1;
          let isFocused = true;
          let gazeSafe = true;
          let suspiciousObjects = [];
          let useFallback = true;

          try {
            const canvas = canvasRef.current;
            if (canvas && video) {
              canvas.width = 320;
              canvas.height = 240;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64Image = canvas.toDataURL('image/jpeg', 0.6);

              // POST the captured frame to the local Python AI server for processing
              const res = await fetch("http://localhost:5001/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: base64Image })
              });
              if (res.ok) {
                const data = await res.json();
                numFaces = data.num_faces;
                isFocused = data.is_focused;
                gazeSafe = data.gaze_safe;
                suspiciousObjects = data.suspicious_objects || [];
                useFallback = false;
              }
            }
          } catch (e) {
            useFallback = true;
          }

          if (useFallback) {
            // Browser-based face-api.js fallback
            try {
              const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true);
              numFaces = detections.length;
              isFocused = true; // cannot do pose in browser-only mode, default to true
              gazeSafe = true;  // cannot do iris ratio in browser-only, default to true
              suspiciousObjects = [];
            } catch (err) {
              console.error("Fallback face detection failed:", err);
            }
          }

          const now = Date.now();

          // ── FACE DETECTION RULES (No Face / Lens Covered / Empty Chair) ──────
          if (numFaces === 0) {
            setFaceDetected(false);
            setProctoringStatus("no_face");
            if (!noFaceStartRef.current) {
              noFaceStartRef.current = now;
            } else {
              const elapsed = (now - noFaceStartRef.current) / 1000;
              if (elapsed > 1.2 && !warningIssuedRef.current["no_face"]) {
                warningIssuedRef.current["no_face"] = true;
                handleProctoringAlertRef.current("Face not detected / Camera covered / Empty background.");
              }
            }
          } else {
            noFaceStartRef.current = null;
            warningIssuedRef.current["no_face"] = false;
          }

          // ── MULTIPLE PERSON DETECTION RULES ──────────────────────────────────
          if (numFaces > 1) {
            setFaceDetected(false);
            setProctoringStatus("multi_face");
            if (!multiFaceStartRef.current) {
              multiFaceStartRef.current = now;
            } else {
              const elapsed = (now - multiFaceStartRef.current) / 1000;
              if (elapsed > 1.0 && !warningIssuedRef.current["multi_face"]) {
                warningIssuedRef.current["multi_face"] = true;
                handleProctoringAlertRef.current("Multiple faces detected.");
              }
            }
          } else {
            multiFaceStartRef.current = null;
            warningIssuedRef.current["multi_face"] = false;
          }

          // ── MOBILE PHONE DETECTION RULES ─────────────────────────────────────
          const hasPhone = suspiciousObjects.includes("cell phone") || suspiciousObjects.includes("mobile phone") || suspiciousObjects.includes("phone");
          if (hasPhone) {
            setFaceDetected(false);
            setProctoringStatus("phone");
            if (!phoneStartRef.current) {
              phoneStartRef.current = now;
            } else {
              const elapsed = (now - phoneStartRef.current) / 1000;
              if (elapsed > 1.0 && !warningIssuedRef.current["phone"]) {
                warningIssuedRef.current["phone"] = true;
                handleProctoringAlertRef.current("Prohibited device (mobile phone) detected in camera view.");
              }
            }
          } else {
            phoneStartRef.current = null;
            warningIssuedRef.current["phone"] = false;
          }

          // ── EYE & HEAD FOCUS DETECTION RULES ─────────────────────────────────
          const isDistracted = !isFocused || !gazeSafe;
          if (isDistracted && numFaces === 1 && !hasPhone) {
            setFaceDetected(false);
            setProctoringStatus("distracted");
            if (!distractionStartRef.current) {
              distractionStartRef.current = now;
            } else {
              const elapsed = (now - distractionStartRef.current) / 1000;
              if (elapsed > 1.5 && !warningIssuedRef.current["distraction"]) {
                warningIssuedRef.current["distraction"] = true;
                handleProctoringAlertRef.current("Attention loss / Head turned or eyes off-screen detected.");
              }
            }
          } else {
            distractionStartRef.current = null;
            warningIssuedRef.current["distraction"] = false;
          }

          // ── RESET TO SAFE STATE IF ALL ARE GOOD ──
          if (numFaces === 1 && !hasPhone && !isDistracted) {
            setFaceDetected(true);
            setProctoringStatus("safe");
          }

        }, 800);

      } catch (err) {
        console.error("Camera permission denied:", err);
        handleMalpracticeRef.current("Camera permission denied. Camera feed is mandatory for this round.");
      }
    };

    initCamera();

    return () => {
      isCancelled = true;
      stopProctoring();
    };
  }, [roundId]);

  // ── Sync Video Stream to prevent loss on remount (Text/Voice toggle) ──────
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // ── IMMEDIATELY CLEANUP CAMERA ON SUBMIT OR TERMINATION ──────────────────
  useEffect(() => {
    if (submitted || isSubmitting || isTerminated) {
      stopProctoring();
    }
  }, [submitted, isSubmitting, isTerminated]);

  // ── SUBMIT: all hidden + visible testcases ─────────────────────────────────
  const handleSaveQuestion = async () => {
    if (isSavingQ || submitted) return;
    setIsSavingQ(true);

    const hiddenTcs = currentCodingQ?.hiddenTestcases || [];
    const visibleTcs = currentCodingQ?.visibleTestcases || [];
    const allTcs = [...visibleTcs, ...hiddenTcs];

    let passedCount = 0;
    let failedCount = 0;
    let totalRuntime = 0;
    let firstError = null;
    const questionResults = [];

    for (let i = 0; i < allTcs.length; i++) {
      const tc = allTcs[i];
      try {
        const t0 = Date.now();
        const data = await runSingle(code, language, tc.input);
        const rt = Date.now() - t0;
        totalRuntime += rt;
        const res = classifyResult(data);

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

    let timeTaken = `${Math.floor((Date.now() - startTime.current) / 60000)}m`;

    if (examType === 'mcq') {
      const mcqQs = questions.filter(q => q.type === 'mcq');
      const correct = mcqQs.filter(q => mcqAnswers[q.id] === q.answer).length;
      let score = mcqQs.length > 0 ? Math.round((correct / mcqQs.length) * 100) : 0;
      
      const answeredCount = mcqQs.filter(q => mcqAnswers[q.id] !== undefined).length;
      const wrongCount = answeredCount - correct;
      const unansweredCount = mcqQs.length - answeredCount;
      
      const metrics = {
        isAptitude: true,
        totalQuestions: mcqQs.length,
        answeredQuestions: answeredCount,
        correctAnswers: correct,
        wrongAnswers: wrongCount,
        unansweredQuestions: unansweredCount,
        mcqAnswers: mcqAnswers,
        warningCount: warningCount,
        warningLogs: warningLogs,
        startedAt: new Date(startTime.current).toISOString(),
        submittedAt: new Date().toISOString(),
        autoSubmitted: autoSubmitRef.current
      };

      submitRound(candidateId, driveId, roundId, score, Math.round(score * 0.95), timeTaken, metrics);

      // --- NEW MYSQL BACKEND SUBMISSION ---
      try {
        submitExam({
          userId: candidateId,
          assessmentId: driveId,
          roundId: String(roundId),
          answers: { mcqAnswers },
          proctoringLogs: warningLogs,
          status: "completed",
          score: score
        });
        console.log("MCQ Exam successfully saved to MySQL database!");
      } catch (dbError) {
        console.error("Failed to save MCQ to MySQL:", dbError);
      }

      setSubmitted(true);
      setIsSubmitting(false);
      return;
    }

    // Aggregation logic
    const questionsData = [];
    let combinedScore = 0;
    let combinedMaxScore = 0;

    for (let i = 0; i < codingQs.length; i++) {
      let qData = codingAnswers[i] || {};
      let qCode = qData.code || '';
      let qLang = qData.language || 'javascript';
      
      if (i === currentIdx) {
        qCode = code;
        qLang = language;
      }

      let qMetrics = qData.metrics;
      let qOutput = qData.output || [];

      // Auto-evaluate if metrics are missing and code is present and not just boilerplate
      if (!qMetrics && qCode) {
        const hiddenTcs = codingQs[i].hiddenTestcases || [];
        const visibleTcs = codingQs[i].visibleTestcases || [];
        const allTcs = [...visibleTcs, ...hiddenTcs];
        
        let passedCount = 0;
        let totalRuntime = 0;
        let firstError = null;
        const questionResults = [];
        
        for (let j = 0; j < allTcs.length; j++) {
          const tc = allTcs[j];
          try {
            const t0 = Date.now();
            const data = await runSingle(qCode, qLang, tc.input);
            totalRuntime += (Date.now() - t0);
            const res = classifyResult(data);
            if (res.type !== 'OK') {
              if (!firstError) firstError = res.type;
              questionResults.push({ input: tc.input, expected: tc.expected, actual: '', status: res.type });
            } else {
              const got = res.output;
              if (got === tc.expected.trim()) {
                passedCount++;
                questionResults.push({ input: tc.input, expected: tc.expected, actual: got, status: 'Pass' });
              } else {
                questionResults.push({ input: tc.input, expected: tc.expected, actual: got, status: 'Fail' });
              }
            }
          } catch {
            questionResults.push({ tcIdx: j, input: tc.input, expected: tc.expected, status: 'Error' });
          }
        }
        
        const total = allTcs.length;
        const passPercentage = total > 0 ? Math.round((passedCount / total) * 100) : 0;
        let verdict = (total > 0 && passedCount === total) ? 'Accepted' : (firstError || 'Wrong Answer');
        if (total === 0) verdict = 'No Testcases';
        
        qMetrics = {
          passedCount,
          totalTestcases: total,
          passPercentage,
          runtime: total > 0 ? Math.round(totalRuntime / total) + 'ms' : '0ms',
          verdict
        };
        qOutput = questionResults;
      }

      if (!qMetrics) {
         qMetrics = { passPercentage: 0, passedCount: 0, totalTestcases: 0, runtime: '0ms', verdict: 'Not Attempted' };
      }

      combinedScore += qMetrics.passPercentage;
      combinedMaxScore += 100;

      questionsData.push({
        questionId: codingQs[i].id,
        title: codingQs[i].title,
        questionTitle: codingQs[i].title,
        code: qCode,
        codeSubmitted: qCode,
        language: qLang,
        verdict: qMetrics.verdict,
        passedCount: qMetrics.passedCount,
        totalTestcases: qMetrics.totalTestcases,
        passPercentage: qMetrics.passPercentage,
        runtime: qMetrics.runtime,
        results: qOutput
      });
    }

    const finalScore = combinedMaxScore > 0 ? Math.round((combinedScore / combinedMaxScore) * 100) : 0;
    const finalCutoff = Math.round(finalScore * 0.95);

    submitRound(candidateId, driveId, roundId, finalScore, finalCutoff, timeTaken, {
      verdict: finalScore === 100 ? "Accepted" : (finalScore > 0 ? "Partial Accepted" : "Failed"),
      questionsData: questionsData,
      warningCount: warningCount,
      warningLogs: warningLogs
    });

    // --- NEW MYSQL BACKEND SUBMISSION ---
    try {
      submitExam({
        userId: candidateId, 
        assessmentId: driveId,
        roundId: String(roundId),
        answers: { questionsData, mcqAnswers, codingAnswers },
        proctoringLogs: warningLogs,
        status: "completed",
        score: finalScore
      });
      console.log("Exam successfully saved to MySQL database!");
    } catch (dbError) {
      console.error("Failed to save to MySQL:", dbError);
    }
    // ------------------------------------

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
  }, [isSubmitting, submitted, examType, codingAnswers, codingQs, candidateId, driveId, roundId, submitRound, currentIdx, code, language, navigate, questions, mcqAnswers]);

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goToQuestion = (idx) => {
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
    };

  const WarningModalOverlay = showWarningModal && (() => {
    const totalAlerts = warningCount;
    const isTerminatedLocal = totalAlerts >= 3 || isTerminated;

    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
        <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center shadow-red-500/10">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          
          {isTerminatedLocal ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">
                Assessment Terminated (3 / 3)
              </h2>
              <div className="text-slate-300 mb-6 space-y-2 text-sm">
                <p className="font-semibold text-red-400">Maximum Warning Limit Reached (3/3).</p>
                <p className="font-medium">Please review camera activity.</p>
                <p className="text-xs opacity-75">Your assessment session has been locked due to security violations.</p>
                <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20 text-red-400 font-mono text-xs text-left">
                  <strong>Last Violation:</strong> {latestWarning}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    navigate('/candidate/home');
                  }}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all"
                >
                  Return To Dashboard
                </button>
              </div>
            </>
          ) : totalAlerts === 2 ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">
                Security Warning (2 / 3)
              </h2>
              <div className="text-slate-300 mb-6 space-y-2 text-sm">
                <p>Repeated unusual activity detected.</p>
                <p className="font-semibold text-yellow-400">One more violation will terminate your assessment.</p>
                <p className="text-xs text-red-400 font-bold mt-2">Remaining Chances: 1</p>
                <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20 text-red-400 font-mono text-xs text-left">
                  <strong>Violation:</strong> {latestWarning}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                  }}
                  className="w-full py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold transition-all"
                >
                  Continue Assessment
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">
                Security Warning (1 / 3)
              </h2>
              <div className="text-slate-300 mb-6 space-y-2 text-sm">
                <p>Unusual activity detected.</p>
                <p>Please remain focused on the assessment.</p>
                <p className="font-semibold text-yellow-400">Further violations may terminate your assessment.</p>
                <p className="text-xs text-red-400 font-bold mt-2">Remaining Chances: 2</p>
                <div className="mt-4 p-3 bg-red-500/10 rounded border border-red-500/20 text-red-400 font-mono text-xs text-left">
                  <strong>Violation:</strong> {latestWarning}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                  }}
                  className="w-full py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold transition-all"
                >
                  Continue Assessment
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  })();

  const FullscreenRestoreOverlay = !isFullscreen && !submitted && !isSubmitting && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm px-4">
      <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center shadow-red-500/10">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-white mb-2">Fullscreen Mode Required</h2>
        <p className="text-slate-300 mb-6 text-sm">
          You have exited fullscreen mode. To continue the assessment and prevent further proctoring violations, you must remain in fullscreen mode.
        </p>
        <button
          onClick={requestFullscreen}
          className="w-full py-3 rounded-xl bg-primary hover:bg-[#1d4ed8] text-white font-bold transition-all flex items-center justify-center gap-2"
        >
          <Maximize className="w-5 h-5" /> Re-enter Fullscreen Mode
        </button>
      </div>
    </div>
  );

  // ── Submitting screen ──────────────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 mx-auto mb-6 animate-spin" />
          <h1 className="text-2xl font-bold text-white mb-2">Evaluating Your Solution...</h1>
          <p className="text-slate-400">Running hidden test cases. Please wait.</p>
        </div>
      </div>
    );
  }

  // ── Submitted screen ───────────────────────────────────────────────────────
  if (submitted && submitResult) {
    const { verdict, passedCount, totalTestcases, passPercentage, runtime, languageUsed } = submitResult;
    const isAccepted = verdict === 'Accepted';
    const iconColor = isAccepted ? 'text-green-400' : passedCount > 0 ? 'text-yellow-400' : 'text-red-400';
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center font-sans p-6">
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <ShieldCheck className={`w-16 h-16 ${iconColor} mx-auto mb-4`} />
          <h1 className="text-2xl font-bold text-white mb-1">Round Submitted</h1>
          <p className={`text-lg font-semibold mb-6 ${iconColor}`}>{verdict}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{passedCount}/{totalTestcases}</div>
              <div className="text-[11px] text-slate-400 mt-1">Test Cases</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{passPercentage}%</div>
              <div className="text-[11px] text-slate-400 mt-1">Score</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{runtime}</div>
              <div className="text-[11px] text-slate-400 mt-1">Avg Runtime</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 bg-white/5 rounded-lg p-3 mb-4 text-left">
            <span className="font-semibold text-slate-400">Language:</span> {languageUsed}
          </div>
          <p className="text-slate-500 text-sm">{getRedirectionText()}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center font-sans">
        <div className="text-center">
          <CheckCircle2 className="w-20 h-20 text-green-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Exam Submitted!</h1>
          <p className="text-slate-400">{getRedirectionText()}</p>
        </div>
      </div>
    );
  }
  // ── TOAST NOTIFICATIONS (top-right corner) ──────────────────────────────
  const ToastNotifications = (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-300 ${toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-200'
              : 'bg-yellow-950/90 border-yellow-500/40 text-yellow-200'
            }`}
        >
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${toast.type === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`} />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">{toast.title}</div>
            <div className="text-xs mt-0.5 opacity-80 truncate">{toast.message}</div>
          </div>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );

  // ── CAMERA PIP with face detection status ──────────────────────────────
  const CameraPIP = isProctoredRound && (
    <div className={`fixed bottom-6 left-6 z-[9999] bg-black rounded-xl shadow-2xl overflow-hidden w-64 h-48 border-4 transition-all duration-300 ${
      proctoringStatus !== "safe"
        ? 'border-red-600 shadow-red-500/50 animate-pulse ring-4 ring-red-500/30'
        : faceDetected ? 'border-green-500/80 shadow-green-500/20' : 'border-red-500/80 shadow-red-500/40'
    }`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Face detection status badge */}
      <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 ${faceDetected
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
        }`}>
        <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${faceDetected ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-red-500 shadow-[0_0_6px_#ef4444]'}`}></span>
        {proctoringStatus === "safe" && "Face Detected"}
        {proctoringStatus === "no_face" && "No Face Detected"}
        {proctoringStatus === "multi_face" && "Multiple People Detected"}
        {proctoringStatus === "phone" && "Mobile Phone Detected"}
        {proctoringStatus === "distracted" && "Looking Away / Distracted"}
      </div>

      {/* AI Proctor label */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> AI Proctor
      </div>
      {/* Status bar at bottom */}
      <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${faceDetected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
    </div>
  );

  // ── No questions fallback ──────────────────────────────────────────────────
  if (questions.length === 0) { console.log('QUESTIONS IS EMPTY! storedQuestions.length:', storedQuestions.length, 'activeSchedule:', activeSchedule);
    return (
      <div className="min-h-screen bg-[#0b1121] flex items-center justify-center font-sans text-center p-8">
        <div>
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Questions Available</h2>
          <p className="text-slate-400 mb-6">The interviewer hasn't generated questions yet. Please wait.</p>
          <button onClick={() => navigate('/candidate/home')} className="text-[#3b82f6] hover:underline text-sm">← Back to Home</button>
        </div>
      </div>
    );
  }

  // ── MCQ Exam (NPTEL-style) ─────────────────────────────────────────────────
  if (examType === 'mcq') {
    const stagedAnswer = mcqAnswers[currentQ?.id];

    // Status-based counts
    const answeredCount = questions.filter(q => mcqStatus[q.id] === 'answered' || mcqStatus[q.id] === 'answered_marked_for_review').length;
    const markedCount = questions.filter(q => mcqStatus[q.id] === 'marked_for_review' || mcqStatus[q.id] === 'answered_marked_for_review').length;
    const notAnswered = questions.filter(q => mcqStatus[q.id] === 'not_answered').length;
    const notVisited = questions.filter(q => !mcqStatus[q.id] || mcqStatus[q.id] === 'not_visited').length;
    const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    // Color map for question status badges
    const statusStyle = (q, idx) => {
      if (idx === currentIdx) return 'bg-[#3b82f6] text-white ring-2 ring-[#3b82f6]/50 ring-offset-1 ring-offset-[#0f172a]';
      const s = mcqStatus[q.id];
      if (s === 'answered') return 'bg-green-600 text-white';
      if (s === 'answered_marked_for_review') return 'bg-purple-600 text-white ring-2 ring-green-400/60 ring-offset-1 ring-offset-[#0f172a]';
      if (s === 'marked_for_review') return 'bg-purple-600 text-white';
      if (s === 'not_answered') return 'bg-red-600/80 text-white';
      return 'bg-white/10 text-slate-400 hover:bg-white/20'; // not_visited
    };

    // Label for current question's status badge
    const currentStatusLabel = () => {
      const s = mcqStatus[currentQ?.id];
      if (s === 'answered') return { label: 'Answered', color: 'text-green-400' };
      if (s === 'answered_marked_for_review') return { label: 'Answered & Marked for Review', color: 'text-purple-400' };
      if (s === 'marked_for_review') return { label: 'Marked for Review', color: 'text-purple-400' };
      if (s === 'not_answered') return { label: 'Not Answered', color: 'text-red-400' };
      return { label: 'Not Visited', color: 'text-slate-500' };
    };
    const statusInfo = currentStatusLabel();

    // ── Final Review Page Render ────────────────────────────────────────────────
    if (showReviewPage) {
      return (
        <div className="min-h-screen bg-[#0a0f1f] text-slate-200 font-sans p-8 overflow-y-auto relative">
          {/* Keep camera PIP, warning overlays & toasts mounted so the stream never dies */}
          {WarningModalOverlay}
          {ToastNotifications}
          {CameraPIP}
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="border border-white/10 rounded-xl p-6 bg-[#131e30] flex items-center justify-between shadow-lg">
               <h1 className="text-2xl font-bold text-white tracking-wider flex items-center gap-3">
                 <ShieldCheck className="w-8 h-8 text-blue-500" /> ROUND 1 FINAL REVIEW PAGE
               </h1>
            </div>

            {/* Assessment Summary */}
            <div>
               <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Assessment Summary</h2>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#131e30] border border-white/10 p-5 rounded-xl shadow-lg">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Questions</p>
                     <p className="text-2xl font-black text-white">{questions.length}</p>
                  </div>
                  <div className="bg-[#131e30] border border-white/10 p-5 rounded-xl shadow-lg">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Answered Questions</p>
                     <p className="text-2xl font-black text-green-400">{answeredCount}</p>
                  </div>
                  <div className="bg-[#131e30] border border-white/10 p-5 rounded-xl shadow-lg">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Not Answered</p>
                     <p className="text-2xl font-black text-red-400">{notAnswered}</p>
                  </div>
                  <div className="bg-[#131e30] border border-white/10 p-5 rounded-xl shadow-lg">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Marked For Review</p>
                     <p className="text-2xl font-black text-purple-400">{markedCount}</p>
                  </div>
                  <div className="bg-[#131e30] border border-white/10 p-5 rounded-xl shadow-lg">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Saved Questions</p>
                     <p className="text-2xl font-black text-blue-400">{answeredCount}</p>
                  </div>
                  <div className="bg-[#131e30] border border-white/10 p-5 rounded-xl shadow-lg">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Not Saved Questions</p>
                     <p className="text-2xl font-black text-slate-400">{questions.length - answeredCount}</p>
                  </div>
               </div>
            </div>

            {/* Question Review Table */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Question Review Table</h2>
              <div className="bg-[#131e30] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0f172a] text-xs uppercase font-bold text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">Question No</th>
                      <th className="px-6 py-4">Question Status</th>
                      <th className="px-6 py-4">Save Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {questions.map((q, idx) => {
                       const status = mcqStatus[q.id] || 'not_visited';
                       let statusText = 'Not Visited';
                       let saveText = 'Not Saved';
                       let statusColor = 'text-slate-400';
                       let saveColor = 'text-slate-400';
                       
                       if (status === 'answered') {
                          statusText = 'Answered'; saveText = 'Saved'; statusColor = 'text-green-400'; saveColor = 'text-green-400';
                       } else if (status === 'marked_for_review') {
                          statusText = 'Marked For Review'; saveText = 'Saved'; statusColor = 'text-purple-400'; saveColor = 'text-blue-400';
                       } else if (status === 'answered_marked_for_review') {
                          statusText = 'Answered & Marked for Review'; saveText = 'Saved'; statusColor = 'text-purple-400'; saveColor = 'text-green-400';
                       } else if (status === 'not_answered') {
                          statusText = 'Visited But Not Answered'; saveText = 'Auto Saved'; statusColor = 'text-red-400'; saveColor = 'text-yellow-400';
                       } else if (status === 'not_visited') {
                          statusText = 'Not Visited'; saveText = 'Not Saved'; statusColor = 'text-slate-400'; saveColor = 'text-slate-400';
                       }

                       return (
                          <tr key={q.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-bold text-white">Question {idx + 1}</td>
                            <td className={`px-6 py-4 font-semibold ${statusColor}`}>{statusText}</td>
                            <td className={`px-6 py-4 font-semibold ${saveColor}`}>{saveText}</td>
                            <td className="px-6 py-4 text-right">
                               <button 
                                 onClick={() => { setShowReviewPage(false); goToMcq(idx); }}
                                 className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors font-bold text-xs"
                               >
                                 View Question
                               </button>
                            </td>
                          </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-8">
              <button 
                onClick={() => setShowReviewPage(false)}
                className="px-8 py-3 bg-[#0f172a] hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10 shadow-lg"
              >
                 Back To Assessment
              </button>
              <button 
                onClick={handleSubmit}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 flex items-center gap-2"
              >
                 <Send className="w-5 h-5" /> Final Submit Exam
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0b1121] font-sans flex flex-col relative">
        {WarningModalOverlay}
        {FullscreenRestoreOverlay}
        {ToastNotifications}
        {CameraPIP}

        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between px-6 py-3 bg-[#0f172a] border-b border-white/5 shrink-0">
          <div>
            <div className="text-white font-bold text-sm">Round {roundId}: {activeSchedule?.roundName || 'MCQ Exam'}</div>
            <div className="text-slate-500 text-xs mt-0.5">Q{currentIdx + 1} of {questions.length}</div>
          </div>
          <div className={`flex items-center gap-2 font-mono font-bold text-base px-4 py-1.5 rounded-lg border transition-all ${isWarning
              ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
              : 'bg-white/5 text-white border-white/10'
            }`}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {warningCount > 0 && <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-1 rounded hidden sm:inline">Warnings: {warningCount} / 3</span>}
            <span className="text-green-400 font-semibold hidden sm:inline">{answeredCount} Answered</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-red-400 font-semibold hidden sm:inline">{notAnswered} Not Answered</span>
            <button
              onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
              className="md:hidden flex items-center justify-center p-1.5 rounded-lg bg-white/5 text-white hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── Body: Question + Right Panel ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Question Area ── */}
          <div className="flex-1 flex flex-col overflow-y-auto">

            {/* Progress bar */}
            <div className="h-1 bg-white/5 shrink-0">
              <div
                className="h-1 bg-gradient-to-r from-[#3b82f6] to-[#22c55e] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex-1 p-6 lg:p-8">

              {/* Question card */}
              <div className="bg-[#131e30] border border-white/8 rounded-2xl p-6 mb-5 shadow-xl">

                {/* Question header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white bg-[#3b82f6] px-3 py-1.5 rounded-lg">
                      Question {currentIdx + 1}
                    </span>
                    <span className={`text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  {clearMsg && (
                    <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-3 h-3" /> Answer cleared successfully.
                    </span>
                  )}
                </div>

                {/* Question text - hidden in Round 4 to force candidate to listen */}
                {!isCommunicationRound && (
                  <p className="text-white text-base font-medium leading-relaxed mb-6">{currentQ?.q}</p>
                )}

                {/* Options — displayed if the specific question is an MCQ */}
                {currentQ?.type === 'mcq' && !isCommunicationRound && (
                  <div className="space-y-3">
                    {currentQ?.options?.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          selectAnswer(currentQ.id, idx);
                          // Mark as not_answered until they save
                          setMcqStatus(prev => {
                            const cur = prev[currentQ.id];
                            // preserve mark-for-review state if already set
                            if (cur === 'marked_for_review' || cur === 'answered_marked_for_review') {
                              return { ...prev, [currentQ.id]: 'answered_marked_for_review' };
                            }
                            return prev; // keep current status, Save & Next will finalize
                          });
                        }}
                        className={`w-full text-left flex items-center gap-4 px-5 py-4 rounded-xl border text-sm font-medium transition-all duration-200 ${stagedAnswer === idx
                            ? 'bg-[#1e3a5f] border-[#3b82f6] text-white shadow-lg shadow-blue-500/10'
                            : 'bg-[#0d1829] border-white/8 text-slate-300 hover:border-[#3b82f6]/40 hover:bg-[#1a2840]'
                          }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${stagedAnswer === idx
                            ? 'bg-[#3b82f6] text-white'
                            : 'bg-white/5 text-[#3b82f6]'
                          }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Round 4 (Communication) Voice-Only UI ── */}
                {isCommunicationRound && (
                  <div className="flex flex-col items-center justify-center p-8 bg-[#0d1829] border border-blue-500/30 rounded-2xl mb-6 shadow-xl shadow-blue-500/5">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                      <Mic className="w-10 h-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Listen to the Interviewer</h3>
                    <p className="text-slate-400 text-sm text-center mb-8 max-w-sm">
                      The AI interviewer is speaking. Please listen carefully and record your verbal response using the microphone.
                    </p>
                    
                    <div className="flex gap-4 w-full max-w-sm">
                      <button
                        onClick={handleReplayQuestion}
                        className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Replay
                      </button>
                      
                      {!isRecordingAudio ? (
                        <button
                          onClick={handleStartRecording}
                          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                          <Mic className="w-4 h-4" /> Record
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRecording}
                          className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 animate-pulse"
                        >
                          <Square className="w-4 h-4" /> Stop
                        </button>
                      )}
                    </div>
                    
                    {mcqAnswers[`${currentQ?.id}_audio`] && !isRecordingAudio && (
                      <div className="mt-6 w-full max-w-sm p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center text-green-400 font-semibold text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Audio Recorded Successfully
                      </div>
                    )}

                    <div className="mt-6 w-full max-w-2xl">
                      <label className="text-slate-400 text-sm font-semibold mb-2 block">Live Transcript (Auto-filled)</label>
                      <textarea
                        readOnly
                        value={recognizedText || mcqAnswers[currentQ?.id] || ''}
                        placeholder="Your speech will be converted to text and appear here..."
                        className="w-full bg-[#0f172a] border border-white/10 rounded-xl p-4 text-white text-sm h-32 resize-none focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* ── Voice / Text Answer Input (For open-ended questions) ── */}
                {currentQ?.type === 'open' && !isCommunicationRound && (
                  <div className="mt-6 bg-[#0d1829] border border-white/10 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Answer via Voice or Text</span>
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                        <button
                          onClick={() => setAnswerMode('voice')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${answerMode === 'voice'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'text-slate-400 hover:text-white'
                            }`}
                        >
                          <Mic className="w-3.5 h-3.5" /> Voice
                        </button>
                        <button
                          onClick={() => setAnswerMode('text')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${answerMode === 'text'
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'text-slate-400 hover:text-white'
                            }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Text
                        </button>
                      </div>
                    </div>

                    {answerMode === 'voice' ? (
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
                                  setMcqAnswers(prev => ({ ...prev, [`${currentQ?.id}_text`]: transcript }));
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
                                    try { recognition.start(); } catch (e) { }
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
                          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl border-4 ${isListening
                              ? 'bg-red-500/20 border-red-500 hover:bg-red-500/30 animate-pulse shadow-red-500/30 text-red-400'
                              : 'bg-blue-600 border-blue-500 hover:bg-blue-700 shadow-blue-500/30 text-white'
                            }`}
                        >
                          {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                        </button>
                        <span className={`text-sm font-semibold ${isListening ? 'text-red-400' : 'text-slate-500'}`}>
                          {isListening ? '🔴 Recording... Speak now' : 'Click to start speaking'}
                        </span>

                        {/* Live Transcription Box */}
                        <div className="w-full mt-4">
                          <div className="text-xs text-slate-500 mb-1 flex items-center justify-between">
                            <span>Live Transcription</span>
                            {isListening && <span className="text-red-400 animate-pulse">● Live</span>}
                          </div>
                          <textarea
                            placeholder="Type your detailed answer here..."
                            value={mcqAnswers[`${currentQ?.id}_text`] || ''}
                            onChange={(e) => setMcqAnswers(prev => ({ ...prev, [`${currentQ?.id}_text`]: e.target.value }))}
                            className="w-full bg-[#0a0f1f] border border-white/10 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-y min-h-[160px] font-sans shadow-inner"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <textarea
                          placeholder="Type your answer here..."
                          value={mcqAnswers[`${currentQ?.id}_text`] || ''}
                          onChange={(e) => setMcqAnswers(prev => ({ ...prev, [`${currentQ?.id}_text`]: e.target.value }))}
                          className="w-full bg-[#131e30] border border-white/10 rounded-lg p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none h-28 font-sans"
                        />
                        <div className="text-xs text-slate-500 mt-1 text-right">
                          {(mcqAnswers[`${currentQ?.id}_text`] || '').length} characters
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Action Buttons ── */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Previous */}
                <button
                  onClick={() => { if (currentIdx > 0) goToMcq(currentIdx - 1); }}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all border border-white/8"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {/* Clear Answer */}
                <button
                  onClick={handleClearAnswer}
                  disabled={mcqAnswers[currentQ?.id] === undefined && (!mcqAnswers[`${currentQ?.id}_text`] || mcqAnswers[`${currentQ?.id}_text`].trim() === '') && !mcqAnswers[`${currentQ?.id}_audio`]}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all border border-white/8"
                >
                  <Eraser className="w-4 h-4" /> Clear Answer
                </button>

                {/* Mark for Review & Next */}
                <button
                  onClick={handleMarkForReview}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-sm font-medium transition-all border border-purple-500/30"
                >
                  <Flag className="w-4 h-4" /> Mark for Review & Next
                </button>

                {/* Save & Next / Submit */}
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={handleSaveAndNext}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    <BookmarkCheck className="w-4 h-4" /> Save & Next
                  </button>
                ) : (
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      onClick={handleSaveAndNext}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                      <BookmarkCheck className="w-4 h-4" /> Save Question
                    </button>
                    <button
                      onClick={() => {
                        handleSaveAndNext(); // Auto-save last question
                        setShowReviewPage(true);
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all shadow-lg shadow-green-500/20"
                    >
                      <Send className="w-4 h-4" /> Submit Exam
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Mobile Overlay ── */}
          {isMobilePanelOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setIsMobilePanelOpen(false)}
            />
          )}

          {/* ── Right Side: Question Status Panel ── */}
          <aside className={`w-72 bg-[#0c1627] border-l border-white/5 flex flex-col shrink-0 overflow-y-auto fixed md:static top-0 right-0 bottom-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobilePanelOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>

            {/* Mobile Close Button */}
            <div className="md:hidden flex justify-end p-2 border-b border-white/5">
              <button
                onClick={() => setIsMobilePanelOpen(false)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate info */}
            <div className="px-4 py-3 border-b border-white/5 bg-[#0f172a]">
              <p className="text-white text-xs font-bold truncate">{user?.name}</p>
              <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/5">
              {[
                { label: 'Total', val: questions.length, color: 'text-white', bg: 'bg-white/5' },
                { label: 'Answered', val: answeredCount, color: 'text-green-400', bg: 'bg-green-500/10' },
                { label: 'Not Ans.', val: notAnswered, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'Marked', val: markedCount, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Visited', val: questions.length - notVisited, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Unvisited', val: notVisited, color: 'text-slate-400', bg: 'bg-white/5' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-lg px-3 py-2 text-center`}>
                  <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Question grid */}
            <div className="p-3 border-b border-white/5 flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Question Palette</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => goToMcq(idx)}
                    title={mcqStatus[q.id] || 'not_visited'}
                    className={`relative w-9 h-9 rounded-lg text-xs font-bold transition-all duration-150 ${statusStyle(q, idx)}`}
                  >
                    {idx + 1}
                    {/* Small diamond for answered_marked_for_review */}
                    {(mcqStatus[q.id] === 'answered_marked_for_review') && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-[#0c1627]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="p-3 border-b border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Legend</p>
              <div className="space-y-1.5">
                {[
                  { color: 'bg-white/10 border border-white/20', label: 'Not Visited' },
                  { color: 'bg-red-600/80', label: 'Not Answered' },
                  { color: 'bg-green-600', label: 'Answered' },
                  { color: 'bg-purple-600', label: 'Marked for Review' },
                  { color: 'bg-purple-600 ring-2 ring-green-400/60', label: 'Answered & Marked for Review' },
                  { color: 'bg-[#3b82f6]', label: 'Current Question' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md shrink-0 ${l.color}`} />
                    <span className="text-[10px] text-slate-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <div className="p-3">
              <button
                onClick={() => setShowReviewPage(true)}
                className="w-full bg-green-600 hover:bg-green-500 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
              >
                <Send className="w-4 h-4" /> Submit Exam
              </button>
            </div>
          </aside>
        </div>

        {/* ── Security Status Bar ── */}
        {['3', '4', '5'].includes(String(roundId)) && (
          <div className="shrink-0 flex items-center justify-between px-5 py-2 bg-[#0a0f1f] border-t border-white/5">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className={`w-4 h-4 ${warningCount > 0 ? 'text-yellow-400' : 'text-green-400'}`} />
              <span className="text-slate-400 font-semibold">Security Logs:</span>
              <span className={`font-bold ${warningCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {warningCount > 0 ? `${warningCount} violation${warningCount > 1 ? 's' : ''}` : 'No violations'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Camera {cameraActive ? 'Active' : 'Inactive'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                AI Proctor Monitoring
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CODING Exam ────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#0b1121] font-sans flex flex-col overflow-hidden relative">
      {WarningModalOverlay}
      {FullscreenRestoreOverlay}
      {ToastNotifications}
      {CameraPIP}
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#0f172a] border-b border-white/5 shrink-0">
        <div className="text-white font-bold">Round {roundId}: {activeSchedule?.roundName}</div>
        <div className="flex items-center gap-3">
          {warningCount > 0 && <span className="text-yellow-400 font-bold bg-yellow-500/10 px-2 py-1 text-xs rounded">Warnings: {warningCount} / 3</span>}
          <span className="text-slate-400 text-sm">Problem {currentIdx + 1}/{codingQs.length}</span>
          <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg text-sm ${isWarning ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white'}`}>
            <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="bg-[#1a2332] border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#3b82f6]"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
          </select>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={handleSaveQuestion}
            disabled={isSavingQ}
            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSavingQ ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
            Save Question
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
          >
            <Send className="w-4 h-4" /> Final Submit Round
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Problem Description */}
        <div className="w-96 bg-[#0f172a] border-r border-white/5 overflow-y-auto p-5 shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#2563eb]/20 text-[#3b82f6] border border-[#3b82f6]/20 rounded">
              Problem {currentIdx + 1}
            </span>
            {codingQs.length > 1 && (
              <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => goToQuestion(currentIdx - 1)}
                  disabled={currentIdx === 0}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goToQuestion(currentIdx + 1)}
                  disabled={currentIdx === codingQs.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <h2 className="text-white font-bold text-lg mb-3">{currentCodingQ?.title}</h2>
          {currentCodingQ?.description && (
            <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {currentCodingQ.description}
            </pre>
          )}
          {currentCodingQ?.statement && (
            <div className="text-slate-300 text-sm leading-relaxed font-sans space-y-4">
              <p className="whitespace-pre-wrap">{currentCodingQ.statement}</p>
              {currentCodingQ.inputFormat && (
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Input Format</h4>
                  <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap text-xs">{currentCodingQ.inputFormat}</pre>
                </div>
              )}
              {currentCodingQ.outputFormat && (
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Output Format</h4>
                  <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap text-xs">{currentCodingQ.outputFormat}</pre>
                </div>
              )}
              {currentCodingQ.constraints && (
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Constraints</h4>
                  <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap text-xs">{currentCodingQ.constraints}</pre>
                </div>
              )}
              {(currentCodingQ.sampleInput || currentCodingQ.sampleOutput) && (
                <div className="grid grid-cols-2 gap-4">
                  {currentCodingQ.sampleInput && (
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Sample Input</h4>
                      <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap text-xs">{currentCodingQ.sampleInput}</pre>
                    </div>
                  )}
                  {currentCodingQ.sampleOutput && (
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-1">Sample Output</h4>
                      <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap text-xs">{currentCodingQ.sampleOutput}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Question navigation grid */}
          {codingQs.length > 1 && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Problems</p>
              <div className="flex flex-wrap gap-1.5">
                {codingQs.map((q, idx) => {
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
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${bgColor}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative border-b border-white/5">
            <Editor
              height="100%"
              language={language === 'cpp' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={val => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                roundedSelection: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
              }}
            />
          </div>

          {/* Bottom Panel (Testcases / Output) */}
          <div className="h-64 bg-[#1e1e1e] flex flex-col shrink-0 border-t border-white/5 shadow-xl">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 pt-2">
              <button
                onClick={() => setActiveTab('testcases')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'testcases' ? 'bg-[#1e1e1e] text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Code2 className="w-3.5 h-3.5" /> Testcases
              </button>
              <button
                onClick={() => setActiveTab('result')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'result' ? 'bg-[#1e1e1e] text-green-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Console Output
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#1e1e1e]">
              {activeTab === 'testcases' && (
                <div className="space-y-4">
                  {(currentCodingQ?.visibleTestcases || []).map((tc, i) => (
                    <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/5">
                      <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Test Case {i + 1}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-slate-500 mb-1 uppercase">Input</div>
                          <pre className="font-mono text-xs text-slate-300 bg-black/40 p-2 rounded">{tc.input}</pre>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 mb-1 uppercase">Expected Output</div>
                          <pre className="font-mono text-xs text-slate-300 bg-black/40 p-2 rounded">{tc.expected}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!currentCodingQ?.visibleTestcases || currentCodingQ.visibleTestcases.length === 0) && (
                    <div className="text-sm text-slate-500">No visible test cases for this problem.</div>
                  )}
                </div>
              )}

              {activeTab === 'result' && (
                <div className="h-full space-y-4">
                  {!output ? (
                    <div className="text-sm text-slate-500 font-mono">Click "Run" to execute your code.</div>
                  ) : Array.isArray(output) && output.length > 0 && output[0].status === 'Running...' ? (
                    <div className="text-sm text-[#3b82f6] font-mono flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Compiling & Executing...
                    </div>
                  ) : Array.isArray(output) ? (
                    output.map((res, i) => (
                      <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/5 font-mono">
                        {res.isFallback ? (
                          <>
                            <div className={res.status === 'Error' ? 'text-red-400 font-bold mb-2' : 'text-green-400 font-bold mb-2'}>
                              {res.type !== 'OK' ? res.type : 'Execution Finished'}
                            </div>
                            <div className="text-xs text-slate-500 mb-1">Output:</div>
                            <pre className="text-xs text-slate-300 bg-black/40 p-2 rounded whitespace-pre-wrap">{res.actual}</pre>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                              <span className="text-xs font-bold text-slate-500 uppercase">Case {res.tcIdx + 1}</span>
                              {res.status === 'Pass' && <span className="text-green-400 text-xs font-bold bg-green-500/10 px-2 py-0.5 rounded">✅ Accepted</span>}
                              {res.status === 'Fail' && <span className="text-red-400 text-xs font-bold bg-red-500/10 px-2 py-0.5 rounded">❌ Wrong Answer</span>}
                              {res.status === 'Error' && <span className="text-orange-400 text-xs font-bold bg-orange-500/10 px-2 py-0.5 rounded">⚠ {res.type}</span>}
                            </div>
                            <div className="space-y-3">
                              <div>
                                <div className="text-[10px] text-slate-500 mb-1 uppercase">Input</div>
                                <pre className="text-xs text-slate-300 bg-black/40 p-2 rounded whitespace-pre-wrap">{res.input}</pre>
                              </div>
                              {res.status === 'Error' ? (
                                <div>
                                  <div className="text-[10px] text-orange-400 mb-1 uppercase">Error Details</div>
                                  <pre className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 p-2 rounded whitespace-pre-wrap">{res.message}</pre>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <div className="text-[10px] text-slate-500 mb-1 uppercase">Your Output (Stdout)</div>
                                    <pre className="text-xs text-slate-300 bg-black/40 p-2 rounded whitespace-pre-wrap">{res.actual || '(no output)'}</pre>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-500 mb-1 uppercase">Expected Output</div>
                                    <pre className="text-xs text-slate-300 bg-black/40 p-2 rounded whitespace-pre-wrap">{res.expected}</pre>
                                  </div>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <pre className="font-mono text-sm whitespace-pre-wrap text-slate-300">
                      {String(output)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
