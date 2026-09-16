import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  Matches,
  IsDateString,
} from 'class-validator';
export class LoginDto {
  @ApiProperty({ example: 'admin@novabill.demo' }) @IsEmail() @MaxLength(160) email!: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(128) password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) organizationName!: string;
}
export class RecoveryDto {
  @ApiProperty() @IsEmail() @MaxLength(160) email!: string;
}
export class CustomerDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty() @IsEmail() @MaxLength(160) email!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) address?: string;
}
export class CustomerUpdateDto extends PartialType(CustomerDto) {}
export class CategoryDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) name!: string;
}
export class ProductDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{2,40}$/) sku!: string;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiProperty({ description: 'Precio en centavos COP', maximum: 100000000 })
  @IsInt()
  @Min(0)
  @Max(100000000)
  priceCents!: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(1000000) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
export class ProductUpdateDto extends PartialType(ProductDto) {}
export class MovementDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty({ enum: ['IN', 'OUT', 'ADJUSTMENT'] }) @IsIn(['IN', 'OUT', 'ADJUSTMENT']) type!:
    'IN' | 'OUT' | 'ADJUSTMENT';
  @ApiProperty({ description: 'IN/OUT: cantidad positiva; ADJUSTMENT: saldo objetivo' })
  @IsInt()
  @Min(0)
  @Max(1000000)
  quantity!: number;
  @ApiProperty() @IsString() @MinLength(5) @MaxLength(200) reason!: string;
}
export class InvoiceLineDto {
  @ApiProperty() @IsUUID() productId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(10000) quantity!: number;
}
export class InvoiceDto {
  @ApiProperty() @IsUUID() customerId!: string;
  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  items!: InvoiceLineDto[];
}
export class InvoiceStatusDto {
  @ApiProperty({ enum: ['PAID', 'CANCELLED'] }) @IsIn(['PAID', 'CANCELLED']) status!:
    'PAID' | 'CANCELLED';
}
export class UserDto extends LoginDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiProperty({ enum: ['ADMIN', 'SELLER', 'VIEWER'] }) @IsIn(['ADMIN', 'SELLER', 'VIEWER']) role!:
    'ADMIN' | 'SELLER' | 'VIEWER';
}
export class UserUpdateDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional({ enum: ['ADMIN', 'SELLER', 'VIEWER'] })
  @IsOptional()
  @IsIn(['ADMIN', 'SELLER', 'VIEWER'])
  role?: 'ADMIN' | 'SELLER' | 'VIEWER';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
export class OrganizationDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty({ description: 'Porcentaje simulado (0-30)' })
  @IsInt()
  @Min(0)
  @Max(30)
  taxRate!: number;
}
export class ListDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
export class ReportDto extends ListDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'PAID', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'PAID', 'CANCELLED'])
  status?: 'DRAFT' | 'PAID' | 'CANCELLED';
}
