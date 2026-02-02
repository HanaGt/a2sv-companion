import request from 'supertest';
import app from '../src/index';

// Mock the GoogleSheetsService
jest.mock('../src/services/googleSheets', () => ({
  GoogleSheetsService: {
    appendSubmission: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Submission API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api', () => {
    const validSubmission = {
      studentName: 'John Doe',
      attempts: 3,
      timeTaken: 45,
      questionUrl: 'https://codeforces.com/problemset/problem/1/A',
      platform: 'Codeforces' as const,
      gitUrl: 'https://github.com/user/repo/blob/main/codeforces/1A-Theatre-Square.cpp'
    };

    it('should accept valid submission', async () => {
      const response = await request(app)
        .post('/api')
        .send(validSubmission)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Submission recorded successfully'
      });
    });

    it('should reject invalid submission - missing required field', async () => {
      const invalidSubmission = { ...validSubmission };
      delete invalidSubmission.studentName;

      const response = await request(app)
        .post('/api')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('"studentName" is required');
    });

    it('should reject invalid platform', async () => {
      const invalidSubmission = {
        ...validSubmission,
        platform: 'InvalidPlatform'
      };

      const response = await request(app)
        .post('/api')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject invalid URL', async () => {
      const invalidSubmission = {
        ...validSubmission,
        questionUrl: 'not-a-url'
      };

      const response = await request(app)
        .post('/api')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});