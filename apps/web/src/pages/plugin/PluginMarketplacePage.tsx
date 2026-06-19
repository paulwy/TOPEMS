/**
 * Plugin Marketplace Page
 * TOPEMS - Plugin Market and Management
 */

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  CardActions,
  Modal,
  Avatar,
  Rating,
  Skeleton,
  Tabs,
  Tab,
  Badge as MuiBadge,
  IconButton,
} from "@mui/material";
import { Grid } from "@/components/Grid";
import {
  Search,
  Filter,
  Grid as GridIcon,
  List,
  Download,
  CheckCircle,
  XCircle,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  User,
  Calendar,
  TrendingUp,
  Sparkles,
  Clock,
  Shield,
  Zap,
  Star,
} from "lucide-react";
import {
  getMarketplaceSummary,
  getPluginCategories,
  listPlugins,
  getPlugin,
  getPluginVersions,
  getPluginReviews,
  type Plugin,
  type PluginCategory,
  type PluginVersion,
  type PluginReview,
} from "@/api/plugin";

// Mock tenant ID - in production, this should come from auth context
const MOCK_TENANT_ID = "00000000-0000-0000-0000-000000000001";

interface MarketplaceState {
  summary: {
    total_plugins: number;
    categories: PluginCategory[];
    featured_plugins: Plugin[];
    new_plugins: Plugin[];
    top_rated: Plugin[];
  } | null;
  plugins: Plugin[];
  categories: PluginCategory[];
  loading: boolean;
  error: string | null;
  viewMode: "grid" | "list";
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: "popular" | "rating" | "recent" | "name";
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
}

interface PluginDetailState {
  plugin: Plugin | null;
  versions: PluginVersion[];
  reviews: PluginReview[];
  loading: boolean;
}

