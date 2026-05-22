from django.db import models


class Customer(models.Model):
    CUSTOMER_TYPES = [('retail', 'Retail'), ('wholesale', 'Wholesale'), ('vip', 'VIP')]
    LEAD_SOURCES = [
        ('walk_in', 'Walk In'), ('referral', 'Referral'), ('instagram', 'Instagram'),
        ('facebook', 'Facebook'), ('website', 'Website'), ('exhibition', 'Exhibition'), ('other', 'Other'),
    ]
    METAL_PREFS = [
        ('gold_14k', '14K Gold'), ('gold_18k', '18K Gold'), ('gold_22k', '22K Gold'),
        ('platinum', 'Platinum'), ('silver', 'Silver'),
    ]

    zoho_contact_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    mobile = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPES, default='retail')
    lead_source = models.CharField(max_length=30, choices=LEAD_SOURCES, blank=True)
    birthday = models.DateField(null=True, blank=True)
    anniversary = models.DateField(null=True, blank=True)
    preferred_category = models.CharField(max_length=100, blank=True)
    preferred_metal = models.CharField(max_length=30, choices=METAL_PREFS, blank=True)
    preferred_budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    preferred_budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ring_size = models.CharField(max_length=10, blank=True)
    bracelet_size = models.CharField(max_length=10, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_customers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.mobile})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
