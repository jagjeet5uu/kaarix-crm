import logging

logger = logging.getLogger(__name__)


class AuditLogMiddleware:
    """
    Middleware to attach IP address to requests for audit logging.
    Does not create audit logs directly - that's done in views.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach client IP to request for easy access in views
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            request.client_ip = x_forwarded_for.split(',')[0].strip()
        else:
            request.client_ip = request.META.get('REMOTE_ADDR', '')

        response = self.get_response(request)
        return response
