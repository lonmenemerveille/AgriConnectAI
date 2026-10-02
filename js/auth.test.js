// js/auth.test.js

const { validerInscription, determinerRole, verifierConnexion } = require('./auth');

// =========================================================================
// Tests : validerInscription
// =========================================================================

test('accepte email et mot de passe remplis', () => {
    const resultat = validerInscription("teston@mail.com", "motdepasse123");
    expect(resultat.valide).toBe(true);
});

test('rejette si email vide', () => {
    const resultat = validerInscription("", "motdepasse123");
    expect(resultat.valide).toBe(false);
    expect(resultat.erreur).toBe("Veuillez remplir tous les champs obligatoires.");
});

test('rejette si mot de passe vide', () => {
    const resultat = validerInscription("teston@mail.com", "");
    expect(resultat.valide).toBe(false);
});

test('rejette si email et mot de passe vides', () => {
    const resultat = validerInscription("", "");
    expect(resultat.valide).toBe(false);
});

// =========================================================================
// Tests : determinerRole
// =========================================================================

test('détecte le rôle producteur', () => {
    expect(determinerRole("🌾 Producteur")).toBe("producteur");
});

test('détecte le rôle transporteur', () => {
    expect(determinerRole("🚚 Transporteur")).toBe("transporteur");
});

test('rôle par défaut = acheteur si texte ne correspond à rien', () => {
    expect(determinerRole("🛒 Acheteur")).toBe("acheteur");
});

test('rôle par défaut = acheteur si aucun texte fourni', () => {
    expect(determinerRole(null)).toBe("acheteur");
});

// =========================================================================
// Tests : verifierConnexion
// =========================================================================

test('connexion réussie avec bon email et mot de passe (compte enregistré)', () => {
    const compte = { email: "a@b.com", password: "1234", role: "producteur" };
    const resultat = verifierConnexion("a@b.com", "1234", compte);
    expect(resultat.succes).toBe(true);
    expect(resultat.role).toBe("producteur");
});

test('connexion échoue avec mauvais mot de passe', () => {
    const compte = { email: "a@b.com", password: "1234", role: "producteur" };
    const resultat = verifierConnexion("a@b.com", "wrong", compte);
    expect(resultat.succes).toBe(false);
});

test('connexion échoue avec mauvais email', () => {
    const compte = { email: "a@b.com", password: "1234", role: "producteur" };
    const resultat = verifierConnexion("autre@b.com", "1234", compte);
    expect(resultat.succes).toBe(false);
});

test('connexion réussie avec les identifiants par défaut (aucun compte enregistré)', () => {
    const resultat = verifierConnexion("votre-adresse@gmail.com", "123456", null);
    expect(resultat.succes).toBe(true);
    expect(resultat.role).toBe("producteur");
});