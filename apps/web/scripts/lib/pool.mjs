/**
 * 极简并发池：N 个 worker 抢同一个队列
 *
 * 巡检脚本原本逐页串行，213 页要 8 分钟。页面之间互不依赖，并发 3 路即可压到 3 分钟量级。
 * 用 worker 抢队列而不是切片分批，是为了让慢页不拖住快页（谁空谁取下一个）。
 */
export async function runPool(items, concurrency, worker) {
  const queue = items.slice();
  const n = Math.max(1, Math.min(concurrency, queue.length));
  const runners = Array.from({ length: n }, async (_, idx) => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item, idx);
    }
  });
  await Promise.all(runners);
}
