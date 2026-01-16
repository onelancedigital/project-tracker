import { json } from '@sveltejs/kit';
import { isEmailAllowed, generateMagicLink } from '$lib/server/auth';
import { sendMagicLink } from '$lib/server/email';

export const prerender = false;

export async function POST({ request }) {
  try {
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    if (!isEmailAllowed(email)) {
      return json({ error: 'An error occurred' }, { status: 403 });
    }

    const token = generateMagicLink(email);
    
    try {
      await sendMagicLink(email, token);
      return json({ success: true });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      
      // Provide a more specific error message
      let errorMessage = 'Error sending email';
      
      if (emailError.message) {
        errorMessage = emailError.message;
      }
      
      return json({ 
        error: errorMessage,
        details: emailError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in magic link endpoint:', error);
    return json({ error: 'Error processing request' }, { status: 500 });
  }
}
