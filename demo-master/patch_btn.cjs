const fs = require('fs');

const envPath = 'c:/Users/alwin immanuel.J/Downloads/working folder/mock interview/frontend and ui for online examination/Online-Examination-System-main/react-interview-app/src/pages/CandidateCodingEnv.jsx';
let code = fs.readFileSync(envPath, 'utf8');

const oldBtnStart = "onClick={() => {\n                document.documentElement.requestFullscreen().catch(err => {\n                  console.error(\"Fullscreen error:\", err);\n                });\n              }}";

const newBtnStart = `onClick={async () => {
                try {
                  const elem = document.documentElement;
                  if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                  } else if (elem.webkitRequestFullscreen) {
                    await elem.webkitRequestFullscreen();
                  } else if (elem.msRequestFullscreen) {
                    await elem.msRequestFullscreen();
                  }
                  setIsFullscreen(true);
                } catch (err) {
                  console.error("Fullscreen error:", err);
                  setIsFullscreen(true); // Fallback to let them continue
                }
              }}`;

if (code.includes("document.documentElement.requestFullscreen().catch(err => {")) {
    const lines = code.split("\\n");
    code = code.replace(/onClick=\{\(\) => \{\s*document\.documentElement\.requestFullscreen\(\)\.catch\(err => \{\s*console\.error\("Fullscreen error:", err\);\s*\}\);\s*\}\}/g, newBtnStart);
    fs.writeFileSync(envPath, code);
    console.log("Button patched via regex!");
} else {
    console.log("Could not find button code exactly!");
}
