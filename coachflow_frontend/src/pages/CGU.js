import { Link } from 'react-router-dom';

function H2({ children }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '28px 0 10px' }}>{children}</h2>;
}
function P({ children }) {
  return <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, margin: '0 0 10px' }}>{children}</p>;
}
function Ul({ items }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '0 0 10px' }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, marginBottom: 4 }}>{it}</li>
      ))}
    </ul>
  );
}

export default function CGU() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <Link to="/compte" style={{ fontSize: 13, color: '#6366F1', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
        ← Retour
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
        Conditions Générales d'Utilisation
      </h1>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
        Politique de confidentialité — Conformité RGPD
      </p>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 32 }}>
        Dernière mise à jour : juin 2026
      </p>

      <div className="card">

        {/* ── 1. OBJET ── */}
        <H2>1. Objet</H2>
        <P>
          TrainFlow est une plateforme SaaS destinée aux coachs sportifs professionnels, leur permettant de gérer leurs clients,
          planifier des séances, suivre la nutrition et la progression, et communiquer via une messagerie intégrée.
          Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service TrainFlow.
        </P>
        <P>
          En créant un compte, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions,
          vous ne devez pas utiliser le service.
        </P>

        {/* ── 2. COMPTE ── */}
        <H2>2. Création et responsabilité du compte</H2>
        <P>
          L'accès au service est réservé aux personnes majeures. Vous êtes responsable de la confidentialité
          de vos identifiants. Toute activité effectuée depuis votre compte engage votre responsabilité.
          Vous vous engagez à fournir des informations exactes et à les maintenir à jour.
        </P>
        <P>
          TrainFlow se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU,
          de fausse identité, ou d'utilisation frauduleuse du service.
        </P>

        {/* ── 3. DONNÉES COLLECTÉES ── */}
        <H2>3. Données personnelles collectées</H2>
        <P>TrainFlow collecte et traite les données suivantes dans le cadre de la fourniture du service :</P>
        <Ul items={[
          'Données d\'identification : nom, prénom, adresse email, nom d\'utilisateur',
          'Données clients des coachs : nom, prénom, email, numéro de téléphone des clients',
          'Données de santé : mesures corporelles, poids, photos de progression, données nutritionnelles',
          'Données d\'utilisation : séances planifiées, programmes d\'entraînement, historique de connexion',
          'Données financières : montants des factures (aucune donnée bancaire n\'est stockée directement)',
          'Communications : messages échangés entre coach et client via la messagerie intégrée',
        ]} />
        <P>
          Les données de santé bénéficient d'une protection renforcée conformément au RGPD (article 9).
          Elles sont collectées uniquement dans le cadre de la relation contractuelle coach-client
          et ne sont accessibles qu'aux personnes concernées.
        </P>

        {/* ── 4. FINALITÉS ── */}
        <H2>4. Finalités du traitement</H2>
        <P>Les données sont collectées pour les finalités suivantes :</P>
        <Ul items={[
          'Fourniture et amélioration du service TrainFlow',
          'Gestion des comptes utilisateurs et authentification',
          'Suivi de la progression et des objectifs des clients',
          'Envoi d\'emails transactionnels (confirmations, rappels, factures)',
          'Facturation et comptabilité',
          'Support client',
        ]} />
        <P>
          Aucune donnée n'est utilisée à des fins publicitaires ni transmise à des tiers à des fins commerciales.
        </P>

        {/* ── 5. DURÉE DE CONSERVATION ── */}
        <H2>5. Durée de conservation</H2>
        <Ul items={[
          'Données de compte actif : conservées pendant toute la durée de l\'abonnement',
          'Après suppression du compte : désactivation immédiate puis purge définitive sous 30 jours (période de récupération)',
          'Données de facturation : conservées 10 ans conformément aux obligations comptables françaises',
          'Logs de connexion : conservés 12 mois',
        ]} />

        {/* ── 6. VOS DROITS ── */}
        <H2>6. Vos droits (RGPD)</H2>
        <P>Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez des droits suivants :</P>
        <Ul items={[
          'Droit d\'accès : obtenir une copie de vos données personnelles',
          'Droit de rectification : corriger vos données inexactes ou incomplètes',
          'Droit à l\'effacement : demander la suppression de vos données (« droit à l\'oubli »)',
          'Droit à la portabilité : recevoir vos données dans un format structuré et lisible par machine',
          'Droit d\'opposition : vous opposer à certains traitements de vos données',
          'Droit à la limitation : demander la suspension temporaire du traitement de vos données',
        ]} />
        <P>
          Pour exercer ces droits, contactez-nous à <strong>support@trainflow.fr</strong>.
          Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </P>
        <P>
          <strong>Portabilité — Export de vos données :</strong> vous pouvez télécharger l'intégralité
          de vos données au format JSON depuis la page « Mon compte » → « Exporter mes données ».
          L'archive ZIP générée contient toutes les informations associées à votre compte
          dans un format structuré et lisible par machine.
        </P>
        <P>
          <strong>Suppression du compte :</strong> vous pouvez supprimer votre compte directement depuis la page
          « Mon compte ». Votre compte est désactivé immédiatement, puis vos données sont effacées
          définitivement après un délai de 30 jours. Pendant cette période, vous pouvez nous contacter
          à <strong>support@trainflow.fr</strong> pour réactiver le compte sans perte de données.
          Un email de confirmation est envoyé à chaque demande de suppression.
          Les données de facturation sont conservées par obligation légale (10 ans).
        </P>

        {/* ── 7. SÉCURITÉ ── */}
        <H2>7. Sécurité des données</H2>
        <P>
          TrainFlow met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
          chiffrement HTTPS, authentification par token sécurisé, accès restreint aux données par rôle,
          hébergement en Europe. Malgré ces mesures, aucun système n'est infaillible.
          En cas de violation de données vous concernant, vous en serez informé dans les délais légaux.
        </P>

        {/* ── 8. COOKIES ── */}
        <H2>8. Cookies</H2>
        <P>
          TrainFlow n'utilise pas de cookies de traçage publicitaire. Seuls des cookies techniques strictement
          nécessaires au fonctionnement du service sont utilisés (authentification, préférences utilisateur).
          Ces cookies ne nécessitent pas votre consentement explicite.
        </P>

        {/* ── 9. RESPONSABLE DU TRAITEMENT ── */}
        <H2>9. Responsable du traitement</H2>
        <P>
          Le responsable du traitement est TrainFlow. Pour toute question relative à vos données personnelles :
          <br /><strong>Email :</strong> support@trainflow.fr
        </P>

        {/* ── 10. MODIFICATIONS ── */}
        <H2>10. Modifications des CGU</H2>
        <P>
          TrainFlow se réserve le droit de modifier les présentes CGU à tout moment. En cas de modification substantielle,
          les utilisateurs seront informés par email au moins 15 jours avant l'entrée en vigueur des nouvelles conditions.
          La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles CGU.
        </P>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--bdr)', fontSize: 12, color: '#94a3b8' }}>
          Pour toute question : <strong>support@trainflow.fr</strong>
        </div>
      </div>
    </div>
  );
}
