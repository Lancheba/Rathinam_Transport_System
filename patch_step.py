import io

p = ".github/workflows/ci.yml"
t = io.open(p, encoding="utf-8").read()
old = """          DJANGO_SECRET_KEY: ci-only-secret-key-not-used-anywhere-else-0123456789abcdef
          DEVICE_API_KEY: ci-only-device-key-not-used-anywhere-else-0123456789abcdef"""
new = """          DJANGO_SECRET_KEY: ci-only-secret-key-not-used-anywhere-else-0123456789abcdef
          FACE_EMBEDDING_KEY: 6AKwBw9JRoY97c1ubESqqiO7jQiZaC7PmS_4Qf7bIO0="""
found = t.count(old)
if found == 1:
    t = t.replace(old, new, 1)
    io.open(p, "w", encoding="utf-8", newline="").write(t)
print("found:", found)
