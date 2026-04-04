// Cross-browser compatibility
const api = typeof browser !== 'undefined' ? browser : chrome;

// Teable configuration
const TEABLE_URL = "https://teable.ifnotfor.com/api";
const TABLE_ID = "tblxWdmSHnBdDYjcmKX";
const TEABLE_KEY = "teable_accBVjzbvmeCokrM6ze_O6kUviK93INcHygqLBy7VrHSnfW3caFrANfX9702Xr0=";
const FIELDS = {
  content: "fldAfD5hZNUos5KGlC5",    // Content (primary)
  recordType: "fldEVTQl8EJPElDtkfB",  // Record Type
  createdDate: "fldfpyVFT5nNdWcMizX"  // Created Date
};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('optionsLink').addEventListener('click', () => {
    api.tabs.create({ url: api.runtime.getURL('options.html') });
  });

  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    document.getElementById('pageTitle').textContent = currentTab.title || currentTab.url;
    await saveToTeable(currentTab);
  } catch (err) {
    showStatus('Init error: ' + err.message, 'error');
  }
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
}

async function saveToTeable(tab) {
  try {
    showStatus('Saving to Inbox...', 'saving');

    const record = {
      records: [
        {
          fields: {
            [FIELDS.content]: tab.url,
            [FIELDS.recordType]: "URL",
            [FIELDS.createdDate]: new Date().toISOString()
          }
        }
      ],
      fieldKeyType: "id"
    };

    const response = await fetch(
      `${TEABLE_URL}/table/${TABLE_ID}/record`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEABLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || `HTTP ${response.status}`);
    }

    showStatus('✓ Saved!', 'success');
    setTimeout(() => window.close(), 800);

  } catch (error) {
    console.error('Error:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}
