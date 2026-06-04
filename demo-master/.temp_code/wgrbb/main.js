const fs = require("fs");

function processData(input) {
    const lines = input.trim().split("\n");
    const n = parseInt(lines[0]);
    const nums = lines[1].split(" ").map(Number);
    const target = parseInt(lines[2]);

    let map = new Map();

    for (let i = 0; i < n; i++) {
        let complement = target - nums[i];

        if (map.has(complement)) {
            console.log(map.get(complement) + " " + i);
            return;
        }

        map.set(nums[i], i);
    }
}

const input = fs.readFileSync("/dev/stdin", "utf-8");
processData(input);