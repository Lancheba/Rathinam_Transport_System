"""
Helpers that make exported files safe to open in Excel / LibreOffice.

A cell whose text starts with = + - or @ (or a tab / carriage return) is treated
as a FORMULA by spreadsheet programs. A student named "=HYPERLINK(...)" could
then run something on whoever opens the export. Prefixing a single quote makes
the program show it as plain text instead.
"""

_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value):
    """Return `value` with a leading ' if a spreadsheet would read it as a formula."""
    if isinstance(value, str) and value != "-" and value.startswith(_TRIGGERS):
        return "'" + value
    return value


def safe_rows(rows):
    """Apply safe_cell to every cell of a list of rows (returns new lists)."""
    return [[safe_cell(cell) for cell in row] for row in rows]


def force_text_cells(worksheet):
    """
    For .xlsx files: store every text cell as a plain string, never a formula.
    (openpyxl turns any string starting with "=" into a formula unless told otherwise.)
    """
    for row in worksheet.iter_rows():
        for cell in row:
            if isinstance(cell.value, str):
                cell.data_type = "s"
