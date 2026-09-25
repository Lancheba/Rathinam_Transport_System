from cryptography.fernet import Fernet
from django.conf import settings
from django.db import migrations

import students.fields


def _fernet():
    key = settings.FACE_EMBEDDING_KEY
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_existing_embeddings(apps, schema_editor):
    f = _fernet()
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT id, embedding FROM students_faceprofile')
        rows = cursor.fetchall()
        for pk, raw in rows:
            if raw is None:
                continue
            ciphertext = f.encrypt(raw.encode()).decode()
            cursor.execute(
                'UPDATE students_faceprofile SET embedding = %s WHERE id = %s',
                [ciphertext, pk],
            )


def decrypt_existing_embeddings(apps, schema_editor):
    f = _fernet()
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT id, embedding FROM students_faceprofile')
        rows = cursor.fetchall()
        for pk, raw in rows:
            if raw is None:
                continue
            plaintext = f.decrypt(raw.encode()).decode()
            cursor.execute(
                'UPDATE students_faceprofile SET embedding = %s WHERE id = %s',
                [plaintext, pk],
            )


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0004_faceprofile_retake_count'),
    ]

    operations = [
        migrations.AlterField(
            model_name='faceprofile',
            name='embedding',
            field=students.fields.EncryptedListField(),
        ),
        migrations.RunPython(encrypt_existing_embeddings, decrypt_existing_embeddings),
    ]
