

/* ==========================================================================
   1. CONFIGURATION
   ========================================================================== */

const API_BASE_URL = "http://localhost:5000/api";
const API_URL = `${API_BASE_URL}/produits`;
const IMAGES_URL = "http://localhost:5000/images";

const PRODUITS_PAR_PAGE = 6;

const flotteAgriConnect = [
  {
    nom: "El Hadj Ousmanou Logistique",
    camion: "Camion Benne 10T",
    base: "Foumbot",
    prixKm: 450,
    note: "⭐ 4.9",
    tel: "+237 677 xx xx xx"
  },
  {
    nom: "Trans-Littoral Express",
    camion: "Camion Frigorifique 5T",
    base: "Mbanga",
    prixKm: 600,
    note: "⭐ 4.8",
    tel: "+237 699 xx xx xx"
  },
  {
    nom: "GIC Coop Logistique du Centre",
    camion: "Fourgonnette 3.5T",
    base: "Mbalmayo",
    prixKm: 350,
    note: "⭐ 4.7",
    tel: "+237 655 xx xx xx"
  },
  {
    nom: "Soudano-Sahel Transports",
    camion: "Gros Porteur 20T",
    base: "Maroua",
    prixKm: 400,
    note: "⭐ 4.6",
    tel: "+237 688 xx xx xx"
  }
];

const distancesCameroun = {
  "Foumbot-Douala": 280,
  "Foumbot-Yaoundé": 320,
  "Foumbot-Bafoussam": 25,
  "Mbanga-Douala": 60,
  "Mbanga-Yaoundé": 300,
  "Mbanga-Bafoussam": 210,
  "Mbalmayo-Douala": 290,
  "Mbalmayo-Yaoundé": 45,
  "Mbalmayo-Bafoussam": 340,
  "Maroua-Douala": 1200,
  "Maroua-Yaoundé": 1000,
  "Maroua-Bafoussam": 1050
};
function enregistrerPositionTransporteur(transporteurId) {
  if (!navigator.geolocation) {
    afficherAlerte("La géolocalisation n'est pas supportée par ce navigateur.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      await fetch(`/api/transporteurs/${transporteurId}/position`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude })
      });

      afficherAlerte("📍 Position enregistrée avec succès !");
    },
    (erreur) => {
      afficherAlerte("Impossible d'obtenir votre position. Autorisez l'accès à la localisation.");
    }
  );
}

/* ==========================================================================
   2. ÉTAT GLOBAL
   ========================================================================== */

let tousLesProduitsCaches = [];
let pageActuelle = 1;
let contenuPanier = [];

/* ==========================================================================
   3. SESSION / RÔLE
   ========================================================================== */

function estConnecte() {
  return sessionStorage.getItem("isLoggedIn") === "true";
}

function getRoleUtilisateur() {
  return (
    sessionStorage.getItem("userRole") ||
    (estConnecte() ? "acheteur" : "visiteur")
  ).toLowerCase().trim();
}

function setRoleUtilisateur(role) {
  sessionStorage.setItem("userRole", role.toLowerCase().trim());
}

function estProducteur() {
  const role = getRoleUtilisateur();

  return (
    role === "producteur" ||
    role === "producer"
  );
}

function estTransporteur() {
  const role = getRoleUtilisateur();

  return (
    role === "transporteur" ||
    role === "carrier"
  );
}

/* ==========================================================================
   4. OUTILS DOM / NOTIFICATIONS
   ========================================================================== */

function getElement(id) {
  return document.getElementById(id);
}

function afficherAlerte(message) {
  alert(message);
}

function afficherAlerteRechercheVide(message) {
  const ancienneAlerte =
    getElement("alerteVideFlottante");

  if (ancienneAlerte) {
    ancienneAlerte.remove();
  }

  const alerte =
    document.createElement("div");

  alerte.id =
    "alerteVideFlottante";

  alerte.textContent =
    message;

  Object.assign(alerte.style, {
    position: "fixed",
    top: "30%",
    left: "50%",
    transform:
      "translate(-50%, -50%) scale(0.9)",
    background: "#d32f2f",
    color: "#fff",
    padding: "16px 28px",
    borderRadius: "30px",
    boxShadow:
      "0 10px 25px rgba(211,47,47,.3)",
    fontSize: "1rem",
    fontWeight: "bold",
    zIndex: "100000",
    textAlign: "center",
    transition: "all .3s ease",
    opacity: "0"
  });

  document.body.appendChild(alerte);

  requestAnimationFrame(() => {
    alerte.style.transform =
      "translate(-50%, -50%) scale(1)";

    alerte.style.opacity = "1";
  });

  setTimeout(() => {
    alerte.style.transform =
      "translate(-50%, -50%) scale(.9)";

    alerte.style.opacity = "0";

    setTimeout(() => {
      alerte.remove();
    }, 300);
  }, 2500);
}

/* ==========================================================================
   5. RECHERCHE INTELLIGENTE
   ========================================================================== */

