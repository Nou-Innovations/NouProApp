-- Add indexes on free-text lookup columns (P3 cleanup).
-- These columns hold IDs that are filtered/joined in queries but had no index,
-- causing sequential scans. No foreign keys are added (some columns can hold
-- guest/external IDs that may not have a matching row). Non-destructive.

-- CreateIndex
CREATE INDEX "Transport_assignedStaffId_idx" ON "Transport"("assignedStaffId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_createdBy_idx" ON "Order"("createdBy");

-- CreateIndex
CREATE INDEX "Delivery_assignedStaffId_idx" ON "Delivery"("assignedStaffId");

-- CreateIndex
CREATE INDEX "Delivery_clientId_idx" ON "Delivery"("clientId");

-- CreateIndex
CREATE INDEX "Task_linkedOrderId_idx" ON "Task"("linkedOrderId");

-- CreateIndex
CREATE INDEX "Task_linkedDeliveryId_idx" ON "Task"("linkedDeliveryId");

-- CreateIndex
CREATE INDEX "Task_linkedInvoiceId_idx" ON "Task"("linkedInvoiceId");
