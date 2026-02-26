import { generateSlug } from '../../utils/slug';
import { getSubmittedProblems, setProblemSubmitted } from '../../utils/readStorage';

export const getSubmissionAnchors = () => {
  return [].slice.call(
    document.getElementsByClassName('view-source')
  ) as HTMLAnchorElement[];
};

/** Get all submission table rows (works on status, submissions/Handle, and contest/ID/my). */
export const getSubmissionRows = () => {
  const byHighlight = [].slice.call(
    document.getElementsByClassName('highlighted-row')
  ) as HTMLTableRowElement[];
  if (byHighlight.length > 0) return byHighlight;
  const anchors = getSubmissionAnchors();
  const rows = anchors
    .map((a) => a.closest('tr'))
    .filter(Boolean) as HTMLTableRowElement[];
  const seen = new Set<HTMLTableRowElement>();
  return rows.filter((r) => {
    if (seen.has(r)) return false;
    seen.add(r);
    return true;
  });
};

/**
 * Add an extra column to the status table header (#, When, Who, Problem, Lang, Verdict, Time, Memory).
 * Inserts a <th> for "Time (min)" / push so the header matches the extra column in each row.
 */
export const addStatusTableHeaderColumn = () => {
  const rows = getSubmissionRows();
  if (rows.length === 0) return;

  const firstRow = rows[0];
  const table = firstRow.closest('table');
  if (!table) return;

  const headerRow =
    table.querySelector('thead tr') ||
    (table.querySelector('tr') as HTMLTableRowElement);
  if (!headerRow) return;

  // Avoid adding the header twice
  if (headerRow.querySelector('th.a2sv-companion-col')) return;

  const th = document.createElement('th');
  th.className = 'status-frame-datatable a2sv-companion-col';
  th.style.whiteSpace = 'nowrap';
  th.style.padding = '4px 8px';
  th.style.fontFamily = 'Verdana, sans-serif';
  th.textContent = 'Time (min) / Push';
  headerRow.appendChild(th);
};

export const addTimeInputToRow = (
  row: HTMLTableRowElement,
  onSubmitClick: (submissionId: string, timeTaken: string) => void | Promise<void>
) => {
  if (row.querySelector('.a2sv-push-to-sheet-btn')) return;
  const viewSourceAnchor = row.querySelector(
    'a.view-source'
  ) as HTMLAnchorElement;
  if (!viewSourceAnchor) return;
  const submissionId = row.getAttribute('data-submission-id')
    || viewSourceAnchor.getAttribute('submissionid');
  if (!submissionId) return;
  row.setAttribute('data-submission-id', submissionId);
  const verdictCell = row.querySelector('span.verdict-accepted');
  if (!verdictCell) return;

  const questionUrl = getQuestionUrlFromRow(row);
  const slug = questionUrl ? generateSlug(questionUrl) : '';

  const cell = document.createElement('td');
  cell.className = 'status-frame-datatable';
  cell.style.verticalAlign = 'middle';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';
  wrapper.style.fontFamily = 'Verdana, sans-serif';

  const timeInput = document.createElement('input');
  timeInput.type = 'number';
  timeInput.placeholder = 'Time (min)';
  timeInput.min = '0';
  timeInput.style.width = '70px';
  timeInput.style.padding = '4px 6px';
  timeInput.style.background = '#f5f5f5';
  timeInput.style.border = '1px solid #ccc';
  timeInput.style.borderRadius = '4px';
  timeInput.style.color = '#333';
  timeInput.style.fontFamily = 'Verdana, sans-serif';

  const pushBtn = document.createElement('button');
  pushBtn.type = 'button';
  pushBtn.className = 'a2sv-push-to-sheet-btn';
  pushBtn.textContent = 'Push';
  pushBtn.style.padding = '4px 10px';
  pushBtn.style.background = '#c3c4c3';
  pushBtn.style.color = '#000';
  pushBtn.style.border = 'none';
  pushBtn.style.borderRadius = '4px';
  pushBtn.style.cursor = 'pointer';
  pushBtn.style.fontSize = '12px';
  pushBtn.style.fontFamily = 'Verdana, sans-serif';

  getSubmittedProblems().then((submitted) => {
    pushBtn.textContent = slug && submitted['codeforces:' + slug] ? 'Update' : 'Push';
  }).catch(() => {});

  pushBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const time = timeInput.value.trim();
    if (!time) return;
    const prevText = pushBtn.textContent;
    pushBtn.textContent = 'Pushing...';
    pushBtn.disabled = true;
    try {
      await Promise.resolve(onSubmitClick(submissionId, time));
      pushBtn.textContent = 'Update';
      if (slug) setProblemSubmitted('codeforces', slug).catch(() => {});
    } finally {
      if (pushBtn.textContent === 'Pushing...') {
        pushBtn.textContent = prevText ?? 'Push';
      }
      pushBtn.disabled = false;
    }
  });

  wrapper.appendChild(timeInput);
  wrapper.appendChild(pushBtn);
  cell.appendChild(wrapper);
  row.appendChild(cell);
};

