import { google } from 'googleapis';

export interface SubmissionData {
  studentName: string;
  attempts: number;
  timeTaken: number;
  questionUrl: string;
  platform: string;
  gitUrl: string;
}

export class GoogleSheetsService {
  private static sheets: any;
  private static spreadsheetId: string;
  private static range: string;

  static initialize() {
    if (!this.sheets) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
      this.range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:F';
    }
  }

  static async appendSubmission(submission: SubmissionData): Promise<void> {
    this.initialize();

    const timestamp = new Date().toISOString();
    const values = [
      [
        timestamp,
        submission.studentName,
        submission.attempts,
        submission.timeTaken,
        submission.questionUrl,
        submission.platform,
        submission.gitUrl
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
        valueInputOption: 'RAW',
        resource: { values },
      });
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw new Error('Failed to save submission to Google Sheets');
    }
  }

  static async getSheetData(): Promise<any[]> {
    this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error reading from Google Sheets:', error);
      throw new Error('Failed to read data from Google Sheets');
    }
  }
}