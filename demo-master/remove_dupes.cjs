const fs = require('fs');
let content = fs.readFileSync('src/data/questionBank.js', 'utf-8');

// Find positions of both occurrences of generateQuestions
const marker1 = 'export function generateQuestions';
const first = content.indexOf(marker1);
const second = content.indexOf(marker1, first + 1);

if (second !== -1) {
  // Find where the second generateQuestions block ends — it ends before "// ─── COMMUNICATION SKILLS BANK"
  // We need to remove from the second occurrence of generateQuestions
  // all the way through the second COMMUNICATION_BANK closing }; 

  const marker2 = 'export const COMMUNICATION_BANK';
  const commFirst = content.indexOf(marker2);
  const commSecond = content.indexOf(marker2, commFirst + 1);

  if (commSecond !== -1) {
    // Find the closing }; of the second COMMUNICATION_BANK
    const afterCommSecond = content.indexOf('\n};\n', commSecond);
    if (afterCommSecond !== -1) {
      const endOfDuplicates = afterCommSecond + '\n};\n'.length;
      // Remove from second generateQuestions to end of second COMMUNICATION_BANK
      content = content.substring(0, second) + content.substring(endOfDuplicates);
      fs.writeFileSync('src/data/questionBank.js', content);
      console.log('Removed duplicates successfully.');
    } else {
      console.log('Could not find closing }; for second COMMUNICATION_BANK');
    }
  } else {
    console.log('Could not find second COMMUNICATION_BANK');
  }
} else {
  console.log('No duplicate generateQuestions found.');
}
