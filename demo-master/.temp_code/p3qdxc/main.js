const fs = require("fs");
function processData(input) {
  const lines = input.trim().split("\n");
  const rootArr = JSON.parse(lines[0]);
  // Need to build tree and find depth
  // console.log(depth);
}

const input = fs.readFileSync("/dev/stdin", "utf-8");
processData(input);