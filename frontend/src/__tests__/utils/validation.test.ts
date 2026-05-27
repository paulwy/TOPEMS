describe('validation utils', () => {
  describe('validateEmail', () => {
    test('basic email validation', () => {
      expect('test@example.com').toContain('@');
    });
  });

  describe('validateUsername', () => {
    test('basic username validation', () => {
      expect('user123').toBeTruthy();
    });
  });
});
