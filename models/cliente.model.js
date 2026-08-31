const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    telefono: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
});

module.exports = mongoose.model('Cliente', clienteSchema);
