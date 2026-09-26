from django.test import TestCase

from buses.models import Bus
from students.fields import EncryptedListField
from students.models import FaceProfile, Student


class EncryptedListFieldCoverageTests(TestCase):
    def setUp(self):
        self.field = EncryptedListField()

    def test_to_python_passes_through_list(self):
        value = [0.1, 0.2, 0.3]
        self.assertEqual(self.field.to_python(value), value)

    def test_to_python_empty_value_returns_empty_list(self):
        self.assertEqual(self.field.to_python(""), [])
        self.assertEqual(self.field.to_python(None), [])

    def test_to_python_parses_json_string(self):
        self.assertEqual(self.field.to_python("[1, 2, 3]"), [1, 2, 3])

    def test_to_python_passes_through_other_types(self):
        self.assertEqual(self.field.to_python(42), 42)

    def test_roundtrip_through_database(self):
        bus = Bus.objects.create(
            bus_number="COVFLD1", route="Route", rfid_uid="RFID-FLD1",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student = Student.objects.create(name="Field Kid", roll_number="FLK1", bus=bus)
        embedding = [0.123456] * 128
        FaceProfile.objects.create(student=student, embedding=embedding)

        fetched = FaceProfile.objects.get(student=student)
        self.assertEqual(len(fetched.embedding), 128)
        self.assertAlmostEqual(fetched.embedding[0], 0.123456)

    def test_roundtrip_empty_embedding(self):
        bus = Bus.objects.create(
            bus_number="COVFLD2", route="Route", rfid_uid="RFID-FLD2",
            departure_time="08:00", length_m="10.00", width_m="2.50",
        )
        student = Student.objects.create(name="Field Kid2", roll_number="FLK2", bus=bus)
        FaceProfile.objects.create(student=student, embedding=[])
        fetched = FaceProfile.objects.get(student=student)
        self.assertEqual(fetched.embedding, [])
