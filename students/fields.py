import json

from cryptography.fernet import Fernet
from django.conf import settings
from django.db import models


def _fernet():
    key = settings.FACE_EMBEDDING_KEY
    return Fernet(key.encode() if isinstance(key, str) else key)


class EncryptedListField(models.TextField):
    """Stores a JSON-serializable list (a face embedding) encrypted at rest
    with Fernet. Reads and writes transparently as a plain Python list
    everywhere else in the codebase -- only the column on disk is ciphertext."""

    description = "A Fernet-encrypted JSON list"

    def from_db_value(self, value, expression, connection):
        if not value:
            return []
        plaintext = _fernet().decrypt(value.encode())
        return json.loads(plaintext.decode())

    def to_python(self, value):
        if isinstance(value, list):
            return value
        if not value:
            return []
        if isinstance(value, str):
            return json.loads(value)
        return value

    def get_prep_value(self, value):
        if not value:
            value = []
        payload = json.dumps(value).encode()
        return _fernet().encrypt(payload).decode()
