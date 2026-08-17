import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

// Deliberately not named __filename/__dirname: the serverless bundler injects
// its own shims for those identifiers, which collides with a local declaration.
const moduleFile = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFile);
const projectRoot = path.resolve(moduleDir, '../../..');

const OP_FILE = 'Day wise OP Survey Report SMS OP Sharjha Cluster.xlsx';
const IP_FILE = 'Day wise IP Survey Report SMS Sharjha Cluster.xlsx';

export const SOURCE_FILES = [OP_FILE, IP_FILE];

// The loader runs both from the local Express server and from a bundled
// serverless function, where the module no longer sits at a known depth below
// the project root. Probe the plausible locations and use the first one that
// actually holds a workbook.
function candidateDataDirs() {
  const candidates = [];

  if (process.env.DATA_DIR) {
    candidates.push(path.resolve(process.cwd(), process.env.DATA_DIR));
  }

  candidates.push(path.resolve(projectRoot, 'data'));
  candidates.push(path.resolve(process.cwd(), 'data'));

  if (process.env.LAMBDA_TASK_ROOT) {
    candidates.push(path.resolve(process.env.LAMBDA_TASK_ROOT, 'data'));
  }

  // Walk up from this module looking for a sibling `data` directory.
  let current = moduleDir;
  for (let depth = 0; depth < 8; depth += 1) {
    candidates.push(path.join(current, 'data'));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return Array.from(new Set(candidates));
}

function resolveDataDir() {
  const candidates = candidateDataDirs();

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, OP_FILE)) || fs.existsSync(path.join(dir, IP_FILE))) {
      return dir;
    }
  }

  throw new Error(
    `Unable to locate the survey data directory. Looked in:\n${candidates.join('\n')}`
  );
}

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
  const dataDir = resolveDataDir();
  const files = [
    {
      type: 'OP',
      fileName: OP_FILE
    },
    {
      type: 'IP',
      fileName: IP_FILE
    }
  ];

  const workbookData = [];

  for (const fileInfo of files) {
    const filePath = path.join(dataDir, fileInfo.fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing Excel file: ${fileInfo.fileName}`);
    }

    // Read through a buffer rather than XLSX.readFile so the parser does not
    // need filesystem access of its own once bundled.
    const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
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
