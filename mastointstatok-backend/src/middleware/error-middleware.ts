import { AppError } from "../lib/errors.js";
import { type NextFunction, type Request, type Response } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next : NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
    });
  } else {
    console.error(err);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    });
  }
}
