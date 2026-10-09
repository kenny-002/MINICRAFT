/**
 * IndexedDB Adapter for MINICRAFT World Storage.
 * Provides resilient, asynchronous, transaction-safe storage for multi-world save files.
 */
export class IndexedDBAdapter {
  static DB_NAME = 'MINICRAFT_WORLDS_DB';
  static DB_VERSION = 2;
  static WORLDS_STORE = 'worlds';
  static META_STORE = 'settings_meta';

  constructor() {
    this.db = null;
    this.isReady = false;
    this._initPromise = this._init();
  }

  async _init() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB not supported in this environment.');
        this.isReady = false;
        resolve(null);
        return;
      }

      const request = indexedDB.open(IndexedDBAdapter.DB_NAME, IndexedDBAdapter.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IndexedDBAdapter.WORLDS_STORE)) {
          const store = db.createObjectStore(IndexedDBAdapter.WORLDS_STORE, { keyPath: 'id' });
          store.createIndex('lastPlayedAt', 'lastPlayedAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
        if (!db.objectStoreNames.contains(IndexedDBAdapter.META_STORE)) {
          db.createObjectStore(IndexedDBAdapter.META_STORE, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', event.target.error);
        this.isReady = false;
        resolve(null);
      };
    });
  }

  async ready() {
    if (!this.isReady) {
      await this._initPromise;
    }
    return this.isReady && this.db !== null;
  }

  /**
   * Get all stored worlds metadata
   */
  async getAllWorlds() {
    if (!(await this.ready())) return [];

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([IndexedDBAdapter.WORLDS_STORE], 'readonly');
        const store = transaction.objectStore(IndexedDBAdapter.WORLDS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          const worlds = request.result || [];
          // Sort by lastPlayedAt descending
          worlds.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0));
          resolve(worlds);
        };

        request.onerror = () => {
          resolve([]);
        };
      } catch (err) {
        console.error('IndexedDB getAllWorlds error:', err);
        resolve([]);
      }
    });
  }

  /**
   * Get a single world by ID
   */
  async getWorld(id) {
    if (!(await this.ready()) || !id) return null;

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([IndexedDBAdapter.WORLDS_STORE], 'readonly');
        const store = transaction.objectStore(IndexedDBAdapter.WORLDS_STORE);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.error(`IndexedDB getWorld(${id}) error:`, err);
        resolve(null);
      }
    });
  }

  /**
   * Save or update a world object
   */
  async saveWorld(worldData) {
    if (!(await this.ready()) || !worldData || !worldData.id) return false;

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([IndexedDBAdapter.WORLDS_STORE], 'readwrite');
        const store = transaction.objectStore(IndexedDBAdapter.WORLDS_STORE);
        const request = store.put(worldData);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => {
          console.error('IndexedDB saveWorld error:', e);
          resolve(false);
        };
      } catch (err) {
        console.error('IndexedDB saveWorld transaction error:', err);
        resolve(false);
      }
    });
  }

  /**
   * Delete a world by ID
   */
  async deleteWorld(id) {
    if (!(await this.ready()) || !id) return false;

    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([IndexedDBAdapter.WORLDS_STORE], 'readwrite');
        const store = transaction.objectStore(IndexedDBAdapter.WORLDS_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (err) {
        console.error(`IndexedDB deleteWorld(${id}) error:`, err);
        resolve(false);
      }
    });
  }

  /**
   * Store directory handle metadata or preferences
   */
  async setMeta(key, value) {
    if (!(await this.ready())) return false;
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([IndexedDBAdapter.META_STORE], 'readwrite');
        const store = transaction.objectStore(IndexedDBAdapter.META_STORE);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async getMeta(key) {
    if (!(await this.ready())) return null;
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([IndexedDBAdapter.META_STORE], 'readonly');
        const store = transaction.objectStore(IndexedDBAdapter.META_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
}
