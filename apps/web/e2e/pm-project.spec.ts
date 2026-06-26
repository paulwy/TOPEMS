import { test, expect } from '@playwright/test';

test.describe('PM Project Management Flow', () => {
  const testProject = {
    name: 'Test Project ' + Date.now(),
    description: 'This is a test project description',
    manager: '项目经理',
    status: '进行中',
    priority: '高',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should navigate to project management page', async ({ page }) => {
    await page.goto('/pm/projects');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/pm\/projects/);
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/pm/projects');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: '新增' });
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await page.getByRole('button', { name: '创建项目' }).click();
    }

    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入项目名称').fill(testProject.name);
    await page.getByPlaceholder('请输入项目描述').fill(testProject.description);

    const managerSelect = page.getByLabel('项目经理');
    if (await managerSelect.isVisible()) {
      await managerSelect.selectOption(testProject.manager);
    }

    const statusSelect = page.getByLabel('状态');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption(testProject.status);
    }

    const prioritySelect = page.getByLabel('优先级');
    if (await prioritySelect.isVisible()) {
      await prioritySelect.selectOption(testProject.priority);
    }

    const saveButton = page.getByRole('button', { name: '保存' });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    } else {
      await page.getByRole('button', { name: '提交' }).click();
    }

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/pm\/projects/);
  });

  test('should view project list', async ({ page }) => {
    await page.goto('/pm/projects');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索项目');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testProject.name);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);
    await expect(page.locator('text=' + testProject.name)).toBeVisible();
  });

  test('should view project details', async ({ page }) => {
    await page.goto('/pm/projects');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索项目');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testProject.name);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRow = rows.first();
      const viewButton = firstRow.getByRole('button', { name: '查看' });
      if (await viewButton.isVisible()) {
        await viewButton.click();
      } else {
        await firstRow.click();
      }

      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/pm\/projects\/detail/);
      await expect(page.locator('text=' + testProject.name)).toBeVisible();
    }
  });

  test('should filter projects by status', async ({ page }) => {
    await page.goto('/pm/projects');
    await page.waitForLoadState('networkidle');

    const statusFilter = page.getByLabel('状态');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption(testProject.status);
    }

    await page.waitForTimeout(1000);
  });
});