//! AI 文本处理纯计算函数
//!
//! 从以下文件中提取的内联业务逻辑：
//! - `services/qa.rs:463` — `calculate_confidence`（基于答案内容的置信度启发式）
//! - `services/qa.rs:487-502` — 问题分类字符串→枚举映射
//! - `services/embedding.rs:99` — `split_into_chunks`（字符级滑窗分块）
//! - `modules/ai_knowledge/document_processor.rs:366` — `estimate_tokens`、`is_cjk_char`
//! - `services/analysis.rs` — 情感/分类结果置信度钳制、类别分数归一化

use std::collections::HashMap;

// ── 置信度计算 ─────────────────────────────────────

/// 计算回答置信度（启发式）
///
/// 提取自 `services/qa.rs:463-484`
///
/// 规则：
/// - 长度 > 100 字 → 0.8
/// - 长度 > 50 字 → 0.6
/// - 其他 → 0.4
/// - 若包含不确定表达（不知道/不确定/无法/抱歉/没有找到）→ ×0.5
pub fn calculate_confidence(answer: &str) -> f64 {
    let length_score = if answer.len() > 100 {
        0.8
    } else if answer.len() > 50 {
        0.6
    } else {
        0.4
    };

    let uncertainty_phrases = ["不知道", "不确定", "无法", "抱歉", "没有找到"];
    let has_uncertainty = uncertainty_phrases.iter().any(|p| answer.contains(p));

    if has_uncertainty {
        length_score * 0.5
    } else {
        length_score
    }
}

/// 将置信度钳制到合法区间 [0,1]，同时四舍五入到 2 位小数
pub fn clamp_and_round_confidence(c: f64) -> f64 {
    let clamped = if c.is_nan() { 0.0 } else { c.clamp(0.0, 1.0) };
    (clamped * 100.0).round() / 100.0
}

// ── 问题分类映射 ───────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuestionType {
    Factual,
    Procedural,
    Analytical,
    Advisory,
    Confirmation,
    Comparative,
    Predictive,
    Diagnostic,
    Definition,
    Unknown,
}

impl QuestionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Factual => "factual",
            Self::Procedural => "procedural",
            Self::Analytical => "analytical",
            Self::Advisory => "advisory",
            Self::Confirmation => "confirmation",
            Self::Comparative => "comparative",
            Self::Predictive => "predictive",
            Self::Diagnostic => "diagnostic",
            Self::Definition => "definition",
            Self::Unknown => "unknown",
        }
    }
}

/// 将 LLM 返回的分类字符串映射为枚举
///
/// 提取自 `services/qa.rs:491-502`
pub fn classify_question_type(raw: &str) -> QuestionType {
    match raw.trim().to_lowercase().as_str() {
        "factual" => QuestionType::Factual,
        "procedural" => QuestionType::Procedural,
        "analytical" => QuestionType::Analytical,
        "advisory" => QuestionType::Advisory,
        "confirmation" => QuestionType::Confirmation,
        "comparative" => QuestionType::Comparative,
        "predictive" => QuestionType::Predictive,
        "diagnostic" => QuestionType::Diagnostic,
        "definition" => QuestionType::Definition,
        _ => QuestionType::Unknown,
    }
}

// ── 字符级滑窗分块 ─────────────────────────────────

/// 字符级滑窗分块（不依赖 tokenizer）
///
/// 提取自 `services/embedding.rs:99-130`
///
/// - content.len() ≤ chunk_size → 返回 1 块
/// - overlap ≥ chunk_size → step=0，只返回 1 块防死循环
pub fn split_into_chunks(content: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let content_len = content.len();

    if content_len <= chunk_size {
        chunks.push(content.to_string());
        return chunks;
    }

    let chars: Vec<char> = content.chars().collect();
    let char_count = chars.len();
    let mut start = 0;

    while start < char_count {
        let end = std::cmp::min(start + chunk_size, char_count);
        let chunk: String = chars[start..end].iter().collect();
        chunks.push(chunk);

        if end >= char_count {
            break;
        }

        let step = chunk_size.saturating_sub(overlap);
        if step == 0 {
            break;
        }
        start += step;
    }

    chunks
}

