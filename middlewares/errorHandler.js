const errorHandler = (err, req, res, next)=>{
    console.error(`[ERROR] ${err.message}`);
    res.status(err.status || 500).json({error: err.message || 'Error del servidor'});
}

module.exports = errorHandler