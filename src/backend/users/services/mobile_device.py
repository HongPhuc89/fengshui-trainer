"""Resolving and gating mobile device bindings (feature-34 §7.4)."""


def resolve_mobile_device(user, device_id: str, hardware_hash: str | None):
    """
    Find the mobile device row this login belongs to.

    Returns (device, outcome) where outcome is one of:
      'existing'  — same client id; a plain re-login, revoked rows included.
      'rebound'   — client id was lost (app reinstall) but the hardware anchor
                    matches, so this is the same physical device: adopt the new
                    device_id in place and keep client_code untouched.
      'new'       — neither matched; a different handset, so the caller must
                    demand an activation key.

    Status is deliberately not filtered: a revoked row for this very device must
    be reactivated rather than duplicated, otherwise logging back in after an
    admin unbind would look like a device change and need a key.
    """
    owned = user.mobile_devices.all()

    device = owned.filter(device_id=device_id).first()
    if device is not None:
        # A matching client id with a different anchor means the id was cloned
        # onto another handset (restored backup / synced Keychain). Not the same
        # device — fall through so an activation key is required.
        if hardware_hash and device.hardware_hash and device.hardware_hash != hardware_hash:
            return None, 'new'
        return device, 'existing'

    if hardware_hash:
        device = owned.filter(hardware_hash=hardware_hash).first()
        if device is not None:
            device.device_id = device_id  # client_code stays as it was
            return device, 'rebound'

    return None, 'new'


def requires_activation(user, device) -> bool:
    """
    True when binding `device` would displace a DIFFERENT handset that is still
    bound — the one and only situation that needs a staff-issued key.

    Deliberately shared by both mobile endpoints so their gates cannot drift:
    whatever login refuses is exactly what activate accepts, and vice versa.
    `device is None` means a handset never seen before.
    """
    active = user.mobile_devices.filter(status='ACTIVE').first()
    return active is not None and (device is None or active.pk != device.pk)
