import type { LeetcodeQuestionDetails } from '../lib/leetcode/types';

/** Decode common HTML entities (e.g. &lt; -> <). Does NOT strip tags — use stripHtmlTags for that. */
function decodeEntitiesOnly(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '...');
}

/** Strip only HTML tags (e.g. <p>, </ul>), not comparison operators like <= or >=. */
function stripHtmlTags(html: string): string {
  return html.replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
}

/** Decode entities and strip HTML tags. Use stripHtmlTags so <= and >= in constraints are preserved. */
function decodeEntities(html: string): string {
  return decodeEntitiesOnly(stripHtmlTags(html));
}

const SUPERSCRIPT_MAP: Record<string, string> = { '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '0': '⁰' };
function replaceSuperscript(html: string): string {
  return html.replace(/<sup>([^<]*)<\/sup>/gi, (_, d) =>
    d.split('').map((c: string) => SUPERSCRIPT_MAP[c] ?? c).join('')
  );
}

/**
 * Convert LeetCode problem content HTML to LeetCode-style Markdown:
 * - Clear Example sections with Input/Output/Explanation in code blocks
 * - Constraints as a bullet list
 * - Follow-up with proper notation (e.g. O(n²))
 */
function leetcodeContentToMarkdown(html: string): string {
  if (!html) return '';

  let md = html;

  // Code blocks: <pre>...</pre> -> fenced block (preserve newlines)
  md = md.replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    const text = stripHtmlTags(inner)
      .replace(/\n\s*/g, '\n')
      .trim();
    return '\n```\n' + decodeEntitiesOnly(text) + '\n```\n\n';
  });

  // Bold: <strong>...</strong> or <b>...</b> -> **...** (trim so "**Follow-up:**" renders, not "**Follow-up: **")
  md = md.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => {
    const t = stripHtmlTags(inner).replace(/\s+/g, ' ').trim();
    return '**' + decodeEntitiesOnly(t) + '**';
  });

  // Superscript (e.g. O(n²), 10^4): <sup>2</sup> -> ²
  md = md.replace(/<sup>([^<]*)<\/sup>/gi, (_, d) =>
    d.split('').map((c: string) => SUPERSCRIPT_MAP[c] ?? c).join('')
  );

  // List items (e.g. Constraints): full line with inline code for variables/numbers (LeetCode-style grey highlight)
  md = md.replace(/<li>([\s\S]*?)<\/li>/gi, (_, inner) => {
    let s = replaceSuperscript(inner);
    s = s.replace(/<code>([\s\S]*?)<\/code>/gi, (__, c: string) => {
      const t = stripHtmlTags(c).trim();
      return '`' + decodeEntitiesOnly(t) + '`';
    });
    s = stripHtmlTags(s);
    s = decodeEntitiesOnly(s).replace(/\s+/g, ' ').trim();
    return '\n- ' + s;
  });

  // Inline code: <code>...</code> -> `...` (after list items so constraints stay plain)
  md = md.replace(/<code>([\s\S]*?)<\/code>/gi, (_, inner) => {
    const text = stripHtmlTags(inner).trim();
    return '`' + decodeEntitiesOnly(text) + '`';
  });

  // Paragraphs: <p>...</p> -> double newline
  md = md.replace(/<p>([\s\S]*?)<\/p>/gi, (_, inner) => {
    const text = stripHtmlTags(inner).replace(/\s+/g, ' ').trim();
    return '\n\n' + decodeEntitiesOnly(text) + '\n\n';
  });

  // Remove any remaining tags, then decode (preserves <= and >= in constraints)
  md = stripHtmlTags(md);
  md = decodeEntitiesOnly(md);

  // Normalize: collapse excessive blank lines and trim trailing spaces,
  // but preserve the original line structure so that lists, examples,
  // and sections like Constraints / Follow-up render cleanly in Markdown.
  md = md
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Fix bold labels so GitHub renders them (no space before closing **): "**Follow-up: **" -> "**Follow-up:**"
  md = md.replace(/\*\*([^*]+):\s*\*\*/g, '**$1:**');

  return md;
}

/**
 * Build LeetHub-style README markdown for a LeetCode problem (LeetCode-style layout).
 */
export function buildLeetcodeReadme(
  details: LeetcodeQuestionDetails,
  problemUrl: string
): string {
  const content = leetcodeContentToMarkdown(details.content);
  const lines: string[] = [
    `# ${details.questionFrontendId}. ${details.title}`,
    '',
    `**Difficulty:** ${details.difficulty}`,
    '',
    `**Problem:** [${details.title}](${problemUrl})`,
    '',
    '---',
    '',
    content,
  ];
  return lines.join('\n');
}

export interface CodeforcesReadmeInput {
  contestId: number;
  index: string;
  name: string;
  questionUrl: string;
  /** Optional: time limit (e.g. "2 seconds"). */
  timeLimit?: string;
  /** Optional: memory limit (e.g. "256 megabytes"). */
  memoryLimit?: string;
  /** Optional: problem statement (markdown or plain text). */
  problemStatement?: string;
}

/**
 * Build README for a Codeforces problem (same structure as problem page: title, limits, link, statement).
 */
export function buildCodeforcesReadme(input: CodeforcesReadmeInput): string {
  const title = `${input.contestId}${input.index} ${input.name}`;
  const lines: string[] = [
    `# ${title}`,
    '',
    `**Problem:** [${title}](${input.questionUrl})`,
  ];
  if (input.timeLimit) {
    lines.push('', `**time limit per test:** ${input.timeLimit}`);
  }
  if (input.memoryLimit) {
    lines.push('', `**memory limit per test:** ${input.memoryLimit}`);
  }
  if (input.timeLimit || input.memoryLimit) {
    lines.push('');
  }
  if (input.problemStatement?.trim()) {
    lines.push('---', '', input.problemStatement.trim(), '');
  }
  return lines.join('\n');
}

/**
 * Build minimal README when only URL/slug is available (e.g. sidepanel manual submit).
 */
export function buildMinimalReadme(title: string, questionUrl: string): string {
  const lines: string[] = [
    `# ${title}`,
    '',
    `**Problem:** [${title}](${questionUrl})`,
  ];
  return lines.join('\n');
}
