const fs = require('fs');

const envPath = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/CandidateCodingEnv.jsx';
let code = fs.readFileSync(envPath, 'utf8');

// 1. Add import faceapi
if (!code.includes("import * as faceapi")) {
  code = code.replace("import { useAuth } from '../contexts/AuthContext';", "import { useAuth } from '../contexts/AuthContext';\nimport * as faceapi from '@vladmandic/face-api';");
}

// 2. Add Fullscreen State
if (!code.includes("const [isFullscreen, setIsFullscreen]")) {
  code = code.replace("const [faceDetected, setFaceDetected] = useState(true); // true = green, false = red", "const [faceDetected, setFaceDetected] = useState(true);\n  const [isFullscreen, setIsFullscreen] = useState(false);");
}

// 3. Patch Fullscreen Enforcer
const oldEventListenersStart = "// ── STRICT PROCTORING EVENT LISTENERS ──────────────────────────────────────";
const oldEventListenersEnd = "// ── AI PROCTORING (Rounds 3-5) ─────────────────────────────────────────────";

let startIdx = code.indexOf(oldEventListenersStart);
let endIdx = code.indexOf(oldEventListenersEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newEventListeners = `// ── STRICT PROCTORING EVENT LISTENERS ──────────────────────────────────────
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
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleMalpracticeRef.current("Screenshots are not allowed.");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        handleMalpracticeRef.current("Restricted keyboard shortcuts (e.g. Developer Tools) are not allowed.");
      }
      if (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        handleMalpracticeRef.current("Screenshots are not allowed.");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        handleMalpracticeRef.current("Exiting fullscreen mode is not allowed. Please return to fullscreen.");
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
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  `;
  code = code.substring(0, startIdx) + newEventListeners + code.substring(endIdx);
} else {
  console.log("Could not find event listeners block");
}

// 4. Patch AI Proctoring Loop
const oldAILoopStart = "// ── AI PROCTORING (Rounds 3-5) ─────────────────────────────────────────────";
const oldAILoopEnd = "// ── SUBMIT: all hidden + visible testcases ─────────────────────────────────";

startIdx = code.indexOf(oldAILoopStart);
endIdx = code.indexOf(oldAILoopEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newAILoop = `// ── AI PROCTORING (Rounds 3-5) ─────────────────────────────────────────────
  useEffect(() => {
    const isProctoredRound = ['3', '4', '5'].includes(String(roundId));
    if (!isProctoredRound) return;

    let stream = null;
    let faceCheckInterval = null;
    let noFaceTimer = null;

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);

        // Load face-api models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        console.log("Face API models loaded successfully");

        faceCheckInterval = setInterval(async () => {
          if (!videoRef.current) return;
          const video = videoRef.current;
          
          if (video.paused || video.ended) return;

          try {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            
            if (detections.length === 0) {
              setFaceDetected(false);
              if (!noFaceTimer) {
                noFaceTimer = setTimeout(() => {
                  handleMalpracticeRef.current("AI Proctoring: Face not detected. Please look at the screen.");
                  noFaceTimer = null;
                }, 2000); // 2 second grace period
              }
            } else if (detections.length > 1) {
              setFaceDetected(false);
              handleMalpracticeRef.current("AI Proctoring: Multiple faces detected. You must be alone.");
            } else {
              setFaceDetected(true);
              if (noFaceTimer) {
                clearTimeout(noFaceTimer);
                noFaceTimer = null;
              }

              // Eye tracking / Head rotation heuristic using bounding box position
              const detection = detections[0];
              const box = detection.box;
              const videoWidth = video.videoWidth;
              const videoHeight = video.videoHeight;
              
              if (videoWidth > 0 && videoHeight > 0) {
                const centerX = box.x + box.width / 2;
                const centerY = box.y + box.height / 2;
                
                // If the center of the face is too far to the edges, they are looking away
                const marginX = videoWidth * 0.15;
                const marginY = videoHeight * 0.15;
                
                if (centerX < marginX || centerX > videoWidth - marginX || centerY < marginY || centerY > videoHeight - marginY) {
                  handleMalpracticeRef.current("AI Proctoring: Face turned away from screen.");
                }
              }
            }
          } catch (e) {
            console.error("Face detection error:", e);
          }
        }, 1000);

      } catch (err) {
        console.error("Camera permission denied:", err);
        handleMalpracticeRef.current("Camera permission denied. Camera feed is mandatory for this round.");
      }
    };

    initCamera();

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setFaceDetected(false);
        handleMalpracticeRef.current("AI Proctoring: Eye/Face movement detected away from the screen.");
      }
    };

    const handleMouseEnter = () => setFaceDetected(true);

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (faceCheckInterval) clearInterval(faceCheckInterval);
      if (noFaceTimer) clearTimeout(noFaceTimer);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [roundId]);

  `;
  code = code.substring(0, startIdx) + newAILoop + code.substring(endIdx);
} else {
  console.log("Could not find AI loop block");
}

fs.writeFileSync(envPath, code);
console.log("CandidateCodingEnv patched AI Loop successfully.");
