from django.contrib import admin
from django.urls import path, re_path

from portfolio.views import city_api, frontend, portfolio_api, session_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/portfolio/', portfolio_api, name='portfolio-api'),
    path('api/city/', city_api, name='city-api'),
    path('api/session/', session_api, name='session-api'),
    re_path(r'^(?!static/).*$', frontend, name='frontend'),
]
