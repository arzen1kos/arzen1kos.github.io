import json
import logging
import math
import os
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from .models import (
    CityIsland,
    CityTerrain,
    Course,
    Experience,
    ExperienceMountain,
    Profile,
    Project,
    SkillCategory,
)

logger = logging.getLogger(__name__)


def _project_data(project):
    images = []
    for image in project.images:
        if isinstance(image, str):
            images.append({'url': image, 'alt': ''})
        elif isinstance(image, dict) and isinstance(image.get('url'), str):
            images.append({'url': image['url'], 'alt': str(image.get('alt', ''))})

    return {
        'id': project.pk,
        'name': project.title,
        'description': project.one_liner,
        'fullPageContent': project.content,
        'logo': project.logo_url,
        'languages': project.languages,
        'tags': project.tags,
        'images': images,
        'repo': project.github_url,
        'live': project.demo_available,
        'url': project.demo_url,
        'githubAvailable': project.github_available,
    }


@require_GET
def portfolio_api(request):
    profile = Profile.objects.first()
    project_data = [_project_data(project) for project in Project.objects.all()]
    projects_by_id = {project['id']: project for project in project_data}

    courses = {
        year: [
            {
                'code': course.code,
                'name': course.name,
                'description': course.description,
                'tags': course.tags,
                'projects': [
                    projects_by_id[project.pk]
                    for project in course.projects.all()
                    if project.pk in projects_by_id
                ],
            }
            for course in Course.objects.filter(year=year).prefetch_related('projects')
        ]
        for year, _ in Course.Year.choices
    }

    skill_categories = [
        {
            'id': str(category.pk),
            'title': category.name,
            'kind': category.kind,
            'color': category.color,
            'items': [skill.name for skill in category.skills.all()],
            'skills': [
                {
                    'id': str(skill.pk),
                    'name': skill.name,
                    'description': skill.description,
                    'iconUrl': skill.icon_url or None,
                }
                for skill in category.skills.all()
            ],
        }
        for category in SkillCategory.objects.prefetch_related('skills')
    ]

    experience = []
    for entry in Experience.objects.all():
        period = f'{entry.start_year} – {entry.end_year if entry.end_year else "Present"}'
        description_lines = [line.strip() for line in entry.description.splitlines() if line.strip()]
        experience.append(
            {
                'id': entry.pk,
                'title': entry.role,
                'role': entry.role,
                'organisation': entry.company,
                'org': entry.company,
                'period': period,
                'startYear': entry.start_year,
                'endYear': entry.end_year,
                'startDate': f'{entry.start_year:04d}-{entry.start_month:02d}-01',
                'endDate': (
                    f'{entry.end_year:04d}-{(entry.end_month or 12):02d}-01'
                    if entry.end_year
                    else None
                ),
                'location': entry.location,
                'summary': description_lines[0] if description_lines else '',
                'details': description_lines,
                'descriptionText': entry.description,
                'description': entry.description,
                'tags': entry.tags,
                'highlights': entry.highlights,
                'mountainId': entry.mountain_id,
            }
        )

    profile_data = {
        'name': profile.name if profile else '',
        'avatar': profile.photo_url if profile else '',
        'specialisation': profile.specialisations if profile else [],
        'graduation': {
            'date': profile.graduation_date if profile else '',
            'school': profile.graduation_school if profile else '',
        },
        'github': {
            'user': profile.github_username if profile else '',
            'url': profile.github_url if profile else '',
        },
        'linkedin': profile.linkedin_url if profile else '',
    }

    tech_categories = SkillCategory.objects.filter(
        kind=SkillCategory.Kind.TECH
    ).prefetch_related('skills')
    categories = [
        {
            'id': str(category.pk),
            'name': category.name,
            'color': category.color or '#2dd4bf',
            'scale': 1,
            'items': [
                {
                    'id': str(skill.pk),
                    'name': skill.name,
                    'iconUrl': skill.icon_url or None,
                }
                for skill in category.skills.all()
            ],
        }
        for category in tech_categories
    ]

    experience_mountains = [
        {
            'id': str(mountain.pk),
            'name': mountain.name,
            'subtitle': mountain.subtitle,
            'angleDegrees': mountain.angle_degrees,
            'distance': mountain.distance,
            'radius': mountain.radius,
            'height': mountain.height,
            'seed': mountain.seed,
            'color': mountain.color,
            'entries': [entry for entry in experience if entry['mountainId'] == mountain.pk],
        }
        for mountain in ExperienceMountain.objects.all()
    ]
    islands = [
        {
            'id': island.pk,
            'slug': island.slug,
            'name': island.name,
            'kind': island.kind,
            'subtitle': island.subtitle,
            'position': [island.x, island.y, island.z],
            'rings': island.grid_rings,
            'scale': island.scale,
            'rotationSpeed': island.rotation_speed,
            'color': island.color,
        }
        for island in CityIsland.objects.filter(enabled=True)
    ]

    return JsonResponse(
        {
            'site': profile_data,
            'profile': {
                'name': profile_data['name'],
                'username': profile.github_username if profile else '',
                'githubUrl': profile.github_url if profile else '',
                'avatarUrl': profile.photo_url if profile else '',
                'headline': ' · '.join(profile.specialisations) if profile else '',
                'linkedinUrl': profile.linkedin_url if profile else '',
                'graduationDate': profile.graduation_date if profile else '',
                'graduationSchool': profile.graduation_school if profile else '',
            },
            'categories': categories,
            'islands': islands,
            'mountains': experience_mountains,
            'experienceMountains': experience_mountains,
            'courses': courses,
            'years': [year for year, _ in Course.Year.choices],
            'projects': project_data,
            'techSkills': [item for item in skill_categories if item['kind'] == SkillCategory.Kind.TECH],
            'softSkills': [
                {
                    'id': skill['id'],
                    'title': skill['name'],
                    'blurb': skill['description'],
                    'iconUrl': skill['iconUrl'],
                }
                for category in skill_categories
                if category['kind'] == SkillCategory.Kind.SOFT
                for skill in category['skills']
            ],
            'experience': experience,
            'experiences': experience,
        }
    )