// ── Token 估算 ─────────────────────────────────────

/// 判断字符是否为 CJK（中日韩统一字符/标点/全角）
///
/// 提取自 `modules/ai_knowledge/document_processor.rs:382-390`
pub fn is_cjk_char(ch: char) -> bool {
    let code = ch as u32;
    (0x4E00..=0x9FFF).contains(&code)
        || (0x3400..=0x4DBF).contains(&code)
        || (0xF900..=0xFAFF).contains(&code)
        || (0x3000..=0x303F).contains(&code)
        || (0xFF00..=0xFFEF).contains(&code)
}

/// 粗略估算 token 数
///
/// 提取自 `modules/ai_knowledge/document_processor.rs:366-380`
///
/// - CJK：约 0.7 token/字
/// - 其他非空白：约 0.25 token/字
/// - 最小值为 1（空串返回 0）
pub fn estimate_tokens(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    let mut cjk_chars = 0usize;
    let mut other_chars = 0usize;
    for ch in text.chars() {
        if is_cjk_char(ch) {
            cjk_chars += 1;
        } else if !ch.is_whitespace() {
            other_chars += 1;
        }
    }
    let cjk_tokens = (cjk_chars as f64 * 0.7).ceil() as usize;
    let other_tokens = (other_chars as f64 / 4.0).ceil() as usize;
    (cjk_tokens + other_tokens).max(1)
}

// ── 类别分数归一化 (softmax-ish) ──────────────────

/// 将一组类别分数归一化为和为 1.0 的概率分布
///
/// 使用数值稳定的 softmax：各分数减去最大值后再 exp → 归一化
pub fn softmax_normalize(scores: &[f64]) -> Vec<f64> {
    if scores.is_empty() {
        return Vec::new();
    }
    let max_s = scores.iter().fold(f64::NEG_INFINITY, |a, &b| {
        a.max(if b.is_finite() { b } else { f64::NEG_INFINITY })
    });
    if !max_s.is_finite() {
        let n = scores.len();
        return vec![1.0 / n as f64; n];
    }
    let exps: Vec<f64> = scores.iter().map(|s| (s - max_s).exp()).collect();
    let sum: f64 = exps.iter().sum();
    if sum == 0.0 {
        let n = scores.len();
        return vec![1.0 / n as f64; n];
    }
    exps.iter().map(|e| e / sum).collect()
}

// ── 简单关键词提取（词频前 N） ─────────────────────

pub struct KeywordScore {
    pub keyword: String,
    pub score: f64,
}

/// 对一组 token 进行简单 TF 评分，并取 Top-N（停用词过滤）
pub fn extract_top_keywords(
    tokens: &[String],
    stop_words: &[&str],
    top_n: usize,
) -> Vec<KeywordScore> {
    let mut tf: HashMap<String, usize> = HashMap::new();
    for t in tokens {
        let lower = t.to_lowercase();
        if lower.chars().count() < 2 {
            continue;
        }
        if stop_words.iter().any(|s| s.eq_ignore_ascii_case(&lower)) {
            continue;
        }
        *tf.entry(lower).or_insert(0) += 1;
    }
    let total = tf.values().sum::<usize>() as f64;
    let mut scored: Vec<KeywordScore> = tf
        .into_iter()
        .map(|(k, c)| KeywordScore {
            keyword: k,
            score: if total > 0.0 { c as f64 / total } else { 0.0 },
        })
        .collect();
    scored.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    if top_n > 0 {
        scored.truncate(top_n);
    }
    scored
}

// ── 情感分数映射 ───────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SentimentLabel {
    Positive,
    Negative,
    Neutral,
    Unknown,
}

impl SentimentLabel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Positive => "positive",
            Self::Negative => "negative",
            Self::Neutral => "neutral",
            Self::Unknown => "unknown",
        }
    }
}

/// 将 LLM 返回的情感字符串映射为枚举
pub fn parse_sentiment_label(raw: &str) -> SentimentLabel {
    match raw.trim().to_lowercase().as_str() {
        "positive" | "正面" | "积极" => SentimentLabel::Positive,
        "negative" | "负面" | "消极" => SentimentLabel::Negative,
        "neutral" | "中性" => SentimentLabel::Neutral,
        _ => SentimentLabel::Unknown,
    }
}

