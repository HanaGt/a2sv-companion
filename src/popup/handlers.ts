/**
 * Popup event handlers: auth, manual submit, form field persistence.
 */

export function login(): void {
  chrome.tabs.create({
    url: `https://github.com/login/oauth/authorize?client_id=Ov23liHo177EntBStDIE&scope=repo,user&redirect_uri=https://a2sv-companion.vercel.app/`,
  });
}

export function logout(): void {
  chrome.storage.local.clear(() => {});
}

export function openSidePanel(): void {
  chrome.tabs.query({ active: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.windowId != null) {
      chrome.sidePanel.open({ windowId: tab.windowId });
      return;
    }
    chrome.windows.getLastFocused((win) => {
      if (win?.id != null && win.type === "normal") {
        chrome.sidePanel.open({ windowId: win.id });
      }
    });
  });
}

export function saveSelectedRepo(value: string): Promise<void> {
  return chrome.storage.local.set({ selectedRepo: value });
}

export function saveFolderPath(value: string): Promise<void> {
  return chrome.storage.local.set({ folderPath: value });
}

export function saveStudentName(value: string): Promise<void> {
  return chrome.storage.local.set({ studentName: value });
}

export function saveGroup(value: string): Promise<void> {
  return chrome.storage.local.set({ group: value });
}
