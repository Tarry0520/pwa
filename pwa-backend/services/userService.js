const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { setWithExpiry, get, del } = require('../config/redis');
const { generateToken } = require('../middleware/auth');

/**
 * 用户服务类
 */
class UserService {
  /**
   * 根据邮箱或学号查找用户
   * @param {string} identifier - 邮箱或学号
   * @returns {Object|null} 用户信息
   */
  async findByEmailOrStudentId(identifier) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ? OR student_id = ?',
        [identifier, identifier]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 生成学号
   * @returns {string} 学号
   */
  async generateStudentId() {
    try {
      // 获取当前年份
      const currentYear = new Date().getFullYear();
      const yearPrefix = currentYear.toString().slice(-2); // 取年份后两位
      
      // 查询当前年份的最大学号
      const [rows] = await pool.execute(
        'SELECT student_id FROM users WHERE student_id LIKE ? ORDER BY student_id DESC LIMIT 1',
        [`${yearPrefix}%`]
      );
      
      let nextNumber = 1;
      if (rows.length > 0) {
        const lastStudentId = rows[0].student_id;
        const lastNumber = parseInt(lastStudentId.slice(-6)); // 取后6位数字
        nextNumber = lastNumber + 1;
      }
      
      // 生成学号：年份(2位) + 6位数字，如：24000001
      const studentId = `${yearPrefix}${nextNumber.toString().padStart(6, '0')}`;
      
      return studentId;
    } catch (error) {
      console.error('生成学号失败:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱查找用户
   * @param {string} email - 邮箱
   * @returns {Object|null} 用户信息
   */
  async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('根据邮箱查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据OAuth提供商和提供商ID查找用户
   * @param {string} provider - OAuth提供商 (microsoft, google等)
   * @param {string} providerId - 提供商用户ID
   * @returns {Object|null} 用户信息
   */
  async findByProvider(provider, providerId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE provider = ? AND provider_id = ?',
        [provider, providerId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('根据OAuth提供商查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找用户
   * @param {number} id - 用户ID
   * @returns {Object|null} 用户信息
   */
  async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, student_id, email, display_name, phone, avatar_url, provider, created_at FROM users WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('根据ID查找用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建新用户
   * @param {Object} userData - 用户数据
   * @returns {Object} 创建的用户信息
   */
  async createUser(userData) {
    try {
      const { email, password } = userData;
      
      // 检查邮箱是否已存在
      const existingEmail = await this.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // 生成学号
      const studentId = await this.generateStudentId();

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 插入新用户
      const [result] = await pool.execute(
        'INSERT INTO users (student_id, email, password) VALUES (?, ?, ?)',
        [studentId, email, hashedPassword]
      );

      // 返回用户信息（不包含密码）
      const newUser = await this.findById(result.insertId);
      return newUser;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 创建或更新OAuth用户
   * @param {Object} oauthData - OAuth用户数据
   * @returns {Object} 用户信息
   */
  async createOrUpdateOAuthUser(oauthData) {
    try {
      const { provider, providerId, email, displayName, avatarUrl } = oauthData;
      
      // 确保所有参数都不是undefined，将undefined转换为null
      const safeProvider = provider || null;
      const safeProviderId = providerId || null;
      const safeEmail = email || null;
      const safeDisplayName = displayName || null;
      const safeAvatarUrl = avatarUrl || null;
      
      // 首先尝试根据provider和providerId查找用户
      let user = await this.findByProvider(safeProvider, safeProviderId);
      
      if (user) {
        // 用户存在，更新信息
        await pool.execute(
          'UPDATE users SET email = ?, display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [safeEmail, safeDisplayName, safeAvatarUrl, user.id]
        );
        
        // 重新获取用户信息
        user = await this.findById(user.id);
      } else {
        // 检查邮箱是否已被其他用户使用
        const existingEmailUser = await this.findByEmail(safeEmail);
        if (existingEmailUser) {
          // 如果邮箱已存在但provider不同，更新现有用户
          await pool.execute(
            'UPDATE users SET provider = ?, provider_id = ?, display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
            [safeProvider, safeProviderId, safeDisplayName, safeAvatarUrl, safeEmail]
          );
          user = await this.findByEmail(safeEmail);
        } else {
          // 生成学号
          const studentId = await this.generateStudentId();
          
          // 创建新用户
          const [result] = await pool.execute(
            'INSERT INTO users (student_id, provider, provider_id, email, display_name, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
            [studentId, safeProvider, safeProviderId, safeEmail, safeDisplayName, safeAvatarUrl]
          );
          
          user = await this.findById(result.insertId);
        }
      }
      
      return user;
    } catch (error) {
      console.error('创建或更新OAuth用户失败:', error);
      throw error;
    }
  }

  /**
   * OAuth用户登录
   * @param {Object} oauthData - OAuth用户数据
   * @returns {Object} 登录结果
   */
  async oauthLogin(oauthData) {
    try {
      // 创建或更新OAuth用户
      const user = await this.createOrUpdateOAuthUser(oauthData);
      
      if (!user) {
        throw new Error('OAuth user creation failed');
      }

      // 生成JWT Token
      const tokenPayload = {
        id: user.id,
        student_id: user.student_id,
        email: user.email,
        provider: user.provider
      };
      const token = generateToken(tokenPayload);

      // 将token存储到Redis
      await setWithExpiry(`user:${user.id}:token`, token, 24 * 60 * 60); // 24小时

      // 返回用户信息和token（不包含密码）
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
      console.error('OAuth用户登录失败:', error);
      throw error;
    }
  }

  /**
   * 验证用户密码
   * @param {string} password - 明文密码
   * @param {string} hashedPassword - 加密后的密码
   * @returns {boolean} 密码是否正确
   */
  async validatePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('密码验证失败:', error);
      throw error;
    }
  }

  /**
   * 用户登录
   * @param {string} identifier - 邮箱或学号
   * @param {string} password - 密码
   * @returns {Object} 登录结果
   */
  async login(identifier, password) {
    try {
      // 查找用户
      const user = await this.findByEmailOrStudentId(identifier);
      if (!user) {
        throw new Error('User not found');
      }

      // 检查是否为本地用户（有密码）
      if (!user.password) {
        throw new Error('This user uses third-party login, please use the corresponding login method');
      }

      // 验证密码
      const isValidPassword = await this.validatePassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Incorrect password');
      }

      // 生成JWT Token
      const tokenPayload = {
        id: user.id,
        student_id: user.student_id,
        email: user.email
      };
      const token = generateToken(tokenPayload);

      // 将token存储到Redis（可选，用于token管理）
      await setWithExpiry(`user:${user.id}:token`, token, 24 * 60 * 60); // 24小时

      // 返回用户信息和token（不包含密码）
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
      console.error('用户登录失败:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   * @param {string} token - JWT Token
   * @param {number} userId - 用户ID
   * @returns {boolean} 登出是否成功
   */
  async logout(token, userId) {
    try {
      // 将token加入黑名单
      await setWithExpiry(`blacklist:${token}`, true, 24 * 60 * 60); // 24小时

      // 删除Redis中的用户token
      await del(`user:${userId}:token`);

      return true;
    } catch (error) {
      console.error('用户登出失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户信息（从缓存或数据库）
   * @param {number} userId - 用户ID
   * @returns {Object|null} 用户信息
   */
  async getUserInfo(userId) {
    try {
      // 先尝试从Redis缓存获取
      const cachedUser = await get(`user:${userId}:info`);
      if (cachedUser) {
        return cachedUser;
      }

      // 从数据库获取
      const user = await this.findById(userId);
      if (user) {
        // 缓存用户信息（1小时）
        await setWithExpiry(`user:${userId}:info`, user, 60 * 60);
      }

      return user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户个人信息
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Object} 更新后的用户信息
   */
  async updateUserProfile(userId, updateData) {
    try {
      const { displayName, email, phone } = updateData;
      
      // 验证邮箱格式
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Invalid email format');
        }
        
        // 检查邮箱是否已被其他用户使用
        const [existingEmail] = await pool.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );
        
        if (existingEmail.length > 0) {
          throw new Error('Email is already used by another user');
        }
      }

      // 验证手机号格式
      if (phone) {
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
          throw new Error('Invalid phone number format');
        }
        
        // 检查手机号是否已被其他用户使用
        const [existingPhone] = await pool.execute(
          'SELECT id FROM users WHERE phone = ? AND id != ?',
          [phone, userId]
        );
        
        if (existingPhone.length > 0) {
          throw new Error('Phone number is already used by another user');
        }
      }

      // 构建更新SQL
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
      
      // 执行更新
      await pool.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      // 清除缓存
      await del(`user:${userId}:info`);
      
      // 返回更新后的用户信息
      const updatedUser = await this.findById(userId);
      return updatedUser;
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 清除用户的所有token
   * @param {number} userId - 用户ID
   * @param {string} currentToken - 当前使用的token（可选）
   * @returns {boolean} 清除是否成功
   */
  async clearUserTokens(userId, currentToken = null) {
    try {
      // 清除用户token缓存
      await del(`user:${userId}:token`);
      
      // 如果提供了当前token，将其加入黑名单
      if (currentToken) {
        await setWithExpiry(`blacklist:${currentToken}`, 'revoked', 24 * 60 * 60); // 24小时
      }
      
      // 清除用户信息缓存
      await del(`user:${userId}:info`);
      
      return true;
    } catch (error) {
      console.error('清除用户token失败:', error);
      return false;
    }
  }

  /**
   * 修改用户密码
   * @param {number} userId - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @param {string} currentToken - 当前使用的token（可选）
   * @returns {boolean} 修改是否成功
   */
  async changePassword(userId, oldPassword, newPassword, currentToken = null) {
    try {
      // 验证新密码长度
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      
      // 获取用户当前密码
      const [rows] = await pool.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );
      
      if (rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = rows[0];
      
      // 检查用户是否有密码（OAuth用户可能没有密码）
      if (!user.password) {
        throw new Error('This user uses third-party login and cannot change password');
      }
      
      // 验证旧密码
      const isValidOldPassword = await this.validatePassword(oldPassword, user.password);
      if (!isValidOldPassword) {
        throw new Error('Incorrect old password');
      }
      
      // 加密新密码
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      await pool.execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId]
      );
      
      // 清除用户的所有token（包括当前token）
      await this.clearUserTokens(userId, currentToken);
      
      return true;
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
