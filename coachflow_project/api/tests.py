from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from core.models import User, CoachProfile, Client, Programme, Seance, Facture, TemplateMessage
from datetime import date, timedelta


def make_coach(username='coach1', password='pass1234'):
    user = User.objects.create_user(username=username, password=password,
                                    first_name='Jean', last_name='Test', role='coach')
    CoachProfile.objects.create(user=user)
    return user


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coach = make_coach()

    def test_login_ok(self):
        r = self.client.post('/api/auth/login/', {'username': 'coach1', 'password': 'pass1234'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('token', r.data)
        self.assertEqual(r.data['user']['role'], 'coach')

    def test_login_bad_credentials(self):
        r = self.client.post('/api/auth/login/', {'username': 'coach1', 'password': 'wrong'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('error', r.data)

    def test_me_authenticated(self):
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        r = self.client.get('/api/auth/me/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['username'], 'coach1')

    def test_me_unauthenticated(self):
        r = self.client.get('/api/auth/me/')
        self.assertEqual(r.status_code, 401)


class ClientTests(TestCase):
    def setUp(self):
        self.coach = make_coach()
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_client(self):
        r = self.client.post('/api/clients/', {
            'prenom': 'Marie', 'nom': 'Martin', 'email': 'marie@test.com', 'statut': 'actif',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['prenom'], 'Marie')
        self.assertEqual(r.data['nom'], 'Martin')

    def test_list_clients(self):
        Client.objects.create(coach=self.coach, prenom='A', nom='B', email='a@b.com')
        r = self.client.get('/api/clients/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)

    def test_search_clients(self):
        Client.objects.create(coach=self.coach, prenom='Alice', nom='Dupont', email='alice@test.com')
        Client.objects.create(coach=self.coach, prenom='Bob', nom='Martin', email='bob@test.com')
        r = self.client.get('/api/clients/?search=alice')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], 1)
        self.assertEqual(r.data['results'][0]['prenom'], 'Alice')

    def test_client_limit_free_plan(self):
        profile = self.coach.coach_profile
        self.assertEqual(profile.plan, 'free')
        for i in range(5):
            Client.objects.create(coach=self.coach, prenom=f'C{i}', nom='X', email=f'c{i}@test.com', statut='actif')
        r = self.client.post('/api/clients/', {
            'prenom': 'Sixieme', 'nom': 'Client', 'email': '6@test.com',
        }, format='json')
        self.assertEqual(r.status_code, 403)

    def test_other_coach_cannot_see_clients(self):
        other = make_coach('coach2')
        Client.objects.create(coach=other, prenom='Z', nom='Z', email='z@z.com')
        r = self.client.get('/api/clients/')
        self.assertEqual(r.data['count'], 0)


class ProgrammeTests(TestCase):
    def setUp(self):
        self.coach = make_coach()
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_programme(self):
        r = self.client.post('/api/programmes/', {
            'nom': 'Force 12 semaines', 'categorie': 'force',
            'duree_semaines': 12, 'seances_par_semaine': 3,
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['nom'], 'Force 12 semaines')

    def test_assigner_programme(self):
        prog = Programme.objects.create(coach=self.coach, nom='Test', categorie='force',
                                        duree_semaines=8, seances_par_semaine=3)
        client = Client.objects.create(coach=self.coach, prenom='M', nom='M', email='m@m.com')
        r = self.client.post(f'/api/programmes/{prog.id}/assigner/', {
            'client_id': str(client.id), 'date_debut': str(date.today()),
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['statut'], 'en_cours')
        expected_fin = date.today() + timedelta(weeks=8)
        self.assertEqual(r.data['date_fin_prevue'], str(expected_fin))


class SeanceTests(TestCase):
    def setUp(self):
        self.coach = make_coach()
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.apiclient = APIClient()
        self.apiclient.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.cli = Client.objects.create(coach=self.coach, prenom='A', nom='B', email='a@b.com')

    def test_create_seance(self):
        r = self.apiclient.post('/api/seances/', {
            'client': str(self.cli.id),
            'date_heure': '2026-06-01T10:00:00',
            'duree_minutes': 60,
            'type_seance': 'presentiel',
        }, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['statut'], 'planifiee')

    def test_marquer_realisee(self):
        seance = Seance.objects.create(coach=self.coach, client=self.cli,
                                       date_heure='2026-06-01T10:00:00+00:00', duree_minutes=60)
        r = self.apiclient.post(f'/api/seances/{seance.id}/marquer-realisee/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['statut'], 'realisee')

    def test_annuler_seance(self):
        seance = Seance.objects.create(coach=self.coach, client=self.cli,
                                       date_heure='2026-06-01T10:00:00+00:00', duree_minutes=60)
        r = self.apiclient.post(f'/api/seances/{seance.id}/annuler/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        seance.refresh_from_db()
        self.assertEqual(seance.statut, 'annulee')


class FactureTests(TestCase):
    def setUp(self):
        self.coach = make_coach()
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.cli = Client.objects.create(coach=self.coach, prenom='A', nom='B', email='a@b.com')

    def test_create_facture_auto_numero(self):
        r = self.client.post('/api/factures/', {
            'client': str(self.cli.id),
            'montant_ht': '150.00', 'montant_ttc': '150.00', 'taux_tva': '0',
            'date_emission': str(date.today()), 'date_echeance': str(date.today() + timedelta(days=30)),
            'lignes': [{'description': 'Coaching', 'quantite': 1, 'prix_unitaire': 150}],
        }, format='json')
        self.assertEqual(r.status_code, 201)
        year = date.today().year
        self.assertTrue(r.data['numero'].startswith(f'FAC-{year}-'))

    def test_marquer_payee(self):
        facture = Facture.objects.create(
            coach=self.coach, client=self.cli, numero='FAC-2026-001',
            montant_ht=100, montant_ttc=100, taux_tva=0,
            date_emission=date.today(), date_echeance=date.today() + timedelta(days=30),
            statut='envoyee',
        )
        r = self.client.post(f'/api/factures/{facture.id}/marquer-payee/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['statut'], 'payee')

    def test_facture_stats(self):
        r = self.client.get('/api/factures/stats/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('revenus_mois', r.data)


class TemplateMessageTests(TestCase):
    def setUp(self):
        self.coach = make_coach()
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.cli = Client.objects.create(coach=self.coach, prenom='Marie', nom='Dupont', email='m@d.com')

    def test_appliquer_template_ok(self):
        t = TemplateMessage.objects.create(
            coach=self.coach, nom='Test', categorie='rappel',
            sujet='Rappel', contenu='Bonjour {prenom} !',
        )
        r = self.client.post(f'/api/templates-messages/{t.id}/appliquer/',
                             {'client_id': str(self.cli.id)}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['contenu'], 'Bonjour Marie !')

    def test_appliquer_template_bad_placeholder(self):
        t = TemplateMessage.objects.create(
            coach=self.coach, nom='Bug', categorie='custom',
            sujet='Test', contenu='Bonjour {prenom}, coach {nom_coach}',
        )
        r = self.client.post(f'/api/templates-messages/{t.id}/appliquer/',
                             {'client_id': str(self.cli.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('error', r.data)


class DashboardTests(TestCase):
    def setUp(self):
        self.coach = make_coach()
        token, _ = Token.objects.get_or_create(user=self.coach)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_dashboard_returns_all_fields(self):
        r = self.client.get('/api/dashboard/')
        self.assertEqual(r.status_code, 200)
        for field in ['clients_actifs', 'seances_semaine', 'seances_restantes',
                      'revenus_mois', 'taux_completion', 'alertes_non_lues',
                      'messages_non_lus', 'prochaines_seances', 'clients_avancement']:
            self.assertIn(field, r.data)
