// Teable configuration
const TEABLE_URL = "https://teable.ifnotfor.com/api";
const TABLE_ID = "tblxWdmSHnBdDYjcmKX";
const TEABLE_KEY = "teable_accBVjzbvmeCokrM6ze_O6kUviK93INcHygqLBy7VrHSnfW3caFrANfX9702Xr0=";
const FIELDS = {
  content: "fldAfD5hZNUos5KGlC5",
  recordType: "fldEVTQl8EJPElDtkfB",
  createdDate: "fldfpyVFT5nNdWcMizX"
};

function cleanUrl(url) {
  try {
    const u = new URL(url.trim());
    if (/^(www\.)?youtube\.com$/.test(u.hostname) && u.searchParams.has("v")) {
      return `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
    }
    if (/^(www\.)?(twitter|x)\.com$/.test(u.hostname) && /\/status\/\d+/.test(u.pathname)) {
      return `${u.origin}${u.pathname}`;
    }
    return url.trim();
  } catch { return url.trim(); }
}

let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  document.getElementById('pageTitle').textContent = currentTab.title || currentTab.url;

  document.getElementById('saveBtn').addEventListener('click', saveToTeable);
  document.getElementById('optionsLink').addEventListener('click', (e) => {
    e.preventDefault();
    browser.runtime.openOptionsPage();
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
}

async function saveToTeable() {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const record = {
      records: [
        {
          fields: {
            [FIELDS.content]: cleanUrl(currentTab.url),
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
    btn.textContent = 'Saved!';
    setTimeout(() => window.close(), 800);

  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Save to Inbox';
  }
}
