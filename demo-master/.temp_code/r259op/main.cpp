
// Sample code to perform I/O:

#include <iostream>

using namespace std;

int main() {
	int n;
	cin >> n;			// Reading input from STDIN
  int s=0,x;
    for(int i=0;i<n;i++){
    cin>>x;
    s+=i;
  }
  
	cout << s;	// Writing output to STDOUT
  return 0;
}


// Write your code here