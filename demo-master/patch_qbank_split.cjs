const fs = require('fs');
let content = fs.readFileSync('src/data/questionBank.js', 'utf-8');

const targetFunction = `export const generateTechnicalMCQ = (selectedTopics, count, difficulty) => {
  let pools = [];

  // If no topics are provided or all are false, fallback to all technical questions
  const isAnyTopicSelected = selectedTopics && Object.values(selectedTopics).some(v => v);
  
  if (!isAnyTopicSelected) {
    Object.values(TECHNICAL_MCQ_BANK).forEach(qList => {
      pools.push(...qList.map(q => ({ ...q, type: 'mcq' })));
    });
  } else {
    // Collect questions from selected topics across both banks
    for (const [topic, isSelected] of Object.entries(selectedTopics)) {
      if (isSelected) {
        if (TECHNICAL_MCQ_BANK[topic]) {
          pools.push(...TECHNICAL_MCQ_BANK[topic].map(q => ({ ...q, type: 'mcq' })));
        } else if (COMMUNICATION_BANK[topic]) {
          pools.push(...COMMUNICATION_BANK[topic].map(q => ({ ...q, type: 'open' })));
        }
      }
    }
  }

  if (pools.length === 0) return [];

  // Shuffle and slice
  const shuffled = [...pools].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count || 15, shuffled.length));

  // Sort them so that communication (already open) are separated if needed, 
  // but we can just map the technical ones to enforce 40% MCQ / 60% Open split.
  
  // Count how many total technical questions we have in our selected set
  const technicalQs = selected.filter(q => q.type === 'mcq');
  const communicationQs = selected.filter(q => q.type === 'open');
  
  // We want 40% of the TOTAL selected set to be MCQ. 
  // The rest (whether technical or communication) will be open.
  const targetMcqCount = Math.floor(selected.length * 0.4);
  let mcqAssigned = 0;

  const finalSet = selected.map(q => {
    if (q.type === 'open') return q; // Communication questions stay open
    
    if (mcqAssigned < targetMcqCount) {
      mcqAssigned++;
      return { ...q, type: 'mcq' };
    } else {
      // Convert technical MCQ to open text
      const { options, answer, ...rest } = q;
      return { ...rest, type: 'open' };
    }
  });

  // Re-shuffle to mix the MCQs and Open questions evenly
  return finalSet.sort(() => Math.random() - 0.5);
};`;

// Replace the old function
const startIndex = content.indexOf('export const generateTechnicalMCQ =');
if (startIndex !== -1) {
  const endIndex = content.indexOf('};', startIndex) + 2;
  const oldFunc = content.slice(startIndex, endIndex);
  content = content.replace(oldFunc, targetFunction);
  fs.writeFileSync('src/data/questionBank.js', content);
  console.log('Fixed generateTechnicalMCQ successfully.');
} else {
  console.log('Could not find generateTechnicalMCQ');
}
