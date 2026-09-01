import logging
import mimetypes

from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger(__name__)

SUPABASE_SYNC_TTL = 60 * 60 * 24 * 30  # 30 days
# Cache the pre-signed URL itself for (expiry - 5 min) to avoid returning a nearly-expired URL
_URL_CACHE_BUFFER = 5 * 60  # 5 minutes


class LocalFirstSupabaseStorage(FileSystemStorage):
    """
    Saves files to local filesystem first (safe backup), then synchronously uploads
    to Supabase Storage.

    URL generation returns a Supabase pre-signed URL if the file was successfully
    uploaded, or falls back to the local URL only when a real Supabase error occurred.
    """

    def _save(self, name, content):
        # 1. Always save locally first — guaranteed backup
        name = super()._save(name, content)

        # 2. Upload to Supabase synchronously
        if self._is_configured():
            try:
                self._upload(name)
                cache.set(f"supabase_sync:{name}", True, timeout=SUPABASE_SYNC_TTL)
            except Exception as exc:
                logger.warning(
                    "Supabase upload failed for %s: %s (local copy kept)", name, exc
                )

        return name

    def url(self, name):
        if name and self._is_configured() and cache.get(f"supabase_sync:{name}"):
            cache_key = f"supabase_url:{name}"
            cached_url = cache.get(cache_key)
            if cached_url:
                return cached_url
            try:
                url = self._presigned_url(name)
                expiry = getattr(settings, "SUPABASE_URL_EXPIRY", 3600)
                cache.set(cache_key, url, timeout=expiry - _URL_CACHE_BUFFER)
                return url
            except Exception as exc:
                logger.warning("Supabase URL failed for %s: %s, using local", name, exc)
        return super().url(name)

    def delete(self, name):
        """
        Remove the local copy AND the object in Supabase.

        FileSystemStorage.delete() only knows about the local file, so without
        this every deletion left the uploaded object behind — the bucket keeps
        paying for bytes nothing can reach any more. Supabase failures are
        logged, not raised: the caller has already decided the file is gone, and
        an orphan there is better than a half-deleted record here.
        """
        if name and self._is_configured():
            try:
                self._s3_client().delete_object(
                    Bucket=settings.SUPABASE_STORAGE_BUCKET, Key=name,
                )
            except Exception as exc:
                logger.warning("Supabase delete failed for %s: %s", name, exc)

        cache.delete(f"supabase_sync:{name}")
        cache.delete(f"supabase_url:{name}")
        super().delete(name)

    # ── private helpers ───────────────────────────────────────────────────

    def _is_configured(self):
        return bool(
            getattr(settings, "SUPABASE_PROJECT_REF", "")
            and getattr(settings, "SUPABASE_S3_ACCESS_KEY_ID", "")
        )

    def _s3_client(self):
        import boto3

        return boto3.client(
            "s3",
            endpoint_url=(
                f"https://{settings.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3"
            ),
            aws_access_key_id=settings.SUPABASE_S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.SUPABASE_S3_SECRET_ACCESS_KEY,
            region_name=getattr(settings, "SUPABASE_REGION", "ap-southeast-1"),
        )

    def _upload(self, name):
        content_type, _ = mimetypes.guess_type(name)
        expiry = getattr(settings, "SUPABASE_URL_EXPIRY", 604800)
        with self.open(name, "rb") as f:
            self._s3_client().put_object(
                Bucket=settings.SUPABASE_STORAGE_BUCKET,
                Key=name,
                Body=f.read(),
                ContentType=content_type or "application/octet-stream",
                CacheControl=f"private, max-age={expiry}",
            )

    def _presigned_url(self, name):
        return self._s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.SUPABASE_STORAGE_BUCKET, "Key": name},
            ExpiresIn=getattr(settings, "SUPABASE_URL_EXPIRY", 3600),
        )
