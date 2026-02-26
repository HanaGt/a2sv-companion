import { generateSlug, getPlatformFromUrl } from "./utils/slug";
import { getSubmittedProblems } from "./utils/readStorage";
import { SidePanelScript } from "./scripts";
import "./style.css";

/** LeetHub-style folder name: e.g. 0001-two-sum */
function leethubFolderName(questionFrontendId: string, titleSlug: string): string {
  const id = String(questionFrontendId).padStart(4, "0");
  return `${id}-${titleSlug}`;
}

/** Get LeetCode title slug from URL (e.g. two-sum), or null if not LeetCode. */
function getLeetcodeTitleSlugFromUrl(url: string): string | null {
  const lower = url.toLowerCase().trim();
  console.log("hjsbh" ,lower);
  if (!lower.includes("leetcode.com/problems/")) return null;
  const part = lower.split("/problems/")[1];
  console.log(part?.split("/")[0]?.trim());
  return part?.split("/")[0]?.trim() || null;
}

function getRowForStudent(
  map: { students: Record<string, number> },
  name: string
): number | undefined {
  const key = name.trim();
  if (map.students[key] != null) return map.students[key];
  const lower = key.toLowerCase();
  const found = Object.keys(map.students).find((k) => k.toLowerCase() === lower);
  return found != null ? map.students[found] : undefined;
}

function getFormValues(): FormValues {
  const problemUrl = getValueById("problem-url").trim();
  const code = getValueById("code").trim();
  const timeTaken = parseInt(getValueById("time-taken"), 10) || 0;
  const attempts = parseInt(getValueById("attempts"), 10) || 0;
  return {
    problemUrl,
    timeTaken,
    code,
    attempts,
  };
}

function getValueById(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
  return el?.value ?? "";
}

interface FormValues {
  problemUrl: string;
  code: string;
  timeTaken: number;
  attempts: number;
}

const MANUAL_FORM_STORAGE_KEYS = {
  problemUrl: "manualProblemUrl",
  code: "manualCode",
  timeTaken: "manualTimeTaken",
  attempts: "manualAttempts",
} as const;

function persistFormValues() {
  const { problemUrl, code, timeTaken, attempts } = getFormValues();
  chrome.storage.local.set({
    [MANUAL_FORM_STORAGE_KEYS.problemUrl]: problemUrl,
    [MANUAL_FORM_STORAGE_KEYS.code]: code,
    [MANUAL_FORM_STORAGE_KEYS.timeTaken]: timeTaken,
    [MANUAL_FORM_STORAGE_KEYS.attempts]: attempts,
  });
}

function clearStoredFormValues() {
  chrome.storage.local.set({
    [MANUAL_FORM_STORAGE_KEYS.problemUrl]: "",
    [MANUAL_FORM_STORAGE_KEYS.code]: "",
    [MANUAL_FORM_STORAGE_KEYS.timeTaken]: "",
    [MANUAL_FORM_STORAGE_KEYS.attempts]: "",
  });
}

function restoreFormValues() {
  chrome.storage.local.get(
    [
      MANUAL_FORM_STORAGE_KEYS.problemUrl,
      MANUAL_FORM_STORAGE_KEYS.code,
      MANUAL_FORM_STORAGE_KEYS.timeTaken,
      MANUAL_FORM_STORAGE_KEYS.attempts,
    ],
    (result) => {
      const problemUrlInput = document.getElementById("problem-url") as HTMLInputElement | null;
      const codeInput = document.getElementById("code") as HTMLTextAreaElement | null;
      const timeTakenInput = document.getElementById("time-taken") as HTMLInputElement | null;
      const attemptsInput = document.getElementById("attempts") as HTMLInputElement | null;

      if (problemUrlInput && typeof result[MANUAL_FORM_STORAGE_KEYS.problemUrl] === "string") {
        problemUrlInput.value = result[MANUAL_FORM_STORAGE_KEYS.problemUrl] as string;
      }
      if (codeInput && typeof result[MANUAL_FORM_STORAGE_KEYS.code] === "string") {
        codeInput.value = result[MANUAL_FORM_STORAGE_KEYS.code] as string;
      }
      if (timeTakenInput && typeof result[MANUAL_FORM_STORAGE_KEYS.timeTaken] !== "undefined") {
        timeTakenInput.value = String(result[MANUAL_FORM_STORAGE_KEYS.timeTaken]);
      }
      if (attemptsInput && typeof result[MANUAL_FORM_STORAGE_KEYS.attempts] !== "undefined") {
        attemptsInput.value = String(result[MANUAL_FORM_STORAGE_KEYS.attempts]);
      }

      checkFields();
    },
  );
}

function clearFormFields() {
  const problemUrlInput = document.getElementById("problem-url") as HTMLInputElement | null;
  const codeInput = document.getElementById("code") as HTMLTextAreaElement | null;
  const timeTakenInput = document.getElementById("time-taken") as HTMLInputElement | null;
  const attemptsInput = document.getElementById("attempts") as HTMLInputElement | null;
  if (problemUrlInput) problemUrlInput.value = "";
  if (codeInput) codeInput.value = "";
  if (timeTakenInput) timeTakenInput.value = "";
  if (attemptsInput) attemptsInput.value = "";
}

