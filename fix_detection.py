import io
code = open("attendance/detection.py", encoding="utf-8").read()
code = code.replace('\\"\\"\\"', '"""')
io.open("attendance/detection.py", "w", encoding="utf-8", newline="").write(code)
print("fixed, length:", len(code))