def _google_elevation_grid(terrain):
    side = terrain.samples_per_side
    latitude_step = terrain.radius_km / 111.32 / (side // 2)
    longitude_scale = max(math.cos(math.radians(terrain.center_latitude)), 0.01)
    longitude_step = terrain.radius_km / (111.32 * longitude_scale) / (side // 2)
    coordinates = [
        (
            terrain.center_latitude + (row - side // 2) * latitude_step,
            terrain.center_longitude + (column - side // 2) * longitude_step,
        )
        for row in range(side)
        for column in range(side)
    ]
    locations = '|'.join(f'{latitude:.6f},{longitude:.6f}' for latitude, longitude in coordinates)
    url = 'https://maps.googleapis.com/maps/api/elevation/json?' + urlencode(
        {'locations': locations, 'key': os.environ['GOOGLE_MAPS_API_KEY']}
    )
    request = Request(url, headers={'User-Agent': 'portfolio-city/1.0'})
    with urlopen(request, timeout=20) as response:
        body = json.loads(response.read())

    if body.get('status') != 'OK':
        raise ValueError(f"Google Elevation API returned {body.get('status', 'an unknown status')}.")
    results = body.get('results', [])
    if len(results) != side * side:
        raise ValueError(f'Google Elevation API returned {len(results)} of {side * side} terrain samples.')
    return [float(result['elevation']) for result in results]


def _terrain_data():
    terrain = CityTerrain.objects.order_by('pk').first()
    if terrain is None:
        terrain = CityTerrain.objects.create(pk=1)

    now = timezone.now()
    cache_is_fresh = (
        terrain.elevation_grid
        and terrain.elevations_updated_at
        and terrain.elevations_updated_at >= now - timedelta(days=27)
    )
    warning = None
    source = 'procedural'

    if os.environ.get('GOOGLE_MAPS_API_KEY'):
        if not cache_is_fresh:
            try:
                terrain.elevation_grid = _google_elevation_grid(terrain)
                terrain.elevations_updated_at = now
                terrain.save(update_fields=('elevation_grid', 'elevations_updated_at'))
            except (HTTPError, URLError, TimeoutError, ValueError, KeyError, json.JSONDecodeError) as error:
                logger.warning('Google Elevation API request failed: %s', error)
                warning = f'Google Elevation data could not be loaded: {error}'
        if terrain.elevation_grid and terrain.elevations_updated_at:
            source = 'google-elevation'
    elif cache_is_fresh:
        source = 'google-elevation'

    if source == 'procedural' and warning is None:
        warning = 'Procedural Port Hills terrain. Configure GOOGLE_MAPS_API_KEY for Google elevation data.'

    return {
        'center': [terrain.center_latitude, terrain.center_longitude],
        'radiusKm': terrain.radius_km,
        'samplesPerSide': terrain.samples_per_side,
        'elevations': terrain.elevation_grid if source == 'google-elevation' else [],
        'source': source,
        'warning': warning,
    }


@require_GET
def city_api(request):
    portfolio_request = portfolio_api(request)
    return JsonResponse(
        {
            'portfolio': json.loads(portfolio_request.content),
            'terrain': _terrain_data(),
        }
    )


@require_GET
def session_api(request):
    return JsonResponse(
        {
            'authenticated': request.user.is_authenticated,
            'username': request.user.get_username() if request.user.is_authenticated else None,
            'adminUrl': '/admin/',
            'loginUrl': '/admin/login/?next=/admin/',
        }
    )


def frontend(request):
    root = (settings.REPO_ROOT / 'dist').resolve()
    if not root.is_dir():
        return JsonResponse(
            {'detail': 'Frontend build not found. Run "npm run build" first.'},
            status=503,
        )

    relative_path = request.path.lstrip('/')
    candidate = (root / relative_path).resolve()
    if not candidate.is_relative_to(root):
        raise Http404
    if candidate.is_dir():
        candidate = candidate / 'index.html'
    if not candidate.is_file():
        candidate = root / 'index.html'
    if not candidate.is_file():
        raise Http404

    content_type = 'text/html' if candidate.suffix == '.html' else None
    return FileResponse(candidate.open('rb'), content_type=content_type)
