const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos fallidos por clave dentro de la ventana
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // solo cuenta los intentos fallidos (login incorrecto)
  keyGenerator: (req) => {
    const email = req.body?.email || 'sin-email';
    return `${req.ip}-${email}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiados intentos. Probá de nuevo en unos minutos.'
    });
  }
});

module.exports = { loginLimiter };