const showOnlyMySolutions = (show: boolean) => {
  const mySubmissionsToggle = document.getElementsByName('my')[0] as HTMLInputElement | undefined;
  if (!mySubmissionsToggle) return;

  if (mySubmissionsToggle.hasAttribute('checked')) {
    if (!show) mySubmissionsToggle.click();
  } else {
    if (show) mySubmissionsToggle.click();
  }
};

/** True if text looks like a URL or single link (should not be used as source code). */
const looksLikeUrl = (text: string): boolean => {
  const t = text.trim();
  if (!t) return true;
  if (/^https?:\/\/\S+$/i.test(t)) return true;
  if (t.split(/\r?\n/).length <= 1 && /codeforces\.com\/.*\/(problem|contest)/i.test(t)) return true;
  return false;
};

/** True if text looks like our own console log (must not be pushed as code). */
const looksLikeLog = (text: string): boolean => {
  const t = text.trim();
  if (!t) return true;
  if (/\[A2SV Codeforces( Service)?\]/.test(t) && /push called|codeLength|submissionId/.test(t)) return true;
  if (/\{[^}]*"[^"]*"\s*:\s*[^},]+[^}]*\}/.test(t) && /codeLength|submissionId|problemName/.test(t)) return true;
  return false;
};

const isValidSourceCode = (raw: string): boolean =>
  raw.length > 0 && !looksLikeUrl(raw) && !looksLikeLog(raw);

/** True if a line looks like the start of source code (not header/UI). */
const looksLikeCodeLine = (line: string): boolean => {
  const t = line.trim();
  if (!t) return true;
  return (
    /^\s*(import\s|from\s|def\s|class\s|#include|#\s*include|public\s|private\s|function\s|const\s|let\s|var\s|package\s|using\s|void\s|int\s|string\s|fn\s|func\s|main\s*\()/.test(t) ||
    /^\s*[\{\}\[\]]\s*$/.test(t) ||
    /^\s*\/\//.test(t) ||
    /^\s*\/\*/.test(t) ||
    /^\s*#\s*[^i]/.test(t) ||
    /^\s*<\?/.test(t)
  );
};

/** Strip everything except the actual source code (no header, UI labels, judgement, tests). */
const stripJudgementProtocol = (raw: string): string => {
  let code = raw;
  const endMarkers = [/\s*→?\s*Judgement Protocol\s*/i, /\s*Test:\s*#\s*\d+/i, /\s*Checker Log\s*/i];
  for (const re of endMarkers) {
    const idx = code.search(re);
    if (idx !== -1) code = code.slice(0, idx).trim();
  }
  const lines = code.split(/\r?\n/);
  let start = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^By\s+\S+,\s*contest:/i.test(trimmed)) continue;
    if (/^(Time taken|push|Copy|#|Accepted|Judgement Protocol)$/i.test(trimmed)) continue;
    if (looksLikeCodeLine(line)) {
      start = i;
      break;
    }
  }
  return lines.slice(start).join('\n').trim();
};

const readSourceFromDoc = (doc: Document): string => {
  const byId = doc.getElementById('program-source-text');
  if (byId?.textContent?.trim()) {
    let raw = byId.textContent.trim();
    raw = stripJudgementProtocol(raw);
    if (isValidSourceCode(raw)) return raw;
  }
  const pre = doc.querySelector('.program-source pre') || doc.querySelector('pre.linenums');
  if (pre?.textContent?.trim()) {
    let raw = pre.textContent.trim();
    raw = stripJudgementProtocol(raw);
    if (isValidSourceCode(raw)) return raw;
  }
  const copyBtn = doc.getElementById('program-source-text-copy');
  const modal = copyBtn?.closest('.roundbox') || copyBtn?.closest('#modal') || copyBtn?.parentElement;
  if (modal) {
    const pres = modal.querySelectorAll('pre');
    let best = '';
    pres.forEach((p) => {
      let raw = p.textContent?.trim() ?? '';
      raw = stripJudgementProtocol(raw);
      if (isValidSourceCode(raw) && raw.length > best.length) best = raw;
    });
    if (best) return best;
  }
  return '';
};

const getSourceCodeFromModal = (): Promise<string> => {
  return new Promise((resolve) => {
    const read = () => {
      let code = readSourceFromDoc(document);
      if (code) return code;
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const doc = (iframes[i] as HTMLIFrameElement).contentDocument;
          if (doc) {
            code = readSourceFromDoc(doc);
            if (code) return code;
          }
        } catch {
          /* same-origin only */
        }
      }
      return '';
    };
    const result = read();
    if (result) {
      resolve(result);
      return;
    }
    setTimeout(() => {
      const delayed = read();
      if (delayed) {
        resolve(delayed);
        return;
      }
      navigator.clipboard.readText().then((clip) => {
        const t = clip?.trim() ?? '';
        resolve(t && isValidSourceCode(t) ? t : '');
      }).catch(() => resolve(''));
    }, 400);
  });
};

