import { Router } from "express";
import { BOOKING_STATUSES } from "../constants/bookings.js";
import { APPROVAL_STATUSES } from "../constants/services.js";
import { USER_ROLES } from "../constants/users.js";
import { bookingsCollection, paymentsCollection, servicesCollection, usersCollection } from "../lib/collections.js";
import { getAuthUser, verifyAdmin, verifyToken } from "../middlewares/auth.js";
import { HttpError } from "../utils/httpError.js";
import { parseObjectId } from "../utils/object-id.js";
import { parseApprovalDecision, parseRole } from "../validators/admin.js";

export const adminRouter = Router();

adminRouter.use(verifyToken, verifyAdmin);

const USER_PROJECTION = { name: 1, email: 1, image: 1, role: 1, createdAt: 1 } as const;

const REVENUE_MONTHS = 6;

function lastMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return month.toISOString().slice(0, 7);
  });
}

adminRouter.get("/stats", async (_req, res) => {
  const months = lastMonths(REVENUE_MONTHS);
  const since = new Date(`${months[0]}-01T00:00:00.000Z`);

  const [totalUsers, totalTechnicians, pendingServices, bookingGroups, roleGroups, revenueGroups] = await Promise.all([
    usersCollection.countDocuments(),
    usersCollection.countDocuments({ role: "technician" }),
    servicesCollection.countDocuments({ approvalStatus: "pending" }),
    bookingsCollection.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
    usersCollection.aggregate<{ _id: string | null; count: number }>([{ $group: { _id: "$role", count: { $sum: 1 } } }]).toArray(),
    paymentsCollection
      .aggregate<{ _id: string; total: number }>([
        { $match: { paidAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, total: { $sum: "$amount" } } },
      ])
      .toArray(),
  ]);

  const bookingsByStatus = BOOKING_STATUSES.map((status) => ({
    status,
    count: bookingGroups.find((group) => group._id === status)?.count ?? 0,
  }));

  const usersByRole = USER_ROLES.map((role) => ({
    role,
    count: roleGroups
      .filter((group) => (group._id ?? "customer") === role)
      .reduce((sum, group) => sum + group.count, 0),
  }));

  const revenueByMonth = months.map((month) => ({
    month,
    total: Math.round((revenueGroups.find((group) => group._id === month)?.total ?? 0) * 100) / 100,
  }));

  res.json({ totalUsers, totalTechnicians, pendingServices, bookingsByStatus, usersByRole, revenueByMonth });
});

adminRouter.get("/users", async (_req, res) => {
  const users = await usersCollection.find({}, { projection: USER_PROJECTION }).sort({ createdAt: -1, _id: -1 }).toArray();

  res.json({ users: users.map((user) => ({ ...user, role: user.role ?? "customer" })) });
});

adminRouter.patch("/users/:id/role", async (req, res) => {
  const admin = getAuthUser(req);
  const userId = parseObjectId(req.params.id, "User not found");
  const role = parseRole(req.body);

  if (userId.toString() === admin.id) {
    throw new HttpError(400, "You cannot change your own role");
  }

  const user = await usersCollection.findOneAndUpdate(
    { _id: userId },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: "after", projection: USER_PROJECTION },
  );
  if (!user) throw new HttpError(404, "User not found");

  res.json({ user: { ...user, role: user.role ?? "customer" } });
});

adminRouter.get("/services", async (req, res) => {
  const status = APPROVAL_STATUSES.find((option) => option === req.query.status);

  const services = await servicesCollection
    .find(status ? { approvalStatus: status } : {})
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  res.json({ services });
});

adminRouter.patch("/services/:id/approval", async (req, res) => {
  const serviceId = parseObjectId(req.params.id, "Service not found");
  const approvalStatus = parseApprovalDecision(req.body);

  const service = await servicesCollection.findOneAndUpdate(
    { _id: serviceId },
    { $set: { approvalStatus } },
    { returnDocument: "after" },
  );
  if (!service) throw new HttpError(404, "Service not found");

  res.json({ service });
});

adminRouter.get("/bookings", async (req, res) => {
  const status = BOOKING_STATUSES.find((option) => option === req.query.status);

  const bookings = await bookingsCollection
    .find(status ? { status } : {})
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  res.json({ bookings });
});

adminRouter.get("/payments", async (_req, res) => {
  const [payments, revenue] = await Promise.all([
    paymentsCollection.find().sort({ paidAt: -1, _id: -1 }).toArray(),
    paymentsCollection.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$amount" } } }]).toArray(),
  ]);

  res.json({ payments, totalRevenue: Math.round((revenue[0]?.total ?? 0) * 100) / 100 });
});
