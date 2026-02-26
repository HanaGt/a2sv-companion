/**
 * Popup initialization: load stored values, show/hide auth UI, bind events.
 */

import { getLocalStorage } from "../utils/readStorage";
import { popupDom } from "./dom";
import {
  login,
  logout,
  saveGroup,
  saveSelectedRepo,
  saveStudentName,
} from "./handlers";
import { populateRepoDropdown } from "./repo";

type View = "LOGIN" | "PROFILE" | "MAIN";

let currentView: View = "LOGIN";

function setView(view: View): void {
  const loginSection = popupDom.loginSection();
  const profileSection = popupDom.profileSection();
  const mainSection = popupDom.mainSection();
  const profileBtn = popupDom.profileBtn();
  const logoutBtn = popupDom.logoutBtn();
  const navSyncBtn = popupDom.navSyncBtn();

  if (loginSection) {
    loginSection.classList.toggle("hidden", view !== "LOGIN");
  }
  if (profileSection) {
    profileSection.classList.toggle("hidden", view !== "PROFILE");
  }
  if (mainSection) {
    mainSection.classList.toggle("hidden", view !== "MAIN");
  }

  if (profileBtn) {
    profileBtn.textContent = view === "PROFILE" ? "Manual" : "Profile";
  }

   if (logoutBtn) {
    logoutBtn.classList.toggle("hidden", view === "MAIN");
  }

  if (navSyncBtn) {
    navSyncBtn.classList.toggle("hidden", view !== "MAIN");
  }

  currentView = view;
}

function applyStoredValues(
  student: string,
  group: string,
  selectedRepo: string
): void {
  const studentName = popupDom.studentName();
  const groupField = popupDom.groupField();
  if (student && studentName) studentName.setAttribute("value", student);
  if (group && groupField) groupField.setAttribute("value", group);
  populateRepoDropdown(popupDom.reposField(), selectedRepo);
}

function showLoggedInState(username: string): void {
  const loginBtn = popupDom.loginBtn();
  const logoutBtn = popupDom.logoutBtn();
  const uploadBtn = popupDom.uploadBtn();
  const uploadHint = popupDom.uploadHint();
  const greeting = popupDom.greeting();
  const navTop = popupDom.navTop();
  loginBtn?.classList.add("hidden");
  logoutBtn?.classList.remove("hidden");
  popupDom.profileBtn()?.classList.remove("hidden");
  uploadBtn?.classList.remove("hidden");
  uploadHint?.classList.remove("hidden");
  navTop?.classList.add("logged-in");
  if (greeting) greeting.textContent = username;
}

function bindEvents(): void {
  const loginBtn = popupDom.loginBtn();
  const logoutBtn = popupDom.logoutBtn();
  const reposField = popupDom.reposField();
  const studentName = popupDom.studentName();
  const groupField = popupDom.groupField();
  const profileBtn = popupDom.profileBtn();
  const saveProfileBtn = popupDom.saveProfileBtn();
  const navSyncBtn = popupDom.navSyncBtn();
  const profileSuccess = document.getElementById("profile-success");

  loginBtn?.addEventListener("click", login);
  logoutBtn?.addEventListener("click", logout);

  profileBtn?.addEventListener("click", () => {
    setView(currentView === "PROFILE" ? "MAIN" : "PROFILE");
  });

  saveProfileBtn?.addEventListener("click", async () => {
    const name = studentName?.value.trim() ?? "";
    const group = groupField?.value.trim() ?? "";
    const repo = reposField?.value ?? "";

    if (!name || !group || !repo) {
      alert("Please fill in your name, group, and repo before saving.");
      return;
    }

    if (profileSuccess) {
      profileSuccess.classList.add("hidden");
    }

    await Promise.all([
      saveStudentName(name),
      saveGroup(group),
      saveSelectedRepo(repo),
    ]);
    chrome.storage.local.set({ profileCompleted: true });
    if (profileSuccess) {
      profileSuccess.classList.remove("hidden");
    }
    setTimeout(() => {
      setView("MAIN");
    }, 800);
  });

  async function runSync(syncButton: HTMLButtonElement | null, group: string | null): Promise<void> {
    if (!syncButton) return;
    if (!group?.trim()) {
      alert("Enter your group (e.g. G71) first.");
      return;
    }
    syncButton.disabled = true;
    syncButton.textContent = "Syncing...";
    try {
      const ok = await new Promise<boolean>((resolve) => {
        chrome.runtime.sendMessage({ type: "A2SV_SYNC_MAP", group: group.trim() }, (r: { success?: boolean }) => {
          resolve(!!r?.success);
        });
      });
      if (ok) {
        syncButton.disabled = false;
        syncButton.textContent = "Synced";
        syncButton.classList.add("synced");
        setTimeout(() => {
          syncButton.textContent = "Sync";
          syncButton.classList.remove("synced");
        }, 5000);
      } else {
        alert("Sync failed. Check your group and try again.");
      }
    } finally {
      if (!syncButton.classList.contains("synced")) {
        syncButton.disabled = false;
        syncButton.textContent = "Sync";
      }
    }
  }

  const syncBtn = popupDom.syncBtn();
  syncBtn?.addEventListener("click", () => {
    runSync(syncBtn, popupDom.groupField()?.value?.trim() ?? null);
  });

  navSyncBtn?.addEventListener("click", async () => {
    const group = await getLocalStorage("group");
    runSync(navSyncBtn, typeof group === "string" ? group.trim() : null);
  });
}

export function initPopup(): void {
  bindEvents();

  chrome.storage.local.get(
    ["token", "user", "profileCompleted"],
    async (result) => {
      if (!result.token) {
        setView("LOGIN");
        return;
      }

      showLoggedInState(result.user?.login ?? "User");

      const student = await getLocalStorage("studentName");
      const selectedRepo = await getLocalStorage("selectedRepo");
      const group = await getLocalStorage("group");

      applyStoredValues(
        student ?? "",
        group ?? "",
        selectedRepo ?? "",
      );

      const hasProfile = !!result.profileCompleted;

      if (hasProfile) {
        setView("MAIN");
        if (group && typeof group === "string" && group.trim()) {
          chrome.runtime.sendMessage({
            type: "A2SV_SYNC_MAP",
            group: group.trim(),
          });
        }
      } else {
        setView("PROFILE");
      }
    },
  );
}
