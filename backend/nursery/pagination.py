from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default list pagination.

    Responses use the standard ``{count, next, previous, results}`` envelope.
    Callers may request a different page size via ``?page_size=N`` up to
    ``max_page_size``; anything larger is capped so worst-case payload and
    serialization stay bounded.
    """

    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
