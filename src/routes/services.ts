import { Router } from "express";
import { servicesCollection, usersCollection } from "../lib/collections.js";
import { getAuthUser, verifyTechnician, verifyToken } from "../middlewares/auth.js";
import type { ServiceDocument } from "../types/service.js";
import { HttpError } from "../utils/httpError.js";
import { parseObjectId } from "../utils/object-id.js";
import { buildPublicFilter, SORT_ORDERS } from "../utils/service-filter.js";
import { parseAvailability } from "../validators/admin.js";
import { parseServiceInput } from "../validators/service.js";
import { parseServiceQuery } from "../validators/service-query.js";

export const servicesRouter = Router();

// Public responses never include the technician's email address.
const PUBLIC_PROJECTION = { technicianEmail: 0 } as const;

const NOT_FOUND = "Service not found";

// ============================================================================
// PUBLIC
// ============================================================================

// GET /api/services?search=&category=&mode=&sort=&page=&limit=
// Public. Searching, filtering, sorting and paging all happen in MongoDB, not in the browser.
// `total` is how many services match the filters in all, so the client can show page buttons.
servicesRouter.get("/", async (req, res) => {
  const query = parseServiceQuery(req.query);
  const filter = buildPublicFilter(query);

  const [services, total] = await Promise.all([
    servicesCollection
      .find(filter, { projection: PUBLIC_PROJECTION })
      .sort(SORT_ORDERS[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .toArray(),
    servicesCollection.countDocuments(filter),
  ]);

  res.json({ services, total, page: query.page, pageSize: query.limit });
});

// ============================================================================
// TECHNICIAN (verifyToken, then verifyTechnician)
// ============================================================================
// Every query below also matches technicianEmail with the signed-in technician's email.
// So a technician can only ever see or change their own services, and someone else's
// service looks exactly like one that does not exist (404).

// POST /api/services
// The service is saved as "pending" and stays hidden from the public until an admin
// approves it. The owner comes from the verified token, never from the body, and so do
// the approval status and availability, so a client cannot choose them.
servicesRouter.post("/", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const service: ServiceDocument = {
    ...parseServiceInput(req.body),
    technicianName: technician.name,
    technicianEmail: technician.email,
    approvalStatus: "pending",
    isAvailable: true,
    createdAt: new Date(),
  };

  const { insertedId } = await servicesCollection.insertOne(service);
  res.status(201).json({ service: { _id: insertedId, ...service } });
});

// GET /api/services/mine
// All of the technician's own services, in any approval state, newest first.
servicesRouter.get("/mine", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const services = await servicesCollection
    .find({ technicianEmail: technician.email })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  res.json({ services });
});

// GET /api/services/mine/:id
// One of the technician's own services, used to pre-fill the edit form.
servicesRouter.get("/mine/:id", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const service = await servicesCollection.findOne({
    _id: parseObjectId(req.params.id, NOT_FOUND),
    technicianEmail: technician.email,
  });
  if (!service) throw new HttpError(404, NOT_FOUND);

  res.json({ service });
});

// PATCH /api/services/:id
// Edit a service. Any edit sends it back to "pending", so an admin re-checks the new
// content before it is public again. The same rules as creating a service apply.
servicesRouter.patch("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);
  const update = parseServiceInput(req.body);

  const service = await servicesCollection.findOneAndUpdate(
    { _id: parseObjectId(req.params.id, NOT_FOUND), technicianEmail: technician.email },
    { $set: { ...update, approvalStatus: "pending" } },
    { returnDocument: "after" },
  );
  if (!service) throw new HttpError(404, NOT_FOUND);

  res.json({ service });
});

// PATCH /api/services/:id/availability  { isAvailable }
// Switch a service on or off. This does NOT change its approval: turning it off just hides
// it from public pages, and turning it back on shows it again.
servicesRouter.patch("/:id/availability", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);
  const isAvailable = parseAvailability(req.body);

  const service = await servicesCollection.findOneAndUpdate(
    { _id: parseObjectId(req.params.id, NOT_FOUND), technicianEmail: technician.email },
    { $set: { isAvailable } },
    { returnDocument: "after" },
  );
  if (!service) throw new HttpError(404, NOT_FOUND);

  res.json({ service });
});

// DELETE /api/services/:id
// Bookings keep their own copy of the service details, so deleting a service is safe.
servicesRouter.delete("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const { deletedCount } = await servicesCollection.deleteOne({
    _id: parseObjectId(req.params.id, NOT_FOUND),
    technicianEmail: technician.email,
  });
  if (deletedCount === 0) throw new HttpError(404, NOT_FOUND);

  res.status(204).end();
});

// ============================================================================
// PUBLIC DETAILS (kept last so "/mine" is not mistaken for an id)
// ============================================================================

// GET /api/services/:id
// Public. A service that is missing, not approved or switched off is a 404 for everyone.
servicesRouter.get("/:id", async (req, res) => {
  const service = await servicesCollection.findOne({
    _id: parseObjectId(req.params.id, NOT_FOUND),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) throw new HttpError(404, NOT_FOUND);

  // The service document stores the technician's email only to link the two records.
  // Use it to load the technician's public profile, then keep it out of the response.
  const { technicianEmail, ...publicService } = service;
  const technician = await usersCollection.findOne(
    { email: technicianEmail },
    { projection: { name: 1, image: 1, area: 1, bio: 1 } },
  );

  res.json({
    service: publicService,
    technician: {
      name: technician?.name ?? service.technicianName,
      image: technician?.image ?? null,
      area: technician?.area ?? "",
      bio: technician?.bio ?? "",
    },
  });
});
