from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Superusers/staff made with `createsuperuser` (or any other path that
        # skips the admin "Add user" form) would otherwise keep the default
        # STUDENT profile role -- which both mislabels their profile and
        # wrongly triggers the "Are you a student or teacher?" prompt.
        role = "ADMIN" if (instance.is_superuser or instance.is_staff) else "STUDENT"
        UserProfile.objects.create(user=instance, role=role)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
