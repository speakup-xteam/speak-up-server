const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const router = require('./router');
const server = express();
const port = process.env.PORT || 8080;

// Server configuration
server.use(morgan('dev'));
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());

// Matching
server.use('/api/matching', router);

// Error handler
server.use((req, res) => res.status(404).json({message: 'Resource not found!'}));
server.use((err, req, res, next) => res.status(500).json({message: 'Internal Server Error'}));

server.listen(port, () => console.log('Server running at ' + port));