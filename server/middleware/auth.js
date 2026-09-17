const jwt = require("jsonwebtoken");

function verifyAccess(req, res, next) {
  
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token && req.cookies && req.cookies.webToken) {
    token = req.cookies.webToken;
  }

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: payload.id,       
      role: payload.role,   
      userId: payload.userId,
      sem:payload.sem,
      batch:payload.batch
    };
    console.log(req.user);
    // console.log(req.url);

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