from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponse
from django.template.loader import render_to_string


def _is_api(request):
    return request.path.startswith('/api/')


def handler404(request, exception=None):
    if _is_api(request):
        return JsonResponse({'error': 'Ressource introuvable.'}, status=404)
    return HttpResponse(render_to_string('404.html'), status=404)


def handler500(request):
    if _is_api(request):
        return JsonResponse({'error': 'Erreur interne du serveur.'}, status=500)
    return HttpResponse(render_to_string('500.html'), status=500)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
