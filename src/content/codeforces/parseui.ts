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
 * Inserts a <th> for "Time (min)" / Submit so the header matches the extra column in each row.
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
  th.textContent = 'Time (min) / Submit';
  headerRow.appendChild(th);
};

export const addTimeInputToRow = (
  row: HTMLTableRowElement,
  onSubmitClick: (submissionId: string, timeTaken: string) => void
) => {
  const submissionId = row.getAttribute('data-submission-id');
  if (!submissionId) return;
  const verdictCell = row.querySelector('span.verdict-accepted');
  if (!verdictCell) return;

  const viewSourceAnchor = row.querySelector(
    'a.view-source'
  ) as HTMLAnchorElement;
  if (!viewSourceAnchor) return;

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
  timeInput.style.background = '#1e1e1e';
  timeInput.style.border = '1px solid #3d3d3d';
  timeInput.style.borderRadius = '4px';
  timeInput.style.color = '#fff';

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Submit';
  submitBtn.type = 'button';
  submitBtn.style.padding = '4px 10px';
  submitBtn.style.background = '#0d6efd';
  submitBtn.style.color = '#fff';
  submitBtn.style.border = 'none';
  submitBtn.style.borderRadius = '4px';
  submitBtn.style.cursor = 'pointer';
  submitBtn.style.fontSize = '12px';

  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const time = timeInput.value.trim();
    if (!time) return;
    onSubmitClick(submissionId, time);
  });

  wrapper.appendChild(timeInput);
  wrapper.appendChild(submitBtn);
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

    setTimeout(() => {
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

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Submit';
      submitBtn.type = 'button';
      submitBtn.style.padding = '6px 12px';
      submitBtn.style.cursor = 'pointer';

      wrapper.appendChild(timeTaken);
      wrapper.appendChild(submitBtn);
      copyBtn.parentNode.insertBefore(wrapper, copyBtn);

      submitBtn.addEventListener('click', () => {
        if (timeTaken.value == '') return;
        tryResolve(timeTaken.value);
      });
      timeTaken.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && timeTaken.value !== '') tryResolve(timeTaken.value);
      });
    }, 1000);
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
