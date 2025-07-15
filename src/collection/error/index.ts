export class HookError extends Error {
  constructor(
    m: string,
    public statusCode: number = 500
  ) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, HookError.prototype);
  }
}
