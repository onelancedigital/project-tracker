<script>
  import { onMount } from 'svelte';
  import { Circle, CheckCircle, Clock, Calendar, MessageSquare, User, GitBranch, LayoutGrid, LayoutList, AlertCircle, LogOut, X, ExternalLink, Activity, GitCommit, ListChecks } from 'lucide-svelte';
  
  export let data;

  let milestones = [];
  let issues = [];
  let events = [];
  let loading = true;
  let loadingEvents = false;
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

      // Si on est en mode actions, charger les événements
      if (viewMode === 'actions') {
        await fetchEvents();
      }
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function fetchEvents() {
    try {
      loadingEvents = true;
      const response = await fetch('/api/github/events');
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error);
      
      events = result.events;
    } catch (err) {
      console.error('Error loading events:', err);
      error = err.message;
    } finally {
      loadingEvents = false;
    }
  }

  async function switchViewMode(mode) {
    viewMode = mode;
    if (mode === 'actions' && events.length === 0) {
      await fetchEvents();
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

  function getEventIcon(eventType) {
    switch (eventType) {
      case 'IssuesEvent': return Circle;
      case 'IssueCommentEvent': return MessageSquare;
      case 'PushEvent': return GitCommit;
      case 'PullRequestEvent': return GitBranch;
      case 'PullRequestReviewEvent': return CheckCircle;
      case 'PullRequestReviewCommentEvent': return MessageSquare;
      default: return Activity;
    }
  }

  function getEventColor(eventType) {
    switch (eventType) {
      case 'IssuesEvent': return 'text-green-600';
      case 'IssueCommentEvent': return 'text-blue-600';
      case 'PushEvent': return 'text-purple-600';
      case 'PullRequestEvent': return 'text-indigo-600';
      case 'PullRequestReviewEvent': return 'text-yellow-600';
      case 'PullRequestReviewCommentEvent': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  }

  $: filteredIssues = selectedMilestone === 'all' 
    ? issues 
    : issues.filter(issue => issue.milestone && issue.milestone.title === selectedMilestone);

  // Filtrer les sub-issues pour les vues kanban (ne garder que les issues principales)
  $: mainIssues = filteredIssues.filter(issue => !issue.is_sub_issue);

  $: todoIssues = mainIssues.filter(issue => getIssueStatus(issue) === 'todo');
  $: inProgressIssues = mainIssues.filter(issue => getIssueStatus(issue) === 'in-progress');
  $: doneIssues = mainIssues.filter(issue => getIssueStatus(issue) === 'done');
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
      <div class="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center space-x-2 sm:space-x-3">
            <GitBranch class="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            <div>
              <h1 class="text-base sm:text-xl font-bold text-gray-900">Suivi du projet WEFAM</h1>
              <p class="text-xs sm:text-sm text-gray-500 hidden sm:block">{data.user.email}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2 sm:space-x-3">
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button
                on:click={() => switchViewMode('kanban')}
                class="px-2 sm:px-3 py-1 rounded flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors {viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
              >
                <LayoutGrid class="w-4 h-4" />
                <span class="hidden sm:inline">Kanban</span>
              </button>
              <button
                on:click={() => switchViewMode('list')}
                class="px-2 sm:px-3 py-1 rounded flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors {viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
              >
                <LayoutList class="w-4 h-4" />
                <span class="hidden sm:inline">Liste</span>
              </button>
              <button
                on:click={() => switchViewMode('actions')}
                class="px-2 sm:px-3 py-1 rounded flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm font-medium transition-colors {viewMode === 'actions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
              >
                <Activity class="w-4 h-4" />
                <span class="hidden sm:inline">Actions</span>
              </button>
            </div>
            <button
              on:click={logout}
              class="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut class="w-4 h-4" />
              <span class="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <!-- Milestones -->
      <section class="mb-6 sm:mb-8">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Jalons</h2>
        {#if milestones.length === 0}
          <div class="bg-white rounded-lg shadow p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
            Aucun milestone configuré
          </div>
        {:else}
          <div class="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {#each milestones as milestone}
              {@const progress = calculateProgress(milestone)}
              <div class="bg-white rounded-lg shadow p-4 sm:p-6">
                <div class="flex items-start justify-between mb-2 sm:mb-3">
                  <h3 class="text-base sm:text-lg font-semibold text-gray-900">{milestone.title}</h3>
                  <span class="text-xs sm:text-sm font-medium text-indigo-600">{progress}%</span>
                </div>
                {#if milestone.description}
                  <p class="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{milestone.description}</p>
                {/if}
                <div class="w-full bg-gray-200 rounded-full h-2 mb-3 sm:mb-4">
                  <div class="bg-indigo-600 h-2 rounded-full transition-all" style="width: {progress}%"></div>
                </div>
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm">
                  <div class="flex items-center space-x-2 sm:space-x-4">
                    <span class="text-green-600">✓ {milestone.closed_issues}</span>
                    <span class="text-gray-600">○ {milestone.open_issues}</span>
                  </div>
                  {#if milestone.due_on}
                    <div class="flex items-center text-gray-500">
                      <Calendar class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Issues</h2>
        <select
          bind:value={selectedMilestone}
          class="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
        <!-- Mobile: Colonnes empilées verticalement -->
        <div class="sm:hidden space-y-4">
            <!-- À faire Mobile -->
            <div class="flex flex-col">
              <div class="bg-gray-200 rounded-t-lg px-3 py-2 flex items-center justify-between">
                <h3 class="font-bold text-gray-900 flex items-center text-xs">
                  <Circle class="w-3 h-3 mr-1 text-gray-500" />
                  À faire
                </h3>
                <span class="bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {todoIssues.length}
                </span>
              </div>
              <div class="bg-gray-100 rounded-b-lg p-2 space-y-2 flex-1 overflow-y-auto">
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
                      {#if issue.comments > 0}
                        <div class="flex items-center text-xs text-gray-600 mb-2">
                          <MessageSquare class="w-3 h-3 mr-1" />
                          {issue.comments} commentaire{issue.comments > 1 ? 's' : ''}
                        </div>
                      {/if}
                      {#if issue.sub_issues_stats && issue.sub_issues_stats.total > 0}
                        <div class="flex items-center text-xs text-gray-600 mb-2">
                          <ListChecks class="w-3 h-3 mr-1" />
                          <span class="{issue.sub_issues_stats.completed === issue.sub_issues_stats.total ? 'text-green-600 font-semibold' : ''}">
                            {issue.sub_issues_stats.completed}/{issue.sub_issues_stats.total} sub-issues
                          </span>
                        </div>
                      {/if}
                      <div class="flex flex-wrap gap-1">
                        {#if issue.milestone}
                          <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            {issue.milestone.title}
                          </span>
                        {/if}
                        {#if issue.issue_type}
                          <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            {issue.issue_type}
                          </span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- En cours Mobile -->
            <div class="flex flex-col">
              <div class="bg-blue-200 rounded-t-lg px-3 py-2 flex items-center justify-between">
                <h3 class="font-bold text-gray-900 flex items-center text-xs">
                  <Clock class="w-3 h-3 mr-1 text-blue-600" />
                  En cours
                </h3>
                <span class="bg-blue-300 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {inProgressIssues.length}
                </span>
              </div>
              <div class="bg-blue-50 rounded-b-lg p-2 space-y-2 flex-1 overflow-y-auto">
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
                      {#if issue.comments > 0}
                        <div class="flex items-center text-xs text-gray-600 mb-2">
                          <MessageSquare class="w-3 h-3 mr-1" />
                          {issue.comments} commentaire{issue.comments > 1 ? 's' : ''}
                        </div>
                      {/if}
                      {#if issue.sub_issues_stats && issue.sub_issues_stats.total > 0}
                        <div class="flex items-center text-xs text-gray-600 mb-2">
                          <ListChecks class="w-3 h-3 mr-1" />
                          <span class="{issue.sub_issues_stats.completed === issue.sub_issues_stats.total ? 'text-green-600 font-semibold' : ''}">
                            {issue.sub_issues_stats.completed}/{issue.sub_issues_stats.total} sub-issues
                          </span>
                        </div>
                      {/if}
                      <div class="flex flex-wrap gap-1">
                        {#if issue.milestone}
                          <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            {issue.milestone.title}
                          </span>
                        {/if}
                        {#if issue.issue_type}
                          <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                            {issue.issue_type}
                          </span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- Terminé Mobile -->
            <div class="flex flex-col">
              <div class="bg-green-200 rounded-t-lg px-3 py-2 flex items-center justify-between">
                <h3 class="font-bold text-gray-900 flex items-center text-xs">
                  <CheckCircle class="w-3 h-3 mr-1 text-green-600" />
                  Terminé
                </h3>
                <span class="bg-green-300 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                  {doneIssues.length}
                </span>
              </div>
              <div class="bg-green-50 rounded-b-lg p-2 space-y-2 flex-1 overflow-y-auto">
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
                      {#if issue.comments > 0}
                        <div class="flex items-center text-xs text-gray-600 mb-2">
                          <MessageSquare class="w-3 h-3 mr-1" />
                          {issue.comments} commentaire{issue.comments > 1 ? 's' : ''}
                        </div>
                      {/if}
                      {#if issue.sub_issues_stats && issue.sub_issues_stats.total > 0}
                        <div class="flex items-center text-xs text-gray-600 mb-2">
                          <ListChecks class="w-3 h-3 mr-1" />
                          <span class="{issue.sub_issues_stats.completed === issue.sub_issues_stats.total ? 'text-green-600 font-semibold' : ''}">
                            {issue.sub_issues_stats.completed}/{issue.sub_issues_stats.total} sub-issues
                          </span>
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

        <!-- Desktop: Grille 3 colonnes -->
        <div class="hidden sm:grid sm:grid-cols-3 gap-4">
          <!-- À faire Desktop -->
          <div class="flex flex-col">
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
                    {#if issue.comments > 0}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <MessageSquare class="w-3 h-3 mr-1" />
                        {issue.comments} commentaire{issue.comments > 1 ? 's' : ''}
                      </div>
                    {/if}
                    {#if issue.sub_issues_stats && issue.sub_issues_stats.total > 0}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <ListChecks class="w-3 h-3 mr-1" />
                        <span class="{issue.sub_issues_stats.completed === issue.sub_issues_stats.total ? 'text-green-600 font-semibold' : ''}">
                          {issue.sub_issues_stats.completed}/{issue.sub_issues_stats.total} sub-issues
                        </span>
                      </div>
                    {/if}
                    <div class="flex flex-wrap gap-1">
                      {#if issue.milestone}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.milestone.title}
                        </span>
                      {/if}
                      {#if issue.issue_type}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.issue_type}
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- En cours Desktop -->
          <div class="flex flex-col">
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
                    {#if issue.comments > 0}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <MessageSquare class="w-3 h-3 mr-1" />
                        {issue.comments} commentaire{issue.comments > 1 ? 's' : ''}
                      </div>
                    {/if}
                    {#if issue.sub_issues_stats && issue.sub_issues_stats.total > 0}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <ListChecks class="w-3 h-3 mr-1" />
                        <span class="{issue.sub_issues_stats.completed === issue.sub_issues_stats.total ? 'text-green-600 font-semibold' : ''}">
                          {issue.sub_issues_stats.completed}/{issue.sub_issues_stats.total} sub-issues
                        </span>
                      </div>
                    {/if}
                    <div class="flex flex-wrap gap-1">
                      {#if issue.milestone}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.milestone.title}
                        </span>
                      {/if}
                      {#if issue.issue_type}
                        <span class="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.issue_type}
                        </span>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          <!-- Terminé Desktop -->
          <div class="flex flex-col">
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
                    {#if issue.comments > 0}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <MessageSquare class="w-3 h-3 mr-1" />
                        {issue.comments} commentaire{issue.comments > 1 ? 's' : ''}
                      </div>
                    {/if}
                    {#if issue.sub_issues_stats && issue.sub_issues_stats.total > 0}
                      <div class="flex items-center text-xs text-gray-600 mb-2">
                        <ListChecks class="w-3 h-3 mr-1" />
                        <span class="{issue.sub_issues_stats.completed === issue.sub_issues_stats.total ? 'text-green-600 font-semibold' : ''}">
                          {issue.sub_issues_stats.completed}/{issue.sub_issues_stats.total} sub-issues
                        </span>
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
      {:else if viewMode === 'list'}
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
                      {#if issue.issue_type}
                        <span class="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                          {issue.issue_type}
                        </span>
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
      {:else}
        <!-- Actions View -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-4 sm:p-6 border-b border-gray-200">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 class="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <Activity class="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-600" />
                Flux d'activité
              </h2>
              <button
                on:click={fetchEvents}
                class="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium"
                disabled={loadingEvents}
              >
                {loadingEvents ? 'Actualisation...' : 'Actualiser'}
              </button>
            </div>
          </div>
          <div class="p-4 sm:p-6">
            {#if loadingEvents}
              <div class="flex items-center justify-center py-12">
                <div class="text-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p class="text-gray-600">Chargement des événements...</p>
                </div>
              </div>
            {:else if events.length === 0}
              <div class="text-center py-12">
                <Activity class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p class="text-gray-500 text-lg font-medium mb-2">Aucun événement</p>
                <p class="text-gray-400 text-sm">Les événements récents apparaîtront ici</p>
              </div>
            {:else}
              <div class="relative">
                <!-- Timeline line -->
                <div class="absolute left-5 sm:left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div class="space-y-4 sm:space-y-6">
                  {#each events as event}
                    {@const IconComponent = getEventIcon(event.type)}
                    {@const iconColor = getEventColor(event.type)}
                    <div class="relative flex items-start space-x-2 sm:space-x-4 pl-0 sm:pl-2">
                      <!-- Icon -->
                      <div class="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center relative z-10">
                        <svelte:component this={IconComponent} class="w-4 h-4 sm:w-5 sm:h-5 {iconColor}" />
                      </div>
                      
                      <!-- Content -->
                      <div class="flex-1 bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-0 mb-2">
                          <div class="flex items-center space-x-2">
                            {#if event.actor_avatar}
                              <img src={event.actor_avatar} alt={event.actor} class="w-5 h-5 sm:w-6 sm:h-6 rounded-full" />
                            {/if}
                            <span class="font-semibold text-gray-900 text-xs sm:text-sm">{event.actor}</span>
                          </div>
                          <span class="text-xs text-gray-500">{formatDateTime(event.created_at)}</span>
                        </div>
                        
                        <p class="text-xs sm:text-sm text-gray-700 mb-2">{event.description}</p>
                        
                        <!-- Details spécifiques selon le type -->
                        {#if event.type === 'PushEvent' && event.commits && event.commits.length > 0}
                          <div class="mt-3 space-y-1">
                            {#each event.commits as commit}
                              <div class="flex items-start space-x-2 text-xs bg-white rounded p-2 border border-gray-200">
                                <code class="font-mono text-purple-600 font-semibold">{commit.sha}</code>
                                <span class="text-gray-700 flex-1">{commit.message}</span>
                              </div>
                            {/each}
                            {#if event.commit_count > 3}
                              <p class="text-xs text-gray-500 italic pl-2">+ {event.commit_count - 3} autres commits</p>
                            {/if}
                          </div>
                        {/if}
                        
                        {#if event.comment_body}
                          <div class="mt-3 bg-white rounded p-3 border border-gray-200">
                            <p class="text-xs text-gray-700 whitespace-pre-wrap line-clamp-3">{event.comment_body}</p>
                          </div>
                        {/if}
                        
                        <!-- Badges -->
                        <div class="flex flex-wrap gap-2 mt-3">
                          {#if event.issue_number}
                            <span class="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                              Issue #{event.issue_number}
                            </span>
                          {/if}
                          {#if event.pr_number}
                            <span class="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              PR #{event.pr_number}
                            </span>
                          {/if}
                          {#if event.action}
                            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              {event.action}
                            </span>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </main>
  </div>
{/if}

<!-- Modal pour les détails de l'issue - EN DEHORS du bloc principal -->
{#if showModal && modalIssue}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" on:click={closeModal}>
    <!-- Overlay -->
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>

    <!-- Modal content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="relative bg-white rounded-none sm:rounded-lg shadow-2xl w-full sm:max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col" on:click|stopPropagation>
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0 pr-2">
              <div class="flex items-center space-x-2 mb-2">
                {#if modalIssue.state === 'open'}
                  <Circle class="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                {:else}
                  <CheckCircle class="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                {/if}
                <h3 class="text-sm sm:text-lg font-semibold text-white line-clamp-2">
                  #{modalIssue.number} {modalIssue.title}
                </h3>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-indigo-100">
                {#if modalIssue.assignees && modalIssue.assignees.length > 0}
                  <span class="flex items-center">
                    <User class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {modalIssue.assignees.map(a => a.login).join(', ')}
                  </span>
                {/if}
                <span class="flex items-center">
                  <Clock class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {formatDate(modalIssue.created_at)}
                </span>
              </div>
            </div>
            <button on:click={closeModal} class="text-white hover:text-gray-200 transition-colors flex-shrink-0">
              <X class="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 overflow-y-auto flex-1">
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
            {#if modalIssue.issue_type}
              <span class="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700">
                {modalIssue.issue_type}
              </span>
            {/if}
          </div>

          <!-- Sub-Issues -->
          {#if modalIssue.sub_issues && modalIssue.sub_issues.length > 0}
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span class="w-1 h-4 bg-indigo-600 mr-2 rounded"></span>
                <ListChecks class="w-4 h-4 mr-2" />
                Sub-issues ({modalIssue.sub_issues_stats.completed}/{modalIssue.sub_issues_stats.total})
              </h4>
              <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="mb-3">
                  <div class="flex items-center justify-between text-sm mb-2">
                    <span class="text-gray-700">Progression</span>
                    <span class="font-semibold {modalIssue.sub_issues_stats.completed === modalIssue.sub_issues_stats.total ? 'text-green-600' : 'text-indigo-600'}">
                      {Math.round((modalIssue.sub_issues_stats.completed / modalIssue.sub_issues_stats.total) * 100)}%
                    </span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      class="h-2 rounded-full transition-all {modalIssue.sub_issues_stats.completed === modalIssue.sub_issues_stats.total ? 'bg-green-600' : 'bg-indigo-600'}" 
                      style="width: {(modalIssue.sub_issues_stats.completed / modalIssue.sub_issues_stats.total) * 100}%"
                    ></div>
                  </div>
                </div>
                <div class="space-y-2">
                  {#each modalIssue.sub_issues as subIssue}
                    {@const isCompleted = subIssue.state === 'closed'}
                    <div 
                      class="flex items-start space-x-2 p-3 bg-white rounded border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                    >
                      <div class="flex-shrink-0 mt-0.5">
                        {#if isCompleted}
                          <CheckCircle class="w-4 h-4 text-green-600" />
                        {:else}
                          <Circle class="w-4 h-4 text-gray-400" />
                        {/if}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                          <span class="text-sm {isCompleted ? 'line-through text-gray-500' : 'text-gray-700 group-hover:text-indigo-700'}">
                            #{subIssue.number} {subIssue.title}
                          </span>
                          <ExternalLink class="w-3 h-3 text-gray-400 group-hover:text-indigo-600 flex-shrink-0 ml-2" />
                        </div>
                        {#if subIssue.assignees && subIssue.assignees.length > 0}
                          <div class="flex items-center mt-1 text-xs text-gray-500">
                            <User class="w-3 h-3 mr-1" />
                            {subIssue.assignees.map(a => a.login).join(', ')}
                          </div>
                        {/if}
                        {#if subIssue.labels && subIssue.labels.length > 0}
                          <div class="flex flex-wrap gap-1 mt-2">
                            {#each subIssue.labels.slice(0, 3) as label}
                              <span 
                                class="px-2 py-0.5 rounded text-xs font-medium"
                                style="background-color: #{label.color}20; color: #{label.color}"
                              >
                                {label.name}
                              </span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}

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
        <div class="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-t border-gray-200 flex-shrink-0">
          <div class="flex items-center"></div>
          <button
            on:click={closeModal}
            class="w-full sm:w-auto px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
{/if}