/** Get question URL from a status table row (problem link cell). */
export const getQuestionUrlFromRow = (row: HTMLTableRowElement): string | null => {
  const cols = [].slice.call(row.children) as HTMLElement[];
  const problemCell = cols.filter((col) => col.hasAttribute('data-problemid'))[0];
  if (!problemCell) return null;
  const link = problemCell.getElementsByTagName('a')[0];
  return link ? link.href : null;
};

/**
 * Extract source code from a parsed submission page document.
 * Uses the same logic as readSourceFromDoc so contest/status/my pages all work.
 */
const readSourceFromFetchedDoc = (doc: Document): string => {
  const byId = doc.getElementById('program-source-text');
  if (byId?.textContent?.trim()) {
    let raw = byId.textContent.trim().replace(/\r\n?/g, '\n');
    raw = stripJudgementProtocol(raw);
    if (isValidSourceCode(raw)) return raw;
  }
  const programSource = doc.querySelector('.program-source');
  if (programSource) {
    const pre =
      programSource.querySelector('pre') ||
      programSource.querySelector('pre.linenums');
    const el = pre ?? programSource;
    if (el?.textContent?.trim()) {
      let raw = el.textContent.trim().replace(/\r\n?/g, '\n');
      raw = stripJudgementProtocol(raw);
      if (isValidSourceCode(raw)) return raw;
    }
  }
  const pre =
    doc.querySelector('pre.linenums') ||
    doc.querySelector('pre#program-source-text') ||
    doc.querySelector('pre.source');
  if (pre?.textContent?.trim()) {
    let raw = pre.textContent.trim().replace(/\r\n?/g, '\n');
    raw = stripJudgementProtocol(raw);
    if (isValidSourceCode(raw)) return raw;
  }
  // Fallback: any pre inside roundbox (same as readSourceFromDoc modal fallback)
  const roundbox = doc.querySelector('.roundbox') || doc.querySelector('#modal');
  if (roundbox) {
    const pres = roundbox.querySelectorAll('pre');
    let best = '';
    pres.forEach((p) => {
      const raw = (p.textContent?.trim() ?? '').replace(/\r\n?/g, '\n');
      const stripped = stripJudgementProtocol(raw);
      if (isValidSourceCode(stripped) && stripped.length > best.length) best = stripped;
    });
    if (best) return best;
  }
  // Last resort: any pre with code-like content
  const allPre = doc.querySelectorAll('pre');
  let best = '';
  allPre.forEach((p) => {
    const raw = (p.textContent?.trim() ?? '').replace(/\r\n?/g, '\n');
    const stripped = stripJudgementProtocol(raw);
    if (isValidSourceCode(stripped) && stripped.length > best.length) best = stripped;
  });
  return best;
};

