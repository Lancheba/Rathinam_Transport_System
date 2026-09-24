from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsStudent
from students.face_utils import clean_embedding
from students.models import FaceProfile

MAX_RETAKES = 3


def _status_payload(profile):
    enrolled = bool(profile and profile.embedding)
    used = profile.retake_count if profile else 0
    return {
        'enrolled': enrolled,
        'last_enrolled_at': profile.updated_at if enrolled else None,
        'retakes_used': used,
        'retakes_remaining': max(MAX_RETAKES - used, 0),
        'max_retakes': MAX_RETAKES,
    }


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsStudent])
def face_enrollment(request):
    student = getattr(request.user, 'student_profile', None)
    if not student:
        return Response(
            {'detail': 'Link your student roll number first.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile = getattr(student, 'face_profile', None)

    # GET - enrolled state + retakes left
    if request.method == 'GET':
        return Response(_status_payload(profile))

    # DELETE - wipe the face data but keep the row so the retake counter survives
    if request.method == 'DELETE':
        if profile:
            profile.embedding = []
            profile.consent_given = False
            profile.consent_at = None
            profile.save()
        return Response(_status_payload(profile))

    # POST - enroll / re-enroll
    embedding = request.data.get('embedding')
    consent = request.data.get('consent', False)

    if not consent:
        return Response(
            {'detail': 'Explicit consent is required to enroll your face.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        embedding = clean_embedding(embedding)
    except ValueError:
        return Response(
            {'detail': 'A valid 128-value embedding array is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if profile is None:
        profile = FaceProfile.objects.create(
            student=student,
            embedding=embedding,
            consent_given=True,
            consent_at=timezone.now(),
        )
        created = True
    else:
        if profile.retake_count >= MAX_RETAKES:
            return Response(
                {'detail': f'Retake limit reached ({MAX_RETAKES}). Contact your admin to reset it.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile.embedding = embedding
        profile.consent_given = True
        profile.consent_at = timezone.now()
        profile.retake_count += 1
        profile.save()
        created = False

    payload = _status_payload(profile)
    payload['detail'] = 'Enrolled.' if created else 'Re-enrolled.'
    return Response(payload, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
