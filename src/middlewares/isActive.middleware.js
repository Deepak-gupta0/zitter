export const checkIsActive = (req, _, next) => {
  // user hi nahi hai → public route
  if (!req.user) {
    return next();
  }

  // user hai but inactive
  if (!req.user.isActive) {
    throw new ApiError(403, "Account is deactivated");
  }

  next();
};
