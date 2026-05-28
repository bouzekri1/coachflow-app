from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import *

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'get_full_name', 'role', 'created_at']
    list_filter = ['role']
    fieldsets = BaseUserAdmin.fieldsets + (('CoachFlow', {'fields': ('role', 'avatar', 'phone')}),)

@admin.register(CoachProfile)
class CoachProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'ville']

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['nom_complet', 'email', 'statut', 'coach', 'created_at']
    list_filter = ['statut', 'coach']
    search_fields = ['prenom', 'nom', 'email']

@admin.register(Programme)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ['nom', 'categorie', 'duree_semaines', 'coach']

@admin.register(AssignationProgramme)
class AssignationAdmin(admin.ModelAdmin):
    list_display = ['client', 'programme', 'statut', 'semaine_courante', 'date_debut']

@admin.register(Seance)
class SeanceAdmin(admin.ModelAdmin):
    list_display = ['client', 'date_heure', 'type_seance', 'statut', 'duree_minutes']
    list_filter = ['statut', 'type_seance']

@admin.register(Facture)
class FactureAdmin(admin.ModelAdmin):
    list_display = ['numero', 'client', 'montant_ttc', 'statut', 'date_emission']
    list_filter = ['statut']

admin.site.register(NoteSuivi)
admin.site.register(Objectif)
admin.site.register(Mesure)
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(TemplateMessage)
admin.site.register(Contrat)
admin.site.register(Alerte)
