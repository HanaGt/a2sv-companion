/**
 * Popup DOM element refs. Single place for selectors used by the popup.
 */

const id = (id: string) => document.getElementById(id);

export const popupDom = {
  navTop: () => id("nav-top"),
  greeting: () => id("greeting"),
  loginBtn: () => id("login-btn"),
  logoutBtn: () => id("logout-btn"),
  navSyncBtn: () => id("nav-sync-btn") as HTMLButtonElement | null,
  profileBtn: () => id("profile-btn") as HTMLButtonElement | null,
  uploadBtn: () => id("upload-btn"),
  uploadHint: () => id("upload-hint"),
  studentName: () => id("student-name") as HTMLInputElement | null,
  groupField: () => id("group") as HTMLInputElement | null,
  syncBtn: () => id("sync-btn") as HTMLButtonElement | null,
  mainSyncBtn: () => id("main-sync-btn") as HTMLButtonElement | null,
  reposField: () => id("repos") as HTMLSelectElement | null,
  loginSection: () => id("login-section"),
  profileSection: () => id("profile-section"),
  mainSection: () => id("main-section"),
  saveProfileBtn: () => id("save-profile-btn") as HTMLButtonElement | null,
};
