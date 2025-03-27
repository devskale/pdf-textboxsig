<script>
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  export let page;
  const dispatch = createEventDispatcher();
  let canvas;
  let width;
  let height;
  let clientWidth;
  let mounted;
  let zoomLevel = 1; // Default zoom level
  function measure() {
    // Calculate the natural scale (without zoom)
    const naturalScale = canvas.clientWidth / width;
    // Send both the natural scale and zoom level to parent component
    dispatch("measure", {
      scale: naturalScale,
      zoomLevel: zoomLevel
    });
  }
  
  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.1, 3); // Limit max zoom to 3x
    updateZoom();
    // Update the page object with the current zoom level
    page.then(p => p.zoomLevel = zoomLevel);
  }
  
  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.1, 0.5); // Limit min zoom to 0.5x
    updateZoom();
    // Update the page object with the current zoom level
    page.then(p => p.zoomLevel = zoomLevel);
  }
  
  function updateZoom() {
    if (canvas) {
      measure();
    }
  }
  
  async function render() {
    const _page = await page;
    const context = canvas.getContext("2d");
    const viewport = _page.getViewport({ scale: 1, rotation: 0 });
    width = viewport.width;
    height = viewport.height;
    
    // Set canvas dimensions to match the viewport
    canvas.width = width;
    canvas.height = height;
    
    // Render with the base scale (1)
    await _page.render({
      canvasContext: context,
      viewport
    }).promise;
    
    // Initialize the zoom level property on the page object
    _page.zoomLevel = zoomLevel;
    
    measure();
    window.addEventListener("resize", measure);
    
    // Add keyboard event listeners for zoom
    // Use capture phase to ensure our handler runs before others
    window.addEventListener("keydown", handleKeyDown, true);
    
    // Set mounted flag to true
    mounted = true;
  }
  
  function handleKeyDown(event) {
    // Only process if not in a text input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
        event.target.getAttribute('contenteditable') === 'true') {
      return;
    }
    
    // Check for zoom keyboard shortcuts
    if (event.key === '+' || (event.key === '=' && event.shiftKey)) {
      event.preventDefault();
      zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomOut();
    }
  }
  onMount(render);
  onDestroy(() => {
    window.removeEventListener("resize", measure);
    window.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="relative">
  <canvas
    bind:this={canvas}
    class="max-w-full"
    style="width: {width * zoomLevel}px;"
    {width}
    {height} />
  
  <div class="absolute top-2 right-2 flex items-center bg-white rounded-md shadow-md p-1">
    <button 
      on:click={zoomOut}
      class="p-1 hover:bg-gray-200 rounded-md" 
      title="Zoom Out (- key)">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    </button>
    <span class="mx-2 text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
    <button 
      on:click={zoomIn}
      class="p-1 hover:bg-gray-200 rounded-md" 
      title="Zoom In (+ key)">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    </button>
  </div>
</div>
