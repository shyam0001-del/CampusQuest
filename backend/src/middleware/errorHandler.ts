import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If an uploaded file exists on disk when an error occurs, clean it up to prevent orphaned files
  if (req.file?.path) {
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch {
      // Ignore cleanup error
    }
  }

  // Handle Multer upload errors gracefully with 400 Bad Request
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File size exceeds the 25MB limit. Please upload a smaller file.',
        code: 'LIMIT_FILE_SIZE',
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
      code: err.code,
    });
    return;
  }

  // Handle custom file filter errors
  if (err.message && err.message.includes('File type not allowed')) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
