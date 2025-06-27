import type { NextApiRequest, NextApiResponse } from 'next';
import { testApiHandler } from 'next-test-api-route-handler'; // Attempt to use this
import { SuperSave, Repository } from '../../../build'; // Adjust path as needed
import { createNextApiHandler } from '../../../build/next'; // Adjust path
import { planetCollection } from '../../entities'; // Adjust path
import type { Planet } from '../../types'; // Adjust path
import getConnection from '../../connection';
import { clear as clearDb } from '../../mysql'; // Assuming this clears the test DB

// Helper to parse JSON response
const getJSON = (res: NextApiResponse) => {
  if (typeof res.json === 'function' && (res.json as jest.Mock).mock.calls.length > 0) {
    return (res.json as jest.Mock).mock.calls[0][0];
  }
  if (typeof res.send === 'function' && (res.send as jest.Mock).mock.calls.length > 0) {
    try {
      return JSON.parse((res.send as jest.Mock).mock.calls[0][0]);
    } catch (e) {
      return (res.send as jest.Mock).mock.calls[0][0];
    }
  }
  return null;
};


describe('Next.js API Handler Integration', () => {
  let superSave: SuperSave;
  let planetRepository: Repository<Planet>;
  let handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

  beforeAll(async () => {
    // Initialize SuperSave and collections once
    // Note: getConnection() defaults to sqlite. If sqlite3 compilation is an issue,
    // this might fail or need adjustment to use MySQL for testing.
    try {
      superSave = await SuperSave.create(getConnection());
      planetRepository = await superSave.addCollection<Planet>(planetCollection);
      const manager = superSave.getManager();
      // Define a prefix that our API route would conceptually handle
      handler = await createNextApiHandler(manager, '/api/supersave');
    } catch (error) {
      console.error("Failed to initialize SuperSave for Next.js tests. This might be due to sqlite3 compilation issues.", error);
      // If this fails, tests will likely not run correctly.
      // Consider throwing to make it clear, or handle in tests.
      throw new Error(`SuperSave initialization failed: ${error}`);
    }
  });

  beforeEach(async () => {
    // Clear database before each test.
    // Ensure clearDb works with the configured connection (SQLite or MySQL)
    if (getConnection().startsWith('mysql')) {
      await clearDb();
    } else {
      // For SQLite in-memory, it's typically clean per connection.
      // If it's a file-based SQLite, we might need a specific clear mechanism.
      // SuperSave close/re-create might be an option or specific table deletes.
      // For now, assuming SuperSave re-creation or in-memory nature handles this for SQLite.
      // Or, if collection has a deleteAll method (it does not by default on repository).
      const items = await planetRepository.getAll();
      for(const item of items) {
        await planetRepository.deleteById(item.id);
      }
    }
  });

  afterAll(async () => {
    if (superSave) {
      await superSave.close();
    }
  });

  test('should create a planet via POST /api/supersave/planets', async () => {
    await testApiHandler({
      handler,
      url: '/api/supersave/planets',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Mars' },
      test: async ({ status, res }) => {
        expect(status).toBe(200);
        const jsonResponse = getJSON(res);
        expect(jsonResponse.data).toBeDefined();
        expect(jsonResponse.data.name).toBe('Mars');
        expect(jsonResponse.data.id).toBeDefined();

        const createdPlanet = await planetRepository.getById(jsonResponse.data.id);
        expect(createdPlanet).not.toBeNull();
        expect(createdPlanet?.name).toBe('Mars');
      },
    });
  });

  test('should get a planet by ID via GET /api/supersave/planets/:id', async () => {
    const newPlanet = await planetRepository.create({ name: 'Venus' });

    await testApiHandler({
      handler,
      url: `/api/supersave/planets/${newPlanet.id}`,
      method: 'GET',
      test: async ({ status, res }) => {
        expect(status).toBe(200);
        const jsonResponse = getJSON(res);
        expect(jsonResponse.data).toBeDefined();
        expect(jsonResponse.data.name).toBe('Venus');
        expect(jsonResponse.data.id).toBe(newPlanet.id);
      },
    });
  });

  test('should return 404 for a non-existent planet ID', async () => {
    await testApiHandler({
      handler,
      url: '/api/supersave/planets/nonexistentid',
      method: 'GET',
      test: async ({ status, res }) => {
        expect(status).toBe(404);
        const jsonResponse = getJSON(res);
        expect(jsonResponse.message).toBe('Not found');
      },
    });
  });

  test('should list planets via GET /api/supersave/planets', async () => {
    await planetRepository.create({ name: 'Earth' });
    await planetRepository.create({ name: 'Jupiter' });

    await testApiHandler({
      handler,
      url: '/api/supersave/planets',
      method: 'GET',
      test: async ({ status, res }) => {
        expect(status).toBe(200);
        const jsonResponse = getJSON(res);
        expect(jsonResponse.data).toBeInstanceOf(Array);
        expect(jsonResponse.data.length).toBe(2);
        // Order isn't guaranteed unless sorted, so check for names
        const names = jsonResponse.data.map(p => p.name);
        expect(names).toContain('Earth');
        expect(names).toContain('Jupiter');
      },
    });
  });

  test('should return overview via GET /api/supersave/', async () => {
    await testApiHandler({
      handler,
      url: '/api/supersave/', // Test the overview endpoint
      method: 'GET',
      test: async ({ status, res }) => {
        expect(status).toBe(200);
        const jsonResponse = getJSON(res);
        expect(jsonResponse.data).toBeInstanceOf(Array);
        expect(jsonResponse.data.length).toBeGreaterThanOrEqual(1);
        expect(jsonResponse.data.some(c => c.name === 'planet')).toBe(true);
      }
    });
  });

  // Add more tests: update, delete, filters, relations, error cases, hooks if applicable
});
