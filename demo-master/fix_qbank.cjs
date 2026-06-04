const fs = require('fs');
let content = fs.readFileSync('src/data/questionBank.js', 'utf-8');
const lines = content.split('\n');

// Find the line where QUESTION_BANK should end (after SQL closing bracket, before COMMUNICATION_BANK topics)
// SQL is at line 2946, and it ends with '],' then the next topic 'Self Introduction' is wrong
// We need to find the line index of "  'Self Introduction'" and insert "};" before it

const selfIntroLine = lines.findIndex(l => l.trim() === "'Self Introduction': [");
const genQLine = lines.findIndex(l => l.includes('export function generateQuestions'));

if (selfIntroLine !== -1 && genQLine !== -1) {
  // The QUESTION_BANK should end just before 'Self Introduction'
  // Check if there's already a '}' or '];' just before it
  let insertAt = selfIntroLine;
  // Walk backwards to find the last '],' line before selfIntroLine which is inside QUESTION_BANK
  // We need to replace the trailing comma with nothing and add '};\n'
  // Actually, find line before selfIntroLine that has content
  for (let i = selfIntroLine - 1; i >= 0; i--) {
    if (lines[i].trim() !== '') {
      // This should be the closing '],' of the SQL array
      console.log('Line before Self Introduction:', i+1, JSON.stringify(lines[i]));
      if (lines[i].trim() === '],') {
        lines[i] = '  ]';  // remove trailing comma
        // Insert '};\n' after this
        lines.splice(i + 1, 0, '};');
        console.log('Inserted closing }; at line', i+2);
      }
      break;
    }
  }
  
  content = lines.join('\n');
  fs.writeFileSync('src/data/questionBank.js', content);
  console.log('Done.');
} else {
  console.log('selfIntroLine:', selfIntroLine, 'genQLine:', genQLine);
}
