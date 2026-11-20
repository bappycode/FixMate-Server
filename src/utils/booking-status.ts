import { BOOKING_TRANSITIONS, type BookingActor, type BookingStatus } from "../constants/bookings.js";
import { HttpError } from "./httpError.js";

/**
 * Checks one status change against the pipeline in constants/bookings.ts.
 *   409  the change is not allowed from the current status (for example requested -> completed,
 *        or any change to a job that is already completed, rejected or cancelled)
 *   403  the change exists in the pipeline, but belongs to the other role
 *        (a technician trying to cancel, or a customer trying to accept)
 */
export function assertTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): void {
  const allowedActor = BOOKING_TRANSITIONS[from][to];

  if (!allowedActor) {
    throw new HttpError(409, `A ${from} job cannot be changed to ${to}`);
  }
  if (allowedActor !== actor) {
    throw new HttpError(403, `Only the ${allowedActor} can change a ${from} job to ${to}`);
  }
}
