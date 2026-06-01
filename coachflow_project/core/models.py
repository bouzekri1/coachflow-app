from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class User(AbstractUser):
    ROLE_COACH = 'coach'
    ROLE_CLIENT = 'client'
    ROLE_CHOICES = [(ROLE_COACH, 'Coach'), (ROLE_CLIENT, 'Client')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_COACH)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'users'
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


class CoachProfile(models.Model):
    PLAN_FREE = 'free'
    PLAN_PRO = 'pro'
    PLAN_CHOICES = [(PLAN_FREE, 'Gratuit'), (PLAN_PRO, 'Pro')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='coach_profile')
    bio = models.TextField(blank=True)
    specialites = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    siret = models.CharField(max_length=14, blank=True)
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES, default=PLAN_FREE)
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    reservation_active = models.BooleanField(default=False)
    reservation_preavis_h = models.PositiveSmallIntegerField(default=12)
    reservation_horizon_j = models.PositiveSmallIntegerField(default=30)
    reservation_duree_min = models.PositiveSmallIntegerField(default=60)
    gcal_block_allday = models.BooleanField(default=True, help_text="Bloquer les events all-day Google même marqués 'Disponible'")
    class Meta:
        db_table = 'coach_profiles'
    def __str__(self):
        return f"Coach: {self.user}"
    @property
    def client_count(self):
        return self.user.clients.filter(statut=Client.STATUT_ACTIF).count()
    @property
    def can_add_client(self):
        return self.plan == self.PLAN_PRO or self.client_count < 5


class Client(models.Model):
    STATUT_ACTIF = 'actif'
    STATUT_PAUSE = 'pause'
    STATUT_INACTIF = 'inactif'
    STATUT_NOUVEAU = 'nouveau'
    STATUT_CHOICES = [
        (STATUT_ACTIF, 'Actif'), (STATUT_PAUSE, 'En pause'),
        (STATUT_INACTIF, 'Inactif'), (STATUT_NOUVEAU, 'Nouveau'),
    ]
    GENRE_CHOICES = [('homme','Homme'),('femme','Femme'),('autre','Autre')]
    NIVEAU_CHOICES = [('debutant','Débutant'),('intermediaire','Intermédiaire'),('avance','Avancé')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clients')
    user_account = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='client_profile')
    prenom = models.CharField(max_length=100)
    nom = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    date_naissance = models.DateField(null=True, blank=True)
    genre = models.CharField(max_length=10, choices=GENRE_CHOICES, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    photo = models.ImageField(upload_to='clients/photos/', null=True, blank=True)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default=STATUT_NOUVEAU)
    date_debut = models.DateField(null=True, blank=True)
    taille_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    poids_depart_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    poids_cible_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    niveau = models.CharField(max_length=15, choices=NIVEAU_CHOICES, blank=True)
    objectifs = models.JSONField(default=list, blank=True)
    blessures = models.TextField(blank=True)
    contraintes_medicales = models.TextField(blank=True)
    disponibilites = models.JSONField(default=list, blank=True)
    alimentation = models.CharField(max_length=100, blank=True)
    tarif_mensuel = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    parraine_par = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='filleuls')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.prenom} {self.nom}"
    @property
    def nom_complet(self):
        return f"{self.prenom} {self.nom}"
    @property
    def age(self):
        if not self.date_naissance:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.date_naissance.year - ((today.month, today.day) < (self.date_naissance.month, self.date_naissance.day))
    @property
    def imc(self):
        if not self.taille_cm or not self.poids_depart_kg:
            return None
        h = self.taille_cm / 100
        return round(float(self.poids_depart_kg) / (h * h), 1)
    @property
    def initiales(self):
        return f"{self.prenom[0]}{self.nom[0]}".upper()


