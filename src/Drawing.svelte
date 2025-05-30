<script>
  import { onMount, createEventDispatcher } from "svelte";
  import { pannable } from "./utils/pannable.js";
  import { readAsArrayBuffer } from "./utils/asyncReader.js";
  export let originWidth;
  export let originHeight;
  export let width;
  export let x;
  export let y;
  export let pageScale = 1;
  export let path;
  const dispatch = createEventDispatcher();
  let startX;
  let startY;
  let svg;
  let operation = "";
  let dx = 0;
  let dy = 0;
  let dw = 0;
  let direction = "";
  const ratio = originWidth / originHeight;
  
  // Get access to the page zoom level from the parent component
  let currentZoom = 1;
  $: {
    // Update when pageScale changes, as it now includes the zoom level
    if (typeof pageScale === 'number') {
      currentZoom = pageScale;
    }
  }
  
  async function render() {
    svg.setAttribute("viewBox", `0 0 ${originWidth} ${originHeight}`);
  }
  
  function handlePanMove(event) {
    // Adjust movements based on current zoom level
    const _dx = (event.detail.x - startX) / pageScale;
    const _dy = (event.detail.y - startY) / pageScale;
    if (operation === "move") {
      dx = _dx;
      dy = _dy;
    } else if (operation === "scale") {
      if (direction === "left-top") {
        let d = Infinity;
        d = Math.min(_dx, _dy * ratio);
        dx = d;
        dw = -d;
        dy = d / ratio;
      }
      if (direction === "right-bottom") {
        let d = -Infinity;
        d = Math.max(_dx, _dy * ratio);
        dw = d;
      }
    }
  }

  function handlePanEnd(event) {
    if (operation === "move") {
      dispatch("update", {
        x: x + dx,
        y: y + dy
      });
      dx = 0;
      dy = 0;
    } else if (operation === "scale") {
      dispatch("update", {
        x: x + dx,
        y: y + dy,
        width: width + dw,
        scale: (width + dw) / originWidth
      });
      dx = 0;
      dy = 0;
      dw = 0;
      direction = "";
    }
    operation = "";
  }
  
  function handlePanStart(event) {
    startX = event.detail.x;
    startY = event.detail.y;
    
    // Dispatch an event to App.svelte to mark this object as selected
    dispatch("update", { selected: true });
    
    if (event.detail.target === event.currentTarget) {
      return (operation = "move");
    }
    operation = "scale";
    direction = event.detail.target.dataset.direction;
  }
  
  function onDelete() {
    dispatch("delete");
  }
  
  onMount(render);
</script>

<style>
  .operation {
    background-color: rgba(0, 0, 0, 0.1);
  }
  .resize-dot {
    @apply absolute rounded-full border border-gray-600 w-3 h-3 bg-white;
  }
</style>

<svelte:options immutable={true} />
<div
  class="absolute left-0 top-0"
  style="width: {width + dw}px; transform: translate({x + dx}px, {y + dy}px);">
  <div
    use:pannable
    on:panstart={handlePanStart}
    on:panmove={handlePanMove}
    on:panend={handlePanEnd}
    class="absolute w-full h-full"
    class:operation>
    <div
      data-direction="left-top"
      class="resize-dot left-0 top-0 transform -translate-x-1/2 -translate-y-1/2
      cursor-nwse-resize" />
    <div
      data-direction="right-bottom"
      class="resize-dot right-0 bottom-0 transform translate-x-1/2
      translate-y-1/2 cursor-nwse-resize" />
  </div>
  <div
    on:click={onDelete}
    class="absolute left-0 top-0 right-0 w-12 h-12 m-auto rounded-full bg-white
    cursor-pointer transform -translate-y-1/2 md:scale-25">
    <img class="w-full h-full" src="/delete.svg" alt="delete object" />
  </div>
  <svg
    bind:this={svg}
    viewBox={`0 0 ${originWidth} ${originHeight}`}
    class="w-full h-auto"
    style="width: 100%;">
    <path d={path} stroke="black" fill="none" stroke-width="5" />
  </svg>
</div>
