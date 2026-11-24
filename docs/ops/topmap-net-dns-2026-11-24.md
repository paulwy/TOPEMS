# topmap.net DNS / 入口收口记录（2026-11-24）

## 结论：DNS 侧已全部收口，生产机不需要再做 tunnel 路由

之前从主控机做的外部探测里，`www.topmap.net` 在本机解析器上返回过 `CNAME topems-website.pages.dev`——**那是解析器缓存造成的假象**。登录 Cloudflare 控制台核对真实记录如下（删除 `test` 后共 3 条）：

| 类型 | 名称 | 内容 | 代理 |
|---|---|---|---|
| A | `@`（topmap.net） | `39.97.42.144` | **本轮由「仅 DNS」改为「已代理」** |
| CNAME | `app.topmap.net` | `d677df4c-3b19-472f-8b78-6c62770cf740.cfargotunnel.com` | 已代理 |
| CNAME | `www.topmap.net` | `d677df4c-3b19-472f-8b78-6c62770cf740.cfargotunnel.com` | 已代理 |

即 `www` / `app` 本来就指向同一个 cloudflared 隧道（`topems`）的 CNAME，没有任何 Pages 绑定残留；隧道 public hostname 也无需改动。

## 本轮实际做了三件事

**1. 裸域改为代理（橙云）**

`@` 的 A 记录原为「仅 DNS」→ 直接打 `39.97.42.144`（已无响应，客户端只会连接超时）。改为代理后请求先到 Cloudflare 边缘，才能被重定向规则接管。

**2. 新增单一重定向规则 `apex-root-to-www`**

- 匹配（通配符模式）：`https://topmap.net/*`
- 目标：`https://www.topmap.net/${1}`（301，保留查询字符串）
- 另开启 SSL/TLS → 边缘证书 → **始终使用 HTTPS**，使 `http://topmap.net/*` 先在边缘 301 到 `https://topmap.net/*`

**3. 删除 `test.topmap.net`**

原 A 记录指向已无响应的 `39.97.42.144`（已代理，访问只会 5xx），已从控制台删除。删后记录数 4 → 3，`dig @1.1.1.1 test.topmap.net` 返回空（NXDOMAIN）。

## 验证结果（2026-11-24 01:43 UTC 实测）

```text
curl -sIL http://topmap.net/
  HTTP/1.1 301 → Location: https://topmap.net/
  HTTP/2   301 → location: https://www.topmap.net/
  HTTP/2   200

curl -sI  https://topmap.net/login      → 301  location: https://www.topmap.net/login
curl -sI "https://topmap.net/a?x=1"      → 301  location: https://www.topmap.net/a?x=1
curl -sI  https://www.topmap.net        → 200
dig +short @1.1.1.1 www/app/topmap.net  → 全部 Cloudflare 边缘 IP，无 pages.dev
```

路径与查询串都保住了；裸域到 `www` 是两跳（http→https→www），浏览器无感。

## 遗留（非阻塞）

- `http→https` 与 `https→www` 是两条机制，链路两跳；若以后要压成一跳，把重定向规则的匹配改为自定义表达式 `http.host eq "topmap.net"`、目标用动态路径即可，属优化项。
- 入口链路只剩裸域两跳这一项优化，无功能遗留。
