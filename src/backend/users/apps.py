from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self):
        import users.signals
        self._register_admin_stats_url()

    def _register_admin_stats_url(self):
        """
        Monkey-patch AdminSite.get_urls to inject the activity dashboard URL.
        Guard against double-patching (e.g. when Django reloads in dev mode).
        """
        from django.contrib import admin

        if getattr(admin.site.__class__, '_stats_url_patched', False):
            return

        original_get_urls = admin.site.__class__.get_urls

        def patched_get_urls(self):
            from django.urls import path
            from users.admin_views import ActivityDashboardView

            custom = [
                path(
                    'stats/activity/',
                    self.admin_view(ActivityDashboardView.as_view()),
                    name='admin-stats-activity',
                ),
            ]
            return custom + original_get_urls(self)

        admin.site.__class__.get_urls = patched_get_urls
        admin.site.__class__._stats_url_patched = True
