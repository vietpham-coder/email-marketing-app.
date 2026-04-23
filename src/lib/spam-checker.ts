export interface SpamResult {
  score: number;
  risk: 'Low' | 'Medium' | 'High';
  warnings: string[];
}

const SPAM_TRIGGER_WORDS = [
  'free', 'win', 'winner', 'cash', 'prize', 'urgent', 'guaranteed', 'no cost',
  'money', 'earn', 'investment', 'profit', 'opportunity', 'risk-free',
  'limited time', 'act now', 'bonus', 'claim', 'congratulations',
  'khuyến mãi', 'miễn phí', 'trúng thưởng', 'tiền mặt', 'cơ hội', 'đầu tư'
];

export function checkSpam(subject: string, body: string): SpamResult {
  let score = 0;
  const warnings: string[] = [];

  const combined = (subject + ' ' + body).toLowerCase();

  // 1. Check for trigger words
  const foundWords = SPAM_TRIGGER_WORDS.filter(word => combined.includes(word));
  if (foundWords.length > 0) {
    score += foundWords.length * 5;
    warnings.push(`Chứa từ khóa nhạy cảm: ${foundWords.slice(0, 3).join(', ')}...`);
  }

  // 2. Check for ALL CAPS in subject
  if (subject.length > 5 && subject === subject.toUpperCase() && /[A-Z]/.test(subject)) {
    score += 20;
    warnings.push("Tiêu đề viết hoa toàn bộ (All Caps).");
  }

  // 3. Excessive punctuation
  if (/[!!?]{3,}/.test(subject) || /[!!?]{3,}/.test(body)) {
    score += 15;
    warnings.push("Sử dụng quá nhiều dấu chấm than hoặc dấu hỏi (!!!).");
  }

  // 4. Check for personalization tokens
  if (!body.includes('{{') || !body.includes('}}')) {
    score += 10;
    warnings.push("Thiếu các thẻ cá nhân hóa (ví dụ: {{Name}}).");
  }

  // 5. Short content
  if (body.length < 50) {
    score += 10;
    warnings.push("Nội dung quá ngắn.");
  }

  // 6. Misleading subject prefixes
  const subjectLower = subject.toLowerCase();
  if (subjectLower.startsWith('re:') || subjectLower.startsWith('fwd:')) {
    score += 25;
    warnings.push("Tiêu đề chứa tiền tố gây hiểu lầm (Re:, Fwd:).");
  }

  // 7. Subject too long
  if (subject.length > 70) {
    score += 10;
    warnings.push("Tiêu đề quá dài (nên dưới 70 ký tự).");
  }

  // 8. Too many links
  const linkCount = (body.match(/<a/g) || []).length;
  if (linkCount > 3) {
    score += 15;
    warnings.push(`Chứa quá nhiều liên kết (${linkCount}). Nên giới hạn dưới 3.`);
  }

  // 9. Spammy symbols in subject
  if (/[%$#@*]/.test(subject)) {
    score += 10;
    warnings.push("Tiêu đề chứa các ký tự đặc biệt gây nghi ngờ ($ , % , #).");
  }

  // Determine Risk
  let risk: 'Low' | 'Medium' | 'High' = 'Low';
  if (score > 40) risk = 'High';
  else if (score > 15) risk = 'Medium';

  return { score, risk, warnings };
}