function normaliserTexte(texte = "") {
  return String(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function calculerSimilarite(
  motSaisi,
  motReel
) {
  const a =
    normaliserTexte(motSaisi);

  const b =
    normaliserTexte(motReel);

  if (!a) {
    return true;
  }

  if (!b) {
    return false;
  }

  if (b.includes(a)) {
    return true;
  }

  if (a.length <= 3) {
    return false;
  }

  const m = a.length;
  const n = b.length;

  let precedent =
    Array.from(
      { length: n + 1 },
      (_, i) => i
    );

  for (let i = 1; i <= m; i++) {
    const courant = [i];

    for (let j = 1; j <= n; j++) {
      const cout =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;

      courant[j] =
        Math.min(
          courant[j - 1] + 1,
          precedent[j] + 1,
          precedent[j - 1] + cout
        );
    }

    precedent = courant;
  }

  const distance =
    precedent[n];

  const tolerance =
    m > 6 ? 2 : 1;

  return distance <= tolerance;
}

function obtenirFiltresCatalogue() {
  const searchInput =
    getElement("searchInput");

  const category =
    getElement("category");

  const term =
    normaliserTexte(
      searchInput?.value || ""
    );

  let cat =
    normaliserTexte(
      category?.value || ""
    );

  if (cat.endsWith("s")) {
    cat =
      cat.slice(0, -1);
  }

  return {
    term,
    cat
  };
}

function produitCorrespondAuxFiltres(
  produit,
  term,
  cat
) {
  const nom =
    normaliserTexte(
      produit.nom_produit
    );

  const categorie =
    normaliserTexte(
      produit.categorie
    );

  const bassin =
    normaliserTexte(
      produit.bassins_production
    );

  const motsNom =
    nom.split(/\s+/);

  const correspondRecherche =
    !term ||
    motsNom.some(mot =>
      calculerSimilarite(
        term,
        mot
      )
    ) ||
    categorie.includes(term) ||
    bassin.includes(term);

  const correspondCategorie =
    !cat ||
    categorie.includes(cat);

  return (
    correspondRecherche &&
    correspondCategorie
  );
}

function filterProducts() {
  pageActuelle = 1;

  afficherPageDuCatalogue(1);

  const bouton =
    getElement("searchBtn");

  const loupe =
    getElement("loupeIcon");

  if (bouton) {
    bouton.style.transform =
      "scale(.92) translateY(3px)";

    bouton.style.transition =
      "transform .1s ease";

    setTimeout(() => {
      bouton.style.transform =
        "scale(1) translateY(0)";
    }, 120);
  }

  if (loupe) {
    loupe.style.transform =
      "rotate(-25deg) scale(1.25)";

    setTimeout(() => {
      loupe.style.transform =
        "rotate(0) scale(1)";
    }, 250);
  }

  const { term } =
    obtenirFiltresCatalogue();

  if (term) {
    const produitsFiltres =
      tousLesProduitsCaches.filter(
        produit =>
          produitCorrespondAuxFiltres(
            produit,
            term,
            obtenirFiltresCatalogue().cat
          )
      );

    if (
      produitsFiltres.length === 0
    ) {
      afficherAlerteRechercheVide(
        `Désolé, aucun produit ne correspond à "${getElement("searchInput")?.value || ""}".`
      );
    }
  }
}

/* ==========================================================================
   6. CATALOGUE PRODUITS + PAGINATION
   ========================================================================== */

async function chargerCatalogueDeLaBase() {
  try {
    const reponse =
      await fetch(API_URL);

    if (!reponse.ok) {
      throw new Error(
        `HTTP ${reponse.status}`
      );
    }

    tousLesProduitsCaches =
      await reponse.json();

    pageActuelle = 1;

    afficherPageDuCatalogue(
      pageActuelle
    );
  } catch (erreur) {
    console.error(
      "Catalogue impossible à charger :",
      erreur
    );

    const conteneur =
      getElement("productGrid");

    if (conteneur) {
      conteneur.innerHTML = `
        <p
          style="
            grid-column:1/-1;
            text-align:center;
            color:#c62828;
          "
        >
        en attente de l'activation du catalogue
         
        </p>
      `;
    }
  }
}

function creerCarteProduit(produit) {
  const nom = produit.nom_produit || "Produit agricole";
  const categorie = produit.categorie || "";
  const bassin = produit.bassins_production || "Non renseigné";
  const format = produit.format_vente_detail || "";
  const prix = Number(produit.prix_unitaire_moyen_fcfa) || 0;
  const id = produit.id ?? "";

  const nomBase = normaliserTexte(nom).replace(/[^a-z0-9]/g, "_");
  const cheminImage = `${IMAGES_URL}/${nomBase}.jpg`;
  const imageParDefaut = `${IMAGES_URL}/default.jpg`;

  return `
    <div class="product-card" data-id="${id}" data-name="${nom}" data-category="${categorie}"
      style="overflow:hidden; border-radius:20px; display:flex; flex-direction:column; background:#141a13; border:1px solid #223020;">

      <div class="product-image"
  style="background-image:url('${cheminImage}'), url('${imageParDefaut}'), linear-gradient(135deg, #1c261a, #2a3928); background-size:cover; background-position:center; position:relative; height:130px; width:100%; display:flex; align-items:center; justify-content:center;">

  <span style="font-size:1.8rem; opacity:.35;">🌾</span>

  <span style="position:absolute; top:10px; left:10px; background:#2e7d32; color:#fff; padding:4px 10px; border-radius:20px; font-size:.68rem; font-weight:700; letter-spacing:.03em;">
    POPULAIRE
  </span>

  <div style="position:absolute; bottom:0; left:0; width:100%; padding:10px 12px; background:linear-gradient(0deg, rgba(0,0,0,.85), transparent);">
    <span style="color:#fff; font-size:.78rem; font-weight:600;">
      📍 ${bassin}
    </span>
  </div>
</div>

      <div class="product-body" style="padding:18px; background:#141a13; text-align:left;">
        <span class="badge-cat" style="color:#4C9A4C; font-size:.72rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase;">
          ${categorie}
        </span>

        <h3 style="margin:6px 0 4px; font-size:1.25rem; color:#fff; font-weight:700;">
          ${nom}
        </h3>

        <p style="font-size:.85rem; color:#9aa79a; margin:0 0 10px;">
          ${format}
        </p>

        <div class="prix" data-price="${prix}" style="font-weight:800; color:#fff; font-size:1.2rem;">
          ${prix.toLocaleString("fr-FR")} FCFA
        </div>
      </div>

      <div class="product-action" style="padding:0 18px 18px; background:#141a13; display:flex; flex-direction:column; gap:10px; margin-top:auto;">
        <div style="display:flex; align-items:center; gap:10px; width:100%;">
          <label style="font-size:.8rem; font-weight:600; color:#9aa79a;">
            Quantité :
          </label>
          <input type="number" class="input-quantite-produit" value="1" min="1" max="100"
            style="flex:1; height:36px; border:1px solid #2a3928; background:#1c261a; color:#fff; border-radius:8px; padding:0 10px; outline:none; font-weight:600; text-align:center;">
        </div>

        <button type="button" class="btn-commander"
          style="width:100%; background:#2e7d32; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:700; font-size:.9rem;">
          Ajouter au Panier 🛒
        </button>
      </div>
    </div>
  `;
}
document.getElementById('formPaiementMoMo').addEventListener('submit', async (event) => {
  event.preventDefault();

  const numero = document.getElementById('numTelephone').value.trim();
  const operateur = document.querySelector('input[name="operateur"]:checked').value;

  // Format général : 9 chiffres
  if (!/^[0-9]{9}$/.test(numero)) {
    afficherAlerte("⚠️ Le numéro doit contenir 9 chiffres.");
    return;
  }

  // Vérification de cohérence opérateur / préfixe
  const verification = verifierCoherenceOperateur(numero, operateur);
  if (!verification.valide) {
    afficherAlerte(`⚠️ ${verification.message}`);
    return;
  }

  // Passage en mode "attente de confirmation"
  document.getElementById('formPaiementMoMo').style.display = 'none';
  document.getElementById('zoneAttentePaiement').style.display = 'flex';

  try {
    const montant = document.getElementById('montantPaiementModal').textContent.replace(/[^0-9]/g, '');

    const reponse = await fetch('/api/paiement/mobile-money', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero, operateur, montant })
    });

    const resultat = await reponse.json();

    if (resultat.statut === 'succes') {
      document.getElementById('texteAttente').textContent = "✅ Paiement confirmé !";
    } else {
      document.getElementById('texteAttente').textContent = "❌ " + (resultat.message || "Paiement refusé.");
    }
  } catch (erreur) {
    document.getElementById('texteAttente').textContent = "⚠️ Erreur de connexion au service de paiement.";
  }
});

