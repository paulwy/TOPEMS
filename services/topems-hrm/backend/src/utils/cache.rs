// 缓存模块 - 当前未使用，保留接口以备将来扩展
// TODO: 后续可使用 Redis 或其他分布式缓存替代

#[allow(dead_code)]
pub struct InMemoryCache<T: Clone + Send + Sync + 'static> {
    _phantom: std::marker::PhantomData<T>,
}

#[allow(dead_code)]
impl<T: Clone + Send + Sync + 'static> InMemoryCache<T> {
    pub fn new() -> Self {
        Self {
            _phantom: std::marker::PhantomData,
        }
    }
}
