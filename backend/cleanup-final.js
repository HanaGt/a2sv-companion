require('dotenv').config();

const { google } = require('googleapis');

async function cleanupFinal() {
  try {
    console.log('🧹 Removing test data, keeping only original data...\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Keep only the header and original data
    const cleanData = [
      ["Student Name", "Two Sum", "Time", "Reverse String", "Time", "Length of Last Word", "Time"],
      ["Hana Guta"]
    ];

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Sheet1!A:G',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A:G',
      valueInputOption: 'RAW',
      resource: { values: cleanData },
    });

    console.log('✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanupFinal();