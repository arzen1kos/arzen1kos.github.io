from django.contrib import admin
from .models import Course, CourseProject, Experience, Profile, Project, Skill, SkillCategory, SoftSkill


class SkillInline(admin.TabularInline):
    model = Skill
    extra = 1


class CourseProjectInline(admin.TabularInline):
    model = CourseProject
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'year', 'sort_order')
    list_filter = ('year',)
    inlines = [CourseProjectInline]


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'sort_order')
    inlines = [SkillInline]


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ('title', 'organisation', 'start_date', 'end_date', 'visible', 'sort_order')
    list_editable = ('visible', 'sort_order')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'repo_full_name', 'languages', 'visible', 'sort_order')
    list_editable = ('visible', 'sort_order')


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not Profile.objects.exists()   # schema allows exactly one row (id = 1)

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(SoftSkill)
