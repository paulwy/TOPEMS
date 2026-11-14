-- ============================================================
-- rollback: 20261114190000_forecast_v53_mark_synthetic.sql
--
-- 回滚只撤销"合成标记"本身：删除 is_synthetic 列、恢复表注释为空。
-- 不回滚代码侧行为（无真实历史时拒绝生成预测/精度、读路径过滤合成行）——
-- 那属于缺陷修复，不应随标记一起回退；如需回退代码请走代码回滚。
--
-- 文件内不含 BEGIN/COMMIT：入口统一用 psql --single-transaction 包裹。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '120s';

DO $rb$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'finance_cash_flow_predictions_v53' AND column_name = 'is_synthetic'
    ) THEN
        COMMENT ON COLUMN finance.finance_cash_flow_predictions_v53.is_synthetic IS NULL;
        ALTER TABLE finance.finance_cash_flow_predictions_v53 DROP COLUMN is_synthetic;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'finance_prediction_models_v53' AND column_name = 'is_synthetic'
    ) THEN
        COMMENT ON COLUMN finance.finance_prediction_models_v53.is_synthetic IS NULL;
        ALTER TABLE finance.finance_prediction_models_v53 DROP COLUMN is_synthetic;
    END IF;

    COMMENT ON TABLE finance.finance_cash_flow_predictions_v53 IS NULL;
    COMMENT ON TABLE finance.finance_prediction_models_v53 IS NULL;
END
$rb$;

-- 回滚自检
DO $verify_rb$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name IN ('finance_cash_flow_predictions_v53','finance_prediction_models_v53')
           AND column_name = 'is_synthetic'
    ) THEN
        RAISE EXCEPTION 'rollback ABORT: is_synthetic 列仍存在';
    END IF;
    RAISE NOTICE 'rollback 完成：2 张表的 is_synthetic 列与表注释已移除';
END
$verify_rb$;
