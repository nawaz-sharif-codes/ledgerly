import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromWalletId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toWalletId!: string;

  @ApiProperty({ example: '250.00', type: String })
  @IsString()
  @Matches(/^\d+(?:\.\d{1,4})?$/, {
    message: 'amount must be a positive decimal string with up to four places',
  })
  amount!: string;
}
