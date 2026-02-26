import { HackerRankEvent } from '../events';
import { getHackerRankLangExtension } from '../utils/lang';

const hackerrankHandler = (
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => {
  if (message && typeof message === 'object' && 'type' in message && message.type === HackerRankEvent.PUSH_SUBMISSION_TO_SHEETS) {
    const lang = (message as { language?: string }).language;
    getHackerRankLangExtension(lang ?? '');
    sendResponse({ success: false, message: 'HackerRank push not implemented yet.' });
    return true;
  }
  return false;
};

export default hackerrankHandler;
