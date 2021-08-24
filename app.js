const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const globalErrorHandler = require('./controllers/errorController');

const app = express();

// Trust proxies (For heroku)
app.enable('trust proxy');

// Global Middleware
// Implement CORS
app.use(cors());

// Use this to enable CORS for a specific domain
// app.use(
//     cors({
//         origin: 'https://e2r2fx.herokuapp.com',
//     })
// );

// Allow complex CORS requests on any route (i.e. PATCH,
// DELETE, etc), which sends a preflight request
// with OPTIONS method
app.options('*', cors());

// User this to enable CORS complex requests on specific routes
// app.options('/some/other/route', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Development logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Set Security HTTP headers
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [
                "'self'",
                'data:',
                'blob:',
                'localhost:8000',
                'ws:',
                'fonts.gstatic.com',
                'api.mapbox.com',
                'events.mapbox.com',
                'cdnjs.cloudflare.com',
                'js.stripe.com',
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'api.mapbox.com',
                'fonts.googleapis.com',
            ],
        },
    })
);

// Rate limiting
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message:
        'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// Body parser with payload limit
app.use(express.json({ limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Compress text sent to client
app.use(compression());

// app.use((req, res, _next) => {
//     console.log('serve react');
//     res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
// });

app.get('*', (req, res, _next) => {
    console.log('hey');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(globalErrorHandler);

module.exports = app;
