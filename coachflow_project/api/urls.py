from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('clients', views.ClientViewSet, basename='clients')
router.register('programmes', views.ProgrammeViewSet, basename='programmes')
router.register('seances', views.SeanceViewSet, basename='seances')
router.register('conversations', views.ConversationViewSet, basename='conversations')
router.register('factures', views.FactureViewSet, basename='factures')
router.register('alertes', views.AlerteViewSet, basename='alertes')
router.register('contrats', views.ContratViewSet, basename='contrats')
router.register('templates-messages', views.TemplateMessageViewSet, basename='templates-messages')
router.register('aliments', views.AlimentViewSet, basename='aliments')
router.register('recettes', views.RecetteViewSet, basename='recettes')
router.register('plans-alimentaires', views.PlanAlimentaireViewSet, basename='plans-alimentaires')
router.register('exercices', views.ExerciceViewSet, basename='exercices')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_view, name='login'),
    path('auth/register/', views.register_view, name='register'),
    path('auth/verify-email/', views.verify_email_view, name='verify-email'),
    path('auth/me/', views.me_view, name='me'),   # GET / PATCH / DELETE
    path('auth/onboarding-done/', views.onboarding_done_view, name='onboarding-done'),
    path('auth/google/', views.google_login_view, name='google-login'),
    path('auth/password-reset/', views.password_reset_request_view, name='password-reset-request'),
    path('auth/password-reset/confirm/', views.password_reset_confirm_view, name='password-reset-confirm'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('contrats/signer/<uuid:token>/', views.signer_contrat, name='signer-contrat'),
    path('portal/mesures/', views.portal_mesures, name='portal-mesures'),
    path('portal/dashboard/', views.portal_dashboard, name='portal-dashboard'),
    path('portal/seances/', views.portal_seances, name='portal-seances'),
    path('portal/conversation/', views.portal_conversation, name='portal-conversation'),
    path('portal/seances/<uuid:seance_id>/demander-annulation/', views.portal_demander_annulation, name='portal-demander-annulation'),
    path('portal/seances/<uuid:seance_id>/detail/', views.portal_seance_detail, name='portal-seance-detail'),
    path('portal/seances/<uuid:seance_id>/log/', views.portal_log_serie, name='portal-log-serie'),
    path('portal/seances/<uuid:seance_id>/log/<uuid:log_id>/', views.portal_delete_serie, name='portal-delete-serie'),
    path('portal/messages/unread/', views.portal_messages_unread, name='portal-messages-unread'),
    path('portal/photos/', views.portal_photos, name='portal-photos'),
    path('portal/photos/<uuid:photo_id>/', views.portal_photo_delete, name='portal-photo-delete'),
    path('portal/objectifs/<uuid:objectif_id>/', views.portal_objectif_update, name='portal-objectif-update'),
    path('nutrition/calculateur/', views.calculateur_calorique, name='calculateur-calorique'),
    path('clients/<uuid:client_id>/journal/', views.journal_coach, name='journal-coach'),
    path('portal/nutrition/plan/', views.portal_plan_actif, name='portal-plan-actif'),
    path('portal/nutrition/journal/', views.portal_journal, name='portal-journal'),
    path('portal/nutrition/courses/', views.portal_courses, name='portal-courses'),
    path('portal/nutrition/eau/', views.portal_eau, name='portal-eau'),
    path('portal/checkin/', views.portal_checkin, name='portal-checkin'),
    path('clients/<uuid:client_id>/checkins/', views.coach_checkins, name='coach-checkins'),
    path('clients/<uuid:client_id>/nutrition/historique/', views.nutrition_historique_coach, name='nutrition-historique-coach'),
    path('portal/nutrition/historique/', views.portal_nutrition_historique, name='portal-nutrition-historique'),
    path('portal/nutrition/recettes/', views.portal_recettes, name='portal-recettes'),
    path('portal/programme/', views.portal_programme, name='portal-programme'),
    path('seances/<uuid:seance_id>/exercices/', views.seance_exercices, name='seance-exercices'),
    path('seances/<uuid:seance_id>/exercices/<uuid:item_id>/', views.seance_exercice_detail, name='seance-exercice-detail'),
    path('push/vapid-public-key/', views.vapid_public_key, name='vapid-public-key'),
    path('push/subscribe/', views.push_subscribe, name='push-subscribe'),
    path('push/send/<uuid:client_id>/', views.push_send_to_client, name='push-send'),
    path('clients/<uuid:client_id>/generer-plan-ia/', views.generer_plan_ia, name='generer-plan-ia'),
    path('clients/<uuid:client_id>/sauvegarder-plan-ia/', views.sauvegarder_plan_ia, name='sauvegarder-plan-ia'),
    path('clients/<uuid:client_id>/plans/', views.client_plans, name='client-plans'),
]
