const jwt = require('jsonwebtoken');

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Generate access token for tourists
  generateTouristToken(user) {
    const payload = {
      id: user._id || user.id,
      touristId: user.touristId,
      email: user.email,
      type: 'tourist',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn: this.expiresIn,
      issuer: 'travo-api',
      audience: 'travo-app'
    });
  }

  // Generate access token for dashboard officers
  generateOfficerToken(officer) {
    const payload = {
      id: officer._id || officer.id,
      officerId: officer.officerId,
      email: officer.email,
      department: officer.profile.department,
      role: officer.profile.role,
      permissions: officer.permissions,
      type: 'officer',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.secret, { 
      expiresIn: this.expiresIn,
      issuer: 'travo-api',
      audience: 'travo-dashboard'
    });
  }

  // Generate refresh token
  generateRefreshToken(userId, type) {
    const payload = {
      userId,
      type,
      iat: Math.floor(Date.now() / 1000),
      tokenType: 'refresh'
    };

    return jwt.sign(payload, this.refreshSecret, { 
      expiresIn: this.refreshExpiresIn,
      issuer: 'travo-api'
    });
  }

  // Verify access token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret);
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.payload.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  // Generate token pair (access + refresh)
  generateTokenPair(user, type = 'tourist') {
    const accessToken = type === 'tourist' 
      ? this.generateTouristToken(user)
      : this.generateOfficerToken(user);
      
    const refreshToken = this.generateRefreshToken(user._id || user.id, type);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.expiresIn,
      tokenType: 'Bearer'
    };
  }
}

// Middleware for protecting routes
const authenticateToken = (requiredType = null) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    try {
      const decoded = jwtService.verifyToken(token);
      
      // Check user type if specified
      if (requiredType && decoded.type !== requiredType) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required type: ${requiredType}`
        });
      }

      // Attach user info to request
      req.user = decoded;
      req.token = token;
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
  };
};

// Middleware for optional authentication
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = jwtService.extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const decoded = jwtService.verifyToken(token);
      req.user = decoded;
      req.token = token;
    } catch (error) {
      // Token invalid, but continue without auth
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

// Create singleton instance
const jwtService = new JWTService();

module.exports = {
  jwtService,
  authenticateToken,
  optionalAuth
};