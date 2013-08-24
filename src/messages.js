/**
 * HTTP (semantic) status messages
 *
 * @type {Object}
 */
TurtleIO.prototype.messages = {
	SUCCESS             : "Successful",
	CREATED             : "Created",
	ACCEPTED            : "Accepted",
	NO_CONTENT          : null,
	BAD_REQUEST         : "Invalid arguments",
	UNAUTHORIZED        : "Invalid authorization or OAuth token",
	FORBIDDEN           : "Forbidden",
	NOT_FOUND           : "Not found",
	NOT_ALLOWED         : "Method not allowed",
	CONFLICT            : "Conflict",
	SERVER_ERROR        : "Server error",
	BAD_GATEWAY         : "Bad gateway",
	SERVICE_UNAVAILABLE : "Service is unavailable"
};
