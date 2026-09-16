import {
  Inject,
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard, AuthRequest } from '../security';
import { InvoiceDto, InvoiceStatusDto, ListDto, MovementDto, ReportDto } from '../dto';
import { BillingService } from './billing.service';
@ApiTags('Inventory / Invoices / Reports')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller()
export class BillingController {
  constructor(@Inject(BillingService) private readonly service: BillingService) {}
  @Get('inventory')
  @ApiOperation({ summary: 'Historial paginado de movimientos' })
  movements(@Req() r: AuthRequest, @Query() q: ListDto) {
    return this.service.movements(r.actor, q);
  }
  @Post('inventory')
  @ApiOperation({ summary: 'Entrada, salida o ajuste con saldo objetivo (ADMIN)' })
  move(@Req() r: AuthRequest, @Body() dto: MovementDto) {
    return this.service.move(r.actor, dto);
  }
  @Get('invoices')
  @ApiOperation({ summary: 'Facturas simuladas con filtros; importe del documento completo' })
  invoices(@Req() r: AuthRequest, @Query() q: ReportDto) {
    return this.service.invoices(r.actor, q);
  }
  @Post('invoices')
  @ApiOperation({
    summary: 'Crear borrador con precios actuales calculados en servidor (ADMIN, SELLER)',
  })
  create(@Req() r: AuthRequest, @Body() dto: InvoiceDto) {
    return this.service.createInvoice(r.actor, dto);
  }
  @Get('invoices/:id')
  @ApiOperation({ summary: 'Detalle de factura de la empresa actual' })
  invoice(@Req() r: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.invoice(r.actor, id);
  }
  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Pagar o cancelar; modifica stock atómicamente (ADMIN, SELLER)' })
  status(
    @Req() r: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InvoiceStatusDto,
  ) {
    return this.service.changeStatus(r.actor, id, dto);
  }
  @Get('reports')
  @ApiOperation({ summary: 'Reporte filtrado por fechas, cliente, producto y estado' })
  reports(@Req() r: AuthRequest, @Query() q: ReportDto) {
    return this.service.invoices(r.actor, q);
  }
  @Get('reports/export')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Exportar hasta 5000 documentos DEMO filtrados a CSV' })
  async export(@Req() r: AuthRequest, @Query() q: ReportDto, @Res() res: Response) {
    res.setHeader('Content-Disposition', 'attachment; filename="novabill-reporte-demo.csv"');
    res.type('text/csv').send(await this.service.export(r.actor, q));
  }
  @Get('dashboard')
  @ApiOperation({ summary: 'Indicadores reales de los datos demo; ventana móvil de 30 días UTC' })
  dashboard(@Req() r: AuthRequest) {
    return this.service.dashboard(r.actor);
  }
}
@Module({ controllers: [BillingController], providers: [BillingService] })
export class BillingModule {}
