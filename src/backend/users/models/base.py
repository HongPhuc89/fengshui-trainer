import uuid
from django.db import models

class BaseModel(models.Model):
    """
    Abstract base model to provide common fields for all system entities.
    - Private ID (id): Auto-increment Integer for internal DB joins and performance.
    - Public ID (public_id): UUID for external API exposure and security.
    """
    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
