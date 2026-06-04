const fs = require('fs');
let content = fs.readFileSync('src/data/questionBank.js', 'utf-8');

// Fix the broken escaped string on the comm_ls2 line
const broken = `{ id: 'comm_ls2', type: 'open', q: 'How do you ensure you fully understand someone\\\\'s point before responding in a meeting?' }`;
const fixed  = `{ id: 'comm_ls2', type: 'open', q: "How do you ensure you fully understand someone's point before responding in a meeting?" }`;

if (content.includes(broken)) {
  content = content.replace(broken, fixed);
  fs.writeFileSync('src/data/questionBank.js', content);
  console.log('Fixed successfully.');
} else {
  // Try a broader search
  const lines = content.split('\n');
  const idx = lines.findIndex(l => l.includes('comm_ls2'));
  if (idx !== -1) {
    console.log('Found on line', idx + 1, ':', lines[idx]);
    lines[idx] = `    { id: 'comm_ls2', type: 'open', q: "How do you ensure you fully understand someone's point before responding in a meeting?" },`;
    fs.writeFileSync('src/data/questionBank.js', lines.join('\n'));
    console.log('Fixed via line replacement.');
  } else {
    console.log('Could not find comm_ls2 line.');
  }
}
