import React, { lazy, Suspense } from 'react';
import { Building2, Users, Target, MessageSquare, LayoutDashboard, Award, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const CRMDashboardPage = lazy(() => import('./CRMDashboardPage'));
const CustomerManagementPage = lazy(() => import('./CustomerManagementPage'));
const ContactManagementPage = lazy(() => import('./ContactManagementPage'));
const OpportunityManagementPage = lazy(() => import('./OpportunityManagementPage'));
const InteractionManagementPage = lazy(() => import('./InteractionManagementPage'));
const CRMCustomerScoringPage = lazy(() => import('./CRMCustomerScoringPage'));
const CRMSalesForecastPage = lazy(() => import('./CRMSalesForecastPage'));

const LazyLoad = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
);

const CRMPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-background'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-foreground'>客户关系管理</h1>
          <p className='mt-2 text-muted-foreground'>管理客户、联系人、商机和交互记录</p>
        </div>

        <Tabs defaultValue='dashboard' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-4 md:grid-cols-7 lg:w-auto lg:inline-grid'>
            <TabsTrigger value='dashboard' className='flex items-center space-x-2'>
              <LayoutDashboard className='w-4 h-4' />
              <span className='hidden sm:inline'>仪表板</span>
            </TabsTrigger>
            <TabsTrigger value='customers' className='flex items-center space-x-2'>
              <Building2 className='w-4 h-4' />
              <span className='hidden sm:inline'>客户</span>
            </TabsTrigger>
            <TabsTrigger value='contacts' className='flex items-center space-x-2'>
              <Users className='w-4 h-4' />
              <span className='hidden sm:inline'>联系人</span>
            </TabsTrigger>
            <TabsTrigger value='opportunities' className='flex items-center space-x-2'>
              <Target className='w-4 h-4' />
              <span className='hidden sm:inline'>商机</span>
            </TabsTrigger>
            <TabsTrigger value='interactions' className='flex items-center space-x-2'>
              <MessageSquare className='w-4 h-4' />
              <span className='hidden sm:inline'>交互记录</span>
            </TabsTrigger>
            <TabsTrigger value='scoring' className='flex items-center space-x-2'>
              <Award className='w-4 h-4' />
              <span className='hidden sm:inline'>客户评分</span>
            </TabsTrigger>
            <TabsTrigger value='forecast' className='flex items-center space-x-2'>
              <TrendingUp className='w-4 h-4' />
              <span className='hidden sm:inline'>销售预测</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value='dashboard'>
            <LazyLoad>
              <CRMDashboardPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value='customers'>
            <LazyLoad>
              <CustomerManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value='contacts'>
            <LazyLoad>
              <ContactManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value='opportunities'>
            <LazyLoad>
              <OpportunityManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value='interactions'>
            <LazyLoad>
              <InteractionManagementPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value='scoring'>
            <LazyLoad>
              <CRMCustomerScoringPage />
            </LazyLoad>
          </TabsContent>

          <TabsContent value='forecast'>
            <LazyLoad>
              <CRMSalesForecastPage />
            </LazyLoad>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CRMPage;
