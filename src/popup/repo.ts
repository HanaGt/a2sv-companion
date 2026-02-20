/**
 * Popup repo dropdown: fetch and populate list from GitHub.
 */

import { getRepos } from "../lib/github";

export async function populateRepoDropdown(
  selector: HTMLSelectElement | null,
  selectedValue = ""
): Promise<void> {
  if (!selector) return;
  const repos = await getRepos();
  selector.innerHTML = "";
  repos.forEach((repo) => {
    const option = document.createElement("option");
    option.value = repo.name;
    option.text = repo.name;
    option.selected = repo.name === selectedValue;
    selector.appendChild(option);
  });
}
