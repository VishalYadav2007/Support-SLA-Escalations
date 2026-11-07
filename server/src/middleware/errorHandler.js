function sendError(res, status, code, message, details = []) {
  return res.status(status).json({ error: { code, message, details } });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.name === 'ValidationError') return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed');
  if (err.code === 11000) return sendError(res, 409, 'CONFLICT', 'Duplicate value');
  if (err.name === 'CastError') return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
  console.error(err.message);
  return sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
function notFound(req, res) {
  return sendError(res, 404, 'NOT_FOUND', 'Route not found');
}
module.exports = { errorHandler, notFound, sendError };
