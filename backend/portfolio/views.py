from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.views.decorators.http import require_GET

from .models import Course, Experience, Profile, Project, SkillCategory


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
            'id': category.pk,
            'title': category.name,
            'kind': category.kind,
            'color': category.color,
            'items': [skill.name for skill in category.skills.all()],
            'skills': [
                {
                    'id': skill.pk,
                    'name': skill.name,
                    'description': skill.description,
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
                'role': entry.role,
                'org': entry.company,
                'period': period,
                'startYear': entry.start_year,
                'endYear': entry.end_year,
                'summary': description_lines[0] if description_lines else '',
                'details': description_lines,
                'description': entry.description,
                'tags': entry.tags,
            }
        )

    return JsonResponse(
        {
            'site': {
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
            },
            'courses': courses,
            'years': [year for year, _ in Course.Year.choices],
            'projects': project_data,
            'techSkills': [item for item in skill_categories if item['kind'] == SkillCategory.Kind.TECH],
            'softSkills': [
                {
                    'id': skill['id'],
                    'title': skill['name'],
                    'blurb': skill['description'],
                }
                for category in skill_categories
                if category['kind'] == SkillCategory.Kind.SOFT
                for skill in category['skills']
            ],
            'experience': experience,
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
