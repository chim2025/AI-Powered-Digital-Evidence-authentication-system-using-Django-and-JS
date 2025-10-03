from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('validate/', views.validate_field, name='validate-field'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('analyze/', views.analyze_evidence, name='analyze_evidence'),
    path("get_process/", views.get_process, name="get_process"),
    path('process_metrics/', views.process_metrics_view, name='process_metrics'),
    path("get_enriched/", views.get_enriched, name="get_enriched"),
    path('analysis_results/list/', views.list_analysis_results, name='analysis_results_list'),
    path('analysis_results/get/<str:filename>/', views.get_analysis_result, name='get_analysis_result'),
]
