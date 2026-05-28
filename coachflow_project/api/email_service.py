from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import logging
import re

logger = logging.getLogger(__name__)


def _html_to_text(html):
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _send(subject, template, context, to, attachments=None):
    """Envoie un email HTML. Ne lève pas d'exception — logue les erreurs."""
    if not to:
        return
    try:
        html = render_to_string(f'emails/{template}.html', context)
        text = _html_to_text(html)
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [to])
        msg.attach_alternative(html, 'text/html')
        if attachments:
            for name, data, mime in attachments:
                msg.attach(name, data, mime)
        msg.send()
    except Exception as e:
        logger.error(f'Email failed ({template} → {to}): {e}')


def envoyer_confirmation_seance(seance):
    client = seance.client
    if not client.email:
        return
    coach = seance.coach
    coach_name = f"{coach.first_name} {coach.last_name}".strip() or coach.username
    dt = seance.date_heure
    _send(
        subject=f'Séance confirmée – {dt.strftime("%d/%m/%Y à %H:%M")}',
        template='confirmation_seance',
        context={
            'coach_name': coach_name,
            'date': dt.strftime('%A %d %B %Y').capitalize(),
            'heure': dt.strftime('%H:%M'),
            'duree': seance.duree_minutes,
            'type_seance': seance.type_seance,
            'lieu': getattr(seance, 'lieu', ''),
            'notes_avant': seance.notes_avant,
        },
        to=client.email,
    )


def envoyer_rappel_seance(seance):
    client = seance.client
    if not client.email:
        return
    coach = seance.coach
    coach_name = f"{coach.first_name} {coach.last_name}".strip() or coach.username
    dt = seance.date_heure
    _send(
        subject=f'Rappel : séance demain à {dt.strftime("%H:%M")} avec {coach_name}',
        template='rappel_seance',
        context={
            'coach_name': coach_name,
            'date': dt.strftime('%A %d %B %Y').capitalize(),
            'heure': dt.strftime('%H:%M'),
            'duree': seance.duree_minutes,
            'type_seance': seance.type_seance,
            'lieu': getattr(seance, 'lieu', ''),
        },
        to=client.email,
    )


def envoyer_bienvenue_client(client, username, password, coach):
    if not client.email:
        return
    from django.conf import settings as s
    portal_url = getattr(s, 'FRONTEND_URL', 'http://localhost:3000')
    coach_name = f"{coach.first_name} {coach.last_name}".strip() or coach.username
    _send(
        subject=f'Votre espace coaching avec {coach_name}',
        template='bienvenue_client',
        context={
            'prenom': client.prenom,
            'coach_name': coach_name,
            'username': username,
            'password': password,
            'portal_url': portal_url,
        },
        to=client.email,
    )


def envoyer_verification_email(user, token):
    from django.conf import settings as s
    frontend_url = getattr(s, 'FRONTEND_URL', 'http://localhost:3000')
    verification_url = f'{frontend_url}/verify-email?token={token}'
    _send(
        subject='Confirmez votre adresse email – CoachFlow',
        template='verification_email',
        context={
            'prenom': user.first_name or user.username,
            'verification_url': verification_url,
        },
        to=user.email,
    )


def envoyer_reset_password(user, token):
    from django.conf import settings as s
    frontend_url = getattr(s, 'FRONTEND_URL', 'http://localhost:3000')
    reset_url = f'{frontend_url}/reset-password?token={token}'
    prenom = user.first_name or user.username
    _send(
        subject='Réinitialisation de votre mot de passe – CoachFlow',
        template='reset_password',
        context={
            'prenom': prenom,
            'reset_url': reset_url,
        },
        to=user.email,
    )


def envoyer_bienvenue_coach_google(user):
    from django.conf import settings as s
    app_url = getattr(s, 'FRONTEND_URL', 'http://localhost:3000')
    prenom = user.first_name or user.username
    _send(
        subject='Bienvenue sur CoachFlow ! Votre compte est prêt',
        template='bienvenue_coach_google',
        context={
            'prenom': prenom,
            'email': user.email,
            'app_url': app_url,
        },
        to=user.email,
    )


def envoyer_facture_email(facture, pdf_bytes):
    client = facture.client
    if not client.email:
        return False
    coach = facture.coach
    coach_name = f"{coach.first_name} {coach.last_name}".strip() or coach.username
    _send(
        subject=f'Facture {facture.numero} – {coach_name}',
        template='facture',
        context={
            'coach_name': coach_name,
            'numero': facture.numero,
            'montant_ttc': f"{float(facture.montant_ttc):,.2f}".replace(',', ' '),
            'date_emission': facture.date_emission.strftime('%d/%m/%Y'),
            'date_echeance': facture.date_echeance.strftime('%d/%m/%Y'),
            'notes': facture.notes,
        },
        to=client.email,
        attachments=[(f'{facture.numero}.pdf', pdf_bytes, 'application/pdf')],
    )
    return True
