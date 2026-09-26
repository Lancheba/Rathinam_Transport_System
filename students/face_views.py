"""
students/face_views.py

Handles face enrollment and re-enrollment.

Security improvements in this version:
  - Duplicate-face guard: incoming embedding is compared against every
    enrolled FaceProfile at enrollment time. If the distance falls below
    FACE_ENROLL_DUPE_THRESHOLD the request is rejected with an explicit
    warning. A FaceProfileAudit row (DUPE_ATTEMPT) is written so admins
    can review suspicious activity.
  - Embedding validation is delegated to clean_embedding() so the logic
    lives in one place.
  - Every early return carries an appropriate HTTP status code.
  - Audit rows are written for every mutating action.
"""

import logging
import math

import numpy as np
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsStudent
from attendance.net import client_ip
from students.face_utils import clean_embedding
from students.models import FaceProfile, FaceProfileAudit

logger = logging.getLogger(__name__)

MAX_RETAKES = 3

# How close two embeddings must be (Euclidean) to count as the same face.
# face-api.js 128-d descriptors: 0.6 is the standard match threshold;
# we use a slightly tighter value here so only genuine duplicates are caught.
_DEFAULT_DUPE_THRESHOLD = 0.55


def _face_distance(a: list, b: list) -> float:
    """Euclidean distance between two 128-d face embeddings."""
    return float(
        np.linalg.norm(
            np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)
        )
    )


def _find_duplicate_profile(embedding: list, exclude_student_id: int | None = None) -> FaceProfile | None:
    """
    Scan every enrolled FaceProfile and return the first one whose embedding
    is within FACE_ENROLL_DUPE_THRESHOLD of *embedding*, or None.

    We exclude the student who already owns this face (re-enrollment) so they
    are not flagged as a duplicate of themselves.
    """
    threshold = getattr(settings, "FACE_ENROLL_DUPE_THRESHOLD", _DEFAULT_DUPE_THRESHOLD)

    qs = FaceProfile.objects.select_related("student")
    if exclude_student_id is not None:
        qs = qs.exclude(student_id=exclude_student_id)

    for profile in qs.iterator():
        stored = profile.embedding
        if not stored or len(stored) != 128:
            continue
        try:
            distance = _face_distance(embedding, stored)
        except (ValueError, TypeError):
            continue

        if math.isfinite(distance) and distance < threshold:
            logger.warning(
                "Duplicate face detected: distance=%.4f, conflicting student=%s",
                distance,
                profile.student_id,
            )
            return profile

    return None


def _status_payload(profile: FaceProfile | None) -> dict:
    enrolled = bool(profile and profile.embedding)
    used = profile.retake_count if profile else 0
    return {
        "enrolled": enrolled,
        "last_enrolled_at": profile.updated_at if enrolled else None,
        "retakes_used": used,
        "retakes_remaining": max(MAX_RETAKES - used, 0),
        "max_retakes": MAX_RETAKES,
    }


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsStudent])
def face_enrollment(request):
    student = getattr(request.user, "student_profile", None)
    if not student:
        return Response(
            {"detail": "Link your student roll number first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile = getattr(student, "face_profile", None)
    ip = client_ip(request)

    # ------------------------------------------------------------------ GET --
    if request.method == "GET":
        return Response(_status_payload(profile))

    # --------------------------------------------------------------- DELETE --
    if request.method == "DELETE":
        if profile:
            profile.embedding = []
            profile.consent_given = False
            profile.consent_at = None
            profile.save()
            FaceProfileAudit.objects.create(
                student=student,
                action=FaceProfileAudit.DELETE,
                actor=request.user,
                ip_address=ip,
            )
        return Response(_status_payload(profile))

    # ---------------------------------------------------------------- POST --
    embedding_raw = request.data.get("embedding")
    consent = request.data.get("consent", False)

    if not consent:
        return Response(
            {"detail": "Explicit consent is required to enroll your face."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        embedding = clean_embedding(embedding_raw)
    except ValueError:
        return Response(
            {"detail": "A valid 128-value embedding array is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------- Duplicate-face guard ----------
    # Exclude the student's own profile so a re-enrollment is not flagged
    # as a duplicate of themselves.
    exclude_id = student.pk if (profile and profile.embedding) else None
    duplicate = _find_duplicate_profile(embedding, exclude_student_id=exclude_id)

    if duplicate is not None:
        # Write an audit row so admins can investigate.
        FaceProfileAudit.objects.create(
            student=student,
            action=FaceProfileAudit.DUPE_ATTEMPT,
            actor=request.user,
            ip_address=ip,
        )
        logger.warning(
            "DUPE_ATTEMPT: student=%s tried to enroll a face already registered "
            "to student=%s (ip=%s)",
            student.pk,
            duplicate.student_id,
            ip,
        )
        return Response(
            {
                "detail": (
                    "⚠️ This face is already registered to a different account. "
                    "Please use your correct credentials. "
                    "Attempting to register another student's face is a violation "
                    "of the app rules and may result in a permanent ban."
                ),
                "code": "FACE_DUPLICATE",
            },
            status=status.HTTP_409_CONFLICT,
        )
    # ------------------------------------------

    now = timezone.now()

    if profile is None:
        FaceProfile.objects.create(
            student=student,
            embedding=embedding,
            consent_given=True,
            consent_at=now,
        )
        FaceProfileAudit.objects.create(
            student=student,
            action=FaceProfileAudit.ENROLL,
            actor=request.user,
            ip_address=ip,
        )
        payload = _status_payload(student.face_profile)
        payload["detail"] = "Enrolled."
        return Response(payload, status=status.HTTP_201_CREATED)

    # Re-enrollment ↓
    if profile.retake_count >= MAX_RETAKES:
        return Response(
            {
                "detail": (
                    f"Retake limit reached ({MAX_RETAKES}). "
                    "Contact your admin to reset it."
                )
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    profile.embedding = embedding
    profile.consent_given = True
    profile.consent_at = now
    profile.retake_count += 1
    profile.save()
    FaceProfileAudit.objects.create(
        student=student,
        action=FaceProfileAudit.REENROLL,
        actor=request.user,
        ip_address=ip,
    )
    payload = _status_payload(profile)
    payload["detail"] = "Re-enrolled."
    return Response(payload, status=status.HTTP_200_OK)
