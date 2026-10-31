from pathlib import Path

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TestCase
from django.urls import reverse

from .models import Course, CourseProject, Experience, Profile, Project, Skill, SkillCategory


def install_content_schema():
    schema_path = Path(__file__).resolve().parents[1] / 'db' / 'schema.sql'
    connection.ensure_connection()
    connection.connection.executescript(schema_path.read_text(encoding='utf-8'))


class SharedPortfolioDatabaseTests(TestCase):
    @classmethod
    def setUpClass(cls):
        install_content_schema()
        super().setUpClass()

    def test_portfolio_api_reads_the_shared_content_tables(self):
        Profile.objects.create(name='Portfolio Owner', headline='Software developer', bio='Builds software.')
        category = SkillCategory.objects.create(name='Languages', color='#4cc9f0')
        Skill.objects.create(category=category, name='Python')
        Experience.objects.create(
            title='Developer',
            organisation='Example',
            start_date='2025-01',
            summary='Built an application.',
            details='Designed the API.\nAdded tests.',
        )
        Project.objects.create(
            display_name='Portfolio project',
            repo_full_name='owner/repository',
            languages='Python, Django',
        )
        course = Course.objects.create(code='CS101', name='Foundations', tags=['python'], year='y1')
        course.projects.add(Project.objects.get(repo_full_name='owner/repository'))

        response = self.client.get(reverse('portfolio-api'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['site']['name'], 'Portfolio Owner')
        self.assertEqual(data['techSkills'][0]['items'], ['Python'])
        self.assertEqual(data['experience'][0]['details'], ['Designed the API.', 'Added tests.'])
        self.assertEqual(data['projects'][0]['name'], 'Portfolio project')
        self.assertEqual(data['projects'][0]['languages'], ['Python', 'Django'])
        self.assertEqual(data['courses']['y1'][0]['code'], 'CS101')
        self.assertEqual(data['courses']['y1'][0]['projects'][0]['name'], 'Portfolio project')
        self.assertEqual(data['courses']['y2'], [])
        self.assertEqual(data['courses']['y3'], [])

    def test_django_admin_can_create_courses_and_associate_projects(self):
        get_user_model().objects.create_superuser(username='editor', password='test-password')
        self.client.login(username='editor', password='test-password')
        project = Project.objects.create(display_name='Course project')

        response = self.client.post(
            reverse('admin:portfolio_course_add'),
            {
                'code': 'CS101',
                'name': 'Foundations',
                'tags': '["python"]',
                'year': 'y1',
                'sort_order': '0',
                'courseproject_set-TOTAL_FORMS': '1',
                'courseproject_set-INITIAL_FORMS': '0',
                'courseproject_set-MIN_NUM_FORMS': '0',
                'courseproject_set-MAX_NUM_FORMS': '1000',
                'courseproject_set-0-project': str(project.pk),
                'courseproject_set-0-DELETE': '',
                '_save': 'Save',
            },
        )

        self.assertEqual(response.status_code, 302)
        course = Course.objects.get(code='CS101')
        self.assertEqual(list(course.projects.values_list('pk', flat=True)), [project.pk])

    def test_django_admin_can_create_shared_project_records(self):
        get_user_model().objects.create_superuser(username='editor', password='test-password')
        self.assertTrue(self.client.login(username='editor', password='test-password'))

        response = self.client.post(
            reverse('admin:portfolio_project_add'),
            {
                'repo_full_name': 'owner/repository',
                'display_name': 'Custom project title',
                'description': 'Project description.',
                'languages': 'TypeScript, React',
                'color': '#2e7d32',
                'sort_order': '0',
                'visible': 'on',
                '_save': 'Save',
            },
        )

        self.assertEqual(response.status_code, 302)
        project = Project.objects.get(repo_full_name='owner/repository')
        self.assertEqual(project.display_name, 'Custom project title')
        self.assertTrue(project.visible)

    def test_session_api_and_read_only_content_api(self):
        self.assertFalse(self.client.get(reverse('session-api')).json()['authenticated'])
        self.assertEqual(self.client.post(reverse('portfolio-api')).status_code, 405)
