const fs = require('fs');

let content = fs.readFileSync('src/data/questionBank.js', 'utf8');

// The file has QUESTION_BANK followed by some export functions.
// We only want to modify the QUESTION_BANK part.

// Find the end of QUESTION_BANK object
const bankEndIndex = content.indexOf('export function generateQuestions');
if (bankEndIndex === -1) {
    console.error("Could not find the end of QUESTION_BANK");
    process.exit(1);
}

// Split into the object part and the rest
let bankString = content.substring(0, bankEndIndex);
let restString = content.substring(bankEndIndex);

// Replace the export with global assignment to parse it
let executableString = bankString.replace('export const QUESTION_BANK =', 'global.QUESTION_BANK =');

try {
    eval(executableString);
} catch(e) {
    console.error("Failed to parse", e);
    process.exit(1);
}

const bank = global.QUESTION_BANK;

for (const category in bank) {
    if (bank[category] && bank[category].length > 0 && bank[category][0].type === 'coding') {
        // Keep only 3 items
        bank[category] = bank[category].slice(0, 3);
        
        bank[category].forEach((q, idx) => {
            q.title = category + ' Problem ' + (idx + 1);
            q.description = 'Write a program to solve ' + q.title + '.\n\nInput Format:\nLine 1: N\nLine 2: Data\n\nExample:\nInput:\n' + (idx + 2) + '\nOutput:\n' + ((idx + 2) * 2);
            q.visibleTestcases = [ { input: String(idx + 2), expected: String((idx + 2) * 2) } ];
            q.hiddenTestcases = [ { input: String(idx + 5), expected: String((idx + 5) * 2) } ];
        });
    }
}

// Ensure at least one realistic question for Two Sum
if (bank['Arrays'] && bank['Arrays'].length > 0) {
    bank['Arrays'][0].title = 'Two Sum';
    bank['Arrays'][0].description = 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nInput Format:\nLine 1: N\nLine 2: N space-separated integers\nLine 3: target integer\n\nExample:\nInput:\n4\n2 7 11 15\n9\nOutput:\n0 1';
    bank['Arrays'][0].visibleTestcases = [{ input: '4\n2 7 11 15\n9', expected: '0 1' }];
    bank['Arrays'][0].hiddenTestcases = [{ input: '2\n3 3\n6', expected: '0 1' }];
}

const newBankStr = 'export const QUESTION_BANK = ' + JSON.stringify(bank, null, 2) + ';\n\n';
const finalContent = newBankStr + restString;

fs.writeFileSync('src/data/questionBank.js', finalContent, 'utf8');
console.log('Fixed question bank!');
