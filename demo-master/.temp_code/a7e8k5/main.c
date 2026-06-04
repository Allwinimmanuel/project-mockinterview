
// Sample code to perform I/O:

#include <stdio.h>

int main() {
	int n;
  int arr[n];
	scanf("%d",&n);			// Reading input from STDIN
  for(int i=0;i<n;i++){
    scanf("%d",&arr[i]);
  }
  int m=arr[0];
  int c=arr[0];
  for(int i=1;i<n;i++){
    if(c+arr[i]>arr[i])
    c=c+arr[i];
    else 
    c=arr[i];
    if(c>m)
    m=c;
  }
  printf("%d",m);
  return 0;

}


// Write your code here