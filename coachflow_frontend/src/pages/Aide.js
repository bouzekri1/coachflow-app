import { useState } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    icon: '🚀',
    title: 'Premiers pas',
    items: [
      {
        q: 'Comment commencer après inscription ?',
        a: (
          <>
            <p>Quatre actions pour être opérationnel en moins de 10 minutes&nbsp;:</p>
            <ol>
              <li>Ajoutez votre premier client (<Link to="/clients?new=1">Clients → + Nouveau</Link>).</li>
              <li>Générez un programme d'entraînement ou un plan alimentaire avec l'IA depuis sa fiche.</li>
              <li>Activez la <Link to="/compte">réservation en ligne</Link> et définissez vos créneaux récurrents.</li>
              <li>Connectez <Link to="/compte">Google Calendar</Link> pour éviter les doubles-réservations.</li>
            </ol>
          </>
        ),
      },
      {
        q: 'Comment ajouter un client ?',
        a: <p>Allez dans <Link to="/clients">Clients</Link> puis « + Nouveau client ». Renseignez prénom, nom, email et objectif principal — le reste peut être complété plus tard. Le client reçoit un mail avec ses identifiants pour accéder à son espace personnel.</p>,
      },
      {
        q: 'Quelle différence entre un programme et un plan alimentaire ?',
        a: <p>Un <strong>programme</strong> contient les séances d'entraînement (exercices, séries, répétitions). Un <strong>plan alimentaire</strong> contient des recettes organisées par jour avec un objectif calorique/macros. Les deux peuvent être assignés au même client en parallèle.</p>,
      },
    ],
  },
  {
    icon: '✨',
    title: 'Intelligence artificielle',
    items: [
      {
        q: 'Comment fonctionne la génération IA ?',
        a: <p>L'IA (Claude Haiku 4.5) prend le profil du client (âge, poids, niveau, objectif, matériel) et génère un programme ou plan personnalisé en quelques secondes. Vous pouvez ensuite l'éditer avant de l'assigner. La qualité dépend des informations renseignées dans la fiche client — plus c'est complet, mieux c'est.</p>,
      },
      {
        q: 'Pourquoi un quota mensuel sur l\'IA ?',
        a: <p>Pour maîtriser les coûts (l'IA consomme de la puissance de calcul payante). Vous avez <strong>10 générations par mois</strong> par défaut en beta. Le compteur se réinitialise le 1er de chaque mois. Si vous avez besoin de plus, contactez le support.</p>,
      },
      {
        q: 'Quand j\'utilise une génération en cache ?',
        a: <p>Si vous relancez exactement la même demande (même client, mêmes paramètres) dans les 24h, le résultat est servi depuis le cache — <strong>gratuitement, sans décompte du quota</strong>. Un toast « ♻️ Résultat depuis le cache » apparaît dans ce cas.</p>,
      },
      {
        q: 'L\'IA peut-elle remplacer mon expertise ?',
        a: <p>Non — c'est un assistant. Vérifiez toujours le contenu généré avant de l'assigner&nbsp;: cohérence avec les blessures du client, charge progressive, équilibre musculaire. L'IA accélère le travail, votre œil de coach reste essentiel.</p>,
      },
    ],
  },
  {
    icon: '📅',
    title: 'Planning & Réservation',
    items: [
      {
        q: 'Comment activer la réservation en ligne ?',
        a: <p>Dans <Link to="/compte">Mon compte → Réservation</Link>, activez la fonctionnalité, choisissez le préavis minimum (ex: 12h), l'horizon (ex: 30 jours), la durée des créneaux, et définissez votre planning hebdomadaire récurrent.</p>,
      },
      {
        q: 'Comment ça marche avec Google Calendar ?',
        a: <p>Une fois Google Calendar connecté&nbsp;: <br/>① toute séance créée dans TrainFlow apparaît dans votre Google Calendar ;<br/>② tout événement « occupé » dans votre Google Calendar bloque automatiquement le créneau côté client. Aucune double-réservation possible.</p>,
      },
      {
        q: 'Faut-il choisir entre planning interne et Google Calendar ?',
        a: <p>Non — les deux cohabitent. Le planning hebdomadaire TrainFlow définit vos plages <em>habituellement</em> disponibles, Google Calendar bloque les <em>exceptions</em> ponctuelles (rendez-vous médical, journée bloquée…).</p>,
      },
      {
        q: 'Un événement « toute la journée » dans Google bloque-t-il les créneaux ?',
        a: <p>Oui par défaut (formation, vacances…). Vous pouvez désactiver ce comportement dans <Link to="/compte">Mon compte → Synchronisation Google Calendar</Link>.</p>,
      },
    ],
  },
  {
    icon: '💰',
    title: 'Facturation',
    items: [
      {
        q: 'Comment générer une facture ?',
        a: <p>Depuis la fiche client → onglet « Facturation » → « + Nouvelle facture ». Renseignez le montant, la date d'échéance et les lignes. Le PDF est généré automatiquement et envoyable par email d'un clic.</p>,
      },
      {
        q: 'Le client peut-il payer en ligne ?',
        a: <p>Pas encore — la connexion Stripe arrive avant la fin de la beta. Pour l'instant, marquez les factures comme « Payées » manuellement après réception du virement / chèque / espèces.</p>,
      },
    ],
  },
  {
    icon: '🏆',
    title: 'Gamification',
    items: [
      {
        q: 'Que sont les streaks et badges ?',
        a: <p>Les <strong>streaks</strong> récompensent l'assiduité (jours consécutifs de check-in, de séances complétées…). Les <strong>badges</strong> sont attribués automatiquement à vos clients lorsqu'ils atteignent certains jalons (1ère séance, 10 séances, premier objectif atteint, etc.).</p>,
      },
      {
        q: 'Mon client n\'a pas reçu le badge alors qu\'il a atteint son objectif',
        a: <p>Le badge se déclenche dès que le statut de l'objectif passe à « Atteint ». Vérifiez sur sa fiche que c'est bien le cas. Si le badge ne s'affiche toujours pas, signalez-le via le bouton 💬 en bas à droite.</p>,
      },
    ],
  },
  {
    icon: '🔒',
    title: 'Données & confidentialité',
    items: [
      {
        q: 'Où sont stockées les données ?',
        a: <p>Hébergées en Europe. Aucune revente à des tiers, aucune publicité. Voir les <Link to="/cgu">CGU et politique de confidentialité</Link>.</p>,
      },
      {
        q: 'Puis-je exporter mes données ?',
        a: <p>Oui (article 20 RGPD). <Link to="/compte">Mon compte → Données & confidentialité → Télécharger mes données</Link> → vous recevez un ZIP contenant tout au format JSON structuré.</p>,
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: <p>Depuis <Link to="/compte">Mon compte → Zone de danger</Link>. Votre compte est désactivé immédiatement, puis vos données sont effacées définitivement après 30 jours. Pendant cette période, vous pouvez nous contacter pour réactiver sans perte de données.</p>,
      },
      {
        q: 'Mon mot de passe est-il bien protégé ?',
        a: <p>Oui — hashé en base avec l'algorithme Argon2/PBKDF2 (impossible à retrouver même par nous). Votre session est authentifiée par un cookie httpOnly (non accessible au JavaScript), avec protection CSRF.</p>,
      },
    ],
  },
  {
    icon: '🐛',
    title: 'Bugs & suggestions',
    items: [
      {
        q: 'Comment signaler un bug ?',
        a: <p>Cliquez sur le bouton <strong>💬</strong> flottant en bas à droite de toutes les pages → choisissez « Bug » → décrivez la reproduction. Nous lisons chaque signalement personnellement.</p>,
      },
      {
        q: 'Comment suggérer une fonctionnalité ?',
        a: <p>Même bouton 💬 → « Suggestion ». En beta, vos retours façonnent le produit — n'hésitez pas, même pour des idées brutes.</p>,
      },
    ],
  },
];


