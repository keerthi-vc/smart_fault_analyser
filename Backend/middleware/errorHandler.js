/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and logging
 */

// Custom Error Classes
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    constructor(resource) {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(message, 500, false);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
}

// Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    // Log error
    console.error('❌ Error:', {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Determine if error details should be exposed
    const isProduction = process.env.NODE_ENV === 'production';
    const exposeDetails = !isProduction || err.isOperational;

    // Build error response
    const errorResponse = {
        error: {
            message: exposeDetails ? err.message : 'An unexpected error occurred',
            type: err.name || 'Error',
            timestamp: err.timestamp || new Date().toISOString()
        }
    };

    // Add stack trace in development
    if (!isProduction && err.stack) {
        errorResponse.error.stack = err.stack;
    }

    // Add additional context if available
    if (err.details) {
        errorResponse.error.details = err.details;
    }

    res.status(statusCode).json(errorResponse);
};

// Async Handler Wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Request Validation Middleware
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }
        next();
    };
};

// Database Error Handler
const handleDatabaseError = (error) => {
    // PostgreSQL error codes
    const errorMap = {
        '23505': 'Duplicate entry',
        '23503': 'Foreign key constraint violation',
        '23502': 'Not null constraint violation',
        '42P01': 'Table does not exist',
        '42703': 'Column does not exist'
    };

    const message = errorMap[error.code] || 'Database operation failed';
    return new DatabaseError(message, error);
};

// Retry Logic for Transient Errors
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Only retry on transient errors
            const isTransient = error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT' ||
                error.code === '40001'; // PostgreSQL serialization failure

            if (!isTransient || attempt === maxRetries) {
                break;
            }

            console.log(`⚠️  Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }

    throw lastError;
};

// Not Found Handler (404)
const notFoundHandler = (req, res, next) => {
    throw new NotFoundError(`Route ${req.originalUrl}`);
};

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    DatabaseError,

    // Middleware
    errorHandler,
    asyncHandler,
    validateRequest,
    notFoundHandler,

    // Utilities
    handleDatabaseError,
    retryOperation
};
