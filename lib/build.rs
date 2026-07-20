fn main() {
    // lib 层不执行实际 gRPC 代码生成，仅声明 proto 目录为构建依赖监控路径。
    // 各服务在自己的 build.rs 中调用 tonic_prost_build / prost_build 生成 proto 代码，
    // 这样可避免强制所有依赖 topems-shared 的 crate 安装 protoc 工具链。
    println!("cargo:rerun-if-changed=proto/");
}
