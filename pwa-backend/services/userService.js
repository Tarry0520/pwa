const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { setWithExpiry, get, del } = require('../config/redis');
const { generateToken } = require('../middleware/auth');

/**
 * User service
 */
class UserService {
  /**
   * Find user by email or student ID
   * @param {string} identifier - email or student ID
   * @returns {Object|null} user
   */
  async findByEmailOrStudentId(identifier) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ? OR student_id = ?',
        [identifier, identifier]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Find user failed:', error);
      throw error;
    }
  }

  /**
   * Generate a student ID
   * @returns {string} student ID
   */
  async generateStudentId() {
    try {
      // Get current year
      const currentYear = new Date().getFullYear();
      const yearPrefix = currentYear.toString().slice(-2); // last 2 digits of year
      
      // Query the max student ID for current year
      const [rows] = await pool.execute(
        'SELECT student_id FROM users WHERE student_id LIKE ? ORDER BY student_id DESC LIMIT 1',
        [`${yearPrefix}%`]
      );
      
      let nextNumber = 1;
      if (rows.length > 0) {
        const lastStudentId = rows[0].student_id;
        const lastNumber = parseInt(lastStudentId.slice(-6)); // last 6 digits
        nextNumber = lastNumber + 1;
      }
      
      // Format: YY + 6 digits, e.g., 25000001
      const studentId = `${yearPrefix}${nextNumber.toString().padStart(6, '0')}`;
      
      return studentId;
    } catch (error) {
      console.error('Generate student ID failed:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - email
   * @returns {Object|null} user
   */
  async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Find user by email failed:', error);
      throw error;
    }
  }

  /**
   * Find user by OAuth provider and ID
   * @param {string} provider - OAuth provider (microsoft, google, etc.)
   * @param {string} providerId - provider user ID
   * @returns {Object|null} user
   */
  async findByProvider(provider, providerId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
        [provider, providerId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Find user by provider failed:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - user ID
   * @returns {Object|null} user
   */
  async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, student_id, email, display_name, phone, avatar_url, provider, created_at FROM users WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Find user by ID failed:', error);
      throw error;
    }
  }

  /**
   * Create user
   * @param {Object} userData - user data
   * @returns {Object} new user
   */
  async createUser(userData) {
    try {
      const { email, password } = userData;
      
      // Ensure email unique
      const existingEmail = await this.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Generate student ID
      const studentId = await this.generateStudentId();

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert user
      const [result] = await pool.execute(
        'INSERT INTO users (student_id, email, password) VALUES (?, ?, ?)',
        [studentId, email, hashedPassword]
      );

      // Return user (without password)
      const newUser = await this.findById(result.insertId);
      return newUser;
    } catch (error) {
      console.error('Create user failed:', error);
      throw error;
    }
  }

  /**
   * Create or update OAuth user
   * @param {Object} oauthData - OAuth user data
   * @returns {Object} user
   */
  async createOrUpdateOAuthUser(oauthData) {
    try {
      const { provider, providerId, email, displayName, avatarUrl } = oauthData;
      
      // Normalize undefined to null
      const safeProvider = provider || null;
      const safeProviderId = providerId || null;
      const safeEmail = email || null;
      const safeDisplayName = displayName || null;
      const safeAvatarUrl = avatarUrl || null;
      
      // Try find by provider/providerId first
      let user = await this.findByProvider(safeProvider, safeProviderId);
      
      if (user) {
        // Update existing user
        await pool.execute(
          'UPDATE users SET email = ?, display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [safeEmail, safeDisplayName, safeAvatarUrl, user.id]
        );
        
        // Re-fetch
        user = await this.findById(user.id);
      } else {
        // Check if email exists on another user
        const existingEmailUser = await this.findByEmail(safeEmail);
        if (existingEmailUser) {
          // Update existing user with provider info
          await pool.execute(
            'UPDATE users SET provider = ?, provider_id = ?, display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
            [safeProvider, safeProviderId, safeDisplayName, safeAvatarUrl, safeEmail]
          );
          user = await this.findByEmail(safeEmail);
        } else {
          // Generate student ID
          const studentId = await this.generateStudentId();
          
          // Create new user
          const [result] = await pool.execute(
            'INSERT INTO users (student_id, provider, provider_id, email, display_name, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
            [studentId, safeProvider, safeProviderId, safeEmail, safeDisplayName, safeAvatarUrl]
          );
          
          user = await this.findById(result.insertId);
        }
      }
      
      return user;
    } catch (error) {
      console.error('Create or update OAuth user failed:', error);
      throw error;
    }
  }

  /**
   * OAuth login
   * @param {Object} oauthData - OAuth user data
   * @returns {Object} login result
   */
  async oauthLogin(oauthData) {
    try {
      // Create or update OAuth user
      const user = await this.createOrUpdateOAuthUser(oauthData);
      
      if (!user) {
        throw new Error('OAuth user creation failed');
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        student_id: user.student_id,
        email: user.email,
        provider: user.provider
      };
      const token = generateToken(tokenPayload);

      // Store token in Redis (24 hours)
      await setWithExpiry(`user:${user.id}:token`, token, 24 * 60 * 60);

      // Return user info and token (no password)
      const userInfo = {
        id: user.id,
        student_id: user.student_id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        provider: user.provider,
        created_at: user.created_at
      };

      return {
        user: userInfo,
        token,
        expiresIn: '24h'
      };
    } catch (error) {
      console.error('OAuth login failed:', error);
      throw error;
    }
  }

  /**
   * Validate user password
   * @param {string} password - plain password
   * @param {string} hashedPassword - hashed password
   * @returns {boolean} whether matches
   */
  async validatePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password validation failed:', error);
      throw error;
    }
  }

  /**
   * Local login
   * @param {string} identifier - email or student ID
   * @param {string} password - password
   * @returns {Object} login result
   */
  async login(identifier, password) {
    try {
      // Find user
      const user = await this.findByEmailOrStudentId(identifier);
      if (!user) {
        throw new Error('User not found');
      }

      // Must be a local user with password
      if (!user.password) {
        throw new Error('This user uses third-party login, please use the corresponding login method');
      }

      // Validate password
      const isValidPassword = await this.validatePassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Incorrect password');
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        student_id: user.student_id,
        email: user.email
      };
      const token = generateToken(tokenPayload);

      // Optionally store token in Redis (24 hours)
      await setWithExpiry(`user:${user.id}:token`, token, 24 * 60 * 60);

      // Return user info and token (no password)
      const userInfo = {
        id: user.id,
        student_id: user.student_id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        provider: user.provider,
        created_at: user.created_at
      };

      return {
        user: userInfo,
        token,
        expiresIn: '24h'
      };
    } catch (error) {
      console.error('User login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   * @param {string} token - JWT token
   * @param {number} userId - user ID
   * @returns {boolean} whether succeeded
   */
  async logout(token, userId) {
    try {
      // Blacklist token (24 hours)
      await setWithExpiry(`blacklist:${token}`, true, 24 * 60 * 60);

      // Remove user's token from Redis
      await del(`user:${userId}:token`);

      return true;
    } catch (error) {
      console.error('User logout failed:', error);
      throw error;
    }
  }

  /**
   * Get user info (from cache or DB)
   * @param {number} userId - user ID
   * @returns {Object|null} user info
   */
  async getUserInfo(userId) {
    try {
      // Try Redis cache first
      const cachedUser = await get(`user:${userId}:info`);
      if (cachedUser) {
        return cachedUser;
      }

      // Fetch from DB
      const user = await this.findById(userId);
      if (user) {
        // Cache for 1 hour
        await setWithExpiry(`user:${userId}:info`, user, 60 * 60);
      }

      return user;
    } catch (error) {
      console.error('Get user info failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {number} userId - user ID
   * @param {Object} updateData - update data
   * @returns {Object} updated user
   */
  async updateUserProfile(userId, updateData) {
    try {
      const { displayName, email, phone } = updateData;
      
      // Validate email format
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid email format');
        }
        
        // Ensure email unique
        const [existingEmail] = await pool.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );
        
        if (existingEmail.length > 0) {
          throw new Error('Email is already used by another user');
        }
      }

      // Validate phone format
      if (phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
          throw new Error('Invalid phone number format');
        }
        
        // Ensure phone unique
        const [existingPhone] = await pool.execute(
          'SELECT id FROM users WHERE phone = ? AND id != ?',
          [phone, userId]
        );
        
        if (existingPhone.length > 0) {
          throw new Error('Phone number is already used by another user');
        }
      }

      // Build update SQL
      const updateFields = [];
      const updateValues = [];
      
      if (displayName !== undefined) {
        updateFields.push('display_name = ?');
        updateValues.push(displayName);
      }
      
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(phone);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(userId);
      
      // Execute update
      await pool.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // Clear cache
      await del(`user:${userId}:info`);
      
      // Return updated user
      const updatedUser = await this.findById(userId);
      return updatedUser;
    } catch (error) {
      console.error('Update user info failed:', error);
      throw error;
    }
  }

  /**
   * Clear all tokens for a user
   * @param {number} userId - user ID
   * @param {string} currentToken - current token (optional)
   * @returns {boolean} whether succeeded
   */
  async clearUserTokens(userId, currentToken = null) {
    try {
      // Clear user token cache
      await del(`user:${userId}:token`);
      
      // Add current token to blacklist if provided
      if (currentToken) {
        await setWithExpiry(`blacklist:${currentToken}`, 'revoked', 24 * 60 * 60);
      }
      
      // Clear user info cache
      await del(`user:${userId}:info`);
      
      return true;
    } catch (error) {
      console.error('Clear user tokens failed:', error);
      return false;
    }
  }

  /**
   * Change user password
   * @param {number} userId - user ID
   * @param {string} oldPassword - old password
   * @param {string} newPassword - new password
   * @param {string} currentToken - current token (optional)
   * @returns {boolean} whether succeeded
   */
  async changePassword(userId, oldPassword, newPassword, currentToken = null) {
    try {
      // Validate new password length
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      
      // Fetch current password
      const [rows] = await pool.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = rows[0];
      
      // Ensure user has a password (OAuth users may not)
      if (!user.password) {
        throw new Error('This user uses third-party login and cannot change password');
      }
      
      // Validate old password
      const isValidOldPassword = await this.validatePassword(oldPassword, user.password);
      if (!isValidOldPassword) {
        throw new Error('Incorrect old password');
      }
      
      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await pool.execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId]
      );
      
      // Clear all tokens (including current token)
      await this.clearUserTokens(userId, currentToken);
      
      return true;
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
