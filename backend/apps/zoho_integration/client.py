import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class ZohoAPIError(Exception):
    def __init__(self, message, status_code=None, response=None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class ZohoClient:
    """Client for Zoho Books/Inventory API."""

    def __init__(self):
        self.api_domain = settings.ZOHO_API_DOMAIN
        self.org_id = settings.ZOHO_ORGANIZATION_ID
        self._token = None

    def _get_token(self):
        """Get a valid access token from the database or refresh it."""
        from apps.zoho_integration.models import ZohoToken
        token = ZohoToken.objects.order_by('-updated_at').first()
        if token and not token.is_expired:
            return token.access_token
        if token:
            return self._refresh_token(token)
        # Bootstrap from settings refresh token
        if settings.ZOHO_REFRESH_TOKEN:
            return self._refresh_token_from_settings()
        raise ZohoAPIError('No Zoho token available. Please authenticate.')

    def _refresh_token(self, token_obj=None):
        """Refresh the access token using the stored refresh token."""
        from apps.zoho_integration.models import ZohoToken
        refresh_token = (token_obj.refresh_token if token_obj else None) or settings.ZOHO_REFRESH_TOKEN

        url = 'https://accounts.zoho.in/oauth/v2/token'
        params = {
            'refresh_token': refresh_token,
            'client_id': settings.ZOHO_CLIENT_ID,
            'client_secret': settings.ZOHO_CLIENT_SECRET,
            'grant_type': 'refresh_token',
        }
        response = requests.post(url, params=params, timeout=30)
        if response.status_code != 200:
            raise ZohoAPIError(
                f'Failed to refresh token: {response.text}', status_code=response.status_code
            )
        data = response.json()
        if 'error' in data:
            raise ZohoAPIError(f'Token refresh error: {data["error"]}')

        access_token = data['access_token']
        expires_in = data.get('expires_in', 3600)
        expires_at = timezone.now() + timedelta(seconds=expires_in - 60)

        if token_obj:
            token_obj.access_token = access_token
            token_obj.expires_at = expires_at
            token_obj.save()
        else:
            ZohoToken.objects.create(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                organization_id=settings.ZOHO_ORGANIZATION_ID,
                api_domain=settings.ZOHO_API_DOMAIN,
            )
        return access_token

    def _refresh_token_from_settings(self):
        """Initialize token from settings refresh token."""
        return self._refresh_token(token_obj=None)

    def _headers(self):
        token = self._get_token()
        return {
            'Authorization': f'Zoho-oauthtoken {token}',
            'Content-Type': 'application/json',
        }

    def _get(self, endpoint, params=None):
        url = f"{self.api_domain}/books/v3/{endpoint}"
        params = params or {}
        params['organization_id'] = self.org_id
        response = requests.get(url, headers=self._headers(), params=params, timeout=30)
        if response.status_code == 401:
            # Token expired, refresh and retry
            self._token = None
            ZohoToken = __import__('apps.zoho_integration.models', fromlist=['ZohoToken']).ZohoToken
            token = ZohoToken.objects.order_by('-updated_at').first()
            if token:
                token.expires_at = timezone.now() - timedelta(seconds=1)
                token.save()
            response = requests.get(url, headers=self._headers(), params=params, timeout=30)
        if response.status_code not in (200, 201):
            raise ZohoAPIError(
                f'GET {endpoint} failed: {response.text}', status_code=response.status_code
            )
        return response.json()

    def _post(self, endpoint, data):
        url = f"{self.api_domain}/books/v3/{endpoint}"
        params = {'organization_id': self.org_id}
        response = requests.post(url, headers=self._headers(), json=data, params=params, timeout=30)
        if response.status_code not in (200, 201):
            raise ZohoAPIError(
                f'POST {endpoint} failed: {response.text}', status_code=response.status_code
            )
        return response.json()

    def _put(self, endpoint, data):
        url = f"{self.api_domain}/books/v3/{endpoint}"
        params = {'organization_id': self.org_id}
        response = requests.put(url, headers=self._headers(), json=data, params=params, timeout=30)
        if response.status_code not in (200, 201):
            raise ZohoAPIError(
                f'PUT {endpoint} failed: {response.text}', status_code=response.status_code
            )
        return response.json()

    # ---- Items ----

    def get_items(self, page=1, per_page=200):
        return self._get('items', params={'page': page, 'per_page': per_page})

    def get_item(self, item_id):
        return self._get(f'items/{item_id}')

    # ---- Contacts ----

    def get_contacts(self, page=1, per_page=200):
        return self._get('contacts', params={'page': page, 'per_page': per_page})

    def get_contact(self, contact_id):
        return self._get(f'contacts/{contact_id}')

    def create_contact(self, data):
        return self._post('contacts', data)

    def update_contact(self, contact_id, data):
        return self._put(f'contacts/{contact_id}', data)

    # ---- Invoices ----

    def get_invoices(self, page=1, per_page=200):
        return self._get('invoices', params={'page': page, 'per_page': per_page})

    def get_invoice(self, invoice_id):
        return self._get(f'invoices/{invoice_id}')

    def create_invoice(self, data):
        return self._post('invoices', data)

    # ---- Estimates ----

    def get_estimates(self, page=1, per_page=200):
        return self._get('estimates', params={'page': page, 'per_page': per_page})

    def create_estimate(self, data):
        return self._post('estimates', data)

    # ---- Payments ----

    def get_payments(self, page=1, per_page=200):
        return self._get('customerpayments', params={'page': page, 'per_page': per_page})

    def get_item_image(self, item_id):
        """
        Fetch the image for a Zoho item.
        Returns raw bytes of the image, or None if no image exists.
        Raises ZohoAPIError on auth failures.
        """
        url = f"{self.api_domain}/books/v3/items/{item_id}/image"
        params = {'organization_id': self.org_id}
        headers = {k: v for k, v in self._headers().items() if k != 'Content-Type'}
        response = requests.get(url, headers=headers, params=params, timeout=30)

        if response.status_code == 401:
            # Force token refresh and retry once
            from apps.zoho_integration.models import ZohoToken
            from datetime import timedelta
            token = ZohoToken.objects.order_by('-updated_at').first()
            if token:
                token.expires_at = timezone.now() - timedelta(seconds=1)
                token.save()
            headers = {k: v for k, v in self._headers().items() if k != 'Content-Type'}
            response = requests.get(url, headers=headers, params=params, timeout=30)

        if response.status_code == 404:
            return None  # Item has no image
        if response.status_code not in (200, 201):
            raise ZohoAPIError(
                f'GET items/{item_id}/image failed: {response.text}',
                status_code=response.status_code,
            )
        # Zoho returns the image bytes directly
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        return response.content, content_type

    def exchange_code_for_tokens(self, code):
        """Exchange OAuth authorization code for tokens."""
        url = 'https://accounts.zoho.in/oauth/v2/token'
        params = {
            'code': code,
            'client_id': settings.ZOHO_CLIENT_ID,
            'client_secret': settings.ZOHO_CLIENT_SECRET,
            'redirect_uri': settings.ZOHO_REDIRECT_URI,
            'grant_type': 'authorization_code',
        }
        response = requests.post(url, params=params, timeout=30)
        if response.status_code != 200:
            raise ZohoAPIError(f'Token exchange failed: {response.text}')
        return response.json()
