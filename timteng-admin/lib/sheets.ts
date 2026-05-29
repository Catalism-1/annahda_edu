import { google } from 'googleapis';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function getPendaftar() {
  const privateKey = requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: requireEnv('GOOGLE_SHEETS_ID'),
    range: process.env.GOOGLE_SHEETS_RANGE ?? 'Sheet1!A:Z',
  });

  const rows = response.data.values ?? [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row, i) => {
    const obj: Record<string, string> = { _id: String(i + 1) };
    headers.forEach((h, idx) => { obj[h] = row[idx] ?? ''; });
    return obj;
  });
}
