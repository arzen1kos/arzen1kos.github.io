from django.contrib import admin

from .models import Course, Experience, Profile, Project, Skill, SkillCategory


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'github_username', 'graduation_school')
    fieldsets = (
        ('Profile', {'fields': ('name', 'photo_url', 'specialisations')}),
        ('Social links', {'fields': ('linkedin_url', 'github_url', 'github_username')}),
        ('Education', {'fields': ('graduation_date', 'graduation_school')}),
    )

    def has_add_permission(self, request):
        return not Profile.objects.exists()


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'kind', 'position')
    list_filter = ('kind',)
    search_fields = ('name', 'skills__name')
    inlines = (SkillInline,)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'position')
    list_filter = ('category__kind', 'category')
    search_fields = ('name', 'description', 'category__name')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'github_available', 'demo_available', 'position')
    list_filter = ('github_available', 'demo_available')
    search_fields = ('title', 'one_liner', 'content')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'year', 'position')
    list_filter = ('year',)
    search_fields = ('code', 'name', 'description')
    filter_horizontal = ('projects',)


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ('role', 'company', 'start_year', 'end_year', 'position')
    list_filter = ('company',)
    search_fields = ('role', 'company', 'description')
