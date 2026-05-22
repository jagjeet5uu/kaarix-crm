from django.db import models


class ProductReservation(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'), ('expired', 'Expired'),
        ('converted_to_sale', 'Converted to Sale'), ('cancelled', 'Cancelled'),
    ]

    product = models.ForeignKey(
        'products.Product', on_delete=models.CASCADE, related_name='reservations'
    )
    customer = models.ForeignKey(
        'customers.Customer', on_delete=models.CASCADE, related_name='reservations'
    )
    lead = models.ForeignKey(
        'leads.Lead', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations'
    )
    reserved_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    reserved_at = models.DateTimeField(auto_now_add=True)
    reserved_until = models.DateTimeField()
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='active')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Product Reservation'
        verbose_name_plural = 'Product Reservations'
        ordering = ['-created_at']

    def __str__(self):
        return f"Reservation #{self.id} - {self.product.item_name} for {self.customer.full_name}"