function afficherPageDuCatalogue(
  page = 1
) {
  const conteneur =
    getElement("productGrid");

  if (!conteneur) return;

  const {
    term,
    cat
  } =
    obtenirFiltresCatalogue();

  const produitsFiltres =
    tousLesProduitsCaches.filter(
      produit =>
        produitCorrespondAuxFiltres(
          produit,
          term,
          cat
        )
    );

  const totalPages =
    Math.ceil(
      produitsFiltres.length /
      PRODUITS_PAR_PAGE
    );

  if (totalPages > 0) {
    page =
      Math.min(
        Math.max(page, 1),
        totalPages
      );
  } else {
    page = 1;
  }

  pageActuelle = page;

  const debut =
    (page - 1) *
    PRODUITS_PAR_PAGE;

  const produitsPage =
    produitsFiltres.slice(
      debut,
      debut + PRODUITS_PAR_PAGE
    );

  if (
    produitsPage.length === 0
  ) {
    conteneur.innerHTML = `
      <p
        style="
          grid-column:1/-1;
          text-align:center;
          color:#777;
        "
      >
        Aucun produit ne correspond à vos critères.
      </p>
    `;
  } else {
    conteneur.innerHTML =
      produitsPage
        .map(creerCarteProduit)
        .join("");
  }

  gererBoutonsPagination(
    produitsFiltres.length,
    page
  );
}

function gererBoutonsPagination(
  totalProduits,
  page
) {
  const grille =
    getElement("productGrid");

  if (!grille) return;

  let pagination =
    getElement(
      "paginationControls"
    );

  if (!pagination) {
    pagination =
      document.createElement(
        "div"
      );

    pagination.id =
      "paginationControls";

    pagination.style.cssText = `
      display:flex;
      justify-content:center;
      align-items:center;
      gap:15px;
      margin-top:30px;
      width:100%;
      padding-bottom:20px;
    `;

    grille.parentElement?.appendChild(
      pagination
    );
  }

  const totalPages =
    Math.ceil(
      totalProduits /
      PRODUITS_PAR_PAGE
    );

  pagination.innerHTML = `
    <button
      id="btnPrevPage"
      type="button"
      ${page <= 1 ? "disabled" : ""}
      style="
        background:#fff;
        border:1px solid #cbd5e0;
        padding:8px 16px;
        border-radius:6px;
        font-weight:bold;
        cursor:${page <= 1 ? "default" : "pointer"};
        opacity:${page <= 1 ? ".5" : "1"};
      "
    >
      « Précédent
    </button>

    <span
      style="
        font-size:.9rem;
        font-weight:bold;
      "
    >
      Page ${page} sur ${totalPages || 1}
    </span>

    <button
      id="btnNextPage"
      type="button"
      ${page >= totalPages ? "disabled" : ""}
      style="
        background:#fff;
        border:1px solid #cbd5e0;
        padding:8px 16px;
        border-radius:6px;
        font-weight:bold;
        cursor:${page >= totalPages ? "default" : "pointer"};
        opacity:${page >= totalPages ? ".5" : "1"};
      "
    >
      Suivant »
    </button>
  `;

  getElement(
    "btnPrevPage"
  )?.addEventListener(
    "click",
    () => {
      if (pageActuelle > 1) {
        afficherPageDuCatalogue(
          pageActuelle - 1
        );
      }
    }
  );

  getElement(
    "btnNextPage"
  )?.addEventListener(
    "click",
    () => {
      if (
        pageActuelle <
        totalPages
      ) {
        afficherPageDuCatalogue(
          pageActuelle + 1
        );
      }
    }
  );
}

/* ==========================================================================
   7. PANIER
   ========================================================================== */

function ajouterAuPanier(
  nom,
  prix,
  quantite = 1
) {
  const qte =
    Number(quantite);

  if (
    !Number.isInteger(qte) ||
    qte < 1
  ) {
    afficherAlerte(
      "⚠️ Veuillez saisir une quantité valide."
    );

    return;
  }

  const articleExistant =
    contenuPanier.find(
      article =>
        article.nom === nom
    );

  if (articleExistant) {
    articleExistant.quantite += qte;
  } else {
    contenuPanier.push({
      nom,
      prix: Number(prix),
      quantite: qte
    });
  }

  mettreAJourAffichagePanier();
}

function mettreAJourAffichagePanier() {
  const liste =
    getElement(
      "listeElementsPanier"
    );

  const badge =
    getElement(
      "panierBadge"
    );

  const total =
    getElement(
      "panierTotalPrix"
    );

  const messageVide =
    getElement(
      "panierVideMessage"
    );

  if (
    !liste ||
    !badge ||
    !total
  ) {
    return;
  }

  liste.innerHTML = "";

  if (
    contenuPanier.length === 0
  ) {
    badge.textContent = "0";
    total.textContent =
      "0 FCFA";

    if (messageVide) {
      messageVide.style.display =
        "block";

      liste.appendChild(
        messageVide
      );
    }

    return;
  }

  if (messageVide) {
    messageVide.style.display =
      "none";
  }

  let prixTotalGlobal = 0;
  let quantiteTotale = 0;

  contenuPanier.forEach(
    (article, index) => {
      const coutLigne =
        article.prix *
        article.quantite;

      prixTotalGlobal +=
        coutLigne;

      quantiteTotale +=
        article.quantite;

      liste.insertAdjacentHTML(
        "beforeend",
        `
        <div
          class="item-panier"
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            background:#fafafa;
            padding:10px;
            border-radius:6px;
            border:1px solid #eaeaea;
            font-size:.85rem;
            margin-bottom:6px;
          "
        >

          <div
            style="
              text-align:left;
              max-width:190px;
            "
          >

            <b
              style="
                color:#222;
                display:block;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
                font-size:.9rem;
              "
            >
              ${article.nom}
            </b>

            <small
              style="
                color:#666;
                font-weight:500;
              "
            >
              ${article.prix.toLocaleString("fr-FR")} F
              × ${article.quantite}
            </small>

          </div>

          <div
            style="
              display:flex;
              align-items:center;
              gap:8px;
            "
          >

            <strong
              style="
                color:#e65100;
              "
            >
              ${coutLigne.toLocaleString("fr-FR")} F
            </strong>

            <button
              type="button"
              class="btn-retirer-panier"
              data-index="${index}"
              style="
                background:none;
                border:none;
                color:#f44336;
                cursor:pointer;
                font-size:.95rem;
                padding:2px;
              "
              title="Supprimer"
            >
              🗑️
            </button>

          </div>

        </div>
        `
      );
    }
  );

  total.textContent =
    `${prixTotalGlobal.toLocaleString("fr-FR")} FCFA`;

  badge.textContent =
    String(quantiteTotale);
}

function retirerDuPanier(
  index
) {
  const indexNumerique =
    Number(index);

  if (
    !Number.isInteger(
      indexNumerique
    ) ||
    indexNumerique < 0 ||
    indexNumerique >=
      contenuPanier.length
  ) {
    return;
  }

  contenuPanier.splice(
    indexNumerique,
    1
  );

  mettreAJourAffichagePanier();
}

