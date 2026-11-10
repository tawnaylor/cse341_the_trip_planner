// OWNER: Member 1
// PLACEHOLDER: this currently lets every request through so the team can build
// and test routes before OAuth is finished.
// TODO (Member 1): replace with a real check that returns 401 when no user is logged in.

const isAuthenticated = (req, res, next) => {
  next();
};

module.exports = { isAuthenticated };
