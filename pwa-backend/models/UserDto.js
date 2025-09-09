const { Transform, Type } = require('class-transformer');
const { IsEmail, IsString, IsOptional, MinLength, IsNumber } = require('class-validator');

/**
 * 用户数据传输对象 (DTO)
 * 用于API请求和响应的字段转换
 */
class UserDto {
  @IsNumber()
  @Type(() => Number)
  id;

  @IsString()
  @Transform(({ value }) => value || null)
  studentId;

  @IsEmail()
  @IsString()
  email;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || null)
  displayName;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || null)
  phone;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || null)
  avatarUrl;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || 'local')
  provider;

  @IsOptional()
  @Type(() => Date)
  createdAt;

  @IsOptional()
  @Type(() => Date)
  updatedAt;
}

/**
 * 用户注册请求DTO
 */
class UserRegisterDto {
  @IsEmail()
  @IsString()
  email;

  @IsString()
  @MinLength(6)
  password;
}

/**
 * 用户登录请求DTO
 */
class UserLoginDto {
  @IsString()
  identifier;

  @IsString()
  password;
}

/**
 * 用户信息更新请求DTO
 */
class UserUpdateDto {
  @IsOptional()
  @IsString()
  displayName;

  @IsOptional()
  @IsEmail()
  email;

  @IsOptional()
  @IsString()
  phone;
}

/**
 * 密码修改请求DTO
 */
class PasswordChangeDto {
  @IsString()
  oldPassword;

  @IsString()
  @MinLength(6)
  newPassword;
}

/**
 * 登录响应DTO
 */
class LoginResponseDto {
  @Type(() => UserDto)
  user;

  @IsString()
  token;

  @IsString()
  expiresIn;
}

module.exports = {
  UserDto,
  UserRegisterDto,
  UserLoginDto,
  UserUpdateDto,
  PasswordChangeDto,
  LoginResponseDto
};
