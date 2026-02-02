import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { GoogleSheetsService } from '../services/googleSheets';

const router = Router();

// Validation schema for submission data
const submissionSchema = Joi.object({
  studentName: Joi.string().required().min(1).max(100),
  attempts: Joi.number().integer().min(1).required(),
  timeTaken: Joi.number().min(0).required(),
  questionUrl: Joi.string().uri().required(),
  platform: Joi.string().valid('Codeforces', 'LeetCode').required(),
  gitUrl: Joi.string().uri().required()
});

// POST /api - Submit solution data to Google Sheets
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = submissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }

    const { studentName, attempts, timeTaken, questionUrl, platform, gitUrl } = value;

    // Submit to Google Sheets
    await GoogleSheetsService.appendSubmission({
      studentName,
      attempts,
      timeTaken,
      questionUrl,
      platform,
      gitUrl
    });

    res.status(200).json({
      success: true,
      message: 'Submission recorded successfully'
    });

  } catch (error) {
    console.error('Error processing submission:', error);
    res.status(500).json({
      error: 'Failed to process submission',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as submissionRouter };