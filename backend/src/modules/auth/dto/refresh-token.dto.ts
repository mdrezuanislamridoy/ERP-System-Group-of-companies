import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Rotating refresh token string' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
