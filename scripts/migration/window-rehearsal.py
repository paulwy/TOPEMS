#!/usr/bin/env python3
"""窗口预演：从生产 schema 快照恢复隔离库，逐条应用指定迁移，再逆序回滚。

断言全部写在脚本内（失败即非 0 退出），不依赖人工读数：
  1. 每条迁移成功后，_sqlx_migrations 必须恰好 +1；
  2. 每条迁移前后，表数与业务行数必须不变；
  3. 整批回滚后，账本行数、表数、策略总数、业务行数必须回到快照基线；
  4. 回滚后列结构指纹必须与快照完全一致；
  5. 每个 rollback 脚本必须删除自己的账本登记行（按 version 精确匹配）。

用法：
  python3 scripts/migration/window-rehearsal.py [--keep]
  python3 scripts/migration/window-rehearsal.py --versions 20261118090000,... --report /tmp/x.json

生产零写入：只读取 database/baseline/ 快照，所有 DDL/DML 都发生在隔离库。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE_DIR = os.path.join(ROOT, "database/baseline")
MIG_DIR = os.path.join(ROOT, "database/migrations")
ROLLBACK_DIR = os.path.join(ROOT, "database/rollback")
APPLY = os.path.join(ROOT, "scripts/migration/apply-forward.sh")
PGHOST = os.environ.get("TOPEMS_REHEARSAL_HOST", "127.0.0.1")
PGPORT = os.environ.get("TOPEMS_REHEARSAL_PORT", "5432")
PGUSER = os.environ.get("TOPEMS_REHEARSAL_USER", "xingzhai")
KEEP_ON_SUCCESS = False

WINDOW_VERSIONS = [
    "20261118090000", "20261118093000", "20261118100000", "20261118103000",
    "20261118110000", "20261118111000", "20261118112000", "20261118113000",
    "20261118120000", "20261118123000", "20261118125000", "20261118130000",
    "20261118140000", "20261118150000",
]
DEFERRED = ["20261118124000"]


class AssertionFailure(RuntimeError):
    pass


def run(cmd, stdin=None, timeout=1800):
    return subprocess.run(cmd, shell=isinstance(cmd, str), input=stdin,
                          capture_output=True, text=True, timeout=timeout)


def psql(sql, dsn):
    return run(["psql", dsn, "-X", "-q", "-tA", "-v", "ON_ERROR_STOP=1", "-c", sql])


def psql_file(path, dsn):
    if path.endswith(".gz"):
        with subprocess.Popen(["gzip", "-dc", path], stdout=subprocess.PIPE) as gz:
            return subprocess.run(["psql", dsn, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", "-"],
                                  stdin=gz.stdout, capture_output=True, text=True)
    return run(["psql", dsn, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", path])


def latest_anchor() -> str:
    doc = json.load(open(os.path.join(BASE_DIR, "anchors.json"), encoding="utf-8"))
    return str(max(int(a["anchor_version"]) for a in doc["anchors"]))


def pending_versions(anchor: str):
    out = []
    for f in sorted(os.listdir(MIG_DIR)):
        m = re.match(r"(\d{14})_.*\.sql$", f)
        if m and int(m.group(1)) > int(anchor):
            out.append(m.group(1))
    return out


class Rehearsal:
    def __init__(self, anchor: str):
        self.anchor = anchor
        self.db = f"topems_window_drill_{os.getpid()}"
        self.dsn = f"postgresql://{PGUSER}@{PGHOST}:{PGPORT}/{self.db}"
        self.schema = os.path.join(BASE_DIR, f"prod_schema_{anchor}.sql.gz")
        self.ledger = os.path.join(BASE_DIR, f"prod_ledger_{anchor}.sql")
        self.data = os.path.join(BASE_DIR, f"baseline_{anchor}_data.sql.gz")
        self.metrics = {}

    # ---------- setup ----------
    def create(self):
        run(["dropdb", "--if-exists", "--force", self.db], timeout=180)
        r = run(["createdb", self.db], timeout=180)
        if r.returncode != 0:
            raise AssertionFailure(f"createdb 失败: {r.stderr}")
        for path in (self.schema, self.ledger, self.data):
            r = psql_file(path, self.dsn)
            if r.returncode != 0:
                raise AssertionFailure(f"恢复 {os.path.basename(path)} 失败: {r.stderr[-2000:]}")
        sql = """
