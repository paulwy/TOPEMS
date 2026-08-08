//! AI 知识库 - 文档处理器
//!
//! 提供文档解析、分块、向量化能力：
//! - `parse_document`：根据 doc_type 解析文档为纯文本
//! - `chunk_document`：按 token 数分块（保留段落完整性，支持重叠）
//! - `generate_embedding`：调用 AI 客户端生成向量（带重试）

use std::sync::Arc;

use regex::Regex;
use topems_shared_ai::ai_client::{AIClientError, UnifiedAIClient};

/// 文档处理错误
#[derive(Debug)]
pub enum ProcessorError {
    ParseError(String),
    EmbeddingError(String),
    InvalidInput(String),
}

impl std::fmt::Display for ProcessorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessorError::ParseError(msg) => write!(f, "文档解析失败: {}", msg),
            ProcessorError::EmbeddingError(msg) => write!(f, "向量生成失败: {}", msg),
            ProcessorError::InvalidInput(msg) => write!(f, "无效输入: {}", msg),
        }
    }
}

impl std::error::Error for ProcessorError {}

impl From<AIClientError> for ProcessorError {
    fn from(e: AIClientError) -> Self {
        ProcessorError::EmbeddingError(e.to_string())
    }
}

/// 文档分块结果
#[derive(Debug, Clone)]
pub struct Chunk {
    pub content: String,
    pub token_count: usize,
    pub chunk_index: usize,
}

/// 默认分块大小（token 数）
pub const DEFAULT_CHUNK_SIZE: usize = 500;
/// 默认分块重叠（token 数）
pub const DEFAULT_CHUNK_OVERLAP: usize = 50;
/// embedding 最大重试次数
const EMBEDDING_MAX_RETRIES: usize = 2;

// ============================================================
// 文档解析
// ============================================================

/// 根据文档类型解析文档内容为纯文本
///
/// 支持类型：txt / md / pdf / docx / html
/// - txt/md：直接返回内容
/// - pdf：使用 pdf-extract 提取文本
/// - docx：使用 zip 解析 word/document.xml 提取文本
/// - html：去除标签提取纯文本
pub fn parse_document(doc_type: &str, content: &[u8]) -> Result<String, ProcessorError> {
    let doc_type = doc_type.to_lowercase();
    match doc_type.as_str() {
        "txt" | "md" | "markdown" => parse_text(content),
        "pdf" => parse_pdf(content),
        "docx" => parse_docx(content),
        "html" | "htm" => parse_html(content),
        other => Err(ProcessorError::InvalidInput(format!(
            "不支持的文档类型: {}",
            other
        ))),
    }
}

fn parse_text(content: &[u8]) -> Result<String, ProcessorError> {
    String::from_utf8(content.to_vec())
        .map_err(|e| ProcessorError::ParseError(format!("UTF-8 解码失败: {}", e)))
}

fn parse_pdf(content: &[u8]) -> Result<String, ProcessorError> {
    // 使用 pdf-extract 提取文本
    // 注意：pdf-extract 的 output_pdf 函数接收 &[u8]，从内存中解析
    let text = pdf_extract::extract_text_from_mem(content)
        .map_err(|e| ProcessorError::ParseError(format!("PDF 解析失败: {}", e)))?;
    Ok(clean_extracted_text(&text))
}

fn parse_docx(content: &[u8]) -> Result<String, ProcessorError> {
    use std::io::Cursor;
    use zip::ZipArchive;

    if content.len() < 4 {
        return Err(ProcessorError::ParseError("docx 文件内容过短".to_string()));
    }
    if &content[0..2] != b"PK" {
        return Err(ProcessorError::ParseError(
            "无效的 docx 文件（缺少 ZIP 魔数头）".to_string(),
        ));
    }

    let reader = Cursor::new(content);
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| ProcessorError::ParseError(format!("ZIP 解压失败: {}", e)))?;

    let doc_xml = archive.by_name("word/document.xml").map_err(|e| {
        ProcessorError::ParseError(format!("docx 文件中未找到 word/document.xml: {}", e))
    })?;

    let text = extract_text_from_docx_xml(doc_xml)?;
    Ok(clean_extracted_text(&text))
}

