export function standardizeMissing(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  const invalidValues = ['na', 'n/a', 'not applicable', 'null', '', 'nan'];
  return invalidValues.includes(str.toLowerCase()) ? '' : str;
}

export function normalizeNPS(value) {
  const cleaned = standardizeMissing(value);
  if (cleaned === '') return null;
  if (typeof cleaned === 'string') {
    const trimmed = cleaned.trim();
    if (!/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) return null;
    const numeric = Number(trimmed);
    if (Number.isNaN(numeric)) return null;
    if (numeric >= 0 && numeric <= 10) return numeric;
    return null;
  }
  const numeric = Number(cleaned);
  if (Number.isNaN(numeric)) return null;
  if (numeric >= 0 && numeric <= 10) return numeric;
  return null;
}

export function buildDataQualitySummary(records) {
  const totalRecords = records.length;
  const validNPS = records.filter((record) => record.NPSScore !== null && record.NPSScore !== undefined && !Number.isNaN(record.NPSScore)).length;
  const invalidNPS = totalRecords - validNPS;
  const recordsWithComments = records.filter((record) => String(record.PatientComment || '').trim() !== '').length;
  const recordsWithoutComments = totalRecords - recordsWithComments;
  const opRecords = records.filter((record) => record.SurveyType === 'OP').length;
  const ipRecords = records.filter((record) => record.SurveyType === 'IP').length;

  return {
    totalRecords,
    validNPS,
    invalidNPS,
    recordsWithComments,
    recordsWithoutComments,
    opRecords,
    ipRecords
  };
}
