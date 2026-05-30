import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAppStore } from '@/store'
import { isDevelopment } from '../config/runtime'

// 登录表单验证 schema
const loginFormSchema = z.object({
  username: z.string().min(1, { message: '用户名不能为空' })
    .max(20, { message: '用户名不能超过20个字符' })
    .regex(/^[a-zA-Z0-9]+$/, { message: '用户名只能包含字母和数字' }),
  password: z.string().min(6, { message: '密码至少需要6个字符' }),
  rememberMe: z.boolean().default(false).optional(),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

interface LoginFormV2Props {
  onLogin?: (values: LoginFormValues) => Promise<void>
  className?: string
}

export function LoginFormV2({ onLogin, className }: LoginFormV2Props) {
  const navigate = useNavigate()
  const addNotification = useAppStore((state) => state.addNotification)
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)

  // 定义表单
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  })

  // 处理表单提交
  async function onSubmit(values: LoginFormValues) {
    setLoading(true)
    
    try {
      if (isRegister) {
        // 注册功能由管理员管理
        addNotification({
          title: '提示',
          message: '注册功能已关闭，请联系管理员获取账号',
          type: 'info'
        })
        return
      }

      // 如果提供了外部登录函数，则调用它
      if (onLogin) {
        await onLogin(values)
      } else {
        // 这里可以添加默认的登录逻辑
        // 示例：简单的登录成功模拟
        console.log('登录表单提交:', values)
        
        // 模拟登录成功
        addNotification({
          title: '成功',
          message: '登录成功',
          type: 'success'
        })
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('登录错误:', error)
      addNotification({
        title: '错误',
        message: error.message || '登录失败',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 ${className}`}>
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-600">TOPEMS</CardTitle>
          <CardDescription>企业数字化平台</CardDescription>
          <h2 className="text-2xl font-semibold pt-4">
            {isRegister ? '用户注册' : '用户登录'}
          </h2>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 用户名 */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入用户名" {...field} />
                    </FormControl>
                    <FormDescription>
                      字母或数字组合，最多20位
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 邮箱 (仅注册时显示) */}
              {isRegister && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="请输入邮箱" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* 密码 */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="请输入密码"
                          {...field}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 记住我 */}
              {!isRegister && (
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>记住我</FormLabel>
                        <FormDescription>
                          在本设备上保持登录状态
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {/* 提交按钮 */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '处理中...' : isRegister ? '注册' : '登录'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {isRegister ? '已有账号？立即登录' : '没有账号？立即注册'}
            </button>
          </div>

          {/* 演示账号 */}
          {isDevelopment() && (
            <div className="pt-4 border-t border-gray-200 w-full">
              <p className="text-xs text-gray-500 text-center">
                演示账号: admin / admin123 (管理员) | user / user123 (普通员工)
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
