import { json } from '@sveltejs/kit';
import { isEmailAllowed, generateMagicLink } from '$lib/server/auth';
import { sendMagicLink } from '$lib/server/email';

export async function POST({ request }) {
  try {
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Email requis' }, { status: 400 });
    }

    if (!isEmailAllowed(email)) {
      return json({ error: 'Email non autorisé' }, { status: 403 });
    }

    const token = generateMagicLink(email);
    
    try {
      await sendMagicLink(email, token);
      return json({ success: true });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      
      // Fournir un message d'erreur plus spécifique
      let errorMessage = 'Erreur lors de l\'envoi de l\'email';
      
      if (emailError.message) {
        // Si c'est une erreur de Resend, utiliser le message d'erreur
        errorMessage = emailError.message;
      }
      
      return json({ 
        error: errorMessage,
        details: emailError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in magic link endpoint:', error);
    return json({ error: 'Erreur lors du traitement de la demande' }, { status: 500 });
  }
}
