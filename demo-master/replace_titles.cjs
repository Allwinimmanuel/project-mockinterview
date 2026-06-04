const fs = require('fs');

const rawTitles = fs.readFileSync('titles.txt', 'utf-8').split('\n');

const newQuestions = {};
let currentTopic = '';
let currentDiff = '';
let questionIdx = 1;

for (let i = 0; i < rawTitles.length; i++) {
  const line = rawTitles[i].trim();
  if (!line) continue;
  
  if (['Arrays', 'Trees', 'Graphs', 'Dynamic Programming', 'SQL'].includes(line)) {
    currentTopic = line;
    newQuestions[currentTopic] = [];
  } else if (line.startsWith('Easy') || line.startsWith('Medium') || line.startsWith('Hard')) {
    currentDiff = line.split(' ')[0];
    questionIdx = 1;
  } else {
    // This is a title
    if (!currentTopic || !currentDiff) continue;
    
    newQuestions[currentTopic].push({
      id: `${currentTopic.substring(0,3).toLowerCase()}_${currentDiff.toLowerCase()}_${questionIdx}`,
      type: 'coding',
      title: line,
      difficulty: currentDiff,
      description: `Write a program to solve: ${line}.\n\nThis is a ${currentDiff.toLowerCase()} level question about ${currentTopic}. You need to solve the problem efficiently.\n\nInput Format:\nLine 1: N\nLine 2: Data\n\nExample:\nInput: 5\n1 2 3 4 5\nOutput: 15`,
      starterCode: {
        javascript: 'const fs = require("fs");\nfunction processData(input) {\n  // your code here\n}\nconst input = fs.readFileSync("/dev/stdin", "utf-8");\nprocessData(input);',
        python: 'import sys\ndef process_data(input_data):\n    # your code here\n    pass\nif __name__ == "__main__":\n    input_data = sys.stdin.read()\n    process_data(input_data)',
        java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}'
      },
      visibleTestcases: [ { input: '5\n1 2 3 4 5', expected: '15' } ],
      hiddenTestcases: [ { input: '3\n1 1 1', expected: '3' } ]
    });
    questionIdx++;
  }
}

let content = fs.readFileSync('src/data/questionBank.js', 'utf-8');

const startMarker = '// ─── CODING PROBLEMS (Round 2 only) ──────────────────────────────────────────';
const endMarker = '// ─── TECHNICAL MCQ BANK (Round 3 only) ───────────────────────────────────────';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let replacement = startMarker + '\n';
  Object.keys(newQuestions).forEach(topic => {
    replacement += `  '${topic}': ${JSON.stringify(newQuestions[topic], null, 4)},\n\n`;
  });
  
  // Make sure we add `};` properly at the end
  content = content.substring(0, startIndex) + replacement + '};\n\n' + content.substring(endIndex);
  
  // Wait, wait! Currently the file has:
  // ]
  // };
  // // ─── TECHNICAL MCQ BANK (Round 3 only)
  //
  // Because my `endMarker` is `// ─── TECHNICAL MCQ BANK...`
  // That means I am replacing EVERYTHING between startMarker and endMarker.
  // Previously `};` was right before endMarker, so it got deleted!
  
  fs.writeFileSync('src/data/questionBank.js', content);
  console.log('Successfully updated questionBank.js with real titles.');
} else {
  console.log('Could not find markers');
}
