const jwt = require("jsonwebtoken");

function verifyAccess(req, res, next) {
  // ✅ Support both header and cookie
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;

  // If no header token, try cookies
  if (!token && req.cookies && req.cookies.webToken) {
    token = req.cookies.webToken;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,  // use sub since that’s what you signed in login
      role: payload.role,
      username: payload.username,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Role-based authorization
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

module.exports = { verifyAccess, authorize };
