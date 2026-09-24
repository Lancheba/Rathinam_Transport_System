import math

EMBEDDING_LENGTH = 128
EMBEDDING_ABS_LIMIT = 2.0  # face-api.js descriptors stay well inside +/-2


def clean_embedding(value):
    """Return the embedding as a list of 128 finite floats, or raise ValueError.

    Used by both face enrollment and the QR scan so a crafted payload (wrong
    length, strings, nulls, booleans, huge values, NaN/Infinity) is rejected
    before it is stored or compared.
    """
    if not isinstance(value, list) or len(value) != EMBEDDING_LENGTH:
        raise ValueError("embedding must be a list of 128 values")
    cleaned = []
    for x in value:
        if isinstance(x, bool) or not isinstance(x, (int, float)):
            raise ValueError("embedding values must be numbers")
        if not math.isfinite(x) or abs(x) > EMBEDDING_ABS_LIMIT:
            raise ValueError("embedding value out of range")
        cleaned.append(float(x))
    return cleaned
