function rejeter(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

const gerer = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    if (!e.status) console.error(e);
    res.status(e.status || 500).json({ erreur: e.status ? e.message : 'Erreur serveur.' });
  });

module.exports = { rejeter, gerer };