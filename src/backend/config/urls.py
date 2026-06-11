from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from config.views_health import health_check, health_supabase

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/health-supabase/', health_supabase, name='health-supabase'),

    # Swagger Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API Endpoints
    path('api/auth/', include('users.urls_auth')),
    path('api/users/', include('users.urls')),
    path('api/wallet/', include('wallet.urls')),
    path('api/payments/', include('wallet.urls_payments')),
    path('api/exams/', include('exams.urls')),
    path('api/practice/', include('exams.urls_practice')),
    path('api/training/', include('exams.urls_training')),
    path('api/books/', include('books.urls')),
    path('api/videos/', include('videos.urls')),
    path('api/comments/', include('comments.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/admin/stats/', include('users.urls_admin_stats')),
    path('api/landing/', include('landing.urls')),
]

if settings.DEBUG:
    from django.views.static import serve
    from django.urls import re_path
    from config.views_media import serve_media_with_range
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve_media_with_range),
    ]
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
