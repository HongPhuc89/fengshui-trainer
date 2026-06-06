from django.conf import settings
from django.db import connections
from django.db.utils import OperationalError
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

HEALTH_CACHE_KEY = "_health_check_result"
HEALTH_CACHE_TTL = 120  # seconds


def _check_database():
    try:
        conn = connections["default"]
        conn.cursor()
        return True, None
    except OperationalError as e:
        return False, str(e)


def _check_redis():
    try:
        cache.set("_health_probe", "ok", timeout=5)
        value = cache.get("_health_probe")
        if value != "ok":
            return False, "Read-back mismatch"
        return True, None
    except Exception as e:
        return False, str(e)


def _run_checks():
    db_ok, db_error = _check_database()
    redis_ok, redis_error = _check_redis()

    all_ok = db_ok and redis_ok
    return {
        "all_ok": all_ok,
        "payload": {
            "status": "ok" if all_ok else "error",
        },
    }


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health_check(request):
    cached = cache.get(HEALTH_CACHE_KEY)
    if cached is not None:
        http_status = status.HTTP_200_OK if cached["all_ok"] else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(cached["payload"], status=http_status)

    result = _run_checks()

    # Only cache if Redis is reachable (cache.set is a no-op when Redis is down)
    cache.set(HEALTH_CACHE_KEY, result, timeout=HEALTH_CACHE_TTL)

    http_status = status.HTTP_200_OK if result["all_ok"] else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(result["payload"], status=http_status)


def health_supabase(request):
    token = request.headers.get("X-Health-Token", "")
    expected = settings.HEALTH_SECRET_TOKEN
    if not expected or token != expected:
        return JsonResponse({"status": "error", "detail": "Unauthorized"}, status=401)

    supabase_url = settings.SUPABASE_DATABASE_URL
    if not supabase_url:
        return JsonResponse({"status": "error", "detail": "SUPABASE_DATABASE_URL not configured"}, status=503)

    try:
        import psycopg2
        conn = psycopg2.connect(supabase_url, connect_timeout=5)
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM books_book")
            row = cur.fetchone()
        conn.close()
        return JsonResponse({"status": "ok", "count": row[0]})
    except Exception as e:
        return JsonResponse({"status": "error", "detail": str(e)}, status=503)
