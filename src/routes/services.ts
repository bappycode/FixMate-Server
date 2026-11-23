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

const PUBLIC_PROJECTION = { technicianEmail: 0 } as const;

const NOT_FOUND = "Service not found";

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

servicesRouter.get("/mine", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const services = await servicesCollection
    .find({ technicianEmail: technician.email })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  res.json({ services });
});

servicesRouter.get("/mine/:id", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const service = await servicesCollection.findOne({
    _id: parseObjectId(req.params.id, NOT_FOUND),
    technicianEmail: technician.email,
  });
  if (!service) throw new HttpError(404, NOT_FOUND);

  res.json({ service });
});

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

servicesRouter.delete("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const technician = getAuthUser(req);

  const { deletedCount } = await servicesCollection.deleteOne({
    _id: parseObjectId(req.params.id, NOT_FOUND),
    technicianEmail: technician.email,
  });
  if (deletedCount === 0) throw new HttpError(404, NOT_FOUND);

  res.status(204).end();
});

servicesRouter.get("/:id", async (req, res) => {
  const service = await servicesCollection.findOne({
    _id: parseObjectId(req.params.id, NOT_FOUND),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) throw new HttpError(404, NOT_FOUND);

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
