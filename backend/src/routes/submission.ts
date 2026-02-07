import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { GoogleSheetsService } from '../services/googleSheets';

const router = Router();

// Validation schema for submission data
const submissionSchema = Joi.object({
  studentName: Joi.string().required().min(1).max(100),
  problemName: Joi.string().required().valid('Two Sum', 'Reverse String', 'Length of Last Word'),
  timeTaken: Joi.number().min(0).required(),
  attempts: Joi.number().min(0).required()
});

// POST /api - Submit solution data to Google Sheets
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = submissionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((detail: Joi.ValidationErrorItem) => detail.message)
      });
    }

    const { studentName, problemName, timeTaken, attempts } = value;

    // Submit to Google Sheets
    await GoogleSheetsService.appendSubmission({
      studentName,
      problemName,
      timeTaken,
      attempts
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