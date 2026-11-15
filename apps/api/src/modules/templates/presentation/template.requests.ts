import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsString, MaxLength, ValidateNested, ValidateIf } from 'class-validator';
import { TemplateDesignRequest } from './template-design.request.js';

export class UseBaseTemplateRequest {
  @ApiProperty({
    type: String,
    maxLength: 200,
    required: false,
    description: 'Nombre de la copia; sin él se usa el de la plantilla base.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  name?: string;
}

// Las dimensiones ya no se envían: salen del formato del diseño.
export class CreateTemplateRequest {
  @ApiProperty({ type: TemplateDesignRequest, required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateDesignRequest)
  design?: TemplateDesignRequest;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) name!: string;
}
