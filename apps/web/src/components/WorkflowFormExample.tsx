import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store";

// 定义表单验证 schema
const workflowFormSchema = z.object({
  name: z.string().min(2, {
    message: "工作流名称至少需要 2 个字符",
  }),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// 使用 z.infer 并且确保与 schema 完全匹配
type WorkflowFormValues = {
  name: string;
  description?: string;
  isActive: boolean;
};

interface WorkflowFormExampleProps {
  onSubmit?: (_values: WorkflowFormValues) => void;
  initialValues?: Partial<WorkflowFormValues>;
}

export function WorkflowFormExample({
  onSubmit,
  initialValues,
}: WorkflowFormExampleProps) {
  const addNotification = useAppStore((state) => state.addNotification);

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema) as any,
    defaultValues: {
      name: initialValues?.name || "",
      description: initialValues?.description || "",
      isActive: initialValues?.isActive ?? true,
    },
  });

  function handleSubmit(values: WorkflowFormValues) {
    console.log("表单提交:", values);
    onSubmit?.(values);

    addNotification({
      title: "成功",
      message: "工作流已保存",
      type: "success",
    });
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>工作流表单示例</CardTitle>
        <CardDescription>
          使用 React Hook Form + Zod + shadcn/ui 的示例
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>工作流名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入工作流名称" {...field} />
                  </FormControl>
                  <FormDescription>这是工作流的显示名称</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入工作流描述"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2">
              <Button type="submit">保存</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                重置
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          使用了 zodResolver 进行表单验证
        </div>
      </CardFooter>
    </Card>
  );
}
