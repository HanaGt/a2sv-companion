import a2sv, { type SheetPayloadWithCoordinates } from "../lib/a2sv";
import { getStoredMap } from "../lib/a2sv/map";
import Leetcode from "../lib/leetcode/api";
import { upload } from "../lib/github";
import { buildCodeforcesReadme, buildLeetcodeReadme, buildMinimalReadme } from "../utils/readme";
import { generateSlug, getPlatformFromUrl } from "../utils/slug";
import { setProblemSubmitted } from "../utils/readStorage";
import { deliverWithRetry } from "./sheetDelivery.service";

/** LeetHub-style folder name: e.g. 0001-two-sum */
function leethubFolderName(questionFrontendId: string, titleSlug: string): string {
  const id = String(questionFrontendId).padStart(4, "0");
  return `${id}-${titleSlug}`;
}

/** Get LeetCode title slug from URL (e.g. two-sum), or null if not LeetCode. */
function getLeetcodeTitleSlugFromUrl(url: string): string | null {
  const lower = url.toLowerCase().trim();
  if (!lower.includes("leetcode.com/problems/")) return null;
  const part = lower.split("/problems/")[1];
  return part?.split("/")[0]?.trim() || null;
}

function getRowForStudent(
  map: { students: Record<string, number> },
  name: string,
): number | undefined {
  const key = name.trim();
  if (map.students[key] != null) return map.students[key];
  const lower = key.toLowerCase();
  const found = Object.keys(map.students).find((k) => k.toLowerCase() === lower);
  return found != null ? map.students[found] : undefined;
}

function getOtherFilenameSlug(problemUrl: string): string {
  try {
    const withoutQuery = problemUrl.split("?")[0];
    const url = new URL(withoutQuery);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "solution";
    const decoded = decodeURIComponent(last).toLowerCase();
    // Replace any run of non-alphanumeric characters (spaces, punctuation) with a single hyphen
    const slug = decoded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "solution";
  } catch {
    return "solution";
  }
}

export default function sidePanelHandler(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
): boolean | void {
  if (message.type !== "MANUAL_SUBMIT") return;

  const {
    problemUrl,
    code,
    timeTaken,
    attempts,
  }: { problemUrl: string; code: string; timeTaken: number; attempts: number } = message;

  if (!problemUrl || !code || !timeTaken || !attempts) {
    sendResponse({
      status: "error",
      error: "Missing required fields for manual submission.",
    });
    return;
  }

  const MANUAL_SUBMIT_ERROR_KEY = "manualSubmitError";

  (async () => {
    const ext = "py";
    const platform = getPlatformFromUrl(problemUrl);
    const questionSlug = generateSlug(problemUrl) || "solution";

    try {
      const storage = await chrome.storage.local.get([
        "selectedRepo",
        "folderPath",
        "studentName",
        "group",
      ]);

      const studentName = (storage.studentName || "").trim();
      const group = storage.group || "";

      const rawFolderPath =
        typeof storage.folderPath === "string" ? storage.folderPath.trim() : "";
      const folderPath =
        rawFolderPath && rawFolderPath[rawFolderPath.length - 1] !== "/"
          ? `${rawFolderPath}/`
          : rawFolderPath;

      let gitUrl: string | undefined;

      if (platform === "leetcode") {
        const titleSlug = getLeetcodeTitleSlugFromUrl(problemUrl) || questionSlug;
        const questionDetails = await Leetcode.getQuestionDetails(titleSlug);
        const dirName = questionDetails
          ? leethubFolderName(questionDetails.questionFrontendId, questionDetails.titleSlug)
          : titleSlug;
        const basePath = `${folderPath}leetcode/${dirName}`;
        const codeFileName = `${dirName}.${ext}`;
        const codeRelativePath = `${basePath}/${codeFileName}`;
        const readmeRelativePath = `${basePath}/README.md`;
        const title = questionDetails?.title ?? titleSlug;
        const readmeContent = questionDetails
          ? buildLeetcodeReadme(questionDetails, problemUrl)
          : buildMinimalReadme(title, problemUrl);
        await upload(
          storage.selectedRepo,
          readmeRelativePath,
          readmeContent,
          `Add README for ${title}`,
        );
        gitUrl = await upload(
          storage.selectedRepo,
          codeRelativePath,
          code,
          `Add solution for ${title}`,
        );
      } else if (platform === "codeforces") {
        const dirName = questionSlug;
        const basePath = `${folderPath}codeforces/${dirName}`;
        const codeRelativePath = `${basePath}/${dirName}.${ext}`;
        const readmeRelativePath = `${basePath}/README.md`;
        const match =
          problemUrl.match(/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/) ||
          problemUrl.match(/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
        const contestId = match ? parseInt(match[1], 10) : 0;
        const index = match ? match[2] : "A";
        const readmeContent = buildCodeforcesReadme({
          contestId,
          index,
          name: dirName,
          questionUrl: problemUrl,
        });
        await upload(
          storage.selectedRepo,
          readmeRelativePath,
          readmeContent,
          `Add README for ${dirName}`,
        );
        gitUrl = await upload(
          storage.selectedRepo,
          codeRelativePath,
          code,
          `Add solution for ${dirName}`,
        );
      } else {
        const otherSlug = getOtherFilenameSlug(problemUrl);
        const fileRelativePath = `${folderPath}other/${otherSlug}.${ext}`;
        gitUrl = await upload(
          storage.selectedRepo,
          fileRelativePath,
          code,
          `Add solution for ${otherSlug}`,
        );
      }

      // GitHub push succeeded; respond so popup can show success state, then do sheet (errors surface in modal via storage).
      sendResponse({ status: "queued" });

      try {
        const stored = await getStoredMap();
        let row_index: number | undefined;
        let col_index: number | undefined;
        if (stored?.map && studentName) {
          const urlSlug = generateSlug(problemUrl);
          const squishedSlug = urlSlug.replace(/[^a-z0-9]/g, "");
          row_index = getRowForStudent(stored.map, studentName);
          col_index = stored.map.problems[urlSlug] ?? stored.map.problems[squishedSlug];
        }

        const row = row_index != null ? Number(row_index) : NaN;
        const col = col_index != null ? Number(col_index) : NaN;
        if (Number.isFinite(row) && Number.isFinite(col)) {
          const payload: SheetPayloadWithCoordinates = {
            group,
            student_full_name: studentName,
            problem_url: problemUrl,
            github_link: gitUrl!,
            attempts,
            time: timeTaken,
            row_index: row,
            col_index: col,
          };
          await deliverWithRetry(payload, { skipNotification: true });
        } else {
          await chrome.storage.local.set({
            manualSubmitGitHubOnlyMessage:
              "Pushed to GitHub. If this problem is on the sheet, sync and try again.",
          });
        }
      } catch (sheetErr) {
        const message =
          sheetErr instanceof Error ? sheetErr.message : "Sheet update failed. Please sync and try again.";
        console.warn("[SidePanel] Sheet update failed (GitHub push succeeded):", sheetErr);
        await chrome.storage.local.set({ [MANUAL_SUBMIT_ERROR_KEY]: message });
      }

      if (questionSlug) setProblemSubmitted(platform, questionSlug).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred while submitting.";
      console.error("[SidePanel] Manual submit error:", err);
      sendResponse({ status: "error", error: message });
    }
  })();

  return true;
}

