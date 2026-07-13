const fakeIndexedDB = require('fake-indexeddb');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = fakeIndexedDB;
global.IDBKeyRange = FDBKeyRange;