/**
 * Load submission page in a hidden iframe (so page JS runs) and read source from the live DOM.
 * Use when fetch returns empty because the source is injected by JavaScript (e.g. contest/my pages).
 * On contest pages CF injects source after load; we poll a few times with delays to avoid navigating away.
 */
const getSourceFromSubmissionPageIframe = (submissionUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    let settled = false;
    const once = (code: string) => {
      if (settled) return;
      settled = true;
      resolve(code);
    };

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(iframe);

    const cleanup = () => {
      try {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {
        /* ignore */
      }
    };

    const readFromIframe = (): string => {
      try {
        const doc = (iframe as HTMLIFrameElement).contentDocument;
        return doc ? readSourceFromDoc(doc) : '';
      } catch {
        return '';
      }
    };

    const timeout = window.setTimeout(() => {
      once(readFromIframe());
      cleanup();
    }, 6000);

    iframe.onload = () => {
      // Contest pages inject source via JS after load; poll a few times so we often avoid full-page navigation
      const delays = [400, 1000, 2000];
      let i = 0;
      const tryRead = () => {
        const code = readFromIframe();
        if (code) {
          window.clearTimeout(timeout);
          once(code);
          cleanup();
          return;
        }
        if (i < delays.length) {
          window.setTimeout(tryRead, delays[i]);
          i += 1;
        }
      };
      window.setTimeout(tryRead, 200);
    };

    iframe.onerror = () => {
      window.clearTimeout(timeout);
      once('');
      cleanup();
    };

    try {
      iframe.src = submissionUrl;
    } catch {
      once('');
      cleanup();
    }
  });
};

export const A2SV_PENDING_PUSH = 'a2svPendingPush';
export const A2SV_PUSH_DATA = 'a2svPushData';

/**
 * When we navigated to a submission page to read source (contest/my fallback):
 * read source from this document, store in sessionStorage, go back.
 * Call this once when the content script runs on a submission page.
 */
export const tryHandlePendingPushNavigation = (): void => {
  try {
    const raw = sessionStorage.getItem(A2SV_PENDING_PUSH);
    if (!raw) return;
    const data = JSON.parse(raw) as {
      submissionUrl: string;
      questionUrl: string;
      timeTaken: string;
      submissionId: string;
    };
    if (data.submissionUrl !== location.href) return;

    const tryReadAndBack = () => {
      sessionStorage.removeItem(A2SV_PENDING_PUSH);
      const code = readSourceFromDoc(document);
      if (!code) return;
      sessionStorage.setItem(
        A2SV_PUSH_DATA,
        JSON.stringify({
          code,
          questionUrl: data.questionUrl,
          timeTaken: data.timeTaken,
          submissionId: data.submissionId,
        })
      );
      history.back();
    };

    if (document.readyState === 'complete') {
      // Give Codeforces JS time to render the source
      window.setTimeout(tryReadAndBack, 600);
    } else {
      window.addEventListener('load', () => window.setTimeout(tryReadAndBack, 600));
    }
  } catch {
    sessionStorage.removeItem(A2SV_PENDING_PUSH);
  }
};

/**
 * Get submission code and question URL by fetching the submission page (no modal).
 * Use this when pushing from the row so we don't open view-source.
 * On contest/my pages the source may be loaded by JS; if fetch and iframe both fail, we navigate to the submission page, read, and go back (handled via sessionStorage).
 */
