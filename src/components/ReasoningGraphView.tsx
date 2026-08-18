import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import dagre from 'dagre';
import {
  GitFork,
  Layers,
  Maximize2,
  Minimize2,
  Filter,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Search,
  Clock,
  ArrowDownUp,
  ArrowLeftRight,
} from 'lucide-react';
import type { CaseReference, PresentationCaseData } from '../types.js';
import type { ReasoningStepKind } from '../ledger/types.js';
import { useLanguage } from '../contexts/LanguageContext.js';
import { translateAssessment, translatePriority } from '../lib/translations.js';

export type GraphMode = 'reasoning_dag' | 'full_provenance';
export type LayoutDirection = 'TB' | 'LR';

interface ReasoningGraphViewProps {
  caseData: PresentationCaseData | null;
  onSelectReference: (reference: CaseReference) => void;
  focusedReference?: CaseReference | null;
  className?: string;
  isModal?: boolean;
  onCloseModal?: () => void;
}

// ---------------------------------------------------------------------------
// Step Kind Badge Helper
// ---------------------------------------------------------------------------
function getStepKindConfig(kind: ReasoningStepKind, locale: string) {
  switch (kind) {
    case 'fact':
      return {
        label: locale === 'vi' ? 'Dữ kiện' : 'Fact',
        bg: 'bg-sky-50',
        border: 'border-sky-300',
        text: 'text-sky-800',
        badge: 'bg-sky-600 text-white',
        ring: 'ring-sky-400',
      };
    case 'public_rule':
      return {
        label: locale === 'vi' ? 'Quy tắc công khai' : 'Public Rule',
        bg: 'bg-teal-50',
        border: 'border-teal-300',
        text: 'text-teal-800',
        badge: 'bg-teal-600 text-white',
        ring: 'ring-teal-400',
      };
    case 'assumption':
      return {
        label: locale === 'vi' ? 'Giả định' : 'Assumption',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-800',
        badge: 'bg-amber-600 text-white',
        ring: 'ring-amber-400',
      };
    case 'derivation':
      return {
        label: locale === 'vi' ? 'Suy luận' : 'Derivation',
        bg: 'bg-indigo-50',
        border: 'border-indigo-300',
        text: 'text-indigo-800',
        badge: 'bg-indigo-600 text-white',
        ring: 'ring-indigo-400',
      };
    case 'scenario':
      return {
        label: locale === 'vi' ? 'Kịch bản' : 'Scenario',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-800',
        badge: 'bg-orange-600 text-white',
        ring: 'ring-orange-400',
      };
    case 'conclusion':
      return {
        label: locale === 'vi' ? 'Kết luận' : 'Conclusion',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        badge: 'bg-emerald-600 text-white',
        ring: 'ring-emerald-400',
      };
    default:
      return {
        label: kind,
        bg: 'bg-slate-50',
        border: 'border-slate-300',
        text: 'text-slate-800',
        badge: 'bg-slate-600 text-white',
        ring: 'ring-slate-400',
      };
  }
}

// ---------------------------------------------------------------------------
// Custom Node Data Interface
// ---------------------------------------------------------------------------

export interface CustomNodeData extends Record<string, unknown> {
  id: string;
  category: 'step' | 'evidence' | 'statement' | 'finding' | 'event' | 'gap' | 'action';
  label: string;
  subLabel?: string;
  title: string;
  description?: string;
  kind?: ReasoningStepKind;
  status?: string;
  assessment?: string;
  priority?: string;
  dependsOn?: string[];
  reference?: CaseReference;
  isHighlighted?: boolean;
  layoutDirection: LayoutDirection;
  locale: string;
}

export type CustomNodeType = Node<CustomNodeData>;

