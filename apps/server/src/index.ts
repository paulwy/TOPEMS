import express from 'express';
import cors from 'cors';
import { dashboardRoutes, authRoutes, crudRoutes } from './routes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: Date.now() } });
});

app.use('/api/core/iam', authRoutes);
app.use('/api/iam', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', crudRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`TOPEMS Dashboard API server running on port ${PORT}`);
  console.log(`  - Auth:    POST /api/core/iam/auth/login`);
  console.log(`  - Dashboard: GET /api/{module}/dashboard`);
  console.log(`  - CRUD:     /api/finance/expense-approvals, /api/scm/purchase-contracts, /api/qms/fmea, /api/qms/spc/charts`);
});

export default app;
