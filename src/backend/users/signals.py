import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import User, AdminAuditLog, UserDevice

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=User)
def capture_user_state(sender, instance, **kwargs):
    """
    Capture the state of the user before saving it to compare changes.
    """
    if instance.pk:
        try:
            old_instance = User.objects.get(pk=instance.pk)
            instance._old_state = old_instance
        except User.DoesNotExist:
            instance._old_state = None
    else:
        instance._old_state = None

@receiver(post_save, sender=User)
def log_user_changes(sender, instance, created, **kwargs):
    """
    Log sensitive changes such as user_type (VIP status) via AdminAuditLog.
    """
    if created or not hasattr(instance, '_old_state') or not instance._old_state:
        return

    old_instance = instance._old_state
    
    # Check for VIP upgrade/downgrade
    if old_instance.user_type != instance.user_type:
        # Assuming we might not have a request object context in a signal, 
        # we log System as the staff if unknown. A middleware could set ThreadLocal staff.
        # For simplicity, we just log the change.
        change_log = {
            'before': {'user_type': old_instance.user_type},
            'after': {'user_type': instance.user_type}
        }
        
        # We attempt to get user from thread locals if possible
        from .middleware import get_current_request
        request = get_current_request()
        staff = request.user if request and hasattr(request, 'user') and request.user.is_authenticated else None
        
        AdminAuditLog.objects.create(
            staff=staff,
            target_user=instance,
            action_category='VIP_MANAGEMENT',
            action_detail=f"Changed user_type from {old_instance.user_type} to {instance.user_type}",
            change_log=change_log,
            ip_address=request.META.get('REMOTE_ADDR') if request else None
        )


@receiver(post_save, sender=UserDevice)
def on_device_created(sender, instance, created, **kwargs):
    """Trigger async geo fetch when a new device is registered."""
    if created and instance.last_ip:
        from users.tasks import trigger_geo_fetch
        trigger_geo_fetch(instance.pk)
