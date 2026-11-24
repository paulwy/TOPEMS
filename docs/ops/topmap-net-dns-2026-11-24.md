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

**2. 新增单一重定向规则 `apex-root-to-www`（已进一步压成单跳）**

- 匹配（自定义筛选表达式）：`(http.host eq "topmap.net")` —— 不再区分 scheme，http/https 都直接命中
- 目标（动态表达式）：`concat("https://www.topmap.net", http.request.uri.path)`，301，勾选保留查询字符串
- 同时开启 SSL/TLS → 边缘证书 → **始终使用 HTTPS**
- 早期版本用通配符 `https://topmap.net/*`，导致 http 请求先被「始终使用 HTTPS」改写一次、再被规则改写一次，共两跳；改为 host 匹配后实测 **一跳**。

**3. 删除 `test.topmap.net`**

原 A 记录指向已无响应的 `39.97.42.144`（已代理，访问只会 5xx），已从控制台删除。删后记录数 4 → 3，`dig @1.1.1.1 test.topmap.net` 返回空（NXDOMAIN）。

## 验证结果（单跳版，2026-11-24 实测，直连边缘 IP 以排除本机 DNS 缓存）

```text
curl -sI --resolve topmap.net:80:104.21.85.89  http://topmap.net/
  HTTP/1.1 301  Location: https://www.topmap.net/          ← 只跳一次

curl -sI --resolve topmap.net:443:104.21.85.89 https://topmap.net/
  HTTP/2   301  location: https://www.topmap.net/

curl -sI https://topmap.net/login   → 301  location: https://www.topmap.net/login
curl -sI "https://topmap.net/a?x=1&y=2" → 301  location: https://www.topmap.net/a?x=1&y=2（查询串保留）
curl -sIL http://topmap.net/a?x=1   → 301 → 200（整条链路一跳）
curl -sI https://www.topmap.net     → 200
dig +short @1.1.1.1 topmap.net / www.topmap.net / app.topmap.net → 全部 Cloudflare 边缘 IP，无 pages.dev
```

注意：本机（air）的 mDNSResponder 仍缓存着 `@` 改为代理之前的旧答案（`topmap.net → 39.97.42.144`），所以在本机直接 `curl http://topmap.net` 会超时——这是本机缓存假象，不是线上问题。清缓存需 `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`（需密码，本轮未执行），或等 TTL 过期。

## 遗留

- 无功能遗留；裸域到 `www` 已是单跳。
- 唯一注意点：本机 DNS 缓存（见上）需清一次缓存才能在本机看到单跳效果。
