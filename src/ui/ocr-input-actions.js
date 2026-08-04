export function createOcrInputActions({ state, processImage = async () => {} }) {
  function triggerInput() { state.input?.value?.click(); }
  function clear() { state.image.value = ''; state.status.value = ''; state.error.value = ''; }
  async function paste(event) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith('image/')) continue;
      const file = item.getAsFile();
      if (file) await processImage(file);
      break;
    }
  }
  async function drop(event) {
    state.dragging.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) await processImage(file);
  }
  async function change(event) {
    const file = event.target.files?.[0];
    if (file) await processImage(file);
    event.target.value = '';
  }
  return { triggerInput, clear, paste, drop, change };
}

if (typeof window !== 'undefined') window.WorkBuddyOcrInputActions = { createOcrInputActions };
