"""
Management command to import Item.csv products and seed all CRM sections with demo data.
Usage: python manage.py load_demo_data --csv "C:/Users/JagjeetSingh/Downloads/Item.csv"
"""

import csv
import re
import random
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Import products from Zoho CSV and seed demo data for all CRM sections'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            default=r'C:\Users\JagjeetSingh\Downloads\Item.csv',
            help='Path to Item.csv file',
        )
        parser.add_argument('--skip-products', action='store_true', help='Skip product import')
        parser.add_argument('--skip-customers', action='store_true', help='Skip dummy customers')
        parser.add_argument('--skip-leads', action='store_true', help='Skip dummy leads')
        parser.add_argument('--skip-quotations', action='store_true', help='Skip dummy quotations')
        parser.add_argument('--skip-reservations', action='store_true', help='Skip dummy reservations')
        parser.add_argument('--skip-aftersales', action='store_true', help='Skip dummy after-sales')

    # ── helpers ──────────────────────────────────────────────────────────────

    def _price(self, raw):
        """Parse 'INR 68,641.50' → Decimal('68641.50') or None."""
        if not raw:
            return None
        cleaned = re.sub(r'[^\d.]', '', raw.replace(',', ''))
        try:
            return Decimal(cleaned) if cleaned else None
        except InvalidOperation:
            return None

    def _category(self, cf_type):
        mapping = {
            'Rings': 'rings',
            'Bracelets': 'bracelets',
            'Cocktail Earrings': 'cocktail_earrings',
            'Solitaire Earrings': 'solitaire_earrings',
            'Small Earrings': 'small_earrings',
            'Necklaces': 'necklaces',
            'Pendant Chain': 'pendant_chain',
            'Pendants': 'pendants',
            'Chains': 'chains',
            'White Gold Chain': 'chains',
            'Yellow Gold Chain': 'chains',
            'Black beads Chain': 'chains',
            'Bangles': 'bangles',
            'Nose Pins': 'nose_pins',
        }
        return mapping.get(cf_type, 'other')

    def _inventory_status(self, cf_inv, zoho_status):
        """Map CF.Inventory → internal inventory_status."""
        cf = (cf_inv or '').strip().lower()
        if cf == 'available':
            return 'available'
        if cf == 'returned':
            return 'returned'
        if cf == 'sold':
            return 'sold'
        # Empty CF.Inventory — infer from zoho_status
        if zoho_status == 'Inactive':
            return 'archived'
        return 'available'

    def _certification(self, cf_cert):
        cf = (cf_cert or '').strip().lower()
        if cf == 'yes':
            return 'generic'
        return 'none'

    def _parse_description(self, desc):
        """Extract metal_type, metal_purity, gross_weight, net_weight from description."""
        result = {'metal_type': '', 'metal_purity': '', 'gross_weight': None, 'net_weight': None}
        if not desc:
            return result

        text = desc.replace('\n', ' ')

        # Metal purity
        if re.search(r'14[kK]', text):
            result['metal_type'] = 'gold'
            result['metal_purity'] = '14k'
        elif re.search(r'18[kK]', text):
            result['metal_type'] = 'gold'
            result['metal_purity'] = '18k'
        elif re.search(r'22[kK]', text):
            result['metal_type'] = 'gold'
            result['metal_purity'] = '22k'
        elif re.search(r'24[kK]', text):
            result['metal_type'] = 'gold'
            result['metal_purity'] = '24k'
        elif 'platinum' in text.lower():
            result['metal_type'] = 'platinum'
            result['metal_purity'] = '950'
        elif 'silver' in text.lower():
            result['metal_type'] = 'silver'
            result['metal_purity'] = '925'

        # Gross weight
        m = re.search(r'[Gg]\.?\s*[Ww][Tt]\.?\s*[-–]?\s*([\d.]+)\s*g', text)
        if m:
            try:
                result['gross_weight'] = Decimal(m.group(1))
            except InvalidOperation:
                pass

        # Net weight — various formats
        m = re.search(r'[Nn]\.?\s*[Ww][Tt]\.?\s*[-–]?\s*([\d.]+)\s*g', text)
        if m:
            try:
                result['net_weight'] = Decimal(m.group(1))
            except InvalidOperation:
                pass

        return result

    # ── product import ────────────────────────────────────────────────────────

    def import_products(self, csv_path, admin_user):
        from apps.products.models import Product

        imported = skipped = errors = 0

        with open(csv_path, encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                zoho_id = row.get('Item ID', '').strip()
                item_name = row.get('Item Name', '').strip()
                if not item_name:
                    skipped += 1
                    continue

                # Skip if already exists
                if zoho_id and Product.objects.filter(zoho_item_id=zoho_id).exists():
                    skipped += 1
                    continue

                desc = row.get('Description', '').strip()
                meta = self._parse_description(desc)

                inv_status = self._inventory_status(
                    row.get('CF.Inventory', ''), row.get('Status', '')
                )
                cert_type = self._certification(row.get('CF.Certification present?', ''))

                date_str = row.get('CF.Date of Purchase', '').strip()
                purchase_date = None
                if date_str:
                    try:
                        purchase_date = date.fromisoformat(date_str)
                    except ValueError:
                        pass

                try:
                    Product.objects.create(
                        zoho_item_id=zoho_id or None,
                        item_name=item_name,
                        sku=row.get('SKU', '').strip() or None,
                        hsn_code=row.get('HSN/SAC', '').strip(),
                        description=desc,
                        category=self._category(row.get('CF.Product Type', '').strip()),
                        selling_price=self._price(row.get('Rate', '')),
                        purchase_price=self._price(row.get('Purchase Rate', '')),
                        metal_type=meta['metal_type'],
                        metal_purity=meta['metal_purity'],
                        gross_weight=meta['gross_weight'],
                        net_weight=meta['net_weight'],
                        inventory_status=inv_status,
                        certification_type=cert_type,
                        zoho_status=row.get('Status', '').strip(),
                        date_of_purchase=purchase_date,
                        is_active=(row.get('Status', '').strip() == 'Active'),
                        created_by=admin_user,
                    )
                    imported += 1
                except Exception as e:
                    errors += 1
                    self.stderr.write(f'  Error on "{item_name}": {e}')

        return imported, skipped, errors

    # ── dummy customers ───────────────────────────────────────────────────────

    def create_customers(self, admin_user):
        from apps.customers.models import Customer

        customers_data = [
            {'first_name': 'Priya', 'last_name': 'Sharma', 'mobile': '9876543210',
             'email': 'priya.sharma@email.com', 'city': 'Mumbai', 'customer_type': 'vip',
             'lead_source': 'referral', 'preferred_metal': 'gold_18k', 'preferred_category': 'rings',
             'preferred_budget_min': 50000, 'preferred_budget_max': 200000,
             'ring_size': '14', 'birthday': date(1988, 4, 15), 'anniversary': date(2012, 11, 20),
             'notes': 'VIP customer. Prefers solitaire rings. Always calls before visiting.'},
            {'first_name': 'Rajesh', 'last_name': 'Mehta', 'mobile': '9845321076',
             'email': 'rajesh.mehta@business.com', 'city': 'Delhi', 'customer_type': 'wholesale',
             'lead_source': 'exhibition', 'preferred_metal': 'gold_22k',
             'preferred_budget_min': 200000, 'preferred_budget_max': 1000000,
             'notes': 'Wholesale buyer. Buys in bulk for festivals. Needs invoice for GST.'},
            {'first_name': 'Anita', 'last_name': 'Patel', 'mobile': '9765432109',
             'email': 'anita.patel@gmail.com', 'city': 'Ahmedabad', 'customer_type': 'retail',
             'lead_source': 'instagram', 'preferred_metal': 'gold_14k', 'preferred_category': 'earrings',
             'preferred_budget_min': 20000, 'preferred_budget_max': 80000,
             'bracelet_size': '6.5', 'birthday': date(1995, 7, 22),
             'notes': 'Found us on Instagram. Interested in cocktail earrings and bracelets.'},
            {'first_name': 'Suresh', 'last_name': 'Nair', 'mobile': '9654321087',
             'email': 'suresh.nair@company.in', 'city': 'Kochi', 'customer_type': 'retail',
             'lead_source': 'walk_in', 'preferred_metal': 'gold_18k',
             'preferred_budget_min': 100000, 'preferred_budget_max': 500000,
             'anniversary': date(2018, 2, 14),
             'notes': 'Looking for anniversary gift set. Interested in matching earring-necklace set.'},
            {'first_name': 'Kavya', 'last_name': 'Reddy', 'mobile': '9543210976',
             'email': 'kavya.reddy@outlook.com', 'city': 'Hyderabad', 'customer_type': 'vip',
             'lead_source': 'referral', 'preferred_metal': 'gold_22k', 'preferred_category': 'necklaces',
             'preferred_budget_min': 300000, 'preferred_budget_max': 1500000,
             'ring_size': '12', 'birthday': date(1982, 1, 30),
             'notes': 'High-value customer. Referred by Priya Sharma. Prefers heavy necklaces.'},
            {'first_name': 'Amit', 'last_name': 'Joshi', 'mobile': '9432109865',
             'email': 'amit.joshi@startup.io', 'city': 'Pune', 'customer_type': 'retail',
             'lead_source': 'website', 'preferred_metal': 'gold_14k',
             'preferred_budget_min': 30000, 'preferred_budget_max': 150000,
             'notes': 'Browsed online catalog. Looking for engagement ring.'},
            {'first_name': 'Deepa', 'last_name': 'Krishnan', 'mobile': '9321098754',
             'email': 'deepa.k@hotmail.com', 'city': 'Bangalore', 'customer_type': 'retail',
             'lead_source': 'facebook', 'preferred_metal': 'gold_18k', 'preferred_category': 'bracelets',
             'preferred_budget_min': 40000, 'preferred_budget_max': 120000,
             'bracelet_size': '7.0', 'birthday': date(1990, 9, 5),
             'notes': 'Saw our ad on Facebook. Wants a birthday bracelet.'},
            {'first_name': 'Vikram', 'last_name': 'Singh', 'mobile': '9210987643',
             'email': 'vikram.singh@enterprise.com', 'city': 'Chandigarh', 'customer_type': 'wholesale',
             'lead_source': 'exhibition', 'preferred_metal': 'gold_22k',
             'preferred_budget_min': 500000, 'preferred_budget_max': 2000000,
             'notes': 'Retailer from Chandigarh. Attends jewellery shows. Quarterly buyer.'},
            {'first_name': 'Meera', 'last_name': 'Agarwal', 'mobile': '9109876532',
             'email': 'meera.agarwal@yahoo.in', 'city': 'Jaipur', 'customer_type': 'retail',
             'lead_source': 'walk_in', 'preferred_metal': 'gold_22k', 'preferred_category': 'rings',
             'preferred_budget_min': 25000, 'preferred_budget_max': 100000,
             'ring_size': '13', 'anniversary': date(2020, 5, 12),
             'notes': 'Walk-in customer. Husband wants to gift for anniversary.'},
            {'first_name': 'Rohit', 'last_name': 'Kapoor', 'mobile': '9098765421',
             'email': 'rohit.kapoor@fintech.in', 'city': 'Mumbai', 'customer_type': 'vip',
             'lead_source': 'referral', 'preferred_metal': 'gold_18k',
             'preferred_budget_min': 200000, 'preferred_budget_max': 800000,
             'notes': 'Finance professional. Buys as investment + gifts. Very particular about certificates.'},
            {'first_name': 'Sunita', 'last_name': 'Verma', 'mobile': '8987654310',
             'email': 'sunita.verma@gmail.com', 'city': 'Lucknow', 'customer_type': 'retail',
             'lead_source': 'instagram', 'preferred_metal': 'gold_22k', 'preferred_category': 'necklaces',
             'preferred_budget_min': 150000, 'preferred_budget_max': 600000,
             'birthday': date(1985, 12, 10),
             'notes': 'Follows our Instagram. Interested in traditional heavy jewellery.'},
            {'first_name': 'Arjun', 'last_name': 'Malhotra', 'mobile': '8876543209',
             'email': 'arjun.m@corporates.in', 'city': 'Delhi', 'customer_type': 'retail',
             'lead_source': 'walk_in', 'preferred_metal': 'gold_14k',
             'preferred_budget_min': 50000, 'preferred_budget_max': 250000,
             'notes': 'First purchase for wedding. Wants matching set for bride.'},
        ]

        created = []
        for data in customers_data:
            if Customer.objects.filter(mobile=data['mobile']).exists():
                created.append(Customer.objects.get(mobile=data['mobile']))
                continue
            obj = Customer.objects.create(created_by=admin_user, **data)
            created.append(obj)
        return created

    # ── dummy leads ───────────────────────────────────────────────────────────

    def create_leads(self, customers, users, admin_user):
        from apps.leads.models import Lead, LeadActivity

        today = date.today()
        leads_data = [
            {'customer': customers[0], 'stage': 'shortlisted', 'source': 'referral',
             'interested_category': 'rings', 'budget_min': 80000, 'budget_max': 200000,
             'occasion': 'Anniversary', 'required_date': today + timedelta(days=30),
             'follow_up_date': today + timedelta(days=3),
             'notes': 'Looking for a diamond solitaire ring. Has shortlisted 2 pieces.'},
            {'customer': customers[1], 'stage': 'quotation_sent', 'source': 'exhibition',
             'interested_category': 'bracelets', 'budget_min': 200000, 'budget_max': 600000,
             'occasion': 'Festival Stock', 'required_date': today + timedelta(days=14),
             'follow_up_date': today + timedelta(days=1),
             'notes': 'Wholesale order for Diwali. Quotation sent, awaiting confirmation.'},
            {'customer': customers[2], 'stage': 'products_shared', 'source': 'instagram',
             'interested_category': 'cocktail_earrings', 'budget_min': 30000, 'budget_max': 80000,
             'occasion': 'Birthday', 'required_date': today + timedelta(days=20),
             'follow_up_date': today + timedelta(days=5),
             'notes': 'Sent catalog images via WhatsApp. Waiting for selection.'},
            {'customer': customers[3], 'stage': 'advance_paid', 'source': 'walk_in',
             'interested_category': 'necklaces', 'budget_min': 300000, 'budget_max': 800000,
             'occasion': 'Anniversary', 'required_date': today + timedelta(days=7),
             'follow_up_date': today + timedelta(days=2),
             'notes': 'Advance of ₹50,000 paid. Order confirmed. Delivery next week.'},
            {'customer': customers[4], 'stage': 'new_inquiry', 'source': 'referral',
             'interested_category': 'necklaces', 'budget_min': 500000, 'budget_max': 1500000,
             'occasion': 'Wedding', 'required_date': today + timedelta(days=60),
             'follow_up_date': today + timedelta(days=7),
             'notes': 'New high-value inquiry. Referred by Priya Sharma. Meeting scheduled.'},
            {'customer': customers[5], 'stage': 'requirement_collected', 'source': 'website',
             'interested_category': 'rings', 'budget_min': 40000, 'budget_max': 150000,
             'occasion': 'Engagement', 'required_date': today + timedelta(days=45),
             'follow_up_date': today + timedelta(days=4),
             'notes': 'Looking for 1ct+ solitaire. Budget flexible. Wants certification.'},
            {'customer': customers[6], 'stage': 'contacted', 'source': 'facebook',
             'interested_category': 'bracelets', 'budget_min': 40000, 'budget_max': 120000,
             'occasion': 'Birthday', 'required_date': today + timedelta(days=15),
             'follow_up_date': today - timedelta(days=1),  # overdue
             'notes': 'Follow-up overdue. Needs to be called today.'},
            {'customer': customers[7], 'stage': 'reserved', 'source': 'exhibition',
             'interested_category': 'rings', 'budget_min': 500000, 'budget_max': 2000000,
             'occasion': 'Bulk Purchase', 'required_date': today + timedelta(days=30),
             'follow_up_date': today + timedelta(days=6),
             'notes': 'Placed reservation on 3 pieces. Wants to finalize after seeing more options.'},
            {'customer': customers[8], 'stage': 'closed_won', 'source': 'walk_in',
             'interested_category': 'rings', 'budget_min': 25000, 'budget_max': 100000,
             'occasion': 'Anniversary', 'required_date': today - timedelta(days=5),
             'notes': 'Successfully sold Grace Ring. Very happy with purchase.'},
            {'customer': customers[9], 'stage': 'invoice_created', 'source': 'referral',
             'interested_category': 'necklaces', 'budget_min': 400000, 'budget_max': 900000,
             'occasion': 'Wedding Gift', 'required_date': today + timedelta(days=3),
             'follow_up_date': today + timedelta(days=1),
             'notes': 'Invoice raised in Zoho. Delivery pending.'},
            {'customer': customers[10], 'stage': 'new_inquiry', 'source': 'instagram',
             'interested_category': 'necklaces', 'budget_min': 150000, 'budget_max': 600000,
             'occasion': 'Wedding', 'required_date': today + timedelta(days=90),
             'follow_up_date': today + timedelta(days=10),
             'notes': 'Interested in traditional heavy necklace set.'},
            {'customer': customers[11], 'stage': 'products_shared', 'source': 'walk_in',
             'interested_category': 'rings', 'budget_min': 60000, 'budget_max': 250000,
             'occasion': 'Wedding', 'required_date': today + timedelta(days=25),
             'follow_up_date': today + timedelta(days=3),
             'notes': 'Wedding ring for bride. Shared 5 options. Waiting for decision.'},
            {'customer': customers[0], 'stage': 'contacted', 'source': 'referral',
             'interested_category': 'earrings', 'budget_min': 60000, 'budget_max': 200000,
             'occasion': 'Diwali Gift', 'required_date': today + timedelta(days=40),
             'follow_up_date': today + timedelta(days=8),
             'notes': 'Second lead from same customer. Wants earrings to match existing necklace.'},
            {'customer': customers[2], 'stage': 'closed_lost',
             'source': 'instagram', 'interested_category': 'bracelets',
             'budget_min': 30000, 'budget_max': 60000, 'occasion': 'Birthday',
             'lost_reason': 'Found cheaper option at local jeweller. Price sensitivity.',
             'notes': 'Lost deal due to pricing. Consider discount on next inquiry.'},
            {'customer': customers[4], 'stage': 'delivered', 'source': 'referral',
             'interested_category': 'earrings', 'budget_min': 200000, 'budget_max': 500000,
             'occasion': 'Wedding', 'required_date': today - timedelta(days=10),
             'notes': 'Delivered solitaire earring set. Customer extremely happy.'},
        ]

        created = []
        salesperson = next((u for u in users if u.role == 'salesperson'), admin_user)
        manager = next((u for u in users if u.role == 'sales_manager'), admin_user)

        for i, data in enumerate(leads_data):
            assigned = salesperson if i % 3 != 0 else manager
            lead = Lead.objects.create(
                assigned_to=assigned,
                created_by=admin_user,
                **data
            )
            created.append(lead)

            # Add activity log
            LeadActivity.objects.create(
                lead=lead, user=admin_user,
                activity_type='note',
                note=data['notes']
            )
            if data['stage'] in ('contacted', 'products_shared', 'shortlisted',
                                  'quotation_sent', 'advance_paid', 'invoice_created',
                                  'delivered', 'closed_won'):
                LeadActivity.objects.create(
                    lead=lead, user=salesperson,
                    activity_type='call',
                    note='Called customer and discussed requirements.'
                )

        return created

    # ── dummy quotations ──────────────────────────────────────────────────────

    def create_quotations(self, customers, products, admin_user):
        from apps.quotations.models import Quotation, QuotationItem

        year = date.today().year
        created = []

        # discount here is a fixed INR amount (not %), matching the backend model
        quotation_specs = [
            {'customer': customers[0], 'status': 'sent',
             'items': [
                 {'item_name': 'Twilight Bloom Blue Ring', 'sku': 'HVK 29',
                  'quantity': 1, 'unit_price': Decimal('70632.00'), 'discount': Decimal('0')},
                 {'item_name': 'Bloom Necklace', 'sku': 'HVK 27',
                  'quantity': 1, 'unit_price': Decimal('54220.00'), 'discount': Decimal('0')},
             ]},
            {'customer': customers[1], 'status': 'accepted',
             'items': [
                 {'item_name': 'Petal Weave Bracelet', 'sku': 'HVK 25',
                  'quantity': 2, 'unit_price': Decimal('624600.00'), 'discount': Decimal('50000')},
                 {'item_name': 'Pear Embrace Bracelet', 'sku': 'HVK 28',
                  'quantity': 3, 'unit_price': Decimal('78000.00'), 'discount': Decimal('6000')},
             ]},
            {'customer': customers[3], 'status': 'sent',
             'items': [
                 {'item_name': 'Lustre Necklace', 'sku': 'HVK 24',
                  'quantity': 1, 'unit_price': Decimal('859840.00'), 'discount': Decimal('0')},
             ]},
            {'customer': customers[5], 'status': 'draft',
             'items': [
                 {'item_name': 'Allure Heart Ring', 'sku': 'HVK 15',
                  'quantity': 1, 'unit_price': Decimal('47278.00'), 'discount': Decimal('0')},
             ]},
            {'customer': customers[9], 'status': 'converted',
             'items': [
                 {'item_name': 'Jade Drop Earrings', 'sku': 'HVK 32',
                  'quantity': 1, 'unit_price': Decimal('323000.00'), 'discount': Decimal('10000')},
                 {'item_name': 'Trio Heart Necklace', 'sku': 'HVK 26',
                  'quantity': 1, 'unit_price': Decimal('77123.00'), 'discount': Decimal('0')},
             ]},
            {'customer': customers[4], 'status': 'accepted',
             'items': [
                 {'item_name': 'Floral Falls Earrings', 'sku': 'HVK 20',
                  'quantity': 1, 'unit_price': Decimal('382191.00'), 'discount': Decimal('20000')},
                 {'item_name': 'Midnight Halo Earrings', 'sku': 'HVK 18',
                  'quantity': 1, 'unit_price': Decimal('193500.00'), 'discount': Decimal('10000')},
             ]},
        ]

        for i, spec in enumerate(quotation_specs):
            # Create quotation without number so auto-generation kicks in
            q = Quotation.objects.create(
                customer=spec['customer'],
                status=spec['status'],
                subtotal=Decimal('0'),
                discount=Decimal('0'),
                tax=Decimal('0'),
                total=Decimal('0'),
                created_by=admin_user,
            )
            for item in spec['items']:
                QuotationItem.objects.create(
                    quotation=q,
                    item_name=item['item_name'],
                    sku=item['sku'],
                    quantity=item['quantity'],
                    unit_price=item['unit_price'],
                    discount=item['discount'],
                    tax_rate=Decimal('3'),
                )
            # Recalculate totals from items
            q.recalculate_totals()
            created.append(q)
        return created

    # ── dummy reservations ────────────────────────────────────────────────────

    def create_reservations(self, customers, products, admin_user):
        from apps.reservations.models import ProductReservation
        from django.utils import timezone

        today = timezone.now()
        available = [p for p in products if p.inventory_status == 'available'][:10]
        if not available:
            self.stdout.write('  No available products for reservations, skipping.')
            return []

        def prod(idx):
            return available[idx] if idx < len(available) else available[0]

        specs = [
            {'customer': customers[0], 'product': prod(0),
             'reserved_until': today + timedelta(days=7),
             'advance_amount': Decimal('10000.00'), 'status': 'active',
             'notes': 'Customer wants to confirm after seeing it in person.'},
            {'customer': customers[3], 'product': prod(1),
             'reserved_until': today + timedelta(days=14),
             'advance_amount': Decimal('50000.00'), 'status': 'active',
             'notes': 'Confirmed reservation for anniversary gift.'},
            {'customer': customers[7], 'product': prod(2),
             'reserved_until': today + timedelta(days=21),
             'advance_amount': Decimal('25000.00'), 'status': 'active',
             'notes': 'Part of bulk reservation. Will buy 3 pieces total.'},
            {'customer': customers[4], 'product': prod(3),
             'reserved_until': today - timedelta(days=3),
             'advance_amount': Decimal('15000.00'), 'status': 'expired',
             'notes': 'Customer did not come back. Reservation expired.'},
            {'customer': customers[9], 'product': prod(4),
             'reserved_until': today + timedelta(days=5),
             'advance_amount': Decimal('30000.00'), 'status': 'converted_to_sale',
             'notes': 'Converted to sale. Invoice generated in Zoho.'},
        ]

        created = []
        for spec in specs:
            if ProductReservation.objects.filter(
                product=spec['product'], status='active'
            ).exists() and spec['status'] == 'active':
                continue
            r = ProductReservation.objects.create(
                reserved_by=admin_user,
                **spec
            )
            if spec['status'] == 'active':
                spec['product'].inventory_status = 'reserved'
                spec['product'].save(update_fields=['inventory_status'])
            created.append(r)
        return created

    # ── dummy after-sales ─────────────────────────────────────────────────────

    def create_aftersales(self, customers, products, admin_user):
        from apps.after_sales.models import AfterSalesRequest

        today = date.today()
        sold_products = [p for p in products if p.inventory_status == 'sold']
        returned_products = [p for p in products if p.inventory_status == 'returned']

        def maybe_product(lst):
            return lst[0] if lst else None

        specs = [
            {'customer': customers[0], 'product': maybe_product(sold_products),
             'request_type': 'resize', 'status': 'received',
             'received_date': today - timedelta(days=2),
             'expected_delivery_date': today + timedelta(days=5),
             'cost': Decimal('1500.00'),
             'notes': 'Ring resizing from size 14 to 15. Customer finger swelled slightly.'},
            {'customer': customers[2], 'product': maybe_product(returned_products),
             'request_type': 'return', 'status': 'in_progress',
             'received_date': today - timedelta(days=5),
             'expected_delivery_date': today + timedelta(days=2),
             'cost': Decimal('0.00'),
             'notes': 'Stone came loose. Under warranty. Will reset stone at no charge.'},
            {'customer': customers[3], 'product': maybe_product(sold_products),
             'request_type': 'polish', 'status': 'ready',
             'received_date': today - timedelta(days=7),
             'expected_delivery_date': today,
             'cost': Decimal('500.00'),
             'notes': 'Rhodium polish completed. Ready for pickup.'},
            {'customer': customers[8], 'product': maybe_product(sold_products),
             'request_type': 'repair', 'status': 'delivered',
             'received_date': today - timedelta(days=15),
             'expected_delivery_date': today - timedelta(days=8),
             'cost': Decimal('3500.00'),
             'notes': 'Clasp broke on bracelet. Repaired and delivered. Customer satisfied.'},
            {'customer': customers[10], 'product': None,
             'request_type': 'exchange', 'status': 'received',
             'received_date': today - timedelta(days=1),
             'expected_delivery_date': today + timedelta(days=10),
             'cost': Decimal('0.00'),
             'notes': 'Customer wants to exchange earrings for a necklace. Evaluating old piece.'},
            {'customer': customers[4], 'product': maybe_product(returned_products),
             'request_type': 'repair', 'status': 'in_progress',
             'received_date': today - timedelta(days=3),
             'expected_delivery_date': today + timedelta(days=4),
             'cost': Decimal('2000.00'),
             'notes': 'Diamond fell out of pendant. Sourcing matching stone.'},
            {'customer': customers[1], 'product': maybe_product(sold_products),
             'request_type': 'cleaning', 'status': 'cancelled',
             'received_date': today - timedelta(days=20),
             'expected_delivery_date': today - timedelta(days=10),
             'cost': Decimal('0.00'),
             'notes': 'Customer changed mind. Cancelled the service request.'},
        ]

        created = []
        for spec in specs:
            obj = AfterSalesRequest.objects.create(
                created_by=admin_user,
                **spec
            )
            created.append(obj)
        return created

    # ── main handler ──────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        from apps.accounts.models import User

        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stderr.write('No superuser found. Run seed_data first.')
            return

        all_users = list(User.objects.all())

        # 1. Products from CSV
        if not options['skip_products']:
            csv_path = options['csv']
            self.stdout.write(f'\n[PRODUCTS] Importing from: {csv_path}')
            try:
                imp, skip, err = self.import_products(csv_path, admin_user)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'   Products: {imp} imported, {skip} skipped, {err} errors'
                    )
                )
            except FileNotFoundError:
                self.stderr.write(f'   CSV not found at: {csv_path}')

        from apps.products.models import Product
        all_products = list(Product.objects.all())

        # 2. Customers
        if not options['skip_customers']:
            self.stdout.write('\n[CUSTOMERS] Creating demo customers...')
            customers = self.create_customers(admin_user)
            self.stdout.write(self.style.SUCCESS(f'   Customers ready: {len(customers)}'))
        else:
            from apps.customers.models import Customer
            customers = list(Customer.objects.all()[:12])

        if not customers:
            self.stderr.write('No customers available. Cannot create leads/quotations/etc.')
            return

        # 3. Leads
        if not options['skip_leads']:
            self.stdout.write('\n[LEADS] Creating demo leads...')
            leads = self.create_leads(customers, all_users, admin_user)
            self.stdout.write(self.style.SUCCESS(f'   Leads created: {len(leads)}'))

        # 4. Quotations
        if not options['skip_quotations']:
            self.stdout.write('\n[QUOTATIONS] Creating demo quotations...')
            from apps.quotations.models import Quotation
            if not Quotation.objects.exists():
                quotations = self.create_quotations(customers, all_products, admin_user)
                self.stdout.write(self.style.SUCCESS(f'   Quotations created: {len(quotations)}'))
            else:
                self.stdout.write('   Quotations already exist, skipping.')

        # 5. Reservations
        if not options['skip_reservations']:
            self.stdout.write('\n[RESERVATIONS] Creating demo reservations...')
            reservations = self.create_reservations(customers, all_products, admin_user)
            self.stdout.write(self.style.SUCCESS(f'   Reservations created: {len(reservations)}'))

        # 6. After-sales
        if not options['skip_aftersales']:
            self.stdout.write('\n[AFTER-SALES] Creating demo after-sales requests...')
            from apps.after_sales.models import AfterSalesRequest
            if not AfterSalesRequest.objects.exists():
                afs = self.create_aftersales(customers, all_products, admin_user)
                self.stdout.write(self.style.SUCCESS(f'   After-sales created: {len(afs)}'))
            else:
                self.stdout.write('   After-sales already exist, skipping.')

        self.stdout.write(self.style.SUCCESS('\nDemo data load complete!\n'))
