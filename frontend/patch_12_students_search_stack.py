import pathlib

p = pathlib.Path("src/pages/StudentsPage.tsx")
c = p.read_text(encoding="utf-8")

old1 = (
    '      {/* Cross-bus search results take over the view while there\'s a query */}\n'
    '      {search.trim() ? (\n'
)
new1 = (
    '      {/* Search results stack above the roster view instead of replacing it */}\n'
    '      {search.trim() && (\n'
)
assert c.count(old1) == 1, "old1 not found exactly once"
c = c.replace(old1, new1)

old2 = (
    '        </div>\n'
    '      ) : selectedRoster ? (\n'
)
new2 = (
    '        </div>\n'
    '      )}\n\n'
    '      {selectedRoster ? (\n'
)
assert c.count(old2) == 1, "old2 not found exactly once"
c = c.replace(old2, new2)

p.write_text(c, encoding="utf-8")
print("Patched: src/pages/StudentsPage.tsx")