function FAQItem({ q, a, open, onToggle }) {
  return (
    <div style={{ borderBottom: '1px solid var(--bdr)', padding: '4px 0' }}>
      <button onClick={onToggle} style={{
        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 4px', fontSize: 14, fontWeight: 600, color: 'var(--t1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span>{q}</span>
        <span style={{ fontSize: 18, color: 'var(--t3)', transition: 'transform .15s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>⌃</span>
      </button>
      {open && (
        <div style={{
          padding: '0 4px 14px', fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.7,
        }}>
          {a}
        </div>
      )}
    </div>
  );
}


export default function Aide() {
  const [openKey, setOpenKey] = useState(null);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = q
    ? SECTIONS
        .map(s => ({ ...s, items: s.items.filter(it =>
          it.q.toLowerCase().includes(q)
        )}))
        .filter(s => s.items.length > 0)
    : SECTIONS;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 48px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
          💡 Centre d'aide
        </h1>
        <p style={{ fontSize: 14, color: 'var(--t3)', margin: 0 }}>
          Réponses aux questions fréquentes — vous ne trouvez pas ? Utilisez le bouton 💬 en bas à droite.
        </p>
      </div>

      <input
        className="fi"
        placeholder="🔍 Rechercher dans l'aide…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: 18 }}
      />

      {filtered.length === 0 && (
        <div style={{
          background: 'var(--bg)', borderRadius: 10, padding: '32px 20px',
          textAlign: 'center', color: 'var(--t3)', fontSize: 14,
        }}>
          Aucune réponse ne correspond à « <strong>{query}</strong> ».<br/>
          Posez la question directement via le bouton 💬.
        </div>
      )}

      {filtered.map((section, si) => (
        <div key={si} className="card" style={{ marginBottom: 16, padding: '4px 18px 8px' }}>
          <div style={{
            fontSize: 15, fontWeight: 800, padding: '14px 0 8px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid var(--bdr)', marginBottom: 4,
          }}>
            <span style={{ fontSize: 22 }}>{section.icon}</span>
            <span>{section.title}</span>
          </div>
          {section.items.map((it, ii) => {
            const key = `${si}-${ii}`;
            return (
              <FAQItem
                key={key}
                q={it.q}
                a={it.a}
                open={openKey === key}
                onToggle={() => setOpenKey(k => k === key ? null : key)}
              />
            );
          })}
        </div>
      ))}

      <div style={{
        marginTop: 28, padding: '20px 22px', background: '#F8FAFF',
        border: '1px solid #C7D2FE', borderRadius: 12, textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4338CA', marginBottom: 6 }}>
          Toujours bloqué ?
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
          Écrivez-nous à <a href="mailto:support@trainflow.fr" style={{ color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>support@trainflow.fr</a><br/>
          Réponse sous 24h ouvrées.
        </div>
      </div>
    </div>
  );
}
