import {
  AuthContentScript,
  CodeforcesContentScript,
  HackerRankContentScript,
  LeetcodeContentScript,
  SidePanelScript,
} from './scripts';
import authHandler from './services/auth.service';
import codeforcesHandler from './services/codeforces.service';
import hackerrankHandler from './services/hackerrank.service';
import leetcodeHandler from './services/leetcode.service';
import sidePanelHandler from './services/sidepanel.service';
import { syncMapForGroup } from './lib/a2sv/map';
import type { SheetMap } from './lib/a2sv/map';

/** Sync sheet map on browser/extension startup when group is set. */
function bootSync(): void {
  chrome.storage.local.get(['group'], (result) => {
    const group = result?.group as string | undefined;
    if (group && typeof group === 'string' && group.trim()) {
      syncMapForGroup(group.trim()).then((map: SheetMap | null) => {
        if (map) console.log('[A2SV] Boot sync OK for group', group.trim());
        else console.warn('[A2SV] Boot sync failed for group', group.trim());
      });
    }
  });
}

bootSync();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.from === AuthContentScript) {
    authHandler(message, sender, sendResponse);
    return true;
  }
  if (message.from === LeetcodeContentScript) {
    leetcodeHandler(message, sender, sendResponse);
    return true;
  }
  if (message.from === CodeforcesContentScript) {
    codeforcesHandler(message, sender, sendResponse);
    return true;
  }
  if (message.from === HackerRankContentScript) {
    hackerrankHandler(message, sender, sendResponse);
    return true;
  }
  if (message.from === SidePanelScript) {
    sidePanelHandler(message, sender, sendResponse);
    return true;
  }
  if (message.type === 'A2SV_SYNC_MAP') {
    const group = message.group as string | undefined;
    if (group && typeof group === 'string') {
      syncMapForGroup(group.trim()).then((map: SheetMap | null) => {
        sendResponse({ success: !!map });
      });
    } else {
      sendResponse({ success: false });
    }
    return true;
  }
});
