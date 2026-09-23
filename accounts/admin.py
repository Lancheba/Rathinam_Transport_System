from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import UserProfile


class UserCreateForm(BaseUserAdmin.add_form):
    """The 'Add user' form: username + password, plus which kind of user this is."""

    role = forms.ChoiceField(
        choices=UserProfile.ROLES,
        initial="STUDENT",
        help_text=(
            "Student and Driver can view the dashboard and send complaints or feedback. "
            "Staff (transport staff) can also manage buses, sensors, students and announcements. "
            "Admin can additionally read the complaints and feedback inbox."
        ),
    )


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fields = ("role", "identity")


def _add_role_after_username(fieldsets):
    """Put 'role' right under 'username' without depending on the Django version's field list."""
    result = []
    for name, options in fieldsets:
        fields = list(options.get("fields", ()))
        if "username" in fields and "role" not in fields:
            fields.insert(fields.index("username") + 1, "role")
        result.append((name, {**options, "fields": tuple(fields)}))
    return tuple(result)


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form = UserCreateForm
    add_fieldsets = _add_role_after_username(BaseUserAdmin.add_fieldsets)
    list_display = ("username", "email", "role", "is_active", "date_joined")
    list_filter = ("profile__role", "is_active", "is_staff", "is_superuser")
    list_select_related = ("profile",)

    @admin.display(description="Role", ordering="profile__role")
    def role(self, obj):
        # Superusers are administrators in the dashboard whatever their profile says
        if obj.is_superuser:
            return "Admin"
        profile = getattr(obj, "profile", None)
        return profile.get_role_display() if profile else "-"

    def get_inline_instances(self, request, obj=None):
        # On 'Add user' the profile is created by a signal, so the role comes from the form instead
        return [] if obj is None else [UserProfileInline(self.model, self.admin_site)]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        role = form.cleaned_data.get("role") if not change else None
        if role:
            # Use obj.profile itself: the post_save signal re-saves that same cached
            # object on later user saves and would otherwise put the default role back.
            obj.profile.role = role
            obj.profile.save()
