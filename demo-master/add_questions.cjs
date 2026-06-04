const fs = require('fs');

const topics = ['Arrays', 'Trees', 'Graphs', 'Dynamic Programming', 'SQL'];
const difficulties = ['Easy', 'Medium', 'Hard'];

const newQuestions = {};

topics.forEach(topic => {
  newQuestions[topic] = [];
  difficulties.forEach(diff => {
    for (let i = 1; i <= 10; i++) {
      newQuestions[topic].push({
        id: `${topic.substring(0,3).toLowerCase()}_${diff.toLowerCase()}_${i}`,
        type: 'coding',
        title: `${topic} ${diff} Question ${i}`,
        difficulty: diff,
        description: `This is a ${diff.toLowerCase()} level question about ${topic}. You need to solve the problem efficiently.\n\nInput Format:\nLine 1: N\nLine 2: Data\n\nExample:\nInput: 5\n1 2 3 4 5\nOutput: 15`,
        starterCode: {
          javascript: 'const fs = require("fs");\nfunction processData(input) {\n  // your code here\n}\nconst input = fs.readFileSync("/dev/stdin", "utf-8");\nprocessData(input);',
          python: 'import sys\ndef process_data(input_data):\n    # your code here\n    pass\nif __name__ == "__main__":\n    input_data = sys.stdin.read()\n    process_data(input_data)',
          java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}'
        },
        visibleTestcases: [ { input: '5\n1 2 3 4 5', expected: '15' } ],
        hiddenTestcases: [ { input: '3\n1 1 1', expected: '3' } ]
      });
    }
  });
});

let content = fs.readFileSync('src/data/questionBank.js', 'utf-8');

const startMarker = '// ─── CODING PROBLEMS (Round 2 only) ──────────────────────────────────────────';
const endMarker = '// ─── TECHNICAL MCQ BANK (Round 3 only) ───────────────────────────────────────';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let replacement = startMarker + '\n';
  topics.forEach(topic => {
    replacement += `  '${topic}': ${JSON.stringify(newQuestions[topic], null, 4)},\n\n`;
  });
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/data/questionBank.js', content);
  console.log('Successfully updated questionBank.js');
} else {
  console.log('Could not find markers');
}
