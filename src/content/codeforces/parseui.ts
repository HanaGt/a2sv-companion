export const getSubmissionAnchors = () => {
  return [].slice.call(
    document.getElementsByClassName('view-source')
  ) as HTMLAnchorElement[];
};

export const getSubmissionRows = () => {
  return [].slice.call(
    document.getElementsByClassName('highlighted-row')
  ) as HTMLTableRowElement[];
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
  th.textContent = 'Time (min) / push';
  headerRow.appendChild(th);
};

export const addTimeInputToRow = (
  row: HTMLTableRowElement,
  onSubmitClick: (submissionId: string, timeTaken: string) => void
) => {
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

  const cell = document.createElement('td');
  cell.className = 'status-frame-datatable';
  cell.style.verticalAlign = 'middle';

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';

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

  const pushBtn = document.createElement('button');
  pushBtn.type = 'button';
  pushBtn.className = 'a2sv-push-to-sheet-btn';
  pushBtn.textContent = 'push';
  pushBtn.style.padding = '4px 10px';
  pushBtn.style.background = '#0d6efd';
  pushBtn.style.color = '#fff';
  pushBtn.style.border = 'none';
  pushBtn.style.borderRadius = '4px';
  pushBtn.style.cursor = 'pointer';
  pushBtn.style.fontSize = '12px';

  pushBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const time = timeInput.value.trim();
    if (!time) return;
    onSubmitClick(submissionId, time);
  });

  wrapper.appendChild(timeInput);
  wrapper.appendChild(pushBtn);
  cell.appendChild(wrapper);
  row.appendChild(cell);
};

const showOnlyMySolutions = (show: boolean) => {
  const mySubmissionsToggle = document.getElementsByName(
    'my'
  )[0] as HTMLInputElement;

  if (mySubmissionsToggle.hasAttribute('checked')) {
    if (!show) {
      mySubmissionsToggle.click();
    }
  } else {
    if (show) {
      mySubmissionsToggle.click();
    }
  }
};

const getSourceCodeFromModal = (): Promise<string> => {
  return new Promise((resolve) => {
    const sourceEl =
      document.getElementById('program-source-text') ||
      document.querySelector('.program-source pre');
    if (sourceEl && sourceEl.textContent) {
      resolve(sourceEl.textContent.trim());
      return;
    }
    navigator.clipboard.readText().then(resolve).catch(() => resolve(''));
  });
};

export const getSubmissionDetail = async (
  submissionid: string,
  preFilledTime?: string
) => {
  const originalState = document
    .getElementsByName('my')[0]
    .hasAttribute('checked');

  showOnlyMySolutions(true);

  // get question url from the table row
  const rows = [].slice.call(
    document.getElementsByClassName('highlighted-row')
  ) as HTMLTableRowElement[];

  const submissionRow = rows.filter(
    (row) => row.getAttribute('data-submission-id') === submissionid
  )[0];

  const cols = [].slice.call(submissionRow.children) as HTMLTableColElement[];

  const problemCell = cols.filter((col) =>
    col.hasAttribute('data-problemid')
  )[0];

  const questionUrl = problemCell.getElementsByTagName('a')[0].href;

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

      const pushBtn = document.createElement('button');
      pushBtn.className = 'a2sv-push-to-sheet-btn';
      pushBtn.textContent = 'push';
      pushBtn.type = 'button';
      pushBtn.style.padding = '6px 12px';
      pushBtn.style.cursor = 'pointer';

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

export const getUserHandle = (): string => {
  return [].slice
    .call(
      document
        .getElementsByClassName('lang-chooser')[0]
        .getElementsByTagName('a')
    )
    .filter((x: HTMLAnchorElement) => x.href.includes('profile'))[0].innerText;
};