function initialiserGestionPanier() {
  const boutonPanier =
    getElement(
      "miniPanierBtn"
    );

  const dropdown =
    getElement(
      "dropdownPanier"
    );

  if (
    boutonPanier &&
    dropdown
  ) {
    boutonPanier.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        const ouvert =
          dropdown.style.display !==
          "flex";

        dropdown.style.display =
          ouvert
            ? "flex"
            : "none";

        if (ouvert) {
          mettreAJourAffichagePanier();
        }
      }
    );

    dropdown.addEventListener(
      "click",
      event => {
        event.stopPropagation();
      }
    );

    document.addEventListener(
      "click",
      () => {
        dropdown.style.display =
          "none";
      }
    );
  }

  document.addEventListener(
    "click",
    event => {
      const boutonCommander =
        event.target.closest(
          ".btn-commander"
        );

      const boutonRetirer =
        event.target.closest(
          ".btn-retirer-panier"
        );

      if (boutonRetirer) {
        event.preventDefault();

        retirerDuPanier(
          boutonRetirer.dataset.index
        );

        return;
      }

      if (!boutonCommander) {
        return;
      }

      event.preventDefault();

      if (
        !estConnecte() ||
        getRoleUtilisateur() ===
          "visiteur"
      ) {
        afficherAlerte(
          "🔐 Identification requise.\nConnectez-vous d'abord pour effectuer un achat."
        );

        window.location.href =
          "login.html";

        return;
      }

      const carte =
        boutonCommander.closest(
          ".product-card"
        );

      if (!carte) return;

      const nom =
        carte.dataset.name;

      const prix =
        Number(
          carte.querySelector(
            ".prix"
          )?.dataset.price || 0
        );

      const input =
        carte.querySelector(
          ".input-quantite-produit"
        );

      const quantite =
        Number(
          input?.value || 1
        );

      ajouterAuPanier(
        nom,
        prix,
        quantite
      );

      afficherAlerte(
        `🎉 Succès : ${quantite} lot(s) de "${nom}" ajouté(s) !`
      );

      const miniPanier =
        getElement(
          "miniPanierBtn"
        );

      if (miniPanier) {
        miniPanier.style.transform =
          "scale(1.2)";

        setTimeout(() => {
          miniPanier.style.transform =
            "scale(1)";
        }, 150);
      }
    }
  );
}

/* ==========================================================================
   8. PAIEMENT MOBILE MONEY
   ========================================================================== */

const PREFIXES_MTN = ["67", "650", "651", "652", "653", "654", "680", "681", "682", "683", "684", "685", "686", "687", "688", "689"];
const PREFIXES_ORANGE = ["69", "655", "656", "657", "658", "659", "640", "641", "642", "643", "644"];

function verifierCoherenceOperateur(numero, operateur) {
  const correspond = (liste) => liste.some(prefixe => numero.startsWith(prefixe));

  if (operateur === "MTN" && !correspond(PREFIXES_MTN)) {
    return { valide: false, message: "Ce numéro ne correspond pas à un compte MTN Mobile Money." };
  }

  if (operateur === "Orange" && !correspond(PREFIXES_ORANGE)) {
    return { valide: false, message: "Ce numéro ne correspond pas à un compte Orange Money." };
  }

  return { valide: true };
}