class QuestionnaireInitial(models.Model):
    client = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='questionnaire')
    experience_sportive = models.TextField(blank=True)
    sports_pratiques = models.JSONField(default=list, blank=True)
    pathologies = models.TextField(blank=True)
    medicaments = models.TextField(blank=True)
    tabac = models.BooleanField(default=False)
    alcool = models.CharField(max_length=50, blank=True)
    sommeil_heures = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    stress_niveau = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)])
    motivation_niveau = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)])
    remarques = models.TextField(blank=True)
    rempli_le = models.DateField(auto_now_add=True)
    class Meta:
        db_table = 'questionnaires_initiaux'


class Mesure(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='mesures')
    date = models.DateField()
    poids_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    tour_taille_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    tour_hanches_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    tour_cuisse_cm = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    masse_grasse_pct = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'mesures'
        ordering = ['-date']


class PhotoProgression(models.Model):
    ANGLE_CHOICES = [('face','Face'),('profil','Profil'),('dos','Dos')]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='clients/progression/')
    date = models.DateField()
    angle = models.CharField(max_length=10, choices=ANGLE_CHOICES, default='face')
    semaine_programme = models.PositiveSmallIntegerField(null=True, blank=True)
    legende = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'photos_progression'
        ordering = ['-date']


class Programme(models.Model):
    CATEGORIE_CHOICES = [
        ('force','Force & Musculation'), ('cardio','Cardio & Endurance'),
        ('perte_poids','Perte de poids'), ('remise_forme','Remise en forme'),
        ('mobilite','Mobilité & Souplesse'), ('custom','Personnalisé'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='programmes')
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    duree_semaines = models.PositiveSmallIntegerField()
    seances_par_semaine = models.PositiveSmallIntegerField()
    modules = models.JSONField(default=list, blank=True)
    prix = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    est_template = models.BooleanField(default=True)
    genere_par_ia = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'programmes'
        ordering = ['-created_at']
    def __str__(self):
        return self.nom


class ProgrammeJour(models.Model):
    JOURS = [('1','Lundi'),('2','Mardi'),('3','Mercredi'),('4','Jeudi'),('5','Vendredi'),('6','Samedi'),('7','Dimanche')]
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    programme   = models.ForeignKey(Programme, on_delete=models.CASCADE, related_name='jours')
    semaine     = models.PositiveSmallIntegerField(default=1)
    jour        = models.CharField(max_length=1, choices=JOURS)
    titre       = models.CharField(max_length=200, blank=True)
    ordre       = models.PositiveSmallIntegerField(default=0)
    class Meta:
        db_table = 'programme_jours'
        ordering = ['semaine', 'jour', 'ordre']


class ProgrammeJourExercice(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    jour        = models.ForeignKey(ProgrammeJour, on_delete=models.CASCADE, related_name='exercices')
    exercice    = models.ForeignKey('Exercice', on_delete=models.SET_NULL, null=True, blank=True)
    nom_libre   = models.CharField(max_length=200, blank=True)
    series      = models.PositiveSmallIntegerField(default=3)
    reps        = models.CharField(max_length=50, default='10', blank=True)
    repos_sec   = models.PositiveSmallIntegerField(default=60)
    notes       = models.TextField(blank=True)
    ordre       = models.PositiveSmallIntegerField(default=0)
    class Meta:
        db_table = 'programme_jour_exercices'
        ordering = ['ordre']

    @property
    def nom(self):
        return self.nom_libre or (self.exercice.nom if self.exercice else '')


class AssignationProgramme(models.Model):
    STATUT_CHOICES = [('en_cours','En cours'),('termine','Terminé'),('abandonne','Abandonné')]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='assignations')
    programme = models.ForeignKey(Programme, on_delete=models.CASCADE, related_name='assignations')
    date_debut = models.DateField()
    date_fin_prevue = models.DateField()
    date_fin_reelle = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_cours')
    semaine_courante = models.PositiveSmallIntegerField(default=1)
    notes_coach = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'assignations_programmes'
    def __str__(self):
        return f"{self.client} → {self.programme}"
    @property
    def progression_pct(self):
        t = self.programme.duree_semaines
        return round((self.semaine_courante / t) * 100) if t else 0
    @property
    def seances_realisees(self):
        # Count via FK first; fall back to client sessions since programme start
        # (sessions created without the assignation FK would otherwise be missed)
        count = self.seances.filter(statut='realisee').count()
        if count == 0:
            count = self.client.seances.filter(
                statut='realisee',
                date_heure__date__gte=self.date_debut,
            ).count()
        return count
    @property
    def seances_total(self):
        return self.programme.duree_semaines * self.programme.seances_par_semaine


class Exercice(models.Model):
    GROUPE_CHOICES = [
        ('pectoraux','Pectoraux'),('dorsaux','Dorsaux'),('epaules','Épaules'),
        ('biceps','Biceps'),('triceps','Triceps'),('abdominaux','Abdominaux'),
        ('quadriceps','Quadriceps'),('ischio','Ischio-jambiers'),
        ('fessiers','Fessiers'),('mollets','Mollets'),
        ('full_body','Full body'),('cardio','Cardio'),
    ]
    CAT_CHOICES = [('force','Force'),('cardio','Cardio'),('mobilite','Mobilité'),('gainage','Gainage')]

    id                = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom               = models.CharField(max_length=200)
    description       = models.TextField(blank=True)
    groupe_musculaire = models.CharField(max_length=20, choices=GROUPE_CHOICES)
    categorie         = models.CharField(max_length=20, choices=CAT_CHOICES, default='force')
    gif_url           = models.URLField(blank=True)
    gif_file          = models.ImageField(upload_to='exercices/', null=True, blank=True)
    est_personnalise  = models.BooleanField(default=False)
    coach             = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='exercices_perso')
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercices'
        ordering = ['groupe_musculaire', 'nom']

    def __str__(self):
        return self.nom


