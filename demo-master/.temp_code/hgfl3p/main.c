#include<stdio.h>
#include<string.h>

int max(int a,int b)
{
    return a>b?a:b;
}

int main()
{
    char s[1000];

    scanf("%s",s);

    int count=0,depth=0,maxDepth=0;

    for(int i=0;s[i]!='\0';i++)
    {
        if(s[i]=='[')
        {
            count++;
            maxDepth=max(maxDepth,count);
        }
        else if(s[i]==']')
        {
            count--;
        }
    }

    printf("%d",maxDepth-1);

    return 0;
}#include<stdio.h>
#include<string.h>

int max(int a,int b)
{
    return a>b?a:b;
}

int main()
{
    char s[1000];

    scanf("%s",s);

    int count=0,depth=0,maxDepth=0;

    for(int i=0;s[i]!='\0';i++)
    {
        if(s[i]=='[')
        {
            count++;
            maxDepth=max(maxDepth,count);
        }
        else if(s[i]==']')
        {
            count--;
        }
    }

    printf("%d",maxDepth-1);

    return 0;
}