/// 清理 LLM 返回的 JSON 代码块包裹：移除 ```json ... ```
pub fn strip_code_fences(text: &str) -> String {
    let t = text.trim();
    let t = t
        .strip_prefix("```json")
        .or_else(|| t.strip_prefix("```JSON"))
        .unwrap_or(t);
    let t = t.strip_suffix("```").unwrap_or(t);
    t.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── calculate_confidence ───────────────────

    #[test]
    fn test_confidence_long_answer_08() {
        // len() 为字节数，中文每个字约 3 字节。确保 > 100 字节
        let ans = "这是一个非常详细且充分的完整解答，其中包含了多个不同方面的详尽说明与细节描述。";
        assert!(ans.len() > 100, "len={}", ans.len());
        assert!((calculate_confidence(ans) - 0.8).abs() < 1e-6);
    }

    #[test]
    fn test_confidence_medium_06() {
        // 确保 50 < len() <= 100 字节
        let ans = "此答案中包含了若干有用的信息内容与说明文字。";
        assert!(ans.len() > 50 && ans.len() <= 100, "len={}", ans.len());
        assert!((calculate_confidence(ans) - 0.6).abs() < 1e-6);
    }

    #[test]
    fn test_confidence_short_04() {
        let ans = "好的";
        assert!((calculate_confidence(ans) - 0.4).abs() < 1e-6);
    }

    #[test]
    fn test_confidence_uncertainty_halved() {
        let ans = "抱歉，我不确定这个问题的答案。"; // 含"抱歉"+"不确定"，长度约 20 → 0.4 * 0.5
        assert!((calculate_confidence(ans) - 0.2).abs() < 1e-6);
    }

    #[test]
    fn test_clamp_confidence_nan() {
        assert_eq!(clamp_and_round_confidence(f64::NAN), 0.0);
    }

    #[test]
    fn test_clamp_confidence_over_1() {
        assert_eq!(clamp_and_round_confidence(1.5), 1.0);
    }

    #[test]
    fn test_clamp_confidence_rounding() {
        assert_eq!(clamp_and_round_confidence(0.7851), 0.79);
    }

    // ── classify_question_type ─────────────────

    #[test]
    fn test_qt_roundtrip_all() {
        for label in [
            "factual",
            "procedural",
            "analytical",
            "advisory",
            "confirmation",
            "comparative",
            "predictive",
            "diagnostic",
            "definition",
        ] {
            assert_eq!(classify_question_type(label).as_str(), label);
        }
    }

    #[test]
    fn test_qt_unknown_default() {
        assert_eq!(
            classify_question_type("something_else"),
            QuestionType::Unknown
        );
    }

    #[test]
    fn test_qt_case_insensitive_with_whitespace() {
        assert_eq!(
            classify_question_type("  Factual \n"),
            QuestionType::Factual
        );
    }

    // ── split_into_chunks ──────────────────────

    #[test]
    fn test_chunk_small_no_split() {
        let c = "hello";
        let r = split_into_chunks(c, 100, 10);
        assert_eq!(r.len(), 1);
        assert_eq!(r[0], "hello");
    }

    #[test]
    fn test_chunk_split_with_overlap() {
        // 10 字符，chunk_size=4, overlap=1
        let s: String = "abcdefghij".chars().collect();
        let r = split_into_chunks(&s, 4, 1);
        // start 0: abcd → step=3 → start 3: defg → step=3 → start 6: ghij
        assert_eq!(r.len(), 3);
        assert_eq!(r[0], "abcd");
        assert_eq!(r[1], "defg");
        assert_eq!(r[2], "ghij");
    }

    #[test]
    fn test_chunk_overlap_equals_size_returns_one() {
        let s = "abcdef";
        let r = split_into_chunks(s, 3, 3); // step=0 → 只 1 块
        assert_eq!(r.len(), 1);
    }

    #[test]
    fn test_chunk_cjk_preserves_chars() {
        let s = "你好世界你好世界";
        let r = split_into_chunks(s, 4, 0);
        assert_eq!(r.len(), 2);
        assert_eq!(r[0], "你好世界");
        assert_eq!(r[1], "你好世界");
    }

    // ── estimate_tokens & is_cjk ───────────────

    #[test]
    fn test_empty_tokens_zero() {
        assert_eq!(estimate_tokens(""), 0);
    }

    #[test]
    fn test_whitespace_only_min_1() {
        let r = estimate_tokens("   \n  ");
        // 没有 cjk，也没有 other_chars → 0+0，但 max(1)
        assert_eq!(r, 1);
    }

    #[test]
    fn test_cjk_all() {
        // 4 个汉字 * 0.7 ≈ 2.8 → ceil = 3
        let r = estimate_tokens("你好世界");
        assert_eq!(r, 3);
    }

    #[test]
    fn test_latin_only() {
        // "hello world" = 10 non-whitespace chars / 4 = 2.5 → ceil 3
        let r = estimate_tokens("hello world");
        assert_eq!(r, 3);
    }

    #[test]
    fn test_is_cjk_basic_hz() {
        assert!(is_cjk_char('中'));
        assert!(is_cjk_char('文'));
    }

    #[test]
    fn test_is_cjk_fullwidth() {
        assert!(is_cjk_char('，'));
        assert!(is_cjk_char('。'));
    }

    #[test]
    fn test_is_cjk_english_no() {
        assert!(!is_cjk_char('a'));
        assert!(!is_cjk_char('1'));
    }

    // ── softmax_normalize ──────────────────────

    #[test]
    fn test_softmax_uniform() {
        let r = softmax_normalize(&[0.0, 0.0, 0.0]);
        assert!((r[0] - 1.0 / 3.0).abs() < 1e-6);
        assert!((r.iter().sum::<f64>() - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_softmax_biased() {
        // [1000, 1001, 1002] 数值稳定性测试
        let r = softmax_normalize(&[1000.0, 1001.0, 1002.0]);
        assert!((r.iter().sum::<f64>() - 1.0).abs() < 1e-6);
        assert!(r[2] > r[1] && r[1] > r[0]);
    }

    #[test]
    fn test_softmax_empty() {
        assert_eq!(softmax_normalize(&[]), Vec::<f64>::new());
    }

    // ── extract_top_keywords ───────────────────

    #[test]
    fn test_keywords_frequency_order() {
        let tokens: Vec<String> = "apple banana apple cherry apple banana"
            .split_whitespace()
            .map(|s| s.into())
            .collect();
        let r = extract_top_keywords(&tokens, &[], 2);
        assert_eq!(r.len(), 2);
        assert_eq!(r[0].keyword, "apple");
        assert_eq!(r[1].keyword, "banana");
    }

    #[test]
    fn test_keywords_stopwords_filtered() {
        let tokens: Vec<String> = "the apple the banana"
            .split_whitespace()
            .map(|s| s.into())
            .collect();
        let r = extract_top_keywords(&tokens, &["the"], 10);
        assert!(!r.iter().any(|k| k.keyword == "the"));
    }

    // ── parse_sentiment_label & strip_code_fences

    #[test]
    fn test_sentiment_parse_english() {
        assert_eq!(parse_sentiment_label("positive"), SentimentLabel::Positive);
        assert_eq!(parse_sentiment_label("NEGATIVE"), SentimentLabel::Negative);
        assert_eq!(parse_sentiment_label("neutral"), SentimentLabel::Neutral);
    }

    #[test]
    fn test_sentiment_parse_chinese() {
        assert_eq!(parse_sentiment_label("正面"), SentimentLabel::Positive);
        assert_eq!(parse_sentiment_label("消极"), SentimentLabel::Negative);
        assert_eq!(parse_sentiment_label("中性"), SentimentLabel::Neutral);
    }

    #[test]
    fn test_sentiment_unknown() {
        assert_eq!(parse_sentiment_label("happy"), SentimentLabel::Unknown);
    }

    #[test]
    fn test_strip_code_fences_json() {
        let s = "```json\n{\"a\":1}\n```";
        assert_eq!(strip_code_fences(s), "{\"a\":1}");
    }

    #[test]
    fn test_strip_no_fence_passthrough() {
        assert_eq!(strip_code_fences("hello"), "hello");
    }
}
