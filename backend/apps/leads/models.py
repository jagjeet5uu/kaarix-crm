from django.db import models


class Lead(models.Model):
    STAGES = [
        ('new_inquiry', 'New Inquiry'),
        ('contacted', 'Contacted'),
        ('requirement_collected', 'Requirement Collected'),
        ('products_shared', 'Products Shared'),
        ('shortlisted', 'Shortlisted'),
        ('reserved', 'Reserved'),
        ('quotation_sent', 'Quotation Sent'),
        ('advance_paid', 'Advance Paid'),
        ('invoice_created', 'Invoice Created'),
        ('delivered', 'Delivered'),
        ('closed_won', 'Closed Won'),
        ('closed_lost', 'Closed Lost'),
    ]
    SOURCES = [
        ('walk_in', 'Walk In'), ('referral', 'Referral'), ('instagram', 'Instagram'),
        ('facebook', 'Facebook'), ('website', 'Website'), ('exhibition', 'Exhibition'), ('other', 'Other'),
    ]

    customer = models.ForeignKey(
        'customers.Customer', on_delete=models.CASCADE, related_name='leads'
    )
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='assigned_leads'
    )
    source = models.CharField(max_length=30, choices=SOURCES, blank=True)
    instagram_sender_id = models.CharField(max_length=100, blank=True, db_index=True)
    stage = models.CharField(max_length=30, choices=STAGES, default='new_inquiry')
    interested_category = models.CharField(max_length=100, blank=True)
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    occasion = models.CharField(max_length=100, blank=True)
    required_date = models.DateField(null=True, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    lost_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_leads'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Lead'
        verbose_name_plural = 'Leads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stage']),
            models.Index(fields=['follow_up_date']),
            models.Index(fields=['assigned_to']),
        ]

    def __str__(self):
        return f"Lead #{self.id} - {self.customer.full_name} ({self.stage})"


class LeadActivity(models.Model):
    ACTIVITY_TYPES = [
        ('call', 'Call'), ('meeting', 'Meeting'), ('product_shared', 'Product Shared'),
        ('customer_visit', 'Customer Visit'), ('follow_up', 'Follow-up'), ('note', 'Note'),
        ('quotation_sent', 'Quotation Sent'), ('reservation_created', 'Reservation Created'),
        ('invoice_created', 'Invoice Created'), ('lost_reason_added', 'Lost Reason Added'),
    ]

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_TYPES)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Lead Activity'
        verbose_name_plural = 'Lead Activities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.activity_type} on Lead #{self.lead_id}"


class LeadProduct(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='shortlisted_products')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['lead', 'product']
        verbose_name = 'Lead Product'
        verbose_name_plural = 'Lead Products'

    def __str__(self):
        return f"Lead #{self.lead_id} - {self.product.item_name}"


class Task(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('completed', 'Completed'),
        ('overdue', 'Overdue'), ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]

    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    customer = models.ForeignKey(
        'customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks'
    )
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='tasks'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    completion_note = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_tasks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'
        ordering = ['due_date', '-priority']

    def __str__(self):
        return f"{self.title} (Due: {self.due_date})"
