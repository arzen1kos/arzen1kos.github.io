from django.db import migrations


def create_city_defaults(apps, schema_editor):
    CityIsland = apps.get_model('portfolio', 'CityIsland')
    CityTerrain = apps.get_model('portfolio', 'CityTerrain')
    ExperienceMountain = apps.get_model('portfolio', 'ExperienceMountain')

    CityIsland.objects.using(schema_editor.connection.alias).bulk_create(
        [
            CityIsland(
                slug='projects',
                name='Projects',
                kind='projects',
                x=-15,
                y=1,
                z=0,
                color='#2dd4bf',
                position=0,
            ),
            CityIsland(
                slug='courses',
                name='Courses',
                kind='courses',
                x=15,
                y=1,
                z=0,
                color='#60a5fa',
                position=1,
            ),
            CityIsland(
                slug='experience',
                name='Experience',
                kind='experience',
                x=0,
                y=1,
                z=17,
                color='#fbbf24',
                position=2,
            ),
        ],
        ignore_conflicts=True,
    )
    CityTerrain.objects.using(schema_editor.connection.alias).get_or_create(
        pk=1,
        defaults={
            'center_latitude': -43.55,
            'center_longitude': 172.66,
            'radius_km': 23,
            'samples_per_side': 21,
        },
    )
    mountain, _ = ExperienceMountain.objects.using(schema_editor.connection.alias).get_or_create(
        name='Port Hills',
        defaults={
            'subtitle': 'A trail through my professional experience',
            'angle_degrees': 35,
            'distance': 29,
            'radius': 14,
            'height': 9,
            'seed': 17,
            'position': 0,
        },
    )
    Experience = apps.get_model('portfolio', 'Experience')
    Experience.objects.using(schema_editor.connection.alias).filter(mountain__isnull=True).update(
        mountain_id=mountain.pk
    )


class Migration(migrations.Migration):
    dependencies = [
        ('portfolio', '0004_cityisland_cityterrain_experiencemountain_and_more'),
    ]

    operations = [
        migrations.RunPython(create_city_defaults, migrations.RunPython.noop),
    ]