CREATE SCHEMA _drill;
CREATE TABLE _drill.counts(step text, tbl text, n bigint);
CREATE TABLE _drill.policies(step text, sch text, tbl text, pol text, sig text);
CREATE OR REPLACE FUNCTION _drill.snap(p_step text) RETURNS void AS $$
DECLARE r record; c bigint;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, c.relname AS tbl
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','_drill')
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', r.sch, r.tbl) INTO c;
    INSERT INTO _drill.counts VALUES (p_step, r.sch||'.'||r.tbl, c);
  END LOOP;
  -- 按策略逐条记录：缺/多策略由键集合差异发现，定义漂移由 sig 差异发现
  INSERT INTO _drill.policies
  SELECT p_step, schemaname, tablename, policyname,
         md5(cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,''))
    FROM pg_policies;
END $$ LANGUAGE plpgsql;
"""
        r = psql(sql, self.dsn)
        if r.returncode != 0:
            raise AssertionFailure(f"指标函数创建失败: {r.stderr}")

    def snap(self, step):
        r = psql(f"SELECT _drill.snap('{step}')", self.dsn)
        if r.returncode != 0:
            raise AssertionFailure(f"snap({step}) 失败: {r.stderr}")

    # ---------- metrics ----------
    def load(self):
        r = psql("SELECT step, tbl, n FROM _drill.counts", self.dsn)
        counts = {}
        for line in r.stdout.splitlines():
            if not line.strip():
                continue
            step, tbl, n = line.rsplit("|", 2)
            counts.setdefault(step, {})[tbl] = int(n)
        r = psql("SELECT step, sch, tbl, pol, sig FROM _drill.policies", self.dsn)
        pols = {}
        for line in r.stdout.splitlines():
            if not line.strip():
                continue
            step, sch, tbl, pol, sig = line.split("|")
            pols.setdefault(step, {})[f"{sch}.{tbl}.{pol}"] = sig
        self.metrics = {"counts": counts, "policies": pols}
        return counts, pols

    @staticmethod
    def policy_counts_by_table(pols_step):
        out = {}
        for key, _sig in pols_step.items():
            tbl = key.rsplit(".", 1)[0]
            out[tbl] = out.get(tbl, 0) + 1
        return out

    @staticmethod
    def summary(counts_step, pols_step):
        tables = len(counts_step)
        ledger = counts_step.get("public._sqlx_migrations", 0)
        rows = sum(n for t, n in counts_step.items() if t != "public._sqlx_migrations")
        policies = len(pols_step)
        return {"tables": tables, "ledger_rows": ledger, "business_rows": rows, "policies": policies}

    # ---------- fingerprint ----------
    def fingerprint(self):
        r = psql("""
SELECT table_schema||'.'||table_name||'.'||column_name||'|'||data_type||'|'||is_nullable||'|'||coalesce(column_default,'')
  FROM information_schema.columns
 WHERE table_schema NOT IN ('pg_catalog','information_schema','_drill') ORDER BY 1""", self.dsn)
        cols = [x for x in r.stdout.splitlines() if x.strip()]
        r = psql("""
