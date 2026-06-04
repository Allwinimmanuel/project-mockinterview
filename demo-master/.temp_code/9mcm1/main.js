
/*function processData(input){
	//write your code here
}

process.stdin.resume();
process.stdin.setEncoding("ascii");
_input = "";
process.stdin.on("data", function (input) {
	_input += input;
});

process.stdin.on("end", function () {
	processData(_input);
});*/
function twoSum(nums, target)
{
	const map = new Map();
	for (let i=0;i<nums.length; i++)
	{
		const complement = target - nums[i];
		if(map.has(complement))
		{
			return [map.get(complement), i];
		}
		map.set(nums[i], i);
	}
	return [];
}