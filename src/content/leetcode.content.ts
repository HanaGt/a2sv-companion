import { getLeetcodeVersion } from './leetcode/common';
import oldUi from './leetcode/old';
import newUi from './leetcode/new';
import { removeContent } from './leetcode/common';

const isOnProblemPage = () => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  return pathParts[0] === 'problems' && !!pathParts[1];
};

const onMutation = (observer: MutationObserver) => {
  let hide = !isOnProblemPage();
  if (
    window.location.href.includes('submissions') &&
    window.location.href.includes('https://leetcode.com/problems/')
  ) {
    hide = false;
  }


  try {
    if (getLeetcodeVersion() === 'NEW') {
      if (hide) {
        removeContent(observer, observe);
      } else {
        newUi.injectContent(observer, observe);
      }
    } else {
      if (hide) {
        removeContent(observer, observe);
      } else {
        oldUi.injectContent(observer, observe);
      }
    }
  } catch (e) {
    console.log(e);
  }
};

let mutationObserver: MutationObserver;

const observe = () => {
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

const SUBMIT_BTN_STYLE_ID = 'a2sv-submit-btn-style';
const submitButtonStyleCss = `
  [data-cy="submit-code-btn"],
  [data-cy="submit-code-btn"] * {
    color: white !important;
  }
  [data-cy="submit-code-btn"]:hover,
  [data-cy="submit-code-btn"]:hover * {
    color: white !important;
  }
`;

/** Inject submit button white-text style into a document (main or iframe). */
const injectSubmitButtonStyleInto = (doc: Document) => {
  if (doc.getElementById(SUBMIT_BTN_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = SUBMIT_BTN_STYLE_ID;
  style.textContent = submitButtonStyleCss;
  doc.head.appendChild(style);
};

/** Make the LeetCode Submit button text white in main document and same-origin iframes. */
const injectSubmitButtonStyle = () => {
  injectSubmitButtonStyleInto(document);
  document.querySelectorAll('iframe').forEach((frame) => {
    try {
      if (frame.contentDocument?.head) {
        injectSubmitButtonStyleInto(frame.contentDocument);
      } else {
        frame.addEventListener('load', () => {
          try {
            if (frame.contentDocument?.head) {
              injectSubmitButtonStyleInto(frame.contentDocument);
            }
          } catch {
            // Cross-origin, skip
          }
        });
      }
    } catch {
      // Cross-origin iframe, skip
    }
  });
};

const onMutationWithStyle = (observer: MutationObserver) => {
  onMutation(observer);
  if (isOnProblemPage()) injectSubmitButtonStyle();
};

mutationObserver = new MutationObserver((_mutations, obs) => {
  onMutationWithStyle(obs);
});

injectSubmitButtonStyle();
observe();
