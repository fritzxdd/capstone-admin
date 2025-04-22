// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    // Log the error with stack trace
    console.error('API Error:', err);
    console.error('Stack Trace:', err.stack);
    
    // Include request details for debugging
    console.error('Request Details:', {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body ? JSON.stringify(req.body).substring(0, 1000) : null,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? 'REDACTED' : undefined
      }
    });
    
    // Check if headers have already been sent
    if (res.headersSent) {
      return next(err);
    }
    
    // Handle different error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: err.message,
        details: err.errors
      });
    }
    
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message
      });
    }
    
    if (err.name === 'ForbiddenError') {
      return res.status(403).json({
        error: 'Forbidden',
        message: err.message
      });
    }
    
    // Stripe-specific errors
    if (err.type && err.type.startsWith('Stripe')) {
      return res.status(400).json({
        error: 'Payment Processing Error',
        message: err.message,
        code: err.code,
        type: err.type
      });
    }
    
    // Firebase errors
    if (err.code && (err.code.includes('auth/') || err.code.includes('app/'))) {
      return res.status(400).json({
        error: 'Firebase Error',
        message: err.message,
        code: err.code
      });
    }
    
    // Default error response
    const statusCode = err.statusCode || 500;
    const errorMessage = err.message || 'Something went wrong';
    
    res.status(statusCode).json({
      error: 'Server Error',
      message: errorMessage,
      // Include stack trace in development but not production
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  };
  
  module.exports = errorHandler;