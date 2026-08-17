import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
const DATA_DIR = path.resolve(projectRoot, 'data');

const normalizeCell = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return value;
};

const toSafeString = (value) => {
  const normalized = normalizeCell(value);
  if (normalized === '' || normalized === 'NA' || normalized === 'N/A' || normalized === 'Not Applicable' || normalized === 'null') {
    return '';
  }
  return String(normalized);
};

export function loadWorkbookRecords() {
  const files = [
    {
      type: 'OP',
      fileName: 'Day wise OP Survey Report SMS OP Sharjha Cluster.xlsx'
    },
    {
      type: 'IP',
      fileName: 'Day wise IP Survey Report SMS Sharjha Cluster.xlsx'
    }
  ];

  const workbookData = [];

  for (const fileInfo of files) {
    const filePath = path.join(DATA_DIR, fileInfo.fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing Excel file: ${fileInfo.fileName}`);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

    for (const row of rows) {
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanedKey = String(key).trim();
        normalizedRow[cleanedKey] = toSafeString(value);
      }

      workbookData.push({
        ...normalizedRow,
        Source: normalizedRow.Source || 'SMS',
        SurveyType: fileInfo.type,
        PatientType: normalizedRow['Patient Type'] || normalizedRow.PatientType || fileInfo.type,
        Hospital: normalizedRow['Unit Name'] || normalizedRow['Hospital'] || 'Unknown Hospital',
        Speciality: normalizedRow.Speciality || normalizedRow['Speciality '] || '',
        TreatingDoctor: normalizedRow['Treating Doctor'] || normalizedRow['Treating Doctor '] || '',
        Location: normalizedRow.Location || '',
        EpisodeID: normalizedRow['Episode ID'] || normalizedRow.EpisodeID || '',
        UHID: normalizedRow.UHID || '',
        SurveyDate: normalizedRow['Open Date'] || normalizedRow['Visit Date Time'] || normalizedRow['Discharge Date Time'] || normalizedRow['Admission Date Time'] || '',
        PatientComment: normalizedRow['Patient Comment'] || normalizedRow['Please give us your valuable comments to serve you even better'] || normalizedRow['Comment'] || '',
        NPSRaw: normalizedRow['How likely are you to recommend Medcare to a friend or family member?'] || normalizedRow['NPS'] || ''
      });
    }
  }

  return workbookData;
}