function attendre(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ouvrirModalPaiement() {
  const modal = getElement("modalPaiement");
  const formulaire = getElement("formPaiementMoMo");
  const attente = getElement("zoneAttentePaiement");
  const total = getElement("panierTotalPrix");
  const montant = getElement("montantPaiementModal");

  if (!modal || !formulaire || !attente) return;

  if (contenuPanier.length === 0) {
    afficherAlerte("Votre panier est vide !");
    return;
  }

  if (montant && total) {
    montant.textContent = total.textContent;
  }

  modal.style.display = "flex";
  formulaire.style.display = "flex";
  attente.style.display = "none";
}

function fermerModalPaiement() {
  const modal = getElement("modalPaiement");
  if (modal) modal.style.display = "none";
}

async function traiterPaiement(event) {
  event.preventDefault();

  if (contenuPanier.length === 0) {
    afficherAlerte("Votre panier est vide !");
    return;
  }

  const numeroInput = getElement("numTelephone");
  const operateurInput = document.querySelector('input[name="operateur"]:checked');

  const numero = numeroInput?.value.trim() || "";
  const operateur = operateurInput?.value || "";

  // --- Validation ---
  if (!/^[0-9]{9}$/.test(numero)) {
    afficherAlerte("Le numéro doit contenir 9 chiffres.");
    return;
  }

  const verification = verifierCoherenceOperateur(numero, operateur);
  if (!verification.valide) {
    afficherAlerte(verification.message);
    return;
  }

  // --- Passage à l'écran d'attente ---
  const formulaire = getElement("formPaiementMoMo");
  const attente = getElement("zoneAttentePaiement");
  const texteAttente = getElement("texteAttente");

  if (!formulaire || !attente || !texteAttente) return;

  formulaire.style.display = "none";
  attente.style.display = "flex";

  texteAttente.innerHTML = `📲 Envoi du ticket vers le <b>+237 ${numero}</b>...`;
  await attendre(2000);

  texteAttente.innerHTML = `⏳ Autorisation par <b>${operateur} Money</b>...`;
  await attendre(2000);

  const premierArticleCommande = {
    nom: contenuPanier[0].nom,
    prix: contenuPanier[0].prix,
    quantite: contenuPanier[0].quantite
  };

  contenuPanier = [];
  mettreAJourAffichagePanier();

  afficherConfirmationPaiement(texteAttente, premierArticleCommande);
}

function afficherConfirmationPaiement(conteneur, articleCommande) {
  conteneur.innerHTML = `
    <div style="text-align:center; color:#1b5e20; padding:15px; width:100%; box-sizing:border-box;">
      <h4 style="margin:0 0 10px; font-weight:800; color:#2e7d32; font-size:1.1rem;">
        🎉 Paiement validé avec succès !
      </h4>
      <p style="font-size:.85rem; color:#444; margin-bottom:15px; line-height:1.4;">
        Vos fonds ont été sécurisés par AgriConnectAI.
        Vos denrées attendent un acheminement logistique.
      </p>
      <button type="button" id="btnDeclencherIA" style="background:#e65100; color:#fff; border:none; padding:12px 24px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:.95rem;">
        🤖 Activer l'optimisation de transport IA
      </button>
    </div>
  `;

  getElement("btnDeclencherIA")?.addEventListener("click", async (eventIA) => {
    eventIA.preventDefault();
    conteneur.innerHTML = "⏳ L'IA calcule les distances et recherche le transporteur optimal...";
    await executerMatchingLogistiqueIA(articleCommande);
  });
}
function simulerTrajetLogistique() {
  const depart =
    getElement(
      "departLoc"
    )?.value;

  const arrivee =
    getElement(
      "arriveeLoc"
    )?.value;

  const poids =
    Number(
      getElement(
        "poidsTonne"
      )?.value
    ) || 1;

  const type =
    getElement(
      "chargeType"
    )?.value ||
    "standard";

  const resultat =
    getElement(
      "transportResult"
    );

  const liste =
    getElement(
      "listeTransporteursMatches"
    );

  const statut =
    getElement(
      "statusMatching"
    );

  if (
    !resultat ||
    !liste
  ) {
    return;
  }

  const distance =
    obtenirDistance(
      depart,
      arrivee
    );

  const multiplicateur =
    type === "frais"
      ? 1.2
      : 1;

  const coutTotal =
    Math.round(
      distance *
        400 *
        multiplicateur *
        (
          1 +
          (poids - 1) *
          0.3
        )
    );

  resultat.style.display =
    "block";

  resultat.innerHTML = `
    <h4
      style="
        margin:0 0 10px;
        color:#1b5e20;
        font-weight:bold;
      "
    >
      📊 Analyse Logistique
    </h4>

    <p>
      🛣️ <strong>Axe routier :</strong>
      ${depart} → ${arrivee}
    </p>

    <p>
      📏 <strong>Distance :</strong>
      ~${distance} Km
    </p>

    <p>
      📦 <strong>Poids :</strong>
      ${poids} Tonne(s)
    </p>

    <hr
      style="
        border:0;
        border-top:1px solid #c5e1a5;
        margin:10px 0;
      "
    >

    <div
      style="
        font-size:1.2rem;
        font-weight:800;
        color:#e65100;
      "
    >
      Budget estimé :
      ${coutTotal.toLocaleString("fr-FR")}
      FCFA
    </div>
  `;

  if (statut) {
    statut.textContent =
      "Optimisation IA effectuée ✓";
  }

  const transporteurs =
    flotteAgriConnect
      .map(
        transporteur => ({
          ...transporteur,

          score:
            calculerScoreTransporteur(
              transporteur,
              depart,
              type,
              poids
            )
        })
      )
      .sort(
        (a, b) =>
          b.score - a.score
      );

  liste.innerHTML =
    transporteurs
      .map(
        creerCarteTransporteur
      )
      .join("");
}

function creerCarteTransporteur(
  transporteur
) {
  const {
    score
  } = transporteur;

  let couleur =
    "#4caf50";

  let fond =
    "#e8f5e9";

  if (score < 85) {
    couleur =
      "#ff9800";

    fond =
      "#fff3e0";
  }

  if (score < 65) {
    couleur =
      "#f44336";

    fond =
      "#ffebee";
  }

  return `
    <div
      class="carrier-card"
      style="
        background:#fff;
        padding:18px;
        border-radius:10px;
        border-left:5px solid ${couleur};
        box-shadow:0 3px 10px rgba(0,0,0,.04);
        display:flex;
        flex-direction:column;
        gap:12px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        "
      >

        <div
          style="
            text-align:left;
          "
        >

          <h4
            style="
              margin:0 0 2px;
              color:#222;
              font-size:1.05rem;
              font-weight:bold;
            "
          >
            ${transporteur.nom}
          </h4>

          <small
            style="color:#666;"
          >
            ${transporteur.camion}
          </small>

        </div>

        <span
          style="
            font-size:1.25rem;
            font-weight:800;
            color:${couleur};
            background:${fond};
            padding:4px 10px;
            border-radius:8px;
          "
        >
          ${score}%
        </span>

      </div>

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          background:#fafafa;
          padding:8px 12px;
          border-radius:6px;
          font-size:.85rem;
          color:#555;
        "
      >

        <span>
          📍 Ville :
          <b>
            ${transporteur.base}
          </b>
        </span>

        <span
          style="
            font-weight:bold;
            color:#2e7d32;
          "
        >
          ${transporteur.prixKm}
          FCFA/Km
        </span>

      </div>

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
        "
      >

        <span
          style="
            font-size:.8rem;
            color:#777;
          "
        >
          ${transporteur.note}
        </span>

        <button
          type="button"
          class="btn-reserver-trans"
          data-nom="${transporteur.nom}"
          data-tel="${transporteur.tel}"
          style="
            background:#2e7d32;
            color:#fff;
            border:none;
            padding:8px 16px;
            border-radius:6px;
            font-size:.8rem;
            font-weight:bold;
            cursor:pointer;
          "
        >
          Contacter 📞
        </button>

      </div>

    </div>
  `;
}

function initialiserEvenementsTransporteurs() {
  document.addEventListener(
    "click",
    event => {
      const bouton =
        event.target.closest(
          ".btn-reserver-trans"
        );

      if (!bouton) {
        return;
      }

      const nom =
        bouton.dataset.nom;

      const tel =
        bouton.dataset.tel;

      afficherAlerte(
        `Demande envoyée avec succès à ${nom} !\n` +
        `Un SMS de confirmation sera transmis au ${tel}.`
      );
    }
  );
}

/* ==========================================================================
   10. MATCHING LOGISTIQUE APRÈS PAIEMENT
   ========================================================================== */

async function executerMatchingLogistiqueIA(
  article
) {
  if (!article) {
    return;
  }

  const cartographieDistances = {
    foumbot: {
      douala: 280,
      yaounde: 320,
      bafoussam: 25
    },

    mbanga: {
      douala: 60,
      yaounde: 295,
      bafoussam: 210
    },

    mbalmayo: {
      douala: 285,
      yaounde: 45,
      bafoussam: 340
    }
  };

  const flotteChauffeurs = [
    {
      nom:
        "Trans-Littoral Express (Camion Frigo)",

      base:
        "mbanga",

      prixKm:
        400
    },

    {
      nom:
        "El Hadj Ousmanou Logistique (Benne)",

      base:
        "foumbot",

      prixKm:
        350
    },

    {
      nom:
        "GIC Central de Fret (Plateau)",

      base:
        "mbalmayo",

      prixKm:
        500
    }
  ];

  const villeAcheteur =
    "douala";

  const nomProduit =
    normaliserTexte(
      article.nom
    );

  let bassinOrigine =
    "mbanga";

  if (
    nomProduit.includes(
      "foumbot"
    )
  ) {
    bassinOrigine =
      "foumbot";
  } else if (
    nomProduit.includes(
      "mbalmayo"
    )
  ) {
    bassinOrigine =
      "mbalmayo";
  }

  const distanceKm =
    cartographieDistances[
      bassinOrigine
    ]?.[
      villeAcheteur
    ] || 150;

  let transporteurOptimal =
    flotteChauffeurs[0];

  let distanceMinimale =
    Infinity;

  flotteChauffeurs.forEach(
    chauffeur => {
      let distanceVide =
        0;

      if (
        chauffeur.base !==
        bassinOrigine
      ) {
        distanceVide =
          cartographieDistances[
            chauffeur.base
          ]?.[
            bassinOrigine
          ] ||
          cartographieDistances[
            bassinOrigine
          ]?.[
            chauffeur.base
          ] ||
          100;
      }

      if (
        distanceVide <
        distanceMinimale
      ) {
        distanceMinimale =
          distanceVide;

        transporteurOptimal =
          chauffeur;
      }
    }
  );

  const fraisFret =
    distanceKm *
    transporteurOptimal.prixKm;

  const demandeFret = {
    nom_produit:
      article.nom,

    quantite:
      article.quantite,

    bassin_depart:
      bassinOrigine.toUpperCase(),

    ville_arrivee:
      villeAcheteur.toUpperCase(),

    distance_km:
      distanceKm,

    frais_fcfa:
      fraisFret,

    transporteur_attribue:
      transporteurOptimal.nom
  };

  try {
    const reponse =
      await fetch(
        `${API_BASE_URL}/transport/assigner`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              demandeFret
            )
        }
      );

    if (!reponse.ok) {
      throw new Error(
        `HTTP ${reponse.status}`
      );
    }

    afficherRapportMatching(
      demandeFret
    );

    afficherAlerte(
      `📲 Notification envoyée au transporteur :\n${demandeFret.transporteur_attribue}`
    );
  } catch (erreur) {
    console.error(
      "Erreur matching logistique :",
      erreur
    );

    afficherAlerte(
      "Erreur d'écriture de la feuille de route logistique."
    );
  }
}

