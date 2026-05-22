from django.db import models


class Product(models.Model):
    CATEGORY_CHOICES = [
        ('rings', 'Rings'), ('solitaire_rings', 'Solitaire Rings'),
        ('small_earrings', 'Small Earrings'), ('cocktail_earrings', 'Cocktail Earrings'),
        ('solitaire_earrings', 'Solitaire Earrings'), ('bracelets', 'Bracelets'),
        ('bangles', 'Bangles'), ('necklaces', 'Necklaces'), ('pendants', 'Pendants'),
        ('chains', 'Chains'), ('pendant_chain', 'Pendant Chain'), ('nose_pins', 'Nose Pins'),
        ('ear_cuffs', 'Ear Cuffs'), ('packaging', 'Packaging Material'), ('other', 'Other'),
    ]
    INVENTORY_STATUS = [
        ('available', 'Available'), ('reserved', 'Reserved'), ('sold', 'Sold'),
        ('returned', 'Returned'), ('under_service', 'Under Service'), ('archived', 'Archived'),
    ]
    METAL_TYPES = [('gold', 'Gold'), ('platinum', 'Platinum'), ('silver', 'Silver')]
    METAL_PURITY = [
        ('14k', '14K'), ('18k', '18K'), ('22k', '22K'), ('24k', '24K'),
        ('925', '925 Silver'), ('950', '950 Platinum'),
    ]
    CERT_TYPES = [
        ('none', 'No Certificate'), ('generic', 'Yes - Generic'),
        ('igi', 'IGI'), ('sgl', 'SGL'), ('hallmark', 'Hallmark'), ('unknown', 'Unknown'),
    ]

    zoho_item_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    item_name = models.CharField(max_length=500)
    sku = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    subcategory = models.CharField(max_length=100, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    gross_weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    net_weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    diamond_weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)
    metal_type = models.CharField(max_length=20, choices=METAL_TYPES, blank=True)
    metal_purity = models.CharField(max_length=10, choices=METAL_PURITY, blank=True)
    stone_type = models.CharField(max_length=100, blank=True)
    certification_type = models.CharField(max_length=20, choices=CERT_TYPES, default='none')
    certification_number = models.CharField(max_length=100, blank=True)
    inventory_status = models.CharField(max_length=20, choices=INVENTORY_STATUS, default='available')
    zoho_status = models.CharField(
        max_length=20, blank=True, choices=[('Active', 'Active'), ('Inactive', 'Inactive')]
    )
    date_of_purchase = models.DateField(null=True, blank=True)
    hsn_code = models.CharField(max_length=20, blank=True)
    making_charges = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_products'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['inventory_status']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['inventory_status', 'is_active']),
            models.Index(fields=['category', 'inventory_status']),
        ]

    def __str__(self):
        return f"{self.item_name} ({self.sku or 'No SKU'})"

    @property
    def margin(self):
        if self.selling_price and self.purchase_price and self.purchase_price > 0:
            return ((self.selling_price - self.purchase_price) / self.selling_price) * 100
        return None


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    file_url = models.TextField()
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    is_primary = models.BooleanField(default=False)
    gcs_path = models.TextField(blank=True)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'

    def __str__(self):
        return f"Image for {self.product.item_name}"


class ProductCertificate(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='certificates')
    certificate_type = models.CharField(max_length=20)
    certificate_number = models.CharField(max_length=100, blank=True)
    file_url = models.TextField()
    file_name = models.CharField(max_length=255)
    gcs_path = models.TextField(blank=True)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Product Certificate'
        verbose_name_plural = 'Product Certificates'

    def __str__(self):
        return f"Certificate for {self.product.item_name}"


class ImportLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'), ('processing', 'Processing'),
        ('completed', 'Completed'), ('failed', 'Failed'),
    ]

    filename = models.CharField(max_length=255)
    file_path = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_rows = models.IntegerField(default=0)
    imported_rows = models.IntegerField(default=0)
    skipped_rows = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    missing_sku_count = models.IntegerField(default=0)
    duplicate_sku_count = models.IntegerField(default=0)
    missing_cert_count = models.IntegerField(default=0)
    invalid_price_count = models.IntegerField(default=0)
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_detail = models.JSONField(default=list)

    class Meta:
        verbose_name = 'Import Log'
        verbose_name_plural = 'Import Logs'
        ordering = ['-started_at']

    def __str__(self):
        return f"Import: {self.filename} ({self.status})"


class ImportLogItem(models.Model):
    import_log = models.ForeignKey(ImportLog, on_delete=models.CASCADE, related_name='items')
    row_number = models.IntegerField()
    sku = models.CharField(max_length=100, blank=True)
    item_name = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=20)  # imported, skipped, error
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Import Log Item'
        verbose_name_plural = 'Import Log Items'
        ordering = ['row_number']

    def __str__(self):
        return f"Row {self.row_number}: {self.sku or self.item_name} ({self.status})"