export const getSubmissionDetailWithoutModal = async (
  row: HTMLTableRowElement,
  submissionId: string,
  timeTaken: string
): Promise<{ code: string; timeTaken: string; questionUrl: string }> => {
  const questionUrl = getQuestionUrlFromRow(row);
  if (!questionUrl) throw new Error('Could not get question URL from row');

  const viewSourceAnchor = row.querySelector('a.view-source') as HTMLAnchorElement;
  if (!viewSourceAnchor || !viewSourceAnchor.href) throw new Error('Could not get submission URL');

  const submissionUrl = viewSourceAnchor.href;

  // 1) Try fetch first (works on status page where source is in initial HTML)
  const res = await fetch(submissionUrl, { credentials: 'same-origin' });
  const html = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let code = readSourceFromFetchedDoc(doc);

  // 2) If no source, try iframe (may be blocked by X-Frame-Options on contest pages)
  if (!code && html.length > 0) {
    code = await getSourceFromSubmissionPageIframe(submissionUrl);
  }

  // 3) Last resort: navigate to submission page, read there, then go back (sessionStorage + tryHandlePendingPushNavigation)
  if (!code) {
    console.warn('[A2SV Codeforces parseui] Fetch and iframe failed; navigating to submission page to read source.');
    sessionStorage.setItem(
      A2SV_PENDING_PUSH,
      JSON.stringify({
        submissionUrl,
        questionUrl,
        timeTaken,
        submissionId,
      })
    );
    location.href = submissionUrl;
    // Never resolve so caller doesn't run push with empty code; push runs after we come back (pageshow).
    return new Promise<{ code: string; timeTaken: string; questionUrl: string }>(() => {});
  }

  return { code, timeTaken, questionUrl };
};

export const getSubmissionDetail = async (
  submissionid: string,
  preFilledTime?: string
) => {
  const myToggle = document.getElementsByName('my')[0];
  const originalState = myToggle ? myToggle.hasAttribute('checked') : false;

  showOnlyMySolutions(true);

  const rows = [].slice.call(
    document.getElementsByClassName('highlighted-row')
  ) as HTMLTableRowElement[];

  const submissionRow = rows.filter(
    (row) => row.getAttribute('data-submission-id') === submissionid
  )[0];

  if (!submissionRow) {
    throw new Error('Submission row not found');
  }

  const cols = [].slice.call(submissionRow.children) as HTMLElement[];
  const problemCell = cols.filter((col) => col.hasAttribute('data-problemid'))[0];
  if (!problemCell) {
    throw new Error('Problem cell not found in row');
  }

  const problemLink = problemCell.getElementsByTagName('a')[0];
  const questionUrl = problemLink ? problemLink.href : '';
  if (!questionUrl) {
    throw new Error('Question URL not found');
  }

  const verdictCell = submissionRow.querySelector('span.verdict-accepted');

  return new Promise<{
    code: string;
    timeTaken: string;
    questionUrl: string;
  }>((resolve, reject) => {
    if (!verdictCell) {
      reject();
      return;
    }
    const tryResolve = (timeTakenValue: string) => {
      getSourceCodeFromModal().then((sourceCode) => {
        showOnlyMySolutions(originalState);
        resolve({
          code: sourceCode,
          timeTaken: timeTakenValue,
          questionUrl,
        });
      });
    };

    const runWhenModalReady = () => {
      const copyBtn = document.getElementById('program-source-text-copy');
      if (!copyBtn) {
        reject();
        return;
      }

      if (preFilledTime != null && preFilledTime !== '') {
        tryResolve(preFilledTime);
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';
      wrapper.style.marginBottom = '8px';
      wrapper.style.fontFamily = 'Verdana, sans-serif';

      const timeTaken = document.createElement('input');
      timeTaken.id = 'time-taken';
      timeTaken.type = 'number';
      timeTaken.placeholder = 'Time taken (min)';
      timeTaken.min = '0';
      timeTaken.style.padding = '6px 10px';
      timeTaken.style.width = '120px';
      timeTaken.style.background = '#f5f5f5';
      timeTaken.style.border = '1px solid #ccc';
      timeTaken.style.color = '#333';
      timeTaken.style.fontFamily = 'Verdana, sans-serif';

      const pushBtn = document.createElement('button');
      pushBtn.className = 'a2sv-push-to-sheet-btn';
      pushBtn.textContent = 'Push';
      pushBtn.type = 'button';
      pushBtn.style.padding = '6px 12px';
      pushBtn.style.cursor = 'pointer';
      pushBtn.style.fontFamily = 'Verdana, sans-serif';

      const slug = generateSlug(questionUrl);
      getSubmittedProblems().then((submitted) => {
        pushBtn.textContent = slug && submitted['codeforces:' + slug] ? 'Update' : 'Push';
      }).catch(() => {});

      wrapper.appendChild(timeTaken);
      wrapper.appendChild(pushBtn);
      copyBtn.parentNode.insertBefore(wrapper, copyBtn);

      pushBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (timeTaken.value == '') return;
        tryResolve(timeTaken.value);
      });
      timeTaken.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && timeTaken.value !== '') tryResolve(timeTaken.value);
      });
    };

    const pollIntervalMs = 200;
    const timeoutMs = 8000;
    const start = Date.now();
    const poll = () => {
      if (document.getElementById('program-source-text-copy')) {
        runWhenModalReady();
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        reject();
        return;
      }
      setTimeout(poll, pollIntervalMs);
    };
    setTimeout(poll, 300);
  });
};

