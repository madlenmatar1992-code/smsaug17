import { loadWorkbookRecords, SOURCE_FILES } from './excelLoader.js';
import { normalizeNPS, buildDataQualitySummary } from './dataQuality.js';
import { getNpsSegment, calculateNps } from './npsUtils.js';
import { classifySentiment } from './sentimentUtils.js';
import { classifyThemes } from './themeUtils.js';

const HOSPITALS = [
  'All Hospitals',
  'Medcare Royal Speciality Hospital',
  'Medcare Hospital Sharjah Branch 1',
  'Medcare Hospital, Sharjah'
];

function splitCommentIntoIssueRows(comment, index, baseRecord) {
  const text = String(comment || '').trim();
  if (!text) return [];

  const segments = text
    .split(/[.;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length === 0) return [];

  return segments.map((segment, segmentIndex) => {
    const segmentText = segment.replace(/\s+/g, ' ');
    const sentiment = classifySentiment(segmentText);
    const themes = classifyThemes(segmentText);
    const theme = themes[0] || 'General Satisfaction';
    const subTheme = themes[1] || theme;

    return {
      Feedback_ID: `${baseRecord.Source || 'SMS'}-${baseRecord.EpisodeID || 'unknown'}-${index}-${segmentIndex}`,
      ParentFeedback_ID: `${baseRecord.Source || 'SMS'}-${baseRecord.EpisodeID || 'unknown'}-${index}`,
      Source: baseRecord.Source || 'SMS',
      SurveyType: baseRecord.SurveyType || 'OP',
      Hospital: baseRecord.Hospital || 'Unknown Hospital',
      SurveyDate: baseRecord.SurveyDate || '',
      Speciality: baseRecord.Speciality || '',
      TreatingDoctor: baseRecord.TreatingDoctor || '',
      Location: baseRecord.Location || '',
      OriginalComment: baseRecord.PatientComment || '',
      ExtractedIssue: segmentText,
      Theme: theme,
      SubTheme: subTheme,
      Sentiment: sentiment,
      NPSScore: baseRecord.NPSScore,
      NPSSegment: getNpsSegment(baseRecord.NPSScore),
      NPSContribution: 0,
      PatientType: baseRecord.PatientType || baseRecord.SurveyType || 'OP',
      RowKey: `${baseRecord.EpisodeID || 'unknown'}-${index}-${segmentIndex}`
    };
  });
}

export async function buildDashboardData() {
  const rawRecords = loadWorkbookRecords();
  const records = rawRecords.map((record, index) => {
    const npsValue = normalizeNPS(record.NPSRaw);
    const patientComment = String(record.PatientComment || '').trim();
    const sentiment = classifySentiment(patientComment);
    const themes = classifyThemes(patientComment);
    const feedbackId = `${record.Source || 'SMS'}-${record.EpisodeID || 'unknown'}-${index}`;

    return {
      ...record,
      Feedback_ID: feedbackId,
      RowID: index,
      NPSScore: npsValue,
      NPSSegment: getNpsSegment(npsValue),
      Sentiment: sentiment,
      Themes: themes,
      IsCommented: patientComment !== '',
      Hospital: record.Hospital || 'Unknown Hospital',
      Source: record.Source || 'SMS',
      SurveyType: record.SurveyType || 'OP',
      PatientType: record.PatientType || record.SurveyType || 'OP',
      Speciality: record.Speciality || '',
      TreatingDoctor: record.TreatingDoctor || '',
      Location: record.Location || '',
      EpisodeID: record.EpisodeID || '',
      UHID: record.UHID || ''
    };
  });

  const expandedRows = [];
  for (const record of records) {
    const parentIssueRow = {
      Feedback_ID: record.Feedback_ID,
      ParentFeedback_ID: record.Feedback_ID,
      Source: record.Source,
      SurveyType: record.SurveyType,
      Hospital: record.Hospital,
      SurveyDate: record.SurveyDate,
      Speciality: record.Speciality,
      TreatingDoctor: record.TreatingDoctor,
      Location: record.Location,
      OriginalComment: record.PatientComment,
      ExtractedIssue: record.PatientComment,
      Theme: record.Themes[0] || 'General Satisfaction',
      SubTheme: record.Themes[1] || record.Themes[0] || 'General Satisfaction',
      Sentiment: record.Sentiment,
      NPSScore: record.NPSScore,
      NPSSegment: record.NPSSegment,
      NPSContribution: 1,
      PatientType: record.PatientType,
      RowKey: `parent-${record.Feedback_ID}`
    };
    expandedRows.push(parentIssueRow);
    const issueRows = splitCommentIntoIssueRows(record.PatientComment, record.RowID, record);
    expandedRows.push(...issueRows);
  }

  const dataQuality = buildDataQualitySummary(records);
  const npsSummary = calculateNps(records);

  const hospitalSummary = HOSPITALS.filter((hospital) => hospital !== 'All Hospitals').map((hospital) => {
    const filtered = records.filter((record) => hospital === 'All Hospitals' || record.Hospital === hospital);
    const summary = calculateNps(filtered);
    const positivePct = filtered.filter((record) => record.Sentiment === 'Positive').length / Math.max(filtered.length, 1) * 100;
    const negativePct = filtered.filter((record) => record.Sentiment === 'Negative').length / Math.max(filtered.length, 1) * 100;
    return {
      hospital,
      feedbackCount: filtered.length,
      nps: summary.nps,
      promoterPct: summary.promoterPct,
      detractorPct: summary.detractorPct,
      positivePct,
      negativePct
    };
  });

  return {
    hospitalOptions: HOSPITALS,
    dataQuality,
    npsSummary,
    hospitalSummary,
    records,
    expandedRows,
    metadata: {
      sourceFiles: SOURCE_FILES,
      lastRefresh: new Date().toISOString()
    }
  };
}

// Fields the dashboard renders. The workbooks also carry patient names, mobile
// numbers, UHIDs and every raw survey question, none of which the client needs
// — sending them would leak patient detail into the browser and push the
// response past the serverless payload limit.
const CLIENT_RECORD_FIELDS = [
  'Feedback_ID',
  'Hospital',
  'SurveyType',
  'PatientType',
  'Source',
  'Speciality',
  'TreatingDoctor',
  'Location',
  'SurveyDate',
  'NPSScore',
  'NPSSegment',
  'Sentiment',
  'Themes',
  'PatientComment',
  'IsCommented'
];

function summarizeIssues(expandedRows) {
  const byTheme = new Map();
  const bySentiment = new Map();

  for (const row of expandedRows) {
    byTheme.set(row.Theme, (byTheme.get(row.Theme) || 0) + 1);
    bySentiment.set(row.Sentiment, (bySentiment.get(row.Sentiment) || 0) + 1);
  }

  return {
    totalIssueRows: expandedRows.length,
    byTheme: Array.from(byTheme, ([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count),
    bySentiment: Object.fromEntries(bySentiment)
  };
}

/**
 * Dashboard data shaped for transport to the browser: summaries in full, plus
 * the per-record fields the UI filters and charts on. The issue-level expansion
 * is returned as counts instead of ~2,000 verbatim rows.
 */
export async function buildDashboardResponse() {
  const { records, expandedRows, ...rest } = await buildDashboardData();

  return {
    ...rest,
    issueSummary: summarizeIssues(expandedRows),
    records: records.map((record) => {
      const projected = {};
      for (const field of CLIENT_RECORD_FIELDS) {
        projected[field] = record[field];
      }
      return projected;
    }),
    metadata: {
      ...rest.metadata,
      recordCount: records.length,
      issueRowCount: expandedRows.length
    }
  };
}
