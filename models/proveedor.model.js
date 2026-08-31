const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    telefono: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
});

module.exports = mongoose.model('Proveedor', proveedorSchema);
