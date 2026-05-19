import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

let requestCounter = 0;

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  const requestId = `req_${++requestCounter}_${Date.now()}`;

  logger.error({ err, requestId }, "Unhandled error");

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
