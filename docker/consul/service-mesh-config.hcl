// V22.0 服务网格配置：Consul Connect 服务定义
// =============================================================================
//
// 此文件定义了服务网格中各服务的 Connect 配置，
// 启用后服务间通信自动使用 mTLS 加密。
//
// 使用方式：
// 1. Consul agent 启动时加载此配置
// 2. 各服务通过 Consul Connect sidecar proxy 接入网格
// 3. 流量自动加密，无需修改业务代码

services {
  name = "unified-core"
  id = "unified-core-1"
  address = "topems-unified-core"
  port = 8000
  tags = ["core", "iam", "auth"]
  check {
    id = "unified-core-health"
    name = "unified-core HTTP Health"
    http = "http://topems-unified-core:8000/health"
    interval = "10s"
    timeout = "5s"
  }

  connect {
    sidecar_service {
      port = 20000
      check {
        name = "unified-core Connect Sidecar"
        tcp = "localhost:20000"
        interval = "10s"
      }
      proxy {
        upstreams {
          destination_name = "erp"
          local_bind_port = 18010
        }
        upstreams {
          destination_name = "hrm"
          local_bind_port = 18020
        }
      }
    }
  }
}

services {
  name = "erp"
  id = "erp-1"
  address = "topems-erp"
  port = 8010
  tags = ["business", "finance", "asset"]
  check {
    id = "erp-health"
    name = "erp HTTP Health"
    http = "http://topems-erp:8010/health"
    interval = "10s"
    timeout = "5s"
  }

  connect {
    sidecar_service {
      port = 20010
      check {
        name = "erp Connect Sidecar"
        tcp = "localhost:20010"
        interval = "10s"
      }
      proxy {
        upstreams {
          destination_name = "unified-core"
          local_bind_port = 18000
        }
        upstreams {
          destination_name = "wms"
          local_bind_port = 18041
        }
        upstreams {
          destination_name = "finance"
          local_bind_port = 18011
        }
      }
    }
  }
}

services {
  name = "hrm"
  id = "hrm-1"
  address = "topems-hrm"
  port = 8020
  tags = ["business", "human-resource"]
  check {
    id = "hrm-health"
    name = "hrm HTTP Health"
    http = "http://topems-hrm:8020/health"
    interval = "10s"
    timeout = "5s"
  }

  connect {
    sidecar_service {
      port = 20020
      check {
        name = "hrm Connect Sidecar"
        tcp = "localhost:20020"
        interval = "10s"
      }
      proxy {
        upstreams {
          destination_name = "unified-core"
          local_bind_port = 18000
        }
        upstreams {
          destination_name = "erp"
          local_bind_port = 18010
        }
      }
    }
  }
}

services {
  name = "wms"
  id = "wms-1"
  address = "topems-wms"
  port = 8041
  tags = ["business", "warehouse"]
  check {
    id = "wms-health"
    name = "wms HTTP Health"
    http = "http://topems-wms:8041/health"
    interval = "10s"
    timeout = "5s"
  }

  connect {
    sidecar_service {
      port = 20041
      check {
        name = "wms Connect Sidecar"
        tcp = "localhost:20041"
        interval = "10s"
      }
      proxy {
        upstreams {
          destination_name = "unified-core"
          local_bind_port = 18000
        }
        upstreams {
          destination_name = "erp"
          local_bind_port = 18010
        }
      }
    }
  }
}

services {
  name = "scm"
  id = "scm-1"
  address = "topems-scm"
  port = 8040
  tags = ["business", "supply-chain"]
  check {
    id = "scm-health"
    name = "scm HTTP Health"
    http = "http://topems-scm:8040/health"
    interval = "10s"
    timeout = "5s"
  }

  connect {
    sidecar_service {
      port = 20040
      check {
        name = "scm Connect Sidecar"
        tcp = "localhost:20040"
        interval = "10s"
      }
      proxy {
        upstreams {
          destination_name = "unified-core"
          local_bind_port = 18000
        }
        upstreams {
          destination_name = "wms"
          local_bind_port = 18041
        }
        upstreams {
          destination_name = "srm"
          local_bind_port = 18042
        }
      }
    }
  }
}

// V22.0: 服务意图（Service Intentions）
// 定义哪些服务可以相互通信，拒绝其他所有流量（零信任网络）
// 需要通过 consul cli 配置：consul intention create -allow erp unified-core
// 默认拒绝所有，显式允许以下通信：
//
// 允许的通信路径：
// - traefik → 所有业务服务（网关入口流量）
// - unified-core → erp, hrm（权限/认证数据）
// - erp → wms, hrm（库存、员工数据）
// - hrm → unified-core（权限查询）
// - scm → wms, srm（仓储、供应商数据）
// - pm → unified-core, erp（权限、财务数据）
// - crm → erp（客户、财务数据）
// - mes → wms, scm（库存、采购数据）
// - finance → erp（凭证数据）
//
// 其他所有通信默认拒绝（零信任）