class Seance(models.Model):
    STATUT_CHOICES = [('planifiee','Planifiée'),('realisee','Réalisée'),('annulee','Annulée'),('absence','Absence')]
    TYPE_CHOICES = [('presentiel','Présentiel'),('visio','Visio'),('autonome','Autonome')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignation = models.ForeignKey(AssignationProgramme, on_delete=models.CASCADE, related_name='seances', null=True, blank=True)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seances_coach')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='seances')
    date_heure = models.DateTimeField()
    duree_minutes = models.PositiveSmallIntegerField(default=60)
    type_seance = models.CharField(max_length=15, choices=TYPE_CHOICES, default='presentiel')
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='planifiee')
    titre = models.CharField(max_length=200, blank=True)
    exercices = models.JSONField(default=list, blank=True)
    notes_avant = models.TextField(blank=True)
    notes_apres = models.TextField(blank=True)
    rpe_client = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(10)])
    ressenti_client = models.TextField(blank=True)
    semaine_numero = models.PositiveSmallIntegerField(null=True, blank=True)
    rappel_envoye = models.BooleanField(default=False)
    google_event_id = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'seances'
        ordering = ['-date_heure']
    def __str__(self):
        return f"{self.client} — {self.date_heure.strftime('%d/%m/%Y %H:%M')}"


class SerieLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seance = models.ForeignKey(Seance, on_delete=models.CASCADE, related_name='series_log')
    exercice_nom = models.CharField(max_length=200)
    serie_numero = models.PositiveSmallIntegerField(default=1)
    poids_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    repetitions = models.PositiveSmallIntegerField(null=True, blank=True)
    duree_secondes = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'series_log'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.exercice_nom} S{self.serie_numero} — {self.seance}"


