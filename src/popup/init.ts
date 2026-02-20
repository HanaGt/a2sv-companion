/**
 * Popup initialization: load stored values, show/hide auth UI, bind events.
 */

import { getLocalStorage } from "../utils/readStorage";
import { popupDom } from "./dom";
import {
  login,
  logout,
  openSidePanel,
  saveFolderPath,
  saveGroup,
  saveSelectedRepo,
  saveStudentName,
} from "./handlers";
import { populateRepoDropdown } from "./repo";

function applyStoredValues(
  student: string,
  folder: string,
  group: string,
  selectedRepo: string
): void {
  const folderField = popupDom.folderField();
  const studentName = popupDom.studentName();
  const groupField = popupDom.groupField();
  if (folder && folderField) folderField.setAttribute("value", folder);
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
  uploadBtn?.classList.remove("hidden");
  uploadHint?.classList.remove("hidden");
  navTop?.classList.add("logged-in");
  if (greeting) greeting.textContent = username;
}

function bindEvents(): void {
  const loginBtn = popupDom.loginBtn();
  const logoutBtn = popupDom.logoutBtn();
  const uploadBtn = popupDom.uploadBtn();
  const reposField = popupDom.reposField();
  const folderField = popupDom.folderField();
  const studentName = popupDom.studentName();
  const groupField = popupDom.groupField();

  loginBtn?.addEventListener("click", login);
  logoutBtn?.addEventListener("click", logout);
  uploadBtn?.addEventListener("click", openSidePanel);

  reposField?.addEventListener("change", (e) => {
    const value = (e.target as HTMLSelectElement).value;
    saveSelectedRepo(value);
  });
  folderField?.addEventListener("change", (e) => {
    saveFolderPath((e.target as HTMLInputElement).value);
  });
  studentName?.addEventListener("change", (e) => {
    saveStudentName((e.target as HTMLInputElement).value);
  });
  groupField?.addEventListener("change", (e) => {
    saveGroup((e.target as HTMLInputElement).value);
  });
}

export function initPopup(): void {
  bindEvents();

  chrome.storage.local.get(["token", "user"], async (result) => {
    if (!result.token) return;
    showLoggedInState(result.user?.login ?? "User");
    const student = await getLocalStorage("studentName");
    const selectedRepo = await getLocalStorage("selectedRepo");
    const folder = await getLocalStorage("folderPath");
    const group = await getLocalStorage("group");
    applyStoredValues(student ?? "", folder ?? "", group ?? "", selectedRepo ?? "");
  });
}
