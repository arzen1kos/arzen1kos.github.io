from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
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
    name = models.CharField(max_length=120, blank=True)
    photo_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)
    github_username = models.CharField(max_length=80, blank=True)
    specialisations = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON list of specialisation labels.',
        validators=[validate_string_list],
    )
    graduation_date = models.CharField(max_length=120, blank=True)
    graduation_school = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = 'profile'
        verbose_name_plural = 'profile'

    def __str__(self):
        return self.name or 'Portfolio profile'


class SkillCategory(models.Model):
    class Kind(models.TextChoices):
        TECH = 'tech', 'Tech'
        SOFT = 'soft', 'Soft'

    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=8, choices=Kind.choices, default=Kind.TECH)
    color = models.CharField(max_length=20, blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('position', 'name')
        verbose_name_plural = 'skill categories'

    def __str__(self):
        return f'{self.name} ({self.get_kind_display()})'


class Skill(models.Model):
    category = models.ForeignKey(SkillCategory, related_name='skills', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon_url = models.URLField(blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('position', 'name')

    def __str__(self):
        return self.name


class Project(models.Model):
    title = models.CharField(max_length=160)
    one_liner = models.CharField(max_length=280, blank=True)
    content = models.TextField(blank=True, help_text='Full project page content.')
    github_url = models.URLField(blank=True)
    github_available = models.BooleanField(default=False)
    demo_url = models.URLField(blank=True)
    demo_available = models.BooleanField(default=False)
    logo_url = models.URLField(blank=True)
    languages = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON list of languages or technologies.',
        validators=[validate_string_list],
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON list of project tags.',
        validators=[validate_string_list],
    )
    images = models.JSONField(
        default=list,
        blank=True,
        help_text='List of image URLs, or objects containing "url" and optional "alt".',
        validators=[validate_project_images],
    )
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('position', 'title')

    def clean(self):
        errors = {}
        if self.github_available and not self.github_url:
            errors['github_url'] = 'A GitHub URL is required when the link is marked available.'
        if self.demo_available and not self.demo_url:
            errors['demo_url'] = 'A demo URL is required when the link is marked available.'
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.title


class Course(models.Model):
    class Year(models.TextChoices):
        YEAR_1 = 'y1', 'Year 1'
        YEAR_2 = 'y2', 'Year 2'
        YEAR_3 = 'y3', 'Year 3'

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    year = models.CharField(max_length=2, choices=Year.choices)
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON list of course tags.',
        validators=[validate_string_list],
    )
    projects = models.ManyToManyField(Project, related_name='courses', blank=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('year', 'position', 'code')

    def __str__(self):
        return f'{self.code} — {self.name}'


class Experience(models.Model):
    mountain = models.ForeignKey(
        'ExperienceMountain',
        related_name='experiences',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=160)
    company = models.CharField(max_length=160)
    start_year = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1900), MaxValueValidator(2200)]
    )
    start_month = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    end_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1900), MaxValueValidator(2200)],
        help_text='Leave blank for a current role.',
    )
    end_month = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    location = models.CharField(max_length=160, blank=True)
    description = models.TextField(blank=True)
    highlights = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON list of experience highlights.',
        validators=[validate_string_list],
    )
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text='JSON list of experience tags.',
        validators=[validate_string_list],
    )
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('position', '-start_year')

    def clean(self):
        if self.end_year is not None and self.end_year < self.start_year:
            raise ValidationError({'end_year': 'The end year must be the same as or later than the start year.'})

    def __str__(self):
        return f'{self.role} — {self.company}'


class ExperienceMountain(models.Model):
    name = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=240, blank=True)
    angle_degrees = models.FloatField(default=35)
    distance = models.FloatField(default=0, help_text='World-space distance from the city center.')
    radius = models.FloatField(default=11, validators=[MinValueValidator(1)])
    height = models.FloatField(default=10, validators=[MinValueValidator(1)])
    seed = models.PositiveIntegerField(default=17)
    color = models.CharField(max_length=20, default='#17665b')
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('position', 'name')

    def __str__(self):
        return self.name


class CityIsland(models.Model):
    class Kind(models.TextChoices):
        PROJECTS = 'projects', 'Projects'
        COURSES = 'courses', 'Courses'
        EXPERIENCE = 'experience', 'Experience'

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=16, choices=Kind.choices)
    subtitle = models.CharField(max_length=240, blank=True)
    x = models.FloatField(default=0)
    y = models.FloatField(default=0)
    z = models.FloatField(default=0)
    grid_rings = models.PositiveSmallIntegerField(default=1)
    scale = models.FloatField(default=1, validators=[MinValueValidator(0.1)])
    rotation_speed = models.FloatField(default=0.45)
    color = models.CharField(max_length=20, default='#2dd4bf')
    position = models.PositiveIntegerField(default=0)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ('position', 'name')

    def __str__(self):
        return self.name


class CityTerrain(models.Model):
    center_latitude = models.FloatField(default=-43.55)
    center_longitude = models.FloatField(default=172.66)
    radius_km = models.FloatField(default=18, validators=[MinValueValidator(1)])
    samples_per_side = models.PositiveSmallIntegerField(
        default=21,
        validators=[MinValueValidator(3), MaxValueValidator(21)],
        help_text='Google Elevation API permits at most 512 points per request.',
    )
    elevation_grid = models.JSONField(default=list, blank=True)
    elevations_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'city terrain settings'
        verbose_name_plural = 'city terrain settings'

    def __str__(self):
        return 'Christchurch terrain'
