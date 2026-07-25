export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type IncidentStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed';
export type CauseType =
  | 'CodeDefect'
  | 'ConfigurationError'
  | 'ResourceExhaustion'
  | 'NetworkFailure'
  | 'DependencyFailure'
  | 'SecurityBreach'
  | 'DataCorruption'
  | 'ExternalService';

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  symptoms: string[];
  affected_components: string[];
  status: IncidentStatus;
  detected_at: number;
}

export interface RootCause {
  incident_id: string;
  cause_type: CauseType;
  component: string;
  depth: number;
  confidence: number;
  evidence: string[];
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'sync' | 'async' | 'data';
}

interface DependencyGraph {
  nodes: string[];
  edges: DependencyEdge[];
}

interface CorrelatedEvent {
  timestamp: number;
  source: string;
  event_type: string;
  message: string;
  severity: IncidentSeverity;
}

class RootCauseLocatorImpl {
  private incidents: Map<string, Incident> = new Map();
  private rootCauses: Map<string, RootCause[]> = new Map();
  private dependencyGraph: DependencyGraph;
  private eventLog: CorrelatedEvent[] = [];

  private constructor() {
    this.dependencyGraph = this.build_default_graph();
    this.seed_event_log();
  }

  private build_default_graph(): DependencyGraph {
    return {
      nodes: [
        'api-gateway',
        'auth-service',
        'unified-core',
        'order-service',
        'payment-service',
        'inventory-service',
        'notification-service',
        'database',
        'cache',
        'message-queue',
        'search-engine',
        'cdn',
        'load-balancer',
      ],
      edges: [
        { from: 'api-gateway', to: 'auth-service', type: 'sync' },
        { from: 'api-gateway', to: 'unified-core', type: 'sync' },
        { from: 'api-gateway', to: 'order-service', type: 'sync' },
        { from: 'api-gateway', to: 'search-engine', type: 'sync' },
        { from: 'auth-service', to: 'database', type: 'data' },
        { from: 'auth-service', to: 'cache', type: 'sync' },
        { from: 'unified-core', to: 'database', type: 'data' },
        { from: 'unified-core', to: 'cache', type: 'sync' },
        { from: 'order-service', to: 'database', type: 'data' },
        { from: 'order-service', to: 'payment-service', type: 'sync' },
        { from: 'order-service', to: 'inventory-service', type: 'sync' },
        { from: 'order-service', to: 'message-queue', type: 'async' },
        { from: 'payment-service', to: 'database', type: 'data' },
        { from: 'inventory-service', to: 'database', type: 'data' },
        { from: 'inventory-service', to: 'cache', type: 'sync' },
        { from: 'notification-service', to: 'message-queue', type: 'async' },
        { from: 'notification-service', to: 'cdn', type: 'sync' },
        { from: 'load-balancer', to: 'api-gateway', type: 'sync' },
        { from: 'cdn', to: 'api-gateway', type: 'sync' },
      ],
    };
  }

  private seed_event_log(): void {
    const now = Date.now();
    const seeds: CorrelatedEvent[] = [
      {
        timestamp: now - 300000,
        source: 'load-balancer',
        event_type: 'health_check_failed',
        message: 'Backend health check failed',
        severity: 'High',
      },
      {
        timestamp: now - 240000,
        source: 'api-gateway',
        event_type: 'error_rate_spike',
        message: 'Error rate exceeded 5% threshold',
        severity: 'Critical',
      },
      {
        timestamp: now - 180000,
        source: 'database',
        event_type: 'connection_pool_exhausted',
        message: 'Connection pool reached maximum capacity',
        severity: 'Critical',
      },
      {
        timestamp: now - 120000,
        source: 'order-service',
        event_type: 'timeout_errors',
        message: 'Upstream service timeout',
        severity: 'High',
      },
      {
        timestamp: now - 60000,
        source: 'payment-service',
        event_type: 'circuit_breaker_open',
        message: 'Circuit breaker opened',
        severity: 'Medium',
      },
      {
        timestamp: now - 30000,
        source: 'cache',
        event_type: 'eviction_rate_high',
        message: 'High cache eviction rate detected',
        severity: 'Low',
      },
    ];
    this.eventLog = seeds;
  }

  build_dependency_graph(customEdges?: DependencyEdge[]): DependencyGraph {
    if (!customEdges) return { ...this.dependencyGraph };
    const newEdges = [...this.dependencyGraph.edges, ...customEdges];
    const newNodes = new Set<string>();
    newEdges.forEach((e) => {
      newNodes.add(e.from);
      newNodes.add(e.to);
    });
    return { nodes: Array.from(newNodes), edges: newEdges };
  }

