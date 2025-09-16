const { Transform, Type } = require('class-transformer');
const { IsEmail, IsString, IsOptional, MinLength, IsNumber } = require('class-validator');

/**
 * User Data Transfer Objects (DTOs)
 * Used for API request/response field validation and transformation
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
 * User registration request DTO
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
 * User login request DTO
 */
class UserLoginDto {
  @IsString()
  identifier;

  @IsString()
  password;
}

/**
 * User profile update request DTO
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
 * Password change request DTO
 */
class PasswordChangeDto {
  @IsString()
  oldPassword;

  @IsString()
  @MinLength(6)
  newPassword;
}

/**
 * Login response DTO
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
