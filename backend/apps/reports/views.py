import urllib.request
import json
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Sum, Q, Avg, F, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrSalesManager


class DashboardView(APIView):
    """Dashboard KPI stats — flat structure for frontend compatibility."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.customers.models import Customer
        from apps.leads.models import Lead, Task
        from apps.products.models import Product
        from apps.reservations.models import ProductReservation
        from apps.after_sales.models import AfterSalesRequest

        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)

        # ── Customers ────────────────────────────────────────
        total_customers = Customer.objects.count()
        new_customers_month = Customer.objects.filter(created_at__date__gte=thirty_days_ago).count()
        birthdays_today = Customer.objects.filter(
            birthday__month=today.month, birthday__day=today.day
        ).count()

        # ── Leads ────────────────────────────────────────────
        lead_qs = Lead.objects.all()
        if request.user.role not in ('admin', 'sales_manager'):
            lead_qs = lead_qs.filter(assigned_to=request.user)

        total_leads = lead_qs.count()
        active_leads = lead_qs.exclude(stage__in=['closed_won', 'closed_lost']).count()
        won_this_month = lead_qs.filter(
            stage='closed_won', updated_at__date__gte=thirty_days_ago
        ).count()
        follow_ups_today = lead_qs.filter(
            follow_up_date=today
        ).exclude(stage__in=['closed_won', 'closed_lost']).count()
        overdue_follow_ups = lead_qs.filter(
            follow_up_date__lt=today
        ).exclude(stage__in=['closed_won', 'closed_lost']).count()

        # Leads by stage dict for chart
        stage_counts = dict(
            lead_qs.values_list('stage').annotate(cnt=Count('id'))
        )

        # ── Products / Inventory ─────────────────────────────
        total_products = Product.objects.filter(is_active=True).count()
        available_products = Product.objects.filter(inventory_status='available', is_active=True).count()
        reserved_products = Product.objects.filter(inventory_status='reserved').count()
        sold_products = Product.objects.filter(inventory_status='sold').count()
        returned_products = Product.objects.filter(inventory_status='returned').count()
        inventory_value = (
            Product.objects.filter(inventory_status='available', is_active=True)
            .aggregate(total=Sum('selling_price'))['total'] or 0
        )

        # ── Reservations ─────────────────────────────────────
        expiring_soon = ProductReservation.objects.filter(
            status='active',
            reserved_until__lte=timezone.now() + timedelta(hours=48),
        ).count()

        # ── After sales ──────────────────────────────────────
        open_service_requests = AfterSalesRequest.objects.exclude(
            status__in=['delivered', 'closed', 'cancelled']
        ).count()
        ready_for_delivery = AfterSalesRequest.objects.filter(status='ready').count()

        # ── Tasks ────────────────────────────────────────────
        task_qs = Task.objects.all()
        if request.user.role not in ('admin', 'sales_manager'):
            task_qs = task_qs.filter(assigned_to=request.user)
        overdue_tasks = task_qs.filter(status='pending', due_date__lt=today).count()

        return Response({
            # Inventory KPIs (flat — matches frontend DashboardStats type)
            'total_products': total_products,
            'available_products': available_products,
            'reserved_products': reserved_products,
            'sold_products': sold_products,
            'returned_products': returned_products,
            'inventory_value': float(inventory_value),
            # Lead KPIs
            'total_leads': total_leads,
            'active_leads': active_leads,
            'won_this_month': won_this_month,
            'leads_by_stage': stage_counts,
            'follow_ups_due_today': follow_ups_today,
            'overdue_follow_ups': overdue_follow_ups,
            # Customer KPIs
            'total_customers': total_customers,
            'new_customers_month': new_customers_month,
            'birthdays_today': birthdays_today,
            # Operations
            'reservations_expiring_soon': expiring_soon,
            'open_service_requests': open_service_requests,
            'ready_for_delivery': ready_for_delivery,
            'overdue_tasks': overdue_tasks,
            # Legacy alias for sync errors (keep for compat)
            'recent_sync_errors': 0,
        })


class InventorySummaryView(APIView):
    """Inventory summary by category."""
    permission_classes = [IsAdminOrSalesManager]

    def get(self, request):
        from apps.products.models import Product

        summary = (
            Product.objects.filter(is_active=True)
            .values('category', 'inventory_status')
            .annotate(
                count=Count('id'),
                total_value=Sum('selling_price'),
            )
            .order_by('category', 'inventory_status')
        )

        # Also by category total
        category_totals = (
            Product.objects.filter(is_active=True)
            .values('category')
            .annotate(
                total=Count('id'),
                available=Count('id', filter=Q(inventory_status='available')),
                reserved=Count('id', filter=Q(inventory_status='reserved')),
                sold=Count('id', filter=Q(inventory_status='sold')),
                total_selling_value=Sum('selling_price'),
                avg_price=Avg('selling_price'),
            )
            .order_by('category')
        )

        return Response({
            'by_category_status': list(summary),
            'category_totals': list(category_totals),
        })


class StockAgingView(APIView):
    """Stock aging report - items by purchase date brackets."""
    permission_classes = [IsAdminOrSalesManager]

    def get(self, request):
        from apps.products.models import Product

        today = timezone.now().date()

        def age_bracket(days):
            if days is None:
                return 'unknown'
            if days <= 30:
                return '0-30 days'
            elif days <= 90:
                return '31-90 days'
            elif days <= 180:
                return '91-180 days'
            elif days <= 365:
                return '181-365 days'
            else:
                return '365+ days'

        products = Product.objects.filter(
            is_active=True, inventory_status='available'
        ).values('id', 'item_name', 'sku', 'category', 'selling_price', 'date_of_purchase')

        brackets = {
            '0-30 days': [], '31-90 days': [], '91-180 days': [],
            '181-365 days': [], '365+ days': [], 'unknown': [],
        }

        for p in products:
            if p['date_of_purchase']:
                days = (today - p['date_of_purchase']).days
            else:
                days = None
            bracket = age_bracket(days)
            brackets[bracket].append({
                'id': p['id'],
                'item_name': p['item_name'],
                'sku': p['sku'],
                'category': p['category'],
                'selling_price': str(p['selling_price']) if p['selling_price'] else None,
                'date_of_purchase': str(p['date_of_purchase']) if p['date_of_purchase'] else None,
                'days_in_stock': days,
            })

        summary = {bracket: {'count': len(items), 'items': items} for bracket, items in brackets.items()}
        return Response(summary)


class LeadsByStageView(APIView):
    """Leads distribution by stage."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.leads.models import Lead

        lead_qs = Lead.objects.all()
        if request.user.role not in ('admin', 'sales_manager'):
            lead_qs = lead_qs.filter(assigned_to=request.user)

        stages = (
            lead_qs.values('stage')
            .annotate(count=Count('id'))
            .order_by('stage')
        )

        # Conversion funnel
        total = lead_qs.count()
        won = lead_qs.filter(stage='closed_won').count()
        conversion_rate = round((won / total * 100), 2) if total > 0 else 0

        return Response({
            'stages': list(stages),
            'total': total,
            'closed_won': won,
            'conversion_rate': conversion_rate,
        })


