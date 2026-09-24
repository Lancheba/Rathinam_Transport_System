from django.urls import path
from .views import run_optimization_view, apply_optimization_view, optimization_results

urlpatterns = [
    path("run/", run_optimization_view, name="optimization-run"),
    path("apply/", apply_optimization_view, name="optimization-apply"),
    path("results/", optimization_results, name="optimization-results"),
]