function checkFields() {
  const { problemUrl, code, timeTaken, attempts } = getFormValues();
  const submitButton = document.getElementById(
    "submit-btn",
  ) as HTMLButtonElement;
  submitButton.disabled = !(
    problemUrl &&
    code &&
    timeTaken &&
    attempts
  );
  updateSubmitButtonStyle(submitButton.disabled);
  if (problemUrl) {
    const platform = getPlatformFromUrl(problemUrl);
    const slug = generateSlug(problemUrl);
    getSubmittedProblems().then((submitted) => {
      submitButton.innerHTML = slug && submitted[`${platform}:${slug}`] ? "Update" : "Submit";
    }).catch(() => {});
  }
}

function updateSubmitButtonStyle(disabled: boolean) {
  const submitButton = document.getElementById(
    "submit-btn",
  ) as HTMLButtonElement;
  if (disabled) {
    submitButton.classList.remove("hover:bg-blue-600");
    submitButton.classList.add("cursor-not-allowed");
  } else {
    submitButton.classList.remove("cursor-not-allowed");
    submitButton.classList.add("hover:bg-blue-600");
  }
}

function showManualError(message: string) {
  const el = document.getElementById("manual-submit-error");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
}

function hideManualError() {
  const el = document.getElementById("manual-submit-error");
  if (el) {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

const MANUAL_SUBMIT_ERROR_KEY = "manualSubmitError";
const MANUAL_SUBMIT_GITHUB_ONLY_KEY = "manualSubmitGitHubOnlyMessage";

function showManualInfo(message: string) {
  const el = document.getElementById("manual-submit-info");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
}

function hideManualInfo() {
  const el = document.getElementById("manual-submit-info");
  if (el) {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function showStoredSheetErrorIfAny() {
  chrome.storage.local.get([MANUAL_SUBMIT_ERROR_KEY, MANUAL_SUBMIT_GITHUB_ONLY_KEY], (result) => {
    const errMsg = result[MANUAL_SUBMIT_ERROR_KEY];
    const githubOnlyMsg = result[MANUAL_SUBMIT_GITHUB_ONLY_KEY];
    if (typeof errMsg === "string" && errMsg) {
      hideManualInfo();
      showManualError(errMsg);
      chrome.storage.local.remove(MANUAL_SUBMIT_ERROR_KEY);
    }
    if (typeof githubOnlyMsg === "string" && githubOnlyMsg) {
      hideManualError();
      showManualInfo(githubOnlyMsg);
      chrome.storage.local.remove(MANUAL_SUBMIT_GITHUB_ONLY_KEY);
    }
  });
}

function onSubmit() {
  const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement | null;
  if (!submitBtn) return;

  const formdata = getFormValues();
  if (!formdata.problemUrl || !formdata.code || !formdata.timeTaken || !formdata.attempts) {
    showManualError("Please fill in all fields before submitting.");
    return;
  }

  hideManualError();
  submitBtn.disabled = true;
  submitBtn.innerHTML = "Submitting...";
  submitBtn.classList.add("cursor-not-allowed");

  chrome.runtime.sendMessage(
    {
      from: SidePanelScript,
      type: "MANUAL_SUBMIT",
      problemUrl: formdata.problemUrl,
      code: formdata.code,
      timeTaken: formdata.timeTaken,
      attempts: formdata.attempts,
    },
    (response?: { status?: string; error?: string }) => {
      if (chrome.runtime.lastError) {
        console.error("Manual submit error:", chrome.runtime.lastError);
        showManualError("Could not queue submission. Please try again.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Submit";
        submitBtn.classList.remove("cursor-not-allowed");
        submitBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
        checkFields();
        return;
      }

      if (response?.status === "queued") {
        hideManualError();
        // Clear only storage so when user closes and reopens, form is empty. Leave current form as-is until they close.
        clearStoredFormValues();
        submitBtn.innerHTML = "Submitted";
        submitBtn.classList.remove("hover:bg-blue-600", "bg-blue-500");
        submitBtn.classList.add("cursor-not-allowed", "manual-submit-success");
        setTimeout(() => {
          submitBtn.innerHTML = "Submit";
          submitBtn.disabled = false;
          submitBtn.classList.remove("cursor-not-allowed", "manual-submit-success");
          submitBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
          checkFields();
        }, 3000);
      } else {
        showManualError(response?.error || "An error occurred while starting the submission.");
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Submit";
        submitBtn.classList.remove("cursor-not-allowed");
        submitBtn.classList.add("bg-blue-500", "hover:bg-blue-600");
        checkFields();
      }
    },
  );
}

restoreFormValues();
showStoredSheetErrorIfAny();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes[MANUAL_SUBMIT_ERROR_KEY]?.newValue) {
    hideManualInfo();
    showManualError(changes[MANUAL_SUBMIT_ERROR_KEY].newValue as string);
    chrome.storage.local.remove(MANUAL_SUBMIT_ERROR_KEY);
  }
  if (changes[MANUAL_SUBMIT_GITHUB_ONLY_KEY]?.newValue) {
    hideManualError();
    showManualInfo(changes[MANUAL_SUBMIT_GITHUB_ONLY_KEY].newValue as string);
    chrome.storage.local.remove(MANUAL_SUBMIT_GITHUB_ONLY_KEY);
  }
});

document.getElementById("submit-btn").addEventListener("click", (e) => {
  console.log("button clicked");
  e.preventDefault();
  onSubmit();
});

// Persist draft on input so it's still there if popup is closed without submitting; clear error when typing
[
  "problem-url",
  "code",
  "time-taken",
  "attempts",
].forEach((fieldId) => {
  document.getElementById(fieldId)?.addEventListener("input", () => {
    hideManualError();
    hideManualInfo();
    checkFields();
    persistFormValues();
  });
});
