from rest_framework import serializers
from core.models import *


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'avatar', 'phone']


class CoachProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachProfile
        fields = ['id', 'bio', 'specialites', 'certifications', 'ville', 'plan']
        # Exclus volontairement : user (clé FK), siret (données fiscales), plan_expires_at


class ClientListSerializer(serializers.ModelSerializer):
    nom_complet = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    imc = serializers.ReadOnlyField()
    initiales = serializers.ReadOnlyField()
    programme_actif = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ['id','prenom','nom','nom_complet','initiales','email','phone','statut',
                  'age','imc','taille_cm','poids_depart_kg','poids_cible_kg','niveau',
                  'photo','ville','date_debut','tarif','mode_facturation','objectifs','programme_actif',
                  'user_account','created_at']

    def get_programme_actif(self, obj):
        a = obj.assignations.filter(statut='en_cours').first()
        if a:
            return {
                'id': a.id,
                'nom': a.programme.nom,
                'semaine_courante': a.semaine_courante,
                'duree_semaines': a.programme.duree_semaines,
                'progression_pct': a.progression_pct,
                'seances_realisees': a.seances_realisees,
                'seances_total': a.seances_total,
            }
        return None


class ClientDetailSerializer(ClientListSerializer):
    notes = serializers.SerializerMethodField()
    mesures = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    seances_recentes = serializers.SerializerMethodField()
    objectifs_list = serializers.SerializerMethodField()

    class Meta(ClientListSerializer.Meta):
        fields = ClientListSerializer.Meta.fields + [
            'genre','date_naissance','blessures','contraintes_medicales',
            'disponibilites','alimentation','notes','mesures','photos',
            'seances_recentes','objectifs_list',
        ]

    def get_notes(self, obj):
        return NoteSuiviSerializer(obj.notes.all()[:10], many=True).data

    def get_mesures(self, obj):
        return MesureSerializer(obj.mesures.all()[:20], many=True).data

    def get_photos(self, obj):
        return PhotoSerializer(obj.photos.all(), many=True, context=self.context).data

    def get_seances_recentes(self, obj):
        return SeanceListSerializer(obj.seances.all()[:20], many=True).data

    def get_objectifs_list(self, obj):
        return ObjectifSerializer(obj.objectifs_list.all(), many=True).data


class ClientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        exclude = ['coach', 'user_account', 'created_at', 'updated_at']


class MesureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mesure
        fields = '__all__'
        read_only_fields = ['client', 'created_at']


class PhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PhotoProgression
        fields = '__all__'
        read_only_fields = ['client', 'created_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        if obj.image:
            return obj.image.url
        return None


class ProgrammeJourExerciceSerializer(serializers.ModelSerializer):
    exercice_nom  = serializers.ReadOnlyField(source='exercice.nom')
    exercice_gif  = serializers.SerializerMethodField()
    nom_affiche   = serializers.ReadOnlyField(source='nom')

    def get_exercice_gif(self, obj):
        if not obj.exercice:
            return None
        if obj.exercice.gif_file:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.exercice.gif_file.url) if request else obj.exercice.gif_file.url
        if obj.exercice.gif_url:
            return obj.exercice.gif_url
        return None

    class Meta:
        model  = ProgrammeJourExercice
        fields = ['id','exercice','exercice_nom','exercice_gif','nom_libre','nom_affiche',
                  'series','reps','repos_sec','notes','ordre']
        read_only_fields = ['id','exercice_nom','exercice_gif','nom_affiche']


class ProgrammeJourSerializer(serializers.ModelSerializer):
    exercices = ProgrammeJourExerciceSerializer(many=True, read_only=True)
    jour_label = serializers.SerializerMethodField()

    def get_jour_label(self, obj):
        return dict(ProgrammeJour.JOURS).get(obj.jour, obj.jour)

    class Meta:
        model  = ProgrammeJour
        fields = ['id','semaine','jour','jour_label','titre','ordre','exercices']
        read_only_fields = ['id']


