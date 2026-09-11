import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  serializeSSRData,
  deserializeSSRData,
  buildSSRDataCollection,
  serializeSSRDataToScript,
  serializeStreamingChunk,
  hydrateSSRData,
  readSSRData,
  parseStreamingChunks,
  collectSSRStream,
  clearHydratedSSRData,
  StreamingSSRManager,
  SSR_DATA_MARKER,
  SSR_DATA_GLOBAL,
  type SSRDataEntry,
  type SSRDataCollection,
} from '../streamingSsr';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

describe('streamingSsr', () => {
  beforeEach(() => {
    clearHydratedSSRData();
    // Clean up global window SSR data
    delete (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL];
  });

  afterEach(() => {
    clearHydratedSSRData();
    delete (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL];
  });

  describe('serializeSSRData / deserializeSSRData', () => {
    it('should round-trip simple data', () => {
      const data = { foo: 'bar', count: 42 };
      const serialized = serializeSSRData(data);
      const deserialized = deserializeSSRData(serialized);
      expect(deserialized).toEqual(data);
    });

    it('should escape HTML-sensitive characters', () => {
      const data = { html: '<script>alert("xss")</script>' };
      const serialized = serializeSSRData(data);
      expect(serialized).not.toContain('<script>');
      expect(serialized).toContain('\\u003c');
      expect(serialized).toContain('\\u003e');
      // Round-trip should restore
      expect(deserializeSSRData(serialized)).toEqual(data);
    });

    it('should escape ampersands', () => {
      const data = { text: 'a & b' };
      const serialized = serializeSSRData(data);
      expect(serialized).toContain('\\u0026');
      expect(deserializeSSRData(serialized)).toEqual(data);
    });

    it('should handle null', () => {
      const serialized = serializeSSRData(null);
      expect(deserializeSSRData(serialized)).toBeNull();
    });

    it('should handle arrays', () => {
      const data = [1, 2, { nested: true }];
      const serialized = serializeSSRData(data);
      expect(deserializeSSRData(serialized)).toEqual(data);
    });
  });

  describe('buildSSRDataCollection', () => {
    it('should build a collection with version and timestamp', () => {
      const entries: SSRDataEntry[] = [
        { key: 'user', payload: { id: 1 }, source: 'static', injectedAt: Date.now() },
      ];
      const collection = buildSSRDataCollection(entries);
      expect(collection.entries).toEqual(entries);
      expect(collection.version).toBe('v42.0');
      expect(collection.renderedAt).toBeDefined();
      expect(typeof collection.renderedAt).toBe('string');
    });

    it('should handle empty entries array', () => {
      const collection = buildSSRDataCollection([]);
      expect(collection.entries).toEqual([]);
      expect(collection.version).toBe('v42.0');
    });
  });

  describe('serializeSSRDataToScript', () => {
    it('should produce a valid script tag string', () => {
      const collection: SSRDataCollection = {
        entries: [],
        version: 'v42.0',
        renderedAt: new Date().toISOString(),
      };
      const script = serializeSSRDataToScript(collection);
      expect(script).toContain('<script>');
      expect(script).toContain(`window.${SSR_DATA_GLOBAL}`);
      expect(script).toContain('</script>');
    });
  });

  describe('serializeStreamingChunk', () => {
    it('should wrap entry with SSR_DATA_MARKER', () => {
      const entry: SSRDataEntry = {
        key: 'test',
        payload: 'value',
        source: 'streaming',
        injectedAt: 12345,
      };
      const chunk = serializeStreamingChunk(entry);
      expect(chunk.startsWith(SSR_DATA_MARKER)).toBe(true);
      expect(chunk.endsWith(SSR_DATA_MARKER)).toBe(true);
    });
  });

  describe('parseStreamingChunks', () => {
    it('should parse a valid streaming chunk', () => {
      const entry: SSRDataEntry = {
        key: 'user',
        payload: { id: 42 },
        source: 'streaming',
        injectedAt: Date.now(),
      };
      const html = `${SSR_DATA_MARKER}${serializeSSRData(entry)}${SSR_DATA_MARKER}`;
      const chunks = parseStreamingChunks(html);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].key).toBe('user');
      expect(chunks[0].payload).toEqual({ id: 42 });
    });

    it('should parse multiple chunks', () => {
      const entry1: SSRDataEntry = { key: 'a', payload: 1, source: 'static', injectedAt: 1 };
      const entry2: SSRDataEntry = { key: 'b', payload: 2, source: 'deferred', injectedAt: 2 };
      const html =
        `${SSR_DATA_MARKER}${serializeSSRData(entry1)}${SSR_DATA_MARKER}` +
        `text between` +
        `${SSR_DATA_MARKER}${serializeSSRData(entry2)}${SSR_DATA_MARKER}`;
      const chunks = parseStreamingChunks(html);
      expect(chunks).toHaveLength(2);
    });

    it('should return empty array for no markers', () => {
      expect(parseStreamingChunks('<html><body>hello</body></html>')).toEqual([]);
    });

    it('should skip invalid chunks without key', () => {
      const badData = serializeSSRData({ foo: 'bar' }); // no key property
      const html = `${SSR_DATA_MARKER}${badData}${SSR_DATA_MARKER}`;
      const chunks = parseStreamingChunks(html);
      expect(chunks).toEqual([]);
    });
  });

  describe('hydrateSSRData', () => {
    it('should return empty collection when window has no SSR data', () => {
      const result = hydrateSSRData();
      expect(result.entries).toEqual([]);
      expect(result.version).toBe('v42.0');
    });

    it('should read from window.__SSR_DATA__', () => {
      const collection: SSRDataCollection = {
        entries: [{ key: 'theme', payload: 'dark', source: 'static', injectedAt: Date.now() }],
        version: 'v42.0',
        renderedAt: new Date().toISOString(),
      };
      (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL] = collection;
      const result = hydrateSSRData();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].key).toBe('theme');
    });

    it('should cache result on subsequent calls', () => {
      const collection: SSRDataCollection = {
        entries: [],
        version: 'v42.0',
        renderedAt: new Date().toISOString(),
      };
      (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL] = collection;
      const first = hydrateSSRData();
      // Override window data after first call
      (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL] = {
        entries: [{ key: 'new', payload: 1, source: 'static', injectedAt: 0 }],
        version: 'v99',
        renderedAt: '',
      };
      const second = hydrateSSRData();
      // Should still be the first cached result
      expect(second).toBe(first);
      expect(second.entries).toEqual([]);
    });

    it('should handle malformed SSR data gracefully', () => {
      (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL] = 'not an object';
      const result = hydrateSSRData();
      expect(result.entries).toEqual([]);
    });
  });

  describe('readSSRData', () => {
    it('should read data by key', () => {
      (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL] = {
        entries: [{ key: 'user', payload: { name: 'Alice' }, source: 'static', injectedAt: 0 }],
        version: 'v42.0',
        renderedAt: '',
      };
      const user = readSSRData<{ name: string }>('user');
      expect(user).toEqual({ name: 'Alice' });
    });

    it('should return undefined for missing key', () => {
      expect(readSSRData('nonexistent')).toBeUndefined();
    });
  });

  describe('clearHydratedSSRData', () => {
    it('should reset hydration cache', () => {
      // First call caches empty collection
      hydrateSSRData();
      // Clear
      clearHydratedSSRData();
      // Now set window data and re-hydrate
      (window as unknown as Record<string, unknown>)[SSR_DATA_GLOBAL] = {
        entries: [{ key: 'fresh', payload: 'hello', source: 'static', injectedAt: 0 }],
        version: 'v42.0',
        renderedAt: '',
      };
      const result = hydrateSSRData();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].key).toBe('fresh');
    });
  });

  describe('StreamingSSRManager', () => {
    it('should inject streaming data', () => {
      const manager = new StreamingSSRManager();
      manager.injectStreamingData('key1', { value: 1 }, 'streaming');
      manager.injectStreamingData('key2', 'hello', 'deferred');
      const data = manager.getSSRData();
      expect(data.entries).toHaveLength(2);
      expect(data.entries[0].key).toBe('key1');
      expect(data.entries[1].key).toBe('key2');
    });

    it('should accumulate streaming HTML', () => {
      const manager = new StreamingSSRManager();
      manager.injectStreamingData('a', 1);
      manager.injectStreamingData('b', 2);
      const html = manager.getStreamingHTML();
      expect(html).toContain(SSR_DATA_MARKER);
      // Two chunks = 4 markers
      const markerCount = (html.match(new RegExp(SSR_DATA_MARKER, 'g')) || []).length;
      expect(markerCount).toBe(4);
    });

    it('should default source to streaming', () => {
      const manager = new StreamingSSRManager();
      manager.injectStreamingData('k', 'v');
      const data = manager.getSSRData();
      expect(data.entries[0].source).toBe('streaming');
    });

    it('should provide flush method that does not throw', () => {
      const manager = new StreamingSSRManager();
      expect(() => manager.flush()).not.toThrow();
    });

    it('should get SSR data collection with version', () => {
      const manager = new StreamingSSRManager();
      manager.injectStreamingData('k', 'v');
      const data = manager.getSSRData();
      expect(data.version).toBe('v42.0');
      expect(data.renderedAt).toBeDefined();
    });
  });

  describe('collectSSRStream', () => {
    it('should collect a ReadableStream into a string', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('Hello '));
          controller.enqueue(encoder.encode('World'));
          controller.close();
        },
      });
      const result = await collectSSRStream(stream);
      expect(result).toBe('Hello World');
    });

    it('should handle empty stream', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });
      const result = await collectSSRStream(stream);
      expect(result).toBe('');
    });
  });
});
