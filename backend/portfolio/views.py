from django.conf import settings
from django.http import FileResponse, Http404, JsonResponse
from django.views.decorators.http import require_GET

from .models import Course, Experience, Profile, Project, SkillCategory, SoftSkill


@require_GET
def portfolio_api(request):
    profile = Profile.objects.first()
    project_data = [
        {
            'id': project.pk,
            'name': project.display_name,
            'description': project.description,
            'languages': [item.strip() for item in project.languages.split(',') if item.strip()],
            'repo': project.repo_full_name,
            'color': project.color,
        }
        for project in Project.objects.filter(visible=True)
    ]
    experience = [
        {
            'id': entry.pk,
            'role': entry.title,
            'org': entry.organisation,
            'period': f'{entry.start_date} – {entry.end_date or "Present"}',
            'startDate': entry.start_date,
            'endDate': entry.end_date,
            'summary': entry.summary,
            'details': [line.strip() for line in entry.details.splitlines() if line.strip()],
            'description': entry.details,
            'location': entry.location,
        }
        for entry in Experience.objects.filter(visible=True)
    ]
    categories = [
        {
            'id': category.pk,
            'title': category.name,
            'kind': 'tech',
            'color': category.color,
            'items': [skill.name for skill in category.skills.all()],
            'skills': [{'id': skill.pk, 'name': skill.name} for skill in category.skills.all()],
        }
        for category in SkillCategory.objects.prefetch_related('skills')
    ]
    courses = {
        year: [
            {
                'id': course.pk,
                'code': course.code,
                'name': course.name,
                'tags': course.tags,
                'projects': [
                    {'id': project.pk, 'name': project.display_name}
                    for project in course.projects.all()
                ],
            }
            for course in Course.objects.filter(year=year).prefetch_related('projects')
        ]
        for year in ('y1', 'y2', 'y3')
    }

    return JsonResponse(
        {
            'site': {
                'name': profile.name if profile else '',
                'headline': profile.headline if profile else '',
                'bio': profile.bio if profile else '',
                'avatar': '',
                'specialisation': [],
                'graduation': {'date': '', 'school': ''},
                'github': {'user': '', 'url': ''},
                'linkedin': '',
            },
            'courses': courses,
            'years': ['y1', 'y2', 'y3'],
            'projects': project_data,
            'techSkills': categories,
            'softSkills': [
                {
                    'id': skill.pk,
                    'title': skill.name,
                    'blurb': skill.description,
                }
                for skill in SoftSkill.objects.all()
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