class ExerciceSeance(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seance       = models.ForeignKey(Seance, on_delete=models.CASCADE, related_name='exercices_planifies')
    exercice     = models.ForeignKey(Exercice, on_delete=models.CASCADE)
    ordre        = models.PositiveSmallIntegerField(default=0)
    series       = models.PositiveSmallIntegerField(default=3)
    repetitions  = models.PositiveSmallIntegerField(null=True, blank=True)
    duree_sec    = models.PositiveIntegerField(null=True, blank=True)
    poids_kg     = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    repos_sec    = models.PositiveIntegerField(default=60)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercice_seances'
        ordering = ['ordre', 'created_at']


class NoteSuivi(models.Model):
    CATEGORIE_CHOICES = [('general','Général'),('performance','Performance'),('nutrition','Nutrition'),('psychologie','Psychologie'),('medical','Médical')]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='notes')
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    seance = models.ForeignKey(Seance, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    contenu = models.TextField()
    categorie = models.CharField(max_length=15, choices=CATEGORIE_CHOICES, default='general')
    visible_client = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'notes_suivi'
        ordering = ['-created_at']


class Objectif(models.Model):
    STATUT_CHOICES = [('en_cours','En cours'),('atteint','Atteint'),('abandonne','Abandonné')]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='objectifs_list')
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    valeur_cible = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    valeur_actuelle = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    unite = models.CharField(max_length=20, blank=True)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_cours')
    date_echeance = models.DateField(null=True, blank=True)
    date_atteint = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'objectifs'
    @property
    def progression_pct(self):
        if self.valeur_cible and self.valeur_actuelle:
            return min(100, round(float(self.valeur_actuelle) / float(self.valeur_cible) * 100))
        return 0


class Conversation(models.Model):
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'conversations'
        unique_together = ['coach', 'client']
    @property
    def non_lus_coach(self):
        return self.messages.filter(lu=False, expediteur_role='client').count()


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    contenu = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='messages/', null=True, blank=True)
    expediteur_role = models.CharField(max_length=10, choices=[('coach','Coach'),('client','Client')])
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'messages'
        ordering = ['created_at']


class TemplateMessage(models.Model):
    CATEGORIE_CHOICES = [
        ('relance','Relance absence'),('felicitations','Félicitations'),
        ('rappel','Rappel séance'),('bilan','Bilan programme'),
        ('renouvellement','Renouvellement'),('facture','Relance facture'),('custom','Personnalisé'),
    ]
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='templates_messages')
    nom = models.CharField(max_length=100)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    sujet = models.CharField(max_length=200, blank=True)
    contenu = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'templates_messages'
    def __str__(self):
        return self.nom


class Facture(models.Model):
    STATUT_CHOICES = [('brouillon','Brouillon'),('envoyee','Envoyée'),('payee','Payée'),('retard','Retard'),('annulee','Annulée')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='factures')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='factures')
    assignation = models.ForeignKey(AssignationProgramme, on_delete=models.SET_NULL, null=True, blank=True, related_name='factures')
    numero = models.CharField(max_length=30, unique=True)
    date_emission = models.DateField()
    date_echeance = models.DateField()
    date_paiement = models.DateField(null=True, blank=True)
    montant_ht = models.DecimalField(max_digits=8, decimal_places=2)
    taux_tva = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    montant_ttc = models.DecimalField(max_digits=8, decimal_places=2)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='brouillon')
    lignes = models.JSONField(default=list)
    notes = models.TextField(blank=True)
    nb_relances = models.PositiveSmallIntegerField(default=0)
    derniere_relance = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'factures'
        ordering = ['-date_emission']
    def __str__(self):
        return f"{self.numero} — {self.montant_ttc} €"
    @property
    def jours_retard(self):
        from datetime import date
        if self.statut == 'payee': return 0
        return max(0, (date.today() - self.date_echeance).days)


class Contrat(models.Model):
    STATUT_CHOICES = [('brouillon','Brouillon'),('envoye','Envoyé'),('signe','Signé'),('expire','Expiré')]
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='contrats')
    programme = models.ForeignKey(Programme, on_delete=models.SET_NULL, null=True, blank=True)
    titre = models.CharField(max_length=200)
    contenu_html = models.TextField()
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='brouillon')
    date_signature = models.DateTimeField(null=True, blank=True)
    signature_ip = models.GenericIPAddressField(null=True, blank=True)
    token_signature = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'contrats'


