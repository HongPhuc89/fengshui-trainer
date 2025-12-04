import { Body, Controller, Get, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UserProperties } from '../../shares/constants/constant';
import { User } from '../../shares/decorators/user.decorator';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../../shares/guards/local-auth.guard';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dtos/login-request.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { RegisterRequestDto } from './dtos/register-request.dto';
import { RegisterResponseDto } from './dtos/register-response.dto';
import { RefreshTokenRequestDto } from './dtos/refresh-token-request.dto';
import { RefreshTokenResponseDto } from './dtos/refresh-token-response.dto';
import { UserResponseDto } from './dtos/user-response.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    operationId: 'user-register',
    description: 'User register an account with email and password',
    summary: 'User register',
  })
  @ApiBody({
    type: RegisterRequestDto,
  })
  @ApiResponse({
    type: RegisterResponseDto,
    status: HttpStatus.CREATED,
    description: 'Successful',
  })
  async register(@Body() registerRequest: RegisterRequestDto): Promise<RegisterResponseDto> {
    const res = await this.authService.register(registerRequest);
    return plainToInstance(RegisterResponseDto, res);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    operationId: 'user-login',
    description: 'User login with email and password',
    summary: 'User login',
  })
  @ApiBody({
    type: LoginRequestDto,
  })
  @ApiResponse({
    type: LoginResponseDto,
    status: HttpStatus.OK,
    description: 'Successful',
  })
  async login(@Request() request): Promise<LoginResponseDto> {
    const { user } = request;
    const res = await this.authService.login(user);
    return plainToInstance(LoginResponseDto, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    type: UserResponseDto,
    status: HttpStatus.OK,
    description: 'Successful',
  })
  @ApiBearerAuth()
  me(@User(UserProperties.USER_ID) userId: number): Promise<UserResponseDto> {
    return this.authService.me(userId);
  }

  @Post('refresh-token')
  @ApiResponse({
    type: RefreshTokenResponseDto,
    status: HttpStatus.OK,
    description: 'Successful',
  })
  async refreshToken(@Body() refreshTokenInput: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(refreshTokenInput);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'user-logout',
    summary: 'Logout user',
    description: 'Logout user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful',
  })
  @UseGuards(JwtAuthGuard)
  async logout(@User(UserProperties.USER_ID) userId: number) {
    await this.authService.logout(userId);
    return { message: 'Logout successful' };
  }
}
