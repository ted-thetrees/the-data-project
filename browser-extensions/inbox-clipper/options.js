const api = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
  // Load existing key
  api.storage.local.get('apiKey', (result) => {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
  });
  
  // Save handler
  document.getElementById('saveBtn').addEventListener('click', () => {
    const key = document.getElementById('apiKey').value.trim();
    api.storage.local.set({ apiKey: key }, () => {
      document.getElementById('status').textContent = '✓ Saved!';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 2000);
    });
  });
});
