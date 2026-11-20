import type { ApprovalStatus, CategoryName, ServiceMode } from "../constants/services.js";

/** A document in the "services" collection (_id is added by MongoDB). */
export interface ServiceDocument {
  title: string;
  category: CategoryName;
  description: string;
  image: string;
  basePrice: number;
  estimatedDuration: string;
  serviceMode: ServiceMode;
  serviceArea: string;
  technicianName: string;
  technicianEmail: string;
  approvalStatus: ApprovalStatus;
  isAvailable: boolean;
  createdAt: Date;
}