/** Result of fetching a Codeforces problem page for README. */
export interface CodeforcesProblemStatement {
  timeLimit?: string;
  memoryLimit?: string;
  statement?: string;
}

const PROBLEM_STATEMENT_FETCH_MS = 5000;

/** LaTeX commands to Unicode (longer sequences first so \\neq before \\ne). */
const LATEX_TO_UNICODE: [string, string][] = [
  ['\\neq', '≠'],
  ['\\geqslant', '≥'],
  ['\\leqslant', '≤'],
  ['\\Rightarrow', '⇒'],
  ['\\Leftarrow', '⇐'],
  ['\\rightarrow', '→'],
  ['\\leftarrow', '←'],
  ['\\subseteq', '⊆'],
  ['\\supseteq', '⊇'],
  ['\\notin', '∉'],
  ['\\emptyset', '∅'],
  ['\\ldots', '…'],
  ['\\cdots', '⋯'],
  ['\\subset', '⊂'],
  ['\\supset', '⊃'],
  ['\\forall', '∀'],
  ['\\exists', '∃'],
  ['\\times', '×'],
  ['\\cdot', '⋅'],
  ['\\infty', '∞'],
  ['\\sum', '∑'],
  ['\\prod', '∏'],
  ['\\sqrt', '√'],
  ['\\cup', '∪'],
  ['\\cap', '∩'],
  ['\\in', '∈'],
  ['\\ne', '≠'],
  ['\\le', '≤'],
  ['\\leq', '≤'],
  ['\\ge', '≥'],
  ['\\geq', '≥'],
  ['\\pm', '±'],
  ['\\mp', '∓'],
  ['\\dots', '…'],
  ['\\alpha', 'α'],
  ['\\beta', 'β'],
  ['\\gamma', 'γ'],
  ['\\delta', 'δ'],
  ['\\lambda', 'λ'],
  ['\\mu', 'μ'],
  ['\\pi', 'π'],
  ['\\sigma', 'σ'],
  ['\\omega', 'ω'],
  ['\\phi', 'φ'],
  ['\\theta', 'θ'],
];

/** Subscript/superscript Unicode so Input/Output match Codeforces display (e.g. a₁, 10⁵). */
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUBSCRIPT_LETTERS: Record<string, string> = { i: 'ᵢ', n: 'ₙ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', x: 'ₓ' };

/** Strip Codeforces math delimiters ($, $$, $$$) and convert LaTeX inside to readable Unicode. */
function stripDollarMathAndLatex(text: string): string {
  let s = text;
  // LaTeX \underline{...} and \overline{...} → just the content (README has no underline/overline)
  s = s.replace(/\\underline\{([^}]*)\}/g, '$1');
  s = s.replace(/\\overline\{([^}]*)\}/g, '$1');
  // Strip $$$...$$$, $$...$$, $...$ (non-greedy, allow newlines)
  s = s.replace(/\$\$\$([\s\S]*?)\$\$\$/g, '$1');
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^$\n]+)\$/g, '$1');
  // Convert LaTeX commands to Unicode (match backslash + command name)
  for (const [cmd, symbol] of LATEX_TO_UNICODE) {
    const re = new RegExp(cmd.replace(/\\/g, '\\\\'), 'g');
    s = s.replace(re, symbol);
  }
  return s;
}

