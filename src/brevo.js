const API_KEY = process.env.REACT_APP_BREVO_KEY;
const EXPEDITEUR_EMAIL = 'enzo.clincke23@gmail.com';
const EXPEDITEUR_NOM = 'RamonPro';

export async function envoyerEmail({ destinataire, prenom, nom, sujet, message }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: EXPEDITEUR_NOM, email: EXPEDITEUR_EMAIL },
      to: [{ email: destinataire, name: `${prenom} ${nom}` }],
      subject: sujet,
      textContent: message,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">🧹 RamonPro</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="vertical-align: middle; padding-right: 15px;">
                  <img src="https://ramon-pro.vercel.app/logo-spataro.png" alt="Kévin Spataro" width="90" style="display: block;" />
                </td>
                <td style="vertical-align: middle; font-size: 13px; color: #333; line-height: 1.5;">
                  <strong style="color: #1E3A5F; font-size: 14px;">Kévin SPATARO</strong><br>
                  Couverture - Zinguerie - Ramonage<br>
                  📞 06.59.69.74.94<br>
                  ✉️ ent.spatarokevin@gmail.com<br>
                  📍 Sainte-Colombe-sur-Seine
                </td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">Ce message vous a été envoyé par votre ramoneur via RamonPro.</p>
          </div>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Erreur Brevo:', data);
    throw new Error(data.message || 'Erreur envoi email');
  }
  return true;
}

export async function envoyerEmailsMasse(clients, template) {
  const resultats = { succes: 0, echecs: 0, erreurs: [] };

  for (const client of clients) {
    if (!client.email) {
      resultats.echecs++;
      resultats.erreurs.push(`${client.prenom} ${client.nom} — pas d'email`);
      continue;
    }

    const messagePersonnalise = template.message
      .replace(/{prenom}/g, client.prenom)
      .replace(/{nom}/g, client.nom)
      .replace(/{adresse}/g, client.adresse || '');

    try {
      await envoyerEmail({
        destinataire: client.email,
        prenom: client.prenom,
        nom: client.nom,
        sujet: template.sujet,
        message: messagePersonnalise,
      });
      resultats.succes++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      resultats.echecs++;
      resultats.erreurs.push(`${client.prenom} ${client.nom} — ${e.message}`);
    }
  }

  return resultats;
}