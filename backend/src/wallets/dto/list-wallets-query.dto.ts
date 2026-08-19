import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ListWalletsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
