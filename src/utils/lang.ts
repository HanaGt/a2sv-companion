export const getCodeforcesLangExtenson = (lang: string) => {
  if (lang.includes('Py')) {
    return 'py';
  } else if (lang.includes('Java')) {
    return 'java';
  } else if (lang.includes('++')) {
    return 'cpp';
  }
};

export const getLeetcodeLangExtension = (lang: string) => {
  switch (lang) {
    case 'cpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'python':
      return 'py';
    case 'python3':
      return 'py';
    case 'c':
      return 'c';
    case 'csharp':
      return 'cs';
    case 'javascript':
      return 'js';
    case 'ruby':
      return 'rb';
    case 'swift':
      return 'swift';
    case 'golang':
      return 'go';
    case 'scala':
      return 'scala';
    case 'kotlin':
      return 'kt';
    case 'rust':
      return 'rs';
    case 'php':
      return 'php';
    case 'typescript':
      return 'ts';
    default:
      return 'txt';
  }
};

export const getHackerRankLangExtension = (lang: string): string => {
  const lower = (lang || '').toLowerCase();
  if (lower.includes('python')) return 'py';
  if (lower.includes('java')) return 'java';
  if (lower.includes('c++') || lower.includes('cpp')) return 'cpp';
  if (lower.includes('c#')) return 'cs';
  if (lower.includes('javascript')) return 'js';
  if (lower.includes('typescript')) return 'ts';
  if (lower.includes('ruby')) return 'rb';
  if (lower.includes('swift')) return 'swift';
  if (lower.includes('go')) return 'go';
  if (lower.includes('scala')) return 'scala';
  if (lower.includes('kotlin')) return 'kt';
  if (lower.includes('rust')) return 'rs';
  if (lower.includes('php')) return 'php';
  return 'txt';
};