function afficherRapportMatching(
  demande
) {
  const zoneAttente =
    getElement(
      "zoneAttentePaiement"
    );

  if (!zoneAttente) {
    return;
  }

  zoneAttente.innerHTML = `
    <div
      style="
        text-align:left;
        color:#1e3a1f;
        padding:15px;
        background:#e8f5e9;
        border-radius:8px;
      "
    >

      <h4
        style="
          margin:0 0 10px;
          color:#2e7d32;
          font-weight:800;
        "
      >
        🤖 Rapport d'Attribution Logistique IA
      </h4>

      <p>
        📦 <b>Produit :</b>
        ${demande.nom_produit}
        (x${demande.quantite})
      </p>

      <p>
        🛣️ <b>Trajet :</b>
        ${demande.bassin_depart}
        ➔
        ${demande.ville_arrivee}
      </p>

      <p>
        📏 <b>Distance :</b>
        ${demande.distance_km} Km
      </p>

      <p>
        🚛 <b>Transporteur :</b>
        ${demande.transporteur_attribue}
      </p>

      <p
        style="
          color:#e65100;
        "
      >
        💰 <b>Coût du fret :</b>
        ${demande.frais_fcfa.toLocaleString("fr-FR")}
        FCFA
      </p>

      <button
        type="button"
        id="btnFermerConsoleIA"
        style="
          width:100%;
          margin-top:15px;
          background:#2e7d32;
          color:white;
          border:none;
          padding:10px;
          border-radius:4px;
          font-weight:bold;
          cursor:pointer;
        "
      >
        Fermer la console
      </button>

    </div>
  `;

  getElement(
    "btnFermerConsoleIA"
  )?.addEventListener(
    "click",
    fermerModalPaiement
  );
}

/* ==========================================================================
   11. THÈME SOMBRE
   ========================================================================== */

function initialiserThemeSombre() {
  const bouton =
    getElement(
      "themeToggleBtn"
    );

  if (!bouton) {
    return;
  }

  const modeSombre =
    localStorage.getItem(
      "theme"
    ) === "dark";

  document.body.classList.toggle(
    "dark-mode",
    modeSombre
  );

  bouton.textContent =
    modeSombre
      ? "☀️"
      : "🌙";

  bouton.addEventListener(
    "click",
    () => {
      const sombre =
        document.body.classList.toggle(
          "dark-mode"
        );

      localStorage.setItem(
        "theme",
        sombre
          ? "dark"
          : "light"
      );

      bouton.textContent =
        sombre
          ? "☀️"
          : "🌙";
    }
  );
}

/* ==========================================================================
   12. ANIMATIONS
   ========================================================================== */

function initialiserAnimationsLogistiques() {
  const elements =
    document.querySelectorAll(
      ".animate-on-scroll"
    );

  if (
    "IntersectionObserver" in
    window
  ) {
    const observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(
            entry => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "is-visible"
                );
              }
            }
          );
        },
        {
          threshold: 0.15
        }
      );

    elements.forEach(
      element =>
        observer.observe(
          element
        )
    );
  }

  const sectionTransport =
    getElement(
      "transport"
    );

  if (sectionTransport) {
    window.addEventListener(
      "scroll",
      () => {
        const position =
          sectionTransport.getBoundingClientRect();

        if (
          position.top <
            window.innerHeight &&
          position.bottom > 0
        ) {
          sectionTransport.style.setProperty(
            "--scroll-offset",
            `${
              (
                position.top -
                window.innerHeight
              ) *
              0.15
            }px`
          );
        }
      },
      {
        passive: true
      }
    );
  }
}

/* ==========================================================================
   13. AFFICHAGE SELON LE RÔLE
   ========================================================================== */

function appliquerAffichageSelonRole() {
  const role =
    getRoleUtilisateur();

  const catalogue =
    getElement(
      "catalogSection"
    ) ||
    document.querySelector(
      ".products.section"
    ) ||
    document.querySelector(
      ".products"
    ) ||
    getElement(
      "catalogue"
    );

  const espaceTransport =
    getElement(
      "zoneTechniqueLogistique"
    );

  const sectionLogistique =
    getElement(
      "transport"
    ) ||
    document.querySelector(
      ".smart.section"
    );

  const boutonLogistique =
    getElement(
      "btnActiverLogistique"
    );

  const sectionProducteur =
    getElement(
      "Producteur"
    ) ||
    document.querySelector(
      ".producer-section"
    );

  if (estTransporteur()) {
    catalogue?.style.setProperty(
      "display",
      "none",
      "important"
    );

    sectionProducteur?.style.setProperty(
      "display",
      "none",
      "important"
    );

    sectionLogistique?.style.setProperty(
      "display",
      "block",
      "important"
    );

    espaceTransport?.style.setProperty(
      "display",
      "flex",
      "important"
    );

    boutonLogistique?.style.setProperty(
      "display",
      "none",
      "important"
    );

    simulerTrajetLogistique();

    return;
  }

  if (estProducteur()) {
    catalogue?.style.setProperty(
      "display",
      "none",
      "important"
    );

    sectionLogistique?.style.setProperty(
      "display",
      "none",
      "important"
    );

    espaceTransport?.style.setProperty(
      "display",
      "none",
      "important"
    );

    sectionProducteur?.style.setProperty(
      "display",
      "block",
      "important"
    );

    return;
  }

  catalogue?.style.setProperty(
    "display",
    "block",
    "important"
  );

  sectionProducteur?.style.setProperty(
    "display",
    "none",
    "important"
  );

  espaceTransport?.style.setProperty(
    "display",
    "none",
    "important"
  );

  boutonLogistique?.style.setProperty(
    "display",
    "inline-block",
    "important"
  );
}

/* ==========================================================================
   14. CONSOLE LOGISTIQUE
   ========================================================================== */

