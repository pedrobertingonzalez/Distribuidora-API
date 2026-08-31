const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    telefono: { type: String, trim: true },
    categoria: { type: String, trim: true },
});

module.exports = mongoose.model('Proveedor', proveedorSchema);
