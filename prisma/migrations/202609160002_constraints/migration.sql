ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_range" CHECK ("stock" BETWEEN 0 AND 1000000);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_range" CHECK ("priceCents" BETWEEN 0 AND 100000000);
ALTER TABLE "Product" ADD CONSTRAINT "Product_min_stock_range" CHECK ("minStock" BETWEEN 0 AND 1000000);
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_tax_range" CHECK ("taxRate" BETWEEN 0 AND 30);
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_number_positive" CHECK ("nextInvoice" > 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_totals_consistent" CHECK ("subtotalCents" >= 0 AND "taxCents" >= 0 AND "totalCents" = "subtotalCents" + "taxCents");
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_amounts_consistent" CHECK ("quantity" BETWEEN 1 AND 10000 AND "unitPriceCents" >= 0 AND "lineTotalCents" = "quantity"::bigint * "unitPriceCents");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "Inventory_balance_range" CHECK ("balance" BETWEEN 0 AND 1000000);
