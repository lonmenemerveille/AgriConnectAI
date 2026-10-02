function togglePassword(id, btn){
  const input=document.getElementById(id);
  input.type=input.type==="password"?"text":"password";
  btn.textContent=input.type==="password"?"Afficher":"Masquer";
}

function chooseRole(el){
  document.querySelectorAll(".role").forEach(r=>r.classList.remove("selected"));
  el.classList.add("selected");
  el.querySelector("input").checked=true;
}

function toast(msg){
  alert(msg);
}

const API_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {

  const register = document.getElementById("registerForm");
  if (register) {
    register.addEventListener("submit", async e => {
      e.preventDefault();
      const role = document.querySelector('input[name="role"]:checked');
      if (!role) { document.getElementById("roleNotice").style.display = "block"; return; }
      document.getElementById("roleNotice").style.display = "none";

      const donnees = {
        nom: document.getElementById("nom").value,
        email: document.getElementById("email").value,
        mot_de_passe: document.getElementById("registerPassword").value,
        telephone: document.getElementById("telephone").value,
        role: role.value.toLowerCase()
      };

      try {
        const res = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(donnees)
        });
        const data = await res.json();
        if (!res.ok) return toast(data.erreur || "Erreur lors de l'inscription.");
        toast("Compte créé avec succès !");
        window.location.href = "login.html";
      } catch (err) {
        toast("Erreur de connexion au serveur.");
      }
    });
  }

  const login = document.getElementById("loginForm");
  if (login) {
    login.addEventListener("submit", async e => {
      e.preventDefault();
      const donnees = {
        email: document.getElementById("email").value,
        mot_de_passe: document.getElementById("loginPassword").value
      };

      try {
        const res = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(donnees)
        });
        const data = await res.json();
        if (!res.ok) return toast(data.erreur || "Erreur de connexion.");

        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("utilisateur", JSON.stringify(data.utilisateur));

        const role = data.utilisateur.role;
        if (role === "producteur") window.location.href = "producer.html";
        else if (role === "transporteur") window.location.href = "transporteur.html";
        else window.location.href = "index.html";

      } catch (err) {
        toast("Erreur de connexion au serveur.");
      }
    });
  }

});