REPAS_CHOICES = [
    ('petit_dejeuner',  'Petit-déjeuner'),
    ('collation_matin', 'Collation matin'),
    ('dejeuner',        'Déjeuner'),
    ('collation_soir',  'Collation après-midi'),
    ('diner',           'Dîner'),
]


class Aliment(models.Model):
    CATEGORIES = [
        ('viandes_poissons', 'Viandes & Poissons'),
        ('legumes',          'Légumes'),
        ('feculents',        'Féculents & Céréales'),
        ('laitiers',         'Produits laitiers'),
        ('fruits',           'Fruits'),
        ('matieres_grasses', 'Matières grasses'),
        ('legumineuses',     'Légumineuses'),
        ('autres',           'Autres'),
    ]
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom           = models.CharField(max_length=200)
    categorie     = models.CharField(max_length=20, choices=CATEGORIES, default='autres')
    calories_100g = models.DecimalField(max_digits=7, decimal_places=1, default=0)
    proteines_100g= models.DecimalField(max_digits=5, decimal_places=1, default=0)
    glucides_100g = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    lipides_100g  = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    fibres_100g   = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    coach         = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='aliments_custom')
    class Meta:
        db_table = 'aliments'
        ordering = ['categorie', 'nom']
    def __str__(self):
        return self.nom


