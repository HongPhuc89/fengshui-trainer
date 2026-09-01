"""Shared test helpers."""

from unittest.mock import patch

from rest_framework.throttling import SimpleRateThrottle

# Throttle history lives in the shared Redis cache, so a dev machine can start a
# run already rate-limited, and a long run exhausts the hourly budget on its own.
# Patch the ceilings rather than flushing the cache and wiping developer data.
#
# override_settings(REST_FRAMEWORK=...) does not work here: THROTTLE_RATES is a
# class attribute bound at import time, so the setting is read long before any
# test runs.
no_throttling = patch.object(
    SimpleRateThrottle,
    'THROTTLE_RATES',
    {scope: '100000/hour' for scope in SimpleRateThrottle.THROTTLE_RATES},
)
