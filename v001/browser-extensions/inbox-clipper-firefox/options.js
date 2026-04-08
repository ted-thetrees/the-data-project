document.addEventListener('DOMContentLoaded', async () => {
  // Load existing key
  const { apiKey } = await browser.storage.local.get('apiKey');
  if (apiKey) {
    document.getElementById('apiKey').value = apiKey;
  }
  
  // Save handler
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const key = document.getElementById('apiKey').value.trim();
    await browser.storage.local.set({ apiKey: key });
    document.getElementById('status').textContent = '✓ Saved!';
    setTimeout(() => {
      document.getElementById('status').textContent = '';
    }, 2000);
  });
});