class Recette(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recettes')
    original     = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='copies')
    nom          = models.CharField(max_length=200)
    description  = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    portions     = models.PositiveSmallIntegerField(default=1)
    photo        = models.ImageField(upload_to='recettes/', null=True, blank=True)
    image_url    = models.URLField(max_length=500, blank=True, default='')
    # Tags diététiques : ['vegan','vegetarien','sans_gluten','sans_lactose','low_fodmap','riche_proteines','low_carb']
    tags         = models.JSONField(default=list, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'recettes'
        ordering = ['nom']
    def __str__(self):
        return self.nom

    @property
    def macros_par_portion(self):
        totals = dict(calories=0, proteines=0, glucides=0, lipides=0, fibres=0)
        for ing in self.ingredients.select_related('aliment').all():
            r = float(ing.quantite_g) / 100
            totals['calories']   += float(ing.aliment.calories_100g)  * r
            totals['proteines']  += float(ing.aliment.proteines_100g) * r
            totals['glucides']   += float(ing.aliment.glucides_100g)  * r
            totals['lipides']    += float(ing.aliment.lipides_100g)   * r
            totals['fibres']     += float(ing.aliment.fibres_100g)    * r
        p = max(self.portions, 1)
        return {k: round(v / p, 1) for k, v in totals.items()}


class IngredientRecette(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recette    = models.ForeignKey(Recette, on_delete=models.CASCADE, related_name='ingredients')
    aliment    = models.ForeignKey(Aliment, on_delete=models.CASCADE)
    quantite_g = models.DecimalField(max_digits=7, decimal_places=1)
    class Meta:
        db_table = 'ingredients_recette'


class PlanAlimentaire(models.Model):
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach               = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plans_alimentaires')
    nom                 = models.CharField(max_length=200)
    description         = models.TextField(blank=True)
    objectif_calories   = models.IntegerField(null=True, blank=True)
    objectif_proteines_g= models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    objectif_glucides_g = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    objectif_lipides_g  = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'plans_alimentaires'
        ordering = ['-created_at']
    def __str__(self):
        return self.nom


class AssignationPlan(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan       = models.ForeignKey(PlanAlimentaire, on_delete=models.CASCADE, related_name='assignations')
    client     = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='plans_alimentaires')
    date_debut = models.DateField()
    actif      = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'assignations_plans'


class RepasTemplate(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plan       = models.ForeignKey(PlanAlimentaire, on_delete=models.CASCADE, related_name='repas')
    type_repas = models.CharField(max_length=20, choices=REPAS_CHOICES)
    ordre      = models.PositiveSmallIntegerField(default=0)
    class Meta:
        db_table = 'repas_templates'
        ordering = ['ordre']


class AlimentRepas(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    repas      = models.ForeignKey(RepasTemplate, on_delete=models.CASCADE, related_name='aliments')
    aliment    = models.ForeignKey(Aliment, on_delete=models.CASCADE, null=True, blank=True)
    recette    = models.ForeignKey(Recette, on_delete=models.CASCADE, null=True, blank=True)
    quantite_g = models.DecimalField(max_digits=7, decimal_places=1)
    notes      = models.CharField(max_length=200, blank=True)
    class Meta:
        db_table = 'aliments_repas'

    def get_macros(self):
        if self.aliment_id:
            r = float(self.quantite_g) / 100
            a = self.aliment
            return {
                'calories':  round(float(a.calories_100g)  * r, 1),
                'proteines': round(float(a.proteines_100g) * r, 1),
                'glucides':  round(float(a.glucides_100g)  * r, 1),
                'lipides':   round(float(a.lipides_100g)   * r, 1),
                'fibres':    round(float(a.fibres_100g)    * r, 1),
            }
        if self.recette_id:
            return self.recette.macros_par_portion
        return dict(calories=0, proteines=0, glucides=0, lipides=0, fibres=0)


class JournalAlimentaire(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client     = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='journal_alimentaire')
    date       = models.DateField()
    type_repas = models.CharField(max_length=20, choices=REPAS_CHOICES)
    aliment    = models.ForeignKey(Aliment, on_delete=models.CASCADE, null=True, blank=True)
    recette    = models.ForeignKey(Recette, on_delete=models.CASCADE, null=True, blank=True)
    quantite_g = models.DecimalField(max_digits=7, decimal_places=1)
    notes      = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'journal_alimentaire'
        ordering = ['-date', 'type_repas']

    def get_macros(self):
        if self.aliment_id:
            r = float(self.quantite_g) / 100
            a = self.aliment
            return {
                'calories':  round(float(a.calories_100g)  * r, 1),
                'proteines': round(float(a.proteines_100g) * r, 1),
                'glucides':  round(float(a.glucides_100g)  * r, 1),
                'lipides':   round(float(a.lipides_100g)   * r, 1),
                'fibres':    round(float(a.fibres_100g)    * r, 1),
            }
        if self.recette_id:
            return self.recette.macros_par_portion
        return dict(calories=0, proteines=0, glucides=0, lipides=0, fibres=0)


class ConsommationEau(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client     = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='consommation_eau')
    date       = models.DateField()
    quantite_ml = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'consommation_eau'
        ordering = ['-date', '-created_at']


class CheckinReponse(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client       = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='checkins')
    semaine      = models.DateField()          # lundi de la semaine
    energie         = models.PositiveSmallIntegerField(null=True, blank=True)
    sommeil         = models.PositiveSmallIntegerField(null=True, blank=True)
    motivation      = models.PositiveSmallIntegerField(null=True, blank=True)
    stress          = models.PositiveSmallIntegerField(null=True, blank=True)
    recuperation    = models.PositiveSmallIntegerField(null=True, blank=True)
    humeur          = models.PositiveSmallIntegerField(null=True, blank=True)
    alimentation    = models.PositiveSmallIntegerField(null=True, blank=True)
    hydratation     = models.PositiveSmallIntegerField(null=True, blank=True)
    confort_physique= models.PositiveSmallIntegerField(null=True, blank=True)
    poids_kg        = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    commentaire     = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'checkin_reponses'
        ordering = ['-semaine']
        unique_together = [('client', 'semaine')]


class PushSubscription(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint   = models.TextField(unique=True)
    p256dh     = models.TextField()
    auth       = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'push_subscriptions'

    def __str__(self):
        return f"Push({self.user}) — {self.endpoint[:60]}"


class Alerte(models.Model):
    PRIORITE_CHOICES = [('haute','Haute'),('moyenne','Moyenne'),('basse','Basse')]
    TYPE_CHOICES = [('absences','Absences'),('inactivite','Inactivité'),('facture_retard','Facture retard'),('fin_programme','Fin programme'),('objectif_atteint','Objectif atteint'),('nouvelle_mesure','Nouvelle mesure'),('nouvelle_reservation','Nouvelle réservation')]
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alertes')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='alertes')
    type_alerte = models.CharField(max_length=20, choices=TYPE_CHOICES, default='absences')
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='moyenne')
    lue = models.BooleanField(default=False)
    traitee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'alertes'
        ordering = ['-created_at']
    def __str__(self):
        return f"[{self.priorite}] {self.titre}"


class DisponibiliteCoach(models.Model):
    JOUR_CHOICES = [(0,'Lundi'),(1,'Mardi'),(2,'Mercredi'),(3,'Jeudi'),(4,'Vendredi'),(5,'Samedi'),(6,'Dimanche')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disponibilites')
    jour_semaine = models.PositiveSmallIntegerField(choices=JOUR_CHOICES)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'disponibilites_coach'
        ordering = ['jour_semaine', 'heure_debut']
    def __str__(self):
        return f"{self.get_jour_semaine_display()} {self.heure_debut}-{self.heure_fin}"


class ExceptionDisponibilite(models.Model):
    TYPE_CHOICES = [('ferme','Fermé'),('ouvert','Ouvert')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='exceptions_dispo')
    date = models.DateField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='ferme')
    heure_debut = models.TimeField(null=True, blank=True)
    heure_fin = models.TimeField(null=True, blank=True)
    motif = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'exceptions_dispo'
        ordering = ['date']
    def __str__(self):
        return f"{self.date} — {self.get_type_display()}"


class Badge(models.Model):
    CATEGORIE_CHOICES = [
        ('assiduite','Assiduité'),
        ('regularite','Régularité'),
        ('suivi','Suivi'),
        ('nutrition','Nutrition'),
        ('objectifs','Objectifs'),
        ('special','Spéciaux'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=64, unique=True)
    nom = models.CharField(max_length=100)
    description = models.CharField(max_length=255)
    icone = models.CharField(max_length=8, default='🏆')
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    # condition encodée en JSON : {type:'seances_realisees', seuil:10}
    condition = models.JSONField(default=dict)
    ordre = models.PositiveSmallIntegerField(default=0)
    class Meta:
        db_table = 'badges'
        ordering = ['categorie', 'ordre']
    def __str__(self):
        return f"{self.icone} {self.nom}"


class ClientBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='attributions')
    obtenu_le = models.DateTimeField(auto_now_add=True)
    vu = models.BooleanField(default=False)  # passe à True quand le client a vu la notif
    class Meta:
        db_table = 'client_badges'
        unique_together = [('client', 'badge')]
        ordering = ['-obtenu_le']
    def __str__(self):
        return f"{self.client} — {self.badge}"


class GoogleCalendarToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_calendar')
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_uri = models.CharField(max_length=255, default='https://oauth2.googleapis.com/token')
    expires_at = models.DateTimeField()
    google_email = models.EmailField(blank=True)
    calendar_id = models.CharField(max_length=255, default='primary')
    sync_enabled = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'google_calendar_tokens'
    def __str__(self):
        return f"Google Calendar — {self.user}"


class Feedback(models.Model):
    TYPE_CHOICES = [('bug','Bug'),('suggestion','Suggestion'),('question','Question')]
    SEVERITY_CHOICES = [('low','Mineur'),('medium','Moyen'),('high','Critique')]
    STATUS_CHOICES = [('open','Ouvert'),('in_progress','En cours'),('resolved','Résolu'),('rejected','Rejeté')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='feedbacks')
    user_email = models.EmailField(blank=True)  # backup si user supprimé ou anonyme
    user_role = models.CharField(max_length=20, blank=True)  # 'coach' / 'client' au moment du feedback
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    url = models.URLField(max_length=500, blank=True)
    user_agent = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'feedbacks'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title}"
