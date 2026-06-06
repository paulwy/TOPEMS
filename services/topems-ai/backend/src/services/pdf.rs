/// PDF 文本提取服务
/// 使用 lopdf 和 pdf-extract 库

#[derive(Clone)]
pub struct PdfParser {
    // 可以添加配置选项，如最大页数、提取模式等
}

impl PdfParser {
    pub fn new() -> Self {
        Self {}
    }

    /// 从 PDF 文件提取文本
    pub async fn extract_text(&self, file_path: &str) -> Result<String, String> {
        let file_path_owned = file_path.to_string();

        // 检查文件是否存在
        if !std::path::Path::new(&file_path_owned).exists() {
            return Err(format!("文件不存在: {}", file_path));
        }

        // 在阻塞线程中执行 PDF 解析
        let result = tokio::task::spawn_blocking(move || {
            Self::extract_text_sync(&file_path_owned)
        })
        .await
        .map_err(|e| format!("PDF 解析任务失败: {}", e))?;

        result
    }

    /// 同步提取文本（必须在 blocking 线程中调用）
    fn extract_text_sync(file_path: &str) -> Result<String, String> {
        // 使用 pdf-extract 提取文本
        match pdf_extract::extract_text(file_path) {
            Ok(text) => {
                let cleaned = Self::clean_text(&text);
                if cleaned.is_empty() {
                    // 尝试备用方法
                    Self::extract_with_lopdf(file_path)
                } else {
                    Ok(cleaned)
                }
            }
            Err(e) => {
                tracing::warn!("pdf-extract 失败，尝试 lopdf: {}", e);
                Self::extract_with_lopdf(file_path)
            }
        }
    }

    /// 使用 lopdf 提取文本（备用方法）
    fn extract_with_lopdf(file_path: &str) -> Result<String, String> {
        let doc = lopdf::Document::load(file_path)
            .map_err(|e| format!("加载 PDF 失败: {}", e))?;

        let mut full_text = String::new();

        // 获取所有页面并提取文本
        let pages = doc.get_pages();
        for (_, page_id) in pages.iter() {
            let page_num = page_id.0;
            if let Ok(content) = doc.extract_text(&[page_num]) {
                if !content.trim().is_empty() {
                    full_text.push_str(&content);
                    full_text.push('\n');
                }
            }
        }

        let cleaned = Self::clean_text(&full_text);
        if cleaned.is_empty() {
            Err("无法从 PDF 提取文本内容".to_string())
        } else {
            Ok(cleaned)
        }
    }

    /// 清理提取的文本
    fn clean_text(text: &str) -> String {
        text.lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// 获取 PDF 元信息
    pub async fn get_metadata(&self, file_path: &str) -> Result<PdfMetadata, String> {
        let file_path_owned = file_path.to_string();

        // 检查文件是否存在
        if !std::path::Path::new(&file_path_owned).exists() {
            return Err(format!("文件不存在: {}", file_path));
        }

        let result = tokio::task::spawn_blocking(move || {
            Self::get_metadata_sync(&file_path_owned)
        })
        .await
        .map_err(|e| format!("PDF 元信息获取失败: {}", e))?;

        result
    }

    /// 同步获取元信息
    fn get_metadata_sync(file_path: &str) -> Result<PdfMetadata, String> {
        let doc = lopdf::Document::load(file_path)
            .map_err(|e| format!("加载 PDF 失败: {}", e))?;

        let page_count = doc.get_pages().len() as u32;

        // 尝试获取标题
        let title = doc
            .trailer
            .get(b"Info")
            .ok()
            .and_then(|info| {
                if let lopdf::Object::Reference(info_ref) = info {
                    doc.get_object(*info_ref).ok()
                } else {
                    None
                }
            })
            .and_then(|info| info.as_dict().ok())
            .and_then(|dict| dict.get(b"Title").ok())
            .and_then(|title| {
                if let lopdf::Object::String(bytes, _) = title {
                    Some(bytes)
                } else {
                    None
                }
            })
            .map(|bytes| String::from_utf8_lossy(bytes).into_owned());

        Ok(PdfMetadata {
            page_count,
            title,
            file_size: std::fs::metadata(file_path)
                .map(|m| m.len())
                .unwrap_or(0),
        })
    }
}

impl Default for PdfParser {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PdfMetadata {
    pub page_count: u32,
    pub title: Option<String>,
    pub file_size: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_text() {
        let dirty = "  Line 1  \n\n  Line 2  \n  \n  Line 3  ";
        let clean = PdfParser::clean_text(dirty);
        assert_eq!(clean, "Line 1\nLine 2\nLine 3");
    }
}
