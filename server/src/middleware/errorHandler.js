import { ZodError } from 'zod';

/**
 * Centralized express error handler middleware.
 * Ensures predictable, structured JSON error responses across the entire API.
 */
export function errorHandler(err, req, res, next) {
  // Log unexpected server errors in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[API Error] ${req.method} ${req.url}:`, err);
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors
    });
  }

  // Handle SQLite specific constraint errors
  if (err.code && err.code.startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({
      error: 'Database constraint violation',
      message: err.message
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Authentication token expired' });
  }

  // Default internal server error
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
}

