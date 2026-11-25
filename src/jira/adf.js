// Atlassian Document Format and Confluence storage HTML to plain text.
export function adfToText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const kids = (node.content || []).map(adfToText);
  switch (node.type) {
    case 'text': return node.text || '';
    case 'hardBreak': return '\n';
    case 'paragraph': case 'heading': return kids.join('') + '\n';
    case 'listItem': return '- ' + kids.join('').trim() + '\n';
    case 'bulletList': case 'orderedList': return kids.join('') + '\n';
    case 'codeBlock': return kids.join('') + '\n';
    case 'mention': return node.attrs?.text || '';
    case 'inlineCard': return node.attrs?.url || '';
    default: return kids.join('');
  }
}
export const cleanText = (s) => String(s || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

export function storageToText(html) {
  return cleanText(String(html || '')
    .replace(/<ac:structured-macro[\s\S]*?<\/ac:structured-macro>/g, ' ')
    .replace(/<(br|\/p|\/h\d|\/li|\/tr)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
}
