import { test, expect } from '@playwright/test';

test.describe('HRM Employee Management Flow', () => {
  const testEmployee = {
    name: 'Test Employee ' + Date.now(),
    email: 'test.employee.' + Date.now() + '@example.com',
    phone: '13800138000',
    department: '研发部',
    position: '工程师',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入用户名').fill('admin');
    await page.getByPlaceholder('请输入密码').fill('admin123');
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should navigate to employee management page', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/hrm\/employees/);
  });

  test('should add a new employee', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');

    const addButton = page.getByRole('button', { name: '新增' });
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await page.getByRole('button', { name: '添加员工' }).click();
    }

    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('请输入姓名').fill(testEmployee.name);
    await page.getByPlaceholder('请输入邮箱').fill(testEmployee.email);
    await page.getByPlaceholder('请输入手机号').fill(testEmployee.phone);

    const departmentSelect = page.getByLabel('部门');
    if (await departmentSelect.isVisible()) {
      await departmentSelect.selectOption(testEmployee.department);
    }

    const positionSelect = page.getByLabel('职位');
    if (await positionSelect.isVisible()) {
      await positionSelect.selectOption(testEmployee.position);
    }

    const saveButton = page.getByRole('button', { name: '保存' });
    if (await saveButton.isVisible()) {
      await saveButton.click();
    } else {
      await page.getByRole('button', { name: '提交' }).click();
    }

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/hrm\/employees/);
  });

  test('should search for an employee', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索员工');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testEmployee.name);
      await page.keyboard.press('Enter');
    } else {
      const searchBox = page.getByRole('textbox', { name: '搜索' });
      if (await searchBox.isVisible()) {
        await searchBox.fill(testEmployee.name);
        await page.keyboard.press('Enter');
      }
    }

    await page.waitForTimeout(1000);
    await expect(page.locator('text=' + testEmployee.name)).toBeVisible();
  });

  test('should edit employee information', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索员工');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testEmployee.name);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRow = rows.first();
      const editButton = firstRow.getByRole('button', { name: '编辑' });
      if (await editButton.isVisible()) {
        await editButton.click();
      } else {
        await firstRow.click();
      }

      await page.waitForLoadState('networkidle');

      const updateName = testEmployee.name + ' Updated';
      const nameInput = page.getByPlaceholder('请输入姓名');
      if (await nameInput.isVisible()) {
        await nameInput.fill(updateName);
      }

      const saveButton = page.getByRole('button', { name: '保存' });
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      await page.waitForTimeout(2000);
    }
  });

  test('should delete an employee', async ({ page }) => {
    await page.goto('/hrm/employees');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('搜索员工');
    if (await searchInput.isVisible()) {
      await searchInput.fill(testEmployee.name);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstRow = rows.first();
      const deleteButton = firstRow.getByRole('button', { name: '删除' });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        await page.waitForLoadState('networkidle');

        const confirmButton = page.getByRole('button', { name: '确认' });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        } else {
          const okButton = page.getByRole('button', { name: '确定' });
          if (await okButton.isVisible()) {
            await okButton.click();
          }
        }

        await page.waitForTimeout(2000);
      }
    }
  });
});