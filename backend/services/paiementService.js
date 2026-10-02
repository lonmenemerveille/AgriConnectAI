// SIMULATION. Remplace le corps de payer() par l'appel à l'API de paiement
// (Mobile Money MTN / Orange, ou agrégateur) : le reste du code ne change pas.
async function payer({ montant, mode, telephone }) {
  return { statut: 'reussi', reference: 'SIM-' + Date.now(), mode, montant };
}

module.exports = { payer };