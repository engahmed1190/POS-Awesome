const WORKER_URL = "/assets/posawesome/dist/js/posapp/workers/itemWorker.js";

let persistWorker = null;
let creationAttempted = false;

function createWorkerInstance() {
	if (typeof Worker === "undefined") {
		return null;
	}
	try {
		return new Worker(WORKER_URL, { type: "classic" });
	} catch (classicError) {
		try {
			// Some browsers require module type workers when classic fails.
			return new Worker(WORKER_URL, { type: "module" });
		} catch (moduleError) {
			console.error("Failed to init persist worker", moduleError);
			return null;
		}
	}
}

export function initPersistWorker(options = {}) {
	const { force = false } = options;
	if (persistWorker && !force) {
		return persistWorker;
	}
	if (force) {
		destroyWorker();
	}
	if (!creationAttempted || force) {
		creationAttempted = true;
		persistWorker = createWorkerInstance();
	}
	return persistWorker;
}

export function getPersistWorker() {
	return persistWorker;
}

export function terminatePersistWorker() {
	destroyWorker();
}

function destroyWorker() {
	if (persistWorker) {
		try {
			persistWorker.terminate();
		} catch (err) {
			console.error("Failed to terminate persist worker", err);
		}
	}
	persistWorker = null;
	creationAttempted = false;
}

export function hasPersistWorker() {
	return Boolean(persistWorker);
}
