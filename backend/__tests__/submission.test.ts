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
      problemName: 'Two Sum',
      timeTaken: 45,
      attempts: 3
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
      const invalidSubmission = { ...validSubmission } as any;
      delete invalidSubmission.studentName;

      const response = await request(app)
        .post('/api')
        .send(invalidSubmission)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain('"studentName" is required');
    });

    it('should reject invalid problem name', async () => {
      const invalidSubmission = {
        ...validSubmission,
        problemName: 'Invalid Problem'
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