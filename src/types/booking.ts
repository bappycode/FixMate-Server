import type { BookingStatus, PaymentStatus } from "../constants/bookings.js";
import type { CategoryName } from "../constants/services.js";

export interface BookingHistoryEntry {
  status: BookingStatus | "paid";
  changedAt: Date;
}

export interface BookingDocument {
  serviceId: string;
  serviceTitle: string;
  serviceImage: string;
  category: CategoryName;
  basePrice: number;
  technicianName: string;
  technicianEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  preferredDate: Date;
  problemDescription: string;
  status: BookingStatus;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  statusHistory?: BookingHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}
