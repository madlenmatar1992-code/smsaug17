export const sentimentOptions = ['Positive', 'Negative', 'Neutral', 'No Relevant Sentiment'];

const positiveKeywords = [
  'excellent', 'thank', 'thank you', 'good', 'friendly', 'caring', 'professional', 'clean', 'smooth', 'helpful',
  'great', 'supportive', 'kind', 'compassion', 'appreciate', 'wonderful', 'best', 'care', 'very good', 'excellent care',
  'outstanding', 'lovely', 'priority', 'amazing', 'dedicated', 'satisfied'
];

const negativeKeywords = [
  'complaint', 'delay', 'waiting', 'slow', 'poor', 'rude', 'billing', 'registration', 'pharmacy', 'appointment', 'dirty',
  'noise', 'food', 'parking', 'valet', 'discharge', 'dissatisfied', 'unhelpful', 'issue', 'frustrating', 'concern'
];

export function classifySentiment(comment) {
  const cleaned = String(comment || '').trim();
  if (!cleaned || cleaned.toUpperCase() === 'NA') {
    return 'No Relevant Sentiment';
  }

  const lower = cleaned.toLowerCase();
  const hasPositive = positiveKeywords.some((keyword) => lower.includes(keyword));
  const hasNegative = negativeKeywords.some((keyword) => lower.includes(keyword));

  if (hasPositive && !hasNegative) return 'Positive';
  if (hasNegative && !hasPositive) return 'Negative';
  if (hasPositive && hasNegative) return 'Neutral';
  return 'No Relevant Sentiment';
}
