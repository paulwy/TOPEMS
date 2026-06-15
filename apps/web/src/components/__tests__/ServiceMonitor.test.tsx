import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ServiceMonitor from "../layout/ServiceMonitor";
import type { ServiceStatus } from "../layout/ServiceMonitor";

describe("ServiceMonitor", () => {
  const mockServices: ServiceStatus[] = [
    { name: "IAM", key: "iam", status: "online" },
    { name: "HRM", key: "hrm", status: "online" },
    { name: "CRM", key: "crm", status: "warning" },
  ];

  it("应该渲染组件", () => {
    const { container } = render(<ServiceMonitor services={mockServices} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("应该接受 onRefresh 属性", () => {
    const { container } = render(
      <ServiceMonitor services={mockServices} onRefresh={() => {}} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("应该接受 refreshInterval 属性", () => {
    const { container } = render(
      <ServiceMonitor services={mockServices} refreshInterval={60000} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});