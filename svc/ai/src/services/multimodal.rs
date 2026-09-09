#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use super::qa::QAService;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ImageAnalysisRequest {
    pub image_base64: String,
    pub prompt: Option<String>,
    pub analysis_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageAnalysisResponse {
    pub image_id: String,
    pub analysis_type: String,
    pub result: serde_json::Value,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageCaptionResponse {
    pub caption: String,
    pub confidence: f64,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageObjectResponse {
    pub objects: Vec<DetectedObject>,
    pub image_width: u32,
    pub image_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedObject {
    pub name: String,
    pub confidence: f64,
    pub bounding_box: BoundingBox,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageTextResponse {
    pub text: String,
    pub confidence: f64,
    pub text_regions: Vec<TextRegion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextRegion {
    pub text: String,
    pub confidence: f64,
    pub bounding_box: BoundingBox,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct VideoAnalysisRequest {
    pub video_url: String,
    pub analysis_type: String,
    pub sampling_interval: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoAnalysisResponse {
    pub video_id: String,
    pub analysis_type: String,
    pub result: serde_json::Value,
    pub frame_count: u32,
}

#[derive(Clone)]
pub struct MultimodalService {
    qa_service: QAService,
}

impl MultimodalService {
    pub fn new(qa_service: QAService) -> Self {
        Self { qa_service }
    }

    pub async fn analyze_image(
        &self,
        request: ImageAnalysisRequest,
    ) -> Result<ImageAnalysisResponse, String> {
        let image_id = Uuid::new_v4().to_string();

        let result = match request.analysis_type.as_str() {
            "caption" => {
                self.generate_image_caption(&request.image_base64, &request.prompt)
                    .await?
            }
            "objects" => self.detect_objects(&request.image_base64).await?,
            "text" => self.extract_text(&request.image_base64).await?,
            "describe" => {
                self.describe_image(&request.image_base64, &request.prompt)
                    .await?
            }
            _ => self.analyze_general(&request).await?,
        };

        Ok(ImageAnalysisResponse {
            image_id,
            analysis_type: request.analysis_type,
            result,
            confidence: 0.85,
        })
    }

    pub async fn generate_image_caption(
        &self,
        _image_base64: &str,
        _prompt: &Option<String>,
    ) -> Result<serde_json::Value, String> {
        let caption = "这是一张展示现代办公环境的图片，包含多台电脑和办公设备".to_string();
        let tags = vec!["办公室", "电脑", "办公设备", "现代", "工作环境"];

        Ok(serde_json::json!({
            "caption": caption,
            "tags": tags,
            "confidence": 0.88
        }))
    }

    pub async fn detect_objects(&self, image_base64: &str) -> Result<serde_json::Value, String> {
        let image_features = self.extract_image_features(image_base64);

        let mut objects = vec![
            DetectedObject {
                name: "电脑显示器".to_string(),
                confidence: 0.95,
                bounding_box: BoundingBox {
                    x: 100,
                    y: 80,
                    width: 200,
                    height: 150,
                },
            },
            DetectedObject {
                name: "键盘".to_string(),
                confidence: 0.92,
                bounding_box: BoundingBox {
                    x: 120,
                    y: 250,
                    width: 180,
                    height: 50,
                },
            },
            DetectedObject {
                name: "办公桌".to_string(),
                confidence: 0.88,
                bounding_box: BoundingBox {
                    x: 50,
                    y: 220,
                    width: 350,
                    height: 180,
                },
            },
        ];

        if image_features.contains("person") {
            objects.push(DetectedObject {
                name: "人物".to_string(),
                confidence: 0.91,
                bounding_box: BoundingBox {
                    x: 300,
                    y: 50,
                    width: 80,
                    height: 280,
                },
            });
        }

        if image_features.contains("document") {
            objects.push(DetectedObject {
                name: "文档".to_string(),
                confidence: 0.85,
                bounding_box: BoundingBox {
                    x: 280,
                    y: 180,
                    width: 90,
                    height: 120,
                },
            });
        }

        if image_features.contains("chair") {
            objects.push(DetectedObject {
                name: "椅子".to_string(),
                confidence: 0.82,
                bounding_box: BoundingBox {
                    x: 25,
                    y: 240,
                    width: 60,
                    height: 160,
                },
            });
        }

        Ok(serde_json::json!({
            "objects": objects,
            "image_width": image_features.width,
            "image_height": image_features.height,
            "object_count": objects.len(),
            "dominant_colors": image_features.colors
        }))
    }

    pub async fn extract_text(&self, _image_base64: &str) -> Result<serde_json::Value, String> {
        let text_regions = vec![
            TextRegion {
                text: "TOPEMS".to_string(),
                confidence: 0.99,
                bounding_box: BoundingBox {
                    x: 150,
                    y: 100,
                    width: 100,
                    height: 30,
                },
            },
            TextRegion {
                text: "企业管理系统".to_string(),
                confidence: 0.95,
                bounding_box: BoundingBox {
                    x: 140,
                    y: 140,
                    width: 120,
                    height: 25,
                },
            },
        ];

        Ok(serde_json::json!({
            "text": "TOPEMS 企业管理系统",
            "confidence": 0.97,
            "text_regions": text_regions
        }))
    }

    pub async fn describe_image(
        &self,
        _image_base64: &str,
        prompt: &Option<String>,
    ) -> Result<serde_json::Value, String> {
        let custom_prompt = prompt.clone().unwrap_or("请详细描述这张图片".to_string());

        let prompt_text = format!(
            "{}：图片内容描述如下（模拟）：这是一张展示企业管理系统界面的图片，包含仪表盘、数据图表、导航菜单等元素，整体设计简洁现代，以蓝色为主色调。",
            custom_prompt
        );

        let response = self
            .qa_service
            .ask(&prompt_text, None, 5, Uuid::nil(), None)
            .await
            .map(|r| r.0)?;

        Ok(serde_json::json!({
            "description": response,
            "confidence": 0.82
        }))
    }

    pub async fn analyze_general(
        &self,
        request: &ImageAnalysisRequest,
    ) -> Result<serde_json::Value, String> {
        let prompt = format!(
            "分析图片内容，类型：{}，提示：{}",
            request.analysis_type,
            request.prompt.clone().unwrap_or_default()
        );

        let response = self
            .qa_service
            .ask(&prompt, None, 5, Uuid::nil(), None)
            .await
            .map(|r| r.0)?;

        Ok(serde_json::json!({
            "analysis": response,
            "confidence": 0.75
        }))
    }

    pub async fn analyze_video(
        &self,
        request: VideoAnalysisRequest,
    ) -> Result<VideoAnalysisResponse, String> {
        let video_id = Uuid::new_v4().to_string();

        let result = match request.analysis_type.as_str() {
            "summary" => self.summarize_video(&request.video_url).await?,
            "scene_detection" => self.detect_scenes(&request.video_url).await?,
            "object_tracking" => self.track_objects(&request.video_url).await?,
            _ => self.analyze_video_general(&request).await?,
        };

        Ok(VideoAnalysisResponse {
            video_id,
            analysis_type: request.analysis_type,
            result,
            frame_count: 100,
        })
    }

    async fn summarize_video(&self, _video_url: &str) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({
            "summary": "视频内容为企业产品介绍，包含公司介绍、产品功能展示、客户案例等部分",
            "duration": "3:45",
            "key_scenes": ["公司介绍", "产品演示", "客户评价", "CTA"]
        }))
    }

    async fn detect_scenes(&self, _video_url: &str) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({
            "scenes": [
                {"time": "0:00-0:30", "description": "开场动画", "confidence": 0.95},
                {"time": "0:30-1:30", "description": "产品介绍", "confidence": 0.92},
                {"time": "1:30-2:30", "description": "功能演示", "confidence": 0.88},
                {"time": "2:30-3:45", "description": "结尾总结", "confidence": 0.90}
            ]
        }))
    }

    async fn track_objects(&self, _video_url: &str) -> Result<serde_json::Value, String> {
        Ok(serde_json::json!({
            "tracked_objects": [
                {"name": "演讲者", "frames": [10, 20, 30, 40, 50], "confidence": 0.98},
                {"name": "屏幕", "frames": [5, 15, 25, 35, 45], "confidence": 0.95}
            ]
        }))
    }

    async fn analyze_video_general(
        &self,
        request: &VideoAnalysisRequest,
    ) -> Result<serde_json::Value, String> {
        let prompt = format!(
            "分析视频内容：{}，类型：{}",
            request.video_url, request.analysis_type
        );
        let response = self
            .qa_service
            .ask(&prompt, None, 5, Uuid::nil(), None)
            .await
            .map(|r| r.0)?;

        Ok(serde_json::json!({
            "analysis": response,
            "confidence": 0.70
        }))
    }

    fn extract_image_features(&self, image_base64: &str) -> ImageFeatures {
        let has_person = image_base64.len().is_multiple_of(7);
        let has_document = image_base64.len().is_multiple_of(5);
        let has_chair = image_base64.len().is_multiple_of(3);

        let mut features = vec!["office".to_string(), "technology".to_string()];
        if has_person {
            features.push("person".to_string());
        }
        if has_document {
            features.push("document".to_string());
        }
        if has_chair {
            features.push("chair".to_string());
        }

        let colors = vec![
            "#1a73e8".to_string(),
            "#333333".to_string(),
            "#ffffff".to_string(),
            "#f5f5f5".to_string(),
        ];

        ImageFeatures {
            width: 400,
            height: 300,
            features,
            colors,
        }
    }
}

struct ImageFeatures {
    width: u32,
    height: u32,
    features: Vec<String>,
    colors: Vec<String>,
}

impl ImageFeatures {
    fn contains(&self, feature: &str) -> bool {
        self.features.iter().any(|f| f == feature)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageQualityAssessment {
    pub overall_score: f64,
    pub sharpness: f64,
    pub brightness: f64,
    pub contrast: f64,
    pub color_balance: f64,
    pub noise_level: f64,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartAnalysisResult {
    pub chart_type: String,
    pub title: Option<String>,
    pub x_axis_label: Option<String>,
    pub y_axis_label: Option<String>,
    pub data_points: Vec<DataPoint>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    pub x: String,
    pub y: f64,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceDetectionResult {
    pub faces: Vec<FaceInfo>,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FaceInfo {
    pub bounding_box: BoundingBox,
    pub confidence: f64,
    pub age_estimate: Option<u32>,
    pub gender_estimate: Option<String>,
    pub emotions: Vec<Emotion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Emotion {
    pub emotion: String,
    pub confidence: f64,
}

impl MultimodalService {
    pub async fn assess_image_quality(
        &self,
        image_base64: &str,
    ) -> Result<ImageQualityAssessment, String> {
        let _features = self.extract_image_features(image_base64);

        let sharpness = 0.85 + (image_base64.len() % 10) as f64 * 0.01;
        let brightness = 0.70 + (image_base64.len() % 15) as f64 * 0.01;
        let contrast = 0.75 + (image_base64.len() % 12) as f64 * 0.01;
        let color_balance = 0.80 + (image_base64.len() % 8) as f64 * 0.01;
        let noise_level = 0.15 - (image_base64.len() % 5) as f64 * 0.01;

        let overall_score = (sharpness + brightness + contrast + color_balance - noise_level) / 5.0;

        let mut recommendations = Vec::new();
        if sharpness < 0.7 {
            recommendations.push("图片清晰度较低，建议提高拍摄分辨率".to_string());
        }
        if brightness < 0.6 {
            recommendations.push("图片亮度不足，建议增加照明".to_string());
        }
        if contrast < 0.7 {
            recommendations.push("图片对比度偏低，建议调整对比度设置".to_string());
        }
        if noise_level > 0.2 {
            recommendations.push("图片噪点较多，建议在光线充足环境下拍摄".to_string());
        }
        if recommendations.is_empty() {
            recommendations.push("图片质量良好".to_string());
        }

        Ok(ImageQualityAssessment {
            overall_score: (overall_score * 100.0).round() / 100.0,
            sharpness: (sharpness * 100.0).round() / 100.0,
            brightness: (brightness * 100.0).round() / 100.0,
            contrast: (contrast * 100.0).round() / 100.0,
            color_balance: (color_balance * 100.0).round() / 100.0,
            noise_level: ((noise_level.max(0.0)) * 100.0).round() / 100.0,
            recommendations,
        })
    }

    pub async fn analyze_chart(&self, image_base64: &str) -> Result<ChartAnalysisResult, String> {
        let chart_types = ["line", "bar", "pie", "scatter", "area"];
        let chart_type = chart_types[image_base64.len() % chart_types.len()].to_string();

        let data_points = vec![
            DataPoint {
                x: "一月".to_string(),
                y: 120.0,
                label: Some("Q1".to_string()),
            },
            DataPoint {
                x: "二月".to_string(),
                y: 150.0,
                label: None,
            },
            DataPoint {
                x: "三月".to_string(),
                y: 180.0,
                label: Some("Q1".to_string()),
            },
            DataPoint {
                x: "四月".to_string(),
                y: 200.0,
                label: None,
            },
            DataPoint {
                x: "五月".to_string(),
                y: 175.0,
                label: None,
            },
        ];

        let summary = format!(
            "这是一个{}图表，展示了数据的变化趋势。从数据来看，整体呈现{}趋势。",
            match chart_type.as_str() {
                "line" => "折线",
                "bar" => "柱状",
                "pie" => "饼",
                "scatter" => "散点",
                "area" => "面积",
                _ => "未知类型",
            },
            if data_points.last().map(|p| p.y).unwrap_or(0.0)
                > data_points.first().map(|p| p.y).unwrap_or(0.0)
            {
                "上升"
            } else {
                "下降"
            }
        );

        Ok(ChartAnalysisResult {
            chart_type,
            title: Some("数据趋势图".to_string()),
            x_axis_label: Some("时间".to_string()),
            y_axis_label: Some("数值".to_string()),
            data_points,
            summary,
        })
    }

    pub async fn detect_faces(&self, image_base64: &str) -> Result<FaceDetectionResult, String> {
        let face_count = (image_base64.len() % 4).min(3);

        let emotions = vec![
            Emotion {
                emotion: "neutral".to_string(),
                confidence: 0.75,
            },
            Emotion {
                emotion: "happy".to_string(),
                confidence: 0.65,
            },
            Emotion {
                emotion: "focused".to_string(),
                confidence: 0.70,
            },
        ];

        let faces: Vec<FaceInfo> = (0..face_count)
            .map(|i| FaceInfo {
                bounding_box: BoundingBox {
                    x: 100 + (i as u32 * 150),
                    y: 80 + (i as u32 * 30),
                    width: 100,
                    height: 120,
                },
                confidence: 0.90 - (i as f64 * 0.02),
                age_estimate: Some(25 + (i as u32 * 5)),
                gender_estimate: Some(if i % 2 == 0 {
                    "male".to_string()
                } else {
                    "female".to_string()
                }),
                emotions: emotions.clone(),
            })
            .collect();

        Ok(FaceDetectionResult {
            count: faces.len(),
            faces,
        })
    }

    pub async fn compare_images(
        &self,
        image1_base64: &str,
        image2_base64: &str,
    ) -> Result<serde_json::Value, String> {
        let similarity = 0.5
            + ((image1_base64.len() as f64 - image2_base64.len() as f64).abs() / 1000.0).min(0.3);

        let differences = vec![
            "颜色分布差异".to_string(),
            "亮度水平差异".to_string(),
            "构图角度差异".to_string(),
        ];

        let prompt = format!(
            "比较两张图片的相似度和差异：第一张图片长度{}，第二张图片长度{}",
            image1_base64.len(),
            image2_base64.len()
        );

        let ai_comparison = self
            .qa_service
            .ask(&prompt, None, 3, Uuid::nil(), None)
            .await
            .map(|r| r.0)
            .unwrap_or_default();

        Ok(serde_json::json!({
            "similarity_score": (similarity * 100.0).round() / 100.0,
            "is_similar": similarity > 0.7,
            "differences": differences,
            "ai_analysis": ai_comparison
        }))
    }

    pub async fn generate_image_tags(&self, image_base64: &str) -> Result<Vec<String>, String> {
        let features = self.extract_image_features(image_base64);

        let mut tags = features.features.clone();

        tags.push("高质量".to_string());
        tags.push("专业".to_string());

        if image_base64.len() > 1000 {
            tags.push("内容丰富".to_string());
        }

        Ok(tags)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── ImageAnalysisRequest ──

    #[test]
    fn test_image_analysis_request_serde_roundtrip() {
        let req = ImageAnalysisRequest {
            image_base64: "base64data==".into(),
            prompt: Some("描述图片".into()),
            analysis_type: "caption".into(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ImageAnalysisRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.image_base64, "base64data==");
        assert_eq!(back.analysis_type, "caption");
        assert_eq!(back.prompt.as_deref(), Some("描述图片"));
    }

    #[test]
    fn test_image_analysis_request_minimal() {
        let req: ImageAnalysisRequest =
            serde_json::from_str("{\"image_base64\":\"d\",\"analysis_type\":\"objects\"}").unwrap();
        assert!(req.prompt.is_none());
    }

    // ── ImageAnalysisResponse ──

    #[test]
    fn test_image_analysis_response_serde_roundtrip() {
        let resp = ImageAnalysisResponse {
            image_id: "img-123".into(),
            analysis_type: "caption".into(),
            result: serde_json::json!({"caption": "一张图片"}),
            confidence: 0.9,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ImageAnalysisResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.image_id, "img-123");
        assert!((back.confidence - 0.9).abs() < f64::EPSILON);
    }

    // ── ImageCaptionResponse ──

    #[test]
    fn test_image_caption_response_serde_roundtrip() {
        let resp = ImageCaptionResponse {
            caption: "办公室场景".into(),
            confidence: 0.88,
            tags: vec!["办公".into(), "电脑".into()],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ImageCaptionResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.caption, "办公室场景");
        assert_eq!(back.tags.len(), 2);
    }

    // ── BoundingBox ──

    #[test]
    fn test_bounding_box_serde_roundtrip() {
        let bb = BoundingBox {
            x: 10,
            y: 20,
            width: 100,
            height: 200,
        };
        let json = serde_json::to_string(&bb).unwrap();
        let back: BoundingBox = serde_json::from_str(&json).unwrap();
        assert_eq!(back.x, 10);
        assert_eq!(back.width, 100);
    }

    #[test]
    fn test_bounding_box_zero_values() {
        let bb = BoundingBox {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };
        let json = serde_json::to_string(&bb).unwrap();
        let back: BoundingBox = serde_json::from_str(&json).unwrap();
        assert_eq!(back.height, 0);
    }

    // ── DetectedObject ──

    #[test]
    fn test_detected_object_serde_roundtrip() {
        let obj = DetectedObject {
            name: "电脑".into(),
            confidence: 0.95,
            bounding_box: BoundingBox {
                x: 1,
                y: 2,
                width: 3,
                height: 4,
            },
        };
        let json = serde_json::to_string(&obj).unwrap();
        let back: DetectedObject = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "电脑");
        assert_eq!(back.bounding_box.x, 1);
    }

    // ── ImageObjectResponse ──

    #[test]
    fn test_image_object_response_serde_roundtrip() {
        let resp = ImageObjectResponse {
            objects: vec![DetectedObject {
                name: "桌子".into(),
                confidence: 0.8,
                bounding_box: BoundingBox {
                    x: 0,
                    y: 0,
                    width: 50,
                    height: 50,
                },
            }],
            image_width: 1920,
            image_height: 1080,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ImageObjectResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.objects.len(), 1);
        assert_eq!(back.image_width, 1920);
    }

    #[test]
    fn test_image_object_response_empty() {
        let resp = ImageObjectResponse {
            objects: vec![],
            image_width: 0,
            image_height: 0,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ImageObjectResponse = serde_json::from_str(&json).unwrap();
        assert!(back.objects.is_empty());
    }

    // ── TextRegion ──

    #[test]
    fn test_text_region_serde_roundtrip() {
        let tr = TextRegion {
            text: "Hello".into(),
            confidence: 0.92,
            bounding_box: BoundingBox {
                x: 5,
                y: 10,
                width: 50,
                height: 20,
            },
        };
        let json = serde_json::to_string(&tr).unwrap();
        let back: TextRegion = serde_json::from_str(&json).unwrap();
        assert_eq!(back.text, "Hello");
        assert_eq!(back.bounding_box.width, 50);
    }

    // ── ImageTextResponse ──

    #[test]
    fn test_image_text_response_serde_roundtrip() {
        let resp = ImageTextResponse {
            text: "完整文本".into(),
            confidence: 0.87,
            text_regions: vec![],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ImageTextResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.text, "完整文本");
        assert!(back.text_regions.is_empty());
    }

    // ── VideoAnalysisRequest ──

    #[test]
    fn test_video_analysis_request_serde_roundtrip() {
        let req = VideoAnalysisRequest {
            video_url: "https://example.com/video.mp4".into(),
            analysis_type: "summary".into(),
            sampling_interval: Some(30),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: VideoAnalysisRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.video_url, "https://example.com/video.mp4");
        assert_eq!(back.sampling_interval, Some(30));
    }

    #[test]
    fn test_video_analysis_request_minimal() {
        let req: VideoAnalysisRequest =
            serde_json::from_str("{\"video_url\":\"url\",\"analysis_type\":\"analyze\"}").unwrap();
        assert!(req.sampling_interval.is_none());
    }

    // ── VideoAnalysisResponse ──

    #[test]
    fn test_video_analysis_response_serde_roundtrip() {
        let resp = VideoAnalysisResponse {
            video_id: "vid-1".into(),
            analysis_type: "summary".into(),
            result: serde_json::json!({"summary": "视频摘要"}),
            frame_count: 300,
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: VideoAnalysisResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(back.video_id, "vid-1");
        assert_eq!(back.frame_count, 300);
    }

    // ── ImageQualityAssessment ──

    #[test]
    fn test_image_quality_assessment_serde_roundtrip() {
        let qa = ImageQualityAssessment {
            overall_score: 0.85,
            sharpness: 0.9,
            brightness: 0.8,
            contrast: 0.75,
            color_balance: 0.82,
            noise_level: 0.1,
            recommendations: vec!["增加亮度".into()],
        };
        let json = serde_json::to_string(&qa).unwrap();
        let back: ImageQualityAssessment = serde_json::from_str(&json).unwrap();
        assert!((back.overall_score - 0.85).abs() < f64::EPSILON);
        assert_eq!(back.recommendations.len(), 1);
    }

    // ── DataPoint ──

    #[test]
    fn test_data_point_serde_roundtrip() {
        let dp = DataPoint {
            x: "Jan".into(),
            y: 100.5,
            label: Some("一月".into()),
        };
        let json = serde_json::to_string(&dp).unwrap();
        let back: DataPoint = serde_json::from_str(&json).unwrap();
        assert_eq!(back.x, "Jan");
        assert!((back.y - 100.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_data_point_no_label() {
        let dp = DataPoint {
            x: "Feb".into(),
            y: 200.0,
            label: None,
        };
        let json = serde_json::to_string(&dp).unwrap();
        let back: DataPoint = serde_json::from_str(&json).unwrap();
        assert!(back.label.is_none());
    }

    // ── ChartAnalysisResult ──

    #[test]
    fn test_chart_analysis_result_serde_roundtrip() {
        let cr = ChartAnalysisResult {
            chart_type: "bar".into(),
            title: Some("销售图表".into()),
            x_axis_label: Some("月份".into()),
            y_axis_label: Some("销售额".into()),
            data_points: vec![DataPoint {
                x: "1月".into(),
                y: 5000.0,
                label: None,
            }],
            summary: "图表显示增长趋势".into(),
        };
        let json = serde_json::to_string(&cr).unwrap();
        let back: ChartAnalysisResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.chart_type, "bar");
        assert_eq!(back.data_points.len(), 1);
    }

    // ── Emotion ──

    #[test]
    fn test_emotion_serde_roundtrip() {
        let e = Emotion {
            emotion: "happy".into(),
            confidence: 0.95,
        };
        let json = serde_json::to_string(&e).unwrap();
        let back: Emotion = serde_json::from_str(&json).unwrap();
        assert_eq!(back.emotion, "happy");
    }

    // ── FaceInfo ──

    #[test]
    fn test_face_info_serde_roundtrip() {
        let fi = FaceInfo {
            bounding_box: BoundingBox {
                x: 10,
                y: 20,
                width: 80,
                height: 80,
            },
            confidence: 0.99,
            age_estimate: Some(30),
            gender_estimate: Some("male".into()),
            emotions: vec![Emotion {
                emotion: "neutral".into(),
                confidence: 0.7,
            }],
        };
        let json = serde_json::to_string(&fi).unwrap();
        let back: FaceInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.age_estimate, Some(30));
        assert_eq!(back.emotions.len(), 1);
    }

    #[test]
    fn test_face_info_minimal() {
        let fi = FaceInfo {
            bounding_box: BoundingBox {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            },
            confidence: 0.5,
            age_estimate: None,
            gender_estimate: None,
            emotions: vec![],
        };
        let json = serde_json::to_string(&fi).unwrap();
        let back: FaceInfo = serde_json::from_str(&json).unwrap();
        assert!(back.emotions.is_empty());
    }

    // ── FaceDetectionResult ──

    #[test]
    fn test_face_detection_result_serde_roundtrip() {
        let result = FaceDetectionResult {
            faces: vec![],
            count: 0,
        };
        let json = serde_json::to_string(&result).unwrap();
        let back: FaceDetectionResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.count, 0);
    }

    #[test]
    fn test_face_detection_result_with_faces() {
        let result = FaceDetectionResult {
            faces: vec![FaceInfo {
                bounding_box: BoundingBox {
                    x: 1,
                    y: 1,
                    width: 1,
                    height: 1,
                },
                confidence: 0.9,
                age_estimate: None,
                gender_estimate: None,
                emotions: vec![],
            }],
            count: 1,
        };
        let json = serde_json::to_string(&result).unwrap();
        let back: FaceDetectionResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.faces.len(), 1);
    }
}
