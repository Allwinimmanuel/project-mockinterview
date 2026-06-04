
// Sample code to perform I/O:

#include <stdio.h>
int climbStairs(int n)
{
	if(n<=2)
		return n;

	int first=1, second=2, third;
	for(int i=3;i<=n;i++)
	{
		third=first+second;
		first=second;
		second=third;
	}
	return second;
}

int main() {
	int n;
	scanf("%d",&n);			// Reading input from STDIN
	printf("%d",climbStairs(n));	// Writing output to STDOUT
	return 0;
}


// Write your code here