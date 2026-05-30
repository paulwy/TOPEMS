import React from 'react';
import WorkflowDesigner from '../components/WorkflowDesigner';
import { useAppStore } from '../store';

const WorkflowDesignerPage: React.FC = () => {
  const { addNotification } = useAppStore();

  const handleSave = (nodes: any[], edges: any[]) => {
    console.log('Saved workflow:', { nodes, edges });
    addNotification({
      title: '保存成功',
      message: '流程已成功保存',
      type: 'success',
    });
  };

  return (
    <div className="h-full">
      <WorkflowDesigner onSave={handleSave} />
    </div>
  );
};

export default WorkflowDesignerPage;
