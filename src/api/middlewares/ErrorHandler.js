const globalErrorHandler = (error, req, res, next) => {
  return res.status(error.status || 500).json({
    success: false,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "Internal Server Error...",
      timestamp: new Date(),
    },
  });
};

export default globalErrorHandler;
