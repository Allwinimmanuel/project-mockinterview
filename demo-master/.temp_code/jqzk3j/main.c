#include <stdio.h>

int climbStairs(int n) {
    if (n <= 2)
        return n;

    int first = 1, second = 2, third;

    for (int i = 3; i <= n; i++) {
        third = first + second;
        first = second;
        second = third;
    }

    return second;
}

int main() {
    int n;
    scanf("%d", &n);

    printf("%d", climbStairs(n));

    return 0;
}