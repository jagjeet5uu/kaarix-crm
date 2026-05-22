from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Pagination class that allows clients to control page size via ?page_size=N.
    Defaults to 20, max 200.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200
    page_query_param = 'page'
