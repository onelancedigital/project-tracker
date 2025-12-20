<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="app-container">
	{@render children()}
</div>

<footer class="app-footer">
	<p>Version: {data.version}</p>
</footer>

<style>
	.app-container {
		min-height: calc(100vh - 40px);
	}

	.app-footer {
		background: #f5f5f5;
		border-top: 1px solid #e0e0e0;
		padding: 12px 20px;
		text-align: center;
		font-size: 0.85rem;
		color: #666;
	}

	.app-footer p {
		margin: 0;
	}
</style>
