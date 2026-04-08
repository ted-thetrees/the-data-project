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

browser.contextMenus.create({
  id: "save-link-to-inbox",
  title: "Save Link to Inbox",
  contexts: ["link"]
});

browser.contextMenus.create({
  id: "save-page-to-inbox",
  title: "Save Page to Inbox",
  contexts: ["page"]
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = cleanUrl(info.linkUrl || info.pageUrl);
  if (!url) return;

  try {
    const response = await fetch(`${TEABLE_URL}/table/${TABLE_ID}/record`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TEABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fieldKeyType: "id",
        records: [{
          fields: {
            [FIELDS.content]: url,
            [FIELDS.recordType]: "URL",
            [FIELDS.createdDate]: new Date().toISOString()
          }
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || `HTTP ${response.status}`);
    }

    browser.notifications.create({
      type: "basic",
      title: "Inbox Clipper",
      message: `Saved to Inbox`
    });
  } catch (error) {
    browser.notifications.create({
      type: "basic",
      title: "Inbox Clipper — Error",
      message: error.message
    });
  }
});
