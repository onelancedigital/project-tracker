<script>
  import { onMount } from 'svelte';
  import { Circle, CheckCircle, Clock, Calendar, MessageSquare, User, GitBranch, LayoutGrid, LayoutList, AlertCircle, LogOut, X, ExternalLink } from 'lucide-svelte';
  
  export let data;

  let milestones = [];
  let issues = [];
  let loading = true;
  let error = null;
  let selectedMilestone = 'all';
  let selectedIssue = null;
  let viewMode = 'kanban';
  let issueComments = {};
  let loadingComments = {};
  let showModal = false;
  let modalIssue = null;

  onMount(async () => {
    await fetchData();
  });

  async function fetchData() {
    try {
      loading = true;
      const response = await fetch('/api/github/data');
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error);
      
      milestones = result.milestones;
      issues = result.issues;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function fetchIssueComments(issueNumber) {
    if (issueComments[issueNumber]) return;
    
    loadingComments[issueNumber] = true;
    loadingComments = { ...loadingComments };
    
    try {
      const response = await fetch(`/api/github/issues/${issueNumber}/comments`);
      const comments = await response.json();
      issueComments[issueNumber] = comments;
      issueComments = { ...issueComments };
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      loadingComments[issueNumber] = false;
      loadingComments = { ...loadingComments };
    }
  }

  function handleIssueClick(issue) {
    if (viewMode === 'kanban') {
      // En mode kanban, ouvrir le modal
      modalIssue = issue;
      showModal = true;
      if (issue.comments > 0) {
        fetchIssueComments(issue.number);
      }
    } else {
      // En mode liste, toggle l'expansion
      selectedIssue = selectedIssue === issue.number ? null : issue.number;
      if (selectedIssue && issue.comments > 0) {
        fetchIssueComments(issue.number);
      }
    }
  }

  function closeModal() {
    showModal = false;
    modalIssue = null;
  }

  function getIssueStatus(issue) {
    // Priorité 1: Utiliser le statut du projet GitHub si disponible
    if (issue.project_status) {
      const status = issue.project_status.toLowerCase();
      
      // Mapper les statuts du projet aux colonnes du kanban
      // Terminé (Done)
      if (status === 'done') {
        return 'done';
      }
      
      // En cours (In progress + In review)
      if (status === 'in progress' || status === 'in review') {
        return 'in-progress';
      }
      
      // À faire (Backlog + Ready)
      if (status === 'backlog' || status === 'ready') {
        return 'todo';
      }
      
      // Si le statut n'est pas reconnu, utiliser un fallback intelligent
      return 'todo';
    }
    
    // Priorité 2: Fallback sur l'état de l'issue
    if (issue.state === 'closed') return 'done';
    
    // Priorité 3: Fallback sur les labels
    const labelNames = issue.labels ? issue.labels.map(l => l.name.toLowerCase()) : [];
    if (labelNames.includes('in-progress') || labelNames.includes('in progress') || labelNames.includes('in-review')) {
      return 'in-progress';
    }
    
    // Par défaut: todo
    return 'todo';
  }

  function calculateProgress(milestone) {
    const total = milestone.open_issues + milestone.closed_issues;
    if (total === 0) return 0;
    return Math.round((milestone.closed_issues / total) * 100);
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('fr-FR');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  }

  $: filteredIssues = selectedMilestone === 'all' 
    ? issues 
    : issues.filter(issue => issue.milestone && issue.milestone.title === selectedMilestone);

  $: todoIssues = filteredIssues.filter(issue => getIssueStatus(issue) === 'todo');
  $: inProgressIssues = filteredIssues.filter(issue => getIssueStatus(issue) === 'in-progress');
  $: doneIssues = filteredIssues.filter(issue => getIssueStatus(issue) === 'done');
</script>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Chargement des données...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
      <div class="flex items-center space-x-3 text-red-700 mb-2">
        <AlertCircle class="w-6 h-6" />
        <h2 class="font-semibold">Erreur</h2>
      </div>
      <p class="text-red-600 text-sm">{error}</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <GitBranch class="w-8 h-8 text-indigo-600" />
            <div>
              <h1 class="text-xl font-bold text-gray-900">Suivi du projet WEFAM</h1>
              <p class="text-sm text-gray-500">{data.user.email}</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button
                on:click={() => viewMode = 'kanban'}
                class="px-3 py-1 rounded flex items-center space-x-2 text-sm font-medium transition-colors {viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
              >
                <LayoutGrid class="w-4 h-4" />
                <span>Kanban</span>
              </button>
              <button
                on:click={() => viewMode = 'list'}
                class="px-3 py-1 rounded flex items-center space-x-2 text-sm font-medium transition-colors {viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
              >
                <LayoutList class="w-4 h-4" />
                <span>Liste</span>
              </button>
            </div>
            <button
              on:click={logout}
              class="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut class="w-4 h-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <!-- Milestones -->
      <section class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Jalons</h2>
        {#if milestones.length === 0}
          <div class="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Aucun milestone configuré
          </div>
        {:else}
          <div class="grid md:grid-cols-2 gap-4">
            {#each milestones as milestone}
              {@const progress = calculateProgress(milestone)}
              <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-lg font-semibold text-gray-900">{milestone.title}</h3>
                  <span class="text-sm font-medium text-indigo-600">{progress}%</span>
                </div>
                {#if milestone.description}
                  <p class="text-sm text-gray-600 mb-4">{milestone.description}</p>
                {/if}
                <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div class="bg-indigo-600 h-2 rounded-full transition-all" style="width: {progress}%"></div>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-4">
                    <span class="text-green-600">✓ {milestone.closed_issues} fermées</span>
                    <span class="text-gray-600">○ {milestone.open_issues} ouvertes</span>
                  </div>
                  {#if milestone.due_on}
                    <div class="flex items-center text-gray-500">
                      <Calendar class="w-4 h-4 mr-1" />
                      {formatDate(milestone.due_on)}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Filter -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Issues</h2>
        <select
          bind:value={selectedMilestone}
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="all">Tous les jalons ({issues.length})</option>
          {#each milestones as m}
            <option value={m.title}>
              {m.title} ({issues.filter(i => i.milestone && i.milestone.title === m.title).length})
            </option>
          {/each}
        </select>
      </div>

      {#if viewMode === 'kanban'}
        <!-- Kanban View -->
        <div class="grid grid-cols-3 gap-4">
          <!-- À faire -->
          <div class="flex flex-col h-full">
            <div class="bg-gray-200 rounded-t-lg px-4 py-3 flex items-center justify-between">
              <h3 class="font-bold text-gray-900 flex items-center text-sm">
                <Circle class="w-4 h-4 mr-2 text-gray-500" />
                À faire
              </h3>
              <span class="bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
                {todoIssues.length}
              </span>
            </div>
            <div class="bg-gray-100 rounded-b-lg p-3 space-y-3 flex-1 overflow-y-auto" style="max-height: 800px;">
              {#if todoIssues.length === 0}
                <p class="text-sm text-gray-500 text-center py-4">Aucune issue</p>
              {:else}
                {#each todoIssues as issue}
                  <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-3" on:click={() => handleIssueClick(issue)}>
                    <div class="flex items-start space-x-2 mb-2">
                      <Circle class="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <h4 class="text-sm font-semibold text-gray-900 flex-1">#{issue.number} {issue.title}</h4>
                    </div>
                    {#if issue.assignee}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <User class="w-3 h-3 mr-1" />
                        {issue.assignee.login}
                      </div>
                    {/if}
                    <div class="flex flex-wrap gap-1">
                      {#if issue.milestone}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.milestone.title}
                        </span>
                      {/if}
                      {#if issue.labels}
                        {#each issue.labels.slice(0, 2) as label}
                          <span class="px-2 py-0.5 rounded text-xs font-medium" style="background-color: #{label.color}20; color: #{label.color}">
                            {label.name}
                          </span>
                        {/each}
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- En cours -->
          <div class="flex flex-col h-full">
            <div class="bg-blue-200 rounded-t-lg px-4 py-3 flex items-center justify-between">
              <h3 class="font-bold text-gray-900 flex items-center text-sm">
                <Clock class="w-4 h-4 mr-2 text-blue-600" />
                En cours
              </h3>
              <span class="bg-blue-300 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                {inProgressIssues.length}
              </span>
            </div>
            <div class="bg-blue-50 rounded-b-lg p-3 space-y-3 flex-1 overflow-y-auto" style="max-height: 800px;">
              {#if inProgressIssues.length === 0}
                <p class="text-sm text-gray-500 text-center py-4">Aucune issue</p>
              {:else}
                {#each inProgressIssues as issue}
                  <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-3 border-l-4 border-blue-500" on:click={() => handleIssueClick(issue)}>
                    <div class="flex items-start space-x-2 mb-2">
                      <Clock class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <h4 class="text-sm font-semibold text-gray-900 flex-1">#{issue.number} {issue.title}</h4>
                    </div>
                    {#if issue.assignee}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <User class="w-3 h-3 mr-1" />
                        {issue.assignee.login}
                      </div>
                    {/if}
                    <div class="flex flex-wrap gap-1">
                      {#if issue.milestone}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.milestone.title}
                        </span>
                      {/if}
                      {#if issue.labels}
                        {#each issue.labels.slice(0, 2) as label}
                          <span class="px-2 py-0.5 rounded text-xs font-medium" style="background-color: #{label.color}20; color: #{label.color}">
                            {label.name}
                          </span>
                        {/each}
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- Terminé -->
          <div class="flex flex-col h-full">
            <div class="bg-green-200 rounded-t-lg px-4 py-3 flex items-center justify-between">
              <h3 class="font-bold text-gray-900 flex items-center text-sm">
                <CheckCircle class="w-4 h-4 mr-2 text-green-600" />
                Terminé
              </h3>
              <span class="bg-green-300 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                {doneIssues.length}
              </span>
            </div>
            <div class="bg-green-50 rounded-b-lg p-3 space-y-3 flex-1 overflow-y-auto" style="max-height: 800px;">
              {#if doneIssues.length === 0}
                <p class="text-sm text-gray-500 text-center py-4">Aucune issue</p>
              {:else}
                {#each doneIssues as issue}
                  <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-3 opacity-75" on:click={() => handleIssueClick(issue)}>
                    <div class="flex items-start space-x-2 mb-2">
                      <CheckCircle class="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <h4 class="text-sm font-semibold text-gray-900 flex-1 line-through">#{issue.number} {issue.title}</h4>
                    </div>
                    {#if issue.assignee}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <User class="w-3 h-3 mr-1" />
                        {issue.assignee.login}
                      </div>
                    {/if}
                    <div class="flex flex-wrap gap-1">
                      {#if issue.milestone}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.milestone.title}
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <!-- List View -->
        <div class="space-y-3">
          {#each filteredIssues as issue}
            {@const comments = issueComments[issue.number] || []}
            {@const isExpanded = selectedIssue === issue.number}
            <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div class="p-5 cursor-pointer" on:click={() => handleIssueClick(issue)}>
                <div class="flex items-start space-x-4">
                  {#if issue.state === 'open'}
                    <Circle class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  {:else}
                    <CheckCircle class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  {/if}
                  <div class="flex-1 min-w-0">
                    <h3 class="text-base font-semibold text-gray-900 mb-2">
                      #{issue.number} {issue.title}
                    </h3>
                    <div class="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                      {#if issue.assignee}
                        <span class="flex items-center">
                          <User class="w-4 h-4 mr-1" />
                          {issue.assignee.login}
                        </span>
                        <span>•</span>
                      {/if}
                      <span class="flex items-center">
                        <Clock class="w-4 h-4 mr-1" />
                        {formatDate(issue.created_at)}
                      </span>
                      {#if issue.comments > 0}
                        <span>•</span>
                        <span class="flex items-center">
                          <MessageSquare class="w-4 h-4 mr-1" />
                          {issue.comments}
                        </span>
                      {/if}
                    </div>
                    <div class="flex flex-wrap gap-2">
                      {#if issue.milestone}
                        <span class="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.milestone.title}
                        </span>
                      {/if}
                      {#if issue.labels}
                        {#each issue.labels as label}
                          <span class="px-2 py-1 rounded text-xs font-medium" style="background-color: #{label.color}20; color: #{label.color}">
                            {label.name}
                          </span>
                        {/each}
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
              {#if isExpanded}
                <div class="border-t border-gray-200 bg-gray-50 p-5">
                  {#if issue.body}
                    <div class="mb-4">
                      <h4 class="font-semibold text-gray-900 mb-2 text-sm">Description</h4>
                      <p class="text-sm text-gray-700 whitespace-pre-wrap">{issue.body}</p>
                    </div>
                  {/if}
                  {#if issue.comments > 0}
                    <div>
                      <h4 class="font-semibold text-gray-900 mb-3 flex items-center text-sm">
                        <MessageSquare class="w-4 h-4 mr-2" />
                        Commentaires
                      </h4>
                      {#if loadingComments[issue.number]}
                        <div class="text-center py-4 text-gray-500 text-sm">Chargement...</div>
                      {:else if comments.length > 0}
                        <div class="space-y-3">
                          {#each comments as comment}
                            <div class="bg-white rounded p-3 border border-gray-200">
                              <div class="flex items-center justify-between mb-2">
                                <span class="font-medium text-xs text-gray-900">{comment.user.login}</span>
                                <span class="text-xs text-gray-500">{formatDateTime(comment.created_at)}</span>
                              </div>
                              <p class="text-xs text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                            </div>
                          {/each}
                        </div>
                      {:else}
                        <p class="text-sm text-gray-500">Aucun commentaire</p>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </main>
  </div>
{/if}

<!-- Modal pour les détails de l'issue - EN DEHORS du bloc principal -->
{#if showModal && modalIssue}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" on:click={closeModal}>
    <!-- Overlay -->
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>

    <!-- Modal content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" on:click|stopPropagation>
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex-shrink-0">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                {#if modalIssue.state === 'open'}
                  <Circle class="w-5 h-5 text-white" />
                {:else}
                  <CheckCircle class="w-5 h-5 text-white" />
                {/if}
                <h3 class="text-lg font-semibold text-white">
                  #{modalIssue.number} {modalIssue.title}
                </h3>
              </div>
              <div class="flex items-center space-x-3 text-sm text-indigo-100">
                {#if modalIssue.assignees && modalIssue.assignees.length > 0}
                  <span class="flex items-center">
                    <User class="w-4 h-4 mr-1" />
                    {modalIssue.assignees.map(a => a.login).join(', ')}
                  </span>
                {/if}
                <span class="flex items-center">
                  <Clock class="w-4 h-4 mr-1" />
                  {formatDate(modalIssue.created_at)}
                </span>
              </div>
            </div>
            <button on:click={closeModal} class="text-white hover:text-gray-200 transition-colors">
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-4 overflow-y-auto flex-1">
          <!-- Tags -->
          <div class="flex flex-wrap gap-2 mb-4">
            {#if modalIssue.milestone}
              <span class="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 flex items-center">
                <GitBranch class="w-3 h-3 mr-1" />
                {modalIssue.milestone.title}
              </span>
            {/if}
            {#if modalIssue.project_status}
              <span class="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                {modalIssue.project_status}
              </span>
            {/if}
            {#if modalIssue.labels && modalIssue.labels.length > 0}
              {#each modalIssue.labels as label}
                <span class="px-3 py-1 rounded-full text-sm font-medium" style="background-color: #{label.color}20; color: #{label.color}; border: 1px solid #{label.color}40">
                  {label.name}
                </span>
              {/each}
            {/if}
          </div>

          <!-- Description -->
          {#if modalIssue.body}
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span class="w-1 h-4 bg-indigo-600 mr-2 rounded"></span>
                Description
              </h4>
              <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                {modalIssue.body}
              </div>
            </div>
          {:else}
            <div class="mb-6">
              <p class="text-sm text-gray-500 italic">Aucune description</p>
            </div>
          {/if}

          <!-- Comments -->
          {#if modalIssue.comments > 0}
            <div>
              <h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span class="w-1 h-4 bg-indigo-600 mr-2 rounded"></span>
                <MessageSquare class="w-4 h-4 mr-2" />
                Commentaires ({modalIssue.comments})
              </h4>
              {#if loadingComments[modalIssue.number]}
                <div class="flex items-center justify-center py-8">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              {:else if issueComments[modalIssue.number] && issueComments[modalIssue.number].length > 0}
                <div class="space-y-4">
                  {#each issueComments[modalIssue.number] as comment}
                    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div class="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                        <div class="flex items-center space-x-2">
                          {#if comment.user.avatar_url}
                            <img src={comment.user.avatar_url} alt={comment.user.login} class="w-6 h-6 rounded-full" />
                          {/if}
                          <span class="font-medium text-sm text-gray-900">{comment.user.login}</span>
                        </div>
                        <span class="text-xs text-gray-500">{formatDateTime(comment.created_at)}</span>
                      </div>
                      <div class="px-4 py-3">
                        <p class="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-gray-500 py-4">Aucun commentaire disponible</p>
              {/if}
            </div>
          {:else}
            <div class="text-center py-6">
              <MessageSquare class="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p class="text-sm text-gray-500">Aucun commentaire</p>
            </div>
          {/if}
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 flex-shrink-0">
          <div class="flex items-center"></div>
          <button
            on:click={closeModal}
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
{/if}
