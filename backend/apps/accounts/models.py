from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLES = [
        ('admin', 'Admin'),
        ('sales_manager', 'Sales Manager'),
        ('salesperson', 'Salesperson'),
        ('inventory_manager', 'Inventory Manager'),
        ('accounts', 'Accounts'),
        ('service_staff', 'Service Staff'),
    ]
    role = models.CharField(max_length=30, choices=ROLES, default='salesperson')
    mobile = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def full_name(self):
        return self.get_full_name() or self.username
