import { IsNotEmpty, IsString } from 'class-validator';

export class HubriseCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
