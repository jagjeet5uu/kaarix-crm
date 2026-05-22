from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed the database with initial data for development/testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        self.create_users()
        self.create_customers()
        self.create_leads()
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))

    def create_users(self):
        from apps.accounts.models import User

        users_data = [
            {
                'username': 'admin',
                'email': 'admin@jewelry.com',
                'password': 'admin123',
                'role': 'admin',
                'first_name': 'Admin',
                'last_name': 'User',
                'mobile': '9999000001',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'sales_manager',
                'email': 'manager@jewelry.com',
                'password': 'manager123',
                'role': 'sales_manager',
                'first_name': 'Rajesh',
                'last_name': 'Sharma',
                'mobile': '9999000002',
            },
            {
                'username': 'salesperson1',
                'email': 'sales1@jewelry.com',
                'password': 'sales123',
                'role': 'salesperson',
                'first_name': 'Priya',
                'last_name': 'Patel',
                'mobile': '9999000003',
            },
            {
                'username': 'inventory_mgr',
                'email': 'inventory@jewelry.com',
                'password': 'inv123',
                'role': 'inventory_manager',
                'first_name': 'Amit',
                'last_name': 'Kumar',
                'mobile': '9999000004',
            },
            {
                'username': 'accounts_user',
                'email': 'accounts@jewelry.com',
                'password': 'acc123',
                'role': 'accounts',
                'first_name': 'Sunita',
                'last_name': 'Gupta',
                'mobile': '9999000005',
            },
            {
                'username': 'service_staff1',
                'email': 'service@jewelry.com',
                'password': 'svc123',
                'role': 'service_staff',
                'first_name': 'Ramesh',
                'last_name': 'Nair',
                'mobile': '9999000006',
            },
        ]

        for data in users_data:
            is_staff = data.pop('is_staff', False)
            is_superuser = data.pop('is_superuser', False)
            password = data.pop('password')

            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults=data,
            )
            if created:
                user.set_password(password)
                user.is_staff = is_staff
                user.is_superuser = is_superuser
                user.save()
                self.stdout.write(f"  Created user: {user.username} ({user.role})")
            else:
                self.stdout.write(f"  User already exists: {user.username}")

    def create_customers(self):
        from apps.accounts.models import User
        from apps.customers.models import Customer

        admin = User.objects.filter(username='admin').first()

        customers_data = [
            {
                'first_name': 'Anjali', 'last_name': 'Mehta',
                'mobile': '9876543210', 'email': 'anjali@example.com',
                'city': 'Mumbai', 'customer_type': 'vip',
                'lead_source': 'referral', 'preferred_metal': 'gold_18k',
            },
            {
                'first_name': 'Vikram', 'last_name': 'Singh',
                'mobile': '9876543211', 'email': 'vikram@example.com',
                'city': 'Delhi', 'customer_type': 'retail',
                'lead_source': 'instagram', 'preferred_metal': 'gold_22k',
            },
            {
                'first_name': 'Deepa', 'last_name': 'Nair',
                'mobile': '9876543212', 'email': 'deepa@example.com',
                'city': 'Bangalore', 'customer_type': 'retail',
                'lead_source': 'walk_in',
            },
            {
                'first_name': 'Suresh', 'last_name': 'Agarwal',
                'mobile': '9876543213', 'email': 'suresh@example.com',
                'city': 'Jaipur', 'customer_type': 'wholesale',
                'lead_source': 'referral', 'preferred_metal': 'gold_22k',
            },
            {
                'first_name': 'Kavya', 'last_name': 'Reddy',
                'mobile': '9876543214', 'email': 'kavya@example.com',
                'city': 'Hyderabad', 'customer_type': 'retail',
                'lead_source': 'facebook',
            },
        ]

        for data in customers_data:
            customer, created = Customer.objects.get_or_create(
                mobile=data['mobile'],
                defaults={**data, 'created_by': admin},
            )
            if created:
                self.stdout.write(f"  Created customer: {customer.full_name}")
            else:
                self.stdout.write(f"  Customer already exists: {customer.full_name}")

    def create_leads(self):
        from apps.accounts.models import User
        from apps.customers.models import Customer
        from apps.leads.models import Lead

        salesperson = User.objects.filter(username='salesperson1').first()
        admin = User.objects.filter(username='admin').first()
        customers = Customer.objects.all()

        if not customers.exists():
            return

        leads_data = [
            {
                'customer': customers[0],
                'stage': 'requirement_collected',
                'source': 'referral',
                'interested_category': 'rings',
                'budget_min': 50000,
                'budget_max': 100000,
                'occasion': 'Wedding',
                'follow_up_date': timezone.now().date(),
            },
            {
                'customer': customers[1] if len(customers) > 1 else customers[0],
                'stage': 'products_shared',
                'source': 'instagram',
                'interested_category': 'necklaces',
                'budget_min': 30000,
                'budget_max': 75000,
                'occasion': 'Anniversary',
            },
            {
                'customer': customers[2] if len(customers) > 2 else customers[0],
                'stage': 'new_inquiry',
                'source': 'walk_in',
                'interested_category': 'bracelets',
            },
        ]

        for data in leads_data:
            customer = data.pop('customer')
            lead, created = Lead.objects.get_or_create(
                customer=customer,
                stage=data['stage'],
                defaults={
                    **data,
                    'customer': customer,
                    'assigned_to': salesperson,
                    'created_by': admin,
                },
            )
            if created:
                self.stdout.write(f"  Created lead for: {customer.full_name} ({lead.stage})")
            else:
                self.stdout.write(f"  Lead already exists for: {customer.full_name}")
