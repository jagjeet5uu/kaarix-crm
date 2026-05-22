from django.db import models


class SalesInvoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('void', 'Void'),
        ('partially_paid', 'Partially Paid'),
        ('unpaid', 'Unpaid'),
        ('viewed', 'Viewed'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('write_off', 'Write Off'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True)
    zoho_invoice_id = models.CharField(max_length=100, blank=True)
    customer_name = models.CharField(max_length=200, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, default='unpaid')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salesperson = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-invoice_date']

    def __str__(self):
        return self.invoice_number


class SalesInvoiceItem(models.Model):
    invoice = models.ForeignKey(SalesInvoice, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=300)
    sku = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    item_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    hsn_sac = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.item_name} ({self.invoice.invoice_number})"


class CustomerPayment(models.Model):
    payment_number = models.CharField(max_length=50, blank=True)
    zoho_payment_id = models.CharField(max_length=100, blank=True)
    customer_name = models.CharField(max_length=200, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    mode = models.CharField(max_length=50, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unused_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference_number = models.CharField(max_length=100, blank=True)
    invoice_number = models.CharField(max_length=50, blank=True)
    deposit_to = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.payment_number} - {self.customer_name}"


class VendorPayment(models.Model):
    payment_number = models.CharField(max_length=50, blank=True)
    zoho_payment_id = models.CharField(max_length=100, blank=True)
    vendor_name = models.CharField(max_length=200, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    mode = models.CharField(max_length=50, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reference_number = models.CharField(max_length=100, blank=True)
    bill_number = models.CharField(max_length=50, blank=True)
    paid_through = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.payment_number} - {self.vendor_name}"


class VendorCredit(models.Model):
    credit_number = models.CharField(max_length=50, unique=True)
    zoho_credit_id = models.CharField(max_length=100, blank=True)
    vendor_name = models.CharField(max_length=200, blank=True)
    credit_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    associated_bill_number = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-credit_date']

    def __str__(self):
        return self.credit_number


class SalesQuote(models.Model):
    quote_number = models.CharField(max_length=50, unique=True)
    zoho_quote_id = models.CharField(max_length=100, blank=True)
    customer_name = models.CharField(max_length=200, blank=True)
    quote_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salesperson = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-quote_date']

    def __str__(self):
        return self.quote_number


class SalesQuoteItem(models.Model):
    quote = models.ForeignKey(SalesQuote, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=300)
    sku = models.CharField(max_length=100, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    item_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.item_name} ({self.quote.quote_number})"


class SalesOrder(models.Model):
    order_number = models.CharField(max_length=50, unique=True)
    zoho_order_id = models.CharField(max_length=100, blank=True)
    customer_name = models.CharField(max_length=200, blank=True)
    order_date = models.DateField(null=True, blank=True)
    expected_shipment_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salesperson = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-order_date']

    def __str__(self):
        return self.order_number


class JournalEntry(models.Model):
    journal_number = models.CharField(max_length=50, blank=True)
    zoho_journal_id = models.CharField(max_length=100, blank=True)
    journal_date = models.DateField(null=True, blank=True)
    journal_type = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, blank=True)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-journal_date']

    def __str__(self):
        return self.journal_number or f"Journal {self.id}"


class Deposit(models.Model):
    transaction_date = models.DateField(null=True, blank=True)
    transaction_type = models.CharField(max_length=100, blank=True)
    from_account = models.CharField(max_length=200, blank=True)
    to_account = models.CharField(max_length=200, blank=True)
    reference = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    payment_mode = models.CharField(max_length=50, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-transaction_date']

    def __str__(self):
        return f"{self.transaction_type} {self.transaction_date}"


class ChartOfAccount(models.Model):
    account_id = models.CharField(max_length=100, blank=True)
    account_name = models.CharField(max_length=200)
    account_code = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    account_type = models.CharField(max_length=100, blank=True)
    account_status = models.CharField(max_length=20, blank=True)
    currency = models.CharField(max_length=10, blank=True)
    parent_account = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['account_type', 'account_name']

    def __str__(self):
        return self.account_name
