const fs = require("fs");
function processData(input) {
  const lines = input.trim().split("\n");
  const n = parseInt(lines[0]);
  const nums = lines[1].split(" ").map(Number);
  
  // your code here
  // console.log(max_sum);
}

const input = fs.readFileSync("/dev/stdin", "utf-8");
processData(input);