function initialiserBoutonLogistique() {
  const bouton =
    getElement(
      "btnActiverLogistique"
    );

  const zone =
    getElement(
      "zoneTechniqueLogistique"
    );

  if (
    !bouton ||
    !zone
  ) {
    return;
  }

  bouton.addEventListener(
    "click",
    () => {
      const estCachee =
        zone.style.display ===
          "none" ||
        zone.style.display ===
          "";

      if (estCachee) {
        zone.style.display =
          "flex";

        simulerTrajetLogistique();

        bouton.textContent =
          "Désactiver la chaîne logistique ✕";

        bouton.style.background =
          "#d32f2f";

        zone.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      } else {
        zone.style.display =
          "none";

        bouton.textContent =
          "Utiliser la chaîne logistique →";

        bouton.style.background =
          "#2e7d32";

        bouton.scrollIntoView({
          behavior: "smooth",
          block: "nearest"
        });
      }
    }
  );
}

/* ==========================================================================
   15. RECHERCHE / CALCUL / PAIEMENT
   ========================================================================== */

function initialiserRecherche() {
  const input =
    getElement(
      "searchInput"
    );

  const bouton =
    getElement(
      "searchBtn"
    );

  if (input) {
    input.addEventListener(
      "input",
      filterProducts
    );

    input.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();

          filterProducts();
        }
      }
    );
  }

  if (bouton) {
    bouton.addEventListener(
      "click",
      event => {
        event.preventDefault();

        filterProducts();
      }
    );
  }

  const categorie =
    getElement(
      "category"
    );

  if (categorie) {
    categorie.addEventListener(
      "change",
      filterProducts
    );
  }
}

function initialiserCalculTransport() {
  const bouton =
    getElement(
      "btnSimulerTransport"
    );

  bouton?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      simulerTrajetLogistique();
    }
  );
}

function initialiserPaiement() {
  getElement(
    "btnOuvrirPaiement"
  )?.addEventListener(
    "click",
    ouvrirModalPaiement
  );

  getElement(
    "btnFermerPaiement"
  )?.addEventListener(
    "click",
    fermerModalPaiement
  );

  getElement(
    "formPaiementMoMo"
  )?.addEventListener(
    "submit",
    traiterPaiement
  );
}

/* ==========================================================================
   16. DÉCONNEXION
   ========================================================================== */

function initialiserDeconnexion() {
  const boutons = [
    getElement(
      "logoutBtn"
    ),

    getElement(
      "logoutBtnFromProd"
    )
  ].filter(Boolean);

  boutons.forEach(
    bouton => {
      bouton.addEventListener(
        "click",
        event => {
          event.preventDefault();

          sessionStorage.clear();

          afficherAlerte(
            "🚪 Déconnexion effectuée !"
          );

          window.location.href =
            "index.html?space=buyer";
        }
      );
    }
  );

  if (estConnecte()) {
    getElement(
      "logoutBtn"
    )?.style.setProperty(
      "display",
      "block"
    );
  }
}

/* ==========================================================================
   17. ACCÈS À L'ESPACE PRODUCTEUR
   ========================================================================== */

function verifierAccesProducteur() {
  if (!estConnecte()) {
    afficherAlerte(
      "🔒 Use Case Bloqué : S'Authentifier Requis !\n" +
      "Vous devez vous connecter sous un profil Producteur."
    );

    window.location.href =
      "login.html";

    return false;
  }

  if (!estProducteur()) {
    afficherAlerte(
      `🚫 Accès interdit !\n` +
      `Votre compte possède le rôle [${getRoleUtilisateur().toUpperCase()}].\n` +
      `Seul un profil Producteur peut accéder à cet espace.`
    );

    return false;
  }

  return true;
}

function ouvrirEspaceProducteur() {
  if (
    !verifierAccesProducteur()
  ) {
    return;
  }

  window.location.href =
    "producer.html";
}

function initialiserAccesProducteur() {
  const boutonMenu =
    getElement(
      "menuBtnProducteur"
    );

  const boutonOutils =
    getElement(
      "btnAccederOutilsProducteur"
    );

  boutonMenu?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      ouvrirEspaceProducteur();
    }
  );

  boutonOutils?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      ouvrirEspaceProducteur();
    }
  );
}

/* ==========================================================================
   18. ESPACE PRODUCTEUR
   ========================================================================== */

async function rafraichirStocksDuProducteur() {
  const container =
    getElement(
      "listeSpecifiqueProducteur"
    );

  if (!container) {
    return;
  }

  try {
    const response =
      await fetch(API_URL);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const produits =
      await response.json();

    container.innerHTML = "";

    produits
      .slice(-4)
      .reverse()
      .forEach(
        produit => {
          container.insertAdjacentHTML(
            "beforeend",
            creerLigneStockProducteur(
              produit
            )
          );
        }
      );
  } catch (erreur) {
    console.error(
      "Erreur de rafraîchissement des stocks :",
      erreur
    );

    container.innerHTML = `
      <p
        style="
          color:#c62828;
        "
      >
        Impossible de charger vos produits.
      </p>
    `;
  }
}

function creerLigneStockProducteur(
  produit
) {
  const prix =
    Number(
      produit.prix_unitaire_moyen_fcfa
    ) || 0;

  return `
    <div
      id="produit-${produit.id}"
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:12px;
        background:#fafafa;
        border:1px solid #eee;
        border-radius:8px;
        font-size:.85rem;
        margin-bottom:8px;
        color:#333;
      "
    >

      <div
        style="
          text-align:left;
        "
      >

        <strong>
          ${produit.nom_produit}
        </strong>

        <small
          style="
            display:block;
            color:#666;
          "
        >
          Bassin :
          ${produit.bassins_production}
          ·
          ${produit.format_vente_detail}
        </small>

      </div>

      <div style="display:flex; align-items:center; gap:10px;">

        <b
          style="
            color:#e65100;
          "
        >
          ${prix.toLocaleString("fr-FR")} F
        </b>

        <button
          onclick="supprimerProduit(${produit.id})"
          style="
            background:#c62828;
            color:#fff;
            border:none;
            border-radius:6px;
            padding:6px 10px;
            font-size:.75rem;
            cursor:pointer;
          "
        >
          Supprimer
        </button>

      </div>

    </div>
  `;
}

async function supprimerProduit(produitId) {
  if (!confirm("Supprimer ce produit ?")) return;

  try {
    const response = await fetch(`${API_URL}/${produitId}`, {
      method: "DELETE"
    });

    if (response.ok) {
      const ligne = getElement(`produit-${produitId}`);
      if (ligne) ligne.remove();

      afficherAlerte("🗑️ Produit supprimé avec succès.");
    } else {
      const data = await response.json();
      afficherAlerte(data.error || "⚠️ Erreur lors de la suppression.");
    }
  } catch (erreur) {
    console.error("Erreur de suppression :", erreur);
    afficherAlerte("⚠️ Impossible de supprimer le produit. Vérifiez le serveur.");
  }
}

