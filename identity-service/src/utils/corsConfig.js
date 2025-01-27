const cors = require("cors");

const configCors = () => {
    return cors({
        //origin -> which origins can access this server
        origin: (origin, cb) => {
            const allowedOrigins = [
                'http://localhost:3500',
                'https://yourcustomdomain.com', //production domain
            ]
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                cb(null, true);
            } else {
                cb(new Error('Not Allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'Accept-Version'
        ],
        exposedHeaders: [
            'X-Content-Range',
            'X-Content',
        ],
        credentials: true, //enable support for cookies
        preflightContinue: false,
        maxAge: 600, // cache preflightResponses for 10 mins (600 seconds)
        optionsSuccessStatus: 204
    })
}

module.exports = { configCors };