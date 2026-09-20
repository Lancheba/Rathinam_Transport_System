from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('parking', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='parkingground',
            name='name',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='parkingground',
            name='length_m',
            field=models.DecimalField(decimal_places=2, max_digits=6),
        ),
        migrations.AlterField(
            model_name='parkingground',
            name='width_m',
            field=models.DecimalField(decimal_places=2, max_digits=6),
        ),
        migrations.AlterField(
            model_name='parkingground',
            name='entrance_width_m',
            field=models.DecimalField(decimal_places=2, max_digits=5),
        ),
        migrations.AlterField(
            model_name='parkingground',
            name='exit_width_m',
            field=models.DecimalField(decimal_places=2, max_digits=5),
        ),
        migrations.AlterField(
            model_name='parkingground',
            name='total_slots',
            field=models.PositiveIntegerField(),
        ),
    ]