fn extract_text_from_docx_xml<R: std::io::Read>(mut reader: R) -> Result<String, ProcessorError> {
    let mut xml_content = String::new();
    reader
        .read_to_string(&mut xml_content)
        .map_err(|e| ProcessorError::ParseError(format!("读取 document.xml 失败: {}", e)))?;

    let mut result = String::new();
    let mut in_text = false;
    let mut chars = xml_content.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '<' {
            let mut tag = String::new();
            while let Some(&c) = chars.peek() {
                if c == '>' {
                    chars.next();
                    break;
                }
                tag.push(c);
                chars.next();
            }

            let tag_lower = tag.to_lowercase();
            if tag_lower.starts_with("w:t") || tag_lower.starts_with("w:t ") {
                in_text = true;
            } else if tag_lower.starts_with("/w:t") {
                in_text = false;
            } else if tag_lower.starts_with("w:p") || tag_lower.starts_with("/w:p") {
                result.push('\n');
            } else if tag_lower.starts_with("w:br") || tag_lower.starts_with("w:br ") {
                result.push('\n');
            } else if tag_lower.starts_with("w:tab") || tag_lower.starts_with("w:tab ") {
                result.push('\t');
            }
        } else if in_text {
            result.push(ch);
        }
    }

    Ok(result)
}

fn parse_html(content: &[u8]) -> Result<String, ProcessorError> {
    let html = String::from_utf8(content.to_vec())
        .map_err(|e| ProcessorError::ParseError(format!("UTF-8 解码失败: {}", e)))?;
    Ok(strip_html_tags(&html))
}

/// 去除 HTML 标签，提取纯文本
fn strip_html_tags(html: &str) -> String {
    // 移除 script/style 块及其内容
    let script_re = Regex::new(r"(?is)<(script|style)[^>]*>.*?</\1>")
        .expect("hardcoded regex should always compile");
    let html = script_re.replace_all(html, "");

    // 移除 HTML 注释
    let comment_re = Regex::new(r"(?s)<!--.*?-->").expect("hardcoded regex should always compile");
    let html = comment_re.replace_all(&html, "");

    // 移除所有 HTML 标签
    let tag_re = Regex::new(r"<[^>]+>").expect("hardcoded regex should always compile");
    let text = tag_re.replace_all(&html, " ");

    // 解码常见 HTML 实体
    let text = text
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'");

    // 折叠多余空白
    clean_extracted_text(&text)
}

/// 清理提取的文本：折叠多余空白、去除非打印字符
fn clean_extracted_text(text: &str) -> String {
    // 将连续空白（含换行）压缩为单个空格，但保留段落换行
    let paragraphs: Vec<String> = text
        .split('\n')
        .map(|line| {
            line.split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
                .trim()
                .to_string()
        })
        .filter(|line| !line.is_empty())
        .collect();
    paragraphs.join("\n")
}

// ============================================================
// 文档分块
// ============================================================

/// 将文档分块
///
/// # 参数
/// - `content`：文档纯文本
/// - `chunk_size`：每个分块的目标 token 数（默认 500）
/// - `overlap`：分块间重叠 token 数（默认 50）
///
/// # 策略
/// 1. 按段落（双换行）切分，保留段落完整性
/// 2. 累积段落直至达到 chunk_size
/// 3. 若单个段落超过 chunk_size，则按句子进一步切分
/// 4. 下一个分块从 overlap 个 token 之前开始
pub fn chunk_document(
    content: &str,
    chunk_size: Option<usize>,
    overlap: Option<usize>,
) -> Vec<Chunk> {
    let chunk_size = chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE).max(50);
    let overlap = overlap.unwrap_or(DEFAULT_CHUNK_OVERLAP).min(chunk_size / 2);

    let paragraphs: Vec<&str> = content
        .split("\n\n")
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .collect();

    if paragraphs.is_empty() {
        return Vec::new();
    }

    let mut chunks: Vec<Chunk> = Vec::new();
    let mut current_tokens: Vec<String> = Vec::new();
    let mut current_count: usize = 0;

    for paragraph in paragraphs {
        let para_tokens = estimate_tokens(paragraph);

        // 段落本身超过 chunk_size：按句子切分
        if para_tokens > chunk_size {
            // 先把已累积的清空为一个分块
            if !current_tokens.is_empty() {
                push_chunk(&mut chunks, &current_tokens, &mut current_count);
                // 准备 overlap
                apply_overlap(&mut current_tokens, overlap);
                current_count = current_tokens.iter().map(|s| estimate_tokens(s)).sum();
            }

            for sentence in split_sentences(paragraph) {
                let sent_tokens = estimate_tokens(&sentence);
                if current_count + sent_tokens > chunk_size && !current_tokens.is_empty() {
                    push_chunk(&mut chunks, &current_tokens, &mut current_count);
                    apply_overlap(&mut current_tokens, overlap);
                    current_count = current_tokens.iter().map(|s| estimate_tokens(s)).sum();
                }
                current_tokens.push(sentence);
                current_count += sent_tokens;
            }
            continue;
        }

        // 累积段落
        if current_count + para_tokens > chunk_size && !current_tokens.is_empty() {
            push_chunk(&mut chunks, &current_tokens, &mut current_count);
            apply_overlap(&mut current_tokens, overlap);
            current_count = current_tokens.iter().map(|s| estimate_tokens(s)).sum();
        }
        current_tokens.push(paragraph.to_string());
        current_count += para_tokens;
    }

    // 收尾：剩余内容作为最后一个分块
    if !current_tokens.is_empty() {
        let content_str = current_tokens.join("\n\n");
        let token_count = estimate_tokens(&content_str);
        let chunk_index = chunks.len();
        chunks.push(Chunk {
            content: content_str,
            token_count,
            chunk_index,
        });
    }

    chunks
}

