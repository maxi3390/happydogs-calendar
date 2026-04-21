"""HTTP surface for the data-portability backup / restore feature."""
from __future__ import annotations

import io

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .exporter import export_json, export_zip, suggested_filename
from .importer import ImportValidationError, import_file


def _download(payload: bytes, filename: str, content_type: str) -> HttpResponse:
    response = HttpResponse(payload, content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['Content-Length'] = str(len(payload))
    return response


@extend_schema(
    summary='Export all domain data as JSON',
    description=(
        'Download a full JSON backup of the operator\'s domain data. '
        'User accounts and uploaded files are out of scope.'
    ),
    tags=['data-portability'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_json_view(request: Request) -> HttpResponse:
    return _download(
        export_json(),
        filename=suggested_filename('json'),
        content_type='application/json',
    )


@extend_schema(
    summary='Export all domain data as CSV ZIP',
    description=(
        'Download a full CSV backup (ZIP archive containing one .csv per '
        'entity plus a manifest.json). User accounts and uploaded files are '
        'out of scope.'
    ),
    tags=['data-portability'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_csv_view(request: Request) -> HttpResponse:
    return _download(
        export_zip(),
        filename=suggested_filename('zip'),
        content_type='application/zip',
    )


@extend_schema(
    summary='Import a full data backup',
    description=(
        'Replace the DB state with the uploaded file. Accepts the JSON or '
        'ZIP format produced by the export endpoints. The import runs inside '
        'a single atomic transaction; any validation or integrity error '
        'aborts with the DB unchanged. User accounts and uploaded files '
        'are out of scope.'
    ),
    tags=['data-portability'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def import_view(request: Request) -> Response:
    uploaded = request.FILES.get('file')
    if uploaded is None:
        return Response(
            {'detail': 'No file uploaded. Pass the backup file in the `file` form field.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # Materialise to BytesIO so the importer can seek freely and the request
    # lifecycle doesn't clean up the tempfile out from under us.
    buffer = io.BytesIO(uploaded.read())

    try:
        summary = import_file(buffer)
    except ImportValidationError as exc:
        return Response(exc.as_dict(), status=status.HTTP_400_BAD_REQUEST)

    return Response(summary.to_dict(), status=status.HTTP_200_OK)
