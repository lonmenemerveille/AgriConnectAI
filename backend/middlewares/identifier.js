module.exports = (req, res, next) => {
  const id = Number(req.headers['x-user-id']);
  if (!id) return res.status(401).json({ erreur: 'Connexion requise.' });
  req.idAcheteur = id;
  next();
};