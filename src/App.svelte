<script>
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import Tailwind from "./Tailwind.svelte";
  import PDFPage from "./PDFPage.svelte";
  import Image from "./Image.svelte";
  import Text from "./Text.svelte";
  import Drawing from "./Drawing.svelte";
  import DrawingCanvas from "./DrawingCanvas.svelte";
  import Box from "./Box.svelte";
  import prepareAssets, { fetchFont } from "./utils/prepareAssets.js";
  import {
    readAsArrayBuffer,
    readAsImage,
    readAsPDF,
    readAsDataURL
  } from "./utils/asyncReader.js";
  import { ggID } from "./utils/helper.js";
  import { save } from "./utils/PDF.js";
  const genID = ggID();
  let pdfFile;
  let pdfName = "";
  let pages = [];
  let pagesScale = [];
  let allObjects = [];
  let currentFont = "Times-Roman";
  let focusId = null;
  let selectedPageIndex = -1;
  let saving = false;
  let addingDrawing = false;
// Add these variables to track mouse position
let mouseX = 0;
let mouseY = 0;
let currentPageElement = null;
let currentPageRect = null;
// Add this to your existing variables in App.svelte
let selectedObjectId = null;

  // for test purpose
  onMount(async () => {
    try {
      const res = await fetch("/test.pdf");
      const pdfBlob = await res.blob();
      await addPDF(pdfBlob);
      selectedPageIndex = 0;
      setTimeout(() => {
        fetchFont(currentFont);
        prepareAssets();
      }, 5000);
      // const imgBlob = await (await fetch("/test.jpg")).blob();
      // addImage(imgBlob);
      // addTextField("測試!");
      // addDrawing(200, 100, "M30,30 L100,50 L50,70", 0.5);
    } catch (e) {
      console.log(e);
    }
  });
  async function onUploadPDF(e) {
    const files = e.target.files || (e.dataTransfer && e.dataTransfer.files);
    const file = files[0];
    if (!file || file.type !== "application/pdf") return;
    selectedPageIndex = -1;
    try {
      await addPDF(file);
      selectedPageIndex = 0;
    } catch (e) {
      console.log(e);
    }
  }
  async function addPDF(file) {
    try {
      const pdf = await readAsPDF(file);
      pdfName = file.name;
      pdfFile = file;
      const numPages = pdf.numPages;
      pages = Array(numPages)
        .fill()
        .map((_, i) => pdf.getPage(i + 1));
      allObjects = pages.map(() => []);
      pagesScale = Array(numPages).fill(1);
    } catch (e) {
      console.log("Failed to add pdf.");
      throw e;
    }
  }
  async function onUploadImage(e) {
    const file = e.target.files[0];
    if (file && selectedPageIndex >= 0) {
      addImage(file);
    }
    e.target.value = null;
  }
  async function addImage(file) {
    try {
      // get dataURL to prevent canvas from tainted
      const url = await readAsDataURL(file);
      const img = await readAsImage(url);
      const id = genID();
      const { width, height } = img;
      const object = {
        id,
        type: "image",
        width,
        height,
        x: 0,
        y: 0,
        payload: img,
        file
      };
      allObjects = allObjects.map((objects, pIndex) =>
        pIndex === selectedPageIndex ? [...objects, object] : objects
      );
    } catch (e) {
      console.log(`Fail to add image.`, e);
    }
  }
  function onAddBox() {
  if (selectedPageIndex >= 0) {
    addBox();
  }
}

