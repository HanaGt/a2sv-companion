import { LeetcodeEvent } from '../../events';
import { LeetcodeContentScript } from '../../scripts';
import { getStoredMap } from '../../lib/a2sv/map';
import { generateSlug } from './common';
import { getLocalStorage, getSubmittedProblems, setProblemSubmitted } from '../../utils/readStorage';
import type { SheetMap } from '../../lib/a2sv/map';

function getRowForStudent(map: SheetMap, name: string): number | undefined {
  const key = name.trim();
  if (map.students[key] != null) return map.students[key];
  const lower = key.toLowerCase();
  const found = Object.keys(map.students).find((k) => k.toLowerCase() === lower);
  return found != null ? map.students[found] : undefined;
}

function showInlineStatus(container: HTMLElement, kind: 'success' | 'error', text: string): void {
  const id = 'a2sv-inline-status';
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('span');
    el.id = id;
    el.style.marginLeft = '8px';
    el.style.fontSize = '12px';
    container.appendChild(el);
  }
  el.textContent = text;
  el.style.color = kind === 'success' ? '#22c55e' : '#ef4444';
}

const injectContent = (observer: MutationObserver, observe: () => void) => {
  if (document.getElementById('push-to-sheets-btn')) return;

  const buttons = [].slice.call(
    document.getElementsByTagName('button')
  ) as HTMLButtonElement[];

  const submitBtn = buttons.filter(
    (btn) => btn.getAttribute('data-cy') === 'submit-code-btn'
  )[0];
  if (!submitBtn) return;

  const pushBtn = submitBtn.cloneNode(true) as HTMLButtonElement;
  const timeField = document.createElement('input') as HTMLInputElement;

  timeField.id = 'time-taken-field';
  timeField.type = 'number';
  timeField.placeholder = 'Time taken (in minutes)';
  timeField.classList.add('input__2o8B');
  timeField.style.padding = '0.3rem';
  timeField.style.marginLeft = '10px';
  timeField.style.marginRight = '10px';
  timeField.style.width = '200px';

  pushBtn.id = 'push-to-sheets-btn';
  pushBtn.textContent = '';

  pushBtn.classList.add('submit__2ISl');
  pushBtn.classList.add('css-ieo3pr');

  const span = document.createElement('span');
  span.classList.add('css-1km43m6-BtnContent');
  span.classList.add('e5i1odf0');
  const currentUrl = window.location.href;
  const urlSlug = generateSlug(currentUrl);
  const defaultLabel = 'Push';
  const updateLabel = 'Update';
  let currentLabel = defaultLabel;

  (async () => {
    try {
      const stored = await getStoredMap();
      const studentName = (await getLocalStorage('studentName')) as string | undefined;

      if (stored?.map && studentName && studentName.trim()) {
        const row = getRowForStudent(stored.map, studentName);
        const col = stored.map.problems[urlSlug];
        const solvedCols = row != null ? stored.map.solved?.[String(row)] ?? [] : [];

        if (row != null && col != null && solvedCols.includes(col)) {
          currentLabel = updateLabel;
          span.textContent = currentLabel;
          return;
        }
      }

      const submitted = await getSubmittedProblems();
      currentLabel = submitted['leetcode:' + urlSlug] ? updateLabel : defaultLabel;
      span.textContent = currentLabel;
    } catch {
      span.textContent = defaultLabel;
    }
  })();

  pushBtn.appendChild(span);

  const questionSlug = window.location.pathname.split('/')[2];
  
  const container = submitBtn.parentNode as HTMLElement;

  const setSuccessAndMarkSubmitted = () => {
    currentLabel = updateLabel;
    showInlineStatus(container, 'success', 'Success!');
    span.textContent = updateLabel;
    pushBtn.disabled = false;
    setProblemSubmitted('leetcode', urlSlug).catch(() => {});
  };

  pushBtn.addEventListener('click', async () => {
    if (timeField.value == '') return;

    pushBtn.disabled = true;
    span.textContent = '...';
    console.log('[A2SV Push] slug url:', urlSlug, 'from', currentUrl);
    // 2. Create a fallback text version (for text-only spreadsheet cells)
    const squishedSlug = urlSlug.replace(/[^a-z0-9]/g, '');
    const stored = await getStoredMap();
    const studentName = (await getLocalStorage('studentName')) as string | undefined;
    const group = (await getLocalStorage('group')) as string | undefined;

    if (!studentName || !studentName.trim()) {
      showInlineStatus(container, 'error', 'Set your name in the extension popup.');
      span.textContent = currentLabel;
      pushBtn.disabled = false;
      return;
    }

    // Resolve coordinates if map exists; otherwise we still push to GitHub only
    const col_index = stored?.map ? (stored.map.problems[urlSlug] ?? stored.map.problems[squishedSlug]) : undefined;
    const row_index = stored?.map ? getRowForStudent(stored.map, studentName) : undefined;
    const hasCoordinates = row_index != null && col_index != null;

    if (hasCoordinates) {
      setSuccessAndMarkSubmitted();
      chrome.runtime.sendMessage({
        from: LeetcodeContentScript,
        type: LeetcodeEvent.PUSH_LAST_SUBMISSION_TO_SHEETS,
        timeTaken: timeField.value,
        questionSlug,
        group: group || '',
        student_full_name: studentName.trim(),
        row_index,
        col_index,
      });
      return;
    }

    showInlineStatus(container, 'success', 'Pushing to GitHub...');
    chrome.runtime.sendMessage(
      {
        from: LeetcodeContentScript,
        type: LeetcodeEvent.PUSH_LAST_SUBMISSION_TO_SHEETS,
        timeTaken: timeField.value,
        questionSlug,
        group: group || '',
        student_full_name: studentName.trim(),
      },
      (result: { status?: string; error?: string; githubOnly?: boolean }) => {
        span.textContent = currentLabel;
        pushBtn.disabled = false;
        if (result?.error) {
          showInlineStatus(container, 'error', result.error);
          return;
        }
        currentLabel = updateLabel;
        span.textContent = updateLabel;
        setProblemSubmitted('leetcode', urlSlug).catch(() => {});
        const statusMsg = result?.githubOnly ? 'Pushed to GitHub. If this problem is on the sheet, sync and try again.' : 'Pushed to sheet!';
        showInlineStatus(container, 'success', statusMsg);
        if (result?.githubOnly) alert(statusMsg);
      }
    );
  });

  if (!submitBtn.getAttribute('data-a2sv-watch')) {
    submitBtn.setAttribute('data-a2sv-watch', 'true');
    submitBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        from: LeetcodeContentScript,
        type: LeetcodeEvent.WATCH_SUBMISSION_AND_PUSH,
        questionSlug,
        startTime: Date.now(),
      });
    });
  }

  observer.disconnect();
  submitBtn.parentNode.insertBefore(timeField, submitBtn.nextSibling);
  submitBtn.parentNode.insertBefore(pushBtn, timeField.nextSibling);
  observe();
};

export default { injectContent };
