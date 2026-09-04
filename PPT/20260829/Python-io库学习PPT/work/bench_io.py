import io, os, time, tempfile, sys

tmpdir = tempfile.mkdtemp()
path = os.path.join(tmpdir, 'bench.bin')
N = 1024 * 1024  # 1 MiB
payload = (b'a' * 4096) * 256
with open(path, 'wb') as f:
    f.write(payload)

def t(fn):
    s = time.perf_counter()
    fn()
    return time.perf_counter() - s

# 1) raw read, 1 byte at a time
def raw_read():
    f = io.FileIO(path, 'rb')
    while f.read(1):
        pass
    f.close()

# 2) buffered read, 1 byte at a time
def buf_read():
    f = io.BufferedReader(io.FileIO(path, 'rb'))
    while f.read(1):
        pass
    f.close()

out_raw = os.path.join(tmpdir, 'out_raw.bin')
out_buf = os.path.join(tmpdir, 'out_buf.bin')

# 3) raw write, 1 byte at a time
def raw_write():
    f = io.FileIO(out_raw, 'wb')
    for i in range(N):
        f.write(b'a')
    f.close()

# 4) buffered write, 1 byte at a time
def buf_write():
    f = io.BufferedWriter(io.FileIO(out_buf, 'wb'))
    for i in range(N):
        f.write(b'a')
    f.close()

r_raw = t(raw_read)
r_buf = t(buf_read)
w_raw = t(raw_write)
w_buf = t(buf_write)

# 5) string concat: += vs StringIO (20000 lines)
def concat_plus():
    s = ''
    for i in range(20000):
        s += 'line %d of the log file\n' % i
    return s

def concat_sio():
    sio = io.StringIO()
    for i in range(20000):
        sio.write('line %d of the log file\n' % i)
    return sio.getvalue()

c_plus = t(concat_plus)
c_sio = t(concat_sio)

print('python', sys.version.split()[0])
print('raw_read %.3f' % r_raw)
print('buf_read %.3f' % r_buf)
print('raw_write %.3f' % w_raw)
print('buf_write %.3f' % w_buf)
print('read_speedup %.1f' % (r_raw / r_buf))
print('write_speedup %.1f' % (w_raw / w_buf))
print('concat_plus %.3f' % c_plus)
print('concat_sio %.3f' % c_sio)
print('concat_speedup %.1f' % (c_plus / c_sio))