export default function PluginMarketplacePage() {
  const [state, setState] = useState<MarketplaceState>({
    summary: null,
    plugins: [],
    categories: [],
    loading: true,
    error: null,
    viewMode: "grid",
    searchQuery: "",
    selectedCategory: null,
    sortBy: "popular",
    page: 1,
    pageSize: 20,
    totalPages: 1,
    total: 0,
  });

  const [selectedPlugin, setSelectedPlugin] = useState<PluginDetailState>({
    plugin: null,
    versions: [],
    reviews: [],
    loading: false,
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [installingPlugins, setInstallingPlugins] = useState<Set<string>>(
    new Set(),
  );

  // Load marketplace data
  const loadMarketplace = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const [summaryRes, categoriesRes, pluginsRes] = await Promise.all([
        getMarketplaceSummary(),
        getPluginCategories(),
        listPlugins({
          search: state.searchQuery || undefined,
          category: state.selectedCategory || undefined,
          sort_by: state.sortBy,
          page: state.page,
          page_size: state.pageSize,
        }),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setState((prev) => ({ ...prev, summary: summaryRes.data! }));
      }

      if (categoriesRes.success && categoriesRes.data) {
        setState((prev) => ({ ...prev, categories: categoriesRes.data! }));
      }

      if (pluginsRes.success && pluginsRes.data) {
        setState((prev) => ({
          ...prev,
          plugins: pluginsRes.data!.plugins,
          total: pluginsRes.data!.total,
          totalPages: pluginsRes.data!.total_pages,
        }));
      }
    } catch (error) {
      setState((prev) => ({ ...prev, error: "Failed to load marketplace" }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [
    state.searchQuery,
    state.selectedCategory,
    state.sortBy,
    state.page,
    state.pageSize,
  ]);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  // Load plugin details
  const loadPluginDetails = async (code: string) => {
    setSelectedPlugin({
      plugin: null,
      versions: [],
      reviews: [],
      loading: true,
    });
    setShowDetailModal(true);

    try {
      const [pluginRes, versionsRes, reviewsRes] = await Promise.all([
        getPlugin(code),
        getPluginVersions(code),
        getPluginReviews(code),
      ]);

      setSelectedPlugin({
        plugin: pluginRes.success && pluginRes.data ? pluginRes.data : null,
        versions:
          versionsRes.success && versionsRes.data ? versionsRes.data : [],
        reviews: reviewsRes.success && reviewsRes.data ? reviewsRes.data : [],
        loading: false,
      });
    } catch (error) {
      setSelectedPlugin((prev) => ({ ...prev, loading: false }));
    }
  };

  // Handle install/uninstall (mock for now)
  const handleInstall = async (pluginCode: string) => {
    setInstallingPlugins((prev) => new Set(prev).add(pluginCode));
    // In real implementation, call installPlugin API
    setTimeout(() => {
      setInstallingPlugins((prev) => {
        const next = new Set(prev);
        next.delete(pluginCode);
        return next;
      });
    }, 1500);
  };

  // Search and filter handlers
  const handleSearch = (query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query, page: 1 }));
  };

  const handleCategorySelect = (category: string | null) => {
    setState((prev) => ({ ...prev, selectedCategory: category, page: 1 }));
  };

  const handleSortChange = (
    sortBy: "popular" | "rating" | "recent" | "name",
  ) => {
    setState((prev) => ({ ...prev, sortBy, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setState((prev) => ({ ...prev, page }));
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Header */}
      <Box sx={{ bgcolor: "background.paper", boxShadow: 1 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }} color="text.primary">
                Plugin Marketplace
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Discover and install plugins to extend your TOPEMS system
              </Typography>
            </Box>
            <MuiBadge
              badgeContent={state.summary?.total_plugins || 0}
              color="primary"
            >
              <Chip label="Plugins" color="primary" variant="outlined" />
            </MuiBadge>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 4 }}>
        <Grid container spacing={3}>
          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1"  sx={{ ...{ mb: 2 }, fontWeight: 'bold' }}>
                Categories
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Button
                  variant={
                    state.selectedCategory === null ? "contained" : "text"
                  }
                  color={
                    state.selectedCategory === null ? "primary" : "inherit"
                  }
                  onClick={() => handleCategorySelect(null)}
                  sx={{ justifyContent: "flex-start", borderRadius: 1 }}
                >
                  All Plugins
                </Button>
                {state.categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={
                      state.selectedCategory === cat.code ? "contained" : "text"
                    }
                    color={
                      state.selectedCategory === cat.code
                        ? "primary"
                        : "inherit"
                    }
                    onClick={() => handleCategorySelect(cat.code)}
                    sx={{ justifyContent: "space-between", borderRadius: 1 }}
                  >
                    {cat.name}
                    {cat.plugin_count && (
                      <Chip label={cat.plugin_count} size="small" />
                    )}
                  </Button>
                ))}
              </Box>

              <Typography
                variant="subtitle1"
                
                sx={{ ...{ mt: 4, mb: 2 }, fontWeight: 'bold' }}
              >
                Sort By
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[
                  { value: "popular", label: "Popular", icon: TrendingUp },
                  { value: "rating", label: "Top Rated", icon: Star },
                  { value: "recent", label: "Recent", icon: Clock },
                  { value: "name", label: "Name", icon: Package },
                ].map((item) => (
                  <Button
                    key={item.value}
                    variant={state.sortBy === item.value ? "contained" : "text"}
                    color={state.sortBy === item.value ? "primary" : "inherit"}
                    onClick={() => handleSortChange(item.value as any)}
                    startIcon={<item.icon size={16} />}
                    sx={{ justifyContent: "flex-start", borderRadius: 1 }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            </Card>
          </Grid>

          {/* Main Content */}
          <Grid size={{ xs: 12, md: 9 }}>
            {/* Search Bar */}
            <Card sx={{ p: 2, mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TextField
                  placeholder="Search plugins..."
                  value={state.searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Search size={20} style={{ marginRight: 8 }} />
                      ),
                    },
                  }}
                />
                <IconButton
                  onClick={() =>
                    setState((prev) => ({ ...prev, viewMode: "grid" }))
                  }
                  color={state.viewMode === "grid" ? "primary" : "default"}
                >
                  <GridIcon size={20} />
                </IconButton>
                <IconButton
                  onClick={() =>
                    setState((prev) => ({ ...prev, viewMode: "list" }))
                  }
                  color={state.viewMode === "list" ? "primary" : "default"}
                >
                  <List size={20} />
                </IconButton>
              </Box>
            </Card>

            {/* Featured Section */}
            {!state.searchQuery && !state.selectedCategory && state.summary && (
              <Box sx={{ mb: 4 }}>
                {state.summary.featured_plugins.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <Sparkles size={20} color="#eab308" />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Featured Plugins
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {state.summary.featured_plugins.map((plugin) => (
                        <Grid key={plugin.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <PluginCard
                            plugin={plugin}
                            onClick={() => loadPluginDetails(plugin.code)}
                            onInstall={handleInstall}
                            isInstalling={installingPlugins.has(plugin.code)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {state.summary.new_plugins.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      <Zap size={20} color="#22c55e" />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        New Releases
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      {state.summary.new_plugins.map((plugin) => (
                        <Grid key={plugin.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <PluginCard
                            plugin={plugin}
                            onClick={() => loadPluginDetails(plugin.code)}
                            onInstall={handleInstall}
                            isInstalling={installingPlugins.has(plugin.code)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {/* All Plugins */}
            <Box>
              <Typography variant="h6"  sx={{ ...{ mb: 2 }, fontWeight: 'bold' }}>
                {state.selectedCategory
                  ? state.categories.find(
                      (c) => c.code === state.selectedCategory,
                    )?.name
                  : "All Plugins"}
              </Typography>
              {state.loading ? (
                <Grid container spacing={2}>
                  {[...Array(6)].map((_, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card sx={{ p: 2 }}>
                        <Skeleton
                          variant="rectangular"
                          height={80}
                          sx={{ mb: 1 }}
                        />
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="text" width="80%" />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : state.plugins.length === 0 ? (
                <Card sx={{ p: 4, textAlign: "center" }}>
                  <Package
                    size={48}
                    color="#9ca3af"
                    style={{ margin: "0 auto 16px" }}
                  />
                  <Typography color="text.secondary">
                    No plugins found matching your criteria
                  </Typography>
                </Card>
              ) : (
                <Grid container spacing={2}>
                  {state.plugins.map((plugin) => (
                    <Grid key={plugin.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <PluginCard
                        plugin={plugin}
                        onClick={() => loadPluginDetails(plugin.code)}
                        onInstall={handleInstall}
                        isInstalling={installingPlugins.has(plugin.code)}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>

            {/* Pagination */}
            {state.totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  mt: 3,
                }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handlePageChange(state.page - 1)}
                  disabled={state.page <= 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Page {state.page} of {state.totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handlePageChange(state.page + 1)}
                  disabled={state.page >= state.totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Plugin Detail Modal */}
      <PluginDetailModal
        state={selectedPlugin}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onInstall={handleInstall}
        isInstalling={installingPlugins.has(selectedPlugin.plugin?.code || "")}
      />
    </Box>
  );
}

// Plugin Card Component
interface PluginCardProps {
  plugin: Plugin;
  onClick: () => void;
  onInstall?: (code: string) => void;
  isInstalling?: boolean;
}

function PluginCard({
  plugin,
  onClick,
  onInstall,
  isInstalling,
}: PluginCardProps) {
  return (
    <Card
      sx={{
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: 4 },
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          height: 80,
          bgcolor: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Package size={40} color="white" />
      </Box>
      <CardContent sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {plugin.name}
          </Typography>
          <Chip
            label={
              plugin.is_free
                ? "Free"
                : `$${((plugin.price_cents || 0) / 100).toFixed(2)}`
            }
            color={plugin.is_free ? "success" : "warning"}
            size="small"
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          by {plugin.author_name || "Unknown"}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
          noWrap
        >
          {plugin.description || "No description available"}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
          {plugin.rating && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Star size={12} color="#eab308" fill="#eab308" />
              <Typography variant="caption">
                {plugin.rating.toFixed(1)}
              </Typography>
            </Box>
          )}
          {plugin.install_count && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Download size={12} />
              <Typography variant="caption">{plugin.install_count}</Typography>
            </Box>
          )}
          {plugin.category && (
            <Chip label={plugin.category} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>
      {onInstall && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={(e) => {
              e.stopPropagation();
              onInstall(plugin.code);
            }}
            disabled={isInstalling}
            startIcon={
              plugin.is_installed ? (
                <CheckCircle size={16} />
              ) : (
                <Download size={16} />
              )
            }
          >
            {isInstalling
              ? "Installing..."
              : plugin.is_installed
                ? "Installed"
                : "Install"}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}

// Plugin Detail Modal Component
interface PluginDetailModalProps {
  state: PluginDetailState;
  open: boolean;
  onClose: () => void;
  onInstall: (code: string) => void;
  isInstalling: boolean;
}

function PluginDetailModal({
  state,
  open,
  onClose,
  onInstall,
  isInstalling,
}: PluginDetailModalProps) {
  const { plugin, versions, reviews, loading } = state;

  return (
    <Modal open={open} onClose={onClose} sx={{ overflow: "auto" }}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 600,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {loading || !plugin ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {plugin.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  by {plugin.author_name || "Unknown"} • v{plugin.version}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Chip
                    label={
                      plugin.is_free
                        ? "Free"
                        : `$${((plugin.price_cents || 0) / 100).toFixed(2)}`
                    }
                    color={plugin.is_free ? "success" : "warning"}
                    size="small"
                  />
                  {plugin.is_featured && (
                    <Chip label="Featured" color="primary" size="small" />
                  )}
                  {plugin.is_published ? (
                    <Chip label="Published" color="success" size="small" />
                  ) : (
                    <Chip label="Draft" size="small" />
                  )}
                </Box>
              </Box>
              <IconButton onClick={onClose}>
                <X size={20} />
              </IconButton>
            </Box>

            {/* Description */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {plugin.description || "No description available"}
              </Typography>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={3}>
                <Card sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {plugin.install_count || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Downloads
                  </Typography>
                </Card>
              </Grid>
              <Grid size={3}>
                <Card sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {plugin.rating?.toFixed(1) || "N/A"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Rating
                  </Typography>
                </Card>
              </Grid>
              <Grid size={3}>
                <Card sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {plugin.rating_count || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reviews
                  </Typography>
                </Card>
              </Grid>
              <Grid size={3}>
                <Card sx={{ p: 2, textAlign: "center", bgcolor: "grey.50" }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {versions.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Versions
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Tags */}
            {plugin.tags && plugin.tags.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {plugin.tags.map((tag, i) => (
                    <Chip key={i} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Versions */}
            {versions.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Versions
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {versions.slice(0, 5).map((v) => (
                    <Card key={v.id} sx={{ p: 1.5, bgcolor: "grey.50" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                            v{v.version}
                          </Typography>
                          {v.is_latest && (
                            <Chip label="Latest" color="primary" size="small" />
                          )}
                          {v.is_stable && (
                            <Chip label="Stable" color="success" size="small" />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(v.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} gutterBottom>
                  Reviews
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {reviews.slice(0, 3).map((r) => (
                    <Card key={r.id} sx={{ p: 2, bgcolor: "grey.50" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {r.user_name || "Anonymous"}
                        </Typography>
                        <Rating value={r.rating || 0} readOnly size="small" />
                      </Box>
                      {r.title && (
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {r.title}
                        </Typography>
                      )}
                      {r.content && (
                        <Typography variant="caption" color="text.secondary">
                          {r.content}
                        </Typography>
                      )}
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {/* Install Button */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => onInstall(plugin.code)}
              disabled={isInstalling}
              startIcon={
                plugin.is_installed ? (
                  <CheckCircle size={20} />
                ) : (
                  <Download size={20} />
                )
              }
            >
              {isInstalling
                ? "Installing..."
                : plugin.is_installed
                  ? "Reinstall"
                  : "Install Now"}
            </Button>
          </>
        )}
      </Box>
    </Modal>
  );
}