function initialiserFormulaireProducteur() {
  const formulaire =
    getElement(
      "addProductForm"
    );

  const bouton =
    getElement(
      "btnPublierOffre"
    );

  if (!formulaire) {
    return;
  }

  formulaire.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const offre = {
        nom_produit:
          getElement(
            "prodNom"
          )?.value.trim() ||
          "",

        categorie:
          getElement(
            "prodCat"
          )?.value ||
          "",

        bassins_production:
          getElement(
            "prodBassin"
          )?.value ||
          "",

        format_vente_detail:
          getElement(
            "prodFormat"
          )?.value.trim() ||
          "",

        prix_unitaire_moyen_fcfa:
          parseInt(
            getElement(
              "prodPrix"
            )?.value ||
              "0",
            10
          )
      };

      if (
        !offre.nom_produit ||
        !offre.categorie ||
        !offre.bassins_production ||
        !offre.format_vente_detail ||
        !Number.isFinite(
          offre.prix_unitaire_moyen_fcfa
        )
      ) {
        afficherAlerte(
          "⚠️ Veuillez remplir correctement tous les champs."
        );

        return;
      }

      if (bouton) {
        bouton.disabled =
          true;

        bouton.textContent =
          "⏳ Transmission au serveur...";
      }

      try {
        const response =
          await fetch(
            API_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  offre
                )
            }
          );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        afficherAlerte(
          `🎉 Succès : "${offre.nom_produit}" est maintenant publié sur AgriConnect !`
        );

        formulaire.reset();

        await rafraichirStocksDuProducteur();

        await chargerCatalogueDeLaBase();
      } catch (erreur) {
        console.error(
          "Erreur de publication :",
          erreur
        );

        afficherAlerte(
          "⚠️ Impossible de publier l'offre. Vérifiez le serveur Node.js."
        );
      } finally {
        if (bouton) {
          bouton.disabled =
            false;

          bouton.textContent =
            "Publier l'offre de vente 🚀";
        }
      }
    }
  );
}

function initialiserNotificationsProducteur() {
  const boite =
    getElement(
      "boxNotificationProducteur"
    );

  if (!boite) {
    return;
  }

  boite.addEventListener(
    "click",
    event => {
      event.preventDefault();

      afficherAlerte(
        "📋 Lot réservé ! Préparez la marchandise pour la collecte du transporteur."
      );

      const texte =
        getElement(
          "notifTexteProd"
        );

      const pastille =
        getElement(
          "pastilleRougeNotif"
        );

      if (texte) {
        texte.textContent =
          "✓ Aucune alerte en attente.";

        texte.style.color =
          "#777";
      }

      if (pastille) {
        pastille.style.display =
          "none";
      }
    }
  );
}

/* ==========================================================================
   19. INITIALISATION UNIQUE
   ========================================================================== */

async function initialiserApplication() {
  /* Rôle transmis dans l'URL */

  const parametres =
    new URLSearchParams(
      window.location.search
    );

  const espace =
    parametres.get(
      "space"
    );

  if (espace) {
    setRoleUtilisateur(
      espace
    );
  }

  console.log(
    "🟢 Rôle AgriConnect détecté :",
    getRoleUtilisateur()
  );

  /* Modules généraux */

  initialiserThemeSombre();

  initialiserAnimationsLogistiques();

  initialiserRecherche();

  initialiserCalculTransport();

  initialiserPaiement();

  initialiserGestionPanier();

  initialiserEvenementsTransporteurs();

  initialiserDeconnexion();

  initialiserAccesProducteur();

  /* Logistique */

  initialiserBoutonLogistique();

  /* Producteur */

  initialiserFormulaireProducteur();

  initialiserNotificationsProducteur();

  /* Catalogue */

  await chargerCatalogueDeLaBase();

  /* Stocks du producteur si nécessaire */

  if (estProducteur()) {
    await rafraichirStocksDuProducteur();
  }

  /* Affichage adapté au rôle */

  appliquerAffichageSelonRole();
}

/* ==========================================================================
   20. LANCEMENT UNIQUE DE L'APPLICATION
   ========================================================================== */

document.addEventListener(
  "DOMContentLoaded",
  initialiserApplication,
  {
    once: true
  }
);
document.querySelectorAll('[data-scroll]').forEach(bouton => {
  bouton.addEventListener('click', () => {
    const cible = document.querySelector('#explicationIA');
    if (!cible) return;

    const estVisible = cible.style.display === 'block';
    cible.style.display = estVisible ? 'none' : 'block';

    if (!estVisible) {
      cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
app.patch('/api/transporteurs/:id/position', (req, res) => {
  const { latitude, longitude } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE transporteurs SET latitude = ?, longitude = ? WHERE id = ?`,
    [latitude, longitude, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Erreur d'enregistrement." });
      res.json({ message: "Position mise à jour." });
    }
  );
});

function verifierCoherenceOperateur(numero, operateur) {
  const prefixesMTN = ['67', '650', '651', '652', '653', '654', '680', '681', '682', '683', '684', '685', '686', '687', '688', '689'];
  const prefixesOrange = ['69', '655', '656', '657', '658', '659', '640', '641', '642', '643', '644'];

  const correspond = (liste) => liste.some(prefixe => numero.startsWith(prefixe));

  if (operateur === 'MTN' && !correspond(prefixesMTN)) {
    return { valide: false, message: "Ce numéro ne correspond pas à un compte MTN Mobile Money." };
  }

  if (operateur === 'Orange' && !correspond(prefixesOrange)) {
    return { valide: false, message: "Ce numéro ne correspond pas à un compte Orange Money." };
  }

  return { valide: true };
}

document.getElementById('formPaiementMoMo').addEventListener('submit', async (event) => {
  event.preventDefault();

  const numero = document.getElementById('numTelephone').value.trim();
  const operateur = document.querySelector('input[name="operateur"]:checked').value;

  // Format général : 9 chiffres
  if (!/^[0-9]{9}$/.test(numero)) {
    afficherAlerte("⚠️ Le numéro doit contenir 9 chiffres.");
    return;
  }

  // Vérification de cohérence opérateur / préfixe
  const verification = verifierCoherenceOperateur(numero, operateur);
  if (!verification.valide) {
    afficherAlerte(`⚠️ ${verification.message}`);
    return;
  }

  // Passage en mode "attente de confirmation"
  document.getElementById('formPaiementMoMo').style.display = 'none';
  document.getElementById('zoneAttentePaiement').style.display = 'flex';

  try {
    const montant = document.getElementById('montantPaiementModal').textContent.replace(/[^0-9]/g, '');

    const reponse = await fetch('/api/paiement/mobile-money', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero, operateur, montant })
    });

    const resultat = await reponse.json();

    if (resultat.statut === 'succes') {
      document.getElementById('texteAttente').textContent = "✅ Paiement confirmé !";
    } else {
      document.getElementById('texteAttente').textContent = "❌ " + (resultat.message || "Paiement refusé.");
    }
  } catch (erreur) {
    document.getElementById('texteAttente').textContent = "⚠️ Erreur de connexion au service de paiement.";
  }
});
