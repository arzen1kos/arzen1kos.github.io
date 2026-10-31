"""Unmanaged Django models over the shared backend/db/portfolio.db database."""
from django.core.exceptions import ValidationError
from django.db import models


def validate_string_list(value):
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ValidationError('Enter a JSON list of strings.')


def validate_project_images(value):
    if not isinstance(value, list):
        raise ValidationError('Enter a JSON list of image URLs or image objects.')
    for image in value:
        if isinstance(image, str):
            continue
        if (
            not isinstance(image, dict)
            or not isinstance(image.get('url'), str)
            or not isinstance(image.get('alt', ''), str)
        ):
            raise ValidationError('Each image must be a URL string or an object with string "url" and "alt" values.')


class Profile(models.Model):
    name = models.CharField(max_length=200)
    headline = models.CharField(max_length=300, blank=True, default='')
    bio = models.TextField(blank=True, default='')

    class Meta:
        managed = False
        db_table = 'profile'

    def __str__(self):
        return self.name


class Experience(models.Model):
    title = models.CharField(max_length=300)
    organisation = models.CharField(max_length=300)
    location = models.CharField(max_length=200, blank=True, default='')
    start_date = models.CharField(max_length=7, help_text='YYYY-MM')
    end_date = models.CharField(max_length=7, blank=True, null=True, help_text='YYYY-MM, empty = current')
    summary = models.TextField(blank=True, default='')
    details = models.TextField(blank=True, default='', help_text='One bullet per line (expanded page).')
    sort_order = models.IntegerField(default=0)
    visible = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'experience'
        ordering = ['-start_date', 'sort_order']

    def __str__(self):
        return f'{self.title} @ {self.organisation}'


class SkillCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=9, default='#4cc9f0')
    sort_order = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'skill_category'
        ordering = ['sort_order', 'id']
        verbose_name_plural = 'skill categories'

    def __str__(self):
        return self.name


class Skill(models.Model):
    category = models.ForeignKey(SkillCategory, on_delete=models.CASCADE, db_column='category_id', related_name='skills')
    name = models.CharField(max_length=100)
    sort_order = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'skill'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.name


class SoftSkill(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    sort_order = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'soft_skill'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.name


class Project(models.Model):
    repo_full_name = models.CharField(
        max_length=200, blank=True, null=True,
        help_text="GitHub 'owner/repo'. Links this card to a repo (languages + public link).",
    )
    display_name = models.CharField(max_length=200, help_text='Name shown in the Projects panel only.')
    description = models.TextField(blank=True, default='', help_text='Empty = use the GitHub description.')
    languages = models.CharField(max_length=300, blank=True, default='', help_text='Comma separated. Empty = detect from the repo.')
    color = models.CharField(max_length=9, default='#2e7d32')
    sort_order = models.IntegerField(default=0)
    visible = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'project'
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.display_name


class Course(models.Model):
    YEAR_CHOICES = [('y1', 'Year 1'), ('y2', 'Year 2'), ('y3', 'Year 3')]

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    tags = models.JSONField(default=list, blank=True, validators=[validate_string_list])
    year = models.CharField(max_length=2, choices=YEAR_CHOICES)
    sort_order = models.IntegerField(default=0)
    projects = models.ManyToManyField(Project, through='CourseProject', related_name='courses')

    class Meta:
        managed = False
        db_table = 'course'
        ordering = ['year', 'sort_order', 'id']

    def __str__(self):
        return f'{self.code}: {self.name}'


class CourseProject(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, db_column='course_id')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, db_column='project_id')

    class Meta:
        managed = False
        db_table = 'course_project'
        unique_together = [('course', 'project')]

    def __str__(self):
        return f'{self.course} - {self.project}'
