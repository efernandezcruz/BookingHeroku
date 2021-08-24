const { serializeError } = require('serialize-error');
const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate filed value: ${value}. Please use another value`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () =>
    new AppError('Token expired. Please log in again', 401);

const sendErrorDev = (err, req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        // Api Error
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    }
    // Rendered website
    res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message,
    });
};

const sendErrorProd = (err, req, res) => {
    // Api errors
    if (req.originalUrl.startsWith('/api')) {
        // Operational, trusted error
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        }

        // Programming or other unknown error
        console.error('error: ', err);

        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong',
        });
    }

    // Rendered website errors
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message,
        });

        // Programming or other unknown error
    }
    console.error('error: ', err);

    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later',
    });
};

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        // Errors are not copiable with any deep copy library
        // The only way i found that really works is this serializeError
        // library
        let error = serializeError(err);
        if (error.name === 'CastError')
            error = handleCastErrorDB(error);
        if (error.code === 11000)
            error = handleDuplicateFieldsDB(error);
        if (error.name === 'ValidationError')
            error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError')
            error = handleJWTError();
        if (error.name === 'TokenExpiredError')
            error = handleJWTExpiredError();
        sendErrorProd(error, req, res);
    }

    next();
};
module.exports = globalErrorHandler;
