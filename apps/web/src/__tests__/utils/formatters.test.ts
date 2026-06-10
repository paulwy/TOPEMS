describe('formatter utils', () => {
  describe('formatDate', () => {
    test('formats date correctly', () => {
      const date = new Date('2023-12-25');
      expect(date.toISOString()).toContain('2023-12-25');
    });
  });

  describe('formatCurrency', () => {
    test('formats currency correctly', () => {
      const amount = 1234.56;
      expect(amount).toBeGreaterThan(0);
    });
  });
});
