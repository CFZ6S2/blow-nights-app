const { HttpsError } = require("firebase-functions/v2/https");

// ── Firestore document mock ──
function mockDocSnap(data, id = "doc1", path = "col/doc1") {
  const exists = data != null;
  return {
    exists,
    id,
    ref: {
      path,
      update: jest.fn(),
    },
    data: () => (exists ? { ...data } : undefined),
  };
}

// ── Firestore query snapshot ──
function mockQuerySnap(docs = []) {
  return {
    empty: docs.length === 0,
    docs,
    size: docs.length,
    forEach(fn) { docs.forEach(fn); },
  };
}

// ── Aggregate count snapshot ──
function mockCountSnap(count) {
  return { data: () => ({ count }) };
}

// ── Transaction mock ──
function mockTransaction() {
  const gets = new Map();
  const tx = {
    _setGetResult(refPath, snap) { gets.set(refPath, snap); },
    get: jest.fn(async (ref) => {
      const key = typeof ref === "string" ? ref : ref.path || ref;
      if (gets.has(key)) return gets.get(key);
      return gets.values().next().value;
    }),
    update: jest.fn(),
    set: jest.fn(),
  };
  return tx;
}

// ── Stripe mock factory ──
function mockStripe() {
  return {
    checkout: {
      sessions: {
        create: jest.fn(async () => ({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/pay/cs_test_123",
        })),
      },
    },
  };
}

// ── Build a full db mock ──
function buildDb({ docSnapsByPath = {}, queryResults = {}, countResults = {} } = {}) {
  const docCache = new Map();
  const colCache = new Map();

  const collectionDoc = (colPath, docId) => {
    const fullPath = `${colPath}/${docId}`;
    if (docCache.has(fullPath)) return docCache.get(fullPath);
    const docRef = {
      get: jest.fn(async () => docSnapsByPath[fullPath] || mockDocSnap(null, docId, fullPath)),
      collection: (sub) => buildCollection(`${fullPath}/${sub}`),
      id: docId,
      path: fullPath,
      update: jest.fn(),
    };
    docCache.set(fullPath, docRef);
    return docRef;
  };

  function buildCollection(path) {
    if (colCache.has(path)) return colCache.get(path);
    const col = {
      doc: (id) => {
        if (!id) {
          const autoId = "auto_" + Math.random().toString(36).slice(2, 10);
          return collectionDoc(path, autoId);
        }
        return collectionDoc(path, id);
      },
      where: (...args) => buildQuery(path, args),
    };
    colCache.set(path, col);
    return col;
  }

  function buildQuery(path, whereArgs) {
    return {
      where: (...args) => buildQuery(path, [...whereArgs, ...args]),
      limit: () => buildQuery(path, whereArgs),
      count: () => ({
        get: jest.fn(async () => countResults[path] || mockCountSnap(0)),
      }),
      get: jest.fn(async () => queryResults[path] || mockQuerySnap([])),
    };
  }

  const txFn = jest.fn();
  const db = {
    collection: (path) => buildCollection(path),
    collectionGroup: (name) => buildQuery(`__group__${name}`, []),
    runTransaction: jest.fn(async (fn) => {
      const tx = mockTransaction();
      txFn._lastTx = tx;
      return fn(tx);
    }),
    _txFn: txFn,
    _setTxGetResult(refPath, snap) {
      const orig = db.runTransaction;
      db.runTransaction = jest.fn(async (fn) => {
        const tx = mockTransaction();
        tx._setGetResult(refPath, snap);
        txFn._lastTx = tx;
        return fn(tx);
      });
    },
  };
  return db;
}

module.exports = {
  mockDocSnap,
  mockQuerySnap,
  mockCountSnap,
  mockTransaction,
  mockStripe,
  buildDb,
  HttpsError,
};