// Add this function to duplicate objects
function duplicateObject(objectId) {
  if (!objectId) return;
  
  // Find the object and its page index
  let targetObject = null;
  let targetPageIndex = -1;
  
  allObjects.forEach((objects, pIndex) => {
    const obj = objects.find(o => o.id === objectId);
    if (obj) {
      targetObject = obj;
      targetPageIndex = pIndex;
    }
  });
  
  if (!targetObject || targetPageIndex === -1) return;
  
  // Create a deep copy of the object with a new ID
  const newObject = JSON.parse(JSON.stringify(targetObject));
  newObject.id = genID();
  
  // Offset the position slightly (20px down and right)
  newObject.x += 20;
  newObject.y += 20;
  
  // Add the new object to the same page
  allObjects = allObjects.map((objects, pIndex) =>
    pIndex === targetPageIndex ? [...objects, newObject] : objects
  );
}
function handleMouseMove(event) {
  // Update the mouse coordinates
  mouseX = event.clientX;
  mouseY = event.clientY;
  
  // Find which page the mouse is over
  const pageElements = document.querySelectorAll('.page-container');
  for (let i = 0; i < pageElements.length; i++) {
    const rect = pageElements[i].getBoundingClientRect();
    if (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    ) {
      currentPageElement = pageElements[i];
      currentPageRect = rect;
      selectedPageIndex = i;
      break;
    }
  }
}
function handleKeyDown(event) {
  // Only process if not in a text input field
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
      event.target.getAttribute('contenteditable') === 'true') {
    return;
  }
  
  // Check if 'd' key is pressed and an object is selected
  if (event.key === 'd' && selectedObjectId) {
    duplicateObject(selectedObjectId);
  }
  
  // Add text at mouse position when 't' is pressed
  else if (event.key === 't' && currentPageRect && selectedPageIndex >= 0) {
    // Calculate position relative to the page
    const relativeX = (mouseX - currentPageRect.left) / pagesScale[selectedPageIndex];
    const relativeY = (mouseY - currentPageRect.top) / pagesScale[selectedPageIndex];
    addTextFieldAt(relativeX, relativeY);
  }
  
  // Add box at mouse position when 'b' is pressed
  else if (event.key === 'b' && currentPageRect && selectedPageIndex >= 0) {
    // Calculate position relative to the page
    const relativeX = (mouseX - currentPageRect.left) / pagesScale[selectedPageIndex];
    const relativeY = (mouseY - currentPageRect.top) / pagesScale[selectedPageIndex];
    addBoxAt(relativeX, relativeY);
  }
}
// Function to add text field at specific position
function addTextFieldAt(x, y, text = "New Text Field") {
  const id = genID();
  fetchFont(currentFont);
  const object = {
    id,
    text,
    type: "text",
    size: 16,
    width: 0, // recalculate after editing
    lineHeight: 1.4,
    fontFamily: currentFont,
    x: x,
    y: y
  };
  
  allObjects = allObjects.map((objects, pIndex) =>
    pIndex === selectedPageIndex ? [...objects, object] : objects
  );
}
// Function to add box at specific position
function addBoxAt(x, y) {
  const id = genID();
  const object = {
    id,
    type: "box",
    width: 200,
    height: 150,
    x: x,
    y: y,
    color: "#FFFFFF",
    opacity: 1,
    borderWidth: 1,
    borderColor: "#000000"
  };
  
  allObjects = allObjects.map((objects, pIndex) =>
    pIndex === selectedPageIndex ? [...objects, object] : objects
  );
}
// Add this to your onMount function to register the keyboard event listener
onMount(async () => {
  // Your existing onMount code...
  
  // Add event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousemove', handleMouseMove);
  
  // Add a class to page containers for easier selection
  setTimeout(() => {
    const pageContainers = document.querySelectorAll('.p-5.w-full.flex.flex-col.items-center.overflow-hidden');
    pageContainers.forEach(container => {
      container.classList.add('page-container');
    });
  }, 1000);
  
  return () => {
    // Your existing cleanup code...
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mousemove', handleMouseMove);
  };
});


function addBox() {
  const id = genID();
  const object = {
    id,
    type: "box",
    width: 200,
    height: 150,
    x: 0,
    y: 0,
    color: "#FFFFFF",
    opacity: 1,
    borderWidth: 1,
    borderColor: "#000000"
  };
  allObjects = allObjects.map((objects, pIndex) =>
    pIndex === selectedPageIndex ? [...objects, object] : objects
  );
}
  function onAddTextField() {
    if (selectedPageIndex >= 0) {
      addTextField();
    }
  }
  function addTextField(text = "New Text Field") {
    const id = genID();
    fetchFont(currentFont);
    const object = {
      id,
      text,
      type: "text",
      size: 16,
      width: 0, // recalculate after editing
      lineHeight: 1.4,
      fontFamily: currentFont,
      x: 0,
      y: 0
    };
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex === selectedPageIndex ? [...objects, object] : objects
    );
  }
  function onAddDrawing() {
    if (selectedPageIndex >= 0) {
      addingDrawing = true;
    }
  }
  function addDrawing(originWidth, originHeight, path, scale = 1) {
    const id = genID();
    const object = {
      id,
      path,
      type: "drawing",
      x: 0,
      y: 0,
      originWidth,
      originHeight,
      width: originWidth * scale,
      scale
    };
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex === selectedPageIndex ? [...objects, object] : objects
    );
  }
  function selectFontFamily(event) {
    const name = event.detail.name;
    fetchFont(name);
    currentFont = name;
  }
  function selectPage(index) {
    selectedPageIndex = index;
  }
