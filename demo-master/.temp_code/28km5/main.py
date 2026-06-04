import sys
def process_data(input_data):
    lines = input_data.strip().split("\n")
    n = int(lines[0])
    nums = list(map(int, lines[1].split()))
    target = int(lines[2])
    
    # your code here
    # print(f"{index1} {index2}")

if __name__ == "__main__":
    input_data = sys.stdin.read()
    process_data(input_data)