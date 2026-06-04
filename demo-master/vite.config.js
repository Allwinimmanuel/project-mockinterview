import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const localCompilerPlugin = () => ({
  name: 'local-compiler',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/compile' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { language, code, stdin } = data;
            const runId = Math.random().toString(36).substring(7);
            const tempDir = path.join(process.cwd(), '.temp_code');
            const runDir = path.join(tempDir, runId);
            
            fs.mkdirSync(runDir, { recursive: true });
            const inputFile = path.join(runDir, 'input.txt');
            fs.writeFileSync(inputFile, stdin || '');

            res.setHeader('Content-Type', 'application/json');

            if (language === 'javascript') {
              const srcFile = path.join(runDir, 'main.js');
              fs.writeFileSync(srcFile, code);
              exec(`node main.js < input.txt`, { cwd: runDir, timeout: 5000 }, (err, stdout, stderr) => {
                res.end(JSON.stringify({ run: { code: err ? 1 : 0, output: stdout, stderr: stderr } }));
              });
            } else if (language === 'python') {
              const srcFile = path.join(runDir, 'main.py');
              fs.writeFileSync(srcFile, code);
              exec(`py main.py < input.txt`, { cwd: runDir, timeout: 5000 }, (err, stdout, stderr) => {
                res.end(JSON.stringify({ run: { code: err ? 1 : 0, output: stdout, stderr: stderr } }));
              });
            } else if (language === 'java') {
              const srcFile = path.join(runDir, 'Main.java');
              fs.writeFileSync(srcFile, code);
              exec(`javac Main.java`, { cwd: runDir }, (cerr, cstdout, cstderr) => {
                if (cerr || cstderr) {
                  res.end(JSON.stringify({ compile: { code: 1, stderr: cstderr || cerr.message } }));
                  return;
                }
                exec(`java Main < input.txt`, { cwd: runDir, timeout: 5000 }, (rerr, rstdout, rstderr) => {
                  res.end(JSON.stringify({ run: { code: rerr ? 1 : 0, output: rstdout, stderr: rstderr } }));
                });
              });
            } else if (language === 'cpp' || language === 'c') {
              const ext = language === 'c' ? 'c' : 'cpp';
              const compiler = language === 'c' ? 'gcc' : 'g++';
              const srcFile = path.join(runDir, `main.${ext}`);
              const binFile = path.join(runDir, 'main.exe');
              fs.writeFileSync(srcFile, code);
              
              exec(`${compiler} main.${ext} -o main.exe`, { cwd: runDir }, (cerr, cstdout, cstderr) => {
                if (cerr || cstderr) {
                  res.end(JSON.stringify({ compile: { code: 1, stderr: cstderr || cerr.message } }));
                  return;
                }
                exec(`main.exe < input.txt`, { cwd: runDir, timeout: 5000 }, (rerr, rstdout, rstderr) => {
                  res.end(JSON.stringify({ run: { code: rerr ? 1 : 0, output: rstdout, stderr: rstderr } }));
                });
              });
            } else {
              res.end(JSON.stringify({ run: { code: 1, stderr: 'Unsupported language' } }));
            }
          } catch (err) {
            res.end(JSON.stringify({ run: { code: 1, stderr: err.message } }));
          }
        });
        return;
      }
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), localCompilerPlugin()],
})
