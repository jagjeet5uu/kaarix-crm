from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsSalesManager(BasePermission):
    """Allow access only to sales manager users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'sales_manager')


class IsSalesperson(BasePermission):
    """Allow access only to salesperson users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'salesperson')


class IsInventoryManager(BasePermission):
    """Allow access only to inventory manager users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'inventory_manager')


class IsAccounts(BasePermission):
    """Allow access only to accounts users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'accounts')


class IsServiceStaff(BasePermission):
    """Allow access only to service staff users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'service_staff')


class IsAdminOrSalesManager(BasePermission):
    """Allow access to admin or sales manager users."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'sales_manager')
        )


class IsAdminOrInventoryManager(BasePermission):
    """Allow access to admin or inventory manager users."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'inventory_manager')
        )


class IsSalesTeam(BasePermission):
    """Allow access to admin, sales manager or salesperson."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'sales_manager', 'salesperson')
        )
