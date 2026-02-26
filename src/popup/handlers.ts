/**
 * Popup event handlers: auth, manual submit, form field persistence.
 */

export function login(): void {
  chrome.tabs.create({
    url: `https://github.com/login/oauth/authorize?client_id=Ov23liHo177EntBStDIE&scope=repo,user&redirect_uri=https://a2sv-companion.vercel.app/`,
  });
}

function showLogoutConfirmPopup(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.getElementById("a2sv-logout-confirm-overlay");
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "a2sv-logout-confirm-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0,0,0,0.35)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    const dialog = document.createElement("div");
    dialog.style.backgroundColor = "white";
    dialog.style.borderRadius = "8px";
    dialog.style.padding = "16px";
    dialog.style.maxWidth = "260px";
    dialog.style.width = "100%";
    dialog.style.boxShadow = "0 10px 25px rgba(0,0,0,0.15)";
    dialog.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

    const text = document.createElement("p");
    text.textContent = message;
    text.style.margin = "0 0 12px 0";
    text.style.fontSize = "14px";
    text.style.color = "#000000";

    const buttonsRow = document.createElement("div");
    buttonsRow.style.display = "flex";
    buttonsRow.style.justifyContent = "flex-end";
    buttonsRow.style.gap = "8px";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "6px 10px";
    cancelBtn.style.fontSize = "13px";
    cancelBtn.style.borderRadius = "4px";
    cancelBtn.style.border = "1px solid #d1d5db";
    cancelBtn.style.backgroundColor = "white";
    cancelBtn.style.color = "#000000";
    cancelBtn.style.cursor = "pointer";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = "Log out";
    confirmBtn.style.padding = "6px 10px";
    confirmBtn.style.fontSize = "13px";
    confirmBtn.style.borderRadius = "4px";
    confirmBtn.style.border = "1px solid #ef4444";
    confirmBtn.style.backgroundColor = "#fee2e2";
    confirmBtn.style.color = "#000000";
    confirmBtn.style.cursor = "pointer";

    function cleanup(result: boolean): void {
      overlay.remove();
      resolve(result);
    }

    cancelBtn.addEventListener("click", () => cleanup(false));
    confirmBtn.addEventListener("click", () => cleanup(true));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });

    buttonsRow.appendChild(cancelBtn);
    buttonsRow.appendChild(confirmBtn);
    dialog.appendChild(text);
    dialog.appendChild(buttonsRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

export async function logout(): Promise<void> {
  const confirmed = await showLogoutConfirmPopup(
    "Are you sure you want to log out?"
  );
  if (!confirmed) return;

  chrome.storage.local.clear(() => {
    // Reload the popup so the UI returns to the login state after logout
    window.location.reload();
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
