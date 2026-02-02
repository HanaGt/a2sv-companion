# A2SV Companion Backend

Backend API for the A2SV Companion Chrome Extension. This service receives coding problem submissions from Codeforces and LeetCode and stores them in Google Sheets.

## Features

- RESTful API for submission data
- Google Sheets integration
- Input validation
- CORS support
- TypeScript support

## Setup

### Prerequisites

- Node.js (v16 or higher)
- Google Cloud Project with Sheets API enabled
- Service Account with Sheets API access

### Installation

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Google Sheets API:
   - Create a Google Cloud Project
   - Enable the Google Sheets API
   - Create a Service Account and download the JSON key
   - Share your Google Sheet with the Service Account email

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```


   ```

### Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

### API Endpoints

#### POST /api
Submit a coding problem solution.

**Request Body:**
```json
{
  "studentName": "John Doe",
  "attempts": 3,
  "timeTaken": 45,
  "questionUrl": "https://codeforces.com/problemset/problem/1/A",
  "platform": "Codeforces",
  "gitUrl": "https://github.com/user/repo/blob/main/codeforces/1A-Theatre-Square.cpp"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Submission recorded successfully"
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Google Sheets Format

The API expects the Google Sheet to have the following columns:
1. Timestamp
2. Student Name
3. Attempts
4. Time Taken (minutes)
5. Question URL
6. Platform
7. Git URL

## Deployment

This backend is designed to work with Vercel deployment. The production URL should be configured in the Chrome extension's config file.

## Testing

Run tests:
```bash
npm test
```

## License

ISC