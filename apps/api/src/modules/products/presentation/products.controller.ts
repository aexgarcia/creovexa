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
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
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
import { CreateProductRequest, UpdateProductRequest } from './product.requests.js';
import { ProductEnvelope, ProductPageResponse, productResponse } from './product.responses.js';

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
  ) {}
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
