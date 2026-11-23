import type { ApprovalStatus, CategoryName, ServiceMode } from "../constants/services.js";

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
