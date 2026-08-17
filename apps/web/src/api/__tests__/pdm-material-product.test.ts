import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockPdmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { pdm: mockPdmClient },
    default: { pdm: mockPdmClient },
  };
});

describe('PDM Material & Product API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pdmMaterialApi', () => {
    it('listMaterials should call GET /materials with params', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.get as vi.Mock).mockResolvedValue({
        data: { materials: [], total: 0, page: 1, page_size: 10 },
      });

      await pdmMaterialApi.listMaterials({
        page: 2,
        page_size: 20,
        search: 'steel',
        status: 'active',
      });
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/materials', {
        params: { page: 2, page_size: 20, search: 'steel', status: 'active' },
      });
    });

    it('listMaterials should call GET /materials without params', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.get as vi.Mock).mockResolvedValue({
        data: { materials: [], total: 0, page: 1, page_size: 10 },
      });

      await pdmMaterialApi.listMaterials();
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/materials', { params: undefined });
    });

    it('getMaterial should call GET /materials/:id', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.get as vi.Mock).mockResolvedValue({ data: null });

      await pdmMaterialApi.getMaterial('550e8400-e29b-41d4-a716-446655440000');
      expect(apiClient.pdm.get).toHaveBeenCalledWith(
        '/materials/550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('createMaterial should call POST /materials with data', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.post as vi.Mock).mockResolvedValue({ data: null });

      const data = {
        material_no: 'MAT-001',
        name: 'Steel Plate',
        spec: '10mm',
        unit: 'pcs',
        status: 'active',
      };
      await pdmMaterialApi.createMaterial(data);
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/materials', data);
    });

    it('createMaterial should call POST /materials with minimal data', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.post as vi.Mock).mockResolvedValue({ data: null });

      const data = { material_no: 'MAT-002', name: 'Aluminum Sheet' };
      await pdmMaterialApi.createMaterial(data);
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/materials', data);
    });

    it('updateMaterial should call PUT /materials/:id with data', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.put as vi.Mock).mockResolvedValue({ data: null });

      const data = { name: 'Updated Steel', status: 'inactive' };
      await pdmMaterialApi.updateMaterial('550e8400-e29b-41d4-a716-446655440000', data);
      expect(apiClient.pdm.put).toHaveBeenCalledWith(
        '/materials/550e8400-e29b-41d4-a716-446655440000',
        data
      );
    });

    it('deleteMaterial should call DELETE /materials/:id', async () => {
      const { pdmMaterialApi } = await import('../pdm/pdmMaterial');
      const { apiClient } = await import('../client');
      (apiClient.pdm.delete as vi.Mock).mockResolvedValue({ data: null });

      await pdmMaterialApi.deleteMaterial('550e8400-e29b-41d4-a716-446655440000');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith(
        '/materials/550e8400-e29b-41d4-a716-446655440000'
      );
    });
  });

  describe('pdmProductApi', () => {
    it('listProducts should call GET /products with params', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.get as vi.Mock).mockResolvedValue({
        data: { products: [], total: 0, page: 1, page_size: 10 },
      });

      await pdmProductApi.listProducts({
        page: 3,
        page_size: 50,
        search: 'widget',
        status: 'draft',
      });
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/products', {
        params: { page: 3, page_size: 50, search: 'widget', status: 'draft' },
      });
    });

    it('listProducts should call GET /products without params', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.get as vi.Mock).mockResolvedValue({
        data: { products: [], total: 0, page: 1, page_size: 10 },
      });

      await pdmProductApi.listProducts();
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/products', { params: undefined });
    });

    it('getProduct should call GET /products/:id', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.get as vi.Mock).mockResolvedValue({ data: null });

      await pdmProductApi.getProduct('550e8400-e29b-41d4-a716-446655440001');
      expect(apiClient.pdm.get).toHaveBeenCalledWith(
        '/products/550e8400-e29b-41d4-a716-446655440001'
      );
    });

    it('createProduct should call POST /products with data', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.post as vi.Mock).mockResolvedValue({ data: null });

      const data = {
        product_no: 'PROD-001',
        name: 'Widget A',
        description: 'A widget',
        version: '1.0',
        status: 'active',
      };
      await pdmProductApi.createProduct(data);
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/products', data);
    });

    it('createProduct should call POST /products with minimal data', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.post as vi.Mock).mockResolvedValue({ data: null });

      const data = { product_no: 'PROD-002', name: 'Gadget B' };
      await pdmProductApi.createProduct(data);
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/products', data);
    });

    it('updateProduct should call PUT /products/:id with data', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.put as vi.Mock).mockResolvedValue({ data: null });

      const data = { name: 'Updated Widget', version: '2.0', status: 'inactive' };
      await pdmProductApi.updateProduct('550e8400-e29b-41d4-a716-446655440001', data);
      expect(apiClient.pdm.put).toHaveBeenCalledWith(
        '/products/550e8400-e29b-41d4-a716-446655440001',
        data
      );
    });

    it('deleteProduct should call DELETE /products/:id', async () => {
      const { pdmProductApi } = await import('../pdm/pdmProduct');
      const { apiClient } = await import('../client');
      (apiClient.pdm.delete as vi.Mock).mockResolvedValue({ data: null });

      await pdmProductApi.deleteProduct('550e8400-e29b-41d4-a716-446655440001');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith(
        '/products/550e8400-e29b-41d4-a716-446655440001'
      );
    });
  });
});
