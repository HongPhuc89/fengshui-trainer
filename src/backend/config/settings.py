import os
from pathlib import Path
import environ
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "django-insecure-default-key"),
)
# Reading .env file from the backend root (src/backend/)
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# Redis (sessions, Celery broker)
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env("DEBUG")

# App environment: development | staging | production (Sentry only sends when staging/production)
APP_ENV = env("APP_ENV", default="development")

ALLOWED_HOSTS = ["*"]  # Adjust for production

# Sentry – only enable when APP_ENV is production or staging and SENTRY_DSN is set
SENTRY_DSN = env("SENTRY_DSN", default="")
if APP_ENV in ("production", "staging") and SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=APP_ENV,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        enable_logs=True,
    )


# Application definition

INSTALLED_APPS = [
    # Admin Theme
    "jazzmin",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third Party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",

    # Local Apps
    "users",
    "wallet",
    "books",
    "videos",
    "exams",
    "comments",
    "notifications",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "users.middleware.RequestMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "vi-vn" # Set to Vietnamese

TIME_ZONE = "Asia/Ho_Chi_Minh" # Set to Vietnam time

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "config" / "static"]

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Supabase Storage (private bucket, pre-signed URLs)
# Get credentials from: Supabase Dashboard > Project Settings > Storage > S3 Connection
SUPABASE_PROJECT_REF = env("SUPABASE_PROJECT_REF", default="")
SUPABASE_S3_ACCESS_KEY_ID = env("SUPABASE_S3_ACCESS_KEY_ID", default="")
SUPABASE_S3_SECRET_ACCESS_KEY = env("SUPABASE_S3_SECRET_ACCESS_KEY", default="")
SUPABASE_STORAGE_BUCKET = env("SUPABASE_STORAGE_BUCKET", default="media")
SUPABASE_REGION = env("SUPABASE_REGION", default="ap-southeast-1")
SUPABASE_URL_EXPIRY = 3600  # pre-signed URL valid for 1 hour

# PDF encryption — generate with: openssl rand -hex 32
PDF_MASTER_KEY = env("PDF_MASTER_KEY", default="")

STORAGES = {
    "default": {"BACKEND": "config.storage.LocalFirstSupabaseStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Allow large video file uploads (up to 5 GB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024 * 1024  # 5 GB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024         # 10 MB threshold → use disk

# Auth User Model
AUTH_USER_MODEL = "users.User"

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.DeviceJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Spectacular Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Fengshui Trainer API',
    'DESCRIPTION': 'API documentation for Fengshui Trainer platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=1025)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@fengshuitrainer.com")

# Video storage backend: 'local' (default) or 'bunny'
# Switch to 'bunny' and provide BUNNY_LIBRARY_ID, BUNNY_API_KEY, BUNNY_CDN_HOSTNAME in .env
VIDEO_STORAGE_BACKEND = env('VIDEO_STORAGE_BACKEND', default='local')
BUNNY_LIBRARY_ID = env('BUNNY_LIBRARY_ID', default='')
BUNNY_API_KEY = env('BUNNY_API_KEY', default='')
BUNNY_CDN_HOSTNAME = env('BUNNY_CDN_HOSTNAME', default='iframe.mediadelivery.net')

# SimpleJWT Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=4),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=90),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Jazzmin Configuration (Simplified)
JAZZMIN_SETTINGS = {
    "site_title": "Thien Thu Admin",
    "site_header": "Thien Thu",
    "site_brand": "Thien Thu Platform",
    "welcome_sign": "Welcome to Thien Thu Admin",
    "copyright": "Thien Thu Ltd",
    "search_model": ["users.User"],
    "user_avatar": None,
    "topmenu_links": [
        {"name": "Home", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Activity Stats", "url": "/admin/stats/activity/", "permissions": ["auth.view_user"]},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "order_with_respect_to": [
        "users",
        "books",
        "videos",
        "exams",
        "wallet",
    ],
    "hide_models": [
        "wallet.Voucher",
        "comments.Comment",
        "comments.CommentReply",
        "auth.Group",
        "notifications.EmailLog",
        "notifications.EmailQuota",
    ],
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",
        "users.User": "fas fa-user-graduate",
        "users.UserDevice": "fas fa-mobile-alt",
        "users.AdminAuditLog": "fas fa-clipboard-list",
        "books.BookCategory": "fas fa-tags",
        "books.Book": "fas fa-book",
        "books.BookChapter": "fas fa-bookmark",
        "books.UserBookPurchase": "fas fa-shopping-cart",
        "videos.VideoCategory": "fas fa-folder",
        "videos.VideoCourse": "fas fa-video",
        "videos.VideoLesson": "fas fa-play-circle",
        "videos.UserVideoPurchase": "fas fa-shopping-cart",
        "videos.UserLessonProgress": "fas fa-chart-line",
        "wallet.Wallet": "fas fa-wallet",
        "wallet.WalletTransaction": "fas fa-exchange-alt",
    },
    "custom_js": "admin/js/jazzmin_bs5_tabs.js",
}

# CORS
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https?://localhost(:\d+)?$",
    r"^https?://.*\.hongphuc\.top$",
    r"^https?://hongphuc\.top$",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "cache-control",
]

# Celery
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Ho_Chi_Minh"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
