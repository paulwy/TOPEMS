use std::process::Command;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;
use tokio::fs;
use tracing::{debug, error, info, warn};

/// 文件转换服务 - 使用 LibreOffice 进行文档转换
#[derive(Clone)]
pub struct ConversionService {
    /// LibreOffice 可执行文件路径
    libreoffice_path: Option<String>,
    /// 临时目录
    temp_dir: PathBuf,
}

impl ConversionService {
    /// 创建新的转换服务
    pub fn new() -> Self {
        let libreoffice_path = Self::find_libreoffice();
        
        let temp_dir = std::env::temp_dir().join("topems-doc-conversion");
        
        if !temp_dir.exists() {
            let _ = std::fs::create_dir_all(&temp_dir);
        }
        
        if let Some(ref path) = libreoffice_path {
            info!("✅ LibreOffice conversion service available at: {}", path);
        } else {
            warn!("⚠️ LibreOffice conversion service not available (install LibreOffice for DOCX preview)");
            info!("💡 Tried paths: /Applications/LibreOffice.app/Contents/MacOS/soffice, /opt/homebrew/bin/soffice, etc.");
        }
        
        ConversionService {
            libreoffice_path,
            temp_dir,
        }
    }

    /// 查找 LibreOffice 可执行文件
    fn find_libreoffice() -> Option<String> {
        let possible_paths = [
            // macOS paths
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
            "/Applications/LibreOffice.app/Contents/MacOS/soffice.bin",
            "/opt/homebrew/bin/soffice",
            "/opt/homebrew/bin/libreoffice",
            "/usr/local/bin/soffice",
            "/usr/local/bin/libreoffice",
            // Linux paths
            "/usr/bin/libreoffice",
            "/usr/bin/soffice",
            "/usr/lib/libreoffice/program/soffice",
            // Windows paths
            "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
            "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
        ];

        for &path in &possible_paths {
            debug!("Checking LibreOffice at: {}", path);
            if Path::new(path).exists() {
                info!("✅ Found LibreOffice at: {}", path);
                return Some(path.to_string());
            }
        }

        debug!("Trying to find LibreOffice via 'which libreoffice'");
        if let Ok(output) = Command::new("which")
            .arg("libreoffice")
            .output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    info!("✅ Found LibreOffice in PATH: {}", path);
                    return Some(path);
                }
            }
        }

        debug!("Trying to find LibreOffice via 'which soffice'");
        if let Ok(output) = Command::new("which")
            .arg("soffice")
            .output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    info!("✅ Found soffice in PATH: {}", path);
                    return Some(path);
                }
            }
        }

        error!("❌ LibreOffice not found. Conversion service will not work.");
        info!("💡 On macOS: Download from https://www.libreoffice.org/");
        info!("💡 On Linux: sudo apt-get install libreoffice or sudo yum install libreoffice");
        None
    }

    /// 检查服务是否可用
    pub fn is_available(&self) -> bool {
        self.libreoffice_path.is_some()
    }

    /// 检查文件是否可以转换
    pub fn can_convert(&self, filename: &str) -> bool {
        if self.libreoffice_path.is_none() {
            return false;
        }

        let ext = Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        matches!(ext.as_str(), 
            "doc" | "docx" | "odt" | "rtf" | "txt" |
            "xls" | "xlsx" | "ods" |
            "ppt" | "pptx" | "odp" |
            "html" | "htm"
        )
    }

    /// 将文件转换为 PDF
    pub async fn convert_to_pdf(&self, input_content: &[u8], filename: &str) -> Result<Vec<u8>, String> {
        let libreoffice_path = self.libreoffice_path
            .as_ref()
            .ok_or_else(|| "LibreOffice not available".to_string())?;

        let input_ext = Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("tmp");
        
        let temp_input = NamedTempFile::new()
            .map_err(|e| format!("Failed to create temp input file: {}", e))?;
        
        let temp_input_path = temp_input.path();
        
        let mut temp_input_path_with_ext = temp_input_path.to_path_buf();
        temp_input_path_with_ext.set_extension(input_ext);
        
        fs::write(&temp_input_path_with_ext, input_content)
            .await
            .map_err(|e| format!("Failed to write temp input file: {}", e))?;

        let temp_output_dir = tempfile::tempdir_in(&self.temp_dir)
            .map_err(|e| format!("Failed to create temp output dir: {}", e))?;

        debug!("Converting file: {}", filename);
        debug!("Input temp file: {:?}", temp_input_path_with_ext);
        debug!("Output temp dir: {:?}", temp_output_dir.path());

        let output = Command::new(libreoffice_path)
            .arg("--headless")
            .arg("--convert-to")
            .arg("pdf")
            .arg("--outdir")
            .arg(temp_output_dir.path())
            .arg(&temp_input_path_with_ext)
            .output()
            .map_err(|e| format!("Failed to execute LibreOffice: {}", e))?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            error!("LibreOffice conversion failed: {}", error_msg);
            return Err(format!("Conversion failed: {}", error_msg));
        }

        let mut output_pdf = None;
        if let Ok(mut entries) = fs::read_dir(temp_output_dir.path()).await {
            while let Some(entry) = entries.next_entry().await.transpose() {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("pdf") {
                        output_pdf = Some(path);
                        break;
                    }
                }
            }
        }

        let output_pdf = output_pdf
            .ok_or_else(|| "PDF file not generated".to_string())?;

        debug!("Generated PDF: {:?}", output_pdf);

        let pdf_content = fs::read(&output_pdf)
            .await
            .map_err(|e| format!("Failed to read PDF file: {}", e))?;

        info!("Successfully converted {} to PDF ({} bytes)", filename, pdf_content.len());

        Ok(pdf_content)
    }
}

impl Default for ConversionService {
    fn default() -> Self {
        Self::new()
    }
}
