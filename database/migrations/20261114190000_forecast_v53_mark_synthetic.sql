-- ============================================================
-- 20261114190000_forecast_v53_mark_synthetic.sql
--
-- 背景（prod 只读核实 2026-11-14）：
--   finance.finance_cash_flow_predictions_v53、finance.finance_prediction_models_v53
--   在生产库均为 0 行；三者中只有这两张表的行可能来自"合成历史"。
--
--   旧实现（svc/finance/src/modules/forecast_v53.rs）在取不到真实历史凭证时：
--     1. fetch_historical_data() 静默返回 generate_synthetic_history() 生成的 12 个月序列
--        （500_000 起步 + 正弦季节项 + 正弦噪声），预测因此"看起来正常"并落库；
--     2. retrain 的精度 compute_retrain_accuracy() 无条件用同一合成序列计算；
--     3. get_accuracy() 在无模型时返回硬编码 overall_accuracy=0.85 / sample_count=120。
--   结果是把合成数据包装成可信预测与可信精度，属于"不可用于决策"的数据。
--
-- 本次变更（只标记 + 服务层拒绝，不删任何数据）：
--   1. 两张表新增 is_synthetic boolean：
--        * 默认值 true（fail-closed：来源未证明为真的行默认按合成/不可信处理）；
--        * 既有行回填为 true（来源不可考，不得冒充真实预测）；
--        * NOT NULL。
--   2. 表注释与列注释写明"含合成数据 / 不可用于决策"。
--   3. finance.finance_budget_variances_v53 不在本迁移范围：其行来自请求传入的
--      预算与实际数，不是本模块合成生成；如需同类标记另行立项。
--
-- 代码侧配套（同批提交）：
--   * 无真实历史时 predict / retrain 直接返回明确错误，不再生成合成行；
--   * 写入预测与模型时显式 is_synthetic = false；
--   * 读路径（get_predictions / get_accuracy）只返回 is_synthetic = false 的行；
--   * 删除 get_accuracy 的 0.85 假精度兜底。
--
-- 幂等性：ADD COLUMN IF NOT EXISTS + 可重复的 UPDATE / SET DEFAULT / SET NOT NULL。
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

-- ------------------------------------------------------------
-- 1. 加列（既有行由 NOT NULL DEFAULT true 回填，不做 UPDATE 扫描）
-- ------------------------------------------------------------
DO $add_cols$
DECLARE
    v_tbl text;
    v_tables text[] := ARRAY[
        'finance_cash_flow_predictions_v53',
        'finance_prediction_models_v53'
    ];
BEGIN
    FOREACH v_tbl IN ARRAY v_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'finance' AND table_name = v_tbl AND column_name = 'is_synthetic'
        ) THEN
            EXECUTE format(
                'ALTER TABLE finance.%I ADD COLUMN is_synthetic boolean NOT NULL DEFAULT true',
                v_tbl);
            RAISE NOTICE 'finance.% 新增 is_synthetic NOT NULL DEFAULT true（既有行按默认值回填为 true）', v_tbl;
        ELSE
            -- 幂等：列已存在时只补默认值与 NOT NULL；若存在 NULL 行，SET NOT NULL 直接报错中止，
            -- 不静默回填冒充真实数据。
            EXECUTE format('ALTER TABLE finance.%I ALTER COLUMN is_synthetic SET DEFAULT true', v_tbl);
            EXECUTE format('ALTER TABLE finance.%I ALTER COLUMN is_synthetic SET NOT NULL', v_tbl);
        END IF;
    END LOOP;
END
$add_cols$;

-- ------------------------------------------------------------
-- 2. 注释：合成数据、不可用于决策
-- ------------------------------------------------------------
COMMENT ON COLUMN finance.finance_cash_flow_predictions_v53.is_synthetic IS
$c$合成数据标记。true = 该行由 forecast_v53 在缺少真实历史凭证时用合成序列生成（或来源不可考），不可当作真实预测用于决策；服务层读路径只返回 false 的行。$c$;

COMMENT ON COLUMN finance.finance_prediction_models_v53.is_synthetic IS
$c$合成数据标记。true = 该模型的精度来自合成样本（或来源不可考），不可当作真实精度用于决策；服务层读路径只返回 false 的行。$c$;

COMMENT ON TABLE finance.finance_cash_flow_predictions_v53 IS
$c$Forecast V53 现金流预测。含合成数据：is_synthetic=true 的行不可用于决策（合成数据、不可用于决策）。$c$;

COMMENT ON TABLE finance.finance_prediction_models_v53 IS
$c$Forecast V53 预测模型精度。含合成数据：is_synthetic=true 的模型精度不可用于决策（合成数据、不可用于决策）。$c$;

-- ------------------------------------------------------------
-- 3. 形状自检
-- ------------------------------------------------------------
DO $verify$
DECLARE
    v_tbl text;
    v_tables text[] := ARRAY[
        'finance_cash_flow_predictions_v53',
        'finance_prediction_models_v53'
    ];
    v_null_cnt bigint;
    v_default text;
    v_notnull boolean;
BEGIN
    FOREACH v_tbl IN ARRAY v_tables
    LOOP
        SELECT column_default, is_nullable = 'NO'
          INTO v_default, v_notnull
          FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = v_tbl AND column_name = 'is_synthetic';

        IF v_default IS NULL OR v_default NOT LIKE 'true%' THEN
            RAISE EXCEPTION 'forecast-v53-synthetic ABORT: finance.% is_synthetic 默认值=%（期望 true）', v_tbl, v_default;
        END IF;

        IF NOT coalesce(v_notnull, false) THEN
            RAISE EXCEPTION 'forecast-v53-synthetic ABORT: finance.% is_synthetic 未设置 NOT NULL', v_tbl;
        END IF;

        EXECUTE format('SELECT count(*) FROM finance.%I WHERE is_synthetic IS NULL', v_tbl)
           INTO v_null_cnt;
        IF v_null_cnt <> 0 THEN
            RAISE EXCEPTION 'forecast-v53-synthetic ABORT: finance.% 仍有 % 行 is_synthetic 为 NULL', v_tbl, v_null_cnt;
        END IF;
    END LOOP;

    RAISE NOTICE 'forecast-v53-synthetic 自检通过：2 张表 is_synthetic NOT NULL DEFAULT true，无 NULL 行';
END
$verify$;
