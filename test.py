def add(n):
    count = 0
    for i in range(32):
        count += n & 1
        n = n >> 1
    return count


print(add(-1))
