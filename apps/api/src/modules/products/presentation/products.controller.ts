import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { PaginationRequest, paginationResponse } from '#app/presentation/http/pagination.dto';
import { validateRequest } from '#app/presentation/http/request-validation';
import { CreateProduct } from '../application/use-cases/create-product.js';
import { UpdateProduct } from '../application/use-cases/update-product.js';
import { GetProduct } from '../application/use-cases/get-product.js';
import { ListProducts } from '../application/use-cases/list-products.js';
import {
  CreateProductRequest,
  UpdateProductRequest,
  UploadProductImageRequest,
} from './product.requests.js';
import { PhotoType } from '../domain/photo-type.js';
import { ProductEnvelope, ProductPageResponse, productResponse } from './product.responses.js';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Options } from 'multer';
import { SaveProductImage } from '../application/use-cases/save-product-image.js';
import { GetProductImage } from '../application/use-cases/get-product-image.js';
import { MAX_IMAGE_BYTES } from '#app/infrastructure/image-files';
const productImageUploadOptions = {
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 1, parts: 2 },
} satisfies Pick<Options, 'limits'>;

@ApiTags('Productos')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(CreateProduct) private readonly createProduct: CreateProduct,
    @Inject(UpdateProduct) private readonly updateProduct: UpdateProduct,
    @Inject(GetProduct) private readonly getProduct: GetProduct,
    @Inject(ListProducts) private readonly listProducts: ListProducts,
    @Inject(SaveProductImage) private readonly saveImage: SaveProductImage,
    @Inject(GetProductImage) private readonly getImage: GetProductImage,
  ) {}
  @Post(':id/image')
  @ApiOperation({ summary: 'Subir o reemplazar la única imagen del producto/servicio' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'photoType'],
      properties: {
        image: { type: 'string', format: 'binary' },
        photoType: { type: 'string', enum: Object.values(PhotoType) },
      },
    },
  })
  @ApiCreatedResponse({ type: ProductEnvelope })
  @UseInterceptors(FileInterceptor('image', productImageUploadOptions))
  async uploadImage(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(validateRequest(UploadProductImageRequest)) body: UploadProductImageRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ProductEnvelope> {
    if (!file) throw new BadRequestException();
    return {
      data: productResponse(
        await this.saveImage.execute({
          organizationId,
          productId: id,
          bytes: file.buffer,
          photoType: body.photoType,
        }),
      ),
    };
  }

  @Get(':id/images/:assetId')
  @ApiOperation({ summary: 'Leer una imagen del producto dentro de la organización activa' })
  async readImage(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.getImage.execute({ organizationId, productId: id, assetId });
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Content-Length', image.bytes.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(image.bytes);
  }
  @Post()
  @ApiOperation({ summary: 'Crear producto o servicio' })
  @ApiBody({ type: CreateProductRequest })
  @ApiCreatedResponse({ type: ProductEnvelope })
  async create(
    @OrganizationId() organizationId: string,
    @Body(validateRequest(CreateProductRequest)) body: CreateProductRequest,
  ): Promise<ProductEnvelope> {
    return { data: productResponse(await this.createProduct.execute({ ...body, organizationId })) };
  }
  @Get()
  @ApiOperation({ summary: 'Listar productos de la organización' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, maximum: 10000 })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: ProductPageResponse })
  async list(
    @OrganizationId() organizationId: string,
    @Query(validateRequest(PaginationRequest)) query: PaginationRequest,
  ): Promise<ProductPageResponse> {
    const result = await this.listProducts.execute({ organizationId, ...query });
    return { data: result.items.map(productResponse), meta: paginationResponse(result) };
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar producto' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: ProductEnvelope })
  async get(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProductEnvelope> {
    return {
      data: productResponse(await this.getProduct.execute({ organizationId, productId: id })),
    };
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos comerciales del producto' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateProductRequest })
  @ApiOkResponse({ type: ProductEnvelope })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(validateRequest(UpdateProductRequest)) body: UpdateProductRequest,
  ): Promise<ProductEnvelope> {
    if (Object.values(body).every((value) => value === undefined)) throw new BadRequestException();
    return {
      data: productResponse(
        await this.updateProduct.execute({ ...body, organizationId, productId: id }),
      ),
    };
  }
}