class ProgrammeSerializer(serializers.ModelSerializer):
    nb_clients = serializers.SerializerMethodField()
    completion_moy = serializers.SerializerMethodField()

    class Meta:
        model = Programme
        fields = ['id','nom','description','categorie','duree_semaines','seances_par_semaine',
                  'modules','prix','est_template','genere_par_ia','nb_clients','completion_moy',
                  'created_at','updated_at']
        read_only_fields = ['coach','created_at','updated_at']

    def get_nb_clients(self, obj):
        return obj.assignations.filter(statut='en_cours').count()

    def get_completion_moy(self, obj):
        assignations = obj.assignations.filter(statut='en_cours')
        if not assignations:
            return 0
        total = sum(a.progression_pct for a in assignations)
        return round(total / assignations.count())


class AssignationSerializer(serializers.ModelSerializer):
    programme_nom = serializers.ReadOnlyField(source='programme.nom')
    programme_duree_semaines = serializers.ReadOnlyField(source='programme.duree_semaines')
    programme_seances_par_semaine = serializers.ReadOnlyField(source='programme.seances_par_semaine')
    client_nom = serializers.ReadOnlyField(source='client.nom_complet')
    progression_pct = serializers.ReadOnlyField()
    seances_realisees = serializers.ReadOnlyField()
    seances_total = serializers.ReadOnlyField()

    class Meta:
        model = AssignationProgramme
        fields = '__all__'
        read_only_fields = ['created_at']


class SeanceListSerializer(serializers.ModelSerializer):
    client_nom = serializers.ReadOnlyField(source='client.nom_complet')
    client_initiales = serializers.ReadOnlyField(source='client.initiales')

    class Meta:
        model = Seance
        fields = ['id','client','client_nom','client_initiales','date_heure','duree_minutes',
                  'type_seance','statut','titre','semaine_numero','assignation','created_at']


class SerieLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SerieLog
        fields = ['id', 'exercice_nom', 'serie_numero', 'poids_kg', 'repetitions', 'duree_secondes', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class SeanceDetailSerializer(serializers.ModelSerializer):
    client_nom = serializers.ReadOnlyField(source='client.nom_complet')
    series_log = SerieLogSerializer(many=True, read_only=True)
    exercices_planifies = serializers.SerializerMethodField()

    class Meta:
        model = Seance
        fields = '__all__'
        read_only_fields = ['coach','created_at','updated_at']

    def get_exercices_planifies(self, obj):
        return ExerciceSeanceSerializer(obj.exercices_planifies.select_related('exercice').all(), many=True).data


class NoteSuiviSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteSuivi
        fields = '__all__'
        read_only_fields = ['client', 'coach', 'created_at']


class ObjectifSerializer(serializers.ModelSerializer):
    progression_pct = serializers.ReadOnlyField()

    class Meta:
        model = Objectif
        fields = '__all__'
        read_only_fields = ['client', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    client_nom = serializers.ReadOnlyField(source='client.nom_complet')
    client_initiales = serializers.ReadOnlyField(source='client.initiales')
    non_lus = serializers.ReadOnlyField(source='non_lus_coach')
    dernier_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id','client','client_nom','client_initiales','non_lus','dernier_message','updated_at']

    def get_dernier_message(self, obj):
        m = obj.messages.order_by('-created_at').first()
        if m:
            return {'contenu': m.contenu[:80], 'role': m.expediteur_role, 'date': m.created_at}
        return None


class MessageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'contenu', 'image', 'image_url', 'expediteur_role', 'lu', 'created_at']
        read_only_fields = ['created_at', 'lu', 'image_url']
        extra_kwargs = {'image': {'write_only': True}}


class TemplateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateMessage
        fields = '__all__'
        read_only_fields = ['coach','created_at']


class FactureSerializer(serializers.ModelSerializer):
    client_nom   = serializers.ReadOnlyField(source='client.nom_complet')
    client_email = serializers.ReadOnlyField(source='client.email')
    jours_retard = serializers.ReadOnlyField()

    class Meta:
        model = Facture
        fields = '__all__'
        read_only_fields = ['coach', 'numero', 'created_at', 'jours_retard']


class ContratSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrat
        fields = '__all__'
        read_only_fields = ['created_at','token_signature']


class AlerteSerializer(serializers.ModelSerializer):
    client_nom = serializers.ReadOnlyField(source='client.nom_complet')

    class Meta:
        model = Alerte
        fields = '__all__'
        read_only_fields = ['coach','created_at']


class DashboardSerializer(serializers.Serializer):
    clients_actifs = serializers.IntegerField()
    seances_semaine = serializers.IntegerField()
    seances_restantes = serializers.IntegerField()
    revenus_mois = serializers.DecimalField(max_digits=10, decimal_places=2)
    taux_completion = serializers.FloatField()
    alertes_non_lues = serializers.IntegerField()
    messages_non_lus = serializers.IntegerField()
    prochaines_seances = SeanceListSerializer(many=True)
    clients_avancement = ClientListSerializer(many=True)


# ── NUTRITION ─────────────────────────────────────────────────────────────────

class AlimentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Aliment
        fields = ['id','nom','categorie','calories_100g','proteines_100g',
                  'glucides_100g','lipides_100g','fibres_100g','coach']
        read_only_fields = ['id']


class IngredientRecetteSerializer(serializers.ModelSerializer):
    aliment_nom     = serializers.ReadOnlyField(source='aliment.nom')
    aliment_details = AlimentSerializer(source='aliment', read_only=True)

    class Meta:
        model  = IngredientRecette
        fields = ['id','aliment','aliment_nom','aliment_details','quantite_g']
        read_only_fields = ['id']


class RecetteSerializer(serializers.ModelSerializer):
    ingredients        = IngredientRecetteSerializer(many=True, read_only=True)
    macros_par_portion = serializers.SerializerMethodField()
    photo_url          = serializers.SerializerMethodField()
    is_global          = serializers.SerializerMethodField()

    class Meta:
        model  = Recette
        fields = ['id','nom','description','instructions','portions','photo','photo_url',
                  'image_url','original','is_global','tags','ingredients','macros_par_portion','created_at']
        read_only_fields = ['id','created_at','photo_url','is_global']

    def get_macros_par_portion(self, obj):
        return obj.macros_par_portion

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
        return obj.image_url or None

    def get_is_global(self, obj):
        return obj.coach_id is None


class AlimentRepasSerializer(serializers.ModelSerializer):
    aliment_details = AlimentSerializer(source='aliment', read_only=True)
    aliment_nom     = serializers.SerializerMethodField()
    recette_details = RecetteSerializer(source='recette', read_only=True)
    macros          = serializers.SerializerMethodField()

    class Meta:
        model  = AlimentRepas
        fields = ['id','aliment','aliment_nom','aliment_details','recette','recette_details',
                  'quantite_g','notes','macros']
        read_only_fields = ['id']

    def get_aliment_nom(self, obj):
        if obj.aliment:
            return obj.aliment.nom
        if obj.recette:
            return obj.recette.nom
        return ''

    def get_macros(self, obj):
        return obj.get_macros()


class RepasTemplateSerializer(serializers.ModelSerializer):
    aliments      = AlimentRepasSerializer(many=True, read_only=True)
    type_repas_label = serializers.SerializerMethodField()
    macros_total  = serializers.SerializerMethodField()

    class Meta:
        model  = RepasTemplate
        fields = ['id','type_repas','type_repas_label','ordre','aliments','macros_total']
        read_only_fields = ['id']

    def get_type_repas_label(self, obj):
        return dict(REPAS_CHOICES).get(obj.type_repas, obj.type_repas)

    def get_macros_total(self, obj):
        totals = dict(calories=0.0, proteines=0.0, glucides=0.0, lipides=0.0, fibres=0.0)
        for ar in obj.aliments.select_related('aliment','recette').all():
            m = ar.get_macros()
            for k in totals:
                totals[k] += m.get(k, 0)
        return {k: round(v, 1) for k, v in totals.items()}


class PlanAlimentaireSerializer(serializers.ModelSerializer):
    repas        = RepasTemplateSerializer(many=True, read_only=True)
    macros_total = serializers.SerializerMethodField()
    nb_clients   = serializers.SerializerMethodField()

    class Meta:
        model  = PlanAlimentaire
        fields = ['id','nom','description','objectif_calories','objectif_proteines_g',
                  'objectif_glucides_g','objectif_lipides_g','repas','macros_total',
                  'nb_clients','created_at']
        read_only_fields = ['id','created_at']

    def get_macros_total(self, obj):
        totals = dict(calories=0.0, proteines=0.0, glucides=0.0, lipides=0.0, fibres=0.0)
        for repas in obj.repas.prefetch_related('aliments__aliment','aliments__recette__ingredients__aliment').all():
            for ar in repas.aliments.all():
                m = ar.get_macros()
                for k in totals:
                    totals[k] += m.get(k, 0)
        return {k: round(v, 1) for k, v in totals.items()}

    def get_nb_clients(self, obj):
        return obj.assignations.filter(actif=True).count()


class AssignationPlanSerializer(serializers.ModelSerializer):
    plan_nom    = serializers.ReadOnlyField(source='plan.nom')
    client_nom  = serializers.SerializerMethodField()

    class Meta:
        model  = AssignationPlan
        fields = ['id','plan','plan_nom','client','client_nom','date_debut','actif','created_at']
        read_only_fields = ['id','created_at']

    def get_client_nom(self, obj):
        return f"{obj.client.prenom} {obj.client.nom}"


class JournalAlimentaireSerializer(serializers.ModelSerializer):
    aliment_nom     = serializers.ReadOnlyField(source='aliment.nom')
    aliment_details = AlimentSerializer(source='aliment', read_only=True)
    macros          = serializers.SerializerMethodField()

    class Meta:
        model  = JournalAlimentaire
        fields = ['id','date','type_repas','aliment','aliment_nom','aliment_details',
                  'recette','quantite_g','notes','macros','created_at']
        read_only_fields = ['id','created_at']

    def get_macros(self, obj):
        return obj.get_macros()


class ConsommationEauSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ConsommationEau
        fields = ['id', 'date', 'quantite_ml', 'created_at']
        read_only_fields = ['id', 'created_at']


class CheckinReponseSerializer(serializers.ModelSerializer):
    score_moyen = serializers.SerializerMethodField()

    class Meta:
        model  = CheckinReponse
        fields = ['id','semaine','energie','sommeil','motivation','stress','recuperation',
                  'humeur','alimentation','hydratation','confort_physique',
                  'poids_kg','commentaire','score_moyen','created_at']
        read_only_fields = ['id','created_at']

    def get_score_moyen(self, obj):
        keys = ['energie','sommeil','motivation','stress','recuperation',
                'humeur','alimentation','hydratation','confort_physique']
        vals = [getattr(obj, k) for k in keys if getattr(obj, k) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None


# ── EXERCICES ─────────────────────────────────────────────────────────────────

class ExerciceSerializer(serializers.ModelSerializer):
    groupe_musculaire_label = serializers.SerializerMethodField()
    categorie_label = serializers.SerializerMethodField()

    class Meta:
        model = Exercice
        fields = ['id','nom','description','groupe_musculaire','groupe_musculaire_label',
                  'categorie','categorie_label','gif_url','gif_file','est_personnalise',
                  'coach','created_at']
        read_only_fields = ['id','created_at','coach']

    def get_groupe_musculaire_label(self, obj):
        return dict(Exercice.GROUPE_CHOICES).get(obj.groupe_musculaire, obj.groupe_musculaire)

    def get_categorie_label(self, obj):
        return dict(Exercice.CAT_CHOICES).get(obj.categorie, obj.categorie)


class ExerciceSeanceSerializer(serializers.ModelSerializer):
    exercice_details = ExerciceSerializer(source='exercice', read_only=True)

    class Meta:
        model = ExerciceSeance
        fields = ['id','seance','exercice','exercice_details','ordre','series',
                  'repetitions','duree_sec','poids_kg','repos_sec','notes','created_at']
        read_only_fields = ['id','created_at']
