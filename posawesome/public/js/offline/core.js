import Dexie from "dexie";

// --- Dexie initialization ---------------------------------------------------
export const db = new Dexie("posawesome_offline");
db.version(1).stores({ keyval: "&key" });

let persistWorker = null;
let sharedWorker = null;

if (typeof Worker !== "undefined") {
        try {
                const workerUrl = "/assets/posawesome/js/posapp/workers/itemWorker.js";
                persistWorker = new Worker(workerUrl, { type: "classic" });
        } catch (e) {
                console.error("Failed to init persist worker", e);
                persistWorker = null;
        }
}

// Shared worker initialization is currently disabled because the worker script
// is not included in the repository. Keeping this block commented avoids
// browser errors when the file is missing.
//
// if (typeof SharedWorker !== "undefined") {
//         try {
//                 const sharedWorkerUrl = "/assets/posawesome/js/posapp/workers/sharedWorker.js";
//                 sharedWorker = new SharedWorker(sharedWorkerUrl, { type: "classic" });
//                 sharedWorker.port.start();
//         } catch (e) {
//                 console.error("Failed to init shared worker", e);
//                 sharedWorker = null;
//         }
// }

export function getSharedWorker() {
	return sharedWorker;
}

// Persist queue for batching operations
const persistQueue = {};
let persistTimeout = null;

export function addToPersistQueue(key, value) {
	persistQueue[key] = value;
	
	if (!persistTimeout) {
		persistTimeout = setTimeout(flushPersistQueue, 100);
	}
}

function flushPersistQueue() {
	const keys = Object.keys(persistQueue);
	if (keys.length) {
		keys.forEach(key => {
			persist(key, persistQueue[key]);
			delete persistQueue[key];
		});
	}
	persistTimeout = null;
}

export function persist(key, value) {
        let clean = value;
        try {
                clean = JSON.parse(JSON.stringify(value));
        } catch (e) {
                console.error("Failed to serialize", key, e);
        }

        if (persistWorker) {
                try {
                        persistWorker.postMessage({ type: "persist", key, value: clean });
                        return;
                } catch (err) {
                        console.error("Worker postMessage failed", err);
                }
        }

        db.table("keyval")
                .put({ key, value: clean })
                .catch((e) => console.error(`Failed to persist ${key}`, e));

        if (typeof localStorage !== "undefined") {
                try {
                        localStorage.setItem(`posa_${key}`, JSON.stringify(clean));
                } catch (err) {
                        console.error("Failed to persist", key, "to localStorage", err);
                }
        }
}

export const initPromise = new Promise((resolve) => {
	const init = async () => {
		try {
			await db.open();
			// Initialization will be handled by the cache.js module
			resolve();
		} catch (e) {
			console.error("Failed to initialize offline DB", e);
			resolve(); // Resolve anyway to prevent blocking
		}
	};

	if (typeof requestIdleCallback === "function") {
		requestIdleCallback(init);
	} else {
		setTimeout(init, 0);
	}
});