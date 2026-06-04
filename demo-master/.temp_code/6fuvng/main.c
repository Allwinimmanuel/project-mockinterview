
// Sample code to perform I/O:

#include <stdio.h>

int max(int a, int b){
  return(a>b)?a:b;
}
int maxdepth(int arr[],int n,int i){
  if(i>= n || arr[i]==-1)
  return 0;
  int l=maxdepth(arr, n,2*i+1);
  int r=maxdepth(arr,n,2*i+2);
  return max(l,r)+1;
}

int main() {
	int n;
	scanf("%d",&n);			// Reading input from STDIN
  int arr[n];
  for(int i=0;i<n;i++){
    scanf("%d",&arr[i])
  }
	printf("%d",maxdepth(arr,n,0));	// Writing output to STDOUT
	return 0;
}


// Write your code here