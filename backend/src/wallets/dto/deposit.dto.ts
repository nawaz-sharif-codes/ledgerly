import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: '1000.00', type: String })
  @IsString()
  @Matches(/^\d+(?:\.\d{1,4})?$/, {
    message: 'amount must be a positive decimal string with up to four places',
  })
  amount!: string;
}
