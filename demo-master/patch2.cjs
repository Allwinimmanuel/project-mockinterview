const fs = require('fs');
const p = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/CandidateCodingEnv.jsx';
let code = fs.readFileSync(p, 'utf8');

// 1. State change
code = code.replace(
  'const [isCameraMinimized, setIsCameraMinimized] = useState(false);',
  'const [isCameraMinimized, setIsCameraMinimized] = useState(true);'
);

// 2. CameraPIP replacement
const oldPip = `  const CameraPIP = ['3', '4', '5'].includes(String(roundId)) && (
      <div className={\`fixed bottom-6 right-6 z-40 bg-black rounded-xl shadow-2xl overflow-hidden w-52 h-40 border-2 
transition-colors duration-300 \${
        faceDetected ? 'border-green-500/60' : 'border-red-500/60'
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
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }\`}>
          <span className={\`w-2 h-2 rounded-full animate-pulse \${faceDetected ? 'bg-green-500' : 'bg-red-500'}\`}></span>
          {faceDetected ? 'Face Detected' : 'No Face'}
        </div>
        {/* AI Proctor label */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> AI Proctor
        </div>
      </div>
    );`;

const newPip = `  const CameraPIP = ['3', '4', '5'].includes(String(roundId)) && (
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
    );`;

code = code.replace(oldPip, newPip);

// 3. Wrapping Options Block
const optionsStart = '{/* Options */}';
// Look for the line that says: {['3', '4', '5'].includes(String(roundId)) && (
// Which indicates the voice input block.
const nextBlockStart = '{/* \uD83C\uDFA4 Voice / Text Answer Input (Rounds 3-5) \uD83C\uDFA4 */}';

let idx1 = code.indexOf(optionsStart);
let idx2 = code.indexOf(nextBlockStart);

if (idx1 !== -1 && idx2 !== -1) {
  let block = code.substring(idx1, idx2);
  if (!block.includes("{!['3', '4', '5'].includes(String(roundId))")) {
    let divIdx = block.indexOf('<div className="space-y-3">');
    if (divIdx !== -1) {
      let replacement = '{/* Options */}\n                {![\'3\', \'4\', \'5\'].includes(String(roundId)) && (\n                  ' + block.substring(divIdx).trim() + '\n                )}\n                ';
      code = code.substring(0, idx1) + replacement + code.substring(idx2);
    }
  }
}

fs.writeFileSync(p, code);
console.log('Success');
