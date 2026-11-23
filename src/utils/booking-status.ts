import { BOOKING_TRANSITIONS, type BookingActor, type BookingStatus } from "../constants/bookings.js";
import { HttpError } from "./httpError.js";

export function assertTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): void {
  const allowedActor = BOOKING_TRANSITIONS[from][to];

  if (!allowedActor) {
    throw new HttpError(409, `A ${from} job cannot be changed to ${to}`);
  }
  if (allowedActor !== actor) {
    throw new HttpError(403, `Only the ${allowedActor} can change a ${from} job to ${to}`);
  }
}
