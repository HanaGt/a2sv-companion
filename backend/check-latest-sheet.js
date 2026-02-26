require('dotenv').config();

const { google } = require('googleapis');

async function checkLatestSheet() {
  try {
    console.log('🔍 Checking latest Google Sheets data...\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = 'Sheet1!A:G';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const data = response.data.values || [];
    console.log('📋 Current sheet data:');
    console.log('==================');

    if (data.length === 0) {
      console.log('❌ Sheet is empty!');
    } else {
      data.forEach((row, index) => {
        console.log(`Row ${index + 1}: [${row.map(cell => `"${cell || ''}"`).join(', ')}]`);
      });
    }

    console.log('\n==================');
    console.log(`Total rows: ${data.length}`);

    // Check if "Test User" was added
    const hasTestUser = data.some(row => row[0] === 'Test User');
    if (hasTestUser) {
      console.log('✅ Test User data was successfully added to the sheet!');
    } else {
      console.log('❌ Test User data was NOT found in the sheet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestSheet();