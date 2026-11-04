export class ActionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function fail(status, message) {
  throw new ActionError(status, message);
}
