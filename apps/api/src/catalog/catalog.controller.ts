import {
  Inject,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthRequest } from '../security';
import {
  CategoryDto,
  CustomerDto,
  CustomerUpdateDto,
  ListDto,
  OrganizationDto,
  ProductDto,
  ProductUpdateDto,
  UserDto,
  UserUpdateDto,
} from '../dto';
import { CatalogService } from './catalog.service';
@ApiTags('Catalog / Organization / Users')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller()
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly service: CatalogService) {}
  @Get('customers')
  @ApiOperation({ summary: 'Clientes de la empresa; búsqueda y paginación' })
  customers(@Req() r: AuthRequest, @Query() q: ListDto) {
    return this.service.customers(r.actor, q);
  }
  @Post('customers')
  @ApiOperation({ summary: 'Crear cliente ficticio (ADMIN, SELLER)' })
  createCustomer(@Req() r: AuthRequest, @Body() d: CustomerDto) {
    return this.service.saveCustomer(r.actor, d);
  }
  @Patch('customers/:id')
  @ApiOperation({ summary: 'Editar cliente (ADMIN, SELLER)' })
  updateCustomer(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: CustomerUpdateDto,
  ) {
    return this.service.saveCustomer(r.actor, d, id);
  }
  @Delete('customers/:id')
  @ApiOperation({ summary: 'Archivar cliente conservando historial (ADMIN)' })
  archiveCustomer(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.archiveCustomer(r.actor, id);
  }
  @Get('categories')
  @ApiOperation({ summary: 'Categorías de la empresa' })
  categories(@Req() r: AuthRequest) {
    return this.service.categories(r.actor);
  }
  @Post('categories')
  @ApiOperation({ summary: 'Crear categoría (ADMIN)' })
  createCategory(@Req() r: AuthRequest, @Body() d: CategoryDto) {
    return this.service.saveCategory(r.actor, d);
  }
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Renombrar categoría (ADMIN)' })
  updateCategory(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: CategoryDto,
  ) {
    return this.service.saveCategory(r.actor, d, id);
  }
  @Get('products')
  @ApiOperation({ summary: 'Productos con categoría y stock; búsqueda y paginación' })
  products(@Req() r: AuthRequest, @Query() q: ListDto) {
    return this.service.products(r.actor, q);
  }
  @Post('products')
  @ApiOperation({ summary: 'Crear producto con stock inicial cero (ADMIN)' })
  createProduct(@Req() r: AuthRequest, @Body() d: ProductDto) {
    return this.service.saveProduct(r.actor, d);
  }
  @Patch('products/:id')
  @ApiOperation({ summary: 'Editar producto sin alterar stock directamente (ADMIN)' })
  updateProduct(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ProductUpdateDto,
  ) {
    return this.service.saveProduct(r.actor, d, id);
  }
  @Delete('products/:id')
  @ApiOperation({ summary: 'Archivar producto con stock cero (ADMIN)' })
  archiveProduct(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.archiveProduct(r.actor, id);
  }
  @Get('organization')
  @ApiOperation({ summary: 'Información de la empresa autenticada' })
  organization(@Req() r: AuthRequest) {
    return this.service.organization(r.actor);
  }
  @Patch('organization')
  @ApiOperation({ summary: 'Configurar nombre e impuesto simulado (ADMIN)' })
  updateOrganization(@Req() r: AuthRequest, @Body() d: OrganizationDto) {
    return this.service.updateOrganization(r.actor, d);
  }
  @Get('users')
  @ApiOperation({ summary: 'Usuarios de la empresa sin hashes ni tokens (ADMIN)' })
  users(@Req() r: AuthRequest, @Query() q: ListDto) {
    return this.service.users(r.actor, q);
  }
  @Post('users')
  @ApiOperation({ summary: 'Crear usuario (ADMIN)' })
  createUser(@Req() r: AuthRequest, @Body() d: UserDto) {
    return this.service.createUser(r.actor, d);
  }
  @Patch('users/:id')
  @ApiOperation({ summary: 'Editar nombre, rol o activación; revoca sesiones (ADMIN)' })
  updateUser(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UserUpdateDto,
  ) {
    return this.service.updateUser(r.actor, id, d);
  }
  @Get('audit')
  @ApiOperation({ summary: 'Historial inmutable de acciones de la empresa (ADMIN)' })
  audit(@Req() r: AuthRequest, @Query() q: ListDto) {
    return this.service.audits(r.actor, q);
  }
}
@Module({ controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}
