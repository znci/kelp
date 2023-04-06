// Errors for kelp

class KelpError extends Error {
  constructor(message) {
	super(message);
	this.name = "KelpError";
  }
}

class InvalidPortError extends KelpError {
  constructor(message) {
	super(message);
	this.name = "InvalidPortError";
  }
}

class InvalidSettingsError extends KelpError {
	  constructor(message) {
	super(message);
	this.name = "InvalidSettingsError";
  }
}

class InvalidRouteError extends KelpError {
	  constructor(message) {
	super(message);
	this.name = "InvalidRouteError";
  }
}

export { KelpError, InvalidPortError, InvalidSettingsError, InvalidRouteError };