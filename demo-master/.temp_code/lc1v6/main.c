#include<stdio.h>
int climbStairs(int n){
  if(n==1)
  return 1;
  int f=1,s=2,t;
  for(int i=3 ;i<=n;i++){
    t=f+s;
    f=s;
    s=t;
  }
  return s;
}
int main(){
  int n;
  scanf("%d",&n);
  printf("%d", climbStairs(n));
  return 0;
}