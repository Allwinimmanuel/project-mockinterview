
// Sample code to perform I/O:

#include <iostream>

using namespace std;

int main() {
	int n;
	cin >> n;			// Reading input from STDIN
  int x,s=0;
  for(int i=0;i<n;i++){
    cin >>x;
    s+=x;
  }
	cout << s;	// Writing output to STDOUT
  return 0;
}


// Write your code here