  locate_root_cause(incidentId: string): RootCause[] {
    const incident = this.incidents.get(incidentId);
    if (!incident) return [];

    const causes = this.analyze_incident(incident);
    this.rootCauses.set(incidentId, causes);
    return causes;
  }

  analyze_incident(incident: Incident): RootCause[] {
    const causes: RootCause[] = [];
    const components = incident.affected_components;

    for (const component of components) {
      const upstream = this.find_upstream(component);
      const depth = upstream.length;

      const relatedEvents = this.eventLog.filter(
        (e) => components.includes(e.source) || upstream.includes(e.source)
      );

      let causeType: CauseType = 'CodeDefect';
      if (
        relatedEvents.some(
          (e) => e.event_type.includes('database') || e.event_type.includes('connection')
        )
      ) {
        causeType = 'ResourceExhaustion';
      } else if (
        relatedEvents.some(
          (e) => e.event_type.includes('network') || e.event_type.includes('timeout')
        )
      ) {
        causeType = 'NetworkFailure';
      } else if (
        relatedEvents.some(
          (e) => e.event_type.includes('config') || e.event_type.includes('permission')
        )
      ) {
        causeType = 'ConfigurationError';
      } else if (
        relatedEvents.some(
          (e) => e.event_type.includes('circuit') || e.event_type.includes('dependency')
        )
      ) {
        causeType = 'DependencyFailure';
      } else if (
        relatedEvents.some((e) => e.event_type.includes('cache') || e.event_type.includes('memory'))
      ) {
        causeType = 'ResourceExhaustion';
      }

      const evidence = relatedEvents
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.source}: ${e.message}`);

      const confidence = Math.min(0.95, 0.4 + relatedEvents.length * 0.1);

      causes.push({
        incident_id: incident.id,
        cause_type: causeType,
        component,
        depth,
        confidence: Math.round(confidence * 100) / 100,
        evidence,
      });
    }

    return causes.sort((a, b) => b.confidence - a.confidence);
  }

  private find_upstream(component: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const queue = [component];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const upstream = this.dependencyGraph.edges
        .filter((e) => e.to === current && !visited.has(e.from))
        .map((e) => e.from);

      result.push(...upstream);
      queue.push(...upstream);
    }

    return result;
  }

  get_incident_history(): Incident[] {
    return Array.from(this.incidents.values()).sort((a, b) => b.detected_at - a.detected_at);
  }

  correlate_events(timeWindowMs: number = 300000): CorrelatedEvent[] {
    const now = Date.now();
    return this.eventLog
      .filter((e) => now - e.timestamp < timeWindowMs)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  generate_cause_report(incidentId: string): string {
    const incident = this.incidents.get(incidentId);
    const causes = this.rootCauses.get(incidentId) || this.locate_root_cause(incidentId);

    if (!incident) return `Incident ${incidentId} not found.`;

    const lines: string[] = [];
    lines.push(`=== Root Cause Analysis Report ===`);
    lines.push(``);
    lines.push(`Incident: ${incident.id}`);
    lines.push(`Severity: ${incident.severity}`);
    lines.push(`Status: ${incident.status}`);
    lines.push(`Detected: ${new Date(incident.detected_at).toLocaleString()}`);
    lines.push(``);
    lines.push(`Symptoms:`);
    incident.symptoms.forEach((s) => lines.push(`  • ${s}`));
    lines.push(``);
    lines.push(`Affected Components:`);
    incident.affected_components.forEach((c) => lines.push(`  • ${c}`));
    lines.push(``);
    lines.push(`Root Causes (${causes.length}):`);
    causes.forEach((c, i) => {
      lines.push(`  ${i + 1}. [${c.cause_type}] ${c.component}`);
      lines.push(`     Confidence: ${(c.confidence * 100).toFixed(1)}% | Depth: ${c.depth}`);
      lines.push(`     Evidence:`);
      c.evidence.slice(0, 3).forEach((e) => lines.push(`       - ${e}`));
    });
    lines.push(``);

    return lines.join('\n');
  }

  create_incident(
    severity: IncidentSeverity,
    symptoms: string[],
    affectedComponents: string[]
  ): Incident {
    const incident: Incident = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      severity,
      symptoms,
      affected_components: affectedComponents,
      status: 'Open',
      detected_at: Date.now(),
    };
    this.incidents.set(incident.id, incident);
    return incident;
  }

  update_incident_status(incidentId: string, status: IncidentStatus): Incident | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;
    const updated = { ...incident, status };
    this.incidents.set(incidentId, updated);
    return updated;
  }
}

export const rootCauseLocator = new RootCauseLocatorImpl();
export type { RootCauseLocatorImpl };
