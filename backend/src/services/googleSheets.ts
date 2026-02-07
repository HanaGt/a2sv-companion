import { google } from 'googleapis';

export interface SubmissionData {
  studentName: string;
  problemName: string;
  timeTaken: number;
  attempts: number;
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

    try {
      // First, read existing data to find the student row
      const existingData = await this.getSheetData();

      // Find the column index for the problem
      const problemColumnIndex = this.getProblemColumnIndex(submission.problemName);
      if (problemColumnIndex === -1) {
        throw new Error(`Unknown problem: ${submission.problemName}`);
      }

      // Look for existing student row
      let studentRowIndex = -1;
      for (let i = 0; i < existingData.length; i++) {
        if (existingData[i][0] === submission.studentName) {
          studentRowIndex = i;
          break;
        }
      }

      const timeFormatted = `${submission.timeTaken} min`;

      if (studentRowIndex >= 0) {
        // Update existing student row - put time in column B and attempts in problem column
        const timeRange = `Sheet1!B${studentRowIndex + 1}`;
        const attemptsRange = `Sheet1!${String.fromCharCode(65 + problemColumnIndex)}${studentRowIndex + 1}`;

        // Update time column
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: timeRange,
          valueInputOption: 'RAW',
          resource: { values: [[timeFormatted]] },
        });

        // Update attempts in problem column
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: attemptsRange,
          valueInputOption: 'RAW',
          resource: { values: [[submission.attempts]] },
        });
      } else {
        // Create new student row
        const newRow: (string | number)[] = [submission.studentName, timeFormatted, '', '', '', ''];
        newRow[problemColumnIndex] = submission.attempts;

        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: this.range,
          valueInputOption: 'RAW',
          resource: { values: [newRow] },
        });
      }
    } catch (error) {
      console.error('Error appending to Google Sheets:', error);
      throw new Error('Failed to save submission to Google Sheets');
    }
  }

  private static getProblemColumnIndex(problemName: string): number {
    const normalizedName = problemName.toLowerCase().replace(/[^a-z0-9]/g, '');

    switch (normalizedName) {
      case 'twosum':
        return 2; // Column C - Two Sum Attempts
      case 'reversestring':
        return 3; // Column D - Reverse String Attempts
      case 'lengthoflastword':
        return 4; // Column E - Length of Last Word Attempts
      default:
        return -1;
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