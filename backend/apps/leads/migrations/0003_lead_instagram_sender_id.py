from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leads', '0002_lead_leads_lead_stage_4b0a5d_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='lead',
            name='instagram_sender_id',
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
    ]