class FollowUpsView(APIView):
    """Follow-ups report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.leads.models import Lead

        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        next_7_days = today + timedelta(days=7)

        lead_qs = Lead.objects.exclude(stage__in=['closed_won', 'closed_lost'])
        if request.user.role not in ('admin', 'sales_manager'):
            lead_qs = lead_qs.filter(assigned_to=request.user)

        overdue = lead_qs.filter(follow_up_date__lt=today).count()
        today_count = lead_qs.filter(follow_up_date=today).count()
        tomorrow_count = lead_qs.filter(follow_up_date=tomorrow).count()
        next_week = lead_qs.filter(follow_up_date__gt=today, follow_up_date__lte=next_7_days).count()
        no_follow_up = lead_qs.filter(follow_up_date__isnull=True).count()

        overdue_list = lead_qs.filter(follow_up_date__lt=today).select_related(
            'customer', 'assigned_to'
        ).values(
            'id', 'customer__first_name', 'customer__last_name',
            'customer__mobile', 'stage', 'follow_up_date', 'assigned_to__username',
        )[:20]

        return Response({
            'overdue': overdue,
            'today': today_count,
            'tomorrow': tomorrow_count,
            'next_7_days': next_week,
            'no_follow_up': no_follow_up,
            'overdue_list': list(overdue_list),
        })


class SalespersonPerformanceView(APIView):
    """Salesperson performance report."""
    permission_classes = [IsAdminOrSalesManager]

    def get(self, request):
        from apps.leads.models import Lead
        from apps.accounts.models import User

        thirty_days_ago = timezone.now().date() - timedelta(days=30)

        performance = (
            Lead.objects.values(
                'assigned_to__id', 'assigned_to__username',
                'assigned_to__first_name', 'assigned_to__last_name',
            )
            .annotate(
                total_leads=Count('id'),
                active_leads=Count('id', filter=~Q(stage__in=['closed_won', 'closed_lost'])),
                won=Count('id', filter=Q(stage='closed_won')),
                lost=Count('id', filter=Q(stage='closed_lost')),
                won_this_month=Count(
                    'id',
                    filter=Q(stage='closed_won', updated_at__date__gte=thirty_days_ago),
                ),
                follow_ups_pending=Count(
                    'id',
                    filter=Q(
                        follow_up_date__lte=timezone.now().date(),
                        stage__in=['new_inquiry', 'contacted', 'requirement_collected',
                                   'products_shared', 'shortlisted', 'reserved',
                                   'quotation_sent', 'advance_paid'],
                    ),
                ),
            )
            .filter(assigned_to__isnull=False)
            .order_by('-won')
        )

        return Response(list(performance))


class FinancialSummaryView(APIView):
    """Financial overview — invoices, payments, bills, expenses."""
    permission_classes = [IsAdminOrSalesManager]

    def get(self, request):
        from apps.finances.models import SalesInvoice, CustomerPayment, VendorPayment, VendorCredit
        from apps.purchases.models import Bill, Expense
        from django.db.models.functions import TruncMonth

        # ── Invoices (receivables) ────────────────────────────
        inv_agg = SalesInvoice.objects.aggregate(
            total_invoiced=Sum('total'),
            total_balance=Sum('balance'),
        )
        total_invoiced = float(inv_agg['total_invoiced'] or 0)
        total_outstanding = float(inv_agg['total_balance'] or 0)

        invoice_by_status = list(
            SalesInvoice.objects.values('status')
            .annotate(count=Count('id'), amount=Sum('total'))
            .order_by('status')
        )
        # serialise Decimal → float
        for row in invoice_by_status:
            row['amount'] = float(row['amount'] or 0)

        # ── Payments received ─────────────────────────────────
        cp_total = float(CustomerPayment.objects.aggregate(total=Sum('amount'))['total'] or 0)

        # ── Vendor side ───────────────────────────────────────
        vp_total = float(VendorPayment.objects.aggregate(total=Sum('amount'))['total'] or 0)
        vc_total = float(VendorCredit.objects.aggregate(total=Sum('total'))['total'] or 0)

        bill_agg = Bill.objects.aggregate(
            total_billed=Sum('total'),
            total_balance=Sum('balance'),
        )
        total_billed = float(bill_agg['total_billed'] or 0)
        total_payable = float(bill_agg['total_balance'] or 0)

        exp_total = float(Expense.objects.aggregate(total=Sum('total'))['total'] or 0)

        # ── Monthly trend (invoiced vs collected) ─────────────
        monthly_inv = list(
            SalesInvoice.objects.filter(invoice_date__isnull=False)
            .annotate(month=TruncMonth('invoice_date'))
            .values('month')
            .annotate(invoiced=Sum('total'), inv_count=Count('id'))
            .order_by('month')
        )
        monthly_cp = list(
            CustomerPayment.objects.filter(payment_date__isnull=False)
            .annotate(month=TruncMonth('payment_date'))
            .values('month')
            .annotate(collected=Sum('amount'), cp_count=Count('id'))
            .order_by('month')
        )

        # merge by month key
        trend_map: dict = {}
        for r in monthly_inv:
            key = r['month'].strftime('%b %y')
            trend_map[key] = {'month': key, 'invoiced': float(r['invoiced'] or 0), 'collected': 0.0}
        for r in monthly_cp:
            key = r['month'].strftime('%b %y')
            if key not in trend_map:
                trend_map[key] = {'month': key, 'invoiced': 0.0, 'collected': 0.0}
            trend_map[key]['collected'] = float(r['collected'] or 0)

        # sort chronologically
        import datetime
        def _month_key(k):
            try:
                return datetime.datetime.strptime(k, '%b %y')
            except Exception:
                return datetime.datetime.min

        monthly_trend = sorted(trend_map.values(), key=lambda x: _month_key(x['month']))

        return Response({
            'total_invoiced': total_invoiced,
            'total_outstanding': total_outstanding,
            'total_collected': cp_total,
            'total_vendor_payments': vp_total,
            'total_vendor_credits': vc_total,
            'total_billed': total_billed,
            'total_payable': total_payable,
            'total_expenses': exp_total,
            'invoice_by_status': invoice_by_status,
            'monthly_trend': monthly_trend,
        })


class SyncErrorsView(APIView):
    """Zoho sync errors report."""
    permission_classes = [IsAdminOrSalesManager]

    def get(self, request):
        from apps.zoho_integration.models import ZohoSyncLog

        errors = ZohoSyncLog.objects.filter(status='failed').order_by('-created_at')[:100]
        data = [
            {
                'id': log.id,
                'module': log.module,
                'direction': log.direction,
                'zoho_id': log.zoho_id,
                'local_id': log.local_id,
                'error_message': log.error_message,
                'retry_count': log.retry_count,
                'created_at': log.created_at.isoformat(),
            }
            for log in errors
        ]
        return Response({
            'total_errors': ZohoSyncLog.objects.filter(status='failed').count(),
            'errors': data,
        })


class GoldPriceView(APIView):
    """Real-time gold & silver prices via GoldAPI.io — cached 5 minutes."""
    permission_classes = [IsAuthenticated]
    CACHE_KEY = 'goldapi_prices'
    CACHE_TTL = 300  # 5 minutes

    def _fetch_metal(self, symbol: str) -> dict:
        url = f'https://www.goldapi.io/api/{symbol}/INR'
        req = urllib.request.Request(
            url,
            headers={
                'x-access-token': settings.GOLDAPI_KEY,
                'Content-Type': 'application/json',
            },
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            return json.loads(resp.read().decode())

    def get(self, request):
        cached = cache.get(self.CACHE_KEY)
        if cached:
            return Response({**cached, 'cached': True})

        try:
            gold = self._fetch_metal('XAU')
            silver = self._fetch_metal('XAG')

            data = {
                'cached': False,
                'updated_at': timezone.now().isoformat(),
                'gold': {
                    'price_troy_oz_inr': round(gold.get('price', 0), 2),
                    'change': round(gold.get('ch', 0), 2),
                    'change_pct': round(gold.get('chp', 0), 2),
                    'prev_close': round(gold.get('prev_close_price', 0), 2),
                    'per_gram': {
                        '24k': round(gold.get('price_gram_24k', 0), 2),
                        '22k': round(gold.get('price_gram_22k', 0), 2),
                        '21k': round(gold.get('price_gram_21k', 0), 2),
                        '20k': round(gold.get('price_gram_20k', 0), 2),
                        '18k': round(gold.get('price_gram_18k', 0), 2),
                        '14k': round(gold.get('price_gram_14k', 0), 2),
                    },
                },
                'silver': {
                    'price_troy_oz_inr': round(silver.get('price', 0), 2),
                    'change': round(silver.get('ch', 0), 2),
                    'change_pct': round(silver.get('chp', 0), 2),
                    'prev_close': round(silver.get('prev_close_price', 0), 2),
                    'per_gram': {
                        '999': round(silver.get('price_gram_24k', 0), 2),
                    },
                },
            }
            cache.set(self.CACHE_KEY, data, self.CACHE_TTL)
            return Response(data)

        except Exception as e:
            # Return cached stale data if available, else error
            stale = cache.get(self.CACHE_KEY + '_stale')
            if stale:
                return Response({**stale, 'cached': True, 'stale': True})
            return Response(
                {'error': 'Unable to fetch gold prices', 'detail': str(e)},
                status=503,
            )
