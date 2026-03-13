# Generated for Feature 17: Admin Activity Dashboard — add indexes for revenue queries.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0002_alter_wallettransaction_transaction_type'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='wallettransaction',
            index=models.Index(
                fields=['created_at', 'transaction_type'],
                name='wt_created_type_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='voucher',
            index=models.Index(fields=['used_at'], name='voucher_used_at_idx'),
        ),
    ]
