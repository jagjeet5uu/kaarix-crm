from django.db import models


class Vendor(models.Model):
    zoho_contact_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    name = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Expense(models.Model):
    entry_number = models.CharField(max_length=50, blank=True)
    expense_date = models.DateField()
    description = models.TextField(blank=True)
    account = models.CharField(max_length=200, blank=True)
    vendor = models.ForeignKey(
        Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference = models.CharField(max_length=100, blank=True)
    is_billable = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-expense_date']

    def __str__(self):
        return f"Expense {self.entry_number} - {self.expense_date}"


class Bill(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('open', 'Open'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('void', 'Void'),
        ('partially_paid', 'Partially Paid'),
    ]

    bill_number = models.CharField(max_length=50, unique=True)
    zoho_bill_id = models.CharField(max_length=100, blank=True)
    vendor = models.ForeignKey(
        Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='bills'
    )
    vendor_name = models.CharField(max_length=200, blank=True)
    bill_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-bill_date']

    def __str__(self):
        return f"Bill {self.bill_number}"


class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=300)
    sku = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.item_name} ({self.bill.bill_number})"
