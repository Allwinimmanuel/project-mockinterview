
// Sample code to perform I/O:

#include <iostream>

using namespace std;

int main() {
	int n;
	cin >> n;			// Reading input from STDIN
  int x,s=0;
  for(int i=0;i<n;i++){
    cin>>x;
    s+=x;
  }
	cout << s;
  return 0;	// Writing output to STDOUT
}


// Write your code here