fn push_chunk(chunks: &mut Vec<Chunk>, tokens: &[String], _current_count: &mut usize) {
    if tokens.is_empty() {
        return;
    }
    let content_str = tokens.join("\n\n");
    let token_count = estimate_tokens(&content_str);
    let chunk_index = chunks.len();
    chunks.push(Chunk {
        content: content_str,
        token_count,
        chunk_index,
    });
}

/// 对分块进行 overlap 处理：保留最后 N 个 token 的内容作为下一个分块的开头
fn apply_overlap(tokens: &mut Vec<String>, overlap: usize) {
    if overlap == 0 || tokens.is_empty() {
        tokens.clear();
        return;
    }
    let mut kept: Vec<String> = Vec::new();
    let mut kept_tokens = 0usize;
    // 从后往前累积，直到达到 overlap
    for s in tokens.iter().rev() {
        if kept_tokens >= overlap {
            break;
        }
        let t = estimate_tokens(s);
        kept_tokens += t;
        kept.push(s.clone());
    }
    kept.reverse();
    *tokens = kept;
}

/// 简单的句子切分（按中英文句号/问号/叹号切分）
fn split_sentences(text: &str) -> Vec<String> {
    let re = Regex::new(r"[。！？.!?]").expect("hardcoded regex should always compile");
    let mut sentences = Vec::new();
    let mut last = 0;
    for mat in re.find_iter(text) {
        let end = mat.end();
        let sentence = text[last..end].trim();
        if !sentence.is_empty() {
            sentences.push(sentence.to_string());
        }
        last = end;
    }
    if last < text.len() {
        let tail = text[last..].trim();
        if !tail.is_empty() {
            sentences.push(tail.to_string());
        }
    }
    if sentences.is_empty() {
        sentences.push(text.to_string());
    }
    sentences
}

/// 粗略估算 token 数
///
/// 启发式规则：
/// - 英文：约 4 个字符 = 1 token
/// - 中文：约 1.5 个字符 = 1 token（汉字通常为 1-2 token）
/// - 混合：按字符类型加权
pub fn estimate_tokens(text: &str) -> usize {
    let mut cjk_chars = 0usize;
    let mut other_chars = 0usize;
    for ch in text.chars() {
        if is_cjk_char(ch) {
            cjk_chars += 1;
        } else if !ch.is_whitespace() {
            other_chars += 1;
        }
    }
    // CJK: ~0.7 token/char（向上取整），Latin: ~0.25 token/char
    let cjk_tokens = (cjk_chars as f64 * 0.7).ceil() as usize;
    let other_tokens = (other_chars as f64 / 4.0).ceil() as usize;
    (cjk_tokens + other_tokens).max(1)
}

fn is_cjk_char(ch: char) -> bool {
    let code = ch as u32;
    // CJK 统一表意文字基本区 + 扩展A + 兼容表意文字
    (0x4E00..=0x9FFF).contains(&code)
        || (0x3400..=0x4DBF).contains(&code)
        || (0xF900..=0xFAFF).contains(&code)
        || (0x3000..=0x303F).contains(&code) // CJK 标点
        || (0xFF00..=0xFFEF).contains(&code) // 全角字符
}

// ============================================================
// 向量生成
// ============================================================

/// 调用 AI 客户端生成向量
///
/// 失败时自动重试，最多重试 `EMBEDDING_MAX_RETRIES` 次
pub async fn generate_embedding(
    ai_client: &Arc<UnifiedAIClient>,
    text: &str,
) -> Result<Vec<f32>, ProcessorError> {
    if text.trim().is_empty() {
        return Err(ProcessorError::InvalidInput(
            "生成向量的文本不能为空".to_string(),
        ));
    }

    let mut last_err: Option<AIClientError> = None;
    for attempt in 0..=EMBEDDING_MAX_RETRIES {
        match ai_client.embed(text).await {
            Ok(vec) => return Ok(vec),
            Err(e) => {
                tracing::warn!(
                    "[AiKnowledge] embedding 第 {} 次尝试失败: {}",
                    attempt + 1,
                    e
                );
                last_err = Some(e);
                // 短暂退避
                if attempt < EMBEDDING_MAX_RETRIES {
                    tokio::time::sleep(std::time::Duration::from_millis(200 * (1u64 << attempt)))
                        .await;
                }
            }
        }
    }

    Err(ProcessorError::EmbeddingError(
        last_err
            .map(|e| e.to_string())
            .unwrap_or_else(|| "未知 embedding 错误".to_string()),
    ))
}

