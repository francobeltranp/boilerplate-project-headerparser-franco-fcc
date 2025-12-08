'use strict';

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const fccTestingRoutes = require('./routes/fcctesting.js');
const apiRoutes = require('./routes/api.js');
const runner = require('./test-runner');

const app = express();

// Seguridad con Helmet
app.use(helmet());

app.use(helmet.frameguard({ action: 'sameorigin' }));       // Solo iframes del mismo origen
app.use(helmet.dnsPrefetchControl({ allow: false }));       // Deshabilitar DNS prefetch
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));  // Referrer solo same-origin

// Conexión a MongoDB con Mongoose
const mongoUri = process.env.DB;
mongoose.set('strictQuery', false);

mongoose.connect(mongoUri)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err.message));

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); // Para FCC

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Index
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// Rutas FCC testing
fccTestingRoutes(app);

// Rutas API
apiRoutes(app);

// 404
app.use(function (req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Server + tests
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app;
