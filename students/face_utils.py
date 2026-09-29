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


MAX_POSES = 5  # a stored profile holds 1..5 poses; old single-pose data is just 128 values


def split_poses(value):
    """Stored embedding -> list of 128-value poses.

    Poses are stored back to back in one flat list (128 values = 1 pose,
    384 = 3 poses, ...), so old single-pose profiles keep working unchanged.
    """
    if not isinstance(value, list) or not value or len(value) % EMBEDDING_LENGTH != 0:
        raise ValueError("embedding must be 1-5 poses of 128 values")
    count = len(value) // EMBEDDING_LENGTH
    if count > MAX_POSES:
        raise ValueError("too many poses")
    return [
        clean_embedding(value[i * EMBEDDING_LENGTH:(i + 1) * EMBEDDING_LENGTH])
        for i in range(count)
    ]


def clean_pose_set(poses):
    """Validate a list of 1..5 embeddings (front pose first) and return them as one flat list."""
    if not isinstance(poses, list) or not 1 <= len(poses) <= MAX_POSES:
        raise ValueError("poses must be a list of 1-5 embeddings")
    flat = []
    for pose in poses:
        flat.extend(clean_embedding(pose))
    return flat
