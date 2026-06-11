import os
import mimetypes
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse


def serve_media_with_range(request, path):
    """Serve media files with Accept-Ranges support so browsers can seek audio/video."""
    full_path = os.path.join(settings.MEDIA_ROOT, path)
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise Http404

    file_size = os.path.getsize(full_path)
    content_type, _ = mimetypes.guess_type(full_path)
    content_type = content_type or 'application/octet-stream'

    range_header = request.META.get('HTTP_RANGE')
    if range_header:
        # Parse "bytes=start-end"
        range_value = range_header.strip().replace('bytes=', '')
        parts = range_value.split('-')
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        length = end - start + 1

        with open(full_path, 'rb') as f:
            f.seek(start)
            data = f.read(length)

        response = HttpResponse(data, status=206, content_type=content_type)
        response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
        response['Content-Length'] = length
    else:
        response = FileResponse(open(full_path, 'rb'), content_type=content_type)
        response['Content-Length'] = file_size

    response['Accept-Ranges'] = 'bytes'
    return response
