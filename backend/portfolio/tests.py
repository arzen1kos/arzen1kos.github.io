import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Course, Experience, Profile, Project, Skill, SkillCategory


class PortfolioApiTests(TestCase):
    def test_empty_database_returns_empty_content_without_sample_records(self):
        response = self.client.get(reverse('portfolio-api'))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data['site']['name'] or None)
        self.assertEqual(data['projects'], [])
        self.assertEqual(data['experience'], [])
        self.assertTrue(all(not courses for courses in data['courses'].values()))
        self.assertEqual(data['techSkills'], [])
        self.assertEqual(data['softSkills'], [])

    def test_api_serializes_database_records_and_course_project_relationships(self):
        Profile.objects.create(
            name='Portfolio Owner',
            photo_url='https://example.com/profile.png',
            specialisations=['Engineering'],
        )
        category = SkillCategory.objects.create(name='Languages', kind=SkillCategory.Kind.TECH)
        Skill.objects.create(category=category, name='Python')
        soft_category = SkillCategory.objects.create(name='Communication', kind=SkillCategory.Kind.SOFT)
        Skill.objects.create(category=soft_category, name='Writing', description='Clear writing.')
        project = Project.objects.create(
            title='Sample Project',
            one_liner='A project summary.',
            content='Full project details.',
            github_url='https://github.com/example/project',
            github_available=True,
            languages=['Python'],
            tags=['API'],
            images=[{'url': 'https://example.com/image.png', 'alt': 'Screenshot'}],
        )
        course = Course.objects.create(code='COURSE-1', name='Course name', year=Course.Year.YEAR_1)
        course.projects.add(project)
        Experience.objects.create(
            role='Developer',
            company='Example',
            start_year=2024,
            description='Built a useful application.',
        )

        response = self.client.get(reverse('portfolio-api'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['site']['name'], 'Portfolio Owner')
        self.assertEqual(data['techSkills'][0]['items'], ['Python'])
        self.assertEqual(data['softSkills'][0]['blurb'], 'Clear writing.')
        self.assertEqual(data['projects'][0]['fullPageContent'], 'Full project details.')
        self.assertEqual(data['projects'][0]['images'][0]['alt'], 'Screenshot')
        self.assertEqual(data['courses']['y1'][0]['projects'][0]['name'], 'Sample Project')
        self.assertEqual(data['experience'][0]['period'], '2024 – Present')

    def test_content_endpoint_is_read_only(self):
        response = self.client.post(reverse('portfolio-api'), data=json.dumps({}), content_type='application/json')
        self.assertEqual(response.status_code, 405)

    def test_session_api_and_authenticated_admin_crud(self):
        anonymous = self.client.get(reverse('session-api')).json()
        self.assertFalse(anonymous['authenticated'])

        self.client.get(reverse('admin:index'))
        self.assertRedirects(
            self.client.get(reverse('admin:portfolio_project_add')),
            f'{reverse("admin:login")}?next={reverse("admin:portfolio_project_add")}',
            fetch_redirect_response=False,
        )
        get_user_model().objects.create_superuser(username='editor', password='test-password')
        self.assertTrue(self.client.login(username='editor', password='test-password'))
        authenticated = self.client.get(reverse('session-api')).json()
        self.assertTrue(authenticated['authenticated'])
        self.assertEqual(authenticated['username'], 'editor')

        project_add_url = reverse('admin:portfolio_project_add')
        response = self.client.get(project_add_url)
        self.assertEqual(response.status_code, 200)
        response = self.client.post(
            project_add_url,
            {
                'title': 'Created in Django Admin',
                'one_liner': 'Editable portfolio content.',
                'content': '',
                'github_url': '',
                'github_available': 'False',
                'demo_url': '',
                'demo_available': 'False',
                'logo_url': '',
                'languages': '[]',
                'tags': '[]',
                'images': '[]',
                'position': '0',
                'projects': [],
                '_save': 'Save',
            },
        )
        self.assertEqual(response.status_code, 302)
        project = Project.objects.get(title='Created in Django Admin')
        api_projects = self.client.get(reverse('portfolio-api')).json()['projects']
        self.assertEqual(api_projects[0]['name'], 'Created in Django Admin')

        change_url = reverse('admin:portfolio_project_change', args=[project.pk])
        changed_data = {
            'title': 'Updated in Django Admin',
            'one_liner': 'Updated content.',
            'content': '',
            'github_url': '',
            'github_available': 'False',
            'demo_url': '',
            'demo_available': 'False',
            'logo_url': '',
            'languages': '[]',
            'tags': '[]',
            'images': '[]',
            'position': '0',
            '_save': 'Save',
        }
        response = self.client.post(change_url, changed_data)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Project.objects.filter(title='Updated in Django Admin').exists())

        delete_url = reverse('admin:portfolio_project_delete', args=[project.pk])
        response = self.client.post(delete_url, {'post': 'yes'})
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Project.objects.filter(pk=project.pk).exists())
