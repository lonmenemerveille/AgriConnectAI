const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const MOMO_BASE_URL = 'https://sandbox.momodeveloper.mtn.com'; // sandbox pour tester
const SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
const API_USER = process.env.MOMO_API_USER;
const API_KEY = process.env.MOMO_API_KEY;

async function obtenirToken() {
  const auth = Buffer.from(`${API_USER}:${API_KEY}`).toString('base64');
  const res = await axios.post(
    `${MOMO_BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
      }
    }
  );
  return res.data.access_token;
}

async function demanderPaiement(telephone, montant) {
  const token = await obtenirToken();
  const referenceId = uuidv4();

  await axios.post(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay`,
    {
      amount: montant.toString(),
      currency: 'EUR', // XAF en production
      externalId: referenceId,
      payer: { partyIdType: 'MSISDN', partyId: telephone },
      payerMessage: 'Paiement AgriConnectAI',
      payeeNote: 'Commande produit agricole'
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  return referenceId;
}

async function verifierStatutPaiement(referenceId) {
  const token = await obtenirToken();
  const res = await axios.get(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY
      }
    }
  );
  return res.data.status; // PENDING, SUCCESSFUL, FAILED
}

module.exports = { demanderPaiement, verifierStatutPaiement };