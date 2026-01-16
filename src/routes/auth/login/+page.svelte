<script>
  import { Mail, Send, CheckCircle } from 'lucide-svelte';
  
  let email = '';
  let loading = false;
  let sent = false;
  let error = '';

  async function handleSubmit() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error sending link');
      }
      
      sent = true;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
    {#if !sent}
      <div class="flex items-center justify-center mb-6">
        <div class="bg-indigo-100 p-4 rounded-full">
          <Mail class="w-8 h-8 text-indigo-600" />
        </div>
      </div>
      
      <h1 class="text-2xl font-bold text-center text-gray-900 mb-2">Sign In</h1>
      <p class="text-center text-gray-600 mb-6">
        Enter your email to receive a login link
      </p>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email address
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            placeholder="your@email.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-700 text-sm">{error}</p>
          </div>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {#if loading}
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Sending...</span>
          {:else}
            <Send class="w-5 h-5" />
            <span>Send link</span>
          {/if}
        </button>
      </form>
    {:else}
      <div class="text-center">
        <div class="flex items-center justify-center mb-6">
          <div class="bg-green-100 p-4 rounded-full">
            <CheckCircle class="w-12 h-12 text-green-600" />
          </div>
        </div>
        
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Email sent!</h1>
        <p class="text-gray-600 mb-4">
          Check your inbox at <strong>{email}</strong> and click the link to sign in.
        </p>
        <p class="text-sm text-gray-500">
          The link is valid for 15 minutes.
        </p>
      </div>
    {/if}
  </div>
</div>
