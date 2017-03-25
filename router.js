const router = require('express').Router();
const matchingController = require('./controller');

router.get('/:userId', matchingController.matchUsers);

module.exports = router;