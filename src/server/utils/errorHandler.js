// Centralized Try/Catch Async Error Handler Wrapper
const catchAsync = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error(`[Global Error Handler] Caught Exception in ${fn.name || 'controller'}: ${error.message}`, error.stack);
    return {
      status: error.status || 500,
      data: {
        error: error.message || 'An unexpected server error occurred. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    };
  }
};

const sendError = (res, statusCode, message, details = null) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({
    error: message,
    details: details
  }));
};

module.exports = { catchAsync, sendError };
