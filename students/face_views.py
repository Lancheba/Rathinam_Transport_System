from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsStudent
from students.models import FaceProfile


@api_view(['POST', 'DELETE'])
@permission_classes([IsStudent])
def face_enrollment(request):
    student = getattr(request.user, 'student_profile', None)
    if not student:
        return Response(
            {'detail': 'Link your student roll number first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == 'DELETE':
        try:
            student.face_profile.delete()
        except FaceProfile.DoesNotExist:
            pass
        return Response({'detail': 'Face data deleted.'}, status=status.HTTP_204_NO_CONTENT)

    # POST — enroll / re-enroll
    embedding = request.data.get('embedding')
    consent   = request.data.get('consent', False)

    if not consent:
        return Response(
            {'detail': 'Explicit consent is required to enroll your face.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not embedding or not isinstance(embedding, list):
        return Response(
            {'detail': 'A valid embedding array is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile, created = FaceProfile.objects.update_or_create(
        student=student,
        defaults={
            'embedding': embedding,
            'consent_given': True,
            'consent_at': timezone.now(),
        },
    )
    return Response(
        {'detail': 'Enrolled.' if created else 'Re-enrolled.', 'enrolled_at': profile.enrolled_at},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )
