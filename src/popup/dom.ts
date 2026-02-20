/**
 * Popup DOM element refs. Single place for selectors used by the popup.
 */

const id = (id: string) => document.getElementById(id);

export const popupDom = {
  navTop: () => id("nav-top"),
  greeting: () => id("greeting"),
  loginBtn: () => id("login-btn"),
  logoutBtn: () => id("logout-btn"),
  uploadBtn: () => id("upload-btn"),
  uploadHint: () => id("upload-hint"),
  studentName: () => id("student-name") as HTMLInputElement | null,
  groupField: () => id("group") as HTMLInputElement | null,
  folderField: () => id("folder-path") as HTMLInputElement | null,
  reposField: () => id("repos") as HTMLSelectElement | null,
};
