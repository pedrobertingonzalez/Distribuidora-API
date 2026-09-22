const mongoose = require ('mongoose');

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true},
    email: {type: String, required: true, lowercase: true, unique: true, trim: true },
    password: { type: String, required: true, select: false},
    rol: { type: String, enum: ['admin', 'vendedor'], default: 'vendedor' },
    tokenVersion: {type: Number, default: 0}
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;