// 1. Reasoning Step Node
function StepNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const config = getStepKindConfig(data.kind ?? 'derivation', data.locale);
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-64 rounded-xl border p-3 shadow-xs transition-all ${config.bg} ${config.border} ${
        isSelected ? `ring-2 ${config.ring} shadow-md scale-102` : 'hover:shadow-sm'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-indigo-500 !border-2 !border-white"
      />
      <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white shrink-0">
            {data.id}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${config.badge}`}>
            {config.label}
          </span>
        </div>
        {data.dependsOn && data.dependsOn.length > 0 && (
          <span className="text-[9px] font-mono text-slate-500 font-semibold truncate">
            ← {data.dependsOn.join(',')}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[11px] font-medium text-slate-800 leading-snug line-clamp-3">
        {data.title}
      </p>

      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-indigo-500 !border-2 !border-white"
      />
    </div>
  );
}

// 2. Evidence Node
function EvidenceNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-60 rounded-xl border p-2.5 bg-amber-50/70 border-amber-200 shadow-xs transition-all ${
        isSelected ? 'ring-2 ring-amber-500 shadow-md scale-102 bg-amber-50' : 'hover:border-amber-300'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-amber-600 !border-2 !border-white"
      />
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-amber-200/60">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span className="font-mono text-[10px] font-bold text-amber-900">{data.id}</span>
        </div>
        {data.subLabel && (
          <span className="text-[9px] bg-amber-200/80 text-amber-900 font-semibold px-1.5 py-0.2 rounded">
            {data.subLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-800 leading-snug line-clamp-2">
        {data.title}
      </p>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-amber-600 !border-2 !border-white"
      />
    </div>
  );
}

// 3. User Statement Node
function StatementNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-60 rounded-xl border p-2.5 bg-slate-900 border-slate-800 text-white shadow-xs transition-all ${
        isSelected ? 'ring-2 ring-sky-400 shadow-md scale-102' : 'hover:border-slate-700'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-sky-400 !border-2 !border-slate-900"
      />
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-700">
        <span className="font-mono text-[10px] font-bold text-sky-300">{data.id}</span>
        <span className="text-[9px] bg-slate-800 text-slate-300 font-semibold px-1.5 py-0.2 rounded">
          {data.locale === 'vi' ? 'Tường thuật' : 'Statement'}
        </span>
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-200 leading-snug line-clamp-2">
        {data.title}
      </p>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-sky-400 !border-2 !border-slate-900"
      />
    </div>
  );
}

// 4. Finding / Claim Node
function FindingNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-64 rounded-xl border p-3 bg-purple-50/60 border-purple-200 shadow-xs transition-all ${
        isSelected ? 'ring-2 ring-purple-500 shadow-md scale-102 bg-purple-50' : 'hover:border-purple-300'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-purple-600 !border-2 !border-white"
      />
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-purple-200/60">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
          <span className="font-mono text-[10px] font-bold text-purple-900">{data.id}</span>
        </div>
        {data.assessment && (
          <span className="text-[9px] bg-purple-200 text-purple-900 font-bold px-1.5 py-0.5 rounded-full">
            {data.assessment}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-900 leading-snug line-clamp-3">
        {data.title}
      </p>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-purple-600 !border-2 !border-white"
      />
    </div>
  );
}

// 5. Timeline Event Node
function EventNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-60 rounded-xl border p-2.5 bg-blue-50/70 border-blue-200 shadow-xs transition-all ${
        isSelected ? 'ring-2 ring-blue-500 shadow-md scale-102 bg-blue-50' : 'hover:border-blue-300'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-blue-600 !border-2 !border-white"
      />
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-blue-200/60">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          <span className="font-mono text-[10px] font-bold text-blue-900">{data.id}</span>
        </div>
        {data.subLabel && (
          <span className="text-[9px] text-blue-800 font-mono font-medium truncate max-w-[120px]">
            {data.subLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-800 leading-snug line-clamp-2">
        {data.title}
      </p>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-blue-600 !border-2 !border-white"
      />
    </div>
  );
}

// 6. Evidence Gap Node
function GapNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-64 rounded-xl border p-3 bg-rose-50/70 border-rose-200 shadow-xs transition-all ${
        isSelected ? 'ring-2 ring-rose-500 shadow-md scale-102 bg-rose-50' : 'hover:border-rose-300'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-rose-600 !border-2 !border-white"
      />
      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-rose-200/60">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="font-mono text-[10px] font-bold text-rose-900">{data.id}</span>
        </div>
        <span className="text-[9px] bg-rose-200 text-rose-900 font-bold px-1.5 py-0.5 rounded-full">
          {data.status ?? 'open'}
        </span>
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-900 leading-snug line-clamp-3">
        {data.title}
      </p>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-rose-600 !border-2 !border-white"
      />
    </div>
  );
}

// 7. Action Node
function ActionNodeComponent(props: NodeProps) {
  const data = props.data as unknown as CustomNodeData;
  const isSelected = props.selected || data.isHighlighted;
  const isHorizontal = data.layoutDirection === 'LR';

  return (
    <div
      className={`w-60 rounded-xl border p-2.5 bg-emerald-50/70 border-emerald-200 shadow-xs transition-all ${
        isSelected ? 'ring-2 ring-emerald-500 shadow-md scale-102 bg-emerald-50' : 'hover:border-emerald-300'
      }`}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-emerald-600 !border-2 !border-white"
      />
      <div className="flex items-center justify-between gap-1 pb-1 border-b border-emerald-200/60">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-mono text-[10px] font-bold text-emerald-900">{data.id}</span>
        </div>
        {data.priority && (
          <span className="text-[9px] bg-emerald-200 text-emerald-900 font-semibold px-1.5 py-0.2 rounded">
            {data.priority}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-800 leading-snug line-clamp-2">
        {data.title}
      </p>
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-emerald-600 !border-2 !border-white"
      />
    </div>
  );
}

const nodeTypes = {
  step: StepNodeComponent,
  evidence: EvidenceNodeComponent,
  statement: StatementNodeComponent,
  finding: FindingNodeComponent,
  event: EventNodeComponent,
  gap: GapNodeComponent,
  action: ActionNodeComponent,
};

// ---------------------------------------------------------------------------
// Dagre Graph Layout Engine
// ---------------------------------------------------------------------------
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: direction === 'TB' ? 45 : 35,
    ranksep: direction === 'TB' ? 65 : 75,
    marginx: 25,
    marginy: 25,
  });

  nodes.forEach((node) => {
    const data = node.data as CustomNodeData;
    const width = data.category === 'step' || data.category === 'finding' || data.category === 'gap' ? 260 : 240;
    const height = data.category === 'step' ? 110 : 85;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const data = node.data as CustomNodeData;
    const width = data.category === 'step' || data.category === 'finding' || data.category === 'gap' ? 260 : 240;
    const height = data.category === 'step' ? 110 : 85;

    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition ? nodeWithPosition.x - width / 2 : 0,
        y: nodeWithPosition ? nodeWithPosition.y - height / 2 : 0,
      },
      data: {
        ...data,
        layoutDirection: direction,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const ReasoningGraphView: React.FC<ReasoningGraphViewProps> = ({
  caseData,
  onSelectReference,
  className = '',
  isModal = false,
  onCloseModal,
}) => {
  const { locale, t } = useLanguage();
  const [graphMode, setGraphMode] = useState<GraphMode>('reasoning_dag');
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('TB');
  const [selectedNode, setSelectedNode] = useState<CustomNodeData | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Derive active revision reasoning
  const activeRevision = useMemo(() => {
    if (!caseData?.authoritative_record) return null;
    const headId = caseData.current_revision_id || caseData.authoritative_record.current_revision_id;
    return (
      caseData.authoritative_record.revisions.find((r) => r.id === headId) ??
      caseData.authoritative_record.revisions[caseData.authoritative_record.revisions.length - 1] ??
      null
    );
  }, [caseData]);

  // Build Nodes and Edges based on Graph Mode
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!caseData) return { nodes: [], edges: [] };

    const rawNodes: Node[] = [];
    const rawEdges: Edge[] = [];
    const nodeIds = new Set<string>();

    const addNode = (node: Node) => {
      if (!nodeIds.has(node.id)) {
        nodeIds.add(node.id);
        rawNodes.push(node);
      }
    };

    if (graphMode === 'reasoning_dag') {
      const reasoningSteps = activeRevision?.reasoning?.steps ?? [];

      // 1. Add all reasoning steps
      reasoningSteps.forEach((step) => {
        addNode({
          id: step.id,
          type: 'step',
          position: { x: 0, y: 0 },
          data: {
            id: step.id,
            category: 'step',
            label: step.id,
            title: step.text,
            kind: step.kind,
            dependsOn: step.depends_on,
            layoutDirection,
            locale,
          },
        });

        // Add step-to-step dependency edges
        step.depends_on.forEach((depId) => {
          rawEdges.push({
            id: `edge-${depId}->${step.id}`,
            source: depId,
            target: step.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#6366f1',
              width: 16,
              height: 16,
            },
          });
        });

        // Add source evidence/statement nodes and edges
        step.source_ids.forEach((sourceId) => {
          if (sourceId.startsWith('E')) {
            const ev = caseData.evidence.find((e) => e.id === sourceId);
            addNode({
              id: sourceId,
              type: 'evidence',
              position: { x: 0, y: 0 },
              data: {
                id: sourceId,
                category: 'evidence',
                label: sourceId,
                title: ev?.label || sourceId,
                subLabel: ev?.input_form,
                reference: { kind: 'evidence', id: sourceId },
                layoutDirection,
                locale,
              },
            });
          } else if (sourceId.startsWith('U')) {
            const st = caseData.statements.find((s) => s.id === sourceId);
            addNode({
              id: sourceId,
              type: 'statement',
              position: { x: 0, y: 0 },
              data: {
                id: sourceId,
                category: 'statement',
                label: sourceId,
                title: st?.text || sourceId,
                reference: { kind: 'statement', id: sourceId },
                layoutDirection,
                locale,
              },
            });
          }

          rawEdges.push({
            id: `edge-${sourceId}->${step.id}`,
            source: sourceId,
            target: step.id,
            type: 'smoothstep',
            style: { stroke: '#eab308', strokeWidth: 1.5, strokeDasharray: '4,4' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#eab308',
              width: 14,
              height: 14,
            },
          });
        });

        // Add claim/finding nodes and edges
        step.claim_ids.forEach((claimId) => {
          const claim = caseData.claims.find((c) => c.id === claimId);
          addNode({
            id: claimId,
            type: 'finding',
            position: { x: 0, y: 0 },
            data: {
              id: claimId,
              category: 'finding',
              label: claimId,
              title: claim?.text || claimId,
              assessment: claim?.assessment ? translateAssessment(claim.assessment, locale) : undefined,
              reference: { kind: 'finding', id: claimId },
              layoutDirection,
              locale,
            },
          });

          rawEdges.push({
            id: `edge-${step.id}->${claimId}`,
            source: step.id,
            target: claimId,
            type: 'smoothstep',
            style: { stroke: '#a855f7', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#a855f7',
              width: 16,
              height: 16,
            },
          });
        });

        // Add gap nodes and edges
        step.gap_ids.forEach((gapId) => {
          const gap = caseData.gaps.find((g) => g.id === gapId);
          addNode({
            id: gapId,
            type: 'gap',
            position: { x: 0, y: 0 },
            data: {
              id: gapId,
              category: 'gap',
              label: gapId,
              title: gap?.what_is_unknown || gapId,
              status: gap?.status,
              reference: { kind: 'gap', id: gapId },
              layoutDirection,
              locale,
            },
          });

          rawEdges.push({
            id: `edge-${step.id}->${gapId}`,
            source: step.id,
            target: gapId,
            type: 'smoothstep',
            style: { stroke: '#f43f5e', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#f43f5e',
              width: 16,
              height: 16,
            },
          });
        });
      });
    } else {
      // Full Provenance Graph Mode: Sources -> Events -> Claims -> Gaps -> Actions

      // 1. Statements
      caseData.statements.forEach((st) => {
        addNode({
          id: st.id,
          type: 'statement',
          position: { x: 0, y: 0 },
          data: {
            id: st.id,
            category: 'statement',
            label: st.id,
            title: st.text,
            reference: { kind: 'statement', id: st.id },
            layoutDirection,
            locale,
          },
        });
      });

      // 2. Evidence
      caseData.evidence.forEach((ev) => {
        addNode({
          id: ev.id,
          type: 'evidence',
          position: { x: 0, y: 0 },
          data: {
            id: ev.id,
            category: 'evidence',
            label: ev.id,
            title: ev.label,
            subLabel: ev.input_form,
            reference: { kind: 'evidence', id: ev.id },
            layoutDirection,
            locale,
          },
        });
      });

      // 3. Events
      caseData.events.forEach((event) => {
        addNode({
          id: event.id,
          type: 'event',
          position: { x: 0, y: 0 },
          data: {
            id: event.id,
            category: 'event',
            label: event.id,
            title: `${event.actor} ${event.action} ${event.target}`,
            subLabel: event.time,
            reference: { kind: 'event', id: event.id },
            layoutDirection,
            locale,
          },
        });

        // Edge from evidence/statements to event
        event.evidence_ids.forEach((evId) => {
          rawEdges.push({
            id: `edge-${evId}->${event.id}`,
            source: evId,
            target: event.id,
            type: 'smoothstep',
            style: { stroke: '#3b82f6', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          });
        });
        event.user_statement_ids.forEach((stId) => {
          rawEdges.push({
            id: `edge-${stId}->${event.id}`,
            source: stId,
            target: event.id,
            type: 'smoothstep',
            style: { stroke: '#3b82f6', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          });
        });

        // Edge from event to finding
        event.finding_ids.forEach((claimId) => {
          rawEdges.push({
            id: `edge-${event.id}->${claimId}`,
            source: event.id,
            target: claimId,
            type: 'smoothstep',
            style: { stroke: '#8b5cf6', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
          });
        });
      });

      // 4. Claims / Findings
      caseData.claims.forEach((claim) => {
        addNode({
          id: claim.id,
          type: 'finding',
          position: { x: 0, y: 0 },
          data: {
            id: claim.id,
            category: 'finding',
            label: claim.id,
            title: claim.text,
            assessment: translateAssessment(claim.assessment, locale),
            reference: { kind: 'finding', id: claim.id },
            layoutDirection,
            locale,
          },
        });

        // Edge direct from supporting evidence to claim if not through event
        claim.supporting_evidence.forEach((evId) => {
          if (!rawEdges.some((e) => e.source === evId && e.target === claim.id)) {
            rawEdges.push({
              id: `edge-${evId}->${claim.id}`,
              source: evId,
              target: claim.id,
              type: 'smoothstep',
              style: { stroke: '#10b981', strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            });
          }
        });
      });

      // 5. Gaps
      caseData.gaps.forEach((gap) => {
        addNode({
          id: gap.id,
          type: 'gap',
          position: { x: 0, y: 0 },
          data: {
            id: gap.id,
            category: 'gap',
            label: gap.id,
            title: gap.what_is_unknown,
            status: gap.status,
            reference: { kind: 'gap', id: gap.id },
            layoutDirection,
            locale,
          },
        });

        // Edge from claim to gap
        gap.target_claim_ids.forEach((claimId) => {
          rawEdges.push({
            id: `edge-${claimId}->${gap.id}`,
            source: claimId,
            target: gap.id,
            type: 'smoothstep',
            style: { stroke: '#f43f5e', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
          });
        });

        // 6. Actions
        gap.actions.forEach((action) => {
          addNode({
            id: action.id,
            type: 'action',
            position: { x: 0, y: 0 },
            data: {
              id: action.id,
              category: 'action',
              label: action.id,
              title: action.title,
              priority: translatePriority(action.priority, locale),
              reference: { kind: 'action', id: action.id },
              layoutDirection,
              locale,
            },
          });

          rawEdges.push({
            id: `edge-${gap.id}->${action.id}`,
            source: gap.id,
            target: action.id,
            type: 'smoothstep',
            style: { stroke: '#10b981', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
          });
        });
      });
    }

    return getLayoutedElements(rawNodes, rawEdges, layoutDirection);
  }, [caseData, activeRevision, graphMode, layoutDirection, locale]);

  // Filtered Nodes & Edges
  const filteredNodes = useMemo(() => {
    let result = initialNodes;
    if (filterCategory !== 'all') {
      result = result.filter((n) => (n.data as CustomNodeData).category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => {
        const d = n.data as CustomNodeData;
        return (
          d.id.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          (d.subLabel && d.subLabel.toLowerCase().includes(q))
        );
      });
    }
    return result;
  }, [initialNodes, filterCategory, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return initialEdges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [initialEdges, filteredNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges);

  useEffect(() => {
    setNodes(filteredNodes);
    setEdges(filteredEdges);
  }, [filteredNodes, filteredEdges, setNodes, setEdges]);

  // Highlight connections when node is selected
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const customData = node.data as unknown as CustomNodeData;
      setSelectedNode(customData);

      const targetId = node.id;
      // Highlight upstream and downstream edges
      setEdges((eds) =>
        eds.map((e) => {
          const isConnected = e.source === targetId || e.target === targetId;
          return {
            ...e,
            style: {
              ...e.style,
              stroke: isConnected ? '#4f46e5' : '#cbd5e1',
              strokeWidth: isConnected ? 3 : 1.5,
            },
            animated: isConnected,
          };
        })
      );

      // Highlight upstream and downstream nodes
      setNodes((nds) =>
        nds.map((n) => {
          const isTarget = n.id === targetId;
          const prevData = n.data as unknown as CustomNodeData;
          return {
            ...n,
            data: {
              ...prevData,
              isHighlighted: isTarget,
            },
          };
        })
      );
    },
    [setEdges, setNodes]
  );

  const resetSelection = useCallback(() => {
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...(n.data as unknown as CustomNodeData), isHighlighted: false },
      }))
    );
    setEdges(filteredEdges);
  }, [filteredEdges, setNodes, setEdges]);

  // Find upstream & downstream for selected node in inspector
  const { upstreamNodes, downstreamNodes } = useMemo(() => {
    if (!selectedNode) return { upstreamNodes: [], downstreamNodes: [] };
    const upIds = initialEdges.filter((e) => e.target === selectedNode.id).map((e) => e.source);
    const downIds = initialEdges.filter((e) => e.source === selectedNode.id).map((e) => e.target);

    return {
      upstreamNodes: initialNodes.filter((n) => upIds.includes(n.id)).map((n) => n.data as CustomNodeData),
      downstreamNodes: initialNodes.filter((n) => downIds.includes(n.id)).map((n) => n.data as CustomNodeData),
    };
  }, [selectedNode, initialEdges, initialNodes]);

  const isEmpty = initialNodes.length === 0;

  return (
    <div
      className={`relative flex flex-col h-full w-full bg-slate-50 overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''
      }`}
    >
      {/* Top Control Bar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
        {/* Mode & Layout Selectors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Graph Mode Buttons */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setGraphMode('reasoning_dag');
                resetSelection();
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                graphMode === 'reasoning_dag'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>{t.reasoningDag || 'Reasoning DAG'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setGraphMode('full_provenance');
                resetSelection();
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                graphMode === 'full_provenance'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.fullProvenanceGraph || 'Full Provenance'}</span>
            </button>
          </div>

          {/* Direction Toggle */}
          <button
            type="button"
            onClick={() => setLayoutDirection((prev) => (prev === 'TB' ? 'LR' : 'TB'))}
            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border border-slate-200"
            title={layoutDirection === 'TB' ? t.layoutTopToBottom : t.layoutLeftToRight}
          >
            {layoutDirection === 'TB' ? (
              <ArrowDownUp className="w-3 h-3 text-indigo-600" />
            ) : (
              <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
            )}
            <span>{layoutDirection === 'TB' ? 'TB' : 'LR'}</span>
          </button>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-0.5 border border-slate-200">
            <Filter className="w-3 h-3 text-slate-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">{t.allNodes || 'Tất cả nút'}</option>
              {graphMode === 'reasoning_dag' && <option value="step">{t.reasoningSteps || 'Bước lập luận'}</option>}
              <option value="evidence">{t.evidence || 'Bằng chứng'}</option>
              <option value="statement">{t.userStatement || 'Lời khai'}</option>
              <option value="finding">{t.findings || 'Phát hiện'}</option>
              <option value="event">{t.timeline || 'Sự kiện'}</option>
              <option value="gap">{t.gaps || 'Khoảng trống'}</option>
              <option value="action">{t.actions || 'Hành động'}</option>
            </select>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder || 'Tìm nút...'}
              className="w-28 sm:w-36 pl-6 pr-2 py-0.5 text-[11px] bg-slate-100 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
            title={isFullscreen ? t.exitFullscreen : t.fullscreenGraph}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-full min-h-[350px]">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white">
            <GitFork className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-medium text-slate-600">
              {t.noGraphData || 'Chưa có dữ liệu lập luận hoặc đồ thị cho phiên bản này.'}
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={resetSelection}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            className="bg-slate-50"
          >
            <Background color="#cbd5e1" gap={16} size={1} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs !p-1" />
            <MiniMap
              nodeStrokeColor="#6366f1"
              nodeColor={(n) => {
                const cat = (n.data as CustomNodeData)?.category;
                if (cat === 'step') return '#6366f1';
                if (cat === 'evidence') return '#eab308';
                if (cat === 'finding') return '#a855f7';
                if (cat === 'gap') return '#f43f5e';
                if (cat === 'action') return '#10b981';
                return '#94a3b8';
              }}
              nodeBorderRadius={4}
              className="!bg-white !border !border-slate-200 !rounded-xl !shadow-xs !bottom-3 !right-3"
              style={{ width: 120, height: 80 }}
            />
          </ReactFlow>
        )}

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <aside className="absolute top-3 right-3 bottom-3 w-80 max-w-[90%] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 flex flex-col justify-between overflow-y-auto z-20 transition-all animate-in slide-in-from-right-4 duration-200">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    {selectedNode.id}
                  </span>
                  <span className="text-xs font-bold text-slate-700 capitalize">
                    {selectedNode.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetSelection}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Body */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {selectedNode.title}
                </h4>
                {selectedNode.description && (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {selectedNode.description}
                  </p>
                )}
              </div>

              {/* Status or Assessment */}
              {(selectedNode.assessment || selectedNode.status || selectedNode.priority) && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {selectedNode.assessment && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-semibold px-2 py-0.5 rounded-md">
                      {selectedNode.assessment}
                    </span>
                  )}
                  {selectedNode.status && (
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md">
                      {selectedNode.status}
                    </span>
                  )}
                  {selectedNode.priority && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                      {selectedNode.priority}
                    </span>
                  )}
                </div>
              )}

              {/* Upstream Dependencies */}
              {upstreamNodes.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.upstreamDependencies || 'Nguồn phụ thuộc (Upstream)'} ({upstreamNodes.length})
                  </span>
                  <div className="space-y-1">
                    {upstreamNodes.map((n) => (
                      <div
                        key={n.id}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between gap-1.5"
                      >
                        <span className="font-mono font-bold text-indigo-700">{n.id}</span>
                        <span className="text-slate-600 truncate flex-1">{n.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Downstream Impact */}
              {downstreamNodes.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t.downstreamImpact || 'Tác động suy diễn (Downstream)'} ({downstreamNodes.length})
                  </span>
                  <div className="space-y-1">
                    {downstreamNodes.map((n) => (
                      <div
                        key={n.id}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between gap-1.5"
                      >
                        <span className="font-mono font-bold text-indigo-700">{n.id}</span>
                        <span className="text-slate-600 truncate flex-1">{n.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Open Reference Action */}
            {selectedNode.reference && (
              <div className="pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => onSelectReference(selectedNode.reference!)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <span>{t.openReference || 'Mở chi tiết'} [{selectedNode.id}]</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
