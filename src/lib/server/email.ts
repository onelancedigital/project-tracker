import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL } from './config';

// Validation de la clé API
if (!RESEND_API_KEY || RESEND_API_KEY === '') {
  console.error('❌ RESEND_API_KEY non configurée dans le fichier .env');
  console.error('👉 Obtenez votre clé sur https://resend.com/api-keys');
}

const resend = new Resend(RESEND_API_KEY);

export async function sendMagicLink(email, token) {
  const magicLink = `${APP_URL}/auth/verify?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: 'Votre lien de connexion - Suivi de Projet',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🔐 Connexion au Suivi de Projet</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Bonjour,</p>
              <p style="font-size: 16px;">Cliquez sur le bouton ci-dessous pour accéder au tableau de suivi de votre projet :</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLink}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Se connecter</a>
              </div>
              <p style="font-size: 14px; color: #666;">Ce lien est valide pendant 15 minutes.</p>
              <p style="font-size: 14px; color: #666;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="font-size: 12px; color: #999;">Lien direct : <a href="${magicLink}" style="color: #667eea;">${magicLink}</a></p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email via Resend');
    }

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in sendMagicLink:', error);
    throw error;
  }
}
