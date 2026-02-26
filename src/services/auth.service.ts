import { AuthEvent } from '../events';
import { getUser } from '../lib/github';

const authHandler = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => {
  if (message.type === AuthEvent.AUTH_SUCCESS) {
    // Badge text is limited to 4 characters; use a short label to avoid truncation.
    chrome.action.setBadgeText({ text: 'Auth', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({
      color: '#00ff00',
      tabId: sender.tab.id,
    });
    // Use the action title (tooltip) to show the full success message.
    chrome.action.setTitle({
      tabId: sender.tab.id,
      title: 'Authorization successful',
    });

    chrome.storage.local
      .set({
        token: message.token,
      })
      .then(() => {
        getUser().then((user) => {
          chrome.storage.local.set({
            user: user,
            folderPath: '',
            studentName: '',
          });
        });
      });
  } else if (message.type === AuthEvent.AUTH_FAILURE) {
    // Keep failure label within the 4-character badge limit as well.
    chrome.action.setBadgeText({ text: 'Fail', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({
      color: '#ff0200',
      tabId: sender.tab.id,
    });
    chrome.action.setTitle({
      tabId: sender.tab.id,
      title: 'Authorization failed',
    });
  }
};

export default authHandler;
