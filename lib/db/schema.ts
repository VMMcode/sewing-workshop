import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fabricReceived: integer("fabric_received").notNull().default(0),
  fabricSewn: integer("fabric_sewn").notNull().default(0),
  pricePerPiece: numeric("price_per_piece", { precision: 10, scale: 2 }),
  receivedAt: date("received_at"),
  deadline: date("deadline"),
  supplier: text("supplier"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  archived: integer("archived").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderOperations = pgTable("order_operations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }).notNull(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hiredAt: date("hired_at"),
  terminatedAt: date("terminated_at"),
  skills: text("skills").array(),
  archived: integer("archived").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyWork = pgTable("daily_work", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  seamstressName: text("seamstress_name").notNull(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  operationId: integer("operation_id").notNull().references(() => orderOperations.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

import { relations } from "drizzle-orm";

export const ordersRelations = relations(orders, ({ many }) => ({
  orderOperations: many(orderOperations),
  dailyWork: many(dailyWork),
}));

export const orderOperationsRelations = relations(orderOperations, ({ one }) => ({
  order: one(orders, {
    fields: [orderOperations.orderId],
    references: [orders.id],
  }),
}));

export const dailyWorkRelations = relations(dailyWork, ({ one }) => ({
  order: one(orders, {
    fields: [dailyWork.orderId],
    references: [orders.id],
  }),
  operation: one(orderOperations, {
    fields: [dailyWork.operationId],
    references: [orderOperations.id],
  }),
  employee: one(employees, {
    fields: [dailyWork.employeeId],
    references: [employees.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  dailyWork: many(dailyWork),
}));