//! LIMS→EHS 业务事件的落库编号（幂等键）。
//!
//! 单一实现：integration 编排路径与 ehs 侧订阅 handler 共用，避免两条写入路径
//! 各自造编号导致同一事件写出多行、且互不收敛。

use uuid::Uuid;

const FNV_OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

/// FNV-1a 64 位：常量固定、无随机化种子，跨进程与跨 Rust 版本稳定。
///
/// 不使用 `DefaultHasher`：其算法不保证跨版本稳定，不能用于持久化幂等键。
pub fn fnv1a_64(bytes: &[u8]) -> u64 {
    let mut hash = FNV_OFFSET_BASIS;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(FNV_PRIME);
    }
    hash
}

/// FNV-1a 64 位的低 32 位，输出定长 8 位小写十六进制。
pub fn fnv1a_64_hex8(input: &str) -> String {
    let hex = format!("{:016x}", fnv1a_64(input.as_bytes()));
    hex.get(8..).unwrap_or_default().to_string()
}

/// LIMS 检测异常 → EHS 隐患的确定性编号（幂等键）。
///
/// 该事件 payload 不含 inspection_no；`task_no` 是 varchar(64) 的可变文本，
/// 加前缀后可能超过 `ehs.qa_ehs_hazards.hazard_no` 的 64 字符上限。因此改用有界的
/// `task_id`（UUID，全局唯一），并用 `test_item` 的短摘要区分同一任务下的多个
/// 异常检测项，避免不同检测项被 `ON CONFLICT` 合并覆盖。
///
/// 同一 `task_id` + 同一 `test_item`（trim 后）恒等；整体长度 54 字符（9 + 36 + 1 + 8）。
pub fn lims_abnormal_hazard_no(task_id: Uuid, test_item: &str) -> String {
    format!("HAZ-LIMS-{task_id}-{}", fnv1a_64_hex8(test_item.trim()))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 固定向量锁定算法：任何实现改动都必须让本测试失败，保证跨版本可复现。
    #[test]
    fn fnv1a_64_matches_published_vectors() {
        assert_eq!(fnv1a_64(b""), 0xcbf2_9ce4_8422_2325);
        assert_eq!(fnv1a_64(b"a"), 0xaf63_dc4c_8601_ec8c);
        assert_eq!(fnv1a_64(b"foobar"), 0x8594_4171_f739_67e8);
        assert_eq!(fnv1a_64_hex8(""), "84222325");
        assert_eq!(fnv1a_64_hex8("a"), "8601ec8c");
        assert_eq!(fnv1a_64_hex8("foobar"), "f73967e8");
    }

    /// 编号确定性、有界、ASCII；同一任务下不同检测项不合并。
    #[test]
    fn hazard_no_is_stable_bounded_and_item_scoped() {
        let task_id = Uuid::from_u128(0x1111_1111_2222_3333_4444_5555_5555_5555);
        let items = [
            "外观检查",
            "尺寸测量",
            "性能测试",
            "重金属检测",
            "微生物限度",
            "pH 值",
            "水分",
            "含量测定",
            "崩解时限",
            "溶出度",
        ];

        let mut keys = Vec::new();
        for item in items {
            let key = lims_abnormal_hazard_no(task_id, item);
            assert_eq!(key, lims_abnormal_hazard_no(task_id, item), "{key} 应恒等");
            assert_eq!(key, lims_abnormal_hazard_no(task_id, &format!(" {item} ")));
            assert!(key.is_ascii(), "{key}");
            assert!(key.len() <= 64, "{key} 长度 {} 超限", key.len());
            assert!(key.starts_with("HAZ-LIMS-"), "{key}");
            keys.push(key);
        }

        let mut unique = keys.clone();
        unique.sort();
        unique.dedup();
        assert_eq!(
            unique.len(),
            items.len(),
            "同一任务下不同 test_item 不得碰撞"
        );

        // 同一检测项、不同任务必须区分（任务维度独立）。
        let other_task = Uuid::from_u128(0x9999_9999_8888_7777_6666_5555_5555_5555);
        assert_ne!(
            lims_abnormal_hazard_no(task_id, "外观检查"),
            lims_abnormal_hazard_no(other_task, "外观检查")
        );
    }
}