SELECT schemaname||'.'||tablename||'.'||policyname||'|'||permissive||'|'||array_to_string(roles,',')||'|'||cmd||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'')
  FROM pg_policies ORDER BY 1""", self.dsn)
        pols = [x for x in r.stdout.splitlines() if x.strip()]
        return cols, pols

    # ---------- steps ----------
    def apply_one(self, i, version, pend):
        defer = ",".join(x for x in pend if x != version)
        t0 = time.monotonic()
        r = run(["bash", APPLY, "--dsn", self.dsn, "--only", version, "--defer", defer])
        elapsed = round(time.monotonic() - t0, 2)
        step = f"{i:02d}_{version}"
        if r.returncode != 0:
            self.snap(f"99_fail_{version}")
            raise AssertionFailure(
                f"{version} 应用失败（{elapsed}s）\n{r.stderr.strip()[-2000:]}")
        self.snap(step)
        return step, elapsed

    def verify_step(self, step, prev_step, version):
        counts, pols = self.load()
        cur, prev = counts[step], counts[prev_step]
        cur_p, prev_p = pols.get(step, {}), pols.get(prev_step, {})
        cur_pc = self.policy_counts_by_table(cur_p)
        prev_pc = self.policy_counts_by_table(prev_p)
        if cur.get("public._sqlx_migrations", 0) != prev.get("public._sqlx_migrations", 0) + 1:
            raise AssertionFailure(f"{version}: 账本行数未 +1")
        if len(cur) != len(prev):
            raise AssertionFailure(f"{version}: 表数变化 {len(prev)} → {len(cur)}")
        if self.summary(cur, cur_p)["business_rows"] != self.summary(prev, prev_p)["business_rows"]:
            raise AssertionFailure(f"{version}: 业务行数发生变化")
        row_changes = [{"table": t, "before": prev.get(t, 0), "after": cur.get(t, 0)}
                       for t in sorted(set(prev) | set(cur))
                       if prev.get(t, 0) != cur.get(t, 0)]
        pol_changes = [{"table": t, "before": prev_pc.get(t, 0), "after": cur_pc.get(t, 0)}
                       for t in sorted(set(prev_pc) | set(cur_pc))
                       if prev_pc.get(t, 0) != cur_pc.get(t, 0)]
        def_changes = [k for k in sorted(set(prev_p) | set(cur_p))
                       if prev_p.get(k) != cur_p.get(k)]
        return {"version": version, "seconds": None, "rows_total": self.summary(cur, cur_p)["business_rows"],
                "ledger_rows": cur.get("public._sqlx_migrations", 0),
                "policies": self.summary(cur, cur_p)["policies"],
                "row_changes": row_changes, "policy_count_changes": pol_changes,
                "policy_def_changes": def_changes}

    def rollback_one(self, i, version):
        rb = next((f for f in sorted(os.listdir(ROLLBACK_DIR)) if f.startswith(version + "_")), None)
        if rb is None:
            raise AssertionFailure(f"{version}: 缺少回滚脚本")
        t0 = time.monotonic()
        r = run(["psql", self.dsn, "-X", "-q", "-v", "ON_ERROR_STOP=1",
                 "-f", os.path.join(ROLLBACK_DIR, rb)])
        elapsed = round(time.monotonic() - t0, 2)
        if r.returncode != 0:
            raise AssertionFailure(f"{version} 回滚失败（{elapsed}s）\n{r.stderr.strip()[-2000:]}")
        left = psql(f"SELECT count(*) FROM public._sqlx_migrations WHERE version = {version}", self.dsn)
        if left.stdout.strip() != "0":
            raise AssertionFailure(f"{version}: 回滚后账本仍残留登记行（{left.stdout.strip()}）")
        self.snap(f"90_rb_{i:02d}_{version}")
        return {"version": version, "file": rb, "seconds": elapsed, "ok": True}

    # ---------- main ----------
    def run_all(self, versions):
        self.create()
        self.snap("00_before")
        fp_before = self.fingerprint()
        counts, pols = self.load()
        base = self.summary(counts["00_before"], pols.get("00_before", {}))
        print(f"基线：表 {base['tables']}，账本 {base['ledger_rows']}，业务行 {base['business_rows']}，"
              f"策略 {base['policies']}", flush=True)

        pend = pending_versions(self.anchor)
        unknown = [v for v in versions if v not in pend]
        if unknown:
            raise AssertionFailure(f"以下版本不在待应用队列（可能已应用或拼写错误）: {unknown}")

        results = []
        prev = "00_before"
        for i, v in enumerate(versions, 1):
            step, elapsed = self.apply_one(i, v, pend)
            rec = self.verify_step(step, prev, v)
            rec["seconds"] = elapsed
            results.append(rec)
            print(f"[{i:02d}] {v} ok {elapsed}s 账本={rec['ledger_rows']} 策略={rec['policies']} "
                  f"策略Δ={[(d['table'], d['after'] - d['before']) for d in rec['policy_count_changes']]}",
                  flush=True)
            prev = step
        print("== 14 条全部应用成功，开始逆序回滚", flush=True)

        rollbacks = []
        for i, v in enumerate(reversed(versions), 1):
            rb = self.rollback_one(i, v)
            rollbacks.append(rb)
            print(f"[rb{i:02d}] {v} ok {rb['seconds']}s", flush=True)

        self.snap("99_after_rollback")
        fp_after = self.fingerprint()
        counts, pols = self.load()
        after = self.summary(counts["99_after_rollback"], pols.get("99_after_rollback", {}))

        failures = []
        if after["ledger_rows"] != base["ledger_rows"]:
            failures.append(f"账本未复原：{base['ledger_rows']} → {after['ledger_rows']}")
        if after["tables"] != base["tables"]:
            failures.append(f"表数未复原：{base['tables']} → {after['tables']}")
        if after["business_rows"] != base["business_rows"]:
            failures.append(f"业务行数未复原：{base['business_rows']} → {after['business_rows']}")
        if after["policies"] != base["policies"]:
            failures.append(f"策略总数未复原：{base['policies']} → {after['policies']}")
        if fp_before[0] != fp_after[0]:
            failures.append(f"列结构指纹不一致：{len(set(fp_before[0]) ^ set(fp_after[0]))} 条差异")

        known_def_diffs = {
            "public.core_tenants.rls_system_only",
            "rs.formulas.rls_tenant_isolation",
        }
        before_pols, after_pols = pols.get("00_before", {}), pols.get("99_after_rollback", {})
        missing_pols = sorted(set(before_pols) - set(after_pols))
        extra_pols = sorted(set(after_pols) - set(before_pols))
        if missing_pols or extra_pols:
            failures.append(f"策略集合不一致：缺失 {missing_pols}，多余 {extra_pols}")
        policy_def_diffs = [k for k in sorted(set(before_pols) & set(after_pols))
                            if before_pols[k] != after_pols[k] and k not in known_def_diffs]
        if policy_def_diffs:
            failures.append(f"非已知策略定义差异：{policy_def_diffs}")

        report = {
            "anchor": self.anchor, "db": self.db, "deferred": DEFERRED,
            "base": base, "after": after, "results": results, "rollbacks": rollbacks,
            "policy_def_known_diffs": sorted(known_def_diffs),
            "policy_def_unexpected_diffs": policy_def_diffs,
        }
        print("\n== 回滚后断言 ==", flush=True)
        print(json.dumps({"base": base, "after": after}, ensure_ascii=False), flush=True)
        if failures:
            raise AssertionFailure("回滚后断言失败：\n- " + "\n- ".join(failures))
        print("== 全部断言通过 ==", flush=True)
        return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--versions", default=",".join(WINDOW_VERSIONS))
    ap.add_argument("--report", default="/tmp/topems_window_rehearsal.json")
    ap.add_argument("--keep", action="store_true", help="成功后保留隔离库")
    args = ap.parse_args()
    versions = [v.strip() for v in args.versions.split(",") if v.strip()]
    anchor = latest_anchor()
    print(f"锚点 {anchor}，隔离库 topems_window_drill_<pid>", flush=True)
    r = Rehearsal(anchor)
    try:
        report = r.run_all(versions)
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"报告：{args.report}", flush=True)
        if not args.keep:
            run(["dropdb", "--if-exists", "--force", r.db], timeout=180)
            print("隔离库已清理（--keep 可保留）", flush=True)
        return 0
    except AssertionFailure as e:
        print(f"\n!! 预演失败：{e}", flush=True)
        print(f"!! 隔离库保留供排查：{r.db}", flush=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
