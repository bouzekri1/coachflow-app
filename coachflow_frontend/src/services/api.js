const BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const tk = () => localStorage.getItem('cf_token');

async function req(method, path, body, opts = {}) {
  const isForm = opts === true || opts.isForm;
  const raw    = opts.raw || false;
  const headers = {};
  if (tk()) headers['Authorization'] = `Token ${tk()}`;
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (BASE.includes('loca.lt')) headers['bypass-tunnel-reminder'] = 'true';
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  if (raw) {
    if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
    return res.blob();
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Erreur serveur (${res.status})`);
  }
  if (!res.ok) {
    const msg = data.error || data.detail
      || (data && typeof data === 'object'
          ? Object.entries(data).map(([k, v]) => `${k} : ${[].concat(v).join(', ')}`).join(' | ')
          : null)
      || 'Erreur serveur';
    throw new Error(msg);
  }
  return data;
}

export const api = {
  login: (u, p) => req('POST', '/auth/login/', { username: u, password: p }),
  passwordResetRequest: (email) => req('POST', '/auth/password-reset/', { email }),
  passwordResetConfirm: (token, password) => req('POST', '/auth/password-reset/confirm/', { token, password }),
  googleLogin: (idToken) => req('POST', '/auth/google/', { id_token: idToken }),
  register: (d) => req('POST', '/auth/register/', d),
  verifyEmail: (token) => req('GET', `/auth/verify-email/?token=${encodeURIComponent(token)}`),
  me: () => req('GET', '/auth/me/'),
  onboardingDone: () => req('POST', '/auth/onboarding-done/'),
  updateMe: (d) => req('PATCH', '/auth/me/', d),
  deleteAccount: (confirm) => req('DELETE', '/auth/me/', { confirm }),
  dashboard: () => req('GET', '/dashboard/'),

  clients: {
    list: (q = '') => req('GET', `/clients/${q}`),
    get: (id) => req('GET', `/clients/${id}/`),
    create: (d) => req('POST', '/clients/', d),
    update: (id, d) => req('PATCH', `/clients/${id}/`, d),
    creerCompte: (id, d) => req('POST', `/clients/${id}/creer-compte/`, d),
    uploadAvatar: (id, file) => {
      const fd = new FormData(); fd.append('image', file);
      return req('POST', `/clients/${id}/upload-avatar/`, fd, true);
    },
    uploadPhoto: (id, file, meta) => {
      const fd = new FormData(); fd.append('image', file);
      Object.entries(meta).forEach(([k, v]) => fd.append(k, v));
      return req('POST', `/clients/${id}/upload-photo/`, fd, true);
    },
    nutritionJournal: (id, date = '') => req('GET', `/clients/${id}/journal/${date ? '?date=' + date : ''}`),
    notes: (id) => req('GET', `/clients/${id}/notes/`),
    addNote: (id, d) => req('POST', `/clients/${id}/notes/`, d),
    mesures: (id) => req('GET', `/clients/${id}/mesures/`),
    addMesure: (id, d) => req('POST', `/clients/${id}/mesures/`, d),
    historique: (id) => req('GET', `/clients/${id}/historique-seances/`),
    objectifs: (id) => req('GET', `/clients/${id}/objectifs/`),
    addObjectif: (id, d) => req('POST', `/clients/${id}/objectifs/`, d),
    updateObjectif: (clientId, objId, d) => req('PATCH', `/clients/${clientId}/objectifs/${objId}/`, d),
    checkins: (id) => req('GET', `/clients/${id}/checkins/`),
    performances: (id) => req('GET', `/clients/${id}/performances/`),
    nutritionHistorique: (id, days = 30) => req('GET', `/clients/${id}/nutrition/historique/?days=${days}`),
    genererPlanIa: (id, params) => req('POST', `/clients/${id}/generer-plan-ia/`, params),
    sauvegarderPlanIa: (id, plan) => req('POST', `/clients/${id}/sauvegarder-plan-ia/`, plan),
    plans: (id) => req('GET', `/clients/${id}/plans/`),
  },

  programmes: {
    list:           () => req('GET', '/programmes/'),
    create:         (d) => req('POST', '/programmes/', d),
    update:         (id, d) => req('PATCH', `/programmes/${id}/`, d),
    delete:         (id) => req('DELETE', `/programmes/${id}/`),
    assigner:       (id, d) => req('POST', `/programmes/${id}/assigner/`, d),
    plan:           (id) => req('GET', `/programmes/${id}/plan/`),
    addJour:        (id, d) => req('POST', `/programmes/${id}/jours/`, d),
    deleteJour:     (id, jourId) => req('DELETE', `/programmes/${id}/jours/${jourId}/`),
    addExercice:    (id, jourId, d) => req('POST', `/programmes/${id}/jours/${jourId}/exercices/`, d),
    updateExercice: (id, jourId, exId, d) => req('PATCH', `/programmes/${id}/jours/${jourId}/exercices/${exId}/`, d),
    deleteExercice: (id, jourId, exId) => req('DELETE', `/programmes/${id}/jours/${jourId}/exercices/${exId}/`),
  },

  seances: {
    list: (q = '') => req('GET', `/seances/${q}`),
    detail: (id) => req('GET', `/seances/${id}/`),
    create: (d) => req('POST', '/seances/', d),
    marquerRealisee: (id) => req('POST', `/seances/${id}/marquer-realisee/`, {}),
    annuler: (id) => req('POST', `/seances/${id}/annuler/`, {}),
    delete: (id) => req('DELETE', `/seances/${id}/`),
    semaine: () => req('GET', '/seances/planning-semaine/'),
  },

  conversations: {
    list: () => req('GET', '/conversations/'),
    messages: (id, after) => req('GET', `/conversations/${id}/messages/${after ? '?after=' + after : ''}`),
    send: (id, contenu) => req('POST', `/conversations/${id}/messages/`, { contenu }),
    sendImage: (id, file) => { const fd = new FormData(); fd.append('image', file); return req('POST', `/conversations/${id}/messages/`, fd, true); },
    demarrer: (client_id) => req('POST', '/conversations/demarrer/', { client_id }),
  },

  factures: {
    list: (q = '') => req('GET', `/factures/${q}`),
    create: (d) => req('POST', '/factures/', d),
    marquerPayee: (id) => req('POST', `/factures/${id}/marquer-payee/`),
    envoyer: (id) => req('POST', `/factures/${id}/envoyer/`),
    envoyerEmail: (id) => req('POST', `/factures/${id}/envoyer-email/`),
    pdf: (id) => req('GET', `/factures/${id}/pdf/`, null, { raw: true }),
    stats: () => req('GET', '/factures/stats/'),
  },

  alertes: {
    list: () => req('GET', '/alertes/'),
    marquerLue: (id) => req('POST', `/alertes/${id}/marquer-lue/`),
    traiter: (id) => req('POST', `/alertes/${id}/traiter/`),
  },

  portal: {
    dashboard: () => req('GET', '/portal/dashboard/'),
    updateObjectif: (id, d) => req('PATCH', `/portal/objectifs/${id}/`, d),
    seances: () => req('GET', '/portal/seances/'),
    mesures: () => req('GET', '/portal/mesures/'),
    addMesure: (d) => req('POST', '/portal/mesures/', d),
    conversation: (after) => req('GET', `/portal/conversation/${after ? '?after=' + after : ''}`),
    sendMessage: (contenu) => req('POST', '/portal/conversation/', { contenu }),
    sendImage: (file) => { const fd = new FormData(); fd.append('image', file); return req('POST', '/portal/conversation/', fd, true); },
    recettes: () => req('GET', '/portal/nutrition/recettes/'),
    unreadMessages: () => req('GET', '/portal/messages/unread/'),
    demanderAnnulation: (id) => req('POST', `/portal/seances/${id}/demander-annulation/`, {}),
    seanceDetail: (id) => req('GET', `/portal/seances/${id}/detail/`),
    logSerie: (seanceId, d) => req('POST', `/portal/seances/${seanceId}/log/`, d),
    deleteSerie: (seanceId, logId) => req('DELETE', `/portal/seances/${seanceId}/log/${logId}/`),
    photos: () => req('GET', '/portal/photos/'),
    uploadPhoto: (fd) => req('POST', '/portal/photos/', fd, true),
    deletePhoto: (id) => req('DELETE', `/portal/photos/${id}/`),
    checkin: () => req('GET', '/portal/checkin/'),
    submitCheckin: (d) => req('POST', '/portal/checkin/', d),
    programme: () => req('GET', '/portal/programme/'),
  },

  exercices: {
    list: (q = '') => req('GET', `/exercices/${q}`),
    create: (d) => req('POST', '/exercices/', d),
    update: (id, d) => req('PATCH', `/exercices/${id}/`, d),
    delete: (id) => req('DELETE', `/exercices/${id}/`),
    seanceExercices: (seanceId) => req('GET', `/seances/${seanceId}/exercices/`),
    addToSeance: (seanceId, d) => req('POST', `/seances/${seanceId}/exercices/`, d),
    updateInSeance: (seanceId, itemId, d) => req('PATCH', `/seances/${seanceId}/exercices/${itemId}/`, d),
    removeFromSeance: (seanceId, itemId) => req('DELETE', `/seances/${seanceId}/exercices/${itemId}/`),
  },

  nutrition: {
    aliments: (q = '') => req('GET', `/aliments/${q}`),
    createAliment: (d) => req('POST', '/aliments/custom/', d),
    recettes: (q = '') => req('GET', `/recettes/${q}`),
    createRecette: (d) => req('POST', '/recettes/', d),
    updateRecette: (id, d) => req('PATCH', `/recettes/${id}/`, d),
    deleteRecette: (id) => req('DELETE', `/recettes/${id}/`),
    personnaliserRecette: (id) => req('POST', `/recettes/${id}/personnaliser/`, {}),
    uploadPhotoRecette: (id, file) => { const fd = new FormData(); fd.append('photo', file); return req('POST', `/recettes/${id}/upload-photo/`, fd, true); },
    addIngredient: (id, d) => req('POST', `/recettes/${id}/add_ingredient/`, d),
    removeIngredient: (id, ingId) => req('DELETE', `/recettes/${id}/ingredient/${ingId}/`),
    plans: () => req('GET', '/plans-alimentaires/'),
    createPlan: (d) => req('POST', '/plans-alimentaires/', d),
    updatePlan: (id, d) => req('PATCH', `/plans-alimentaires/${id}/`, d),
    deletePlan: (id) => req('DELETE', `/plans-alimentaires/${id}/`),
    addRepas: (id, d) => req('POST', `/plans-alimentaires/${id}/repas/`, d),
    removeRepas: (id, repasId) => req('DELETE', `/plans-alimentaires/${id}/repas/${repasId}/`),
    addAlimentRepas: (id, repasId, d) => req('POST', `/plans-alimentaires/${id}/repas/${repasId}/aliments/`, d),
    removeAlimentRepas: (id, repasId, arId) => req('DELETE', `/plans-alimentaires/${id}/repas/${repasId}/aliments/${arId}/`),
    assignerPlan: (id, d) => req('POST', `/plans-alimentaires/${id}/assigner/`, d),
    courses: (id) => req('GET', `/plans-alimentaires/${id}/courses/`),
    calculateur: (d) => req('POST', '/nutrition/calculateur/', d),
    portalPlan: () => req('GET', '/portal/nutrition/plan/'),
    portalConversation: (after) => req('GET', `/portal/conversation/${after ? '?after=' + after : ''}`),
    portalJournal: (date = '') => req('GET', `/portal/nutrition/journal/${date ? '?date=' + date : ''}`),
    portalJournalAdd: (d) => req('POST', '/portal/nutrition/journal/', d),
    portalJournalDelete: (id) => req('DELETE', `/portal/nutrition/journal/?id=${id}`),
    portalCourses: () => req('GET', '/portal/nutrition/courses/'),
    portalHistorique: (days = 30) => req('GET', `/portal/nutrition/historique/?days=${days}`),
    portalEau: (date = '') => req('GET', `/portal/nutrition/eau/${date ? '?date=' + date : ''}`),
    portalEauAdd: (d) => req('POST', '/portal/nutrition/eau/', d),
    portalEauDelete: (id) => req('DELETE', `/portal/nutrition/eau/?id=${id}`),
  },
  push: {
    vapidKey:   ()  => req('GET',    '/push/vapid-public-key/'),
    subscribe:  (d) => req('POST',   '/push/subscribe/', d),
    unsubscribe:(d) => req('DELETE', '/push/subscribe/', d),
    sendTo:     (clientId, d) => req('POST', `/push/send/${clientId}/`, d),
  },
};