/// 批量生成向量
pub async fn generate_embeddings(
    ai_client: &Arc<UnifiedAIClient>,
    texts: &[String],
) -> Result<Vec<Vec<f32>>, ProcessorError> {
    if texts.is_empty() {
        return Ok(Vec::new());
    }

    let mut last_err: Option<AIClientError> = None;
    for attempt in 0..=EMBEDDING_MAX_RETRIES {
        match ai_client.embed_batch(texts).await {
            Ok(vectors) => return Ok(vectors),
            Err(e) => {
                tracing::warn!(
                    "[AiKnowledge] batch embedding 第 {} 次尝试失败: {}",
                    attempt + 1,
                    e
                );
                last_err = Some(e);
                if attempt < EMBEDDING_MAX_RETRIES {
                    tokio::time::sleep(std::time::Duration::from_millis(200 * (1u64 << attempt)))
                        .await;
                }
            }
        }
    }

    Err(ProcessorError::EmbeddingError(
        last_err
            .map(|e| e.to_string())
            .unwrap_or_else(|| "未知 embedding 错误".to_string()),
    ))
}

// ============================================================
// pgvector 文本格式序列化
// ============================================================

/// 将向量序列化为 pgvector 接受的文本格式
///
/// pgvector 的 vector 类型在 SQL 中以 `'[0.1,0.2,...]'` 格式表示。
/// 由于本项目未引入 pgvector Rust SDK，此处序列化为字符串后
/// 通过 `bind(text)` 绑定到 SQL，并使用 `::vector` 强制转换。
pub fn vector_to_pgvector_string(vector: &[f32]) -> String {
    let inner: Vec<String> = vector.iter().map(|v| v.to_string()).collect();
    format!("[{}]", inner.join(","))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_html_tags() {
        let html = "<html><body><h1>Title</h1><p>Hello <b>World</b></p></body></html>";
        let text = strip_html_tags(html);
        assert!(text.contains("Title"));
        assert!(text.contains("Hello"));
        assert!(text.contains("World"));
        assert!(!text.contains("<"));
    }

    #[test]
    fn test_strip_html_with_script() {
        let html = "<p>text</p><script>alert('x')</script><style>.a{}</style><p>more</p>";
        let text = strip_html_tags(html);
        assert!(text.contains("text"));
        assert!(text.contains("more"));
        assert!(!text.contains("alert"));
        assert!(!text.contains(".a{}"));
    }

    #[test]
    fn test_estimate_tokens_cjk() {
        let tokens = estimate_tokens("你好世界");
        assert!(tokens >= 2);
    }

    #[test]
    fn test_estimate_tokens_english() {
        let tokens = estimate_tokens("hello world from rust");
        assert!(tokens >= 5);
    }

    #[test]
    fn test_chunk_document_small() {
        let content = "This is paragraph one.\n\nThis is paragraph two.";
        let chunks = chunk_document(content, Some(100), Some(10));
        assert!(!chunks.is_empty());
        assert!(chunks[0].content.contains("paragraph one"));
    }

    #[test]
    fn test_chunk_document_large() {
        // 生成一个长文档
        let para: String = "这是一个测试段落。".repeat(50);
        let content = format!("{}\n\n{}", para, para);
        let chunks = chunk_document(&content, Some(50), Some(10));
        assert!(chunks.len() > 1);
    }

    #[test]
    fn test_vector_to_pgvector_string() {
        let v = vec![0.1_f32, 0.2, 0.3];
        let s = vector_to_pgvector_string(&v);
        assert!(s.starts_with('['));
        assert!(s.ends_with(']'));
        assert!(s.contains("0.1"));
    }

    #[test]
    fn test_split_sentences() {
        let s = split_sentences("Hello world. This is a test! Really? Yes.");
        assert!(s.len() >= 3);
    }

    #[test]
    fn test_parse_text() {
        let content = b"hello world";
        let result = parse_text(content).unwrap();
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_parse_document_invalid_type() {
        let result = parse_document("xyz", b"content");
        assert!(result.is_err());
    }
}
