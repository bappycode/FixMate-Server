import { Router } from "express";
import { ACTIVE_BOOKING_STATUSES, BOOKING_STATUSES } from "../constants/bookings.js";
import { bookingsCollection, servicesCollection } from "../lib/collections.js";
import { getAuthUser, verifyCustomer, verifyTechnician, verifyToken } from "../middlewares/auth.js";
import type { BookingDocument } from "../types/booking.js";
import { assertTransition } from "../utils/booking-status.js";
import { HttpError } from "../utils/httpError.js";
import { parseObjectId } from "../utils/object-id.js";
import { parseBookingRequest, parseStatusChange } from "../validators/booking.js";

export const bookingsRouter = Router();

const NOT_FOUND = "Booking not found";

bookingsRouter.post("/", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);
  const input = parseBookingRequest(req.body);

  const service = await servicesCollection.findOne({
    _id: parseObjectId(input.serviceId, "Service not found"),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) throw new HttpError(404, "Service not found");

  if (service.technicianEmail === customer.email) {
    throw new HttpError(403, "You cannot request your own service");
  }

  const alreadyActive = await bookingsCollection.findOne({
    customerEmail: customer.email,
    serviceId: input.serviceId,
    status: { $in: [...ACTIVE_BOOKING_STATUSES] },
  });
  if (alreadyActive) throw new HttpError(409, "You already have an active request for this service");

  const now = new Date();
  const booking: BookingDocument = {
    serviceId: input.serviceId,
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: input.customerPhone,
    address: input.address,
    preferredDate: input.preferredDate,
    problemDescription: input.problemDescription,
    status: "requested",
    finalAmount: service.basePrice,
    paymentStatus: "unpaid",
    statusHistory: [{ status: "requested", changedAt: now }],
    createdAt: now,
    updatedAt: now,
  };

  const { insertedId } = await bookingsCollection.insertOne(booking);
  res.status(201).json({ booking: { _id: insertedId, ...booking } });
});

bookingsRouter.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);

  const bookings = await bookingsCollection
    .find({ customerEmail: customer.email })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  res.json({ bookings });
});

bookingsRouter.patch("/:id/cancel", verifyToken, verifyCustomer, async (req, res) => {
  const customer = getAuthUser(req);
  const id = parseObjectId(req.params.id, NOT_FOUND);

  const booking = await bookingsCollection.findOne({ _id: id, customerEmail: customer.email });
  if (!booking) throw new HttpError(404, NOT_FOUND);
  assertTransition(booking.status, "cancelled", "customer");

  const now = new Date();
  const updated = await bookingsCollection.findOneAndUpdate(
    { _id: id, customerEmail: customer.email, status: booking.status },
    {
      $set: { status: "cancelled", updatedAt: now },
      $push: { statusHistory: { status: "cancelled", changedAt: now } },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new HttpError(409, "This request was just updated. Refresh and try again.");

  res.json({ booking: updated });
});

bookingsRouter.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);
  const status = BOOKING_STATUSES.find((option) => option === req.query.status);

  const bookings = await bookingsCollection
    .find({ technicianEmail: technician.email, ...(status ? { status } : {}) })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  res.json({ bookings });
});

bookingsRouter.patch("/:id/status", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);
  const id = parseObjectId(req.params.id, NOT_FOUND);
  const { status: next, finalAmount } = parseStatusChange(req.body);

  const booking = await bookingsCollection.findOne({ _id: id, technicianEmail: technician.email });
  if (!booking) throw new HttpError(404, NOT_FOUND);
  assertTransition(booking.status, next, "technician");

  const completing = next === "completed";
  if (completing && finalAmount === undefined) {
    throw new HttpError(400, "A final amount is required to complete a job");
  }

  const now = new Date();
  const updated = await bookingsCollection.findOneAndUpdate(
    { _id: id, technicianEmail: technician.email, status: booking.status },
    {
      $set: { status: next, updatedAt: now, ...(completing ? { finalAmount } : {}) },
      $push: { statusHistory: { status: next, changedAt: now } },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new HttpError(409, "This job was just updated. Refresh and try again.");

  res.json({ booking: updated });
});
