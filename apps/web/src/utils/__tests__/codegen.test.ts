import { describe, it, expect } from 'vitest';
import {
  toKebabCase,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  pluralize,
  singularize,
  buildQueryName,
  buildMutationName,
  generateEntityQueries,
  generateTypeScriptTypes,
  generateReactQueryHooks,
  generateListPageTemplate,
} from '../bff/codegen';

describe('命名转换', () => {
  it('toKebabCase 驼峰转连字符并小写', () => {
    expect(toKebabCase('userName')).toBe('user-name');
    expect(toKebabCase('UserProfile')).toBe('user-profile');
  });

  it('toPascalCase 下划线/连字符/空格/驼峰统一转 Pascal', () => {
    expect(toPascalCase('user_name')).toBe('UserName');
    expect(toPascalCase('user-name')).toBe('UserName');
    expect(toPascalCase('user name')).toBe('UserName');
    expect(toPascalCase('userName')).toBe('UserName');
  });

  it('toCamelCase 首字母小写', () => {
    expect(toCamelCase('UserProfile')).toBe('userProfile');
    expect(toCamelCase('user_name')).toBe('userName');
  });

  it('toSnakeCase 驼峰转下划线并小写', () => {
    expect(toSnakeCase('userName')).toBe('user_name');
    expect(toSnakeCase('UserProfile')).toBe('user_profile');
  });
});

describe('单复数', () => {
  it('pluralize 已以 s 结尾不重复加 s', () => {
    expect(pluralize('user')).toBe('users');
    expect(pluralize('users')).toBe('users');
  });

  it('singularize 去掉结尾 s，无 s 不变', () => {
    expect(singularize('users')).toBe('user');
    expect(singularize('user')).toBe('user');
  });
});

describe('名称拼装', () => {
  it('buildQueryName = get + pluralize(entity)', () => {
    expect(buildQueryName('user')).toBe('getusers');
  });

  it('buildMutationName = action + entity', () => {
    expect(buildMutationName('user', 'create')).toBe('createuser');
  });
});

describe('codegen 桩函数返回空串', () => {
  const schema = { name: 'user', fields: [] };
  it('四个生成器均为待实现空桩', () => {
    expect(generateEntityQueries(schema)).toBe('');
    expect(generateTypeScriptTypes(schema)).toBe('');
    expect(generateReactQueryHooks(schema)).toBe('');
    expect(generateListPageTemplate(schema)).toBe('');
  });
});
