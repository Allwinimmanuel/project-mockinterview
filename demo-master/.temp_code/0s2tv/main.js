const fs = require("fs");
function processData(input) {
  const lines = input.trim().split("\n");
  const [rows, cols] = lines[0].split(" ").map(Number);
  const grid = [];
  for(let i=1; i<=rows; i++) grid.push(lines[i].split(" "));
  // your code here
  // console.log(count);
}

const input = fs.readFileSync("/dev/stdin", "utf-8");
processData(input);