from django.db import models
from django.utils import timezone


class Quotation(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'), ('sent', 'Sent'), ('accepted', 'Accepted'),
        ('rejected', 'Rejected'), ('converted', 'Converted to Invoice'), ('cancelled', 'Cancelled'),
    ]

    quotation_number = models.CharField(max_length=50, unique=True)
    customer = models.ForeignKey(
        'customers.Customer', on_delete=models.CASCADE, related_name='quotations',
        null=True, blank=True
    )
    lead = models.ForeignKey(
        'leads.Lead', on_delete=models.SET_NULL, null=True, blank=True, related_name='quotations'
    )
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    zoho_estimate_id = models.CharField(max_length=100, blank=True)
    zoho_invoice_id = models.CharField(max_length=100, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    attached_image = models.ImageField(upload_to='quotations/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Quotation'
        verbose_name_plural = 'Quotations'
        ordering = ['-created_at']

    def __str__(self):
        customer_name = self.customer.full_name if self.customer else 'No Customer'
        return f"{self.quotation_number} - {customer_name}"

    def save(self, *args, **kwargs):
        if not self.quotation_number:
            year = timezone.now().year
            last = Quotation.objects.filter(
                quotation_number__startswith=f'QUO-{year}-'
            ).order_by('-quotation_number').first()
            if last:
                try:
                    seq = int(last.quotation_number.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    seq = 1
            else:
                seq = 1
            self.quotation_number = f'QUO-{year}-{seq:04d}'
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        items = self.items.all()
        subtotal = sum(item.total for item in items)
        self.subtotal = subtotal
        self.total = subtotal - self.discount + self.tax
        self.save()


class QuotationItem(models.Model):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(
        'products.Product', on_delete=models.SET_NULL, null=True, blank=True
    )
    item_name = models.CharField(max_length=500)
    sku = models.CharField(max_length=100, blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = 'Quotation Item'
        verbose_name_plural = 'Quotation Items'

    def __str__(self):
        return f"{self.item_name} x {self.quantity}"

    def save(self, *args, **kwargs):
        from decimal import Decimal as D
        subtotal = D(str(self.unit_price)) * self.quantity
        tax_amount = (subtotal - D(str(self.discount))) * (D(str(self.tax_rate)) / D('100'))
        self.total = subtotal - D(str(self.discount)) + tax_amount
        super().save(*args, **kwargs)
