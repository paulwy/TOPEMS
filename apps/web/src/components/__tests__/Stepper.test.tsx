import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Stepper from "../common/Stepper";
import type { StepItem } from "../common/Stepper";

describe("Stepper", () => {
  const mockSteps: StepItem[] = [
    { label: "步骤1" },
    { label: "步骤2" },
    { label: "步骤3" },
  ];

  it("应该渲染组件", () => {
    const { container } = render(<Stepper steps={mockSteps} activeStep={0} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("应该支持垂直方向", () => {
    const { container } = render(
      <Stepper steps={mockSteps} activeStep={0} orientation="vertical" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("应该支持不同状态", () => {
    const stepsWithStatus: StepItem[] = [
      { label: "已完成", status: "completed" },
      { label: "当前", status: "active" },
    ];
    const { container } = render(
      <Stepper steps={stepsWithStatus} activeStep={1} />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