// Modify your updateObject function to track the selected object
function updateObject(objectId, payload) {
  selectedObjectId = objectId; // Set the selected object
  allObjects = allObjects.map((objects, pIndex) =>
    pIndex == selectedPageIndex
      ? objects.map(object =>
          object.id === objectId ? { ...object, ...payload } : object
        )
      : objects
  );
}
  function deleteObject(objectId) {
    allObjects = allObjects.map((objects, pIndex) =>
      pIndex == selectedPageIndex
        ? objects.filter(object => object.id !== objectId)
        : objects
    );
  }
  function onMeasure(e, i) {
    // Store the scale for proper positioning
    // The PDFPage component now sends both natural scale and zoom level
    pagesScale[i] = e.detail.scale;
    
    // Force update of all objects when zoom changes
    if (e.detail.zoomLevel) {
      allObjects = [...allObjects];
    }
  }
  // FIXME: Should wait all objects finish their async work
  async function savePDF() {
    if (!pdfFile || saving || !pages.length) return;
    saving = true;
    try {
      // Get the first page to extract original dimensions
      const firstPage = await pages[0];
      const [originalWidth, originalHeight] = [
        firstPage.view[2] - firstPage.view[0],
        firstPage.view[3] - firstPage.view[1]
      ];
      
      // Pass pagesScale to ensure consistent positioning during download
      await save(pdfFile, allObjects, pdfName, pagesScale, originalWidth, originalHeight);
    } catch (e) {
      console.error('Failed to save PDF:', e);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window
  on:dragenter|preventDefault
  on:dragover|preventDefault
  on:drop|preventDefault={onUploadPDF} />
<Tailwind />
<main class="flex flex-col items-center py-16 bg-gray-100 min-h-screen">
  <div
    class="fixed z-10 top-0 left-0 right-0 h-12 flex justify-center items-center
    bg-gray-200 border-b border-gray-300">
    <input
      type="file"
      name="pdf"
      id="pdf"
      on:change={onUploadPDF}
      class="hidden" />
    <input
      type="file"
      id="image"
      name="image"
      class="hidden"
      on:change={onUploadImage} />
    <label
      class="whitespace-no-wrap bg-blue-500 hover:bg-blue-700 text-white
      font-bold py-1 px-3 md:px-4 rounded mr-3 cursor-pointer md:mr-4"
      for="pdf">
      Choose PDF
    </label>
    <div
      class="relative mr-3 flex h-8 bg-gray-400 rounded-sm overflow-hidden
      md:mr-4">
      <label
        class="flex items-center justify-center h-full w-8 hover:bg-gray-500
        cursor-pointer"
        for="image"
        class:cursor-not-allowed={selectedPageIndex < 0}
        class:bg-gray-500={selectedPageIndex < 0}>
        <img src="image.svg" alt="An icon for adding images" />
      </label>
      <label
        class="flex items-center justify-center h-full w-8 hover:bg-gray-500
        cursor-pointer"
        for="text"
        class:cursor-not-allowed={selectedPageIndex < 0}
        class:bg-gray-500={selectedPageIndex < 0}
        on:click={onAddTextField}>
        <img src="notes.svg" alt="An icon for adding text" />
      </label>
      <label
  class="flex items-center justify-center h-full w-8 hover:bg-gray-500
  cursor-pointer"
  for="box"
  class:cursor-not-allowed={selectedPageIndex < 0}
  class:bg-gray-500={selectedPageIndex < 0}
  on:click={onAddBox}>
  <img src="box.svg" alt="An icon for adding boxes" />
</label>
      <label
        class="flex items-center justify-center h-full w-8 hover:bg-gray-500
        cursor-pointer"
        on:click={onAddDrawing}
        class:cursor-not-allowed={selectedPageIndex < 0}
        class:bg-gray-500={selectedPageIndex < 0}>
        <img src="gesture.svg" alt="An icon for adding drawing" />
      </label>
    </div>
    <div class="justify-center mr-3 md:mr-4 w-full max-w-xs hidden md:flex">
      <img src="/edit.svg" class="mr-2" alt="a pen, edit pdf name" />
      <input
        placeholder="Rename your PDF here"
        type="text"
        class="flex-grow bg-transparent"
        bind:value={pdfName} />
    </div>
    <button
      on:click={savePDF}
      class="w-20 bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3
      md:px-4 mr-3 md:mr-4 rounded"
      class:cursor-not-allowed={pages.length === 0 || saving || !pdfFile}
      class:bg-blue-700={pages.length === 0 || saving || !pdfFile}>
      {saving ? 'Saving' : 'Save'}
    </button>
    <a href="https://github.com/ShizukuIchi/pdf-editor">
      <img
        src="/GitHub-Mark-32px.png"
        alt="A GitHub icon leads to personal GitHub page" />
    </a>
  </div>
  {#if addingDrawing}
    <div
      transition:fly={{ y: -200, duration: 500 }}
      class="fixed z-10 top-0 left-0 right-0 border-b border-gray-300 bg-white
      shadow-lg"
      style="height: 50%;">
      <DrawingCanvas
        on:finish={e => {
          const { originWidth, originHeight, path } = e.detail;
          let scale = 1;
          if (originWidth > 500) {
            scale = 500 / originWidth;
          }
          addDrawing(originWidth, originHeight, path, scale);
          addingDrawing = false;
        }}
        on:cancel={() => (addingDrawing = false)} />
    </div>
  {/if}
  {#if pages.length}
    <div class="flex justify-center px-5 w-full md:hidden">
      <img src="/edit.svg" class="mr-2" alt="a pen, edit pdf name" />
      <input
        placeholder="Rename your PDF here"
        type="text"
        class="flex-grow bg-transparent"
        bind:value={pdfName} />
    </div>
    <div class="w-full">
      {#each pages as page, pIndex (page)}
        <div
          class="p-5 w-full flex flex-col items-center overflow-hidden"
          on:mousedown={() => selectPage(pIndex)}
          on:touchstart={() => selectPage(pIndex)}>
          <div
            class="relative shadow-lg"
            class:shadow-outline={pIndex === selectedPageIndex}>
            <PDFPage
              on:measure={e => onMeasure(e.detail.scale, pIndex)}
              {page} />
            <div
              class="absolute top-0 left-0 transform origin-top-left"
              style="transform: scale({pagesScale[pIndex] * ((pages[pIndex] && pages[pIndex].zoomLevel) || 1)}); touch-action: none;">
              {#each allObjects[pIndex] as object (object.id)}
                {#if object.type === 'image'}
                  <Image
                    on:update={e => updateObject(object.id, e.detail)}
                    on:delete={() => deleteObject(object.id)}
                    file={object.file}
                    payload={object.payload}
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    height={object.height}
                    pageScale={pagesScale[pIndex]} />
                {:else if object.type === 'text'}
                  <Text
                    on:update={e => updateObject(object.id, e.detail)}
                    on:delete={() => deleteObject(object.id)}
                    on:selectFont={selectFontFamily}
                    text={object.text}
                    x={object.x}
                    y={object.y}
                    size={object.size}
                    lineHeight={object.lineHeight}
                    fontFamily={object.fontFamily}
                    pageScale={pagesScale[pIndex]} />
                    {:else if object.type === 'box'}
                      <Box
                        on:update={e => updateObject(object.id, e.detail)}
                        on:delete={() => deleteObject(object.id)}
                        width={object.width}
                        height={object.height}
                        x={object.x}
                        y={object.y}
                        color={object.color}
                        opacity={object.opacity}
                        borderWidth={object.borderWidth}
                        borderColor={object.borderColor}
                        pageScale={pagesScale[pIndex]} />
                {:else if object.type === 'drawing'}
                  <Drawing
                    on:update={e => updateObject(object.id, e.detail)}
                    on:delete={() => deleteObject(object.id)}
                    path={object.path}
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    originWidth={object.originWidth}
                    originHeight={object.originHeight}
                    pageScale={pagesScale[pIndex]} />
                {/if}
              {/each}

            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="w-full flex-grow flex justify-center items-center">
      <span class=" font-bold text-3xl text-gray-500">Drag something here</span>
    </div>
  {/if}
</main>
