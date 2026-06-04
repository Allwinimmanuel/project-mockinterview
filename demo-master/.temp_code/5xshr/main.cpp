
// Sample code to perform I/O:

#include <iostream>

using namespace std;

int main() {
	int n;
	cin >> n;			// Reading input from STDIN
  int s=0;
  for(int i=1;i<=n;i++){
    s+=2*i;
  }
  
	cout << s;	// Writing output to STDOUT
  return 0;
}


// Write your code here