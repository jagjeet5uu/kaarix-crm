from django.db import models


class AfterSalesRequest(models.Model):
    REQUEST_TYPES = [
        ('resize', 'Resize'), ('repair', 'Repair'), ('polish', 'Polish'),
        ('stone_replacement', 'Stone Replacement'), ('certificate_issue', 'Certificate Issue'),
        ('exchange', 'Exchange'), ('return', 'Return'), ('cleaning', 'Cleaning'),
        ('custom_modification', 'Custom Modification'),
    ]
    STATUS_CHOICES = [
        ('received', 'Received'), ('inspection', 'Inspection'), ('in_progress', 'In Progress'),
        ('ready', 'Ready'), ('delivered', 'Delivered'), ('closed', 'Closed'), ('cancelled', 'Cancelled'),
    ]

    customer = models.ForeignKey(
        'customers.Customer', on_delete=models.CASCADE, related_name='after_sales_requests'
    )
    product = models.ForeignKey(
        'products.Product', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='after_sales_requests'
    )
    invoice_reference = models.CharField(max_length=100, blank=True)
    request_type = models.CharField(max_length=30, choices=REQUEST_TYPES)
    received_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    delivered_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    assigned_staff = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_service'
    )
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True,
        related_name='created_service_requests'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'After Sales Request'
        verbose_name_plural = 'After Sales Requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"SR#{self.id} - {self.request_type} for {self.customer.full_name} ({self.status})"


class AfterSalesImage(models.Model):
    IMAGE_TYPES = [('before', 'Before'), ('after', 'After')]

    after_sales_request = models.ForeignKey(
        AfterSalesRequest, on_delete=models.CASCADE, related_name='images'
    )
    image_type = models.CharField(max_length=10, choices=IMAGE_TYPES)
    file_url = models.TextField()
    file_name = models.CharField(max_length=255)
    gcs_path = models.TextField(blank=True)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'After Sales Image'
        verbose_name_plural = 'After Sales Images'

    def __str__(self):
        return f"{self.image_type} image for SR#{self.after_sales_request_id}"
