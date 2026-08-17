export function getNpsSegment(score) {
  if (score === null || score === undefined || Number.isNaN(score)) return 'Invalid';
  if (score >= 9 && score <= 10) return 'Promoter';
  if (score >= 7 && score <= 8) return 'Neutral';
  if (score >= 0 && score <= 6) return 'Detractor';
  return 'Invalid';
}

export function calculateNps(records) {
  const validResponses = records.filter((record) => record.NPSScore !== null && record.NPSScore !== undefined && !Number.isNaN(record.NPSScore));
  const promoters = validResponses.filter((record) => record.NPSScore >= 9 && record.NPSScore <= 10).length;
  const detractors = validResponses.filter((record) => record.NPSScore >= 0 && record.NPSScore <= 6).length;
  const neutrals = validResponses.filter((record) => record.NPSScore >= 7 && record.NPSScore <= 8).length;
  const denominator = validResponses.length || 1;
  const nps = ((promoters - detractors) / denominator) * 100;

  return {
    validNPSResponses: validResponses.length,
    promoters,
    neutrals,
    detractors,
    promoterPct: (promoters / denominator) * 100,
    neutralPct: (neutrals / denominator) * 100,
    detractorPct: (detractors / denominator) * 100,
    nps: Number(nps.toFixed(1))
  };
}