/** Format section headers and separate them from paragraphs (blank line before and after). */
function formatSectionHeaders(text: string): string {
  const sections = ['Input', 'Output', 'Examples', 'Example', 'Note', 'Interaction', 'input', 'output'];
  // Break apart "InputThe" or "OutputPrint" so the section title is on its own line
  let s = text;
  for (const name of sections) {
    const re = new RegExp(`(^|[\\n.])\\s*(${name})([:\\s]*)([A-Z])`, 'gm');
    s = s.replace(re, `$1\n$2$3\n$4`);
  }
  const lines = s.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    const isSection = sections.some((sec) => t === sec || t === sec + ':');
    if (isSection) {
      const title = t.replace(/:$/, '');
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      out.push(`**${title}**`);
      out.push('');
    } else {
      out.push(line);
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Simple HTML to markdown for Codeforces problem-statement content. */
function problemStatementHtmlToMarkdown(html: string): string {
  if (!html?.trim()) return '';
  // 1) Subscripts/superscripts before stripping tags (so *a*₁ stays readable)
  let md = html
    .replace(/<sub>(\d)<\/sub>/gi, (_, d: string) => SUBSCRIPT_DIGITS[parseInt(d, 10)])
    .replace(/<sub>(\d\d?)<\/sub>/gi, (_, d: string) => Array.from(d).map((c) => SUBSCRIPT_DIGITS[parseInt(c, 10)]).join(''))
    .replace(/<sub>([a-z])<\/sub>/gi, (_, c: string) => SUBSCRIPT_LETTERS[c.toLowerCase()] ?? c)
    .replace(/<sup>(\d)<\/sup>/gi, (_, d: string) => SUPERSCRIPT_DIGITS[parseInt(d, 10)])
    .replace(/<sup>(\d\d?)<\/sup>/gi, (_, d: string) => Array.from(d).map((c) => SUPERSCRIPT_DIGITS[parseInt(c, 10)]).join(''))
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner: string) => {
      let text = inner
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<div[^>]*>/gi, '')
        .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\r\n/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
      return '\n```\n' + text + '\n```\n\n';
    })
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  md = stripDollarMathAndLatex(md);
  // Inline ^5 → ⁵ for "10^5" style (after LaTeX so we don't double-convert)
  md = md.replace(/\^(\d+)/g, (_: string, digits: string) => Array.from(digits).map((c) => SUPERSCRIPT_DIGITS[parseInt(c, 10)]).join(''));
  md = formatSectionHeaders(md);
  return md;
}

/**
 * Fetch problem page and extract statement + limits for README. Runs on codeforces.com (same-origin).
 * Resolves with partial result on timeout or parse failure.
 */
export async function fetchProblemStatement(questionUrl: string): Promise<CodeforcesProblemStatement> {
  const result: CodeforcesProblemStatement = {};
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBLEM_STATEMENT_FETCH_MS);
    const res = await fetch(questionUrl, { credentials: 'same-origin', signal: controller.signal });
    clearTimeout(timeout);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const timeEl = doc.querySelector('.time-limit');
    if (timeEl) {
      const text = timeEl.textContent || '';
      const match = text.match(/time limit per test\s*(.*)/i) || text.match(/(\d+\s*(?:second|sec)s?)/i);
      if (match) result.timeLimit = (match[1] || match[0]).trim();
    }
    const memEl = doc.querySelector('.memory-limit');
    if (memEl) {
      const text = memEl.textContent || '';
      const match = text.match(/memory limit per test\s*(.*)/i) || text.match(/(\d+\s*(?:megabyte|mb)s?)/i);
      if (match) result.memoryLimit = (match[1] || match[0]).trim();
    }

    const problemStatement = doc.querySelector('.problem-statement');
    if (problemStatement) {
      const childDivs = problemStatement.querySelectorAll(':scope > div');
      const parts: string[] = [];
      childDivs.forEach((div, i) => {
        if (i === 0) return;
        parts.push(problemStatementHtmlToMarkdown(div.innerHTML));
      });
      if (parts.length > 0) result.statement = parts.join('\n\n').trim();
    }
  } catch {
    // Timeout or parse error: return whatever we have
  }
  return result;
}

export const getUserHandle = (): string => {
  return [].slice
    .call(
      document
        .getElementsByClassName('lang-chooser')[0]
        .getElementsByTagName('a')
    )
    .filter((x: HTMLAnchorElement) => x.href.includes('profile'))[0].innerText;
};
