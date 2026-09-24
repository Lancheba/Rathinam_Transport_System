from rest_framework.throttling import SimpleRateThrottle


class _PerIPThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginThrottle(_PerIPThrottle):
    """Slows password guessing on the login endpoint."""
    scope = "login"


class RegisterThrottle(_PerIPThrottle):
    """Stops bulk fake-account creation."""
    scope = "register"


class OptimizeThrottle(SimpleRateThrottle):
    """Caps optimisation runs per signed-in user (each run stores a row)."""
    scope = "optimize"

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user_{request.user.pk}"
        else:
            ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class FaceScanThrottle(SimpleRateThrottle):
    """Caps how often a signed-in user can hit the QR + face-scan endpoint."""
    scope = "face_scan"

    def get_cache_key(self, request, view):
        user_id = request.user.pk if request.user.is_authenticated else "anon"
        return f"face_scan_{user_id}"
