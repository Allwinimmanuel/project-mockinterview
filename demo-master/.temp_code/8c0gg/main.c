#include<stdio.h>

int n,m;
char a[100][100];
int visited[100][100];

void dfs(int i,int j)
{
    if(i<0 || j<0 || i>=n || j>=m)
    {
        return;
    }

    if(a[i][j]=='0' || visited[i][j])
    {
        return;
    }

    visited[i][j]=1;

    dfs(i+1,j);
    dfs(i-1,j);
    dfs(i,j+1);
    dfs(i,j-1);
}

int main()
{
    scanf("%d %d",&n,&m);

    for(int i=0;i<n;i++)
    {
        for(int j=0;j<m;j++)
        {
            scanf(" %c",&a[i][j]);
        }
    }

    int count=0;

    for(int i=0;i<n;i++)
    {
        for(int j=0;j<m;j++)
        {
            if(a[i][j]=='1' && !visited[i][j])
            {
                dfs(i,j);
                count++;
            }
        }
    }

    printf("%d",count);

    return 0;
}