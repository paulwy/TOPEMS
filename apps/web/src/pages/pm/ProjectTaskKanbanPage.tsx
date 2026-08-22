import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KanbanPageTemplate, type KanbanColumn } from '@/components/templates/KanbanPageTemplate';
import i18n from '@/i18n';
import { Plus } from 'lucide-react';
import { pmApi } from '@/api/pm';

const initialColumns: KanbanColumn[] = [
  {
    id: 'backlog',
    title: i18n.t('pm.project_task_kanban_page.k0'),
    status: 'backlog',
    color: 'text.muted',
    cards: [
      {
        id: 'card-1',
        title: i18n.t('pm.project_task_kanban_page.k1'),
        description: i18n.t('pm.project_task_kanban_page.k2'),
        priority: 'high',
        assignee: { id: '1', name: i18n.t('pm.project_task_kanban_page.k3') },
        dueDate: '2026-03-20',
        tags: [{ label: i18n.t('pm.project_task_kanban_page.k4'), color: 'primary.main' }],
        subtasks: { total: 5, completed: 3 },
        comments: 2,
      },
      {
        id: 'card-2',
        title: i18n.t('pm.project_task_kanban_page.k5'),
        description: i18n.t('pm.project_task_kanban_page.k6'),
        priority: 'medium',
        assignee: { id: '2', name: i18n.t('pm.project_task_kanban_page.k7') },
        dueDate: '2026-03-22',
        tags: [{ label: i18n.t('pm.project_task_kanban_page.k8'), color: 'secondary.main' }],
      },
    ],
  },
  {
    id: 'in-progress',
    title: i18n.t('pm.project_task_kanban_page.k9'),
    status: 'in-progress',
    color: 'primary.500',
    cards: [
      {
        id: 'card-3',
        title: i18n.t('pm.project_task_kanban_page.k10'),
        description: i18n.t('pm.project_task_kanban_page.k11'),
        priority: 'high',
        assignee: { id: '3', name: i18n.t('pm.project_task_kanban_page.k12') },
        dueDate: '2026-03-18',
        tags: [{ label: i18n.t('pm.project_task_kanban_page.k13'), color: 'success.main' }],
        subtasks: { total: 8, completed: 5 },
        comments: 5,
        attachments: 3,
      },
    ],
  },
  {
    id: 'review',
    title: i18n.t('pm.project_task_kanban_page.k14'),
    status: 'review',
    color: 'warning.500',
    cards: [
      {
        id: 'card-4',
        title: i18n.t('pages.project_task_kanban_page.api_0'),
        description: i18n.t('pm.project_task_kanban_page.restfulapi_15'),
        priority: 'medium',
        assignee: { id: '4', name: i18n.t('pm.project_task_kanban_page.k16') },
        dueDate: '2026-03-19',
        tags: [{ label: i18n.t('pm.project_task_kanban_page.k17'), color: 'primary.main' }],
      },
    ],
  },
  {
    id: 'completed',
    title: i18n.t('pm.project_task_kanban_page.k18'),
    status: 'completed',
    color: 'success.500',
    collapsible: true,
    cards: [
      {
        id: 'card-5',
        title: i18n.t('pm.project_task_kanban_page.k19'),
        description: i18n.t('pm.project_task_kanban_page.k20'),
        assignee: { id: '1', name: i18n.t('pm.project_task_kanban_page.k21') },
        dueDate: '2026-03-10',
      },
      {
        id: 'card-6',
        title: i18n.t('pm.project_task_kanban_page.k22'),
        description: i18n.t('pm.project_task_kanban_page.k23'),
        assignee: { id: '2', name: i18n.t('pm.project_task_kanban_page.k24') },
        dueDate: '2026-03-12',
      },
    ],
  },
];

const ProjectTaskKanbanPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['pm-task-kanban'],
    queryFn: async () => {
      try {
        return await pmApi.projects.getKanbanBoard();
      } catch {
        return null;
      }
    },
  });

  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const boardColumns = useMemo<KanbanColumn[]>(() => {
    const data = backendData as unknown as { columns?: KanbanColumn[] } | null;
    if (data && Array.isArray(data.columns)) {
      return data.columns;
    }
    return columns;
  }, [backendData, columns]);

  const allCards = useMemo(
    () => boardColumns.flatMap((col) => col.cards.map((card) => ({ ...card, columnId: col.id }))),
    [boardColumns]
  );

  const filterConfig = useMemo(() => {
    const priorities = Array.from(
      new Set(allCards.map((c) => c.priority).filter((p) => p !== undefined))
    ) as string[];
    const assignees = Array.from(
      new Map(
        allCards
          .filter((c) => c.assignee)
          .map((c) => [c.assignee!.id, { id: c.assignee!.id, name: c.assignee!.name }])
      ).values()
    );
    const tags = Array.from(new Set(allCards.flatMap((c) => c.tags?.map((t) => t.label) ?? [])));
    return { priorities, assignees, tags };
  }, [allCards]);

  const filteredColumns = useMemo<KanbanColumn[]>(() => {
    const term = searchTerm.toLowerCase();
    const priorityFilter = filters.priority as string | undefined;
    const assigneeFilter = filters.assignee as string | undefined;
    const tagFilter = filters.tag as string | undefined;

    return boardColumns.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (term) {
          const text = [card.title, card.description].filter(Boolean).join(' ').toLowerCase();
          if (!text.includes(term)) return false;
        }
        if (priorityFilter && card.priority !== priorityFilter) return false;
        if (assigneeFilter && card.assignee?.id !== assigneeFilter) return false;
        if (tagFilter && !card.tags?.some((t) => t.label === tagFilter)) return false;
        return true;
      }),
    }));
  }, [boardColumns, searchTerm, filters]);

  const handleCardMove = (
    cardId: string,
    sourceColumn: string,
    targetColumn: string,
    _targetIndex: number
  ) => {
    setColumns((prev) => {
      const sourceCol = prev.find((col) => col.id === sourceColumn);
      if (!sourceCol || !prev.some((col) => col.id === targetColumn)) return prev;
      const cardIndex = sourceCol.cards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) return prev;
      const card = sourceCol.cards[cardIndex];
      return prev.map((col) => {
        if (col.id === sourceColumn) {
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        }
        if (col.id === targetColumn) {
          return { ...col, cards: [...col.cards, card] };
        }
        return col;
      });
    });
  };

  const handleCardDelete = (cardId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({ ...col, cards: col.cards.filter((c) => c.id !== cardId) }))
    );
  };

  const handleCardEdit = (_cardId: string) => {
    // Placeholder for edit navigation or dialog
  };

  const handleCardArchive = (cardId: string) => {
    handleCardDelete(cardId);
  };

  return (
    <KanbanPageTemplate
      title={i18n.t('pm.project_task_kanban_page.k25')}
      subtitle={i18n.t('pm.project_task_kanban_page.k26')}
      breadcrumbs={[
        { label: i18n.t('common.home'), href: '/' },
        { label: i18n.t('pm.project_task_kanban_page.k25') },
      ]}
      columns={filteredColumns}
      loading={isBackendLoading}
      onCardMove={handleCardMove}
      onCardDelete={handleCardDelete}
      onCardEdit={handleCardEdit}
      onCardArchive={handleCardArchive}
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      filterConfig={filterConfig}
      filters={filters}
      onFilterChange={setFilters}
      showStats
      showSearch
      showFilter
      showAddColumn
      actions={[
        {
          label: i18n.t('pm.project_task_kanban_page.k27'),
          icon: <Plus style={{ width: 16, height: 16 }} />,
          onClick: () => {},
        },
      ]}
    />
  );
};

export default ProjectTaskKanbanPage;
