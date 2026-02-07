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
        const rowRange = `Sheet1!A${studentRowIndex + 1}:F${studentRowIndex + 1}`;

        // Read the current row
        const currentRowResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: rowRange,
        });

        let currentRow = currentRowResponse.data.values ? currentRowResponse.data.values[0] : [];

        // Ensure the row has enough columns
        while (currentRow.length < 6) {
          currentRow.push('');
        }

        // Update time in column B (index 1) and attempts in problem column
        currentRow[1] = timeFormatted;
        currentRow[problemColumnIndex] = submission.attempts;

        // Update the entire row
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: rowRange,
          valueInputOption: 'RAW',
          resource: { values: [currentRow] },
        });
      } else {
        // Create new student row with all columns initialized
        const newRow: (string | number)[] = [
          submission.studentName, // Column A
          timeFormatted,          // Column B (Time)
          '',                     // Column C (Two Sum attempts)
          '',                     // Column D (Reverse String attempts)
          '',                     // Column E (Length of Last Word attempts)
          ''                      // Column F (unused)
        ];

        // Set attempts in the appropriate problem column
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