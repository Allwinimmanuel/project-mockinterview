#include<stdio.h>
#include<string.h>

int main()
{
    char s[1000];

    scanf("%s",s);

    int depth=0,maxDepth=0;

    for(int i=0;s[i]!='\0';i++)
    {
        if(s[i]=='[')
        {
            depth++;

            if(depth>maxDepth)
            {
                maxDepth=depth;
            }
        }
        else if(s[i]==']')
        {
            depth--;
        }
    }

    printf("%d",maxDepth-1);

    return 0;
}